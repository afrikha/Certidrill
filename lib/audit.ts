/**
 * Audit log of sensitive actions (specs des offres §8): manual rights,
 * switches, accounts. Written in the same transaction as the action itself,
 * so an action is never recorded without its trace, nor the reverse.
 */
import type { Prisma, PrismaClient } from "@prisma/client";

export type AuditAction = "entitlement.grant" | "entitlement.revoke" | "setting.update" | "user.create";

type Db = PrismaClient | Prisma.TransactionClient;

export function audit(
  db: Db,
  entry: { actorId: string | null; action: AuditAction; targetUserId?: string | null; details: Prisma.InputJsonObject },
) {
  return db.auditLog.create({ data: { actorId: entry.actorId, action: entry.action, targetUserId: entry.targetUserId ?? null, details: entry.details } });
}

/** Latest entries, newest first; for one user when `targetUserId` is given. */
export function recentAudit(db: PrismaClient, { targetUserId, take = 50 }: { targetUserId?: string; take?: number } = {}) {
  return db.auditLog.findMany({
    where: targetUserId ? { targetUserId } : {},
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, action: true, details: true, createdAt: true, actor: { select: { email: true } }, target: { select: { email: true } } },
  });
}
