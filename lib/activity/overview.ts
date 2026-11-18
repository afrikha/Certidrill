/**
 * The activity of the whole site over the last days, by UTC day, for the
 * administrators (/admin/activity). Counted from what the site keeps anyway
 * and from the sign-ins (login_event).
 */
import type { PrismaClient } from "@prisma/client";

export type DayActivity = {
  /** The UTC day, YYYY-MM-DD. */
  day: string;
  signups: number;
  /** Distinct users who signed in, started an exam or read the course that day. */
  activeUsers: number;
  examsStarted: number;
  examsFinished: number;
  passesSold: number;
};

export type SiteActivity = {
  days: DayActivity[];
  /** Distinct active users over the last 7 and over all the days shown. */
  activeWeek: number;
  activeTotal: number;
  /** Passes paid over the period, by currency (amounts asked, in cents). */
  revenue: { currency: string; cents: number; passes: number }[];
};

const DAY_MS = 86_400_000;
const dayOf = (d: Date) => d.toISOString().slice(0, 10);

/** The last `days` UTC days, today included, oldest first. */
export async function siteActivity(db: PrismaClient, now = new Date(), days = 30): Promise<SiteActivity> {
  const today = Math.floor(now.getTime() / DAY_MS);
  const since = new Date((today - days + 1) * DAY_MS);
  const weekStart = new Date((today - 6) * DAY_MS);
  const range = { gte: since, lte: now };
  const [signups, logins, attempts, finished, progress, paid] = await Promise.all([
    db.user.findMany({ where: { createdAt: range }, select: { createdAt: true } }),
    // A failed or blocked try is not activity.
    db.loginEvent.findMany({ where: { createdAt: range, kind: { in: ["password", "magic_link"] } }, select: { userId: true, createdAt: true } }),
    db.attempt.findMany({ where: { createdAt: range }, select: { userId: true, createdAt: true } }),
    db.attempt.findMany({ where: { submittedAt: range, status: { not: "in_progress" } }, select: { submittedAt: true } }),
    db.courseProgress.findMany({ where: { readAt: range }, select: { userId: true, readAt: true } }),
    db.payment.findMany({ where: { status: "paid", paidAt: range }, select: { paidAt: true, amountCents: true, currency: true } }),
  ]);

  const rows = new Map<string, DayActivity & { users: Set<string> }>();
  for (let d = today - days + 1; d <= today; d++) {
    const day = dayOf(new Date(d * DAY_MS));
    rows.set(day, { day, signups: 0, activeUsers: 0, examsStarted: 0, examsFinished: 0, passesSold: 0, users: new Set() });
  }
  const row = (d: Date) => rows.get(dayOf(d));
  const week = new Set<string>();
  const total = new Set<string>();
  const active = (userId: string, at: Date) => {
    row(at)?.users.add(userId);
    total.add(userId);
    if (at >= weekStart) week.add(userId);
  };

  for (const u of signups) row(u.createdAt)!.signups += 1;
  for (const l of logins) active(l.userId, l.createdAt);
  for (const a of attempts) {
    row(a.createdAt)!.examsStarted += 1;
    active(a.userId, a.createdAt);
  }
  for (const a of finished) row(a.submittedAt!)!.examsFinished += 1;
  for (const p of progress) active(p.userId, p.readAt);
  const revenue = new Map<string, { currency: string; cents: number; passes: number }>();
  for (const p of paid) {
    row(p.paidAt!)!.passesSold += 1;
    const currency = p.currency.toLowerCase();
    const sum = revenue.get(currency) ?? { currency, cents: 0, passes: 0 };
    revenue.set(currency, { currency, cents: sum.cents + p.amountCents, passes: sum.passes + 1 });
  }

  return {
    days: [...rows.values()].map(({ users, ...r }) => ({ ...r, activeUsers: users.size })),
    activeWeek: week.size,
    activeTotal: total.size,
    revenue: [...revenue.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
  };
}
