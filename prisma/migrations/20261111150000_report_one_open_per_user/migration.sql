-- At most one open report per user and question (Prisma cannot express a
-- partial unique index in schema.prisma; lib/exam/results.ts relies on it).
-- Existing duplicates are closed (rejected) first, keeping the most recent open report.
UPDATE "question_report" r SET "status" = 'rejected'
WHERE r."status" = 'open' AND EXISTS (
  SELECT 1 FROM "question_report" o
  WHERE o."questionId" = r."questionId" AND o."userId" = r."userId" AND o."status" = 'open'
    AND (o."createdAt", o."id") > (r."createdAt", r."id")
);

CREATE UNIQUE INDEX "question_report_one_open_per_user" ON "question_report" ("questionId", "userId") WHERE "status" = 'open';
