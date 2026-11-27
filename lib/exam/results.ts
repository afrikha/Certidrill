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
import { progressionSchema, readinessSchema, type ProgressionConfig, type ReadinessConfig } from "@/lib/content/schema";
import { logError } from "@/lib/log";
import { computeReadiness, domainAverages, type ExamSummary, type Readiness } from "@/lib/progress/readiness";
import { computeProgression, type Badge, type Progression, type XpGain } from "@/lib/progress/progression";
import { breakdownBy, scoringRules, type Breakdown } from "./scoring";
import { getAccess, type AccessLevel } from "@/lib/access";
import { SessionError, finalizeIfExpired } from "./session";
import { QUIZ_RULES } from "@/lib/course/quiz-rules";
import { QUIZ_USAGE } from "@/lib/questions/usage";
import { isExerciseType, readGrading, type Grading } from "@/lib/exercises/grade";
import type { Check } from "@/lib/exercises/engine";

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
  /** Practical exercises: each check, passed or not, and why the answer could not be read. */
  checks?: CheckLine[];
  exerciseError?: string;
  explanationHtml: string;
  /** Why the wrong choices are wrong. */
  optionExplanations: { label: string; html: string }[];
  references: { title: string; url: string }[];
}

export interface AttemptResults {
  id: string;
  status: "submitted" | "expired";
  locale: Locale;
  /** vendor: certification.vendor (the score note and the documentation named, lib/vendors.ts). */
  /** languages: those of the official exam; without the result's locale, its content is in English (docs/SPECS-AWS.md §3.7). */
  certification: { code: string; title: string; vendor: string; languages: string[]; format: string };
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
  /**
   * The correction at the user's current access level. At the free level, only
   * the missed questions are sent, without the explanations of the wrong
   * options; the others are listed in `locked`, with no content.
   */
  items: CorrectionItem[];
  correction: { level: AccessLevel; locked: { id: string; order: number; flagged: boolean; domain: { code: string; title: string } }[] };
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
  // A solution of the exercise (the first variant), as a code block.
  command: async (_body, answer) => [{ html: await renderMarkdown(codeBlock("bash", `$ ${(answer as QuestionAnswer<"command">).solution[0]!.command}`)) }],
  manifest: async (_body, answer) => [{ html: await renderMarkdown(codeBlock("yaml", (answer as QuestionAnswer<"manifest">).solution[0]!.manifest)) }],
};

/** A fenced code block whose fence is longer than any run of backticks in the code. */
function codeBlock(language: string, code: string): string {
  const longest = Math.max(2, ...[...code.matchAll(/`+/g)].map((m) => m[0].length));
  const fence = "`".repeat(longest + 1);
  return `${fence}${language}\n${code.replace(/\n$/, "")}\n${fence}`;
}

/** The result of each check of an exercise, after submission: its label, passed or not. */
export interface CheckLine {
  id: string;
  labelHtml: string;
  passed: boolean;
}

/** The checks of an exercise with their result (none passed without a grading), and the reason when the answer could not be checked. */
async function checkLines(answer: unknown, grading: Grading | null, locale: Locale): Promise<{ checks: CheckLine[]; exerciseError?: string }> {
  const checks = (answer as { checks: Check[] }).checks;
  const passed = new Set(grading?.results.filter((r) => r.passed).map((r) => r.id) ?? []);
  return {
    checks: await Promise.all(checks.map(async (c) => ({ id: c.id, labelHtml: await renderInline(text(c.label as Parameters<typeof text>[0], locale)), passed: passed.has(c.id) }))),
    ...(grading?.error && { exerciseError: grading.error }),
  };
}

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

/** What a correction shows under a question: the answer key, the explanation, why the wrong options are wrong (with `options`), the references. */
export interface QuestionExplanation {
  correctAnswer: AnswerLine[];
  /** Practical exercises: each check, passed or not (✓/✗), and why the answer could not be read. */
  checks?: CheckLine[];
  exerciseError?: string;
  explanationHtml: string;
  optionExplanations: { label: string; html: string }[];
  references: { title: string; url: string }[];
}

/** The correction of a question, in one locale (mock exam review and chapter quizzes). */
export async function explainQuestion(
  q: { type: QuestionTypeCode; body: unknown; answer: unknown; explanation: unknown; references: unknown },
  locale: Locale,
  { options, grading }: { options: boolean; grading?: unknown },
): Promise<QuestionExplanation> {
  const yesNo: [string, string] = locale === "fr" ? ["Oui", "Non"] : ["Yes", "No"];
  const explanation = q.explanation as { correct: L; options?: Record<string, L> };
  const elements = explainedElements(q.type, q.body);
  const optionExplanations = options
    ? await Promise.all(
        Object.entries(explanation.options ?? {}).map(async ([id, e]) => {
          const el = elements.find((x) => x.id === id);
          return { label: el ? await renderInline(text(el.text, locale)) : id, html: await renderInline(pick(e, locale)) };
        }),
      )
    : [];
  return {
    correctAnswer: await describeAnswer(q.type, q.body, q.answer, locale, yesNo),
    explanationHtml: await renderMarkdown(pick(explanation.correct, locale)),
    optionExplanations,
    references: q.references as { title: string; url: string }[],
    ...(isExerciseType(q.type) && (await checkLines(q.answer, readGrading(grading), locale))),
  };
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
      items: { orderBy: { order: "asc" }, include: { question: { include: { objective: { include: { domain: true } }, caseStudy: { select: { title: true } } } } } },
    },
  });
  if (!attempt) throw new SessionError("not_found");
  if (attempt.status === "in_progress") throw new SessionError("not_started");
  const locale: Locale = requested ?? (attempt.locale === "fr" ? "fr" : "en");
  const domainTitle = new Map(attempt.blueprint.domains.map((d) => [d.code, pick(d.title as L, locale)]));
  const domainOrder = new Map(attempt.blueprint.domains.map((d) => [d.code, d.order]));
  const rules = scoringRules(attempt.blueprint.scoring);

  // The correction follows the access of today (it goes back to free when a Pass ends).
  const full = (await getAccess(db, userId, attempt.certificationId)).level === "full";
  // Missed: fewer points than possible, so a partly right answer counts as
  // missed (its correction is sent). An unscored item (null) counts as 0.
  const missed = (it: { pointsEarned: number | null; pointsMax: number | null }) => (it.pointsEarned ?? 0) < (it.pointsMax ?? 0);
  const shown = full ? attempt.items : attempt.items.filter(missed);
  const locked = full
    ? []
    : attempt.items
        .filter((it) => !missed(it))
        .map((it) => {
          const code = it.question.objective.domain.code;
          return { id: it.id, order: it.order, flagged: it.flagged, domain: { code, title: domainTitle.get(code) ?? code } };
        });

  const items: CorrectionItem[] = await Promise.all(
    shown.map(async (it) => {
      const q = it.question;
      const section = attempt.sections.find((s) => s.id === it.sectionId)!;
      // The section's case study, or that of an interleaved question (Google Cloud).
      const caseStudy = section.caseStudy ?? q.caseStudy;
      // Why each wrong option is wrong: full access only.
      const explained = await explainQuestion(q, locale, { options: full, grading: it.grading });
      return {
        id: it.id,
        order: it.order,
        sectionKind: section.kind,
        domain: { code: q.objective.domain.code, title: domainTitle.get(q.objective.domain.code) ?? q.objective.domain.code },
        objective: { code: q.objective.code, title: pick(q.objective.title as L, locale) },
        flagged: it.flagged,
        earned: it.pointsEarned ?? 0,
        max: it.pointsMax ?? 0,
        question: await presentQuestion(q, locale, it.optionOrder as OptionOrder, rules),
        seriesStemHtml: section.series ? await renderMarkdown(pick(section.series.stem as L, locale)) : undefined,
        caseStudyTitle: caseStudy ? pick(caseStudy.title as L, locale) : undefined,
        response: it.response,
        ...explained,
      };
    }),
  );

  // The score report covers every question, whatever the correction shows.
  const scored = attempt.items.map((it) => ({
    earned: it.pointsEarned ?? 0,
    max: it.pointsMax ?? 0,
    domain: { code: it.question.objective.domain.code },
    question: { type: it.question.type },
  }));
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
    certification: { code: attempt.certification.code, title: attempt.certification.title, vendor: attempt.certification.vendor, languages: attempt.certification.languages, format: attempt.certification.format },
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
    correction: { level: full ? "full" : "free", locked },
  };
}

// ------------------------------------------------------------------ progress

/** Exams averaged for domain levels when a certification has no valid readiness settings (blueprint stored before them). */
export const DEFAULT_RECENT = 3;

/** Readiness of a certification, with the settings it was computed with. */
export type CertificationReadiness = Readiness & { certification: string; config: ReadinessConfig };

/** XP, level and badges of a certification (see lib/progress/progression.ts), with the localized level titles. */
export type CertificationProgression = Progression & { certification: string; title: string; nextTitle: string | null; config: ProgressionConfig };

export interface Progress {
  attempts: { id: string; certification: string; submittedAt: string; scaledScore: number; passed: boolean; domains: { code: string; scaledScore: number }[] }[];
  /** Per certification: average domain score over the `readiness.recent` last attempts. */
  domainLevels: { certification: string; code: string; title: string; scaledScore: number; passScore: number }[];
  /** Per certification with at least one finished attempt (see lib/progress/readiness.ts). */
  readiness: CertificationReadiness[];
  /** Per certification with at least one finished attempt and progression settings. */
  progression: CertificationProgression[];
}

export type HistoryEntry = ExamSummary & {
  id: string;
  certification: string;
  passed: boolean;
  passScore: number;
  blueprint: { structure: Prisma.JsonValue; domains: { code: string; order: number; title: Prisma.JsonValue }[] };
};

/** Finished attempts of a user, oldest first, with what progress and readiness need. */
export async function loadHistory(db: PrismaClient, userId: string, certificationId?: string): Promise<HistoryEntry[]> {
  const attempts = await db.attempt.findMany({
    where: { userId, status: { in: ["submitted", "expired"] }, ...(certificationId ? { certificationId } : {}) },
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    include: {
      certification: true,
      blueprint: { include: { domains: true } },
      items: { select: { questionId: true, pointsEarned: true, pointsMax: true, question: { select: { objective: { select: { domain: { select: { code: true } } } } } } } },
    },
  });
  return attempts.map((a) => ({
    id: a.id,
    certification: a.certification.code,
    submittedAt: a.submittedAt!,
    scaledScore: a.scaledScore ?? 0,
    passed: a.passed ?? false,
    passScore: a.blueprint.passScore,
    blueprint: a.blueprint,
    questionIds: a.items.map((i) => i.questionId),
    domains: breakdownBy(
      a.items.map((i) => ({ earned: i.pointsEarned ?? 0, max: i.pointsMax ?? 0, d: i.question.objective.domain.code })),
      (i) => i.d,
      a.blueprint.maxScore,
    ).map((d) => ({ code: d.key, scaledScore: d.scaledScore })),
  }));
}

interface Settings {
  readiness: ReadinessConfig | null;
  progression: ProgressionConfig | null;
}

/**
 * Readiness and progression settings of each certification: those of its
 * current blueprint, so that a change in blueprint.yaml applies to past
 * attempts too; else those of the blueprint of its latest attempt. Null (no
 * indicator) if the stored blueprint predates them: `npm run seed` updates it.
 */
export async function certificationSettings(db: PrismaClient, history: readonly HistoryEntry[]): Promise<Map<string, Settings>> {
  const codes = [...new Set(history.map((a) => a.certification))];
  const current = await db.blueprint.findMany({ where: { current: true, certification: { code: { in: codes } } }, include: { certification: true } });
  const settings = new Map<string, Settings>();
  for (const code of codes) {
    const structure = (current.find((b) => b.certification.code === code)?.structure ?? history.findLast((a) => a.certification === code)!.blueprint.structure) as {
      readiness?: unknown;
      progression?: unknown;
    } | null;
    const readiness = readinessSchema.safeParse(structure?.readiness);
    if (!readiness.success) logError("readiness.config_invalid", readiness.error, { certification: code });
    const progression = progressionSchema.safeParse(structure?.progression);
    if (!progression.success) logError("progression.config_invalid", progression.error, { certification: code });
    settings.set(code, { readiness: readiness.success ? readiness.data : null, progression: progression.success ? progression.data : null });
  }
  return settings;
}

function certificationProgression(code: string, history: readonly HistoryEntry[], rules: ProgressionConfig, recent: number, locale: Locale, baseXp: number): CertificationProgression {
  const p = computeProgression(history, rules, recent, baseXp);
  const next = rules.levels[p.level.n];
  // Domains in the blueprint's order, like the other domain charts.
  const order = new Map(history.at(-1)!.blueprint.domains.map((d) => [d.code, d.order]));
  p.mastery.sort((a, b) => (order.get(a.code) ?? 0) - (order.get(b.code) ?? 0));
  return { certification: code, config: rules, ...p, title: pick(rules.levels[p.level.n - 1]!.title, locale), nextTitle: next ? pick(next.title, locale) : null };
}

/**
 * Progression XP of the chapter quizzes of a certification (its code)
 * mastered up to `before` when given: once per chapter, however many times
 * it is passed (docs/SPECS-QUIZ-CHAPITRE.md §8).
 */
export async function quizXp(db: PrismaClient, userId: string, certification: string, before?: Date): Promise<number> {
  if (QUIZ_RULES.xpPerChapter === 0) return 0;
  const chapters = await db.quizAttempt.findMany({
    where: { userId, passed: true, chapter: { certification: { code: certification } }, ...(before && { completedAt: { lte: before } }) },
    distinct: ["chapterId"],
    select: { chapterId: true },
  });
  return QUIZ_RULES.xpPerChapter * chapters.length;
}

export async function getProgress(db: PrismaClient, userId: string, locale: Locale, now: Date = new Date()): Promise<Progress> {
  const list = await loadHistory(db, userId);
  const settings = await certificationSettings(db, list);

  const domainLevels: Progress["domainLevels"] = [];
  const readiness: Progress["readiness"] = [];
  const progression: Progress["progression"] = [];
  for (const [code, { readiness: config, progression: rules }] of settings) {
    const mine = list.filter((a) => a.certification === code);
    const last = mine.at(-1)!;
    const levels = new Map(domainAverages(mine.slice(-(config?.recent ?? DEFAULT_RECENT))).map((d) => [d.code, d.scaledScore]));
    for (const d of [...last.blueprint.domains].sort((a, b) => a.order - b.order)) {
      const scaledScore = levels.get(d.code);
      if (scaledScore !== undefined) {
        domainLevels.push({ certification: code, code: d.code, title: pick(d.title as L, locale), scaledScore, passScore: last.passScore });
      }
    }
    const r = config ? computeReadiness(mine, config, now) : null;
    if (config && r) readiness.push({ certification: code, config, ...r });
    if (rules) progression.push(certificationProgression(code, mine, rules, config?.recent ?? DEFAULT_RECENT, locale, await quizXp(db, userId, code)));
  }
  return {
    attempts: list.map((a) => ({ id: a.id, certification: a.certification, submittedAt: a.submittedAt.toISOString(), scaledScore: a.scaledScore, passed: a.passed, domains: [...a.domains] })),
    domainLevels,
    readiness,
    progression,
  };
}

export interface ReadinessChange {
  /** Readiness right after the previous attempt of the certification; null for a first attempt. */
  before: Readiness | null;
  /** Readiness right after this attempt. */
  after: Readiness;
  /** Verdict bands of the certification, to follow the gauge across them. */
  bands: ReadinessConfig["bands"];
}

export interface ProgressionGain {
  gain: XpGain;
  /** Badges this attempt earned for the first time. */
  badges: Badge[];
  /** Total XP and level right after this attempt. */
  xp: number;
  level: { n: number; title: string; from: number; next: number | null };
  levels: number;
  /** Title of the level before this attempt, when it changed. */
  previousTitle: string | null;
  /** XP and title of every level, to follow the XP bar across levels. */
  ladder: { xp: number; title: string }[];
}

export interface AttemptProgress {
  readiness: ReadinessChange | null;
  progression: ProgressionGain | null;
}

/**
 * How an attempt moved the readiness index and the progression. Each side of
 * the readiness change is computed at the time of its own last attempt, so the
 * change reflects the exam, not the time that has passed since. Both are null
 * if the attempt is not this user's finished attempt or the certification has
 * no such settings.
 */
export async function getAttemptProgress(db: PrismaClient, { attemptId, userId, locale = "en" }: { attemptId: string; userId: string; locale?: Locale }): Promise<AttemptProgress> {
  const none = { readiness: null, progression: null };
  // Only the attempts of this attempt's certification: the others play no part in it.
  const owned = await db.attempt.findFirst({ where: { id: attemptId, userId }, select: { certificationId: true } });
  if (!owned) return none;
  const mine = await loadHistory(db, userId, owned.certificationId);
  const attempt = mine.find((a) => a.id === attemptId);
  if (!attempt) return none;
  const { readiness: config, progression: rules } = (await certificationSettings(db, [attempt])).get(attempt.certification)!;
  const i = mine.indexOf(attempt);
  const previous = mine[i - 1];
  const upTo = mine.slice(0, i + 1);

  let progression: ProgressionGain | null = null;
  if (rules) {
    const p = computeProgression(upTo, rules, config?.recent ?? DEFAULT_RECENT, await quizXp(db, userId, attempt.certification, attempt.submittedAt));
    const gain = p.gains.at(-1)!;
    const title = (n: number) => pick(rules.levels[n - 1]!.title, locale);
    progression = {
      gain,
      badges: p.badges.filter((b) => b.attemptId === attemptId),
      xp: p.xp,
      level: { n: p.level.n, title: title(p.level.n), from: p.level.from, next: p.level.next },
      levels: p.levels,
      previousTitle: gain.levelBefore === gain.levelAfter ? null : title(gain.levelBefore),
      ladder: rules.levels.map((l) => ({ xp: l.xp, title: pick(l.title, locale) })),
    };
  }
  return {
    readiness: config
      ? { before: previous ? computeReadiness(mine.slice(0, i), config, previous.submittedAt) : null, after: computeReadiness(upTo, config, attempt.submittedAt)!, bands: config.bands }
      : null,
    progression,
  };
}

/** How an attempt moved the readiness index (see getAttemptProgress). */
export async function getReadinessChange(db: PrismaClient, ids: { attemptId: string; userId: string }): Promise<ReadinessChange | null> {
  return (await getAttemptProgress(db, ids)).readiness;
}

// ------------------------------------------------------------------ reports

export const REPORT_REASONS = ["wrong_answer", "ambiguous", "outdated", "typo", "translation", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
/** A question reported by this many different users (open reports) goes back to review (spec §7). */
export const REPORTS_BEFORE_REVIEW = 3;

/**
 * Whether a chapter quiz question was answered (validated) in one of the
 * user's attempts: a question of the chapter's bank that the user has not
 * reached yet cannot be reported.
 */
async function answeredInQuiz(db: PrismaClient, userId: string, questionId: string): Promise<boolean> {
  const attempts = await db.quizAttempt.findMany({
    where: { userId, chapter: { quizQuestions: { some: { id: questionId, usage: QUIZ_USAGE } } } },
    select: { results: true },
  });
  return attempts.some((a) => Object.values((a.results ?? {}) as Record<string, { questionId?: string } | undefined>).some((r) => r?.questionId === questionId));
}

/**
 * Records a report; only for a question the user has seen in a finished
 * attempt. A user has at most one open report per question (a new report
 * replaces their reason and comment), and the review threshold counts distinct
 * users, so a single account cannot take a question out of the exams.
 */
export async function reportQuestion(db: PrismaClient, { questionId, userId, reason, comment }: { questionId: string; userId: string; reason: ReportReason; comment?: string }) {
  // Seen in a finished mock exam, or answered in one of the user's attempts at its chapter quiz.
  const seen =
    (await db.attemptItem.count({ where: { questionId, attempt: { userId, status: { in: ["submitted", "expired"] } } } })) > 0 ||
    (await answeredInQuiz(db, userId, questionId));
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
