/**
 * Simulates N successive exams of one candidate on the current bank (all
 * statuses) with the real assembler, to check how many exams the bank can
 * supply without repeating a question.
 *   npx tsx tools/questions/simulate.ts [count=10]
 */
import path from "node:path";
import { loadCertification } from "../../lib/content/loader";
import { loadBank } from "../../lib/content/bank";
import { assembleExam, type CandidateQuestion } from "../../lib/exam/assembler";
import type { BlueprintStructure } from "../../lib/content/schema";

async function main() {
  const n = Number(process.argv[2] ?? 10);
  const content = await loadCertification(path.resolve("content/az-104"));
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
  for (let i = 0; i < n; i++) {
    const exam = assembleExam({ blueprint, bank: assemblyBank, history, seed: `sim-${i}` });
    const ids = exam.sections.flatMap((s) => s.questionIds);
    const shares = blueprint.domains.map((d) => `${d.code.slice(0, 4)} ${Math.round((100 * ids.filter((id) => byId.get(id)!.domain === d.code).length) / ids.length)}%`);
    console.log(`exam ${i + 1}: ${ids.length} q, reused ${exam.reused}, shortfall ${exam.shortfall}, sections ${exam.sections.map((s) => s.kind[0]).join("")} | ${shares.join(" ")}`);
    for (const id of ids) history.seenAt.set(id, i);
  }
  console.log(`distinct questions seen: ${history.seenAt.size}/${bank.questions.length}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
