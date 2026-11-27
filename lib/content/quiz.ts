/**
 * The end-of-chapter quizzes of a certification (docs/SPECS-QUIZ-CHAPITRE.md):
 *   content/<certification>/quizzes/<chapter>.yaml
 *     chapter: 12-rbac
 *     questions: [10 questions in the bank's format, by increasing difficulty]
 *
 * One set of rules (§4.3) for `content:validate` (every problem, warnings
 * included) and for the seed (`loadQuizzes`, first problem thrown).
 * The quizzes sit beside questions/, never in it: the exam bank
 * (lib/content/bank.ts) does not read them.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import { ContentError, readYamlFiles, type CertificationContent, type YamlRead } from "./loader";
import type { QuestionBank } from "./bank";
import type { Course } from "./course";
import { frenchProblems } from "./languages";
import { terminologyWarnings, type GlossaryTerm } from "./glossary";
import { questionFileSchema, type QuestionFile } from "@/lib/questions/schema";
import { referenceWarnings, type Vendor } from "@/lib/vendors";
import { QUIZ_RULES } from "@/lib/course/quiz-rules";
import type { Locale } from "@/lib/i18n/config";
import { compareCodeUnits } from "@/lib/sort";

export const QUIZ_FOLDER = "quizzes";

/** A question of a quiz, with its position: 1..QUIZ_RULES.length, the order of the file. */
export type QuizQuestion = QuestionFile & { position: number };

export interface ChapterQuiz {
  /** The chapter's code (its file name in course/chapters). */
  chapter: string;
  file: string;
  questions: QuizQuestion[];
}

/** A chapter as the quizzes see it: its code and the objectives of its sections. */
export interface QuizChapter {
  id: string;
  objectives: readonly string[];
}

export interface QuizContext {
  /** Certification code, e.g. az-104. */
  code: string;
  languages: readonly Locale[];
  chapters: readonly QuizChapter[];
  /** The exam questions of the certification (English stems), for the similarity check. */
  bank: readonly { id: string; stem: string }[];
  /** Ids already used elsewhere (exam bank, other quizzes): id → where. */
  takenIds?: ReadonlyMap<string, string>;
  /** Warnings: references off the vendor's documentation, terminology. */
  vendor?: Vendor;
  terms?: readonly GlossaryTerm[];
  /**
   * The exam formats other than `single` that the blueprint's typeMix offers.
   * With only one (Google Cloud: `multi`), positions 6-10 need two questions
   * of it instead of two formats (docs/SPECS-QUIZ-CHAPITRE.md §4.3).
   */
  examFormats?: readonly string[];
}

// --- Similarity of stems (word 4-grams, Jaccard) ---------------------------

/** The words of a text, lower case, code blocks left out. */
export function words(s: string): string[] {
  return s
    .toLowerCase()
    .replaceAll(/```[\s\S]*?```/g, " ")
    .replaceAll(/[^a-z0-9à-ÿ]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

/** The sequences of `n` successive words of a text. */
export function shingles(s: string, n = 4): Set<string> {
  const w = words(s);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
  return out;
}

/** |a ∩ b| / |a ∪ b|; 0 when either is empty. */
export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** The exam question whose stem is closest to `stem`, with its similarity. */
export function closestStem(stem: string, bank: readonly { id: string; shingles: ReadonlySet<string> }[]): { id: string; similarity: number } {
  const sh = shingles(stem);
  let best = { id: "", similarity: 0 };
  for (const b of bank) {
    const s = jaccard(sh, b.shingles);
    if (s > best.similarity) best = { id: b.id, similarity: s };
  }
  return best;
}

// --- Rules -------------------------------------------------------------------

/** The expected id of a quiz question: az104-qz-12-03. */
export function quizQuestionId(code: string, chapter: string, position: number): string {
  return `${code.replaceAll("-", "")}-qz-${chapter.split("-")[0]}-${String(position).padStart(2, "0")}`;
}

/** Every French text of a file ({ en, fr } values), for the terminology check. */
function frenchTexts(node: unknown): string[] {
  if (Array.isArray(node)) return node.flatMap(frenchTexts);
  if (!node || typeof node !== "object") return [];
  return Object.entries(node).flatMap(([k, v]) => (k === "fr" && typeof v === "string" ? [v] : frenchTexts(v)));
}

/** The wrong options of a single or multi question that have no explanation (undefined: no explanation.options at all). */
function unexplainedOptions(q: QuestionFile): string[] | undefined {
  if (q.type !== "single" && q.type !== "multi") return [];
  if (!q.explanation.options) return undefined;
  const answer = q.answer as { optionId?: string; optionIds?: string[] };
  const correct = q.type === "single" ? [answer.optionId ?? ""] : (answer.optionIds ?? []);
  const options = (q.body as { options: { id: string }[] }).options;
  return options.filter((o) => !correct.includes(o.id) && !q.explanation.options?.[o.id]).map((o) => o.id);
}

export interface QuizFileCheck {
  /** The quiz, when it has no problem. */
  quiz: ChapterQuiz | null;
  problems: string[];
  warnings: string[];
}

/** Every problem and warning of one quiz file (already parsed from YAML). */
export function checkQuizFile(raw: unknown, file: string, ctx: QuizContext, bankShingles = ctx.bank.map((b) => ({ id: b.id, shingles: shingles(b.stem) }))): QuizFileCheck {
  const problems: string[] = [];
  const warnings: string[] = [];
  const name = path.basename(file).replace(/\.ya?ml$/, "");
  const doc = (raw ?? {}) as { chapter?: unknown; questions?: unknown };
  const chapter = ctx.chapters.find((c) => c.id === name);
  if (doc.chapter !== name) problems.push(`chapter must be "${name}" (the file name)`);
  if (!chapter) problems.push(`no chapter ${name} in course/chapters`);
  else if (chapter.objectives.length === 0) problems.push(`chapter ${name} has no objective: no quiz for it`);
  const objectives = new Set(chapter?.objectives ?? []);
  const list = Array.isArray(doc.questions) ? doc.questions : [];
  if (list.length !== QUIZ_RULES.length) problems.push(`needs exactly ${QUIZ_RULES.length} questions, has ${list.length}`);

  const questions: QuizQuestion[] = [];
  const tested = new Set<string>();
  const hardFormats = new Set<string>();
  let hardOthers = 0;
  let lastEasy = 0;
  list.forEach((item, i) => {
    const position = i + 1;
    const r = questionFileSchema.safeParse(item);
    if (!r.success) {
      for (const issue of r.error.issues) problems.push(`q${position} ${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`);
      return;
    }
    const q = r.data;
    const where = `q${position} (${q.id})`;
    for (const p of frenchProblems(item, ctx.languages)) problems.push(`${where} ${p}`);
    const want = quizQuestionId(ctx.code, name, position);
    if (q.id !== want) problems.push(`${where}: id must be ${want}`);
    const taken = ctx.takenIds?.get(q.id);
    if (taken) problems.push(`${where}: id already used by ${taken}`);
    if (questions.some((x) => x.id === q.id)) problems.push(`${where}: id used twice in this quiz`);
    if (chapter && !objectives.has(q.objective)) problems.push(`${where}: objective ${q.objective} is not one of the chapter (${[...objectives].join(", ")})`);
    tested.add(q.objective);
    if (q.caseStudy || q.series || q.type === "series_yesno") problems.push(`${where}: no case study or series in a quiz`);
    if (position <= QUIZ_RULES.easy) {
      if (q.difficulty === 3) problems.push(`${where}: positions 1-${QUIZ_RULES.easy} are difficulty 1 or 2`);
      if (position === 1 && q.difficulty !== 1) problems.push(`${where}: the first question is difficulty 1`);
      if (q.difficulty < lastEasy) problems.push(`${where}: difficulty must not decrease`);
      lastEasy = q.difficulty;
    } else {
      if (q.difficulty !== 3) problems.push(`${where}: positions ${QUIZ_RULES.easy + 1}-${QUIZ_RULES.length} are exam level (difficulty 3)`);
      if (q.type !== "single") {
        hardFormats.add(q.type);
        hardOthers += 1;
      }
    }
    const unexplained = unexplainedOptions(q);
    if (unexplained === undefined) problems.push(`${where}: explanation.options is required`);
    else if (unexplained.length > 0) problems.push(`${where}: explanation.options misses ${unexplained.join(", ")}`);
    // Never close to a mock-exam question (§1: none of them may appear in an exam).
    const closest = closestStem(q.stem.en, bankShingles);
    if (closest.similarity >= QUIZ_RULES.similarityLimit) problems.push(`${where}: stem too close to exam question ${closest.id} (similarity ${closest.similarity.toFixed(2)}, limit ${QUIZ_RULES.similarityLimit})`);
    if (ctx.vendor) warnings.push(...referenceWarnings(q.references, ctx.vendor).map((w) => `${where} ${w}`));
    if (ctx.terms) warnings.push(...terminologyWarnings(frenchTexts(item).join("\n"), ctx.terms).map((w) => `${where} ${w}`));
    questions.push({ ...q, position });
  });
  for (const o of objectives) if (!tested.has(o)) problems.push(`objective ${o} of the chapter is not tested`);
  const hard = `positions ${QUIZ_RULES.easy + 1}-${QUIZ_RULES.length}`;
  const only = ctx.examFormats?.length === 1 ? ctx.examFormats[0] : undefined;
  if (list.length > QUIZ_RULES.easy && only !== undefined) {
    if (hardOthers < 2) problems.push(`${hard} need at least two ${only} questions (the only exam format other than single; have ${hardOthers})`);
  } else if (list.length > QUIZ_RULES.easy && hardFormats.size < 2)
    problems.push(`${hard} need at least two formats other than single (have: ${[...hardFormats].join(", ") || "none"})`);
  return { quiz: problems.length === 0 ? { chapter: name, file, questions } : null, problems, warnings };
}

/** The chapters of a loaded course, as the quizzes see them. */
export function quizChapters(course: Course | null): QuizChapter[] {
  return (course?.chapters ?? []).map((c) => ({ id: c.id, objectives: [...new Set(c.sections.flatMap((s) => s.objectives))] }));
}

/** The quiz files of a certification, sorted; null without quizzes/ folder. */
export async function quizFiles(dir: string): Promise<string[] | null> {
  const folder = path.join(dir, QUIZ_FOLDER);
  let entries;
  try {
    entries = await readdir(folder, { withFileTypes: true });
  } catch {
    return null;
  }
  return entries
    .filter((e) => e.isFile() && /\.ya?ml$/.test(e.name))
    .map((e) => path.join(folder, e.name))
    .sort(compareCodeUnits);
}

export interface QuizzesCheck {
  quizzes: ChapterQuiz[];
  /** By file (a missing quiz: the file it should be). */
  problems: { file: string; message: string }[];
  warnings: { file: string; message: string }[];
  /** Files read. */
  files: number;
}

/**
 * Checks every quiz of a certification: each file (checkQuizFile), ids unique
 * across its quizzes, and one quiz for every chapter with objectives once the
 * quizzes/ folder exists. Without that folder: no quiz, no problem.
 */
export async function checkQuizzes(dir: string, ctx: QuizContext): Promise<QuizzesCheck> {
  const files = await quizFiles(dir);
  if (!files) return { quizzes: [], problems: [], warnings: [], files: 0 };
  const reads: YamlRead[] = await readYamlFiles(files);
  const bankShingles = ctx.bank.map((b) => ({ id: b.id, shingles: shingles(b.stem) }));
  const taken = new Map(ctx.takenIds ?? []);
  const result: QuizzesCheck = { quizzes: [], problems: [], warnings: [], files: files.length };
  files.forEach((file, i) => {
    const read = reads[i]!;
    if (!read.ok) {
      result.problems.push({ file, message: `YAML: ${(read.error as Error).message.split("\n")[0]}` });
      return;
    }
    const check = checkQuizFile(read.value, file, { ...ctx, takenIds: taken }, bankShingles);
    result.problems.push(...check.problems.map((message) => ({ file, message })));
    result.warnings.push(...check.warnings.map((message) => ({ file, message })));
    // Later files see the ids of this one.
    const list = (read.value as { questions?: unknown } | null)?.questions;
    if (Array.isArray(list)) for (const q of list) if (q && typeof (q as { id?: unknown }).id === "string") taken.set((q as { id: string }).id, path.relative(process.cwd(), file));
    if (check.quiz) result.quizzes.push(check.quiz);
  });
  const have = new Set(files.map((f) => path.basename(f).replace(/\.ya?ml$/, "")));
  for (const c of ctx.chapters) {
    if (c.objectives.length > 0 && !have.has(c.id)) result.problems.push({ file: path.join(dir, QUIZ_FOLDER, `${c.id}.yaml`), message: "missing: every chapter with objectives has a quiz" });
  }
  return result;
}

/** The formats other than `single` that a typeMix offers (a share above 0). */
export function examFormats(typeMix: Readonly<Record<string, { max: number } | undefined>>): string[] {
  return Object.entries(typeMix)
    .filter(([type, share]) => type !== "single" && (share?.max ?? 0) > 0)
    .map(([type]) => type);
}

/** The context of the checks from the loaded content, course and bank. */
export function quizContext(content: CertificationContent, course: Course | null, bank: QuestionBank): QuizContext {
  return {
    code: content.blueprint.certification.code,
    languages: content.blueprint.certification.languages,
    chapters: quizChapters(course),
    bank: bank.questions.map((q) => ({ id: q.id, stem: q.stem.en })),
    takenIds: new Map([...bank.questions, ...bank.caseStudies, ...bank.series].map((x) => [x.id, path.relative(process.cwd(), x.file)])),
    examFormats: examFormats(content.blueprint.blueprint.typeMix),
  };
}

/** The quizzes of a certification for the seed. Throws a ContentError on the first problem. */
export async function loadQuizzes(content: CertificationContent, course: Course | null, bank: QuestionBank): Promise<ChapterQuiz[]> {
  const check = await checkQuizzes(content.dir, quizContext(content, course, bank));
  const [first] = check.problems;
  if (first) {
    const more = check.problems.length > 1 ? ` (and ${check.problems.length - 1} more: npm run content:validate)` : "";
    throw new ContentError(first.file, first.message + more);
  }
  return check.quizzes;
}
