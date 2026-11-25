/**
 * End-of-chapter quizzes as students take them (docs/SPECS-QUIZ-CHAPITRE.md
 * §3, §5): 10 questions in the order of the file, options shuffled and frozen
 * for the attempt, a correction after each question, a result out of 10.
 *
 * - The answer key of a question leaves the server only in the correction of
 *   that question, once it is answered (`answerQuizQuestion`); a question is
 *   presented with `presentQuestion`, which never includes it.
 * - Visible to students when its 10 questions are published; administrators
 *   preview it otherwise (never with a retired question).
 * - Access: that of the chapter (QUIZ_RULES.freeChaptersOpen for the free
 *   chapters), checked on every call.
 * - Never part of the readiness score nor of the exam statistics: attempts
 *   live in their own table (quiz_attempt).
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, type ContentStatus, type PrismaClient, type QuestionType } from "@prisma/client";
import { pick, type Locale, type Localized } from "@/lib/i18n/config";
import { presentQuestion } from "@/lib/questions/present";
import { buildOptionOrder, type OptionOrder } from "@/lib/questions/order";
import type { PublicQuestion } from "@/lib/questions/public";
import { parseResponse } from "@/lib/questions/schema";
import { quizQuestions } from "@/lib/questions/usage";
import { createRng } from "@/lib/exam/random";
import { scoreItem, scoringRules } from "@/lib/exam/scoring";
import { explainQuestion, type QuestionExplanation } from "@/lib/exam/results";
import type { AccessLevel } from "@/lib/access";
import { localizeDocsUrl } from "@/lib/vendors";
import { courseLevel, offerUrl, visibleStatuses, type Viewer } from "./read";
import { betterQuizResult, isHardPosition, quizScore, QUIZ_RULES, type QuizScore } from "./quiz-rules";

export type QuizErrorCode = "not_found" | "locked" | "unavailable" | "finished" | "out_of_order" | "conflict";

export class QuizError extends Error {
  constructor(readonly code: QuizErrorCode) {
    super(code);
    this.name = "QuizError";
  }
}

/** A quiz closed at this access level (§5: same rule as the chapter, free chapters as QUIZ_RULES says). */
export const isQuizLocked = (chapter: { free: boolean }, level: AccessLevel): boolean => level !== "full" && !(chapter.free && QUIZ_RULES.freeChaptersOpen);

/** The state of a chapter's quiz in the outline (§3.1). */
export type QuizState = "not_attempted" | "to_review" | "mastered";

export interface QuizBest {
  score: number;
  hardScore: number;
  passed: boolean;
  completedAt: string;
}

export interface QuizSummary {
  state: QuizState;
  best: QuizBest | null;
}

/** The statuses of a quiz's questions a viewer may take: published only for students. */
const takeable = (viewer: Pick<Viewer, "isAdmin">, statuses: readonly ContentStatus[]) =>
  statuses.length === QUIZ_RULES.length && statuses.every((s) => s !== "retired" && (viewer.isAdmin || s === "published"));

const summaryOf = (best: QuizBest | null): QuizSummary => ({ state: best ? (best.passed ? "mastered" : "to_review") : "not_attempted", best });

/** The best finished attempt of each chapter (by chapter id). */
async function bestResults(db: PrismaClient, userId: string, where: Prisma.QuizAttemptWhereInput): Promise<Map<string, QuizBest>> {
  const done = await db.quizAttempt.findMany({
    where: { ...where, userId, completedAt: { not: null } },
    select: { chapterId: true, score: true, hardScore: true, passed: true, completedAt: true },
  });
  const best = new Map<string, { score: number; hardScore: number; passed: boolean; completedAt: Date }>();
  for (const a of done) {
    best.set(a.chapterId, betterQuizResult(best.get(a.chapterId) ?? null, { score: a.score ?? 0, hardScore: a.hardScore ?? 0, passed: a.passed ?? false, completedAt: a.completedAt! }));
  }
  return new Map([...best].map(([k, v]) => [k, { ...v, completedAt: v.completedAt.toISOString() }]));
}

/**
 * The quizzes of a certification's chapters the viewer may take, with the
 * viewer's state and best result, by chapter code (outline, §3.1), for a
 * certification code. A chapter
 * without quiz (or whose quiz is not published) is absent.
 */
export async function quizSummaries(db: PrismaClient, viewer: Viewer, code: string): Promise<Map<string, QuizSummary>> {
  const certification = { code };
  const [groups, chapters, best] = await Promise.all([
    db.question.groupBy({ by: ["chapterId", "status"], where: quizQuestions({ certification, chapterId: { not: null }, quizPosition: { not: null } }), _count: { _all: true } }),
    db.courseChapter.findMany({ where: { certification, status: { in: visibleStatuses(viewer) } }, select: { id: true, code: true } }),
    bestResults(db, viewer.userId, { chapter: { certification } }),
  ]);
  const out = new Map<string, QuizSummary>();
  for (const c of chapters) {
    const statuses = groups.filter((g) => g.chapterId === c.id).flatMap((g) => Array<ContentStatus>(g._count._all).fill(g.status));
    if (takeable(viewer, statuses)) out.set(c.code, summaryOf(best.get(c.id) ?? null));
  }
  return out;
}

/** The chapter, its quiz's questions and the viewer's access, or a QuizError. */
async function quizContext(db: PrismaClient, { certification: code, chapter: chapterCode, viewer }: { certification: string; chapter: string; viewer: Viewer }) {
  const chapter = await db.courseChapter.findFirst({
    where: { code: chapterCode, status: { in: visibleStatuses(viewer) }, certification: { code, active: true } },
    select: {
      id: true,
      code: true,
      title: true,
      free: true,
      certification: { select: { id: true, code: true, title: true, languages: true, blueprints: { where: { current: true }, select: { scoring: true } } } },
      sections: { orderBy: { order: "asc" }, select: { code: true, title: true, objectives: { select: { code: true } } } },
    },
  });
  if (!chapter) throw new QuizError("not_found");
  const questions = await db.question.findMany({
    where: quizQuestions({ chapterId: chapter.id, quizPosition: { not: null } }),
    orderBy: { quizPosition: "asc" },
    select: { id: true, quizPosition: true, status: true, type: true, stem: true, exhibits: true, body: true, shuffle: true, objective: { select: { code: true, title: true } } },
  });
  if (!takeable(viewer, questions.map((q) => q.status))) throw new QuizError("unavailable");
  const level = await courseLevel(db, viewer, chapter.certification.id);
  return { chapter, questions, level, locked: isQuizLocked(chapter, level), rules: scoringRules(chapter.certification.blueprints[0]?.scoring) };
}
type QuizContext = Awaited<ReturnType<typeof quizContext>>;

/** The content locale: the reader's, when the certification offers it (docs/SPECS-AWS.md §3.7). */
const contentLocale = (languages: readonly string[], locale: Locale): Locale => (languages.includes(locale) ? locale : "en");

/** optionOrder of an attempt: by position, the question and its frozen option order. */
type Frozen = Record<string, { question: string; order: OptionOrder }>;
/** results of an attempt: by position. */
type Results = Record<string, { questionId: string; earned: number; max: number; passed: boolean }>;

export interface QuizStep {
  position: number;
  /** Consolidation (1–5) or exam level (6–10). */
  hard: boolean;
  question: PublicQuestion;
}

export interface QuizCorrection extends QuestionExplanation {
  position: number;
  passed: boolean;
  earned: number;
  max: number;
  objective: { code: string; title: string };
  /** "Review the section": the sections of the chapter that cover the objective. */
  sections: { code: string; title: string; href: string }[];
}

export interface QuizResult extends QuizScore {
  /** Passed among positions 1–5. */
  easyScore: number;
  /** The sections to reread (objectives of the questions missed), in course order. */
  review: { code: string; title: string; href: string }[];
  best: QuizBest | null;
}

export interface QuizPage {
  certification: { code: string; title: string; languages: string[] };
  chapter: { code: string; title: string; free: boolean };
  /** Closed at the viewer's access level: the offer screen is the way on. */
  locked: boolean;
  offerUrl: string;
  /** Some questions are not published yet (administrator preview). */
  preview: boolean;
  best: QuizBest | null;
  /** The attempt in progress, at its next question. */
  attempt: { id: string; step: QuizStep; answered: number } | null;
  /** The last finished attempt, when none is in progress. */
  last: QuizResult | null;
}

const sectionHref = (certification: string, chapter: string, section: string) => `/course/${certification}/${chapter}#${section}`;

function sectionsFor(ctx: QuizContext, objectives: ReadonlySet<string>, locale: Locale) {
  return ctx.chapter.sections
    .filter((s) => s.objectives.some((o) => objectives.has(o.code)))
    .map((s) => ({ code: s.code, title: pick(s.title as Localized, locale), href: sectionHref(ctx.chapter.certification.code, ctx.chapter.code, s.code) }));
}

async function stepOf(ctx: QuizContext, frozen: Frozen, position: number, locale: Locale): Promise<QuizStep> {
  const entry = frozen[String(position)];
  const q = ctx.questions.find((x) => x.id === entry?.question);
  if (!entry || !q) throw new QuizError("conflict");
  return { position, hard: isHardPosition(position), question: await presentQuestion(q as typeof q & { type: QuestionType }, locale, entry.order, ctx.rules) };
}

function resultOf(ctx: QuizContext, results: Results, best: QuizBest | null, locale: Locale): QuizResult {
  const passedPositions = Object.entries(results).filter(([, r]) => r.passed).map(([p]) => Number(p));
  const score = quizScore(passedPositions);
  const missed = new Set(Object.values(results).filter((r) => !r.passed).flatMap((r) => ctx.questions.filter((q) => q.id === r.questionId).map((q) => q.objective.code)));
  return { ...score, easyScore: score.score - score.hardScore, review: sectionsFor(ctx, missed, locale), best };
}

/** The quiz page of a chapter for the viewer (§3). Throws a QuizError not_found or unavailable. */
export async function getQuizPage(db: PrismaClient, input: { certification: string; chapter: string; viewer: Viewer; locale: Locale }): Promise<QuizPage> {
  const ctx = await quizContext(db, input);
  const { chapter } = ctx;
  const locale = contentLocale(chapter.certification.languages, input.locale);
  const page: QuizPage = {
    certification: { code: chapter.certification.code, title: chapter.certification.title, languages: chapter.certification.languages },
    chapter: { code: chapter.code, title: pick(chapter.title as Localized, input.locale), free: chapter.free },
    locked: ctx.locked,
    offerUrl: offerUrl(chapter.certification.code),
    preview: ctx.questions.some((q) => q.status !== "published"),
    best: null,
    attempt: null,
    last: null,
  };
  if (ctx.locked) return page;
  page.best = (await bestResults(db, input.viewer.userId, { chapterId: chapter.id })).get(chapter.id) ?? null;
  const [current] = await db.quizAttempt.findMany({ where: { userId: input.viewer.userId, chapterId: chapter.id }, orderBy: [{ startedAt: "desc" }, { id: "desc" }], take: 1 });
  if (!current) return page;
  const results = current.results as Results;
  if (current.completedAt) page.last = resultOf(ctx, results, page.best, locale);
  else {
    const answered = Object.keys(results).length;
    try {
      page.attempt = { id: current.id, answered, step: await stepOf(ctx, current.optionOrder as Frozen, answered + 1, locale) };
    } catch (err) {
      // The quiz changed under the attempt (a new version seeded): it starts again.
      if (!(err instanceof QuizError)) throw err;
    }
  }
  return page;
}

/**
 * Starts an attempt (and drops the one in progress, if any): the 10
 * questions in the order of the file, their options shuffled once for the
 * attempt. Returns its id and first question.
 */
export async function startQuiz(
  db: PrismaClient,
  input: { certification: string; chapter: string; viewer: Viewer; locale: Locale; seed?: string; now?: Date },
): Promise<{ id: string; step: QuizStep }> {
  const ctx = await quizContext(db, input);
  if (ctx.locked) throw new QuizError("locked");
  const seed = input.seed ?? randomUUID();
  const frozen: Frozen = Object.fromEntries(
    ctx.questions.map((q) => [String(q.quizPosition), { question: q.id, order: buildOptionOrder(q.type, q.body, q.shuffle, createRng(`${seed}:${q.id}`)) }]),
  );
  const attempt = await db.$transaction(async (tx) => {
    await tx.quizAttempt.deleteMany({ where: { userId: input.viewer.userId, chapterId: ctx.chapter.id, completedAt: null } });
    return tx.quizAttempt.create({
      data: { userId: input.viewer.userId, chapterId: ctx.chapter.id, locale: input.locale, optionOrder: frozen as Prisma.InputJsonValue, ...(input.now && { startedAt: input.now }) },
      select: { id: true },
    });
  });
  return { id: attempt.id, step: await stepOf(ctx, frozen, 1, contentLocale(ctx.chapter.certification.languages, input.locale)) };
}

/** Largest response accepted (a hot area or a drag and drop is far below). */
const MAX_RESPONSE_BYTES = 8_000;

/**
 * Validates the answer to the next question of an attempt: scores it like
 * the exam (blueprint.scoring; passed with all its points), records it, and
 * returns its correction, then the next question or, after the last one, the
 * result. A position other than the next one is refused (out_of_order), as
 * is an answer sent twice at the same time (conflict).
 */
export async function answerQuizQuestion(
  db: PrismaClient,
  input: { attemptId: string; position: number; response: unknown; viewer: Viewer; locale: Locale; now?: Date },
): Promise<{ correction: QuizCorrection; next: QuizStep | null; result: QuizResult | null }> {
  const attempt = await db.quizAttempt.findFirst({
    where: { id: input.attemptId, userId: input.viewer.userId },
    select: { id: true, optionOrder: true, responses: true, results: true, completedAt: true, chapter: { select: { code: true, certification: { select: { code: true } } } } },
  });
  if (!attempt) throw new QuizError("not_found");
  if (attempt.completedAt) throw new QuizError("finished");
  const ctx = await quizContext(db, { certification: attempt.chapter.certification.code, chapter: attempt.chapter.code, viewer: input.viewer });
  if (ctx.locked) throw new QuizError("locked");
  const results = attempt.results as Results;
  const position = Object.keys(results).length + 1;
  if (input.position !== position) throw new QuizError("out_of_order");
  const frozen = attempt.optionOrder as Frozen;
  const entry = frozen[String(position)];
  const question = entry && (await db.question.findFirst({ where: quizQuestions({ id: entry.question, chapterId: ctx.chapter.id }), include: { objective: true } }));
  if (!question) throw new QuizError("conflict");

  const raw = JSON.stringify(input.response ?? null);
  const parsed = raw.length <= MAX_RESPONSE_BYTES ? parseResponse(question.type, input.response) : null;
  const response = parsed?.success ? (parsed.data as Prisma.InputJsonValue) : null;
  const score = scoreItem(question, response, ctx.rules);
  const passed = score.max > 0 && score.earned === score.max;
  const nextResults: Results = { ...results, [position]: { questionId: question.id, earned: score.earned, max: score.max, passed } };
  const last = position === QUIZ_RULES.length;
  const final = last ? quizScore(Object.entries(nextResults).filter(([, r]) => r.passed).map(([p]) => Number(p))) : null;
  // Compare and set: of two answers to the same question at the same time, one is recorded.
  const { count } = await db.quizAttempt.updateMany({
    where: { id: attempt.id, completedAt: null, results: { equals: attempt.results as Prisma.InputJsonValue } },
    data: {
      responses: { ...(attempt.responses as Record<string, unknown>), [position]: response } as Prisma.InputJsonValue,
      results: nextResults as Prisma.InputJsonValue,
      ...(final && { score: final.score, hardScore: final.hardScore, passed: final.passed, completedAt: input.now ?? new Date() }),
    },
  });
  if (count === 0) throw new QuizError("conflict");

  const locale = contentLocale(ctx.chapter.certification.languages, input.locale);
  const explained = await explainQuestion(question, locale, { options: true });
  const correction: QuizCorrection = {
    position,
    passed,
    earned: score.earned,
    max: score.max,
    objective: { code: question.objective.code, title: pick(question.objective.title as Localized, input.locale) },
    sections: sectionsFor(ctx, new Set([question.objective.code]), locale),
    ...explained,
    // The documentation in the language of the quiz.
    references: explained.references.map((r) => ({ title: r.title, url: localizeDocsUrl(r.url, locale) })),
  };
  if (!last) return { correction, next: await stepOf(ctx, frozen, position + 1, locale), result: null };
  const best = (await bestResults(db, input.viewer.userId, { chapterId: ctx.chapter.id })).get(ctx.chapter.id) ?? null;
  return { correction, next: null, result: resultOf(ctx, nextResults, best, locale) };
}
