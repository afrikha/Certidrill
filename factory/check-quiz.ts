/**
 * Checks the end-of-chapter quizzes of a certification:
 *   content/<cert>/quizzes/<chapterId>.yaml
 *
 *   chapter: 12-rbac
 *   questions:            # exactly 10, in order of increasing difficulty
 *     - { id, objective, difficulty, type, stem, body, answer, explanation, references, ... }
 *
 * Rules (docs/SPECS-QUIZ-CHAPITRE.md):
 * - each question passes the bank schema (lib/questions/schema.ts) and the language rule;
 * - positions 1-5 (consolidation): difficulty 1 or 2, never decreasing, the first one is 1;
 *   positions 6-10 (exam level): difficulty 3;
 * - no case study, no series; objectives belong to the chapter; every objective of the chapter is tested;
 * - at least two question types other than `single` among positions 6-10 (exam formats);
 * - ids `<prefix>qz-<chapter number>-<01..10>`, unique across the whole repository (bank and quizzes);
 * - no question close to a mock-exam question: same id forbidden, stem shingle similarity below the threshold.
 *
 * Usage: npx tsx factory/check-quiz.ts <cert> [chapterId ...]
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { questionFileSchema, type QuestionFile } from "../lib/questions/schema";
import { frenchProblems } from "../lib/content/languages";
import { referenceWarnings, vendorOf } from "../lib/vendors";
import { loadVendorGlossary, terminologyWarnings } from "../lib/content/glossary";
import type { Locale } from "../lib/i18n/config";

const ROOT = path.resolve("content");
const SIMILARITY_LIMIT = 0.35;

async function yamlFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true });
    return entries.filter((e) => e.isFile() && e.name.endsWith(".yaml")).map((e) => path.join(e.parentPath, e.name));
  } catch {
    return [];
  }
}

function words(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[^a-z0-9à-ÿ]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

function shingles(s: string, n = 4): Set<string> {
  const w = words(s);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Chapter id → objectives, from the section markers of its English file. */
async function chapterObjectives(cert: string): Promise<Map<string, Set<string>>> {
  const dir = path.join(ROOT, cert, "course", "chapters");
  const map = new Map<string, Set<string>>();
  for (const f of (await readdir(dir)).filter((f) => f.endsWith(".en.md"))) {
    const text = await readFile(path.join(dir, f), "utf8");
    const objs = new Set<string>();
    for (const m of text.matchAll(/<!--\s*section:[^|>]*\|\s*objectives:\s*([^>]*?)\s*-->/g))
      for (const o of m[1]!.split(",")) if (o.trim()) objs.add(o.trim());
    map.set(f.replace(/\.en\.md$/, ""), objs);
  }
  return map;
}

async function main() {
  const [cert, ...only] = process.argv.slice(2);
  if (!cert) throw new Error("usage: check-quiz.ts <cert> [chapterId ...]");
  const blueprint = parse(await readFile(path.join(ROOT, cert, "blueprint.yaml"), "utf8"));
  const languages: Locale[] = blueprint.certification.languages ?? ["en", "fr"];
  const vendor = vendorOf(blueprint.certification.vendor);
  const terms = vendor.glossary ? ((await loadVendorGlossary(vendor.glossary))?.terms ?? []) : [];
  const prefix = cert.replace(/-/g, "") + "-qz-";

  // Every id in the repository except the quizzes being checked, and the mock-exam stems of this certification.
  const allIds = new Map<string, string>();
  for (const f of await yamlFiles(ROOT)) {
    if (f.includes(`${path.sep}quizzes${path.sep}`)) continue;
    const m = /^id:\s*([a-z0-9-]+)/m.exec(await readFile(f, "utf8"));
    if (m) allIds.set(m[1]!, path.relative(ROOT, f));
  }
  const bank: { id: string; sh: Set<string> }[] = [];
  for (const f of await yamlFiles(path.join(ROOT, cert, "questions"))) {
    const raw = parse(await readFile(f, "utf8"));
    if (raw?.stem?.en) bank.push({ id: raw.id, sh: shingles(raw.stem.en) });
  }

  const objectives = await chapterObjectives(cert);
  const quizDir = path.join(ROOT, cert, "quizzes");
  const files = (await yamlFiles(quizDir)).sort();
  const quizIds = new Map<string, string>();
  let problems = 0;
  let warnings = 0;
  let checked = 0;
  const report = (file: string, msg: string) => {
    problems++;
    console.log(`  ✗ ${file}: ${msg}`);
  };

  for (const chapter of [...objectives.keys()].sort()) {
    if (only.length && !only.includes(chapter)) continue;
    const chapterObjs = objectives.get(chapter)!;
    if (!chapterObjs.size) continue; // 00-getting-started: no quiz
    const file = path.join(quizDir, `${chapter}.yaml`);
    const rel = path.relative(ROOT, file);
    if (!files.includes(file)) {
      if (only.length) report(rel, "missing");
      else console.log(`  · ${rel}: not written yet`);
      continue;
    }
    checked++;
    let raw: { chapter?: string; questions?: unknown[] };
    try {
      raw = parse(await readFile(file, "utf8"));
    } catch (e) {
      report(rel, `YAML: ${(e as Error).message.split("\n")[0]}`);
      continue;
    }
    if (raw?.chapter !== chapter) report(rel, `chapter must be "${chapter}"`);
    const list = Array.isArray(raw?.questions) ? raw.questions : [];
    if (list.length !== 10) report(rel, `needs exactly 10 questions, has ${list.length}`);
    const num = chapter.split("-")[0];
    const parsed: (QuestionFile | null)[] = list.map((q, i) => {
      const r = questionFileSchema.safeParse(q);
      const where = `q${i + 1}`;
      if (!r.success) {
        for (const issue of r.error.issues) report(rel, `${where} ${issue.path.map(String).join(".")}: ${issue.message}`);
        return null;
      }
      for (const p of frenchProblems(q, languages)) report(rel, `${where} ${p}`);
      return r.data;
    });
    const tested = new Set<string>();
    let lastEasy = 0;
    const nonSingleHard = new Set<string>();
    parsed.forEach((q, i) => {
      if (!q) return;
      const where = `q${i + 1} (${q.id})`;
      const want = `${prefix}${num}-${String(i + 1).padStart(2, "0")}`;
      if (q.id !== want) report(rel, `${where}: id must be ${want}`);
      if (allIds.has(q.id)) report(rel, `${where}: id already used by ${allIds.get(q.id)}`);
      if (quizIds.has(q.id)) report(rel, `${where}: id also in ${quizIds.get(q.id)}`);
      quizIds.set(q.id, rel);
      if (!chapterObjs.has(q.objective)) report(rel, `${where}: objective ${q.objective} is not one of the chapter (${[...chapterObjs].join(", ")})`);
      tested.add(q.objective);
      if (q.caseStudy || q.series || q.type === "series_yesno") report(rel, `${where}: no case study or series in a quiz`);
      if (q.status !== "draft") report(rel, `${where}: status must be draft`);
      if (i < 5) {
        if (q.difficulty === 3) report(rel, `${where}: positions 1-5 are difficulty 1 or 2`);
        if (i === 0 && q.difficulty !== 1) report(rel, `${where}: the first question is difficulty 1`);
        if (q.difficulty < lastEasy) report(rel, `${where}: difficulty must not decrease`);
        lastEasy = q.difficulty;
      } else {
        if (q.difficulty !== 3) report(rel, `${where}: positions 6-10 are exam level (difficulty 3)`);
        if (q.type !== "single") nonSingleHard.add(q.type);
      }
      if ((q.type === "single" || q.type === "multi") && q.explanation.options) {
        const answer = q.answer as { optionId?: string; optionIds?: string[] };
        const correct = q.type === "single" ? [answer.optionId ?? ""] : (answer.optionIds ?? []);
        const options = (q.body as { options: { id: string }[] }).options;
        const missing = options.filter((o) => !correct.includes(o.id) && !q.explanation.options?.[o.id]);
        if (missing.length) report(rel, `${where}: explanation.options misses ${missing.map((o) => o.id).join(", ")}`);
      } else if (q.type === "single" || q.type === "multi") report(rel, `${where}: explanation.options is required`);
      // Not in the mock exam: no stem close to a bank stem.
      const sh = shingles(q.stem.en);
      let best = { id: "", s: 0 };
      for (const b of bank) {
        const s = jaccard(sh, b.sh);
        if (s > best.s) best = { id: b.id, s };
      }
      if (best.s >= SIMILARITY_LIMIT) report(rel, `${where}: stem too close to mock-exam question ${best.id} (similarity ${best.s.toFixed(2)})`);
      for (const w of [...referenceWarnings(q.references, vendor), ...terminologyWarnings(JSON.stringify(q).match(/"fr":"((?:[^"\\]|\\.)*)"/g)?.join("\n") ?? "", terms)]) {
        warnings++;
        console.log(`  ! ${rel}: ${where} ${w}`);
      }
    });
    for (const o of chapterObjs) if (!tested.has(o)) report(rel, `objective ${o} is not tested`);
    if (nonSingleHard.size < 2) report(rel, `positions 6-10 need at least two exam formats other than single (have: ${[...nonSingleHard].join(", ") || "none"})`);
  }
  console.log(`${cert}: ${checked} quiz file(s), ${problems} problem(s), ${warnings} warning(s)`);
  process.exitCode = problems ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
