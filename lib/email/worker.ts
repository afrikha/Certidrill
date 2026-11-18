/**
 * Sends the queued e-mails (./outbox.ts) from the app process: every minute,
 * and right after an event queued some (kickEmailWorker). Each pass also
 * deletes at Stripe the customers of deleted accounts (lib/billing/erase.ts)
 * and, once an hour, the sign-ins older than a year (lib/activity/logins.ts).
 * Started by instrumentation.ts; set EMAIL_WORKER=off to run it elsewhere or
 * not at all (then nothing deletes the old sign-ins: the retention announced
 * to users is no longer kept). A failed purge is tried again the next hour.
 */
import type { PrismaClient } from "@prisma/client";
import { eraseDeletedCustomers } from "@/lib/billing/erase";
import { purgeLogins } from "@/lib/activity/logins";
import { stripeApi } from "@/lib/billing/stripe";
import { logError, logEvent } from "@/lib/log";
import { drainOutbox } from "./outbox";

const INTERVAL_MS = 60_000;
const PURGE_EVERY_MS = 60 * 60_000;
let lastPurge = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let running: Promise<void> | null = null;

/** One pass over the due e-mails and erasures; a pass already running is joined, not doubled. */
export function kickEmailWorker(db: PrismaClient): Promise<void> {
  running ??= Promise.all([
    drainOutbox(db)
      .then((r) => {
        if (r.sent + r.skipped + r.retried + r.failed > 0) logEvent("email.outbox", { ...r });
      })
      .catch((err: unknown) => logError("email.worker", err)),
    eraseDeletedCustomers(db, stripeApi())
      .then((r) => {
        if (r.erased + r.failed > 0) logEvent("billing.erase", { ...r });
      })
      .catch((err: unknown) => logError("billing.erase", err)),
    purgeDue(db),
  ])
    .then(() => undefined)
    .finally(() => {
      running = null;
    });
  return running;
}

/** Sign-ins past their retention, at most once an hour. */
async function purgeDue(db: PrismaClient): Promise<void> {
  if (Date.now() - lastPurge < PURGE_EVERY_MS) return;
  lastPurge = Date.now();
  try {
    const purged = await purgeLogins(db);
    if (purged > 0) logEvent("activity.purge", { purged });
  } catch (err) {
    logError("activity.purge", err);
  }
}

export function startEmailWorker(db: PrismaClient, intervalMs = INTERVAL_MS): void {
  if (timer) return;
  timer = setInterval(() => void kickEmailWorker(db), intervalMs);
  // Never keeps the process alive on its own.
  timer.unref();
  void kickEmailWorker(db);
}

export function stopEmailWorker(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
