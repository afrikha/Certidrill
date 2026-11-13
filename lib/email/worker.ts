/**
 * Sends the queued e-mails (./outbox.ts) from the app process: every minute,
 * and right after an event queued some (kickEmailWorker). Started by
 * instrumentation.ts; set EMAIL_WORKER=off to run it elsewhere or not at all.
 */
import type { PrismaClient } from "@prisma/client";
import { logError, logEvent } from "@/lib/log";
import { drainOutbox } from "./outbox";

const INTERVAL_MS = 60_000;
let timer: ReturnType<typeof setInterval> | null = null;
let running: Promise<void> | null = null;

/** One pass over the due e-mails; a pass already running is joined, not doubled. */
export function kickEmailWorker(db: PrismaClient): Promise<void> {
  running ??= drainOutbox(db)
    .then((r) => {
      if (r.sent + r.skipped + r.retried + r.failed > 0) logEvent("email.outbox", { ...r });
    })
    .catch((err: unknown) => logError("email.worker", err))
    .finally(() => {
      running = null;
    });
  return running;
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
