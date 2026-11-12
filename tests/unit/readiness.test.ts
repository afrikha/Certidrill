import { describe, expect, it } from "vitest";
import { readinessSchema } from "@/lib/content/schema";
import { computeReadiness, domainAverages, scorePoints, streakAt, verdictOf, weightedAverage, type ExamSummary } from "@/lib/progress/readiness";
import { READINESS } from "./fixtures/bank";

const DOMAINS = ["identities", "storage", "compute", "networking", "monitoring"];
const day = (n: number) => new Date(Date.UTC(2026, 0, 1) + n * 86_400_000);

let nextQuestion = 0;
/** An exam on day `d` scoring `score` overall and in every domain (unless overridden), with new questions by default. */
function exam(d: number, score: number, opts: { domains?: Record<string, number>; questionIds?: string[] } = {}): ExamSummary {
  return {
    submittedAt: day(d),
    scaledScore: score,
    questionIds: opts.questionIds ?? Array.from({ length: 10 }, () => `q${nextQuestion++}`),
    domains: DOMAINS.map((code) => ({ code, scaledScore: opts.domains?.[code] ?? score })),
  };
}

const check = (r: ReturnType<typeof computeReadiness>, code: string) => r!.checks.find((c) => c.code === code)!;

describe("readiness helpers", () => {
  it("maps scores to 0–100 points on the configured scale", () => {
    expect(scorePoints(600, READINESS.scale)).toBe(0);
    expect(scorePoints(500, READINESS.scale)).toBe(0);
    expect(scorePoints(725, READINESS.scale)).toBe(50);
    expect(scorePoints(850, READINESS.scale)).toBe(100);
    expect(scorePoints(1000, READINESS.scale)).toBe(100);
  });

  it("weighs the latest scores most", () => {
    expect(weightedAverage([600, 900])).toBe(800); // (600×1 + 900×2) / 3
    expect(weightedAverage([700])).toBe(700);
  });

  it("counts the streak of latest exams at the minimum score", () => {
    expect(streakAt([exam(0, 900), exam(1, 700), exam(2, 800), exam(3, 850)], 800)).toBe(2);
    expect(streakAt([exam(0, 900), exam(1, 700)], 800)).toBe(0);
    expect(streakAt([], 800)).toBe(0);
  });

  it("averages domains over the given exams", () => {
    const a = exam(0, 700, { domains: { networking: 600 } });
    const b = exam(1, 800, { domains: { networking: 700 } });
    expect(domainAverages([a, b])).toContainEqual({ code: "networking", scaledScore: 650 });
    expect(domainAverages([a, b])).toContainEqual({ code: "compute", scaledScore: 750 });
  });

  it("turns the index into a verdict with the configured bands", () => {
    expect(verdictOf(49, READINESS.bands)).toBe("not_ready");
    expect(verdictOf(50, READINESS.bands)).toBe("progressing");
    expect(verdictOf(70, READINESS.bands)).toBe("almost");
    expect(verdictOf(84, READINESS.bands)).toBe("almost");
    expect(verdictOf(85, READINESS.bands)).toBe("ready");
  });
});

describe("computeReadiness", () => {
  it("is null without any exam", () => {
    expect(computeReadiness([], READINESS, day(0))).toBeNull();
  });

  it("is ready after 3 strong exams on new questions", () => {
    const r = computeReadiness([exam(0, 900), exam(7, 880), exam(14, 920)], READINESS, day(15))!;
    expect(r).toMatchObject({ index: 100, raw: 100, capped: false, verdict: "ready", ready: true, attempts: 3, streak: 3, needed: 3, minScore: 800 });
    expect(r.criteria).toEqual({ level: 100, consistency: 100, domains: 100, freshness: 100 });
    expect(r.checks.every((c) => c.ok)).toBe(true);
  });

  it("never says ready before the minimum number of exams, however good", () => {
    const r = computeReadiness([exam(0, 1000)], READINESS, day(0))!;
    expect(r.criteria).toEqual({ level: 100, consistency: 100, domains: 100, freshness: 100 });
    expect(r).toMatchObject({ index: 84, raw: 100, capped: true, verdict: "almost", ready: false });
    expect(check(r, "attempts")).toMatchObject({ ok: false, value: 1, target: 3, blocking: true });
    expect(check(r, "streak")).toMatchObject({ ok: false, value: 1, target: 3, min: 800 });
  });

  it("is held below ready by a weak domain, and names it", () => {
    const r = computeReadiness([exam(0, 900), exam(7, 900), exam(14, 900, { domains: { networking: 500 } })], READINESS, day(14))!;
    // Networking averages (900 + 900 + 500) / 3 = 767 over the last 3: fine.
    expect(check(r, "weakest_domain")).toMatchObject({ ok: true, value: 767, domain: "networking" });

    const weak = computeReadiness([exam(0, 900, { domains: { networking: 640 } }), exam(7, 900, { domains: { networking: 640 } }), exam(14, 900, { domains: { networking: 640 } })], READINESS, day(14))!;
    expect(check(weak, "weakest_domain")).toMatchObject({ ok: false, value: 640, target: 650, domain: "networking", blocking: true });
    expect(weak.ready).toBe(false);
    expect(weak.index).toBe(83); // 50 + 20 + 16 × 0.2 + 10: under the cap already
  });

  it("says when every rule is met but the scores do not reach the ready band yet", () => {
    // The weakest combination that meets all the rules: 3 exams at exactly 800, weakest domain at 760.
    const history = [0, 7, 14].map((d) => exam(d, 800, { domains: { networking: 760 } }));
    const r = computeReadiness(history, READINESS, day(14))!;
    expect(r.criteria).toEqual({ level: 80, consistency: 80, domains: 64, freshness: 100 });
    expect(r).toMatchObject({ index: 79, verdict: "almost", ready: false });
    for (const code of ["attempts", "streak", "weakest_domain"]) expect(check(r, code).ok).toBe(true);
    // Level loses 0.5 × 20 = 10 points, more than domains (0.2 × 36 = 7.2): it is the one to work on.
    expect(check(r, "index")).toMatchObject({ ok: false, blocking: true, value: 79, target: 85, criterion: "level" });
  });

  it("needs the streak: one exam under the minimum score breaks it", () => {
    const r = computeReadiness([exam(0, 900), exam(7, 790), exam(14, 900), exam(21, 900)], READINESS, day(21))!;
    expect(check(r, "streak")).toMatchObject({ ok: false, value: 2 });
    expect(r.ready).toBe(false);
    expect(r.index).toBeLessThan(85);
  });

  it("is almost ready with good scores, a short streak and a weak domain", () => {
    const history = [
      exam(0, 790, { domains: { networking: 600 } }),
      exam(7, 810, { domains: { networking: 640 } }),
      exam(14, 830, { domains: { networking: 680 } }),
    ];
    const r = computeReadiness(history, READINESS, day(14))!;
    // level (790 + 1620 + 2490) / 6 ≈ 817 → 86.7; consistency 790 → 76; weakest domain 640 → 16; freshness 100.
    expect(r.criteria).toEqual({ level: 87, consistency: 76, domains: 16, freshness: 100 });
    expect(r).toMatchObject({ index: 72, verdict: "almost" });
    expect(check(r, "average")).toMatchObject({ ok: true, value: 817 });
    expect(check(r, "streak")).toMatchObject({ ok: false, value: 2 });
    expect(check(r, "weakest_domain")).toMatchObject({ ok: false, value: 640, domain: "networking" });
  });

  it("is not ready with low scores", () => {
    const r = computeReadiness([exam(0, 550), exam(7, 600), exam(14, 620)], READINESS, day(14))!;
    expect(r.verdict).toBe("not_ready");
    expect(r.criteria.level).toBe(1); // (550 + 1200 + 1860) / 6 ≈ 602 → 0.7 points
    expect(check(r, "average")).toMatchObject({ ok: false, value: 602, target: 800 });
  });

  it("counts less when the last exam gets old", () => {
    const history = [exam(0, 900), exam(7, 900), exam(14, 900)];
    expect(computeReadiness(history, READINESS, day(44))!.criteria.freshness).toBe(100); // 30 days: still fresh
    const old = computeReadiness(history, READINESS, day(74))!; // 60 days: recency 0.5, still under zeroDays
    expect(old.criteria.freshness).toBe(75);
    expect(check(old, "recent_exam")).toMatchObject({ ok: true, value: 60, target: 90, blocking: true });
    expect(old.ready).toBe(true);
    expect(computeReadiness(history, READINESS, day(104))!.criteria.freshness).toBe(50); // 90 days (zeroDays): recency 0
    expect(computeReadiness(history, { ...READINESS, freshness: { ...READINESS.freshness, zeroDays: 150 } }, day(104))!.criteria.freshness).toBe(75);
  });

  it("is not ready once the last exam is older than zeroDays, however good", () => {
    const history = [exam(0, 920), exam(7, 920), exam(14, 920)];
    const r = computeReadiness(history, READINESS, day(14 + 365))!;
    // 100 / 100 / 100 and freshness 50 (new questions, no recency): 95 before the cap.
    expect(r).toMatchObject({ raw: 95, capped: true, index: 84, verdict: "almost", ready: false });
    expect(check(r, "recent_exam")).toMatchObject({ ok: false, blocking: true, value: 365, target: 90 });
    expect(computeReadiness(history, READINESS, day(14 + 90))!.ready).toBe(true);
  });

  it("is never ready on recent exams made of known questions", () => {
    const same = Array.from({ length: 10 }, (_, i) => `same-${i}`);
    const history = [exam(0, 900, { questionIds: same }), exam(7, 900, { questionIds: same }), exam(14, 900, { questionIds: same }), exam(21, 900, { questionIds: same })];
    const r = computeReadiness(history, READINESS, day(21))!;
    // The last 3 exams only had known questions: novelty 0, recency 1.
    expect(r.criteria.freshness).toBe(50);
    expect(check(r, "new_questions")).toMatchObject({ ok: false, blocking: true, value: 0, target: 50 });
    expect(r).toMatchObject({ raw: 95, capped: true, index: 84, verdict: "almost", ready: false });
  });

  it("is ready again once recent exams bring enough new questions", () => {
    const seen = Array.from({ length: 10 }, (_, i) => `seen-${i}`);
    // Half known, half new in each recent exam: exactly the 50 % required.
    const half = (d: number) => exam(d, 900, { questionIds: [...seen.slice(0, 5), ...Array.from({ length: 5 }, (_, i) => `new-${d}-${i}`)] });
    const r = computeReadiness([exam(0, 900, { questionIds: seen }), half(7), half(14), half(21)], READINESS, day(21))!;
    expect(check(r, "new_questions")).toMatchObject({ ok: true, value: 50 });
    expect(r.ready).toBe(true);
  });

  it("counts an exam without questions as new, and fails the domain rule without domains", () => {
    const empty: ExamSummary = { submittedAt: day(0), scaledScore: 900, questionIds: [], domains: [] };
    const r = computeReadiness([empty], READINESS, day(0))!;
    expect(r.criteria.domains).toBe(0);
    expect(r.criteria.freshness).toBe(100);
    expect(check(r, "weakest_domain")).toMatchObject({ ok: false, blocking: true, value: 0 });
  });

  it("uses the level window and recent exams from the settings", () => {
    const history = [exam(0, 400), exam(7, 900), exam(14, 900)];
    const narrow = computeReadiness(history, { ...READINESS, window: 2, recent: 2, minAttempts: 2, consecutive: 2 }, day(14))!;
    expect(narrow.criteria.consistency).toBe(100);
    expect(narrow.ready).toBe(true);
    const wide = computeReadiness(history, READINESS, day(14))!;
    expect(wide.criteria.consistency).toBe(0);
  });
});

describe("readiness settings", () => {
  it("accepts the AZ-104 settings", () => {
    expect(readinessSchema.parse(READINESS)).toEqual(READINESS);
  });

  it("rejects weights that do not sum to 1, bands out of order, an empty scale and a recency that never decays", () => {
    expect(readinessSchema.safeParse({ ...READINESS, weights: { level: 0.5, consistency: 0.2, domains: 0.2, freshness: 0.2 } }).success).toBe(false);
    expect(readinessSchema.safeParse({ ...READINESS, bands: { progressing: 50, almost: 90, ready: 85 } }).success).toBe(false);
    expect(readinessSchema.safeParse({ ...READINESS, scale: { from: 850, to: 850 } }).success).toBe(false);
    // Whole-number bands keep the cap (ready - 1) inside the "almost" band.
    expect(readinessSchema.safeParse({ ...READINESS, bands: { progressing: 50, almost: 84.5, ready: 85 } }).success).toBe(false);
    expect(readinessSchema.safeParse({ ...READINESS, freshness: { staleDays: 30, zeroDays: 30, minNewShare: 0.5 } }).success).toBe(false);
  });
});
