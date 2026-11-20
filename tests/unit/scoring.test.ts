import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { describe, expect, it, vi } from "vitest";
import { breakdownBy, scaledScore, scoreExam, scoreItem, scoringRules } from "@/lib/exam/scoring";
import { DEFAULT_SCORING, blueprintFileSchema, scoringRulesSchema } from "@/lib/content/schema";
import { maxPoints } from "@/lib/questions/schema";

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

describe("scoring rules (blueprint.scoring)", () => {
  const multi = { type: "multi" as const, body: { choose: 2, options: opts("a", "b", "c", "d", "e") }, answer: { optionIds: ["a", "c"] } };
  const dragdrop = { type: "dragdrop" as const, body: { targets: opts("t1", "t2", "t3") }, answer: { mapping: { t1: "i1", t2: "i2", t3: "i3" } } };
  const aws = scoringRulesSchema.parse({ multi: "all_or_nothing", dragdrop: "all_or_nothing" });

  it("defaults to the Microsoft rule: per option, per element", () => {
    expect(DEFAULT_SCORING).toEqual({ multi: "per_option", dragdrop: "per_element" });
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(scoringRules(undefined)).toEqual(DEFAULT_SCORING);
    expect(scoringRules(null)).toEqual(DEFAULT_SCORING);
    expect(scoringRules({})).toEqual(DEFAULT_SCORING);
    expect(scoringRules({ dragdrop: "all_or_nothing" })).toEqual({ multi: "per_option", dragdrop: "all_or_nothing" });
    // Absent is silent; unreadable falls back too, but is logged.
    expect(errors).not.toHaveBeenCalled();
    expect(scoringRules({ multi: "bogus" })).toEqual(DEFAULT_SCORING);
    expect(errors).toHaveBeenCalledOnce();
    const logged = JSON.parse(errors.mock.calls[0]![0] as string);
    expect(logged).toMatchObject({ level: "error", event: "exam.scoring_rules", stored: { multi: "bogus" } });
    errors.mockRestore();
  });

  it("multi: the same answers scored per option and all or nothing", () => {
    const perOption = DEFAULT_SCORING;
    expect(scoreItem(multi, { optionIds: ["a", "c"] }, perOption)).toEqual({ earned: 2, max: 2 });
    expect(scoreItem(multi, { optionIds: ["a", "c"] }, aws)).toEqual({ earned: 1, max: 1 });
    // Partly right: a point per option, nothing all or nothing.
    expect(scoreItem(multi, { optionIds: ["a", "b"] }, perOption)).toEqual({ earned: 1, max: 2 });
    expect(scoreItem(multi, { optionIds: ["a", "b"] }, aws)).toEqual({ earned: 0, max: 1 });
    expect(scoreItem(multi, { optionIds: ["c"] }, aws)).toEqual({ earned: 0, max: 1 });
    expect(scoreItem(multi, { optionIds: ["a", "c", "e"] }, aws)).toEqual({ earned: 0, max: 1 });
    expect(scoreItem(multi, { optionIds: ["c", "a", "a"] }, aws)).toEqual({ earned: 1, max: 1 });
    expect(scoreItem(multi, null, aws)).toEqual({ earned: 0, max: 1 });
    expect(maxPoints("multi", multi.body, aws)).toBe(1);
    expect(maxPoints("multi", multi.body)).toBe(2);
  });

  it("dragdrop: the same answers scored per element and all or nothing", () => {
    const right = { mapping: { t1: "i1", t2: "i2", t3: "i3" } };
    const twoOfThree = { mapping: { t1: "i1", t2: "i3", t3: "i3" } };
    expect(scoreItem(dragdrop, right, DEFAULT_SCORING)).toEqual({ earned: 3, max: 3 });
    expect(scoreItem(dragdrop, right, aws)).toEqual({ earned: 1, max: 1 });
    expect(scoreItem(dragdrop, twoOfThree, DEFAULT_SCORING)).toEqual({ earned: 2, max: 3 });
    expect(scoreItem(dragdrop, twoOfThree, aws)).toEqual({ earned: 0, max: 1 });
    expect(scoreItem(dragdrop, { mapping: { t1: "i1", t2: "i2" } }, aws)).toEqual({ earned: 0, max: 1 });
  });

  it("leaves the other types as they are", () => {
    const yesno = { type: "yesno_statements" as const, body: { statements: opts("s1", "s2") }, answer: { values: { s1: true, s2: false } } };
    expect(scoreItem(yesno, { values: { s1: true, s2: true } }, aws)).toEqual({ earned: 1, max: 2 });
    const ordering = { type: "ordering" as const, body: { count: 2 }, answer: { sequence: ["a", "b"] } };
    expect(scoreItem(ordering, { sequence: ["a", "b"] }, aws)).toEqual({ earned: 1, max: 1 });
  });

  it("a partly right multi weighs on the exam score only per option", () => {
    const items = [scoreItem(multi, { optionIds: ["a", "b"] }, aws), { earned: 1, max: 1 }];
    expect(scoreExam(items, { maxScore: 1000, passScore: 720 })).toMatchObject({ earned: 1, possible: 2, scaledScore: 500 });
  });

  it("is read from the blueprint, unknown rules refused", () => {
    expect(() => scoringRulesSchema.parse({ multi: "half" })).toThrow();
    expect(() => scoringRulesSchema.parse({ ordering: "all_or_nothing" })).toThrow();
  });

  it("AZ-104 keeps the Microsoft rule; a blueprint can ask for all or nothing", () => {
    const az104 = blueprintFileSchema.parse(parse(readFileSync("content/az-104/blueprint.yaml", "utf8")));
    expect(az104.blueprint.scoring).toEqual({ multi: "per_option", dragdrop: "per_element" });
    const raw = parse(readFileSync("content/az-104/blueprint.yaml", "utf8"));
    raw.blueprint.scoring = { multi: "all_or_nothing" };
    expect(blueprintFileSchema.parse(raw).blueprint.scoring).toEqual({ multi: "all_or_nothing", dragdrop: "per_element" });
    raw.blueprint.scoring = { multi: "per_element" };
    expect(blueprintFileSchema.safeParse(raw).success).toBe(false);
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
