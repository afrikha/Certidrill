/**
 * Transactional e-mails go through a queue (email_outbox) with retry
 * (specs des offres §7): an SMTP failure never loses an e-mail nor fails the
 * webhook that queued it. Rows are queued in the transaction of the event
 * that causes them, then sent by the worker (./worker.ts).
 *
 * Reminders are queued at purchase time for the Pass end date. When their
 * time comes they are checked again against the current access: a Pass
 * extended, revoked or replaced meanwhile skips them.
 */
import type { EmailOutbox, Prisma, PrismaClient } from "@prisma/client";
import { getAccess } from "@/lib/access";
import { send, type EmailMessage } from "@/lib/auth/email";
import { logError } from "@/lib/log";
import { expiredMessage, purchaseMessage, reminderMessage } from "./billing";

type Db = PrismaClient | Prisma.TransactionClient;

export type EmailKind = "purchase" | "pass_reminder" | "pass_expired";

/** The reminder goes this many days before a Pass ends. */
export const REMINDER_DAYS = 7;
/** Tries before giving up on an e-mail. */
export const MAX_ATTEMPTS = 8;
/** Wait before the next try, by number of failed tries (then the last value). */
const BACKOFF_MINUTES = [1, 5, 15, 60, 180, 360, 720];
/** A worker holds the rows it took this long: enough to send them. */
const LOCK_MINUTES = 5;
const DAY_MS = 86_400_000;

/** Queues the e-mails of a purchased Pass: confirmation now, reminder, expiry notice. */
export async function enqueuePassEmails(
  db: Db,
  { userId, paymentId, certificationId, expiresAt, now }: { userId: string; paymentId: string; certificationId: string; expiresAt: Date; now: Date },
) {
  const end = expiresAt.toISOString();
  const pass = { certificationId, expiresAt: end };
  const remindAt = new Date(expiresAt.getTime() - REMINDER_DAYS * DAY_MS);
  const rows: Prisma.EmailOutboxCreateManyInput[] = [
    { userId, kind: "purchase", payload: { paymentId }, dedupeKey: `purchase:${paymentId}`, sendAfter: now },
    { userId, kind: "pass_expired", payload: pass, dedupeKey: `pass_expired:${userId}:${certificationId}:${end}`, sendAfter: expiresAt },
  ];
  if (remindAt > now) rows.push({ userId, kind: "pass_reminder", payload: pass, dedupeKey: `pass_reminder:${userId}:${certificationId}:${end}`, sendAfter: remindAt });
  await db.emailOutbox.createMany({ data: rows, skipDuplicates: true });
}

export interface Mail {
  to: string;
  kind: string;
  message: EmailMessage;
  /** The link of the e-mail (written to the log instead when there is no SMTP, like sign-in links). */
  link: string;
}
export type Sender = (mail: Mail) => Promise<void>;

const smtpSender: Sender = ({ to, message, link, kind }) => send({ to, message, link, kind });

export interface DrainResult {
  sent: number;
  skipped: number;
  retried: number;
  failed: number;
}

/**
 * Sends the e-mails that are due. Rows are taken with SKIP LOCKED and held
 * for a few minutes, so two workers never send the same e-mail at once.
 */
export async function drainOutbox(
  db: PrismaClient,
  { now = new Date(), sender = smtpSender, base = process.env.AUTH_URL, limit = 20 }: { now?: Date; sender?: Sender; base?: string; limit?: number } = {},
): Promise<DrainResult> {
  const lockedUntil = new Date(now.getTime() + LOCK_MINUTES * 60_000);
  const taken = await db.$queryRaw<{ id: string; sendAfter: Date }[]>`
    UPDATE "email_outbox" SET "lockedUntil" = ${lockedUntil}
    WHERE "id" IN (
      SELECT "id" FROM "email_outbox"
      WHERE "status" = 'pending' AND "sendAfter" <= ${now} AND ("lockedUntil" IS NULL OR "lockedUntil" <= ${now})
      ORDER BY "sendAfter" LIMIT ${limit}
      FOR UPDATE SKIP LOCKED)
    RETURNING "id", "sendAfter"`;
  // RETURNING keeps no order: the oldest first.
  taken.sort((a, b) => a.sendAfter.getTime() - b.sendAfter.getTime());
  const result: DrainResult = { sent: 0, skipped: 0, retried: 0, failed: 0 };
  // A slow mail server must not outlast the lock: the rows not reached by
  // then are left to the next run, rather than taken by another worker
  // while this one sends them.
  const stopAt = Date.now() + (LOCK_MINUTES - 1) * 60_000;
  for (const { id } of taken) {
    if (Date.now() > stopAt) break;
    result[await deliver(db, id, { now, sender, base })] += 1;
  }
  return result;
}

/**
 * At least once: an e-mail sent whose row could not be marked sent (database
 * down, process stopped) goes again once its lock expires. A rare duplicate
 * is harmless for these e-mails; a lost one would not be.
 */
async function deliver(db: PrismaClient, id: string, { now, sender, base }: { now: Date; sender: Sender; base?: string }): Promise<keyof DrainResult> {
  const row = await db.emailOutbox.findUniqueOrThrow({ where: { id }, include: { user: { select: { email: true, locale: true } } } });
  let mail: Mail | null;
  try {
    if (!base) throw new Error("AUTH_URL is not configured");
    mail = await compose(db, row, base, now);
    if (mail) await sender(mail);
  } catch (err) {
    const attempts = row.attempts + 1;
    const failed = attempts >= MAX_ATTEMPTS;
    const wait = BACKOFF_MINUTES[Math.min(attempts, BACKOFF_MINUTES.length) - 1]!;
    await db.emailOutbox.update({
      where: { id },
      data: {
        attempts,
        lockedUntil: null,
        // Errors from send() never contain the SMTP credentials.
        lastError: (err instanceof Error ? err.message : String(err)).slice(0, 500),
        ...(failed ? { status: "failed" } : { sendAfter: new Date(now.getTime() + wait * 60_000) }),
      },
    });
    logError("email.failed", err, { id, kind: row.kind, attempts, gaveUp: failed });
    return failed ? "failed" : "retried";
  }
  await db.emailOutbox.update({
    where: { id },
    data: mail ? { status: "sent", sentAt: now, attempts: row.attempts + 1, lockedUntil: null } : { status: "skipped", lockedUntil: null },
  });
  return mail ? "sent" : "skipped";
}

/** The e-mail of a row, or null when it is no longer relevant. */
async function compose(db: PrismaClient, row: EmailOutbox & { user: { email: string; locale: string } }, base: string, now: Date): Promise<Mail | null> {
  const { email: to, locale } = row.user;
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  const link = (path: string) => new URL(path, base).toString();
  if (row.kind === "purchase") {
    const payment = await db.payment.findUnique({
      where: { id: String(payload.paymentId) },
      select: { status: true, amountCents: true, currency: true, certification: { select: { code: true } }, entitlement: { select: { expiresAt: true, revokedAt: true } } },
    });
    // Refunded or revoked before the e-mail left: no confirmation.
    if (payment?.status !== "paid" || !payment.entitlement || payment.entitlement.revokedAt) return null;
    const url = link("/account/billing");
    const message = purchaseMessage({ locale, certification: payment.certification.code, expiresAt: payment.entitlement.expiresAt, amountCents: payment.amountCents, currency: payment.currency, url });
    return { to, kind: row.kind, message, link: url };
  }
  if (row.kind !== "pass_reminder" && row.kind !== "pass_expired") throw new Error(`unknown e-mail kind: ${row.kind}`);

  const certificationId = String(payload.certificationId);
  const expiresAt = new Date(String(payload.expiresAt));
  const certification = await db.certification.findUnique({ where: { id: certificationId }, select: { code: true } });
  if (!certification || Number.isNaN(expiresAt.getTime())) return null;
  const access = await getAccess(db, row.userId, certificationId, now);
  const url = link("/pricing");
  if (row.kind === "pass_reminder") {
    // Still the Pass that ends on that date: not extended, revoked or ended.
    if (access.source !== "pass" || access.expiresAt?.getTime() !== expiresAt.getTime() || now >= expiresAt) return null;
    const days = Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS));
    return { to, kind: row.kind, message: reminderMessage({ locale, certification: certification.code, expiresAt, days, url }), link: url };
  }
  // Expired: no access since (no new Pass), and the Pass ended on its own (not revoked).
  if (access.level === "full") return null;
  const ended = await db.entitlement.count({ where: { userId: row.userId, certificationId, revokedAt: null, expiresAt } });
  if (ended === 0) return null;
  return { to, kind: row.kind, message: expiredMessage({ locale, certification: certification.code, expiresAt, url }), link: url };
}
