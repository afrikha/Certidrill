-- Activation and publication in the back-office: what the files said at the
-- last seed, so that a re-seed keeps a value set in the back-office while the
-- file does not change it (same rule as course_chapter."fileStatus").
ALTER TABLE "certification" ADD COLUMN "fileActive" BOOLEAN NOT NULL DEFAULT true;
UPDATE "certification" SET "fileActive" = "active";

ALTER TABLE "case_study" ADD COLUMN "fileStatus" "ContentStatus" NOT NULL DEFAULT 'draft';
UPDATE "case_study" SET "fileStatus" = "status";

ALTER TABLE "question_series" ADD COLUMN "fileStatus" "ContentStatus" NOT NULL DEFAULT 'draft';
UPDATE "question_series" SET "fileStatus" = "status";

-- A question sent back to review by user reports (needs_review) was kept so
-- by the seed only while its file said published.
ALTER TABLE "question" ADD COLUMN "fileStatus" "ContentStatus" NOT NULL DEFAULT 'draft';
UPDATE "question" SET "fileStatus" = CASE WHEN "status" = 'needs_review' THEN 'published'::"ContentStatus" ELSE "status" END;
