/**
 * Audit log of sensitive actions (specs des offres §8): manual rights,
 * switches, accounts, the status of a course chapter. Written in the same
 * transaction as the action itself, so an action is never recorded without
 * its trace, nor the reverse.
 */
import type { Prisma, PrismaClient } from "@prisma/client";

/** Every action written to audit_log; each has a billingAdmin.action_* label in both languages (tests/unit/audit-labels.test.ts). */
export const AUDIT_ACTIONS = ["certification.active", "course.status", "entitlement.grant", "entitlement.revoke", "price.update", "question.status", "setting.update", "user.create"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

type Db = PrismaClient | Prisma.TransactionClient;

export function audit(
  db: Db,
  entry: { actorId: string | null; action: AuditAction; targetUserId?: string | null; details: Prisma.InputJsonObject },
) {
  return db.auditLog.create({ data: { actorId: entry.actorId, action: entry.action, targetUserId: entry.targetUserId ?? null, details: entry.details } });
}

/** Several entries at once, in the same transaction as their action. */
export function auditMany(db: Db, entries: { actorId: string | null; action: AuditAction; targetUserId?: string | null; details: Prisma.InputJsonObject }[]) {
  return db.auditLog.createMany({ data: entries.map((e) => ({ actorId: e.actorId, action: e.action, targetUserId: e.targetUserId ?? null, details: e.details })) });
}

/** Latest entries, newest first; for one user when `targetUserId` is given, of one kind when `action` is. */
export function recentAudit(db: PrismaClient, { targetUserId, action, take = 50 }: { targetUserId?: string; action?: AuditAction; take?: number } = {}) {
  return db.auditLog.findMany({
    where: { ...(targetUserId && { targetUserId }), ...(action && { action }) },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, action: true, details: true, createdAt: true, actor: { select: { email: true } }, target: { select: { email: true } } },
  });
}
