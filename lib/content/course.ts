/**
 * The course of a certification (docs/SPECS-COURS.md §3–4):
 * content/<certification>/course/course.yaml, the manifest, and
 * chapters/<id>.<locale>.md, one file per chapter and language, cut into
 * sections by markers:
 *
 *   <!-- section: rbac-model | objectives: 1.2.1, 1.2.2 -->
 *   ## Section title
 *
 * validateCourse reports every problem (npm run content:validate);
 * loadCourse returns the course or throws on the first problem (seed,
 * content:check). A certification without a course/ folder has no course.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import type { Code, Nodes, Root, RootContent } from "mdast";
import { locales, type Locale, type Localized } from "@/lib/i18n/config";
import { compareCodeUnits } from "@/lib/sort";
import { ContentError, parseWith, readYaml, type CertificationContent } from "./loader";
import { courseFileSchema, type CourseFile } from "./schema";

/** The module of the chapters that come before the exam domains: no objective. */
export const INTRO_MODULE = "intro";

/** Code block languages a chapter may use. */
export const COURSE_CODE_LANGUAGES = ["bash", "powershell", "json", "bicep", "kusto", "yaml", "text"] as const;

/** Callouts: a quotation that starts with one of these bold labels. */
export const CALLOUTS = {
  trap: { en: "Exam trap.", fr: "Piège d'examen." },
  tip: { en: "Exam tip.", fr: "Conseil d'examen." },
} as const satisfies Record<string, Localized>;
export type CalloutKind = keyof typeof CALLOUTS;

/** Microsoft Learn: the only site references may point to. */
const LEARN = "https://learn.microsoft.com/";

export interface CourseSection {
  id: string;
  objectives: string[];
  title: Localized;
  /** Markdown, without the section's heading. */
  body: Localized;
}

export interface CourseChapter {
  id: string;
  module: string;
  status: CourseFile["chapters"][number]["status"];
  free: boolean;
  title: Localized;
  minutes: number;
  references: CourseFile["chapters"][number]["references"];
  /** The paragraphs before the first section. */
  summary: Localized;
  sections: CourseSection[];
}

export interface Course {
  dir: string;
  modules: CourseFile["modules"];
  chapters: CourseChapter[];
}

export interface CourseProblem {
  file: string;
  line?: number;
  message: string;
}

export interface CourseReport {
  /** The course, when it has no problem. */
  course: Course | null;
  problems: CourseProblem[];
}

export function formatProblem(p: CourseProblem): string {
  return `${path.relative(process.cwd(), p.file)}${p.line ? `:${p.line}` : ""}: ${p.message}`;
}

const MARKER = /^<!--\s*section:\s*([^\s|]*)\s*(?:\|\s*objectives:\s*(.*?)\s*)?-->$/;
const SECTION_ID = /^[a-z0-9-]+$/;
const OBJECTIVE_CODE = /^\d+(\.\d+)*$/;

/** What a section (or the summary) holds that both languages must share. */
interface Fingerprint {
  code: { lang: string | null | undefined; value: string }[];
  tables: string[];
  callouts: string[];
}

interface ParsedSection {
  id: string;
  objectives: string[];
  title: string;
  body: string;
  line: number;
  fingerprint: Fingerprint;
}

interface ParsedChapter {
  file: string;
  summary: string;
  summaryFingerprint: Fingerprint;
  sections: ParsedSection[];
  problems: CourseProblem[];
}

const parser = unified().use(remarkParse).use(remarkGfm);

/** Where a node starts in the file (1-based line). */
const lineOf = (node: Nodes): number => node.position?.start.line ?? 0;

/** The plain text of a node. */
function textOf(node: Nodes): string {
  if ("value" in node && typeof node.value === "string") return node.value;
  return "children" in node ? (node.children as Nodes[]).map(textOf).join("") : "";
}

/** A fenced block is closed by a fence at least as long as the opening one. */
function isClosed(node: Code, text: string): boolean {
  // Without the indentation and the `>` of the quotations (callouts) the block sits in.
  const lines = text
    .slice(node.position!.start.offset, node.position!.end.offset)
    .split("\n")
    .map((l) => l.replace(/^[ \t]*(?:>[ \t]?)*/, "").trim());
  const open = /^(`{3,}|~{3,})/.exec(lines[0]!)?.[1];
  if (!open) return true;
  const last = lines.at(-1)!;
  return lines.length > 1 && last.startsWith(open[0]!) && /^(`{3,}|~{3,})$/.test(last) && last.length >= open.length;
}

/** The callout kind of a quotation that starts with a bold label, "?" for an unknown label, null for a plain quotation. */
function calloutOf(node: Nodes, locale: Locale): CalloutKind | "?" | null {
  if (node.type !== "blockquote") return null;
  const first = node.children[0];
  if (first?.type !== "paragraph" || first.children[0]?.type !== "strong") return null;
  const label = textOf(first.children[0]).trim();
  const kind = (Object.keys(CALLOUTS) as CalloutKind[]).find((k) => CALLOUTS[k][locale] === label);
  return kind ?? "?";
}

function fingerprintOf(nodes: readonly RootContent[], locale: Locale): Fingerprint {
  const print: Fingerprint = { code: [], tables: [], callouts: [] };
  for (const top of nodes) {
    visit(top, (node: Nodes) => {
      if (node.type === "code") print.code.push({ lang: node.lang, value: node.value });
      if (node.type === "table") print.tables.push(`${node.children.length}×${Math.max(...node.children.map((r) => r.children.length))}`);
      const callout = calloutOf(node, locale);
      if (callout) print.callouts.push(callout);
    });
  }
  return print;
}

/** Problems of the Markdown itself: headings, images, links, `<` outside code, code blocks, callout labels. */
function markdownProblems(file: string, text: string, tree: Root, markers: ReadonlySet<Nodes>, locale: Locale): CourseProblem[] {
  const problems: CourseProblem[] = [];
  const at = (node: Nodes, message: string) => problems.push({ file, line: lineOf(node), message });
  // Ranges of the source where `<` is allowed: code, inline code and the section markers.
  const allowed: [number, number][] = [];
  visit(tree, (node: Nodes) => {
    if (node.type === "heading" && node.depth === 1) at(node, "level-1 heading (the chapter title comes from course.yaml)");
    if (node.type === "heading" && node.depth > 2) at(node, `level-${node.depth} heading (sections use level 2 only)`);
    if (node.type === "image" || node.type === "imageReference") at(node, "image (not allowed in the course)");
    // Rendered in the browser: links go to https pages or to an anchor, nothing else (javascript:, data:…).
    if ((node.type === "link" || node.type === "definition") && !/^(https:\/\/|#)/i.test(node.url)) {
      at(node, `link to "${node.url}" (only https:// links and #anchors)`);
    }
    if (node.type === "code") {
      if (!node.lang) at(node, `code block without a language (one of ${COURSE_CODE_LANGUAGES.join(", ")})`);
      else if (!(COURSE_CODE_LANGUAGES as readonly string[]).includes(node.lang)) at(node, `code block language "${node.lang}" (allowed: ${COURSE_CODE_LANGUAGES.join(", ")})`);
      if (!isClosed(node, text)) at(node, "code block not closed");
    }
    if ((node.type === "code" || node.type === "inlineCode" || markers.has(node)) && node.position) {
      allowed.push([node.position.start.offset!, node.position.end.offset!]);
    }
    if (calloutOf(node, locale) === "?") {
      at(node, `unknown callout label (allowed: ${Object.values(CALLOUTS).map((c) => `**${c[locale]}**`).join(", ")})`);
    }
  });
  const lines = new Set<number>();
  for (let i = text.indexOf("<"); i >= 0; i = text.indexOf("<", i + 1)) {
    if (allowed.some(([from, to]) => i >= from && i < to)) continue;
    const line = text.slice(0, i).split("\n").length;
    if (!lines.has(line)) problems.push({ file, line, message: "`<` outside code (no HTML in the course; put it in a code span)" });
    lines.add(line);
  }
  return problems;
}

/** Cuts a chapter file on its section markers, and checks its Markdown. */
export function parseChapter(file: string, text: string, locale: Locale): ParsedChapter {
  const tree = parser.parse(text);
  const problems: CourseProblem[] = [];
  const markers = new Set<Nodes>();
  const sections: (ParsedSection & { start: number; bodyStart: number; nodes: RootContent[] })[] = [];
  const summaryNodes: RootContent[] = [];
  const children = tree.children;
  for (let i = 0; i < children.length; i++) {
    const node = children[i]!;
    const marker = node.type === "html" ? MARKER.exec(node.value.trim()) : null;
    if (marker) {
      markers.add(node);
      const [, id = "", codes] = marker;
      if (!SECTION_ID.test(id)) problems.push({ file, line: lineOf(node), message: `section id "${id}" (lowercase letters, digits and hyphens only)` });
      const objectives = (codes ?? "").split(",").map((c) => c.trim()).filter(Boolean);
      for (const code of objectives.filter((c) => !OBJECTIVE_CODE.test(c))) problems.push({ file, line: lineOf(node), message: `objective code "${code}"` });
      const heading = children[i + 1];
      let title = "";
      let bodyStart = node.position!.end.offset!;
      if (heading?.type === "heading" && heading.depth === 2) {
        title = textOf(heading).trim();
        bodyStart = heading.position!.end.offset!;
        i++;
      } else {
        problems.push({ file, line: lineOf(node), message: `section "${id}": the marker must be followed by a level-2 heading` });
      }
      sections.push({ id, objectives, title, body: "", line: lineOf(node), fingerprint: { code: [], tables: [], callouts: [] }, start: node.position!.start.offset!, bodyStart, nodes: [] });
      continue;
    }
    if (node.type === "heading" && node.depth === 2) problems.push({ file, line: lineOf(node), message: "level-2 heading without a section marker before it" });
    (sections.at(-1)?.nodes ?? summaryNodes).push(node);
  }
  problems.push(...markdownProblems(file, text, tree, markers, locale));

  const seen = new Set<string>();
  for (const s of sections) {
    if (seen.has(s.id)) problems.push({ file, line: s.line, message: `section id "${s.id}" used twice` });
    seen.add(s.id);
  }
  const summary = text.slice(0, sections[0]?.start ?? text.length).trim();
  if (!summary) problems.push({ file, line: 1, message: "no introduction paragraph before the first section" });
  if (sections.length === 0) problems.push({ file, line: 1, message: "no section marker" });
  return {
    file,
    summary,
    summaryFingerprint: fingerprintOf(summaryNodes, locale),
    sections: sections.map((s, k) => ({
      id: s.id,
      objectives: s.objectives,
      title: s.title,
      body: text.slice(s.bodyStart, sections[k + 1]?.start ?? text.length).trim(),
      line: s.line,
      fingerprint: fingerprintOf(s.nodes, locale),
    })),
    problems,
  };
}

/** Problems of the two languages of a chapter against each other. */
function parityProblems(en: ParsedChapter, fr: ParsedChapter): CourseProblem[] {
  const problems: CourseProblem[] = [];
  const enIds = en.sections.map((s) => s.id);
  const frIds = fr.sections.map((s) => s.id);
  if (enIds.join() !== frIds.join()) {
    problems.push({ file: fr.file, message: `sections differ from English: en [${enIds.join(", ")}], fr [${frIds.join(", ")}]` });
  }
  const parts = [
    { name: "introduction", en: en.summaryFingerprint, fr: fr.summaryFingerprint, line: 1, enObjectives: [] as string[], frObjectives: [] as string[] },
    ...en.sections.flatMap((s) => {
      const other = fr.sections.find((f) => f.id === s.id);
      return other ? [{ name: `section "${s.id}"`, en: s.fingerprint, fr: other.fingerprint, line: other.line, enObjectives: s.objectives, frObjectives: other.objectives }] : [];
    }),
  ];
  for (const p of parts) {
    const at = (message: string) => problems.push({ file: fr.file, line: p.line, message: `${p.name}: ${message}` });
    if (p.enObjectives.join() !== p.frObjectives.join()) at(`objectives differ from English (en ${p.enObjectives.join(", ") || "none"}, fr ${p.frObjectives.join(", ") || "none"})`);
    if (p.en.code.length !== p.fr.code.length) at(`${p.fr.code.length} code block(s), ${p.en.code.length} in English`);
    else {
      const k = p.en.code.findIndex((c, i) => c.lang !== p.fr.code[i]!.lang || c.value !== p.fr.code[i]!.value);
      if (k >= 0) at(`code block ${k + 1} differs from English (code blocks are identical in every language, comments included)`);
    }
    if (p.en.tables.join() !== p.fr.tables.join()) at(`tables (rows×columns) differ from English: en [${p.en.tables.join(", ")}], fr [${p.fr.tables.join(", ")}]`);
    if (p.en.callouts.join() !== p.fr.callouts.join()) at(`callouts differ from English: en [${p.en.callouts.join(", ")}], fr [${p.fr.callouts.join(", ")}]`);
  }
  return problems;
}

/** Every file of a folder, recursively. */
async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries.filter((e) => e.isFile()).map((e) => path.join(e.parentPath, e.name)).sort(compareCodeUnits);
}

async function readText(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/** Problems of course.yaml against the certification: code, blueprint version, modules, references. */
function manifestProblems(file: string, manifest: CourseFile, content: CertificationContent): CourseProblem[] {
  const problems: CourseProblem[] = [];
  const { certification, blueprint, domains } = content.blueprint;
  if (manifest.certification !== certification.code) problems.push({ file, message: `certification "${manifest.certification}" must be "${certification.code}"` });
  if (manifest.blueprintVersion !== blueprint.version) problems.push({ file, message: `blueprintVersion "${manifest.blueprintVersion}" must be the blueprint's "${blueprint.version}"` });
  const moduleCodes = new Set([INTRO_MODULE, ...domains.map((d) => d.code)]);
  for (const m of manifest.modules.filter((x) => !moduleCodes.has(x.code))) {
    problems.push({ file, message: `module "${m.code}" is neither a domain of blueprint.yaml nor "${INTRO_MODULE}"` });
  }
  for (const c of manifest.chapters) {
    for (const r of c.references.filter((x) => !x.url.startsWith(LEARN))) problems.push({ file, message: `chapter "${c.id}": reference ${r.url} is not on ${LEARN}` });
  }
  return problems;
}

/** Problems of the objectives: known codes, in the chapter's domain, and every objective covered. */
function objectiveProblems(manifest: CourseFile, parsed: Map<string, ParsedChapter>, content: CertificationContent, manifestFile: string): CourseProblem[] {
  const problems: CourseProblem[] = [];
  const domainOf = new Map<string, string>();
  for (const [domain, groups] of Object.entries(content.objectives)) for (const g of groups) for (const o of g.objectives) domainOf.set(o.code, domain);
  const covered = new Set<string>();
  for (const chapter of manifest.chapters) {
    const en = parsed.get(chapter.id);
    for (const s of en?.sections ?? []) {
      for (const code of s.objectives) {
        const domain = domainOf.get(code);
        if (!domain) problems.push({ file: en!.file, line: s.line, message: `section "${s.id}": unknown objective ${code}` });
        else if (domain !== chapter.module) problems.push({ file: en!.file, line: s.line, message: `section "${s.id}": objective ${code} belongs to domain "${domain}", the chapter to module "${chapter.module}"` });
        covered.add(code);
      }
    }
  }
  for (const [code, domain] of domainOf) {
    if (!covered.has(code)) problems.push({ file: manifestFile, message: `objective ${code} (${domain}) is covered by no section` });
  }
  return problems;
}

/**
 * Reads and checks the course of a certification: every problem, in file
 * order. Null when the certification has no course/ folder.
 */
export async function validateCourse(content: CertificationContent): Promise<CourseReport | null> {
  const dir = path.join(content.dir, "course");
  const manifestFile = path.join(dir, "course.yaml");
  let present: string[];
  try {
    present = await listFiles(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
  let manifest: CourseFile;
  try {
    manifest = parseWith(courseFileSchema, await readYaml(manifestFile), manifestFile);
  } catch (err) {
    return { course: null, problems: [{ file: manifestFile, message: err instanceof ContentError ? err.detail : String(err) }] };
  }

  const problems = manifestProblems(manifestFile, manifest, content);
  const expected = new Set([manifestFile]);
  const parsed = new Map<string, ParsedChapter>();
  const chapters: { id: string; byLocale: Partial<Record<Locale, ParsedChapter>> }[] = [];
  const reads = await Promise.all(
    manifest.chapters.flatMap((c) => locales.map(async (locale) => {
      const file = path.join(dir, "chapters", `${c.id}.${locale}.md`);
      return { id: c.id, locale, file, text: await readText(file) };
    })),
  );
  for (const c of manifest.chapters) {
    const byLocale: Partial<Record<Locale, ParsedChapter>> = {};
    for (const r of reads.filter((x) => x.id === c.id)) {
      expected.add(r.file);
      if (r.text === null) {
        problems.push({ file: r.file, message: `missing: chapter "${c.id}" has no ${r.locale} file` });
        continue;
      }
      const chapter = parseChapter(r.file, r.text, r.locale);
      problems.push(...chapter.problems);
      byLocale[r.locale] = chapter;
    }
    if (byLocale.en && byLocale.fr) problems.push(...parityProblems(byLocale.en, byLocale.fr));
    if (byLocale.en) parsed.set(c.id, byLocale.en);
    chapters.push({ id: c.id, byLocale });
  }
  problems.push(...objectiveProblems(manifest, parsed, content, manifestFile));
  for (const file of present.filter((f) => !expected.has(f))) problems.push({ file, message: "orphan file (not a chapter file of course.yaml)" });
  if (problems.length > 0) return { course: null, problems };

  return {
    problems,
    course: {
      dir,
      modules: manifest.modules,
      chapters: manifest.chapters.map((c, i) => {
        const { en, fr } = chapters[i]!.byLocale as Record<Locale, ParsedChapter>;
        return {
          ...c,
          summary: { en: en.summary, fr: fr.summary },
          sections: en.sections.map((s, k) => ({
            id: s.id,
            objectives: s.objectives,
            title: { en: s.title, fr: fr.sections[k]!.title },
            body: { en: s.body, fr: fr.sections[k]!.body },
          })),
        };
      }),
    },
  };
}

/** The course of a certification, or null without course/ folder. Throws a ContentError on the first problem. */
export async function loadCourse(content: CertificationContent): Promise<Course | null> {
  const report = await validateCourse(content);
  if (!report) return null;
  const [first] = report.problems;
  if (first) {
    const more = report.problems.length > 1 ? ` (and ${report.problems.length - 1} more: npm run content:validate)` : "";
    throw new ContentError(first.file + (first.line ? `:${first.line}` : ""), first.message + more);
  }
  return report.course;
}
