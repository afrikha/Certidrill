import { describe, expect, it } from "vitest";
import { breakdownBy, scaledScore, scoreExam, scoreItem } from "@/lib/exam/scoring";

const opts = (...ids: string[]) => ids.map((id) => ({ id, text: id }));

describe("scoreItem", () => {
  const single = { type: "single" as const, body: { options: opts("a", "b", "c", "d") }, answer: { optionId: "c" } };
  it("single: 1 if correct, 0 otherwise, 0 when unanswered or invalid", () => {
    expect(scoreItem(single, { optionId: "c" })).toEqual({ earned: 1, max: 1 });
    expect(scoreItem(single, { optionId: "a" })).toEqual({ earned: 0, max: 1 });
    expect(scoreItem(single, null)).toEqual({ earned: 0, max: 1 });
    expect(scoreItem(single, { optionId: 12 })).toEqual({ earned: 0, max: 1 });
    expect(scoreItem(single, "c")).toEqual({ earned: 0, max: 1 });
  });

  const multi = { type: "multi" as const, body: { choose: 2, options: opts("a", "b", "c", "d") }, answer: { optionIds: ["a", "c"] } };
  it("multi: 1 per correct option, 0 if more checked than requested", () => {
    expect(scoreItem(multi, { optionIds: ["a", "c"] })).toEqual({ earned: 2, max: 2 });
    expect(scoreItem(multi, { optionIds: ["a", "b"] })).toEqual({ earned: 1, max: 2 });
    expect(scoreItem(multi, { optionIds: ["c"] })).toEqual({ earned: 1, max: 2 });
    expect(scoreItem(multi, { optionIds: ["a", "b", "c"] })).toEqual({ earned: 0, max: 2 });
    expect(scoreItem(multi, { optionIds: ["a", "a"] })).toEqual({ earned: 1, max: 2 });
    expect(scoreItem(multi, { optionIds: [] })).toEqual({ earned: 0, max: 2 });
  });

  it("yesno_statements: 1 per correct statement", () => {
    const q = { type: "yesno_statements" as const, body: { statements: opts("s1", "s2", "s3") }, answer: { values: { s1: true, s2: false, s3: true } } };
    expect(scoreItem(q, { values: { s1: true, s2: false, s3: true } })).toEqual({ earned: 3, max: 3 });
    expect(scoreItem(q, { values: { s1: true, s2: true } })).toEqual({ earned: 1, max: 3 });
    expect(scoreItem(q, { values: { s1: "yes" } })).toEqual({ earned: 0, max: 3 });
  });

  it("dropdown and hotarea: 1 per correct slot or prompt", () => {
    const dd = { type: "dropdown" as const, body: { slots: [{ id: "x" }, { id: "y" }] }, answer: { values: { x: "a", y: "b" } } };
    expect(scoreItem(dd, { values: { x: "a", y: "c" } })).toEqual({ earned: 1, max: 2 });
    const hot = { type: "hotarea" as const, body: { prompts: opts("p1", "p2") }, answer: { values: { p1: "r1", p2: "r2" } } };
    expect(scoreItem(hot, { values: { p1: "r1", p2: "r2" } })).toEqual({ earned: 2, max: 2 });
  });

  it("dragdrop: 1 per correct target", () => {
    const q = { type: "dragdrop" as const, body: { targets: opts("t1", "t2", "t3") }, answer: { mapping: { t1: "i1", t2: "i2", t3: "i3" } } };
    expect(scoreItem(q, { mapping: { t1: "i1", t2: "i3", t3: "i3" } })).toEqual({ earned: 2, max: 3 });
  });

  it("ordering: 1 only for the exact sequence", () => {
    const q = { type: "ordering" as const, body: { count: 3 }, answer: { sequence: ["a", "b", "c"] } };
    expect(scoreItem(q, { sequence: ["a", "b", "c"] })).toEqual({ earned: 1, max: 1 });
    expect(scoreItem(q, { sequence: ["a", "c", "b"] })).toEqual({ earned: 0, max: 1 });
    expect(scoreItem(q, { sequence: ["a", "b"] })).toEqual({ earned: 0, max: 1 });
    expect(scoreItem(q, { sequence: ["a", "b", "c", "d"] })).toEqual({ earned: 0, max: 1 });
  });

  it("series_yesno: 1 if correct", () => {
    const q = { type: "series_yesno" as const, body: {}, answer: { value: false } };
    expect(scoreItem(q, { value: false })).toEqual({ earned: 1, max: 1 });
    expect(scoreItem(q, { value: true })).toEqual({ earned: 0, max: 1 });
  });
});

describe("exam score", () => {
  it("scales to 1000 with rounding and applies the pass mark", () => {
    expect(scaledScore(0, 0, 1000)).toBe(0);
    expect(scaledScore(2, 3, 1000)).toBe(667);
    const bp = { maxScore: 1000, passScore: 700 };
    expect(scoreExam([{ earned: 7, max: 10 }], bp)).toEqual({ earned: 7, possible: 10, scaledScore: 700, passed: true });
    expect(scoreExam([{ earned: 69, max: 100 }, { earned: 0, max: 0 }], bp)).toMatchObject({ scaledScore: 690, passed: false });
  });

  it("breaks scores down by key", () => {
    const items = [
      { earned: 1, max: 1, d: "a" },
      { earned: 0, max: 2, d: "b" },
      { earned: 2, max: 3, d: "a" },
    ];
    expect(breakdownBy(items, (i) => i.d, 1000)).toEqual([
      { key: "a", earned: 3, possible: 4, scaledScore: 750, questions: 2 },
      { key: "b", earned: 0, possible: 2, scaledScore: 0, questions: 1 },
    ]);
  });
});
