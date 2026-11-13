import type { PrismaClient } from "@prisma/client";
import { createAttempt, getAttemptView, lockSection, saveItem, startAttempt, submitAttempt } from "@/lib/exam/session";

/**
 * Gives a test user unlimited mock exams on a certification (an admin-granted
 * right over the whole test period). The engine tests take many exams per user;
 * the free quota itself is tested in access.test.ts.
 */
export async function grantFullAccess(db: PrismaClient, userId: string, code = "az-104") {
  const certification = await db.certification.findUniqueOrThrow({ where: { code } });
  await db.entitlement.create({
    data: { userId, certificationId: certification.id, source: "admin", startsAt: new Date("2000-01-01T00:00:00Z"), expiresAt: new Date("2100-01-01T00:00:00Z") },
  });
}

/**
 * Takes and submits a mock exam with about half of it right: the questions of
 * the "stor-" set are answered with their key, the series wrongly, the rest
 * left blank. So its correction has both missed and correct questions.
 */
export async function playHalf(db: PrismaClient, userId: string, start = new Date()) {
  const { attemptId } = await createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: start });
  await startAttempt(db, { attemptId, userId, now: start });
  const view = await getAttemptView(db, { attemptId, userId, now: start });
  const keys = new Map((await db.question.findMany()).map((q) => [q.id, q.answer as { value?: boolean }]));
  for (const section of view.sections) {
    for (const item of view.items.filter((i) => i.sectionId === section.id)) {
      const key = keys.get(item.question.id)!;
      if (item.question.id.startsWith("stor-")) await saveItem(db, { attemptId, itemId: item.id, userId, response: key, now: start });
      else if (section.kind === "series") await saveItem(db, { attemptId, itemId: item.id, userId, response: { value: !key.value }, now: start });
    }
    if (section.id !== view.sections.at(-1)!.id) await lockSection(db, { attemptId, sectionId: section.id, userId, now: start });
  }
  await submitAttempt(db, { attemptId, userId, now: new Date(start.getTime() + 60_000) });
  return attemptId;
}
