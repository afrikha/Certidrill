/**
 * Score report and correction (spec §5, §10) — only for finished attempts.
 * Domain scores are computed on the fly from attempt_item (spec §8).
 */
import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { pick, type Locale } from "@/lib/i18n/config";
import { renderInline, renderMarkdown } from "@/lib/markdown";
import { presentQuestion, text } from "@/lib/questions/present";
import type { OptionOrder } from "@/lib/questions/order";
import type { PublicQuestion } from "@/lib/questions/public";
import type { Choice, QuestionAnswer, QuestionBody, QuestionTypeCode } from "@/lib/questions/schema";
import type { BlueprintStructure } from "@/lib/content/schema";
import { breakdownBy, type Breakdown } from "./scoring";
import { SessionError, finalizeIfExpired } from "./session";

type L = { en: string; fr: string };

export interface CorrectionItem {
  id: string;
  order: number;
  sectionKind: "case_study" | "series" | "main";
  domain: { code: string; title: string };
  objective: { code: string; title: string };
  flagged: boolean;
  earned: number;
  max: number;
  question: PublicQuestion;
  seriesStemHtml?: string;
  caseStudyTitle?: string;
  response: unknown;
  /** The expected answer, as readable lines. */
  correctAnswer: { label?: string; html: string }[];
  explanationHtml: string;
  /** Why the wrong choices are wrong. */
  optionExplanations: { label: string; html: string }[];
  references: { title: string; url: string }[];
}

export interface AttemptResults {
  id: string;
  status: "submitted" | "expired";
  locale: Locale;
  certification: { code: string; title: string };
  scaledScore: number;
  passed: boolean;
  passScore: number;
  maxScore: number;
  earned: number;
  possible: number;
  startedAt: string;
  submittedAt: string;
  timeUsedMs: number;
  durationMin: number;
  domains: (Breakdown & { title: string })[];
  types: Breakdown[];
  items: CorrectionItem[];
}

async function choiceLabel(list: Choice[], id: string, locale: Locale): Promise<string> {
  const c = list.find((x) => x.id === id);
  return c ? renderInline(text(c.text, locale)) : id;
}

type AnswerLine = { label?: string; html: string };
type Describer = (body: unknown, answer: unknown, locale: Locale, yesNo: [string, string]) => Promise<AnswerLine[]>;

/** Readable expected answer, per question type. Lines keep the body's order. */
const DESCRIBERS: Record<QuestionTypeCode, Describer> = {
  single: async (body, answer, locale) => [
    { html: await choiceLabel((body as QuestionBody<"single">).options, (answer as QuestionAnswer<"single">).optionId, locale) },
  ],
  multi: (body, answer, locale) =>
    Promise.all((answer as QuestionAnswer<"multi">).optionIds.map(async (id) => ({ html: await choiceLabel((body as QuestionBody<"multi">).options, id, locale) }))),
  yesno_statements: (body, answer, locale, yesNo) => {
    const a = answer as QuestionAnswer<"yesno_statements">;
    return Promise.all(
      (body as QuestionBody<"yesno_statements">).statements.map(async (s) => ({ label: await renderInline(text(s.text, locale)), html: a.values[s.id] ? yesNo[0] : yesNo[1] })),
    );
  },
  dropdown: (body, answer, locale) => {
    const a = answer as QuestionAnswer<"dropdown">;
    return Promise.all(
      (body as QuestionBody<"dropdown">).slots.map(async (slot, i) => ({ label: `${i + 1}`, html: await choiceLabel(slot.options, a.values[slot.id]!, locale) })),
    );
  },
  dragdrop: (body, answer, locale) => {
    const b = body as QuestionBody<"dragdrop">;
    const a = answer as QuestionAnswer<"dragdrop">;
    return Promise.all(b.targets.map(async (t) => ({ label: await renderInline(text(t.text, locale)), html: await choiceLabel(b.items, a.mapping[t.id]!, locale) })));
  },
  ordering: (body, answer, locale) =>
    Promise.all(
      (answer as QuestionAnswer<"ordering">).sequence.map(async (id, i) => ({ label: `${i + 1}`, html: await choiceLabel((body as QuestionBody<"ordering">).actions, id, locale) })),
    ),
  hotarea: (body, answer, locale) => {
    const b = body as QuestionBody<"hotarea">;
    const a = answer as QuestionAnswer<"hotarea">;
    const areas = b.grid.rows.flat().filter((c) => c.area);
    return Promise.all(
      b.prompts.map(async (p) => {
        const cell = areas.find((c) => c.area === a.values[p.id]);
        return { label: await renderInline(text(p.text, locale)), html: cell?.text ? await renderInline(text(cell.text, locale)) : (a.values[p.id] ?? "") };
      }),
    );
  },
  series_yesno: (_body, answer, _locale, yesNo) => Promise.resolve([{ html: (answer as QuestionAnswer<"series_yesno">).value ? yesNo[0] : yesNo[1] }]),
};

/** Readable expected answer of a question, per type. */
export async function describeAnswer(type: QuestionTypeCode, rawBody: unknown, rawAnswer: unknown, locale: Locale, yesNo: [string, string]): Promise<AnswerLine[]> {
  return DESCRIBERS[type](rawBody, rawAnswer, locale, yesNo);
}

/** Labels of the elements that per-option explanations refer to. */
function explainedElements(type: QuestionTypeCode, body: unknown): Choice[] {
  switch (type) {
    case "single":
    case "multi":
      return (body as QuestionBody<"single">).options;
    case "yesno_statements":
      return (body as QuestionBody<"yesno_statements">).statements;
    case "dropdown":
      return (body as QuestionBody<"dropdown">).slots.flatMap((s) => s.options);
    case "dragdrop":
      return [...(body as QuestionBody<"dragdrop">).items, ...(body as QuestionBody<"dragdrop">).targets];
    case "ordering":
      return (body as QuestionBody<"ordering">).actions;
    case "hotarea":
      return (body as QuestionBody<"hotarea">).grid.rows.flat().flatMap((c) => (c.area ? [{ id: c.area, text: c.text ?? c.area }] : []));
    default:
      return [];
  }
}

export async function getAttemptResults(
  db: PrismaClient,
  { attemptId, userId, locale: requested }: { attemptId: string; userId: string; locale?: Locale },
): Promise<AttemptResults> {
  await finalizeIfExpired(db, attemptId, userId);
  const attempt = await db.attempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      certification: true,
      blueprint: { include: { domains: true } },
      sections: { include: { caseStudy: true, series: true } },
      items: { orderBy: { order: "asc" }, include: { question: { include: { objective: { include: { domain: true } } } } } },
    },
  });
  if (!attempt) throw new SessionError("not_found");
  if (attempt.status === "in_progress") throw new SessionError("not_started");
  const locale: Locale = requested ?? (attempt.locale === "fr" ? "fr" : "en");
  const yesNo: [string, string] = locale === "fr" ? ["Oui", "Non"] : ["Yes", "No"];
  const domainTitle = new Map(attempt.blueprint.domains.map((d) => [d.code, pick(d.title as L, locale)]));
  const domainOrder = new Map(attempt.blueprint.domains.map((d) => [d.code, d.order]));

  const items: CorrectionItem[] = await Promise.all(
    attempt.items.map(async (it) => {
      const q = it.question;
      const section = attempt.sections.find((s) => s.id === it.sectionId)!;
      const explanation = q.explanation as { correct: L; options?: Record<string, L> };
      const elements = explainedElements(q.type, q.body);
      const optionExplanations = await Promise.all(
        Object.entries(explanation.options ?? {}).map(async ([id, e]) => {
          const el = elements.find((x) => x.id === id);
          return { label: el ? await renderInline(text(el.text, locale)) : id, html: await renderInline(pick(e, locale)) };
        }),
      );
      return {
        id: it.id,
        order: it.order,
        sectionKind: section.kind,
        domain: { code: q.objective.domain.code, title: domainTitle.get(q.objective.domain.code) ?? q.objective.domain.code },
        objective: { code: q.objective.code, title: pick(q.objective.title as L, locale) },
        flagged: it.flagged,
        earned: it.pointsEarned ?? 0,
        max: it.pointsMax ?? 0,
        question: await presentQuestion(q, locale, it.optionOrder as OptionOrder),
        seriesStemHtml: section.series ? await renderMarkdown(pick(section.series.stem as L, locale)) : undefined,
        caseStudyTitle: section.caseStudy ? pick(section.caseStudy.title as L, locale) : undefined,
        response: it.response,
        correctAnswer: await describeAnswer(q.type, q.body, q.answer, locale, yesNo),
        explanationHtml: await renderMarkdown(pick(explanation.correct, locale)),
        optionExplanations,
        references: q.references as { title: string; url: string }[],
      };
    }),
  );

  const scored = items.map((i) => ({ ...i, max: i.max, earned: i.earned }));
  const maxScore = attempt.blueprint.maxScore;
  const domains = breakdownBy(scored, (i) => i.domain.code, maxScore)
    .sort((a, b) => (domainOrder.get(a.key) ?? 0) - (domainOrder.get(b.key) ?? 0))
    .map((d) => ({ ...d, title: domainTitle.get(d.key) ?? d.key }));
  const startedAt = attempt.startedAt!;
  const submittedAt = attempt.submittedAt!;
  return {
    id: attempt.id,
    status: attempt.status as "submitted" | "expired",
    locale,
    certification: { code: attempt.certification.code, title: attempt.certification.title },
    scaledScore: attempt.scaledScore ?? 0,
    passed: attempt.passed ?? false,
    passScore: attempt.blueprint.passScore,
    maxScore,
    earned: scored.reduce((s, i) => s + i.earned, 0),
    possible: scored.reduce((s, i) => s + i.max, 0),
    startedAt: startedAt.toISOString(),
    submittedAt: submittedAt.toISOString(),
    timeUsedMs: submittedAt.getTime() - startedAt.getTime(),
    durationMin: attempt.blueprint.durationMin,
    domains,
    types: breakdownBy(scored, (i) => i.question.type, maxScore),
    items,
  };
}

// ------------------------------------------------------------------ progress

export interface Progress {
  attempts: { id: string; certification: string; submittedAt: string; scaledScore: number; passed: boolean; domains: { code: string; scaledScore: number }[] }[];
  /** Per certification: average domain score over the last 3 attempts. */
  domainLevels: { certification: string; code: string; title: string; scaledScore: number; passScore: number }[];
  readiness: { certification: string; ready: boolean; streak: number; needed: number; minScore: number }[];
}

export async function getProgress(db: PrismaClient, userId: string, locale: Locale): Promise<Progress> {
  const attempts = await db.attempt.findMany({
    where: { userId, status: { in: ["submitted", "expired"] } },
    orderBy: { submittedAt: "asc" },
    include: {
      certification: true,
      blueprint: { include: { domains: true } },
      items: { select: { pointsEarned: true, pointsMax: true, question: { select: { objective: { select: { domain: { select: { code: true } } } } } } } },
    },
  });
  const list = attempts.map((a) => ({
    id: a.id,
    certification: a.certification.code,
    submittedAt: a.submittedAt!.toISOString(),
    scaledScore: a.scaledScore ?? 0,
    passed: a.passed ?? false,
    passScore: a.blueprint.passScore,
    blueprint: a.blueprint,
    domains: breakdownBy(
      a.items.map((i) => ({ earned: i.pointsEarned ?? 0, max: i.pointsMax ?? 0, d: i.question.objective.domain.code })),
      (i) => i.d,
      a.blueprint.maxScore,
    ).map((d) => ({ code: d.key, scaledScore: d.scaledScore })),
  }));

  const domainLevels: Progress["domainLevels"] = [];
  const readiness: Progress["readiness"] = [];
  for (const code of new Set(list.map((a) => a.certification))) {
    const mine = list.filter((a) => a.certification === code);
    const last = mine.at(-1)!;
    const recent = mine.slice(-3);
    for (const d of [...last.blueprint.domains].sort((a, b) => a.order - b.order)) {
      const scores = recent.flatMap((a) => a.domains.filter((x) => x.code === d.code).map((x) => x.scaledScore));
      if (scores.length) {
        domainLevels.push({ certification: code, code: d.code, title: pick(d.title as L, locale), scaledScore: Math.round(scores.reduce((s, x) => s + x, 0) / scores.length), passScore: last.passScore });
      }
    }
    const { consecutive, minScore } = (last.blueprint.structure as BlueprintStructure).readiness;
    let streak = 0;
    for (const a of [...mine].reverse()) {
      if (a.scaledScore >= minScore) streak += 1;
      else break;
    }
    readiness.push({ certification: code, ready: streak >= consecutive, streak, needed: consecutive, minScore });
  }
  return {
    attempts: list.map((a) => ({ id: a.id, certification: a.certification, submittedAt: a.submittedAt, scaledScore: a.scaledScore, passed: a.passed, domains: a.domains })),
    domainLevels,
    readiness,
  };
}

// ------------------------------------------------------------------ reports

export const REPORT_REASONS = ["wrong_answer", "ambiguous", "outdated", "typo", "translation", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
/** A question reported by this many different users (open reports) goes back to review (spec §7). */
export const REPORTS_BEFORE_REVIEW = 3;

/**
 * Records a report; only for a question the user has seen in a finished
 * attempt. A user has at most one open report per question (a new report
 * replaces their reason and comment), and the review threshold counts distinct
 * users, so a single account cannot take a question out of the exams.
 */
export async function reportQuestion(db: PrismaClient, { questionId, userId, reason, comment }: { questionId: string; userId: string; reason: ReportReason; comment?: string }) {
  const seen = await db.attemptItem.count({ where: { questionId, attempt: { userId, status: { in: ["submitted", "expired"] } } } });
  if (!seen) throw new SessionError("not_found");
  const data = { reason, comment: comment?.trim() || null };
  const existing = await db.questionReport.findFirst({ where: { questionId, userId, status: "open" }, select: { id: true } });
  let report;
  if (existing) {
    report = await db.questionReport.update({ where: { id: existing.id }, data });
  } else {
    try {
      report = await db.questionReport.create({ data: { questionId, userId, ...data } });
    } catch (err) {
      // Concurrent double submit: the partial unique index (one open report per user and question) wins.
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
      report = await db.questionReport.update({ where: { id: (await db.questionReport.findFirstOrThrow({ where: { questionId, userId, status: "open" } })).id }, data });
    }
  }
  const reporters = await db.questionReport.findMany({ where: { questionId, status: "open" }, distinct: ["userId"], select: { userId: true } });
  if (reporters.length >= REPORTS_BEFORE_REVIEW) {
    await db.question.updateMany({ where: { id: questionId, status: "published" }, data: { status: "needs_review" } });
  }
  return report;
}
