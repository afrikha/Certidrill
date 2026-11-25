-- End-of-chapter quizzes (docs/SPECS-QUIZ-CHAPITRE.md §4.1).
-- CreateEnum
CREATE TYPE "QuestionUsage" AS ENUM ('exam', 'quiz');

-- AlterTable
ALTER TABLE "question" ADD COLUMN     "chapterId" TEXT,
ADD COLUMN     "quizPosition" INTEGER,
ADD COLUMN     "usage" "QuestionUsage" NOT NULL DEFAULT 'exam';

-- CreateTable
CREATE TABLE "quiz_attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "optionOrder" JSONB NOT NULL,
    "responses" JSONB NOT NULL DEFAULT '{}',
    "results" JSONB NOT NULL DEFAULT '{}',
    "score" INTEGER,
    "hardScore" INTEGER,
    "passed" BOOLEAN,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "quiz_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quiz_attempt_userId_chapterId_idx" ON "quiz_attempt"("userId", "chapterId");

-- CreateIndex
CREATE INDEX "quiz_attempt_chapterId_idx" ON "quiz_attempt"("chapterId");

-- CreateIndex
CREATE INDEX "question_certificationId_usage_status_idx" ON "question"("certificationId", "usage", "status");

-- CreateIndex
CREATE UNIQUE INDEX "question_chapterId_quizPosition_key" ON "question"("chapterId", "quizPosition");

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "course_chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "course_chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- An exam question is never bound to a chapter; a quiz position is 1..10.
ALTER TABLE "question" ADD CONSTRAINT "question_quiz_fields_check"
  CHECK (("usage" = 'quiz' OR ("chapterId" IS NULL AND "quizPosition" IS NULL)) AND ("quizPosition" IS NULL OR "quizPosition" BETWEEN 1 AND 10));
