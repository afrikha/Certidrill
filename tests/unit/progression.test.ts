import { describe, expect, it } from "vitest";
import { progressionSchema } from "@/lib/content/schema";
import { computeProgression, levelOf, tierOf, type ProgressExam } from "@/lib/progress/progression";
import { PROGRESSION } from "./fixtures/bank";

const DOMAINS = ["identities", "storage", "compute", "networking", "monitoring"];
// 2026-01-05 is a Monday.
const day = (n: number) => new Date(Date.UTC(2026, 0, 5) + n * 86_400_000);

let nextQuestion = 0;
let nextId = 0;
function exam(d: number, score: number, opts: { domains?: Record<string, number>; questionIds?: string[] } = {}): ProgressExam {
  return {
    id: `a${nextId++}`,
    submittedAt: day(d),
    scaledScore: score,
    passed: score >= 700,
    questionIds: opts.questionIds ?? Array.from({ length: 10 }, () => `q${nextQuestion++}`),
    domains: DOMAINS.map((code) => ({ code, scaledScore: opts.domains?.[code] ?? score })),
  };
}
const codes = (p: ReturnType<typeof computeProgression>) => p.badges.map((b) => b.code);

describe("progression helpers", () => {
  it("finds the level for an XP total", () => {
    expect(levelOf(0, PROGRESSION.levels)).toBe(1);
    expect(levelOf(149, PROGRESSION.levels)).toBe(1);
    expect(levelOf(150, PROGRESSION.levels)).toBe(2);
    expect(levelOf(450, PROGRESSION.levels)).toBe(3);
    expect(levelOf(99_999, PROGRESSION.levels)).toBe(10);
  });

  it("finds the mastery tier of a domain score", () => {
    expect(tierOf(649, PROGRESSION.mastery)).toBe("none");
    expect(tierOf(650, PROGRESSION.mastery)).toBe("bronze");
    expect(tierOf(700, PROGRESSION.mastery)).toBe("silver");
    expect(tierOf(850, PROGRESSION.mastery)).toBe("gold");
  });
});

describe("computeProgression", () => {
  it("starts at level 1 without any exam", () => {
    const p = computeProgression([], PROGRESSION, 3);
    expect(p).toMatchObject({ xp: 0, level: { n: 1, from: 0, next: 150 }, levels: 10, gains: [], badges: [], mastery: [] });
  });

  it("can gain several levels with one exam: a first exam at 850 reaches level 3", () => {
    const first = exam(0, 850);
    const p = computeProgression([first], PROGRESSION, 3);
    expect(p.gains[0]).toEqual({
      attemptId: first.id,
      total: 450,
      parts: [
        { code: "base", xp: 50 },
        { code: "score", xp: 225 },
        { code: "pass", xp: 100 },
        { code: "best", xp: 75 },
      ],
      levelBefore: 1,
      levelAfter: 3,
    });
    expect(p).toMatchObject({ xp: 450, level: { n: 3, from: 400, next: 750 } });
    expect(codes(p)).toEqual(["first_exam", "first_pass", "gold_domain"]);
    expect(p.badges[0]).toEqual({ code: "first_exam", attemptId: first.id, earnedAt: day(0) });
  });

  it("gives a low exam only the base XP, and nothing under scoreFrom", () => {
    const p = computeProgression([exam(0, 350)], PROGRESSION, 3);
    // The first exam is the best so far, even when low.
    expect(p.gains[0]!.parts).toEqual([{ code: "base", xp: 50 }, { code: "best", xp: 75 }]);
    expect(codes(p)).toEqual(["first_exam"]);
  });

  it("rewards progress: personal best, improved domains and a comeback", () => {
    const a = exam(0, 600, { domains: { networking: 500 } });
    const b = exam(1, 780, { domains: { networking: 600, storage: 620 } });
    const p = computeProgression([a, b], PROGRESSION, 3);
    const gain = p.gains[1]!;
    // Domains: networking +100, storage +20 (600 → 620), the other three +180 → 4 improved.
    expect(gain.parts).toEqual([
      { code: "base", xp: 50 },
      { code: "score", xp: 190 },
      { code: "pass", xp: 100 },
      { code: "best", xp: 75 },
      { code: "domains", xp: 200 },
    ]);
    expect(codes(p)).toEqual(["first_exam", "first_pass", "personal_best", "comeback"]);
    expect(p.badges.find((x) => x.code === "comeback")!.attemptId).toBe(b.id);
  });

  it("gives less score XP on questions already seen", () => {
    const same = Array.from({ length: 10 }, (_, i) => `same-${i}`);
    const p = computeProgression([exam(0, 800, { questionIds: same }), exam(1, 800, { questionIds: same })], PROGRESSION, 3);
    expect(p.gains[0]!.parts.find((x) => x.code === "score")!.xp).toBe(200);
    // All known: knownShare 0.5 of the score XP; equal score: no personal best.
    expect(p.gains[1]!.parts).toEqual([{ code: "base", xp: 50 }, { code: "score", xp: 100 }, { code: "pass", xp: 100 }]);
  });

  it("awards the hat trick after 3 consecutive exams at 800 or more, once", () => {
    const history = [exam(0, 820), exam(1, 790), exam(2, 800), exam(3, 810), exam(4, 805), exam(5, 900)];
    const p = computeProgression(history, PROGRESSION, 3);
    expect(p.badges.filter((b) => b.code === "hat_trick")).toEqual([{ code: "hat_trick", attemptId: history[4]!.id, earnedAt: day(4) }]);
  });

  it("awards regularity for an exam in each of 4 consecutive weeks", () => {
    expect(codes(computeProgression([exam(0, 500), exam(7, 500), exam(14, 500)], PROGRESSION, 3))).not.toContain("regular");
    // Sunday of week 1, then weeks 2, 3 and 4.
    const history = [exam(6, 500), exam(7, 500), exam(20, 500), exam(21, 500)];
    const p = computeProgression(history, PROGRESSION, 3);
    expect(p.badges.find((b) => b.code === "regular")!.attemptId).toBe(history[3]!.id);
    // A missed week breaks it.
    expect(codes(computeProgression([exam(0, 500), exam(7, 500), exam(21, 500), exam(28, 500)], PROGRESSION, 3))).not.toContain("regular");
  });

  it("ranks domains by mastery over the recent exams", () => {
    const history = [exam(0, 900, { domains: { networking: 300 } }), exam(1, 700, { domains: { networking: 640, compute: 860 } }), exam(2, 700, { domains: { networking: 660, compute: 860 } })];
    const p = computeProgression(history, PROGRESSION, 2);
    expect(p.mastery).toEqual([
      { code: "identities", scaledScore: 700, tier: "silver" },
      { code: "storage", scaledScore: 700, tier: "silver" },
      { code: "compute", scaledScore: 860, tier: "gold" },
      { code: "networking", scaledScore: 650, tier: "bronze" },
      { code: "monitoring", scaledScore: 700, tier: "silver" },
    ]);
  });

  it("stops at the top level", () => {
    const history = Array.from({ length: 14 }, (_, i) => exam(i, 1000));
    const p = computeProgression(history, PROGRESSION, 3);
    expect(p.xp).toBeGreaterThanOrEqual(5000);
    expect(p.level).toEqual({ n: 10, from: 5000, next: null });
  });

  it("counts an exam without questions as new", () => {
    const empty: ProgressExam = { id: "e", submittedAt: day(0), scaledScore: 800, passed: true, questionIds: [], domains: [] };
    expect(computeProgression([empty], PROGRESSION, 3).gains[0]!.parts.find((x) => x.code === "score")!.xp).toBe(200);
  });
});

describe("progression settings", () => {
  it("accepts the AZ-104 settings", () => {
    expect(progressionSchema.parse(PROGRESSION)).toEqual(PROGRESSION);
  });

  it("rejects levels that do not start at 0 or do not increase, and tiers out of order", () => {
    const [l1, l2] = PROGRESSION.levels;
    expect(progressionSchema.safeParse({ ...PROGRESSION, levels: [{ ...l1!, xp: 10 }, l2] }).success).toBe(false);
    expect(progressionSchema.safeParse({ ...PROGRESSION, levels: [l1, { ...l2!, xp: 0 }] }).success).toBe(false);
    expect(progressionSchema.safeParse({ ...PROGRESSION, mastery: { bronze: 700, silver: 700, gold: 850 } }).success).toBe(false);
  });
});
