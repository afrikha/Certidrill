/**
 * Where a question is used: the exam bank (mock exams and training) or a
 * chapter quiz. Quiz questions share the `question` table to reuse rendering,
 * scoring, reports and publication, but must NEVER reach an exam.
 *
 * Every query that selects or counts exam questions goes through `examBank`:
 * the assembler's bank (lib/exam/bank-query.ts), the bank counts of the
 * back-office (lib/content/publish.ts), the seed of the bank and the
 * questions page. The tools that read files (simulation, blind export,
 * content:check) only read `questions/`, `case-studies/` and `series/`, never
 * `quizzes/` (lib/content/bank.ts).
 */
import type { Prisma, QuestionUsage } from "@prisma/client";

export const EXAM_USAGE = "exam" as const satisfies QuestionUsage;
export const QUIZ_USAGE = "quiz" as const satisfies QuestionUsage;

/** `where` restricted to the exam bank (quiz questions excluded). */
export function examBank<W extends Prisma.QuestionWhereInput>(where: W): W & { usage: typeof EXAM_USAGE } {
  return { ...where, usage: EXAM_USAGE };
}

/** `where` restricted to chapter quiz questions. */
export function quizQuestions<W extends Prisma.QuestionWhereInput>(where: W): W & { usage: typeof QUIZ_USAGE } {
  return { ...where, usage: QUIZ_USAGE };
}

/** `where` restricted to one usage. */
export function withUsage<W extends Prisma.QuestionWhereInput>(usage: QuestionUsage, where: W): W & { usage: QuestionUsage } {
  return { ...where, usage };
}
