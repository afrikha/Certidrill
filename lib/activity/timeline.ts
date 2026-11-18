/**
 * What a user did on the site, newest first, for the administrators
 * (/admin/users/[id]). Built from what the site already keeps to work
 * (account, exams, course progress, reports, real exam results, payments,
 * Passes, administrators' actions) and from the sign-ins of login_event:
 * nothing else is collected for it.
 */
import type { AttemptMode, AttemptStatus, EntitlementSource, LoginKind, PaymentStatus, PrismaClient } from "@prisma/client";

type Bilingual = { en: string; fr: string };

export type ActivityEvent = { at: Date } & (
  | { kind: "account_created" }
  | { kind: "email_verified" }
  | { kind: "login"; login: LoginKind; ip: string }
  | { kind: "exam_started"; certification: string; mode: AttemptMode }
  | { kind: "exam_finished"; certification: string; mode: AttemptMode; status: Exclude<AttemptStatus, "in_progress">; score: number | null; passed: boolean | null }
  | { kind: "course_read"; certification: string; chapter: Bilingual; sections: number }
  | { kind: "report"; questionId: string; reason: string }
  | { kind: "outcome"; certification: string; passed: boolean; score: number | null }
  | { kind: "payment"; certification: string; status: PaymentStatus; amountCents: number; currency: string }
  | { kind: "pass_granted"; certification: string; source: EntitlementSource; expiresAt: Date }
  | { kind: "pass_revoked"; certification: string }
  | { kind: "admin"; action: string; actor: string | null }
);

export type ActivityKind = ActivityEvent["kind"];

/** Rows read from each source: enough for the page, which shows the latest `take` events. */
const PER_SOURCE = 200;
const DAY_MS = 86_400_000;
const utcDay = (d: Date) => Math.floor(d.getTime() / DAY_MS);

/** The latest `take` events of one user, newest first; null for an unknown user. */
export async function userActivity(db: PrismaClient, userId: string, take = 200): Promise<ActivityEvent[] | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { createdAt: true, emailVerified: true } });
  if (!user) return null;
  const newest = { orderBy: { createdAt: "desc" as const }, take: PER_SOURCE };
  const [logins, attempts, progress, reports, outcomes, payments, entitlements, audit] = await Promise.all([
    db.loginEvent.findMany({ where: { userId }, ...newest, select: { kind: true, ip: true, createdAt: true } }),
    db.attempt.findMany({ where: { userId }, ...newest, select: { createdAt: true, mode: true, status: true, submittedAt: true, deadlineAt: true, scaledScore: true, passed: true, certification: { select: { code: true } } } }),
    db.courseProgress.findMany({
      where: { userId },
      orderBy: { readAt: "desc" },
      take: PER_SOURCE,
      select: { readAt: true, section: { select: { chapter: { select: { id: true, title: true, certification: { select: { code: true } } } } } } },
    }),
    db.questionReport.findMany({ where: { userId }, ...newest, select: { createdAt: true, questionId: true, reason: true } }),
    db.examOutcome.findMany({ where: { userId }, ...newest, select: { createdAt: true, passed: true, score: true, certification: { select: { code: true } } } }),
    db.payment.findMany({
      where: { customer: { userId } },
      ...newest,
      select: { createdAt: true, paidAt: true, status: true, amountCents: true, currency: true, certification: { select: { code: true } } },
    }),
    db.entitlement.findMany({ where: { userId }, ...newest, select: { createdAt: true, revokedAt: true, source: true, expiresAt: true, certification: { select: { code: true } } } }),
    db.auditLog.findMany({ where: { targetUserId: userId }, ...newest, select: { createdAt: true, action: true, actor: { select: { email: true } } } }),
  ]);

  const events: ActivityEvent[] = [{ at: user.createdAt, kind: "account_created" }];
  if (user.emailVerified) events.push({ at: user.emailVerified, kind: "email_verified" });
  for (const l of logins) events.push({ at: l.createdAt, kind: "login", login: l.kind, ip: l.ip });
  for (const a of attempts) {
    const certification = a.certification.code;
    events.push({ at: a.createdAt, kind: "exam_started", certification, mode: a.mode });
    // An expired attempt ends at its deadline, a submitted one when it was handed in.
    const end = a.status === "submitted" ? a.submittedAt : a.status === "expired" ? (a.submittedAt ?? a.deadlineAt) : null;
    if (end && a.status !== "in_progress") {
      events.push({ at: end, kind: "exam_finished", certification, mode: a.mode, status: a.status, score: a.scaledScore, passed: a.passed });
    }
  }
  // One line per chapter and day: a chapter is read section by section.
  const read = new Map<string, Extract<ActivityEvent, { kind: "course_read" }>>();
  for (const p of progress) {
    const chapter = p.section.chapter;
    const key = `${chapter.id}:${utcDay(p.readAt)}`;
    const line = read.get(key);
    if (line) {
      line.sections += 1;
      if (p.readAt > line.at) line.at = p.readAt;
    } else {
      read.set(key, { at: p.readAt, kind: "course_read", certification: chapter.certification.code, chapter: chapter.title as Bilingual, sections: 1 });
    }
  }
  events.push(...read.values());
  for (const r of reports) events.push({ at: r.createdAt, kind: "report", questionId: r.questionId, reason: r.reason });
  for (const o of outcomes) events.push({ at: o.createdAt, kind: "outcome", certification: o.certification.code, passed: o.passed, score: o.score });
  for (const p of payments) {
    events.push({ at: p.paidAt ?? p.createdAt, kind: "payment", certification: p.certification.code, status: p.status, amountCents: p.amountCents, currency: p.currency });
  }
  for (const e of entitlements) {
    events.push({ at: e.createdAt, kind: "pass_granted", certification: e.certification.code, source: e.source, expiresAt: e.expiresAt });
    if (e.revokedAt) events.push({ at: e.revokedAt, kind: "pass_revoked", certification: e.certification.code });
  }
  for (const a of audit) events.push({ at: a.createdAt, kind: "admin", action: a.action, actor: a.actor?.email ?? null });

  return events.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, take);
}
