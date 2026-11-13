/**
 * Back-office of rights (/admin/billing, offers lot A3): manual grant or
 * extension of a Pass, revocation, offer switches. Every change writes its
 * audit entry in the same transaction.
 */
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { SWITCHES, type Switch } from "@/lib/settings";
import { addPass } from "./passes";

export class BillingAdminError extends Error {
  constructor(readonly code: "not_found" | "inactive_certification") {
    super(code);
    this.name = "BillingAdminError";
  }
}

/** Users whose e-mail contains `query` (case ignored), newest first. */
export function findUsers(db: PrismaClient, query: string) {
  const q = query.trim();
  if (!q) return Promise.resolve([]);
  return db.user.findMany({
    where: { email: { contains: q, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
}

/** The rights of a user: every Pass, revoked or not, latest end first. */
export function userEntitlements(db: PrismaClient, userId: string) {
  return db.entitlement.findMany({
    where: { userId },
    orderBy: [{ expiresAt: "desc" }],
    select: { id: true, source: true, startsAt: true, expiresAt: true, revokedAt: true, createdAt: true, certification: { select: { code: true } } },
  });
}

export const grantSchema = z.object({
  userId: z.string().min(1),
  certificationCode: z.string().min(1),
  days: z.coerce.number().int().min(1).max(3650),
  /** admin: a right given by hand; extension: added after a failed real exam (§8). */
  source: z.enum(["admin", "extension"]),
  reason: z.string().trim().min(3).max(500),
});
export type GrantInput = z.input<typeof grantSchema>;

/**
 * Gives a Pass of `days` days by hand. It starts now, or when the user's
 * current Pass of this certification ends: like a purchase, it extends.
 */
export async function grantPass(db: PrismaClient, actorId: string, input: GrantInput, now = new Date()) {
  const data = grantSchema.parse(input);
  const certification = await db.certification.findUnique({ where: { code: data.certificationCode }, select: { id: true, code: true, active: true } });
  if (!certification) throw new BillingAdminError("not_found");
  if (!certification.active) throw new BillingAdminError("inactive_certification");
  return db.$transaction(async (tx) => {
    const entitlement = await addPass(tx, { userId: data.userId, certificationId: certification.id, days: data.days, source: data.source, now });
    if (!entitlement) throw new BillingAdminError("not_found");
    await audit(tx, {
      actorId,
      action: "entitlement.grant",
      targetUserId: data.userId,
      details: {
        entitlementId: entitlement.id,
        certification: certification.code,
        source: data.source,
        days: data.days,
        startsAt: entitlement.startsAt.toISOString(),
        expiresAt: entitlement.expiresAt.toISOString(),
        reason: data.reason,
      },
    });
    return entitlement;
  });
}

export const revokeSchema = z.object({ entitlementId: z.string().min(1), reason: z.string().trim().min(3).max(500) });

/** Withdraws a Pass (refund, mistake): it stops giving access at once. Revoking twice changes nothing. */
export async function revokeEntitlement(db: PrismaClient, actorId: string, input: z.input<typeof revokeSchema>, now = new Date()) {
  const { entitlementId, reason } = revokeSchema.parse(input);
  return db.$transaction(async (tx) => {
    const { count } = await tx.entitlement.updateMany({ where: { id: entitlementId, revokedAt: null }, data: { revokedAt: now } });
    if (count === 0) return false;
    const e = await tx.entitlement.findUniqueOrThrow({ where: { id: entitlementId }, select: { userId: true, source: true, expiresAt: true, certification: { select: { code: true } } } });
    await audit(tx, {
      actorId,
      action: "entitlement.revoke",
      targetUserId: e.userId,
      details: { entitlementId, certification: e.certification.code, source: e.source, expiresAt: e.expiresAt.toISOString(), reason },
    });
    return true;
  });
}

/** Turns an offer switch on or off (lib/settings.ts). Setting the current value again is not recorded. */
export async function setSwitch(db: PrismaClient, actorId: string, name: Switch, enabled: boolean) {
  const key = SWITCHES[name];
  return db.$transaction(async (tx) => {
    const before = await tx.appSetting.findUnique({ where: { key } });
    const was = before?.value === true;
    if (was === enabled) return false;
    await tx.appSetting.upsert({ where: { key }, create: { key, value: enabled }, update: { value: enabled } });
    await audit(tx, { actorId, action: "setting.update", details: { key, from: was, to: enabled } });
    return true;
  });
}
