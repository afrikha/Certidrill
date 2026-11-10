-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'needs_review', 'reviewed', 'published', 'retired');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('single', 'multi', 'yesno_statements', 'dropdown', 'dragdrop', 'ordering', 'hotarea', 'series_yesno');

-- CreateEnum
CREATE TYPE "AttemptMode" AS ENUM ('exam', 'practice');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('in_progress', 'submitted', 'expired');

-- CreateEnum
CREATE TYPE "SectionKind" AS ENUM ('case_study', 'series', 'main');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('open', 'accepted', 'rejected');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "passwordHash" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "role" "Role" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "auth_session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "auth_verification_token" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_verification_token_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "certification" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blueprint" (
    "id" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "minQuestions" INTEGER NOT NULL,
    "maxQuestions" INTEGER NOT NULL,
    "passScore" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 1000,
    "typeMix" JSONB NOT NULL,
    "difficultyMix" JSONB NOT NULL,
    "structure" JSONB NOT NULL,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" JSONB NOT NULL,
    "weightMin" DOUBLE PRECISION NOT NULL,
    "weightMax" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objective" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "group" JSONB NOT NULL,
    "title" JSONB NOT NULL,
    "learnUrl" TEXT,

    CONSTRAINT "objective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_study" (
    "id" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "tabs" JSONB NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "case_study_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_series" (
    "id" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "stem" JSONB NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "question_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question" (
    "id" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "stem" JSONB NOT NULL,
    "exhibits" JSONB NOT NULL DEFAULT '[]',
    "body" JSONB NOT NULL,
    "answer" JSONB NOT NULL,
    "explanation" JSONB NOT NULL,
    "references" JSONB NOT NULL DEFAULT '[]',
    "caseStudyId" TEXT,
    "seriesId" TEXT,
    "seriesOrder" INTEGER,
    "shuffle" BOOLEAN NOT NULL DEFAULT true,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "blueprintVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "mode" "AttemptMode" NOT NULL DEFAULT 'exam',
    "locale" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "status" "AttemptStatus" NOT NULL DEFAULT 'in_progress',
    "scaledScore" INTEGER,
    "passed" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_section" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" "SectionKind" NOT NULL,
    "caseStudyId" TEXT,
    "seriesId" TEXT,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "attempt_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_item" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "optionOrder" JSONB NOT NULL DEFAULT '{}',
    "response" JSONB,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "answeredAt" TIMESTAMP(3),
    "pointsEarned" DOUBLE PRECISION,
    "pointsMax" DOUBLE PRECISION,

    CONSTRAINT "attempt_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_report" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "comment" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_session_sessionToken_key" ON "auth_session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "certification_code_key" ON "certification"("code");

-- CreateIndex
CREATE UNIQUE INDEX "blueprint_certificationId_version_key" ON "blueprint"("certificationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "domain_blueprintId_code_key" ON "domain"("blueprintId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "objective_domainId_code_key" ON "objective"("domainId", "code");

-- CreateIndex
CREATE INDEX "question_certificationId_status_idx" ON "question"("certificationId", "status");

-- CreateIndex
CREATE INDEX "question_objectiveId_idx" ON "question"("objectiveId");

-- CreateIndex
CREATE INDEX "attempt_userId_certificationId_status_idx" ON "attempt"("userId", "certificationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_section_attemptId_order_key" ON "attempt_section"("attemptId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_item_attemptId_questionId_key" ON "attempt_item"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_item_attemptId_order_key" ON "attempt_item"("attemptId", "order");

-- CreateIndex
CREATE INDEX "question_report_questionId_status_idx" ON "question_report"("questionId", "status");

-- AddForeignKey
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blueprint" ADD CONSTRAINT "blueprint_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "certification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain" ADD CONSTRAINT "domain_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "blueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective" ADD CONSTRAINT "objective_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_study" ADD CONSTRAINT "case_study_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "certification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_series" ADD CONSTRAINT "question_series_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "certification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "certification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "objective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_caseStudyId_fkey" FOREIGN KEY ("caseStudyId") REFERENCES "case_study"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "question_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt" ADD CONSTRAINT "attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt" ADD CONSTRAINT "attempt_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "certification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt" ADD CONSTRAINT "attempt_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "blueprint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_section" ADD CONSTRAINT "attempt_section_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_section" ADD CONSTRAINT "attempt_section_caseStudyId_fkey" FOREIGN KEY ("caseStudyId") REFERENCES "case_study"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_section" ADD CONSTRAINT "attempt_section_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "question_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_item" ADD CONSTRAINT "attempt_item_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_item" ADD CONSTRAINT "attempt_item_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "attempt_section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_item" ADD CONSTRAINT "attempt_item_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_report" ADD CONSTRAINT "question_report_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_report" ADD CONSTRAINT "question_report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Spec §8: a single in_progress attempt per user and per certification.
CREATE UNIQUE INDEX "attempt_one_in_progress" ON "attempt"("userId", "certificationId") WHERE "status" = 'in_progress';

-- Difficulty is 1..3.
ALTER TABLE "question" ADD CONSTRAINT "question_difficulty_check" CHECK ("difficulty" BETWEEN 1 AND 3);
