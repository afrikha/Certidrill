import { describe, expect, it } from "vitest";
import { easeOut, newlyMet, partShares, TIMELINE, xpStart } from "@/lib/progress/celebration";
import type { Readiness, ReadinessCheck } from "@/lib/progress/readiness";

function readiness(checks: ReadinessCheck[]): Readiness {
  return { index: 80, raw: 80, capped: false, verdict: "almost", ready: false, criteria: { level: 80, consistency: 80, domains: 80, freshness: 80 }, checks, attempts: 3, streak: 1, needed: 3, minScore: 800 };
}
const streak = (ok: boolean): ReadinessCheck => ({ code: "streak", blocking: true, ok, value: ok ? 3 : 1, target: 3, min: 800 });
const attempts = (ok: boolean): ReadinessCheck => ({ code: "attempts", blocking: true, ok, value: ok ? 3 : 2, target: 3 });
const average = (ok: boolean): ReadinessCheck => ({ code: "average", blocking: false, ok, value: ok ? 810 : 790, target: 800 });

describe("results animation timeline", () => {
  it("lists the blocking rules met by this exam only", () => {
    const before = readiness([streak(false), attempts(true), average(false)]);
    const after = readiness([streak(true), attempts(true), average(true)]);
    expect(newlyMet(before, after).map((c) => c.code)).toEqual(["streak"]);
    expect(newlyMet(null, after)).toEqual([]);
    // A rule missing before (a new rule) is not "met with this exam".
    expect(newlyMet(readiness([]), after)).toEqual([]);
  });

  it("starts the XP after the gauge and the rules", () => {
    const before = readiness([streak(false), attempts(false)]);
    const gaugeEnd = TIMELINE.gauge.delay + TIMELINE.gauge.duration + 200;
    expect(xpStart(null)).toBe(TIMELINE.alone);
    expect(xpStart({ before: null, after: before })).toBe(gaugeEnd);
    const { delay, step, duration } = TIMELINE.rules;
    expect(xpStart({ before, after: readiness([streak(true), attempts(false)]) })).toBe(delay + duration + 200);
    expect(xpStart({ before, after: readiness([streak(true), attempts(true)]) })).toBe(delay + step + duration + 200);
  });

  it("splits the progress between consecutive parts", () => {
    expect(partShares(0, 4)).toEqual([0, 0, 0, 0]);
    expect(partShares(0.375, 4)).toEqual([1, 0.5, 0, 0]);
    expect(partShares(1, 4)).toEqual([1, 1, 1, 1]);
    expect(partShares(1, 0)).toEqual([]);
  });

  it("eases out within 0–1", () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(0.5)).toBe(0.875);
    expect(easeOut(-1)).toBe(0);
    expect(easeOut(2)).toBe(1);
  });
});
