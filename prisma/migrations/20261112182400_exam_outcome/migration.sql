-- CreateTable
CREATE TABLE "exam_outcome" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "takenOn" DATE NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "score" INTEGER,
    "readinessIndex" INTEGER,
    "readinessVerdict" TEXT,
    "mockExams" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_outcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_outcome_certificationId_idx" ON "exam_outcome"("certificationId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_outcome_userId_certificationId_takenOn_key" ON "exam_outcome"("userId", "certificationId", "takenOn");

-- AddForeignKey
ALTER TABLE "exam_outcome" ADD CONSTRAINT "exam_outcome_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_outcome" ADD CONSTRAINT "exam_outcome_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "certification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
