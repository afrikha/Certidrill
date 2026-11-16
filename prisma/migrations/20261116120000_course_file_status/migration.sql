-- The status course.yaml gave at the last seed (lot D: status set in the back-office).
ALTER TABLE "course_chapter" ADD COLUMN "fileStatus" "ContentStatus" NOT NULL DEFAULT 'draft';

-- Until now, the status always came from the file.
UPDATE "course_chapter" SET "fileStatus" = "status";
