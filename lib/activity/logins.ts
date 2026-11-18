/**
 * Sign-ins and security events of each account (login_event), with the full
 * IP address, for the administrators to follow the activity of the site
 * (/admin/users/[id], /admin/activity). The owner chose to keep them one year:
 * the worker deletes older ones (purgeLogins), the account's deletion takes
 * them with it, and the user sees their own on the account page.
 *
 * Only events of an existing account are kept: a wrong address typed at
 * sign-in is nobody's data and is not recorded.
 */
import type { LoginKind, PrismaClient } from "@prisma/client";
import { logError } from "@/lib/log";

/** How long a sign-in is kept, in days (one year, the owner's choice). */
export const LOGIN_RETENTION_DAYS = 365;
const DAY_MS = 86_400_000;

/**
 * Records one event. Never throws: a sign-in must not fail because its
 * record could not be written (the failure goes to the logs).
 */
export async function recordLogin(db: PrismaClient, entry: { userId: string; kind: LoginKind; ip: string }, now = new Date()): Promise<void> {
  try {
    await db.loginEvent.create({ data: { userId: entry.userId, kind: entry.kind, ip: entry.ip.slice(0, 64), createdAt: now } });
  } catch (err) {
    logError("activity.login", err, { kind: entry.kind });
  }
}

/** The same, for an account known only by its e-mail (failed or blocked sign-ins); nothing for an unknown address. */
export async function recordLoginByEmail(db: PrismaClient, entry: { email: string; kind: LoginKind; ip: string }, now = new Date()): Promise<void> {
  try {
    const user = await db.user.findUnique({ where: { email: entry.email }, select: { id: true } });
    if (user) await recordLogin(db, { userId: user.id, kind: entry.kind, ip: entry.ip }, now);
  } catch (err) {
    logError("activity.login", err, { kind: entry.kind });
  }
}

/** Deletes the events older than the retention period; returns how many. */
export async function purgeLogins(db: PrismaClient, now = new Date()): Promise<number> {
  const { count } = await db.loginEvent.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - LOGIN_RETENTION_DAYS * DAY_MS) } } });
  return count;
}

/** The latest events of one account, newest first. */
export function recentLogins(db: PrismaClient, userId: string, take = 10) {
  return db.loginEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take, select: { id: true, kind: true, ip: true, createdAt: true } });
}
