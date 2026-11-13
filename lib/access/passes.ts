/**
 * Creating a Pass, whatever gives it: a purchase (webhook), an administrator,
 * an extension. One place, so that every Pass chains the same way.
 */
import type { EntitlementSource, Prisma } from "@prisma/client";
import { passWindow } from "./rules";

/**
 * Adds a Pass of `days` days on one certification, inside the caller's
 * transaction. It starts now, or when the user's current Pass of this
 * certification ends: buying or granting again extends it.
 * The user row is locked first, so two Passes added at once chain one after
 * the other instead of computing the same window. Null when the user no
 * longer exists.
 */
export async function addPass(
  tx: Prisma.TransactionClient,
  { userId, certificationId, days, source, paymentId = null, now }: { userId: string; certificationId: string; days: number; source: EntitlementSource; paymentId?: string | null; now: Date },
) {
  const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "user" WHERE id = ${userId} FOR UPDATE`;
  if (locked.length === 0) return null;
  const passes = await tx.entitlement.findMany({ where: { userId, certificationId }, select: { startsAt: true, expiresAt: true, revokedAt: true } });
  return tx.entitlement.create({
    data: { userId, certificationId, source, paymentId, ...passWindow(passes, now, days) },
    select: { id: true, startsAt: true, expiresAt: true },
  });
}
