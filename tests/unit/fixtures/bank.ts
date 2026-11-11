import type { AssemblyBank, AssemblyBlueprint, CandidateQuestion } from "@/lib/exam/assembler";
import type { QuestionTypeCode } from "@/lib/content/schema";
import { createRng } from "@/lib/exam/random";

/** The AZ-104 blueprint values (content/az-104/blueprint.yaml). */
export const az104Blueprint: AssemblyBlueprint = {
  minQuestions: 45,
  maxQuestions: 58,
  typeMix: {
    single: { min: 0.35, max: 0.45 },
    multi: { min: 0.1, max: 0.15 },
    yesno_statements: { min: 0.1, max: 0.15 },
    dropdown: { min: 0.1, max: 0.15 },
    dragdrop: { min: 0.05, max: 0.1 },
    ordering: { min: 0.05, max: 0.1 },
    hotarea: { min: 0, max: 0.05 },
  },
  difficultyMix: { easy: 0.3, medium: 0.5, hard: 0.2 },
  structure: {
    caseStudies: { count: { min: 1, max: 2 }, questionsEach: { min: 4, max: 7 }, placement: "random" },
    series: { count: { min: 0, max: 1 }, questionsEach: { min: 3, max: 4 } },
    maxPerObjective: 2,
    warningsMin: [10, 5],
    readiness: { consecutive: 3, minScore: 800 },
  },
  domains: [
    { code: "identities", weightMin: 0.2, weightMax: 0.25 },
    { code: "storage", weightMin: 0.15, weightMax: 0.2 },
    { code: "compute", weightMin: 0.2, weightMax: 0.25 },
    { code: "networking", weightMin: 0.15, weightMax: 0.2 },
    { code: "monitoring", weightMin: 0.1, weightMax: 0.15 },
  ],
};

const TYPE_SHARES: [QuestionTypeCode, number][] = [
  ["single", 0.4], ["multi", 0.13], ["yesno_statements", 0.13], ["dropdown", 0.13], ["dragdrop", 0.08], ["ordering", 0.08], ["hotarea", 0.05],
];
const OBJECTIVES = { identities: 15, storage: 16, compute: 24, networking: 13, monitoring: 13 } as const;

/**
 * Synthetic bank sized like the spec target (§7): 400 independent questions
 * (identities 95, storage 75, compute 95, networking 75, monitoring 60),
 * 8 case studies and 8 series.
 */
export function makeBank(opts: { perDomain?: Record<string, number>; caseStudies?: number; series?: number; seed?: string } = {}): AssemblyBank {
  const perDomain = opts.perDomain ?? { identities: 95, storage: 75, compute: 95, networking: 75, monitoring: 60 };
  const random = createRng(opts.seed ?? "fixture");
  const pickType = () => {
    let r = random();
    for (const [t, share] of TYPE_SHARES) if ((r -= share) < 0) return t;
    return "single" as const;
  };
  const pickDifficulty = () => {
    const r = random();
    return (r < 0.3 ? 1 : r < 0.8 ? 2 : 3) as 1 | 2 | 3;
  };
  const domains = Object.keys(perDomain);
  const make = (id: string, domain: string, type: QuestionTypeCode = pickType()): CandidateQuestion => {
    const objCount = OBJECTIVES[domain as keyof typeof OBJECTIVES] ?? 10;
    const d = domains.indexOf(domain) + 1;
    return { id, domain, objective: `${d}.${1 + Math.floor(random() * objCount)}`, type, difficulty: pickDifficulty() };
  };

  const questions: CandidateQuestion[] = [];
  for (const [domain, n] of Object.entries(perDomain)) {
    for (let i = 0; i < n; i++) questions.push(make(`${domain}-${String(i).padStart(3, "0")}`, domain));
  }
  const caseStudies = Array.from({ length: opts.caseStudies ?? 8 }, (_, c) => ({
    id: `cs-${c}`,
    questions: Array.from({ length: 5 + (c % 3) }, (_, i) => make(`cs-${c}-q${i}`, domains[(c + i) % domains.length]!)),
  }));
  const series = Array.from({ length: opts.series ?? 8 }, (_, s) => ({
    id: `series-${s}`,
    questions: Array.from({ length: 4 }, (_, i) => make(`series-${s}-q${i}`, domains[s % domains.length]!, "series_yesno")),
  }));
  return { questions, caseStudies, series };
}

export function allQuestions(bank: AssemblyBank): Map<string, CandidateQuestion> {
  return new Map([...bank.questions, ...bank.caseStudies.flatMap((c) => c.questions), ...bank.series.flatMap((s) => s.questions)].map((q) => [q.id, q]));
}
