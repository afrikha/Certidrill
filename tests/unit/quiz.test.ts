/**
 * Chapter quizzes (docs/SPECS-QUIZ-CHAPITRE.md): the rules of the result and
 * the checks of a quiz file (§4.3), on a real AZ-104 quiz and variants of it.
 */
import path from "node:path";
import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { beforeAll, describe, expect, it } from "vitest";
import { betterQuizResult, isHardPosition, quizScore, QUIZ_RULES } from "@/lib/course/quiz-rules";
import { checkQuizFile, examFormats, jaccard, quizQuestionId, shingles, words, type QuizContext } from "@/lib/content/quiz";

describe("quiz rules (§3.3, §8)", () => {
  it("masters a chapter with 8/10 of which 4/5 at exam level", () => {
    expect(QUIZ_RULES).toMatchObject({ length: 10, easy: 5, passTotal: 8, passHard: 4 });
    expect(quizScore([1, 2, 3, 4, 6, 7, 8, 9])).toEqual({ score: 8, hardScore: 4, passed: true });
    // 8/10 but only 3/5 at exam level: to review.
    expect(quizScore([1, 2, 3, 4, 5, 6, 7, 8])).toEqual({ score: 8, hardScore: 3, passed: false });
    expect(quizScore([6, 7, 8, 9, 10, 1, 2])).toEqual({ score: 7, hardScore: 5, passed: false });
    expect(quizScore([])).toEqual({ score: 0, hardScore: 0, passed: false });
    // Out of range and repeated positions do not count.
    expect(quizScore([0, 11, 6, 6])).toEqual({ score: 1, hardScore: 1, passed: false });
    expect([5, 6].map(isHardPosition)).toEqual([false, true]);
  });

  it("keeps the best result: more passed, then more at exam level, then the earlier", () => {
    const at = (d: string) => new Date(`2026-11-${d}T10:00:00Z`);
    const a = { score: 7, hardScore: 4, completedAt: at("01") };
    const b = { score: 7, hardScore: 3, completedAt: at("02") };
    const c = { score: 9, hardScore: 4, completedAt: at("03") };
    expect(betterQuizResult(null, a)).toBe(a);
    expect(betterQuizResult(a, b)).toBe(a);
    expect(betterQuizResult(b, a)).toBe(a);
    expect(betterQuizResult(a, c)).toBe(c);
    expect(betterQuizResult(a, { ...a, completedAt: at("05") })).toBe(a);
  });
});

describe("stem similarity", () => {
  it("compares word 4-grams, code blocks left out", () => {
    expect(words("Configure the VNet, then ```az vm create``` peering!")).toEqual(["configure", "the", "vnet", "then", "peering"]);
    expect([...shingles("a b c d e")]).toEqual(["a b c d", "b c d e"]);
    expect(jaccard(shingles("a b c d e"), shingles("a b c d e"))).toBe(1);
    expect(jaccard(shingles("a b c d e"), shingles("b c d e f"))).toBeCloseTo(1 / 3);
    expect(jaccard(shingles("a b c"), shingles("a b c"))).toBe(0);
  });
  it("builds the expected ids", () => {
    expect(quizQuestionId("az-104", "12-rbac", 3)).toBe("az104-qz-12-03");
    expect(quizQuestionId("dp-900", "04-relational", 10)).toBe("dp900-qz-04-10");
  });
});

describe("checkQuizFile (§4.3)", () => {
  const file = path.resolve(__dirname, "../../content/az-104/quizzes/12-rbac.yaml");
  let raw: { chapter: string; questions: Record<string, unknown>[] };
  let ctx: QuizContext;
  const copy = () => structuredClone(raw);
  const problems = (doc: unknown, c: Partial<QuizContext> = {}) => checkQuizFile(doc, file, { ...ctx, ...c }).problems;

  beforeAll(async () => {
    raw = parse(await readFile(file, "utf8"));
    const objectives = [...new Set(raw.questions.map((q) => q.objective as string))];
    ctx = { code: "az-104", languages: ["en", "fr"], chapters: [{ id: "00-getting-started", objectives: [] }, { id: "12-rbac", objectives }], bank: [] };
  });

  it("accepts the AZ-104 quiz as delivered", () => {
    const r = checkQuizFile(raw, file, ctx);
    expect(r.problems).toEqual([]);
    expect(r.quiz?.questions.map((q) => q.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("refuses a wrong chapter, a count other than 10, a wrong id and an id taken", () => {
    expect(problems({ ...copy(), chapter: "11-entra-users-groups" })).toContain('chapter must be "12-rbac" (the file name)');
    expect(problems(copy(), { chapters: [] })).toContain("no chapter 12-rbac in course/chapters");
    const nine = copy();
    nine.questions.pop();
    expect(problems(nine)).toContain("needs exactly 10 questions, has 9");
    const wrongId = copy();
    wrongId.questions[2]!.id = "az104-qz-12-99";
    expect(problems(wrongId)).toContain("q3 (az104-qz-12-99): id must be az104-qz-12-03");
    expect(problems(copy(), { takenIds: new Map([["az104-qz-12-01", "content/az-104/questions/x.yaml"]]) })).toContain("q1 (az104-qz-12-01): id already used by content/az-104/questions/x.yaml");
  });

  it("refuses difficulties out of order and too few exam formats", () => {
    const first = copy();
    first.questions[0]!.difficulty = 2;
    expect(problems(first)).toContain("q1 (az104-qz-12-01): the first question is difficulty 1");
    const hard = copy();
    hard.questions[2]!.difficulty = 3;
    expect(problems(hard)).toContain("q3 (az104-qz-12-03): positions 1-5 are difficulty 1 or 2");
    const easy = copy();
    easy.questions[7]!.difficulty = 2;
    expect(problems(easy)).toContain("q8 (az104-qz-12-08): positions 6-10 are exam level (difficulty 3)");
    const formats = copy();
    const single = formats.questions.find((q) => q.type === "single")!;
    for (let i = 5; i < 10; i++) formats.questions[i] = { ...structuredClone(single), id: `az104-qz-12-${String(i + 1).padStart(2, "0")}`, difficulty: 3 };
    expect(problems(formats).some((p) => p.startsWith("positions 6-10 need at least two formats other than single"))).toBe(true);
  });

  it("with a single exam format other than single (Google Cloud: multi), needs two questions of it at positions 6-10", () => {
    // Positions 6-10: three single, then `multi` `times` times (the rest single).
    const withMulti = (times: number) => {
      const doc = copy();
      const single = doc.questions.find((q) => q.type === "single")!;
      const multi = doc.questions.find((q) => q.type === "multi")!;
      for (let i = 5; i < 10; i++) {
        const from = i >= 10 - times ? multi : single;
        doc.questions[i] = { ...structuredClone(from), id: `az104-qz-12-${String(i + 1).padStart(2, "0")}`, difficulty: 3 };
      }
      return doc;
    };
    const twoFormats = "positions 6-10 need at least two formats other than single";
    const twoMulti = "positions 6-10 need at least two multi questions";
    // Two multi: enough when multi is the only other format, not when the exam offers two.
    expect(problems(withMulti(2), { examFormats: ["multi"] })).toEqual([]);
    expect(problems(withMulti(2), { examFormats: ["multi", "dragdrop"] }).some((p) => p.startsWith(twoFormats))).toBe(true);
    expect(problems(withMulti(2)).some((p) => p.startsWith(twoFormats))).toBe(true);
    // One multi: too few.
    expect(problems(withMulti(1), { examFormats: ["multi"] })).toContain(
      "positions 6-10 need at least two multi questions (the only exam format other than single; have 1)",
    );
    // The delivered quiz (four formats) passes either way.
    expect(problems(copy(), { examFormats: ["multi"] }).some((p) => p.startsWith(twoMulti))).toBe(false);
    expect(problems(copy(), { examFormats: ["multi", "dragdrop"] })).toEqual([]);
  });

  it("examFormats: the formats other than single with a share above 0", () => {
    expect(examFormats({ single: { max: 0.8 }, multi: { max: 0.3 } })).toEqual(["multi"]);
    expect(examFormats({ single: { max: 1 }, multi: { max: 0.2 }, dragdrop: { max: 0 }, hotspot: undefined })).toEqual(["multi"]);
    expect(examFormats({ single: { max: 0.6 }, multi: { max: 0.2 }, dragdrop: { max: 0.1 } })).toEqual(["multi", "dragdrop"]);
    expect(examFormats({ single: { max: 1 } })).toEqual([]);
  });

  it("refuses an objective outside the chapter, an objective not tested, and a wrong option without explanation", () => {
    expect(problems(copy(), { chapters: [{ id: "12-rbac", objectives: ["9.9.9", ...ctx.chapters[1]!.objectives] }] })).toContain("objective 9.9.9 of the chapter is not tested");
    expect(problems(copy(), { chapters: [{ id: "12-rbac", objectives: ctx.chapters[1]!.objectives.slice(1) }] }).some((p) => p.includes("is not one of the chapter"))).toBe(true);
    const unexplained = copy();
    const i = unexplained.questions.findIndex((q) => q.type === "single");
    delete (unexplained.questions[i]!.explanation as { options?: unknown }).options;
    expect(problems(unexplained)).toContain(`q${i + 1} (${unexplained.questions[i]!.id}): explanation.options is required`);
  });

  it("refuses a stem close to an exam question (Jaccard of 4-grams ≥ 0.35)", () => {
    const stem = (raw.questions[4]!.stem as { en: string }).en;
    expect(problems(copy(), { bank: [{ id: "az104-s1-close", stem }] }).some((p) => p.startsWith("q5 (az104-qz-12-05): stem too close to exam question az104-s1-close (similarity 1.00"))).toBe(true);
    expect(problems(copy(), { bank: [{ id: "az104-s1-other", stem: "Which storage redundancy option replicates data to a secondary region?" }] })).toEqual([]);
  });

  it("requires French when the certification offers it, and no quiz for a chapter without objectives", () => {
    const noFr = copy();
    delete (noFr.questions[0]!.stem as { fr?: string }).fr;
    expect(problems(noFr).some((p) => p.startsWith("q1 (az104-qz-12-01) stem: fr is required"))).toBe(true);
    expect(problems(noFr, { languages: ["en"] })).toEqual([]);
    const intro = path.join(path.dirname(file), "00-getting-started.yaml");
    expect(checkQuizFile({ ...copy(), chapter: "00-getting-started" }, intro, ctx).problems).toContain("chapter 00-getting-started has no objective: no quiz for it");
  });
});
