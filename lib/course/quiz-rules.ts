/**
 * The rules of the end-of-chapter quizzes (docs/SPECS-QUIZ-CHAPITRE.md), in
 * one place. The values marked "§8" await the owner's decision: change them
 * here, nowhere else.
 */
export const QUIZ_RULES: Readonly<{
  length: number;
  easy: number;
  passTotal: number;
  passHard: number;
  xpPerChapter: number;
  freeChaptersOpen: boolean;
  similarityLimit: number;
  minutes: number;
}> = {
  /** Questions per quiz. */
  length: 10,
  /** Positions 1..easy: consolidation; easy+1..length: exam level. */
  easy: 5,
  /** §8: questions passed (all their points) to master the chapter… */
  passTotal: 8,
  /** §8: …of which at least this many at exam level. */
  passHard: 4,
  /** §8: progression XP for a chapter mastered, given once per chapter (0: none). */
  xpPerChapter: 25,
  /** §8: the quiz of a free chapter is open at the free level (false: full access only). */
  freeChaptersOpen: true,
  /** Validation: Jaccard similarity of the English stem's word 4-grams with any exam question, refused from this value. */
  similarityLimit: 0.35,
  /** Shown on the chapter page. */
  minutes: 15,
};

/** Whether a position (1-based) is at exam level. */
export const isHardPosition = (position: number): boolean => position > QUIZ_RULES.easy;

export interface QuizScore {
  /** Questions passed, out of QUIZ_RULES.length. */
  score: number;
  /** Of which at exam level, out of length − easy. */
  hardScore: number;
  passed: boolean;
}

/** The score of a quiz from the positions (1-based) of the questions passed. */
export function quizScore(passedPositions: Iterable<number>): QuizScore {
  let score = 0;
  let hardScore = 0;
  for (const p of new Set(passedPositions)) {
    if (p < 1 || p > QUIZ_RULES.length) continue;
    score += 1;
    if (isHardPosition(p)) hardScore += 1;
  }
  return { score, hardScore, passed: score >= QUIZ_RULES.passTotal && hardScore >= QUIZ_RULES.passHard };
}

/** Of two results, the better one: more questions passed, then more at exam level, then the earlier. */
export function betterQuizResult<T extends { score: number; hardScore: number; completedAt: Date }>(a: T | null, b: T): T {
  if (!a) return b;
  if (b.score !== a.score) return b.score > a.score ? b : a;
  if (b.hardScore !== a.hardScore) return b.hardScore > a.hardScore ? b : a;
  return b.completedAt < a.completedAt ? b : a;
}
