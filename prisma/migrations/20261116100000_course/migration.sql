-- Course (docs/SPECS-COURS.md §5): modules, chapters and sections loaded from
-- content/<certification>/course/ by the seed, and the sections each user has read.

-- CreateTable
CREATE TABLE "course_module" (
    "id" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" JSONB NOT NULL,

    CONSTRAINT "course_module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_chapter" (
    "id" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "minutes" INTEGER NOT NULL,
    "references" JSONB NOT NULL DEFAULT '[]',
    "free" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "contentHash" TEXT NOT NULL,
    "contentUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_section" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" JSONB NOT NULL,
    "body" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "contentUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_progress" (
    "userId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_progress_pkey" PRIMARY KEY ("userId","sectionId")
);

-- CreateTable
CREATE TABLE "_course_section_objective" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_course_section_objective_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_module_certificationId_code_key" ON "course_module"("certificationId", "code");

-- CreateIndex
CREATE INDEX "course_chapter_moduleId_idx" ON "course_chapter"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "course_chapter_certificationId_code_key" ON "course_chapter"("certificationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "course_section_chapterId_code_key" ON "course_section"("chapterId", "code");

-- CreateIndex
CREATE INDEX "course_progress_sectionId_idx" ON "course_progress"("sectionId");

-- CreateIndex
CREATE INDEX "_course_section_objective_B_index" ON "_course_section_objective"("B");

-- AddForeignKey
ALTER TABLE "course_module" ADD CONSTRAINT "course_module_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "certification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_chapter" ADD CONSTRAINT "course_chapter_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "certification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_chapter" ADD CONSTRAINT "course_chapter_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "course_module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_section" ADD CONSTRAINT "course_section_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "course_chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "course_section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_course_section_objective" ADD CONSTRAINT "_course_section_objective_A_fkey" FOREIGN KEY ("A") REFERENCES "course_section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_course_section_objective" ADD CONSTRAINT "_course_section_objective_B_fkey" FOREIGN KEY ("B") REFERENCES "objective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

