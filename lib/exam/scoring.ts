/**
 * Scoring rules (spec §5 "Notation") — pure functions.
 *
 * - single / series_yesno: 1 point if correct.
 * - multi "choose N": 1 point per correct option checked, 0 if more options
 *   are checked than requested.
 * - yesno_statements, dropdown, dragdrop, hotarea: 1 point per correct element.
 * - ordering: 1 point only if the sequence is exactly right.
 * - No negative points; no answer (or an invalid one) scores 0.
 * - Scaled score = round(maxScore × earned / possible); pass at passScore.
 */
import { maxPoints, parseResponse, type QuestionAnswer, type QuestionBody, type QuestionTypeCode } from "@/lib/questions/schema";

export interface ItemScore {
  earned: number;
  max: number;
}

export interface ScorableQuestion {
  type: QuestionTypeCode;
  body: unknown;
  answer: unknown;
}

export function scoreItem(question: ScorableQuestion, response: unknown): ItemScore {
  const max = maxPoints(question.type, question.body);
  if (response === null || response === undefined) return { earned: 0, max };
  const parsed = parseResponse(question.type, response);
  if (!parsed.success) return { earned: 0, max };
  return { earned: Math.min(max, earnedPoints(question, parsed.data)), max };
}

function countMatches(expected: Record<string, unknown>, given: Record<string, unknown>): number {
  return Object.entries(expected).filter(([k, v]) => given[k] === v).length;
}

function earnedPoints(q: ScorableQuestion, r: unknown): number {
  switch (q.type) {
    case "single":
      return (r as { optionId: string }).optionId === (q.answer as QuestionAnswer<"single">).optionId ? 1 : 0;
    case "multi": {
      const { choose } = q.body as QuestionBody<"multi">;
      const given = new Set((r as { optionIds: string[] }).optionIds);
      if (given.size > choose) return 0;
      return (q.answer as QuestionAnswer<"multi">).optionIds.filter((id) => given.has(id)).length;
    }
    case "yesno_statements":
    case "dropdown":
    case "hotarea":
      return countMatches((q.answer as { values: Record<string, unknown> }).values, (r as { values: Record<string, unknown> }).values);
    case "dragdrop":
      return countMatches((q.answer as QuestionAnswer<"dragdrop">).mapping, (r as { mapping: Record<string, unknown> }).mapping);
    case "ordering": {
      const expected = (q.answer as QuestionAnswer<"ordering">).sequence;
      const given = (r as { sequence: string[] }).sequence;
      return given.length === expected.length && given.every((id, i) => id === expected[i]) ? 1 : 0;
    }
    case "series_yesno":
      return (r as { value: boolean }).value === (q.answer as QuestionAnswer<"series_yesno">).value ? 1 : 0;
  }
}

export function scaledScore(earned: number, possible: number, maxScore: number): number {
  if (possible <= 0) return 0;
  return Math.round((maxScore * earned) / possible);
}

export interface ExamScore {
  earned: number;
  possible: number;
  scaledScore: number;
  passed: boolean;
}

export function scoreExam(items: ItemScore[], blueprint: { maxScore: number; passScore: number }): ExamScore {
  const earned = items.reduce((s, i) => s + i.earned, 0);
  const possible = items.reduce((s, i) => s + i.max, 0);
  const score = scaledScore(earned, possible, blueprint.maxScore);
  return { earned, possible, scaledScore: score, passed: score >= blueprint.passScore };
}

export interface Breakdown {
  key: string;
  earned: number;
  possible: number;
  /** Score on the blueprint scale (e.g. /1000), comparable to the pass mark. */
  scaledScore: number;
  questions: number;
}

/** Aggregates item scores by a key (domain, question type…), keeping first-seen key order. */
export function breakdownBy<T extends ItemScore>(items: T[], key: (item: T) => string, maxScore: number): Breakdown[] {
  const groups = new Map<string, { earned: number; possible: number; questions: number }>();
  for (const item of items) {
    const k = key(item);
    const g = groups.get(k) ?? { earned: 0, possible: 0, questions: 0 };
    g.earned += item.earned;
    g.possible += item.max;
    g.questions += 1;
    groups.set(k, g);
  }
  return [...groups].map(([k, g]) => ({ key: k, ...g, scaledScore: scaledScore(g.earned, g.possible, maxScore) }));
}
