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
 * French wherever the certification offers it (certification.languages),
 * known objective in the right domain folder, existing case study / series.
 * Warnings (not problems): a reference off the documentation of the
 * certification's vendor, a vendor unknown to lib/vendors.ts, scoring rules
 * other than those of the vendor's exam.
 * The course of a certification (lib/content/course.ts: files, EN/FR parity,
 * objectives, Markdown, references) is checked with --cert alone, without
 * any argument (every course), or with --course; `--chapters` keeps the
 * problems of those chapters only. Given files or --prefix check those files
 * only, unless --course is added.
 * The end-of-chapter quizzes (quizzes/<chapter>.yaml, lib/content/quiz.ts:
 * schema, languages, chapter, ids, difficulty by position, objectives,
 * explanations, similarity with the exam questions) are checked with the
 * courses, or alone with --quizzes; `--chapters` applies to them too.
 * Practical exercises (`command`, `manifest`; lib/exercises/validate.ts), in
 * the bank and in the quizzes: every solution passes its checks, every
 * negative fails one, served apiVersion/kind. Commands of mode object run with
 * the real kubectl v1.37 when it is installed (KUBECTL_BIN or
 * /usr/local/bin/kubectl; REQUIRE_KUBECTL=1 makes it mandatory, as in CI),
 * else they are checked against their written `output`. Where that output
 * differs from what kubectl prints, the difference is listed (≠), and written
 * to a Markdown file with --mismatches <file>.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { listCertificationDirs, loadCertification, readYamlFiles } from "../lib/content/loader";
import { formatProblem, parseChapter, validateCourse } from "../lib/content/course";
import { checkQuizzes, examFormats, QUIZ_FOLDER, type QuizChapter } from "../lib/content/quiz";
import { loadVendorGlossary, terminologyWarnings, type GlossaryTerm } from "../lib/content/glossary";
import { allOrNothing, caseStudyFileSchema, questionFileSchema, seriesFileSchema } from "../lib/questions/schema";
import { compareCodeUnits } from "../lib/sort";
import { certOfFile, parseCertArgs } from "./cert-args";
import { referenceWarnings, vendorOf, vendorWarnings, type Vendor } from "../lib/vendors";
import type { ScoringRules } from "../lib/content/schema";
import { frenchProblems } from "../lib/content/languages";
import type { Locale } from "../lib/i18n/config";
import { checkExercise, type Exercise } from "../lib/exercises/validate";
import { kubectlBinary } from "../lib/exercises/kubectl";
import { isExerciseType } from "../lib/exercises/grade";

/** Run the commands of mode object with kubectl (set in main). */
let withKubectl = false;
/** Where the written outputs differ from kubectl: by file. */
const mismatches: { file: string; id: string; message: string }[] = [];
let exercisesChecked = 0;

/** The exercise checks of one question (none for another type); records its mismatches. */
async function exerciseProblems(file: string, q: { id: string; type: string }): Promise<string[]> {
  if (!isExerciseType(q.type)) return [];
  exercisesChecked++;
  const report = await checkExercise(q as unknown as Exercise, { kubectl: withKubectl });
  for (const m of report.mismatches) mismatches.push({ file, id: q.id, message: m });
  return report.problems;
}

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

type Context = { root: string; objectiveDomain: Map<string, string>; caseIds: Set<string>; seriesIds: Set<string>; vendor: Vendor; scoring: ScoringRules; terms: readonly GlossaryTerm[]; languages: readonly Locale[] };
type FileData = { id: string; objective?: string; caseStudy?: string; series?: string; type?: string; stem?: { en: string; fr?: string }; references?: { url: string }[] };

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
  if (data.type && data.stem && allOrNothing(data.type as Parameters<typeof allOrNothing>[0], ctx.scoring) && PER_ELEMENT_NOTE.some((re) => re.test(data.stem!.en) || re.test(data.stem!.fr ?? "")))
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
function validateFile(file: string, text: string, ctx: Context): { problems: string[]; warnings?: string[]; type?: string; data?: FileData } {
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
  problems.push(...frenchProblems(raw, ctx.languages));
  if (rel[0] !== "questions") return { problems };
  const warnings = [...referenceWarnings(data.references ?? [], ctx.vendor), ...terminologyWarnings(frenchTexts(raw).join("\n"), ctx.terms)];
  return { problems: [...problems, ...questionProblems(data, rel[1], ctx)], warnings, type: data.type, data };
}

interface Options {
  /** Certification folders to look at. */
  dirs: string[];
  /** Given files (absolute), or null. */
  files: string[] | null;
  prefix: string | null;
  checkCourses: boolean;
  checkQuizzes: boolean;
  chapters: string[];
}

async function parseOptions(argv: string[]): Promise<Options> {
  const { dirs, rest } = await parseCertArgs(argv);
  let prefix: string | null = null;
  let chapters: string[] = [];
  let course = false;
  let quizzes = false;
  const files: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a === "--course") course = true;
    else if (a === "--quizzes") quizzes = true;
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
    checkCourses: course || (!onlyQuestions && !quizzes),
    checkQuizzes: quizzes || course || !onlyQuestions,
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
    languages: content.blueprint.certification.languages,
  };
  const blueprintWarnings = vendorWarnings(content.blueprint);
  for (const w of blueprintWarnings) console.log(`⚠ ${path.relative(process.cwd(), path.join(root, "blueprint.yaml"))}: ${w}`);

  files.sort(compareCodeUnits);
  // Files are independent: read them all at once, then report in order.
  const texts = await Promise.all(files.map((file) => readFile(file, "utf8")));
  let errors = 0;
  let warned = blueprintWarnings.length;
  const byType = new Map<string, number>();
  const results = files.map((file, n) => validateFile(file, texts[n]!, ctx));
  // Exercises (kubectl runs in parallel, at most 4 at a time), then report in order.
  const extra = await Promise.all(files.map((file, n) => (results[n]!.data && results[n]!.type ? exerciseProblems(file, results[n]!.data as { id: string; type: string }) : Promise.resolve([]))));
  files.forEach((file, n) => {
    const { problems: own, warnings = [], type } = results[n]!;
    const problems = [...own, ...extra[n]!];
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

/** The chapters of a course as the quizzes see them, from the section markers of the English files (even when the course has problems). */
async function chaptersOf(dir: string): Promise<QuizChapter[]> {
  const folder = path.join(dir, "course", "chapters");
  const files = (await readdir(folder).catch(() => [] as string[])).filter((f) => f.endsWith(".en.md")).sort(compareCodeUnits);
  const texts = await Promise.all(files.map((f) => readFile(path.join(folder, f), "utf8")));
  return files.map((f, i) => ({ id: f.replace(/\.en\.md$/, ""), objectives: [...new Set(parseChapter(f, texts[i]!, "en").sections.flatMap((s) => s.objectives))] }));
}

/** The ids of every exam question, case study, series and quiz question of the repository: id → file. */
async function repositoryIds(dirs: string[]): Promise<Map<string, string>> {
  const files = (await Promise.all(dirs.flatMap((dir) => ["questions", "case-studies", "series", QUIZ_FOLDER].map((d) => listYaml(path.join(dir, d)))))).flat();
  // Thousands of files: 32 at a time (the open files limit).
  const texts: string[] = [];
  for (let i = 0; i < files.length; i += 32) texts.push(...(await Promise.all(files.slice(i, i + 32).map((f) => readFile(f, "utf8"))))); // NOSONAR: batches on purpose
  const ids = new Map<string, string>();
  files.forEach((f, i) => {
    // A bank file has one top-level id; a quiz file one per question.
    for (const m of texts[i]!.matchAll(/^(?:- +| {2}- +)?id:\s*["']?([A-Za-z0-9_-]+)/gm)) ids.set(m[1]!, path.relative(process.cwd(), f));
  });
  return ids;
}

/** Checks the quizzes of each certification that has a quizzes/ folder; returns the number of problems. */
async function validateQuizzes(dirs: string[], chapters: string[]): Promise<number> {
  // Quiz ids are unique in the whole repository: bank and quizzes of every certification.
  const ids = await repositoryIds(await listCertificationDirs());
  const mine = (file: string) => chapters.length === 0 || chapters.some((id) => path.basename(file).startsWith(`${id}.`));
  let problems = 0;
  for (const dir of dirs) {
    const quizzes = path.relative(process.cwd(), path.join(dir, QUIZ_FOLDER)) + path.sep;
    const content = await loadCertification(dir); // NOSONAR: sequential on purpose (readable output)
    const vendor = vendorOf(content.blueprint.certification.vendor);
    const examFiles = await listYaml(path.join(dir, "questions"));
    const exam = (await readYamlFiles(examFiles)).map((r) => (r.ok ? (r.value as { id?: string; stem?: { en?: string } } | null) : null));
    const check = await checkQuizzes(dir, {
      code: content.blueprint.certification.code,
      languages: content.blueprint.certification.languages,
      chapters: await chaptersOf(dir),
      bank: exam.flatMap((q) => (q?.id && q.stem?.en ? [{ id: q.id, stem: q.stem.en }] : [])),
      // This certification's quizzes are compared with each other by checkQuizzes.
      takenIds: new Map([...ids].filter(([, f]) => !f.startsWith(quizzes))),
      vendor,
      terms: await termsOf(vendor),
      examFormats: examFormats(content.blueprint.blueprint.typeMix),
    });
    if (check.files === 0) continue;
    // Exercises of the quizzes (positions 6–10 of CKAD and CKA).
    for (const quiz of check.quizzes) {
      const found = await Promise.all(quiz.questions.map((q) => exerciseProblems(quiz.file, q))); // NOSONAR: sequential by quiz (readable output)
      quiz.questions.forEach((q, i) => {
        for (const message of found[i]!) check.problems.push({ file: quiz.file, message: `${q.id}: ${message}` });
      });
    }
    const shown = check.problems.filter((p) => mine(p.file));
    for (const p of shown) console.log(`✘ ${path.relative(process.cwd(), p.file)}: ${p.message}`);
    const warned = check.warnings.filter((w) => mine(w.file));
    for (const w of warned) console.log(`⚠ ${path.relative(process.cwd(), w.file)}: ${w.message}`);
    problems += shown.length;
    console.log(`Quizzes ${content.blueprint.certification.code}: ${check.files} files, ${check.quizzes.reduce((n, q) => n + q.questions.length, 0)} questions, ${shown.length} problem(s), ${warned.length} warning(s).`);
  }
  return problems;
}

/** Prints (and with --mismatches, writes) where the written outputs differ from kubectl v1.37. */
async function reportMismatches(out: string | null) {
  if (!withKubectl || exercisesChecked === 0) return;
  for (const m of mismatches) console.log(`≠ ${path.relative(process.cwd(), m.file)} (${m.id}): ${m.message}`);
  console.log(`Exercises: ${exercisesChecked} checked with kubectl v1.37, ${mismatches.length} written output(s) differ from what kubectl prints.`);
  if (!out) return;
  const { writeFile } = await import("node:fs/promises");
  const lines = [
    "# Written outputs that differ from kubectl v1.37",
    "",
    `${mismatches.length} difference(s) in ${new Set(mismatches.map((m) => m.id)).size} exercise(s). The checks ran on what kubectl prints; the \`output\` fields were written by hand.`,
    "",
    ...mismatches.map((m) => `- \`${path.relative(process.cwd(), m.file)}\` (${m.id}): ${m.message}`),
    "",
  ];
  await writeFile(out, lines.join("\n"));
}

async function main() {
  let argv = process.argv.slice(2);
  const at = argv.indexOf("--mismatches");
  const mismatchFile = at >= 0 ? (argv[at + 1] ?? null) : null;
  if (at >= 0) argv = [...argv.slice(0, at), ...argv.slice(at + 2)];
  withKubectl = kubectlBinary() !== null;
  if (!withKubectl && process.env.REQUIRE_KUBECTL === "1") throw new Error("kubectl v1.37 is required (REQUIRE_KUBECTL=1): install it or set KUBECTL_BIN");
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
  const quizErrors = opts.checkQuizzes ? await validateQuizzes(opts.dirs, opts.chapters) : 0;
  await reportMismatches(mismatchFile);
  process.exit(errors + courseErrors + quizErrors ? 1 : 0);
}

try {
  await main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
