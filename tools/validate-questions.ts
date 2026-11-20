/**
 * Validates individual content files (questions, case studies, series) and
 * reports EVERY problem, without needing the rest of the bank to be valid.
 *   npm run content:validate -- --cert az-900                (every file and the course of AZ-900)
 *   npm run content:validate -- --cert all                   (every certification)
 *   npm run content:validate -- --cert az-104 --prefix s1-   (files whose id starts with s1-)
 *   npm run content:validate -- content/az-104/questions/storage/s1-*.yaml
 *   npm run content:validate -- --prefix s1-                 (that prefix, in every certification)
 *   npm run content:validate                                 (the courses only, every certification)
 *   npm run content:validate -- --cert dp-900 --course --chapters 10-core-data,11-relational
 * Checks: YAML syntax, Zod schema, answer/body consistency, file name = id,
 * known objective in the right domain folder, existing case study / series.
 * Warnings (not problems): a reference off the documentation of the
 * certification's vendor, a vendor unknown to lib/vendors.ts, scoring rules
 * other than those of the vendor's exam.
 * The course of a certification (lib/content/course.ts: files, EN/FR parity,
 * objectives, Markdown, references) is checked with --cert alone, without
 * any argument (every course), or with --course; `--chapters` keeps the
 * problems of those chapters only. Given files or --prefix check those files
 * only, unless --course is added.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { listCertificationDirs, loadCertification } from "../lib/content/loader";
import { formatProblem, validateCourse } from "../lib/content/course";
import { loadVendorGlossary, terminologyWarnings, type GlossaryTerm } from "../lib/content/glossary";
import { allOrNothing, caseStudyFileSchema, questionFileSchema, seriesFileSchema } from "../lib/questions/schema";
import { compareCodeUnits } from "../lib/sort";
import { certOfFile, parseCertArgs } from "./cert-args";
import { referenceWarnings, vendorOf, vendorWarnings, type Vendor } from "../lib/vendors";
import type { ScoringRules } from "../lib/content/schema";

async function listYaml(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true, recursive: true });
    return entries.filter((e) => e.isFile() && e.name.endsWith(".yaml")).map((e) => path.join(e.parentPath, e.name));
  } catch {
    return [];
  }
}

function schemaFor(folder: string | undefined) {
  if (folder === "case-studies") return caseStudyFileSchema;
  if (folder === "series") return seriesFileSchema;
  return questionFileSchema;
}

type Context = { root: string; objectiveDomain: Map<string, string>; caseIds: Set<string>; seriesIds: Set<string>; vendor: Vendor; scoring: ScoringRules; terms: readonly GlossaryTerm[] };
type FileData = { id: string; objective?: string; caseStudy?: string; series?: string; type?: string; stem?: { en: string; fr: string }; references?: { url: string }[] };

/** The note that states per-element scoring, in each language (tools/questions/WRITING_GUIDE.md, rule 7). */
const PER_ELEMENT_NOTE = [/worth one point/i, /vaut un point/i];

/** Problems of a question that passed its schema: objective, folder, case study, series. */
function questionProblems(data: FileData, folder: string | undefined, ctx: Context): string[] {
  const problems: string[] = [];
  const domain = ctx.objectiveDomain.get(data.objective!);
  if (!domain) problems.push(`unknown objective ${data.objective}`);
  else if (folder !== domain) problems.push(`objective ${data.objective} belongs to ${domain}/, file is in ${folder}/`);
  if (data.caseStudy && !ctx.caseIds.has(data.caseStudy)) problems.push(`unknown case study ${data.caseStudy}`);
  if (data.series && !ctx.seriesIds.has(data.series)) problems.push(`unknown series ${data.series}`);
  // Scored all or nothing (blueprint.scoring): a note promising a point per selection would be false.
  if (data.type && data.stem && allOrNothing(data.type as Parameters<typeof allOrNothing>[0], ctx.scoring) && PER_ELEMENT_NOTE.some((re) => re.test(data.stem!.en) || re.test(data.stem!.fr)))
    problems.push(`stem says each selection is worth one point, but blueprint.scoring scores ${data.type} all or nothing`);
  return problems;
}

/** Every French text of a file ({ en, fr } values), for the terminology check. */
function frenchTexts(node: unknown): string[] {
  if (Array.isArray(node)) return node.flatMap(frenchTexts);
  if (!node || typeof node !== "object") return [];
  return Object.entries(node).flatMap(([k, v]) => (k === "fr" && typeof v === "string" ? [v] : frenchTexts(v)));
}

/** The terms of a vendor's glossary (lib/vendors.ts), read once per run; none for content/glossary.yaml. */
const vendorTerms = new Map<string, Promise<readonly GlossaryTerm[]>>();
function termsOf(vendor: Vendor): Promise<readonly GlossaryTerm[]> {
  if (!vendor.glossary) return Promise.resolve([]);
  if (!vendorTerms.has(vendor.glossary)) vendorTerms.set(vendor.glossary, loadVendorGlossary(vendor.glossary).then((g) => g?.terms ?? []));
  return vendorTerms.get(vendor.glossary)!;
}

/** Every problem of one file, its warnings, and its question type (questions only). */
function validateFile(file: string, text: string, ctx: Context): { problems: string[]; warnings?: string[]; type?: string } {
  let raw: unknown;
  try {
    raw = parse(text);
  } catch (e) {
    return { problems: [`YAML: ${(e as Error).message.split("\n")[0]}`] };
  }
  const rel = path.relative(ctx.root, file).split(path.sep);
  const r = schemaFor(rel[0]).safeParse(raw);
  if (!r.success) return { problems: r.error.issues.map((i) => `${i.path.map(String).join(".") || "(root)"}: ${i.message}`) };
  const data = r.data as FileData;
  const problems = path.basename(file, ".yaml") === data.id ? [] : [`file name must be ${data.id}.yaml`];
  if (rel[0] !== "questions") return { problems };
  const warnings = [...referenceWarnings(data.references ?? [], ctx.vendor), ...terminologyWarnings(frenchTexts(raw).join("\n"), ctx.terms)];
  return { problems: [...problems, ...questionProblems(data, rel[1], ctx)], warnings, type: data.type };
}

interface Options {
  /** Certification folders to look at. */
  dirs: string[];
  /** Given files (absolute), or null. */
  files: string[] | null;
  prefix: string | null;
  checkCourses: boolean;
  chapters: string[];
}

async function parseOptions(argv: string[]): Promise<Options> {
  const { dirs, rest } = await parseCertArgs(argv);
  let prefix: string | null = null;
  let chapters: string[] = [];
  let course = false;
  const files: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a === "--course") course = true;
    else if (a === "--prefix") prefix = rest[++i] ?? "";
    else if (a === "--chapters") chapters = (rest[++i] ?? "").split(",").filter(Boolean);
    else if (a.startsWith("--")) throw new Error(`unknown option ${a}`);
    else files.push(path.resolve(a));
  }
  const all = await listCertificationDirs();
  // Given files say which certifications they belong to.
  const ofFiles = new Set(files.map((f) => certOfFile(f)).filter(Boolean));
  const chosen = dirs ?? (files.length > 0 ? all.filter((d) => ofFiles.has(path.basename(d))) : all);
  const onlyQuestions = files.length > 0 || prefix !== null;
  return {
    dirs: chosen,
    files: files.length > 0 ? files : null,
    prefix,
    // Without --cert nor files: the courses only (the questions are checked by content:check).
    checkCourses: course || !onlyQuestions,
    chapters,
  };
}

/** Validates the question files of one certification that the options select; returns the number of problems, or null when none was selected. */
async function validateQuestions(root: string, opts: Options, wholeBank: boolean): Promise<number | null> {
  const [questions, caseStudies, series] = await Promise.all(["questions", "case-studies", "series"].map((d) => listYaml(path.join(root, d))));
  const all = [...questions!, ...caseStudies!, ...series!];
  let files: string[];
  if (opts.files) files = opts.files.filter((f) => !path.relative(root, f).startsWith(".."));
  else if (opts.prefix !== null) files = all.filter((f) => path.basename(f).startsWith(opts.prefix!));
  else if (wholeBank) files = all;
  else return null;
  if (files.length === 0) return null;

  const content = await loadCertification(root);
  const objectiveDomain = new Map<string, string>();
  for (const [domain, groups] of Object.entries(content.objectives)) for (const g of groups) for (const o of g.objectives) objectiveDomain.set(o.code, domain);
  const ctx: Context = {
    root,
    objectiveDomain,
    caseIds: new Set(caseStudies!.map((f) => path.basename(f, ".yaml"))),
    seriesIds: new Set(series!.map((f) => path.basename(f, ".yaml"))),
    vendor: vendorOf(content.blueprint.certification.vendor),
    scoring: content.blueprint.blueprint.scoring,
    terms: await termsOf(vendorOf(content.blueprint.certification.vendor)),
  };
  const blueprintWarnings = vendorWarnings(content.blueprint);
  for (const w of blueprintWarnings) console.log(`⚠ ${path.relative(process.cwd(), path.join(root, "blueprint.yaml"))}: ${w}`);

  files.sort(compareCodeUnits);
  // Files are independent: read them all at once, then report in order.
  const texts = await Promise.all(files.map((file) => readFile(file, "utf8")));
  let errors = 0;
  let warned = blueprintWarnings.length;
  const byType = new Map<string, number>();
  files.forEach((file, n) => {
    const { problems, warnings = [], type } = validateFile(file, texts[n]!, ctx);
    for (const msg of problems) console.log(`✘ ${path.relative(process.cwd(), file)}: ${msg}`);
    for (const msg of warnings) console.log(`⚠ ${path.relative(process.cwd(), file)}: ${msg}`);
    errors += problems.length;
    warned += warnings.length;
    if (type) byType.set(type, (byType.get(type) ?? 0) + 1);
  });
  const types = [...byType].map(([k, v]) => k + "=" + v).join(" ");
  console.log(`${content.blueprint.certification.code}: ${files.length} files, ${errors} problem(s), ${warned} warning(s). Types: ${types}`);
  return errors;
}

/** The terminology warnings of the French chapters of a course (course/chapters/*.fr.md); none without vendor glossary terms. */
async function courseTermWarnings(dir: string, terms: readonly GlossaryTerm[]): Promise<{ file: string; message: string }[]> {
  if (terms.length === 0) return [];
  const chapters = path.join(dir, "course", "chapters");
  const files = (await readdir(chapters).catch(() => [] as string[])).filter((f) => f.endsWith(".fr.md")).sort(compareCodeUnits);
  const texts = await Promise.all(files.map((f) => readFile(path.join(chapters, f), "utf8")));
  return files.flatMap((f, i) => terminologyWarnings(texts[i]!, terms).map((message) => ({ file: path.relative(process.cwd(), path.join(chapters, f)), message })));
}

/** Checks the course of each certification that has one; returns the number of problems. */
async function validateCourses(dirs: string[], chapters: string[]): Promise<number> {
  // Certifications are independent: check them all at once, report in order.
  const reports = await Promise.all(
    dirs.map(async (dir) => {
      const content = await loadCertification(dir);
      const terms = await termsOf(vendorOf(content.blueprint.certification.vendor));
      return { code: content.blueprint.certification.code, objectives: Object.values(content.objectives).flat().flatMap((g) => g.objectives).length, report: await validateCourse(content), terms: await courseTermWarnings(dir, terms) };
    }),
  );
  const mine = (file: string) => chapters.length === 0 || chapters.some((id) => path.basename(file).startsWith(`${id}.`));
  let problems = 0;
  for (const { code, objectives, report, terms } of reports) {
    if (!report) continue;
    const shown = report.problems.filter((p) => mine(p.file));
    for (const p of shown) console.log(`✘ ${formatProblem(p)}`);
    for (const w of terms.filter((t) => mine(t.file))) console.log(`⚠ ${w.file}: ${w.message}`);
    problems += shown.length;
    const all = report.course?.chapters ?? [];
    const sections = all.flatMap((c) => c.sections);
    const covered = new Set(sections.flatMap((s) => s.objectives)).size;
    const summary = report.course ? `${all.length} chapters, ${sections.length} sections, ${covered}/${objectives} objectives covered, ` : "";
    const scope = chapters.length > 0 ? ` in ${chapters.join(", ")} (all chapters: ${report.problems.length})` : "";
    console.log(`Course ${code}: ${summary}${shown.length} problem(s)${scope}.`);
  }
  return problems;
}

async function main() {
  const argv = process.argv.slice(2);
  const opts = await parseOptions(argv);
  // --cert alone: the whole bank of each certification asked for.
  const wholeBank = argv.some((a) => a === "--cert" || a.startsWith("--cert=")) && !opts.files && opts.prefix === null;
  let errors = 0;
  let selected = 0;
  // One certification after the other, so that the output stays grouped.
  for (const dir of opts.dirs) {
    const n = await validateQuestions(dir, opts, wholeBank); // NOSONAR: sequential on purpose (readable output)
    if (n !== null) selected += 1;
    errors += n ?? 0;
  }
  if (selected === 0 && (opts.files || opts.prefix !== null)) throw new Error("no file to validate");
  const courseErrors = opts.checkCourses ? await validateCourses(opts.dirs, opts.chapters) : 0;
  process.exit(errors + courseErrors ? 1 : 0);
}

try {
  await main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
