/**
 * Simulates N successive exams of one candidate on the current bank (all
 * statuses) with the real assembler, to check how many exams the bank can
 * supply without repeating a question.
 *   npx tsx tools/questions/simulate.ts --cert az-900 [count=10]
 *   npx tsx tools/questions/simulate.ts --cert all 10       (every certification, one summary line each)
 * Exits with 1 when an exam reuses a question, misses one, or puts a domain
 * outside the weight range of the blueprint.
 */
import path from "node:path";
import { loadCertification, type CertificationContent } from "../../lib/content/loader";
import { loadBank } from "../../lib/content/bank";
import { assembleExam, type CandidateQuestion } from "../../lib/exam/assembler";
import type { BlueprintStructure } from "../../lib/content/schema";
import { requireCertDirs } from "../cert-args";

const USAGE = "usage: simulate.ts --cert <code|code,code|all> [count=10]";

export interface SimulationSummary {
  code: string;
  exams: number;
  questions: number;
  bank: number;
  reused: number;
  shortfall: number;
  /** "exam 3: storage 31% (range 20–25%)" */
  outOfRange: string[];
  lines: string[];
}

/** Runs `n` exams of one candidate on one certification's bank. */
export async function simulate(content: CertificationContent, n: number): Promise<SimulationSummary> {
  const bank = await loadBank(content);
  const bp = content.blueprint.blueprint;
  const cand = (q: (typeof bank.questions)[number]): CandidateQuestion => ({ id: q.id, domain: q.domain, objective: q.objective, type: q.type, difficulty: q.difficulty });
  const assemblyBank = {
    questions: bank.questions.filter((q) => !q.caseStudy && !q.series).map(cand),
    caseStudies: bank.caseStudies.map((c) => ({ id: c.id, questions: bank.questions.filter((q) => q.caseStudy === c.id).map(cand) })),
    series: bank.series.map((s) => ({ id: s.id, questions: bank.questions.filter((q) => q.series === s.id).sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0)).map(cand) })),
  };
  const blueprint = {
    minQuestions: bp.questionCount.min, maxQuestions: bp.questionCount.max, typeMix: bp.typeMix, difficultyMix: bp.difficultyMix,
    structure: bp.structure as BlueprintStructure,
    domains: content.blueprint.domains.map((d) => ({ code: d.code, weightMin: d.weight.min, weightMax: d.weight.max })),
  };
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  const history = { seenAt: new Map<string, number>(), missed: new Set<string>() };
  const summary: SimulationSummary = { code: content.blueprint.certification.code, exams: n, questions: 0, bank: bank.questions.length, reused: 0, shortfall: 0, outOfRange: [], lines: [] };
  for (let i = 0; i < n; i++) {
    const exam = assembleExam({ blueprint, bank: assemblyBank, history, seed: `sim-${i}` });
    const ids = exam.sections.flatMap((s) => s.questionIds);
    const shares = blueprint.domains.map((d) => {
      const share = ids.filter((id) => byId.get(id)!.domain === d.code).length / ids.length;
      // One question of tolerance: a share is a whole number of questions.
      const slack = 1 / ids.length;
      if (share < d.weightMin - slack || share > d.weightMax + slack) {
        summary.outOfRange.push(`exam ${i + 1}: ${d.code} ${Math.round(100 * share)}% (range ${Math.round(100 * d.weightMin)}–${Math.round(100 * d.weightMax)}%)`);
      }
      return `${d.code.slice(0, 4)} ${Math.round(100 * share)}%`;
    });
    summary.lines.push(`exam ${i + 1}: ${ids.length} q, reused ${exam.reused}, shortfall ${exam.shortfall}, sections ${exam.sections.map((s) => s.kind[0]).join("")} | ${shares.join(" ")}`);
    summary.questions += ids.length;
    summary.reused += exam.reused;
    summary.shortfall += exam.shortfall;
    for (const id of ids) history.seenAt.set(id, i);
  }
  summary.lines.push(`distinct questions seen: ${history.seenAt.size}/${bank.questions.length}`);
  return summary;
}

async function main() {
  const { dirs, rest } = await requireCertDirs(process.argv.slice(2), USAGE);
  const n = Number(rest[0] ?? 10);
  if (!Number.isInteger(n) || n < 1) throw new Error(USAGE);
  let failed = 0;
  // One certification after the other: the output stays grouped.
  for (const dir of dirs) {
    const s = await simulate(await loadCertification(dir), n); // NOSONAR: sequential on purpose (readable output)
    const ok = s.reused === 0 && s.shortfall === 0 && s.outOfRange.length === 0;
    if (!ok) failed += 1;
    if (dirs.length === 1) for (const line of s.lines) console.log(line);
    for (const line of s.outOfRange) console.log(`  ✘ ${line}`);
    console.log(`${ok ? "✔" : "✘"} ${s.code}: ${n} exams, ${s.questions} questions (${Math.round(s.questions / n)} per exam) from a bank of ${s.bank}, reused ${s.reused}, shortfall ${s.shortfall}, ${s.outOfRange.length} domain(s) out of range`);
  }
  process.exit(failed ? 1 : 0);
}

// Run only as a command (the function is reused by tests).
if (path.resolve(process.argv[1] ?? "") === path.resolve(import.meta.filename)) {
  try {
    await main();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
