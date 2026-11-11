import { describe, expect, it } from "vitest";
import { assembleExam, drawDomainCounts, type AssembledExam, type AssemblyHistory } from "@/lib/exam/assembler";
import { createRng, pickRandom, randInt } from "@/lib/exam/random";
import { allQuestions, az104Blueprint, makeBank } from "./fixtures/bank";

const emptyHistory = (): AssemblyHistory => ({ seenAt: new Map(), missed: new Set() });
const ids = (exam: AssembledExam) => exam.sections.flatMap((s) => s.questionIds);
const bank = makeBank();
const index = allQuestions(bank);

describe("random", () => {
  it("is deterministic per seed", () => {
    const a = createRng("x"), b = createRng("x"), c = createRng("y");
    const sa = [a(), a(), a()], sb = [b(), b(), b()], sc = [c(), c(), c()];
    expect(sa).toEqual(sb);
    expect(sa).not.toEqual(sc);
    for (const v of sa) expect(v >= 0 && v < 1).toBe(true);
  });
  it("draws integers in range", () => {
    const r = createRng("ints");
    for (let i = 0; i < 200; i++) {
      const v = randInt(r, 3, 5);
      expect(v >= 3 && v <= 5).toBe(true);
    }
    expect(randInt(r, 4, 4)).toBe(4);
    expect(pickRandom(r, [])).toBeUndefined();
    expect(pickRandom(r, ["a"])).toBe("a");
  });
});

describe("drawDomainCounts", () => {
  it("sums to the total and stays inside each weight range", () => {
    for (let total = 45; total <= 58; total++) {
      const counts = drawDomainCounts(az104Blueprint.domains, total, createRng(`d${total}`));
      expect([...counts.values()].reduce((a, b) => a + b, 0)).toBe(total);
      for (const d of az104Blueprint.domains) {
        const c = counts.get(d.code)!;
        expect(c).toBeGreaterThanOrEqual(Math.ceil(d.weightMin * total - 1e-9));
        expect(c).toBeLessThanOrEqual(Math.floor(d.weightMax * total + 1e-9));
      }
    }
  });
  it("still sums to the total with inconsistent ranges", () => {
    const counts = drawDomainCounts([{ code: "a", weightMin: 0.6, weightMax: 0.6 }, { code: "b", weightMin: 0.6, weightMax: 0.6 }], 10, createRng("x"));
    expect(counts.get("a")! + counts.get("b")!).toBe(10);
    const low = drawDomainCounts([{ code: "a", weightMin: 0.1, weightMax: 0.1 }, { code: "b", weightMin: 0.1, weightMax: 0.1 }], 10, createRng("y"));
    expect(low.get("a")! + low.get("b")!).toBe(10);
  });
});

describe("assembleExam", () => {
  it("is deterministic: same seed and inputs give the same exam, whatever the input order", () => {
    const a = assembleExam({ blueprint: az104Blueprint, bank, history: emptyHistory(), seed: "seed-1" });
    const shuffled = { ...bank, questions: [...bank.questions].reverse(), caseStudies: [...bank.caseStudies].reverse() };
    const b = assembleExam({ blueprint: az104Blueprint, bank: shuffled, history: emptyHistory(), seed: "seed-1" });
    const c = assembleExam({ blueprint: az104Blueprint, bank, history: emptyHistory(), seed: "seed-2" });
    expect(b).toEqual(a);
    expect(ids(c)).not.toEqual(ids(a));
  });

  it("keeps every series when the blueprint asks for several (regression: only the last one was kept)", () => {
    const twoSeries = { ...az104Blueprint, structure: { ...az104Blueprint.structure, series: { ...az104Blueprint.structure.series, count: { min: 2, max: 2 } } } };
    for (let i = 0; i < 20; i++) {
      const exam = assembleExam({ blueprint: twoSeries, bank, history: emptyHistory(), seed: `two-series-${i}` });
      const series = exam.sections.filter((s) => s.kind === "series");
      expect(series).toHaveLength(2);
      expect(new Set(series.map((s) => s.seriesId)).size).toBe(2);
      for (const s of series) expect(s.questionIds.length).toBeGreaterThanOrEqual(3);
      expect(exam.shortfall).toBe(0);
      expect(ids(exam).length).toBe(exam.targetTotal);
      expect(exam.sections.map((s) => s.kind).join(",")).toMatch(/^(case_study,)*series,series,main(,case_study)*$/);
    }
  });

  it("respects the blueprint over many seeds: size, sections, weights, mix, no duplicates", () => {
    const typeTotals = new Map<string, number>();
    const diffTotals = [0, 0, 0];
    let questionsTotal = 0;
    for (let i = 0; i < 150; i++) {
      const exam = assembleExam({ blueprint: az104Blueprint, bank, history: emptyHistory(), seed: `many-${i}` });
      const list = ids(exam);
      expect(exam.shortfall).toBe(0);
      expect(list.length).toBe(exam.targetTotal);
      expect(list.length).toBeGreaterThanOrEqual(45);
      expect(list.length).toBeLessThanOrEqual(58);
      expect(new Set(list).size).toBe(list.length);

      const cs = exam.sections.filter((s) => s.kind === "case_study");
      expect(cs.length).toBeGreaterThanOrEqual(1);
      expect(cs.length).toBeLessThanOrEqual(2);
      for (const s of cs) expect(s.questionIds.length).toBeGreaterThanOrEqual(4);
      for (const s of cs) expect(s.questionIds.length).toBeLessThanOrEqual(7);
      const series = exam.sections.filter((s) => s.kind === "series");
      expect(series.length).toBeLessThanOrEqual(1);
      for (const s of series) expect(s.questionIds.length).toBeGreaterThanOrEqual(3);
      expect(exam.sections.filter((s) => s.kind === "main")).toHaveLength(1);
      // case studies are grouped at the start or at the end
      const kinds = exam.sections.map((s) => s.kind).join(",");
      expect(kinds).toMatch(/^(case_study,)*(series,)?main(,case_study)*$/);
      expect(kinds.startsWith("case_study") !== kinds.endsWith("case_study")).toBe(true);

      // domain weights: inside the range (±1 question of rounding slack)
      const qs = list.map((id) => index.get(id)!);
      for (const d of az104Blueprint.domains) {
        const n = qs.filter((q) => q.domain === d.code).length;
        expect(n, `${d.code} in exam ${i}`).toBeGreaterThanOrEqual(Math.ceil(d.weightMin * list.length) - 1);
        expect(n, `${d.code} in exam ${i}`).toBeLessThanOrEqual(Math.floor(d.weightMax * list.length) + 1);
      }
      // at most 2 independent questions per objective
      const perObjective = new Map<string, number>();
      for (const id of exam.sections.find((s) => s.kind === "main")!.questionIds) {
        const o = index.get(id)!.objective;
        perObjective.set(o, (perObjective.get(o) ?? 0) + 1);
      }
      for (const n of perObjective.values()) expect(n).toBeLessThanOrEqual(2);

      for (const q of qs) {
        typeTotals.set(q.type, (typeTotals.get(q.type) ?? 0) + 1);
        diffTotals[q.difficulty - 1]! += 1;
      }
      questionsTotal += qs.length;
    }
    // type mix on average inside the target ranges (series questions excluded from the mix)
    for (const [type, range] of Object.entries(az104Blueprint.typeMix)) {
      const share = (typeTotals.get(type) ?? 0) / questionsTotal;
      expect(share, type).toBeGreaterThanOrEqual(range!.min - 0.02);
      expect(share, type).toBeLessThanOrEqual(range!.max + 0.02);
    }
    // difficulty mix close to 30 / 50 / 20
    expect(diffTotals[0]! / questionsTotal).toBeCloseTo(0.3, 1);
    expect(diffTotals[1]! / questionsTotal).toBeCloseTo(0.5, 1);
    expect(diffTotals[2]! / questionsTotal).toBeCloseTo(0.2, 1);
  });

  it("gives 6 successive exams without any common question with the target bank", () => {
    const history = emptyHistory();
    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const exam = assembleExam({ blueprint: az104Blueprint, bank, history, seed: `succ-${i}` });
      const list = ids(exam);
      expect(exam.reused, `exam ${i}`).toBe(0);
      for (const id of list) {
        expect(seen.has(id), `${id} repeated in exam ${i}`).toBe(false);
        seen.add(id);
        history.seenAt.set(id, i);
      }
    }
  });

  it("when the bank is exhausted, reuses missed and oldest questions first", () => {
    const small = makeBank({ perDomain: { identities: 14, storage: 11, compute: 14, networking: 11, monitoring: 9 }, caseStudies: 0, series: 0 });
    const noStructure = {
      ...az104Blueprint,
      minQuestions: 45,
      maxQuestions: 45,
      structure: { ...az104Blueprint.structure, caseStudies: { ...az104Blueprint.structure.caseStudies, count: { min: 0, max: 0 } }, series: { ...az104Blueprint.structure.series, count: { min: 0, max: 0 } } },
    };
    const history = emptyHistory();
    const first = ids(assembleExam({ blueprint: noStructure, bank: small, history, seed: "x1" }));
    expect(first).toHaveLength(45);
    // 59 questions: 14 unseen remain. Mark the first exam as seen, with 5 missed answers, at increasing dates.
    first.forEach((id, i) => history.seenAt.set(id, 1000 + i));
    const missed = first.slice(30, 35);
    for (const id of missed) history.missed.add(id);
    const second = assembleExam({ blueprint: noStructure, bank: small, history, seed: "x2" });
    const list = ids(second);
    const unseen = small.questions.filter((q) => !history.seenAt.has(q.id)).map((q) => q.id);
    for (const id of unseen) expect(list).toContain(id);
    expect(second.reused).toBe(45 - unseen.length);
    const reusedIds = list.filter((id) => history.seenAt.has(id));
    // the missed ones and the oldest ones come back before the most recent ones
    for (const id of missed) expect(reusedIds).toContain(id);
    const newest = first.slice(-5);
    for (const id of newest) expect(reusedIds).not.toContain(id);
  });

  it("reports a shortfall instead of failing when the bank is too small", () => {
    const tiny = makeBank({ perDomain: { identities: 3, storage: 2, compute: 3, networking: 2, monitoring: 2 }, caseStudies: 1, series: 1 });
    const exam = assembleExam({ blueprint: az104Blueprint, bank: tiny, history: emptyHistory(), seed: "tiny" });
    const list = ids(exam);
    expect(new Set(list).size).toBe(list.length);
    expect(exam.shortfall).toBe(exam.targetTotal - list.length);
    expect(exam.shortfall).toBeGreaterThan(0);
  });

  it("honours a fixed case-study placement", () => {
    for (const placement of ["start", "end"] as const) {
      const bp = { ...az104Blueprint, structure: { ...az104Blueprint.structure, caseStudies: { ...az104Blueprint.structure.caseStudies, placement } } };
      const exam = assembleExam({ blueprint: bp, bank, history: emptyHistory(), seed: `p-${placement}` });
      const first = exam.sections[0]!.kind, last = exam.sections.at(-1)!.kind;
      expect(placement === "start" ? first : last).toBe("case_study");
    }
  });

  it("assembles an exam in well under 2 seconds", () => {
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) assembleExam({ blueprint: az104Blueprint, bank, history: emptyHistory(), seed: `perf-${i}` });
    expect((performance.now() - t0) / 10).toBeLessThan(200);
  });
});
