import type { PrismaClient } from "@prisma/client";

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
