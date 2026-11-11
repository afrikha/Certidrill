/**
 * Exam assembly (spec §7) — a pure, deterministic function.
 *
 * Given the blueprint, the published bank and the candidate's history, it
 * draws an exam:
 *   1. total number of questions in the blueprint range;
 *   2. case studies and the Yes/No series (sections), then independent
 *      questions for the main section;
 *   3. per-domain counts drawn inside each weight range;
 *   4. type and difficulty mix targets, at most N questions per objective;
 *   5. questions already seen are excluded; when the bank runs out, the
 *      oldest and the missed ones come back first.
 * The same input and seed always produce the same exam.
 */
import type { BlueprintStructure, QuestionTypeCode } from "@/lib/content/schema";
import { shuffleArray } from "@/lib/questions/order";
import { compareCodeUnits } from "@/lib/sort";
import { createRng, randInt } from "./random";

export interface CandidateQuestion {
  id: string;
  domain: string;
  objective: string;
  type: QuestionTypeCode;
  difficulty: 1 | 2 | 3;
}

export interface AssemblyBlueprint {
  minQuestions: number;
  maxQuestions: number;
  typeMix: Partial<Record<QuestionTypeCode, { min: number; max: number }>>;
  difficultyMix: { easy: number; medium: number; hard: number };
  structure: BlueprintStructure;
  domains: { code: string; weightMin: number; weightMax: number }[];
}

export interface AssemblyBank {
  /** Published independent questions (no case study, no series). */
  questions: CandidateQuestion[];
  caseStudies: { id: string; questions: CandidateQuestion[] }[];
  /** Questions of a series, in their series order. */
  series: { id: string; questions: CandidateQuestion[] }[];
}

export interface AssemblyHistory {
  /** questionId → when the candidate last saw it (epoch ms). */
  seenAt: Map<string, number>;
  /** Questions the candidate answered wrongly the last time. */
  missed: Set<string>;
}

export type AssembledSection =
  | { kind: "case_study"; caseStudyId: string; questionIds: string[] }
  | { kind: "series"; seriesId: string; questionIds: string[] }
  | { kind: "main"; questionIds: string[] };

export interface AssembledExam {
  seed: string;
  /** Number of questions drawn for this exam. */
  targetTotal: number;
  sections: AssembledSection[];
  /** Questions that could not be filled because the bank is too small. */
  shortfall: number;
  /** Number of already-seen questions that had to be reused. */
  reused: number;
}

const DIFFICULTY_KEYS = { 1: "easy", 2: "medium", 3: "hard" } as const;

/** Priority for the candidate: 0 = never seen; seen ones from 1 (oldest, missed) to 2.5 (most recent). Lower comes first. */
function freshness(ids: string[], history: AssemblyHistory, recencyRank: Map<string, number>): number {
  let worst = 0;
  for (const id of ids) {
    if (!history.seenAt.has(id)) continue;
    const rank = recencyRank.get(id) ?? 0; // 0 = oldest … 1 = newest
    worst = Math.max(worst, 1 + rank - (history.missed.has(id) ? 0.5 : 0) + 0.5);
  }
  return worst;
}

/** Integer per-domain counts drawn inside each [min, max] weight range, summing to total. */
export function drawDomainCounts(domains: AssemblyBlueprint["domains"], total: number, random: () => number): Map<string, number> {
  const lo = domains.map((d) => Math.ceil(d.weightMin * total - 1e-9));
  const hi = domains.map((d, i) => Math.max(lo[i]!, Math.floor(d.weightMax * total + 1e-9)));
  const counts = [...lo];
  let sum = counts.reduce((a, b) => a + b, 0);
  // Too many from rounding up the minimums: remove from the domains with the most slack.
  while (sum > total) {
    const i = counts.reduce((best, c, j) => (c - domains[j]!.weightMin * total > counts[best]! - domains[best]!.weightMin * total ? j : best), 0);
    counts[i]! -= 1;
    sum -= 1;
  }
  while (sum < total) {
    const open = counts.map((c, i) => i).filter((i) => counts[i]! < hi[i]!);
    const pool = open.length ? open : counts.map((_, i) => i);
    const weights = pool.map((i) => Math.max(1e-6, (hi[i] ?? 0) - counts[i]! + (open.length ? 0 : 1)));
    let r = random() * weights.reduce((a, b) => a + b, 0);
    let chosen = pool.at(-1)!;
    for (let k = 0; k < pool.length; k++) {
      r -= weights[k]!;
      if (r < 0) {
        chosen = pool[k]!;
        break;
      }
    }
    counts[chosen]! += 1;
    sum += 1;
  }
  return new Map(domains.map((d, i) => [d.code, counts[i]!]));
}

type Freshness = (ids: string[]) => number;

/**
 * Picks `n` groups (case studies, series) preferring fresh ones, random among
 * equals. When fewer fresh groups remain than drawn, takes fewer groups —
 * but never fewer than the blueprint minimum — rather than repeat one.
 */
function pickGroups<G extends { questions: CandidateQuestion[] }>(groups: G[], drawn: number, min: number, fresh: Freshness, random: () => number): G[] {
  const freshCount = groups.filter((g) => fresh(g.questions.map((q) => q.id)) === 0).length;
  const n = freshCount >= drawn ? drawn : Math.min(drawn, Math.max(min, freshCount));
  return groups
    .map((g) => ({ g, f: fresh(g.questions.map((q) => q.id)), r: random() }))
    .sort((a, b) => a.f - b.f || a.r - b.r)
    .slice(0, n)
    .map((x) => x.g);
}

/** Running counts of the drawn questions, against the exam targets. */
interface Tally {
  domainNeed: Map<string, number>;
  typeTarget: Map<string, { min: number; max: number }>;
  typeCount: Map<string, number>;
  diffTarget: Map<string, number>;
  diffCount: Map<string, number>;
  objectiveCount: Map<string, number>;
}

function increment(m: Map<string, number>, k: string): void {
  m.set(k, (m.get(k) ?? 0) + 1);
}

function record(t: Tally, q: CandidateQuestion): void {
  t.domainNeed.set(q.domain, (t.domainNeed.get(q.domain) ?? 0) - 1);
  increment(t.typeCount, q.type);
  increment(t.diffCount, DIFFICULTY_KEYS[q.difficulty]);
  increment(t.objectiveCount, q.objective);
}

/** Cost of adding `q` to the main section (lower is better), before the random tie-break. */
function candidateScore(q: CandidateQuestion, domain: string | undefined, t: Tally, maxPerObjective: number, fresh: Freshness): number {
  let score = fresh([q.id]) * 1000; // unseen first, then oldest / missed
  if (domain !== undefined && q.domain !== domain) score += 500;
  if ((t.objectiveCount.get(q.objective) ?? 0) >= maxPerObjective) score += 300;
  const target = t.typeTarget.get(q.type);
  const typeCount = t.typeCount.get(q.type) ?? 0;
  if (!target) score += 100; // type not expected among independent questions
  else if (typeCount >= target.max) score += 100;
  else if (typeCount < target.min) score -= 20 * (target.min - typeCount);
  const dk = DIFFICULTY_KEYS[q.difficulty];
  score -= 10 * ((t.diffTarget.get(dk) ?? 0) - (t.diffCount.get(dk) ?? 0));
  return score;
}

/** Main section: greedy, one question at a time, from `pool` (consumed). */
function fillMainSection(pool: CandidateQuestion[], budget: number, t: Tally, maxPerObjective: number, fresh: Freshness, random: () => number): CandidateQuestion[] {
  const main: CandidateQuestion[] = [];
  while (main.length < budget && pool.length > 0) {
    // Domain with the largest remaining need (ties broken randomly); domains
    // without any remaining question in the pool are skipped.
    const available = new Set(pool.map((q) => q.domain));
    const needs = [...t.domainNeed].filter(([d]) => available.has(d)).map(([d, n]) => ({ d, n, r: random() }));
    needs.sort((a, b) => b.n - a.n || a.r - b.r);
    const domain = needs[0]?.d;

    let best = { index: 0, score: Infinity };
    pool.forEach((q, index) => {
      const score = candidateScore(q, domain, t, maxPerObjective, fresh) + random(); // random tie-break
      if (score < best.score) best = { index, score };
    });
    const [q] = pool.splice(best.index, 1);
    main.push(q!);
    record(t, q!);
  }
  return main;
}

function casePlacement(placement: "start" | "end" | "random", random: () => number): "start" | "end" {
  if (placement !== "random") return placement;
  return random() < 0.5 ? "start" : "end";
}

export function assembleExam(input: {
  blueprint: AssemblyBlueprint;
  bank: AssemblyBank;
  history: AssemblyHistory;
  seed: string;
}): AssembledExam {
  const { blueprint, history, seed } = input;
  const random = createRng(seed);
  const s = blueprint.structure;

  // Deterministic input order, whatever the database returned.
  const byId = (a: { id: string }, b: { id: string }) => compareCodeUnits(a.id, b.id);
  const questions = [...input.bank.questions].sort(byId);
  const caseStudies = [...input.bank.caseStudies].sort(byId).filter((c) => c.questions.length > 0);
  const series = [...input.bank.series].sort(byId).filter((x) => x.questions.length > 0);

  const seenSorted = [...history.seenAt].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
  const recencyRank = new Map(seenSorted.map(([id], i) => [id, seenSorted.length > 1 ? i / (seenSorted.length - 1) : 0]));
  const fresh: Freshness = (ids) => freshness(ids, history, recencyRank);

  const total = randInt(random, blueprint.minQuestions, blueprint.maxQuestions);
  const chosen: CandidateQuestion[] = [];
  const sections: AssembledSection[] = [];
  const caseSections: AssembledSection[] = [];

  // --- case studies
  const csCount = Math.min(randInt(random, s.caseStudies.count.min, s.caseStudies.count.max), caseStudies.length);
  let budget = total;
  for (const cs of pickGroups(caseStudies, csCount, s.caseStudies.count.min, fresh, random)) {
    const want = Math.min(randInt(random, s.caseStudies.questionsEach.min, s.caseStudies.questionsEach.max), cs.questions.length, budget);
    if (want <= 0) break;
    const picked = new Set(
      cs.questions
        .map((q) => ({ q, f: fresh([q.id]), r: random() }))
        .sort((a, b) => a.f - b.f || a.r - b.r)
        .slice(0, want)
        .map((x) => x.q),
    );
    // Keep the authoring order inside a case study.
    const ordered = cs.questions.filter((q) => picked.has(q));
    chosen.push(...ordered);
    budget -= ordered.length;
    caseSections.push({ kind: "case_study", caseStudyId: cs.id, questionIds: ordered.map((q) => q.id) });
  }

  // --- Yes/No series
  // A blueprint may ask for several series (structure.series.count.max > 1):
  // every drawn series gets its own section.
  const seriesSections: AssembledSection[] = [];
  const seriesCount = Math.min(randInt(random, s.series.count.min, s.series.count.max), series.length);
  for (const sr of pickGroups(series, seriesCount, s.series.count.min, fresh, random)) {
    const want = Math.min(randInt(random, s.series.questionsEach.min, s.series.questionsEach.max), sr.questions.length, budget);
    if (want <= 0) break;
    const kept = sr.questions.slice(0, want);
    chosen.push(...kept);
    budget -= kept.length;
    seriesSections.push({ kind: "series", seriesId: sr.id, questionIds: kept.map((q) => q.id) });
  }

  // --- targets for the whole exam
  const tally: Tally = {
    domainNeed: new Map(drawDomainCounts(blueprint.domains, total, random)),
    typeTarget: new Map(Object.entries(blueprint.typeMix).map(([type, r]) => [type, { min: Math.floor(r!.min * total), max: Math.ceil(r!.max * total) }])),
    typeCount: new Map(),
    diffTarget: new Map(Object.entries(blueprint.difficultyMix).map(([k, v]) => [k, v * total])),
    diffCount: new Map(),
    objectiveCount: new Map(),
  };
  for (const q of chosen) record(tally, q);

  // --- main section
  const used = new Set(chosen.map((q) => q.id));
  const pool = questions.filter((q) => !used.has(q.id));
  const main = fillMainSection(pool, budget, tally, s.maxPerObjective, fresh, random);
  const reused = [...chosen, ...main].filter((q) => history.seenAt.has(q.id)).length;

  // --- section order: case studies at the start or the end, series before the main section
  const placement = casePlacement(s.caseStudies.placement, random);
  const mainSection: AssembledSection = { kind: "main", questionIds: shuffleArray(main, random).map((q) => q.id) };
  if (placement === "start") sections.push(...caseSections);
  sections.push(...seriesSections);
  if (mainSection.questionIds.length) sections.push(mainSection);
  if (placement === "end") sections.push(...caseSections);

  const drawn = sections.reduce((n, sec) => n + sec.questionIds.length, 0);
  return { seed, targetTotal: total, sections, shortfall: total - drawn, reused };
}
