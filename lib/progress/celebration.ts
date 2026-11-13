/**
 * Timeline of the results page animation: the readiness gauge moves from the
 * previous index to the new one, the rules this exam met tick one by one, then
 * the XP sources fill the bar (level-up included) and the new badges turn over.
 *
 * Pure values and helpers, shared by the server page (which computes the XP
 * start) and the client components (which play the steps).
 */
import type { Readiness, ReadinessCheck } from "./readiness";

/** Milliseconds. */
export const TIMELINE = {
  gauge: { delay: 200, duration: 1300 },
  /** Each newly met rule ticks `step` ms after the previous one. */
  rules: { delay: 1500, step: 250, duration: 400 },
  /** Each XP source takes `step` ms; the bar fills continuously. */
  xp: { step: 450 },
  /** After the last XP source. */
  badges: { gap: 300, duration: 800 },
  /** Start of the XP card when there is no readiness change to show. */
  alone: 200,
} as const;

/** Blocking rules met after this exam that were not met before it (none for a first exam). */
export function newlyMet(before: Readiness | null, after: Readiness): ReadinessCheck[] {
  if (!before) return [];
  const was = new Map(before.checks.map((c) => [c.code, c.ok]));
  return after.checks.filter((c) => c.blocking && c.ok && was.get(c.code) === false);
}

/** When the XP card starts: after the gauge and the newly met rules. */
export function xpStart(change: { before: Readiness | null; after: Readiness } | null): number {
  if (!change) return TIMELINE.alone;
  const rules = newlyMet(change.before, change.after).length;
  const { delay, step, duration } = TIMELINE.rules;
  return rules ? delay + (rules - 1) * step + duration + 200 : TIMELINE.gauge.delay + TIMELINE.gauge.duration + 200;
}

/** Share (0–1) of each of `n` consecutive parts reached at overall progress `p` (0–1). */
export function partShares(p: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => Math.min(1, Math.max(0, p * n - i)));
}

/** Ease-out (cubic): fast start, soft landing. */
export function easeOut(p: number): number {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
}
