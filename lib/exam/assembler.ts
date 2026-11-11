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
    let chosen = pool[pool.length - 1]!;
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
  const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const questions = [...input.bank.questions].sort(byId);
  const caseStudies = [...input.bank.caseStudies].sort(byId).filter((c) => c.questions.length > 0);
  const series = [...input.bank.series].sort(byId).filter((x) => x.questions.length > 0);

  const seenSorted = [...history.seenAt].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
  const recencyRank = new Map(seenSorted.map(([id], i) => [id, seenSorted.length > 1 ? i / (seenSorted.length - 1) : 0]));
  const fresh = (ids: string[]) => freshness(ids, history, recencyRank);

  const total = randInt(random, blueprint.minQuestions, blueprint.maxQuestions);
  const chosen: CandidateQuestion[] = [];
  const sections: AssembledSection[] = [];
  const caseSections: AssembledSection[] = [];

  /**
   * Picks `n` groups (case studies, series) preferring fresh ones, random among
   * equals. When fewer fresh groups remain than drawn, takes fewer groups —
   * but never fewer than the blueprint minimum — rather than repeat one.
   */
  const pickGroups = <G extends { questions: CandidateQuestion[] }>(groups: G[], drawn: number, min: number): G[] => {
    const freshCount = groups.filter((g) => fresh(g.questions.map((q) => q.id)) === 0).length;
    const n = freshCount >= drawn ? drawn : Math.min(drawn, Math.max(min, freshCount));
    return groups
      .map((g) => ({ g, f: fresh(g.questions.map((q) => q.id)), r: random() }))
      .sort((a, b) => a.f - b.f || a.r - b.r)
      .slice(0, n)
      .map((x) => x.g);
  };

  // --- case studies
  const csCount = Math.min(randInt(random, s.caseStudies.count.min, s.caseStudies.count.max), caseStudies.length);
  let budget = total;
  for (const cs of pickGroups(caseStudies, csCount, s.caseStudies.count.min)) {
    const want = Math.min(randInt(random, s.caseStudies.questionsEach.min, s.caseStudies.questionsEach.max), cs.questions.length, budget);
    if (want <= 0) break;
    const picked = cs.questions
      .map((q) => ({ q, f: fresh([q.id]), r: random() }))
      .sort((a, b) => a.f - b.f || a.r - b.r)
      .slice(0, want)
      .map((x) => x.q);
    // Keep the authoring order inside a case study.
    const ordered = cs.questions.filter((q) => picked.includes(q));
    chosen.push(...ordered);
    budget -= ordered.length;
    caseSections.push({ kind: "case_study", caseStudyId: cs.id, questionIds: ordered.map((q) => q.id) });
  }

  // --- Yes/No series
  // A blueprint may ask for several series (structure.series.count.max > 1):
  // every drawn series gets its own section.
  const seriesSections: AssembledSection[] = [];
  const seriesCount = Math.min(randInt(random, s.series.count.min, s.series.count.max), series.length);
  for (const sr of pickGroups(series, seriesCount, s.series.count.min)) {
    const want = Math.min(randInt(random, s.series.questionsEach.min, s.series.questionsEach.max), sr.questions.length, budget);
    if (want <= 0) break;
    const kept = sr.questions.slice(0, want);
    chosen.push(...kept);
    budget -= kept.length;
    seriesSections.push({ kind: "series", seriesId: sr.id, questionIds: kept.map((q) => q.id) });
  }

  // --- targets for the whole exam
  const domainTargets = drawDomainCounts(blueprint.domains, total, random);
  const domainNeed = new Map(domainTargets);
  for (const q of chosen) domainNeed.set(q.domain, (domainNeed.get(q.domain) ?? 0) - 1);

  const typeTarget = new Map<string, { min: number; max: number }>();
  for (const [type, r] of Object.entries(blueprint.typeMix)) {
    typeTarget.set(type, { min: Math.floor(r!.min * total), max: Math.ceil(r!.max * total) });
  }
  const typeCount = new Map<string, number>();
  const diffTarget = new Map(Object.entries(blueprint.difficultyMix).map(([k, v]) => [k, v * total]));
  const diffCount = new Map<string, number>();
  const objectiveCount = new Map<string, number>();
  const count = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const q of chosen) {
    count(typeCount, q.type);
    count(diffCount, DIFFICULTY_KEYS[q.difficulty]);
    count(objectiveCount, q.objective);
  }

  // --- main section: greedy, one question at a time
  const used = new Set(chosen.map((q) => q.id));
  const pool = questions.filter((q) => !used.has(q.id));
  const main: CandidateQuestion[] = [];
  let reused = chosen.filter((q) => history.seenAt.has(q.id)).length;

  while (main.length < budget && pool.length > 0) {
    // Domain with the largest remaining need (ties broken randomly); domains
    // without any remaining question in the pool are skipped.
    const available = new Set(pool.map((q) => q.domain));
    const needs = [...domainNeed].filter(([d]) => available.has(d)).map(([d, n]) => ({ d, n, r: random() }));
    needs.sort((a, b) => b.n - a.n || a.r - b.r);
    const domain = needs[0]?.d;

    let best: { q: CandidateQuestion; score: number; index: number } | undefined;
    for (let i = 0; i < pool.length; i++) {
      const q = pool[i]!;
      let score = fresh([q.id]) * 1000; // unseen first, then oldest / missed
      if (domain !== undefined && q.domain !== domain) score += 500;
      if ((objectiveCount.get(q.objective) ?? 0) >= s.maxPerObjective) score += 300;
      const t = typeTarget.get(q.type);
      const tc = typeCount.get(q.type) ?? 0;
      if (t) {
        if (tc >= t.max) score += 100;
        else if (tc < t.min) score -= 20 * (t.min - tc);
      } else {
        score += 100; // type not expected among independent questions
      }
      const dk = DIFFICULTY_KEYS[q.difficulty];
      score -= 10 * ((diffTarget.get(dk) ?? 0) - (diffCount.get(dk) ?? 0));
      score += random(); // random tie-break
      if (!best || score < best.score) best = { q, score, index: i };
    }
    const q = best!.q;
    pool.splice(best!.index, 1);
    main.push(q);
    if (history.seenAt.has(q.id)) reused += 1;
    domainNeed.set(q.domain, (domainNeed.get(q.domain) ?? 0) - 1);
    count(typeCount, q.type);
    count(diffCount, DIFFICULTY_KEYS[q.difficulty]);
    count(objectiveCount, q.objective);
  }

  // --- section order: case studies at the start or the end, series before the main section
  const placement = s.caseStudies.placement === "random" ? (random() < 0.5 ? "start" : "end") : s.caseStudies.placement;
  const mainSection: AssembledSection = { kind: "main", questionIds: shuffleArray(main, random).map((q) => q.id) };
  if (placement === "start") sections.push(...caseSections);
  sections.push(...seriesSections);
  if (mainSection.questionIds.length) sections.push(mainSection);
  if (placement === "end") sections.push(...caseSections);

  const drawn = sections.reduce((n, sec) => n + sec.questionIds.length, 0);
  return { seed, targetTotal: total, sections, shortfall: total - drawn, reused };
}
