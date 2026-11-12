/**
 * Readiness index: how ready a candidate is for the real exam, from 0 to 100.
 *
 * It measures skill only: taking more exams never raises it by itself (XP and
 * levels reward effort). It combines four criteria, each worth 0–100 points:
 *   - level: weighted average of the last `window` exams, the latest weighs most;
 *   - consistency: lowest of the last `recent` exams (one lucky exam is not enough);
 *   - domains: weakest domain, averaged over the last `recent` exams;
 *   - freshness: share of never-seen questions in the last `recent` exams, and
 *     how long ago the last exam was (scoring on known questions inflates scores).
 * "Ready" also requires hard rules (enough exams, a streak at `minScore`, no
 * domain under `domainFloor`); while one fails, the index stays under the
 * "ready" band, so the gauge and the verdict always agree. The "index" check
 * says when the rules are met but the scores do not reach the band yet, and
 * which criterion costs the most points.
 *
 * Every threshold comes from the blueprint (ReadinessConfig): nothing here is
 * specific to a certification. Pure functions, no I/O.
 */
import type { ReadinessConfig } from "@/lib/content/schema";

/** A finished exam, as the readiness index sees it. */
export interface ExamSummary {
  submittedAt: Date;
  scaledScore: number;
  /** Questions of the exam: freshness compares them with earlier exams. */
  questionIds: readonly string[];
  domains: readonly { code: string; scaledScore: number }[];
}

export type Criterion = "level" | "consistency" | "domains" | "freshness";

export type Verdict = "not_ready" | "progressing" | "almost" | "ready";

/**
 * One line of the readiness checklist. Blocking checks are the hard rules for
 * "ready"; the others explain the index.
 */
export type ReadinessCheck =
  | { code: "attempts"; blocking: true; ok: boolean; value: number; target: number }
  | { code: "streak"; blocking: true; ok: boolean; value: number; target: number; min: number }
  | { code: "weakest_domain"; blocking: true; ok: boolean; value: number; target: number; domain: string }
  /** The index itself, before any cap, against the "ready" band; `criterion` loses the most weighted points. */
  | { code: "index"; blocking: true; ok: boolean; value: number; target: number; criterion: Criterion }
  | { code: "average"; blocking: false; ok: boolean; value: number; target: number }
  | { code: "new_questions"; blocking: false; ok: boolean; value: number; target: number }
  | { code: "recent_exam"; blocking: false; ok: boolean; value: number; target: number };

export interface Readiness {
  /** 0–100. */
  index: number;
  /** The index computed from the scores, before the cap applied while a rule fails. */
  raw: number;
  /** True when a failing rule holds the index under the "ready" band. */
  capped: boolean;
  verdict: Verdict;
  ready: boolean;
  /** Points of each criterion, 0–100, before weighting. */
  criteria: { level: number; consistency: number; domains: number; freshness: number };
  checks: ReadinessCheck[];
  /** Finished exams taken into account. */
  attempts: number;
  /** Consecutive latest exams at `minScore` or more. */
  streak: number;
  needed: number;
  minScore: number;
}

const DAY_MS = 86_400_000;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Score on the blueprint scale → 0–100 points. */
export function scorePoints(score: number, scale: ReadinessConfig["scale"]): number {
  return clamp(((score - scale.from) / (scale.to - scale.from)) * 100, 0, 100);
}

/** Average of the latest scores, weighted 1, 2, …, n from the oldest to the latest. */
export function weightedAverage(scores: readonly number[]): number {
  let sum = 0;
  let weights = 0;
  scores.forEach((s, i) => {
    sum += s * (i + 1);
    weights += i + 1;
  });
  return sum / weights;
}

/** Average score per domain over the given exams, in order of first appearance. */
export function domainAverages(exams: readonly ExamSummary[]): { code: string; scaledScore: number }[] {
  const scores = new Map<string, number[]>();
  for (const e of exams) {
    for (const d of e.domains) {
      const list = scores.get(d.code) ?? [];
      list.push(d.scaledScore);
      scores.set(d.code, list);
    }
  }
  return [...scores].map(([code, list]) => ({ code, scaledScore: Math.round(mean(list)) }));
}

/** Number of consecutive latest exams scoring `min` or more. */
export function streakAt(history: readonly ExamSummary[], min: number): number {
  let streak = 0;
  for (let i = history.length - 1; i >= 0 && history[i]!.scaledScore >= min; i -= 1) streak += 1;
  return streak;
}

/** Mean, over the last `recent` exams, of the share of their questions never seen in an earlier exam. */
function newQuestionShare(history: readonly ExamSummary[], recent: number): number {
  const start = Math.max(0, history.length - recent);
  const seen = new Set(history.slice(0, start).flatMap((e) => e.questionIds));
  const shares: number[] = [];
  for (const e of history.slice(start)) {
    const fresh = e.questionIds.filter((q) => !seen.has(q)).length;
    shares.push(e.questionIds.length ? fresh / e.questionIds.length : 1);
    for (const q of e.questionIds) seen.add(q);
  }
  return mean(shares);
}

/** 1 up to `staleDays` after the last exam, then linearly down to 0 at `zeroDays`. */
function recency(days: number, { staleDays, zeroDays }: ReadinessConfig["freshness"]): number {
  return days <= staleDays ? 1 : clamp(1 - (days - staleDays) / (zeroDays - staleDays), 0, 1);
}

export function verdictOf(index: number, bands: ReadinessConfig["bands"]): Verdict {
  if (index >= bands.ready) return "ready";
  if (index >= bands.almost) return "almost";
  if (index >= bands.progressing) return "progressing";
  return "not_ready";
}

/**
 * Readiness after the given exams (chronological, finished exams of one
 * certification), at time `now`. Null without any exam.
 */
export function computeReadiness(history: readonly ExamSummary[], config: ReadinessConfig, now: Date): Readiness | null {
  const last = history.at(-1);
  if (!last) return null;
  const recentExams = history.slice(-config.recent);

  const average = weightedAverage(history.slice(-config.window).map((e) => e.scaledScore));
  const lowest = Math.min(...recentExams.map((e) => e.scaledScore));
  const weakest = domainAverages(recentExams).reduce<{ code: string; scaledScore: number } | null>(
    (w, d) => (w === null || d.scaledScore < w.scaledScore ? d : w),
    null,
  );
  const newShare = newQuestionShare(history, config.recent);
  const days = Math.max(0, Math.floor((now.getTime() - last.submittedAt.getTime()) / DAY_MS));

  const criteria = {
    level: scorePoints(average, config.scale),
    consistency: scorePoints(lowest, config.scale),
    // An exam always has domains; without any, the criterion gives nothing.
    domains: weakest ? scorePoints(weakest.scaledScore, config.scale) : 0,
    freshness: ((newShare + recency(days, config.freshness)) / 2) * 100,
  };
  const w = config.weights;
  let index = Math.round(criteria.level * w.level + criteria.consistency * w.consistency + criteria.domains * w.domains + criteria.freshness * w.freshness);

  const streak = streakAt(history, config.minScore);
  const checks: ReadinessCheck[] = [
    { code: "attempts", blocking: true, ok: history.length >= config.minAttempts, value: history.length, target: config.minAttempts },
    { code: "streak", blocking: true, ok: streak >= config.consecutive, value: streak, target: config.consecutive, min: config.minScore },
  ];
  if (weakest) {
    checks.push({ code: "weakest_domain", blocking: true, ok: weakest.scaledScore >= config.domainFloor, value: weakest.scaledScore, target: config.domainFloor, domain: weakest.code });
  }
  // Meeting the rules is not enough by itself: the scores must also reach the "ready" band.
  const criterion = (Object.keys(criteria) as Criterion[]).reduce((worst, k) => (w[k] * (100 - criteria[k]) > w[worst] * (100 - criteria[worst]) ? k : worst));
  checks.push(
    { code: "index", blocking: true, ok: index >= config.bands.ready, value: index, target: config.bands.ready, criterion },
    { code: "average", blocking: false, ok: average >= config.minScore, value: Math.round(average), target: config.minScore },
    { code: "new_questions", blocking: false, ok: newShare >= config.freshness.minNewShare, value: Math.round(newShare * 100), target: Math.round(config.freshness.minNewShare * 100) },
    { code: "recent_exam", blocking: false, ok: days <= config.freshness.staleDays, value: days, target: config.freshness.staleDays },
  );

  const blocked = checks.some((c) => c.blocking && c.code !== "index" && !c.ok);
  const raw = index;
  if (blocked) index = Math.min(index, Math.ceil(config.bands.ready) - 1);
  const verdict = verdictOf(index, config.bands);
  const round = (x: number) => Math.round(x);
  return {
    index,
    raw,
    capped: index < raw,
    verdict,
    ready: verdict === "ready",
    criteria: { level: round(criteria.level), consistency: round(criteria.consistency), domains: round(criteria.domains), freshness: round(criteria.freshness) },
    checks,
    attempts: history.length,
    streak,
    needed: config.consecutive,
    minScore: config.minScore,
  };
}
