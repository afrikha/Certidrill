/**
 * The "gaming" side of progress: XP per exam, levels, domain mastery and
 * badges. It rewards effort and progress and never says "ready": that is the
 * job of the readiness index (readiness.ts), which XP cannot move.
 *
 * Everything is recomputed from the finished exams (no stored state), so a
 * change of rules in blueprint.yaml applies to the whole history at once.
 * Every number comes from the blueprint (ProgressionConfig). Pure functions.
 */
import type { ProgressionConfig } from "@/lib/content/schema";
import { domainAverages, type ExamSummary } from "./readiness";

/** A finished exam, as progression sees it. */
export type ProgressExam = ExamSummary & { id: string; passed: boolean };

export interface XpGain {
  attemptId: string;
  total: number;
  /** XP by source; zero sources are left out. */
  parts: { code: "base" | "score" | "pass" | "best" | "domains"; xp: number }[];
  /** Level reached before and after this exam (1-based). */
  levelBefore: number;
  levelAfter: number;
}

export type BadgeCode = "first_exam" | "first_pass" | "personal_best" | "gold_domain" | "hat_trick" | "regular" | "comeback";
export const BADGES: readonly BadgeCode[] = ["first_exam", "first_pass", "personal_best", "gold_domain", "hat_trick", "regular", "comeback"];

export interface Badge {
  code: BadgeCode;
  /** The exam that earned it first. */
  attemptId: string;
  earnedAt: Date;
}

export type MasteryTier = "none" | "bronze" | "silver" | "gold";

export interface Progression {
  xp: number;
  /** Current level (1-based), the XP it started at, and the XP of the next one (null at the top). */
  level: { n: number; from: number; next: number | null };
  levels: number;
  gains: XpGain[];
  badges: Badge[];
  mastery: { code: string; scaledScore: number; tier: MasteryTier }[];
}

/** Level (1-based) reached with `xp`. */
export function levelOf(xp: number, levels: ProgressionConfig["levels"]): number {
  let n = 1;
  levels.forEach((l, i) => {
    if (xp >= l.xp) n = i + 1;
  });
  return n;
}

export function tierOf(score: number, mastery: ProgressionConfig["mastery"]): MasteryTier {
  if (score >= mastery.gold) return "gold";
  if (score >= mastery.silver) return "silver";
  if (score >= mastery.bronze) return "bronze";
  return "none";
}

/** Monday 00:00 UTC of the week of `d`, in days since the epoch. */
function weekIndex(d: Date): number {
  const days = Math.floor(d.getTime() / 86_400_000);
  // 1970-01-01 was a Thursday: shift so that weeks start on Monday.
  return Math.floor((days + 3) / 7);
}

function newShare(exam: ProgressExam, seen: ReadonlySet<string>): number {
  if (exam.questionIds.length === 0) return 1;
  return exam.questionIds.filter((q) => !seen.has(q)).length / exam.questionIds.length;
}

function gainOf(exam: ProgressExam, previous: ProgressExam | undefined, best: number, seen: ReadonlySet<string>, config: ProgressionConfig): Omit<XpGain, "levelBefore" | "levelAfter"> {
  const x = config.xp;
  const known = x.knownShare + (1 - x.knownShare) * newShare(exam, seen);
  const before = new Map(previous?.domains.map((d) => [d.code, d.scaledScore]));
  const improved = exam.domains.filter((d) => before.has(d.code) && d.scaledScore - before.get(d.code)! >= x.domainGain).length;
  const parts: XpGain["parts"] = [
    { code: "base", xp: x.base },
    { code: "score", xp: Math.round(Math.max(0, exam.scaledScore - x.scoreFrom) * x.perPoint * known) },
    { code: "pass", xp: exam.passed ? x.passBonus : 0 },
    { code: "best", xp: exam.scaledScore > best ? x.bestBonus : 0 },
    { code: "domains", xp: improved * x.domainBonus },
  ];
  const kept = parts.filter((p) => p.xp > 0);
  return { attemptId: exam.id, total: kept.reduce((s, p) => s + p.xp, 0), parts: kept };
}

/** Badges earned by `exam`, given the history up to and including it. */
function badgesOf(history: readonly ProgressExam[], i: number, best: number, config: ProgressionConfig): BadgeCode[] {
  const exam = history[i]!;
  const previous = history[i - 1];
  const earned: BadgeCode[] = ["first_exam"];
  if (exam.passed) earned.push("first_pass");
  if (previous && exam.scaledScore > best) earned.push("personal_best");
  if (exam.domains.some((d) => d.scaledScore >= config.mastery.gold)) earned.push("gold_domain");
  const { count, min } = config.badges.hatTrick;
  if (i + 1 >= count && history.slice(i + 1 - count, i + 1).every((e) => e.scaledScore >= min)) earned.push("hat_trick");
  const weeks = new Set(history.slice(0, i + 1).map((e) => weekIndex(e.submittedAt)));
  const week = weekIndex(exam.submittedAt);
  if (Array.from({ length: config.badges.regular.weeks }, (_, k) => week - k).every((w) => weeks.has(w))) earned.push("regular");
  if (previous && exam.scaledScore - previous.scaledScore >= config.badges.comeback.gain) earned.push("comeback");
  return earned;
}

/**
 * Progression after the given exams (chronological, finished exams of one
 * certification). Domain mastery averages the last `recent` exams.
 */
export function computeProgression(history: readonly ProgressExam[], config: ProgressionConfig, recent: number): Progression {
  const seen = new Set<string>();
  const badges = new Map<BadgeCode, Badge>();
  const gains: XpGain[] = [];
  let xp = 0;
  let best = Number.NEGATIVE_INFINITY;
  history.forEach((exam, i) => {
    const gain = gainOf(exam, history[i - 1], best, seen, config);
    for (const code of badgesOf(history, i, best, config)) {
      if (!badges.has(code)) badges.set(code, { code, attemptId: exam.id, earnedAt: exam.submittedAt });
    }
    const levelBefore = levelOf(xp, config.levels);
    xp += gain.total;
    gains.push({ ...gain, levelBefore, levelAfter: levelOf(xp, config.levels) });
    best = Math.max(best, exam.scaledScore);
    for (const q of exam.questionIds) seen.add(q);
  });
  const n = levelOf(xp, config.levels);
  return {
    xp,
    level: { n, from: config.levels[n - 1]!.xp, next: config.levels[n]?.xp ?? null },
    levels: config.levels.length,
    gains,
    badges: [...badges.values()],
    mastery: domainAverages(history.slice(-recent)).map((d) => ({ ...d, tier: tierOf(d.scaledScore, config.mastery) })),
  };
}
