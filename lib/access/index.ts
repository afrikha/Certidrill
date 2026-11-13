/**
 * Access to certifications, read from the database (rules in ./rules.ts).
 * Every exam start goes through assertCanTakeExam; the free quota is counted
 * from the attempts (mock exams whose clock was started), with no counter.
 */
import type { PrismaClient } from "@prisma/client";
import { AccessError, examsLeft, refusalReason, resolveAccess, type Access, type AccessFacts } from "./rules";

export { AccessError } from "./rules";
export { isRefusalCode } from "./rules";
export type { Access, AccessErrorCode, AccessLevel, AccessSource, RefusalCode } from "./rules";

/** Full mock exams a free user may take per certification, from the "free" plan (0 when it is missing or inactive). */
export async function freeExamQuota(db: PrismaClient): Promise<number | null> {
  const plan = await db.plan.findUnique({ where: { code: "free" }, select: { active: true, examQuota: true } });
  return plan?.active ? plan.examQuota : 0;
}

/**
 * Mock exams of this certification whose clock was started: a started exam
 * counts, even if abandoned. `except` leaves out the exam being started.
 */
export function startedExams(db: PrismaClient, userId: string, certificationId: string, except?: string): Promise<number> {
  return db.attempt.count({ where: { userId, certificationId, mode: "exam", startedAt: { not: null }, ...(except ? { id: { not: except } } : {}) } });
}

/** What is the same for every certification of a user. */
interface UserFacts {
  isAdmin: boolean;
  emailVerified: boolean;
  quota: number | null;
}

async function loadUserFacts(db: PrismaClient, userId: string): Promise<UserFacts> {
  const [user, quota] = await Promise.all([db.user.findUnique({ where: { id: userId }, select: { role: true, emailVerified: true } }), freeExamQuota(db)]);
  return { isAdmin: user?.role === "admin", emailVerified: !!user?.emailVerified, quota };
}

async function loadFacts(db: PrismaClient, userId: string, certification: { id: string; freeAccess: boolean }, base: UserFacts): Promise<AccessFacts> {
  const passes = await db.entitlement.findMany({ where: { userId, certificationId: certification.id }, select: { startsAt: true, expiresAt: true, revokedAt: true } });
  return {
    isAdmin: base.isAdmin,
    freeCertification: certification.freeAccess,
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

async function evaluate(db: PrismaClient, userId: string, certification: { id: string; freeAccess: boolean }, now: Date, base?: UserFacts, except?: string) {
  const user = base ?? (await loadUserFacts(db, userId));
  const [facts, started] = await Promise.all([loadFacts(db, userId, certification, user), startedExams(db, userId, certification.id, except)]);
  const access = resolveAccess(facts, now);
  return { facts, access, started, left: examsLeft(access, started, user.quota) };
}

async function certificationById(db: PrismaClient, certificationId: string) {
  const c = await db.certification.findUnique({ where: { id: certificationId }, select: { freeAccess: true } });
  return { id: certificationId, freeAccess: c?.freeAccess ?? false };
}

/** The access of a user to a certification at `now`. */
export async function getAccess(db: PrismaClient, userId: string, certificationId: string, now = new Date()): Promise<CertificationAccess> {
  const { access, started, left } = await evaluate(db, userId, await certificationById(db, certificationId), now);
  return { ...access, started, examsLeft: left };
}

/**
 * Refuses a new mock exam (AccessError): 403 email_unverified while the
 * address is not verified (specs des offres §4), 402 when the free quota is
 * used up.
 * Called when an exam is created and when its clock starts; an exam already
 * started can always be finished, even if the access ends meanwhile.
 * No lock is needed: a user has at most one in-progress attempt per
 * certification (unique index attempt_one_in_progress), so a new exam can only
 * be created once the previous one is over, and that one already counts.
 */
export async function assertCanTakeExam(
  db: PrismaClient,
  { userId, certificationId, attemptId, now = new Date() }: { userId: string; certificationId: string; attemptId?: string; now?: Date },
): Promise<void> {
  // When starting `attemptId`, it does not count against itself: a concurrent
  // start of the same exam (double click) may already have marked it started.
  const user = await loadUserFacts(db, userId);
  if (!user.emailVerified) throw new AccessError("email_unverified");
  const { facts, left } = await evaluate(db, userId, await certificationById(db, certificationId), now, user, attemptId);
  if (left !== null && left <= 0) throw new AccessError(refusalReason(facts, now));
}

/** Access of a user to every active certification (GET /api/me/access, dashboard). */
export async function getAccessSummary(db: PrismaClient, userId: string, now = new Date()) {
  const [certifications, base] = await Promise.all([
    db.certification.findMany({ where: { active: true }, orderBy: { code: "asc" }, select: { id: true, code: true, title: true, freeAccess: true } }),
    loadUserFacts(db, userId),
  ]);
  return Promise.all(
    certifications.map(async (c) => {
      const { access, started, left } = await evaluate(db, userId, c, now, base);
      return { certification: c.code, title: c.title, level: access.level, source: access.source, expiresAt: access.expiresAt?.toISOString() ?? null, started, examsLeft: left };
    }),
  );
}
