/**
 * Access to certifications, read from the database (rules in ./rules.ts).
 * Every exam start goes through assertCanTakeExam; the free quota is counted
 * from the attempts (mock exams whose clock was started), with no counter.
 */
import type { PrismaClient } from "@prisma/client";
import { AccessError, examsLeft, refusalReason, resolveAccess, type Access, type AccessFacts } from "./rules";

export { AccessError } from "./rules";
export type { Access, AccessLevel, AccessSource, RefusalCode } from "./rules";

/** Full mock exams a free user may take per certification, from the "free" plan (0 when it is missing or inactive). */
export async function freeExamQuota(db: PrismaClient): Promise<number | null> {
  const plan = await db.plan.findUnique({ where: { code: "free" }, select: { active: true, examQuota: true } });
  return plan?.active ? plan.examQuota : 0;
}

/** Mock exams of this certification whose clock was started: a started exam counts, even if abandoned. */
export function startedExams(db: PrismaClient, userId: string, certificationId: string): Promise<number> {
  return db.attempt.count({ where: { userId, certificationId, mode: "exam", startedAt: { not: null } } });
}

async function loadFacts(db: PrismaClient, userId: string, certificationId: string): Promise<AccessFacts> {
  const [user, certification, passes] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { role: true } }),
    db.certification.findUnique({ where: { id: certificationId }, select: { freeAccess: true } }),
    db.entitlement.findMany({ where: { userId, certificationId }, select: { startsAt: true, expiresAt: true, revokedAt: true } }),
  ]);
  return {
    isAdmin: user?.role === "admin",
    freeCertification: certification?.freeAccess ?? false,
    // Subscriptions and team seats arrive with offers lots D and E.
    teamSubscriptions: [],
    subscriptions: [],
    passes,
  };
}

export interface CertificationAccess extends Access {
  /** Mock exams started on this certification. */
  started: number;
  /** Full mock exams still allowed; null when unlimited. */
  examsLeft: number | null;
}

async function evaluate(db: PrismaClient, userId: string, certificationId: string, now: Date) {
  const [facts, started, quota] = await Promise.all([loadFacts(db, userId, certificationId), startedExams(db, userId, certificationId), freeExamQuota(db)]);
  const access = resolveAccess(facts, now);
  return { facts, access, started, left: examsLeft(access, started, quota) };
}

/** The access of a user to a certification at `now`. */
export async function getAccess(db: PrismaClient, userId: string, certificationId: string, now = new Date()): Promise<CertificationAccess> {
  const { access, started, left } = await evaluate(db, userId, certificationId, now);
  return { ...access, started, examsLeft: left };
}

/**
 * Refuses (AccessError, 402) a new mock exam when the free quota is used up.
 * Called when an exam is created and when its clock starts; an exam already
 * started can always be finished, even if the access ends meanwhile.
 * No lock is needed: a user has at most one in-progress attempt per
 * certification (unique index attempt_one_in_progress), so a new exam can only
 * be created once the previous one is over, and that one already counts.
 */
export async function assertCanTakeExam(db: PrismaClient, { userId, certificationId, now = new Date() }: { userId: string; certificationId: string; now?: Date }): Promise<void> {
  const { facts, left } = await evaluate(db, userId, certificationId, now);
  if (left !== null && left <= 0) throw new AccessError(refusalReason(facts, now));
}

/** Access of a user to every active certification (GET /api/me/access, dashboard). */
export async function getAccessSummary(db: PrismaClient, userId: string, now = new Date()) {
  const certifications = await db.certification.findMany({ where: { active: true }, orderBy: { code: "asc" }, select: { id: true, code: true, title: true } });
  return Promise.all(
    certifications.map(async (c) => {
      const a = await getAccess(db, userId, c.id, now);
      return { certification: c.code, title: c.title, level: a.level, source: a.source, expiresAt: a.expiresAt?.toISOString() ?? null, started: a.started, examsLeft: a.examsLeft };
    }),
  );
}
