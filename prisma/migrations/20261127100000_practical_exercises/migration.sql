-- Practical exercises (docs/SPECS-KUBERNETES-PRATIQUE.md): two question types,
-- the exam format of a certification, and the result of each check of an answer.
ALTER TYPE "QuestionType" ADD VALUE 'command';
ALTER TYPE "QuestionType" ADD VALUE 'manifest';

ALTER TABLE "certification" ADD COLUMN "format" TEXT NOT NULL DEFAULT 'multiple-choice';

ALTER TABLE "attempt_item" ADD COLUMN "grading" JSONB;
