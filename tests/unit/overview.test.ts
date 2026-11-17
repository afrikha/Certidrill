/** The global progress indicator of the dashboard, across certifications. */
import { describe, expect, it } from "vitest";
import type { Progress } from "@/lib/exam/results";
import { progressOverview, selectedCertification } from "@/lib/progress/overview";

const attempt = (certification: string, submittedAt: string, scaledScore: number, passed: boolean) => ({ id: `${certification}-${submittedAt}`, certification, submittedAt, scaledScore, passed, domains: [] });

const progress = {
  attempts: [
    attempt("az-104", "2026-11-01T10:00:00.000Z", 640, false),
    attempt("az-900", "2026-11-02T10:00:00.000Z", 720, true),
    attempt("az-104", "2026-11-03T10:00:00.000Z", 760, true),
    attempt("az-104", "2026-11-04T10:00:00.000Z", 810, true),
  ],
  domainLevels: [],
  readiness: [{ certification: "az-104", index: 82, verdict: "ready", ready: true }],
  progression: [
    { certification: "az-104", xp: 420, level: { n: 3, from: 300, next: 600 }, title: "Practitioner", badges: [{}, {}] },
    { certification: "az-900", xp: 90, level: { n: 1, from: 0, next: 100 }, title: "Beginner", badges: [] },
  ],
} as unknown as Progress;

describe("progress overview", () => {
  it("gives one line per certification, latest practised first, with its own readiness and level", () => {
    const o = progressOverview(progress, [{ certification: "az-900", passed: true }, { certification: "az-104", passed: false }]);
    expect(o.rows).toEqual([
      { certification: "az-104", exams: 3, lastScore: 810, lastPassed: true, lastAt: "2026-11-04T10:00:00.000Z", passed: 2, readiness: { index: 82, verdict: "ready", ready: true }, level: { n: 3, title: "Practitioner", xp: 420 }, badges: 2, realPassed: false },
      { certification: "az-900", exams: 1, lastScore: 720, lastPassed: true, lastAt: "2026-11-02T10:00:00.000Z", passed: 1, readiness: null, level: { n: 1, title: "Beginner", xp: 90 }, badges: 0, realPassed: true },
    ]);
    expect(o.totals).toEqual({ certifications: 2, exams: 4, passed: 3, ready: 1, xp: 510, badges: 2, realPassed: 1 });
  });

  it("is empty without a finished exam", () => {
    expect(progressOverview({ attempts: [], domainLevels: [], readiness: [], progression: [] })).toEqual({
      rows: [],
      totals: { certifications: 0, exams: 0, passed: 0, ready: 0, xp: 0, badges: 0, realPassed: 0 },
    });
  });

  it("shows the certification asked for when active, else the one in progress or latest practised, else the first", () => {
    const o = progressOverview(progress);
    const active = ["az-104", "az-305", "az-900"];
    expect(selectedCertification(active, "az-305", o)).toBe("az-305");
    expect(selectedCertification(active, "dp-900", o)).toBe("az-104");
    expect(selectedCertification(active, null, o, ["az-900"])).toBe("az-900");
    expect(selectedCertification(["az-305"], null, o)).toBe("az-305");
    expect(selectedCertification([], null, o)).toBeNull();
  });
});
