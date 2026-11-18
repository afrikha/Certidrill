/**
 * Sign-ins and security events of each account (login_event), with the full
 * IP address, for the administrators to follow the activity of the site
 * (/admin/users/[id], /admin/activity). The owner chose to keep them one year:
 * the worker deletes older ones (purgeLogins) and the account's deletion takes
 * them with it. Only the administrators see them (the owner's choice); the
 * privacy policy (/privacy) tells the users.
 *
 * Only events of an existing account are kept: a wrong address typed at
 * sign-in is nobody's data and is not recorded.
 */
import { isIP } from "node:net";
import type { LoginKind, PrismaClient } from "@prisma/client";
import { logError } from "@/lib/log";

/** How long a sign-in is kept, in days (one year, the owner's choice). */
export const LOGIN_RETENTION_DAYS = 365;
const DAY_MS = 86_400_000;

/** The address as recorded: an IPv4 or IPv6 address, anything else "unknown". */
export function loggedIp(ip: string): string {
  const trimmed = ip.trim();
  return isIP(trimmed) ? trimmed : "unknown";
}

/**
 * Records one event. Never throws: a sign-in must not fail because its
 * record could not be written (the failure goes to the logs).
 */
export async function recordLogin(db: PrismaClient, entry: { userId: string; kind: LoginKind; ip: string }, now = new Date()): Promise<void> {
  try {
    await db.loginEvent.create({ data: { userId: entry.userId, kind: entry.kind, ip: loggedIp(entry.ip), createdAt: now } });
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

/** Kinds that are a try refused, not a sign-in: listed apart, so that a flood of them cannot hide the real sign-ins. */
export const FAILED_KINDS = ["failed", "blocked"] as const satisfies readonly LoginKind[];

/** The latest refused tries on one account, newest first, and how many are kept in all. */
export async function failedLogins(db: PrismaClient, userId: string, take = 50) {
  const where = { userId, kind: { in: [...FAILED_KINDS] } };
  const [rows, total] = await Promise.all([
    db.loginEvent.findMany({ where, orderBy: { createdAt: "desc" }, take, select: { id: true, kind: true, ip: true, createdAt: true } }),
    db.loginEvent.count({ where }),
  ]);
  return { rows, total };
}
