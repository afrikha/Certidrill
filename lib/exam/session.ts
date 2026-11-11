/**
 * Exam session (spec §5): server-side clock, one-way sections, locking,
 * autosave, submission and expiry. The server is the source of truth for
 * time, locks and scoring; the browser only mirrors it.
 *
 * Every function takes the Prisma client and the current time so it can be
 * tested deterministically.
 */
import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient, type QuestionType } from "@prisma/client";
import { pick, type Locale, isLocale, defaultLocale } from "@/lib/i18n/config";
import { renderMarkdown, renderInline } from "@/lib/markdown";
import { presentQuestion } from "@/lib/questions/present";
import { buildOptionOrder, type OptionOrder } from "@/lib/questions/order";
import { parseResponse } from "@/lib/questions/schema";
import type { PublicQuestion } from "@/lib/questions/public";
import type { BlueprintStructure } from "@/lib/content/schema";
import { logEvent } from "@/lib/log";
import { assembleExam } from "./assembler";
import { loadAssemblyBank, loadAssemblyBlueprint, loadHistory } from "./bank-query";
import { createRng } from "./random";
import { scoreExam, scoreItem } from "./scoring";

/** Writes arriving up to this long after the deadline are still accepted (network latency). */
export const DEADLINE_GRACE_MS = 5_000;

export type SessionErrorCode =
  | "not_found"
  | "inactive_certification"
  | "empty_bank"
  | "not_started"
  | "already_started"
  | "finished"
  | "expired"
  | "locked"
  | "not_current_section"
  | "final_answer"
  | "out_of_order"
  | "invalid_response"
  | "last_section";

const STATUS: Record<SessionErrorCode, number> = {
  not_found: 404,
  inactive_certification: 404,
  empty_bank: 409,
  not_started: 409,
  already_started: 409,
  finished: 409,
  expired: 409,
  locked: 409,
  not_current_section: 409,
  final_answer: 409,
  out_of_order: 409,
  invalid_response: 400,
  last_section: 400,
};

export class SessionError extends Error {
  readonly status: number;
  constructor(readonly code: SessionErrorCode, message?: string) {
    super(message ?? code);
    this.name = "SessionError";
    this.status = STATUS[code];
  }
}

// ------------------------------------------------------------------ create & start

export interface CreateAttemptResult {
  attemptId: string;
  /** True when an in-progress attempt already existed and is returned instead. */
  resumed: boolean;
  shortfall: number;
}

export async function createAttempt(
  db: PrismaClient,
  { userId, certificationCode, locale, now = new Date(), seed = randomUUID() }: { userId: string; certificationCode: string; locale: Locale; now?: Date; seed?: string },
): Promise<CreateAttemptResult> {
  const certification = await db.certification.findUnique({ where: { code: certificationCode } });
  if (!certification?.active) throw new SessionError("inactive_certification");

  await expireOverdue(db, userId, now);
  const existing = await db.attempt.findFirst({ where: { userId, certificationId: certification.id, status: "in_progress" } });
  if (existing) return { attemptId: existing.id, resumed: true, shortfall: 0 };

  const { row: blueprintRow, blueprint } = await loadAssemblyBlueprint(db, certification.id);
  const [bank, history] = await Promise.all([loadAssemblyBank(db, certification.id), loadHistory(db, userId, certification.id)]);
  const exam = assembleExam({ blueprint, bank, history, seed });
  const questionIds = exam.sections.flatMap((s) => s.questionIds);
  if (questionIds.length === 0) throw new SessionError("empty_bank");

  const questions = await db.question.findMany({ where: { id: { in: questionIds } }, select: { id: true, type: true, body: true, shuffle: true } });
  const byId = new Map(questions.map((q) => [q.id, q]));

  try {
    const attempt = await db.$transaction(async (tx) => {
      const attempt = await tx.attempt.create({
        data: { userId, certificationId: certification.id, blueprintId: blueprintRow.id, mode: "exam", locale, seed, createdAt: now },
      });
      let order = 0;
      for (const [i, section] of exam.sections.entries()) {
        const created = await tx.attemptSection.create({
          data: {
            attemptId: attempt.id,
            order: i + 1,
            kind: section.kind,
            caseStudyId: section.kind === "case_study" ? section.caseStudyId : null,
            seriesId: section.kind === "series" ? section.seriesId : null,
          },
        });
        await tx.attemptItem.createMany({
          data: section.questionIds.map((questionId) => {
            const q = byId.get(questionId)!;
            order += 1;
            return {
              attemptId: attempt.id,
              sectionId: created.id,
              questionId,
              order,
              optionOrder: buildOptionOrder(q.type, q.body, q.shuffle, createRng(`${seed}:${questionId}`)) as Prisma.InputJsonValue,
            };
          }),
        });
      }
      return attempt;
    });
    logEvent("exam.created", { attemptId: attempt.id, userId, certification: certificationCode, questions: questionIds.length, shortfall: exam.shortfall, reused: exam.reused });
    return { attemptId: attempt.id, resumed: false, shortfall: exam.shortfall };
  } catch (err) {
    // Concurrent creation: the partial unique index allows one in-progress attempt.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const again = await db.attempt.findFirst({ where: { userId, certificationId: certification.id, status: "in_progress" } });
      if (again) return { attemptId: again.id, resumed: true, shortfall: 0 };
    }
    throw err;
  }
}

/** Starts the clock (the "Start" button of the welcome screen). */
export async function startAttempt(db: PrismaClient, { attemptId, userId, now = new Date() }: { attemptId: string; userId: string; now?: Date }) {
  const attempt = await ownedAttempt(db, attemptId, userId);
  if (attempt.status !== "in_progress") throw new SessionError("finished");
  if (attempt.startedAt) return attempt; // idempotent: a double click does not restart the clock
  const deadlineAt = new Date(now.getTime() + attempt.blueprint.durationMin * 60_000);
  const updated = await db.attempt.updateMany({ where: { id: attempt.id, startedAt: null }, data: { startedAt: now, deadlineAt } });
  if (updated.count) logEvent("exam.started", { attemptId, userId, deadlineAt: deadlineAt.toISOString() });
  return db.attempt.findUniqueOrThrow({ where: { id: attempt.id } });
}

// ------------------------------------------------------------------ read

export interface AttemptSectionView {
  id: string;
  order: number;
  kind: "case_study" | "series" | "main";
  locked: boolean;
  caseStudy?: { titleHtml: string; tabs: { key: string; titleHtml: string; html: string }[] };
  seriesStemHtml?: string;
  itemIds: string[];
}

export interface AttemptItemView {
  id: string;
  order: number;
  sectionId: string;
  question: PublicQuestion;
  response: unknown;
  flagged: boolean;
  answered: boolean;
}

export interface AttemptView {
  id: string;
  status: "not_started" | "in_progress" | "submitted" | "expired";
  locale: Locale;
  certification: { code: string; title: string };
  durationMin: number;
  totalQuestions: number;
  /** Blueprint range, to tell the candidate when the bank is still too small. */
  questionRange: { min: number; max: number };
  sectionKinds: ("case_study" | "series" | "main")[];
  startedAt: string | null;
  deadlineAt: string | null;
  serverNow: string;
  remainingMs: number | null;
  warningsMin: number[];
  currentSectionId: string | null;
  /** Empty until the exam has started: questions are not revealed before the clock runs. */
  sections: AttemptSectionView[];
  items: AttemptItemView[];
}

/**
 * The state of an attempt for its owner, WITHOUT answers or explanations.
 * Expires the attempt first if its deadline has passed.
 */
export async function getAttemptView(db: PrismaClient, { attemptId, userId, now = new Date() }: { attemptId: string; userId: string; now?: Date }): Promise<AttemptView> {
  await finalizeIfExpired(db, attemptId, userId, now);
  const attempt = await db.attempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      certification: true,
      blueprint: true,
      sections: { orderBy: { order: "asc" }, include: { caseStudy: true, series: true } },
      items: { orderBy: { order: "asc" }, include: { question: true } },
    },
  });
  if (!attempt) throw new SessionError("not_found");
  const locale: Locale = isLocale(attempt.locale) ? attempt.locale : defaultLocale;
  const started = attempt.startedAt !== null;
  const status = attempt.status === "in_progress" && !started ? "not_started" : attempt.status;
  const structure = attempt.blueprint.structure as BlueprintStructure;

  const view: AttemptView = {
    id: attempt.id,
    status,
    locale,
    certification: { code: attempt.certification.code, title: attempt.certification.title },
    durationMin: attempt.blueprint.durationMin,
    totalQuestions: attempt.items.length,
    questionRange: { min: attempt.blueprint.minQuestions, max: attempt.blueprint.maxQuestions },
    sectionKinds: attempt.sections.map((s) => s.kind),
    startedAt: attempt.startedAt?.toISOString() ?? null,
    deadlineAt: attempt.deadlineAt?.toISOString() ?? null,
    serverNow: now.toISOString(),
    remainingMs: attempt.deadlineAt && attempt.status === "in_progress" ? Math.max(0, attempt.deadlineAt.getTime() - now.getTime()) : null,
    warningsMin: structure.warningsMin ?? [],
    currentSectionId: attempt.status === "in_progress" ? (attempt.sections.find((s) => !s.lockedAt)?.id ?? null) : null,
    sections: [],
    items: [],
  };
  if (status !== "in_progress") return view; // before start: no questions; after: see the results page

  view.sections = await Promise.all(
    attempt.sections.map(async (s) => ({
      id: s.id,
      order: s.order,
      kind: s.kind,
      locked: s.lockedAt !== null,
      itemIds: attempt.items.filter((i) => i.sectionId === s.id).map((i) => i.id),
      caseStudy: s.caseStudy
        ? {
            titleHtml: await renderInline(pick(s.caseStudy.title as { en: string; fr: string }, locale)),
            tabs: await Promise.all(
              (s.caseStudy.tabs as { key: string; title: { en: string; fr: string }; body: { en: string; fr: string } }[]).map(async (t) => ({
                key: t.key,
                titleHtml: await renderInline(pick(t.title, locale)),
                html: await renderMarkdown(pick(t.body, locale)),
              })),
            ),
          }
        : undefined,
      seriesStemHtml: s.series ? await renderMarkdown(pick(s.series.stem as { en: string; fr: string }, locale)) : undefined,
    })),
  );
  view.items = await Promise.all(
    attempt.items.map(async (i) => ({
      id: i.id,
      order: i.order,
      sectionId: i.sectionId,
      question: await presentQuestion(i.question, locale, i.optionOrder as OptionOrder),
      response: i.response,
      flagged: i.flagged,
      answered: i.answeredAt !== null,
    })),
  );
  return view;
}

// ------------------------------------------------------------------ write

async function ownedAttempt(db: PrismaClient, attemptId: string, userId: string) {
  // A missing attempt and someone else's attempt are indistinguishable.
  const attempt = await db.attempt.findFirst({ where: { id: attemptId, userId }, include: { blueprint: true } });
  if (!attempt) throw new SessionError("not_found");
  return attempt;
}

/** Loads an attempt for a write: owned, started, not finished, not past its deadline. */
async function writableAttempt(db: PrismaClient, attemptId: string, userId: string, now: Date) {
  const attempt = await ownedAttempt(db, attemptId, userId);
  if (attempt.status !== "in_progress") throw new SessionError("finished");
  if (!attempt.startedAt || !attempt.deadlineAt) throw new SessionError("not_started");
  if (now.getTime() > attempt.deadlineAt.getTime() + DEADLINE_GRACE_MS) {
    await submitAttempt(db, { attemptId, userId, now, reason: "expired" });
    throw new SessionError("expired");
  }
  const sections = await db.attemptSection.findMany({ where: { attemptId }, orderBy: { order: "asc" } });
  const current = sections.find((s) => !s.lockedAt) ?? null;
  return { attempt, sections, current };
}

export async function saveItem(
  db: PrismaClient,
  { attemptId, itemId, userId, response, flagged, now = new Date() }: { attemptId: string; itemId: string; userId: string; response?: unknown; flagged?: boolean; now?: Date },
) {
  const { current } = await writableAttempt(db, attemptId, userId, now);
  const item = await db.attemptItem.findFirst({ where: { id: itemId, attemptId }, include: { question: { select: { type: true } }, section: true } });
  if (!item) throw new SessionError("not_found");
  if (item.section.lockedAt) throw new SessionError("locked");
  if (item.sectionId !== current?.id) throw new SessionError("not_current_section");

  const data: Prisma.AttemptItemUpdateInput = {};
  if (response !== undefined) {
    if (response !== null) {
      const parsed = parseResponse(item.question.type as QuestionType, response);
      if (!parsed.success) throw new SessionError("invalid_response");
      data.response = parsed.data as Prisma.InputJsonValue;
      data.answeredAt = now;
    } else {
      data.response = Prisma.DbNull;
      data.answeredAt = null;
    }
    if (item.section.kind === "series") {
      // One-way series: every answer is final, and questions are answered in order.
      if (item.answeredAt) throw new SessionError("final_answer");
      if (response === null) throw new SessionError("invalid_response");
      const earlierUnanswered = await db.attemptItem.count({ where: { sectionId: item.sectionId, order: { lt: item.order }, answeredAt: null } });
      if (earlierUnanswered > 0) throw new SessionError("out_of_order");
    }
  }
  if (flagged !== undefined && item.section.kind === "main") data.flagged = flagged;
  if (Object.keys(data).length === 0) return item;

  // Guard against a concurrent lock: only update while the section is still open.
  const updated = await db.attemptItem.updateMany({
    where: { id: item.id, section: { lockedAt: null }, ...(item.section.kind === "series" && response !== undefined ? { answeredAt: null } : {}) },
    data: data as Prisma.AttemptItemUpdateManyMutationInput,
  });
  if (updated.count === 0) throw new SessionError(item.section.kind === "series" ? "final_answer" : "locked");
  return db.attemptItem.findUniqueOrThrow({ where: { id: item.id } });
}

/**
 * Leaves the current section: it can never be modified again. The last
 * section is not locked this way: the exam is submitted instead.
 */
export async function lockSection(db: PrismaClient, { attemptId, sectionId, userId, now = new Date() }: { attemptId: string; sectionId: string; userId: string; now?: Date }) {
  const { sections, current } = await writableAttempt(db, attemptId, userId, now);
  const section = sections.find((s) => s.id === sectionId);
  if (!section) throw new SessionError("not_found");
  if (section.lockedAt) return section; // idempotent
  if (section.id === sections.at(-1)?.id) throw new SessionError("last_section");
  if (section.id !== current?.id) throw new SessionError("not_current_section");
  const locked = await db.attemptSection.update({ where: { id: section.id }, data: { lockedAt: now } });
  logEvent("exam.section_locked", { attemptId, userId, sectionId, kind: section.kind });
  return locked;
}

/** Scores every item and closes the attempt (final submission or expiry). */
export async function submitAttempt(
  db: PrismaClient,
  { attemptId, userId, now = new Date(), reason = "submitted" }: { attemptId: string; userId: string; now?: Date; reason?: "submitted" | "expired" },
) {
  const attempt = await ownedAttempt(db, attemptId, userId);
  if (attempt.status !== "in_progress") return attempt; // idempotent
  if (!attempt.startedAt) throw new SessionError("not_started");

  const items = await db.attemptItem.findMany({ where: { attemptId }, include: { question: { select: { type: true, body: true, answer: true } } } });
  const scores = items.map((i) => ({ id: i.id, ...scoreItem(i.question, i.response) }));
  const total = scoreExam(scores, attempt.blueprint);
  const submittedAt = reason === "expired" && attempt.deadlineAt && attempt.deadlineAt < now ? attempt.deadlineAt : now;

  const result = await db.$transaction(async (tx) => {
    // Only one closer wins (double click, timer and expiry racing).
    const closed = await tx.attempt.updateMany({
      where: { id: attemptId, status: "in_progress" },
      data: { status: reason, submittedAt, scaledScore: total.scaledScore, passed: total.passed },
    });
    if (closed.count === 0) return false;
    for (const s of scores) await tx.attemptItem.update({ where: { id: s.id }, data: { pointsEarned: s.earned, pointsMax: s.max } });
    await tx.attemptSection.updateMany({ where: { attemptId, lockedAt: null }, data: { lockedAt: submittedAt } });
    return true;
  });
  if (result) logEvent(reason === "expired" ? "exam.expired" : "exam.submitted", { attemptId, userId, scaledScore: total.scaledScore, passed: total.passed });
  return db.attempt.findUniqueOrThrow({ where: { id: attemptId } });
}

/** Closes the attempt as expired if its deadline (plus grace) has passed. */
export async function finalizeIfExpired(db: PrismaClient, attemptId: string, userId: string, now = new Date()) {
  const attempt = await db.attempt.findFirst({ where: { id: attemptId, userId }, select: { status: true, deadlineAt: true } });
  if (attempt?.status === "in_progress" && attempt.deadlineAt && now.getTime() > attempt.deadlineAt.getTime() + DEADLINE_GRACE_MS) {
    await submitAttempt(db, { attemptId, userId, now, reason: "expired" });
  }
}

/** Expires every overdue attempt of a user (called before listing or creating attempts). */
export async function expireOverdue(db: PrismaClient, userId: string, now = new Date()) {
  const overdue = await db.attempt.findMany({
    where: { userId, status: "in_progress", deadlineAt: { lt: new Date(now.getTime() - DEADLINE_GRACE_MS) } },
    select: { id: true },
  });
  for (const a of overdue) await submitAttempt(db, { attemptId: a.id, userId, now, reason: "expired" });
}
