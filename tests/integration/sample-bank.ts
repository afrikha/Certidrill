import type { PrismaClient } from "@prisma/client";

/**
 * Integration tests run on a small, stable bank: the 28 original sample
 * questions (with the Northwind case study and the Auditors series). The real
 * question bank grows over time, so every other question is kept in draft.
 */
const SAMPLE_QUESTION = /^(stor|id|comp|net|mon|series-auditors|cs-nw)-/;

export async function publishSampleBank(db: PrismaClient) {
  await db.question.updateMany({ data: { status: "draft" } });
  await db.caseStudy.updateMany({ data: { status: "draft" } });
  await db.questionSeries.updateMany({ data: { status: "draft" } });
  const ids = (await db.question.findMany({ select: { id: true } })).map((q) => q.id).filter((id) => SAMPLE_QUESTION.test(id));
  await db.question.updateMany({ where: { id: { in: ids } }, data: { status: "published" } });
  await db.caseStudy.updateMany({ where: { id: "cs-northwind-clinics" }, data: { status: "published" } });
  await db.questionSeries.updateMany({ where: { id: "series-auditors-read" }, data: { status: "published" } });
  return ids.length;
}
