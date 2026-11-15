/**
 * The right to erasure reaches Stripe. A Stripe customer holds the buyer's
 * e-mail address; once the account is deleted, whatever deleted it, its
 * billing_customer row loses its user (onDelete: SetNull) and this deletes the
 * Stripe customer too. The payments stay, here and at Stripe, as accounting
 * records without the person; the row stays for them, with only Stripe's id.
 *
 * Run by the worker of lib/email/worker.ts. A failure is retried later, with
 * a growing wait (at most a day), until it succeeds.
 */
import type { PrismaClient } from "@prisma/client";
import { logError } from "@/lib/log";
import type { StripeApi } from "./stripe";

const MINUTE_MS = 60_000;
const MAX_WAIT_MS = 24 * 60 * MINUTE_MS;
/** Customers handled per pass of the worker. */
const BATCH = 20;

export interface EraseResult {
  erased: number;
  failed: number;
}

/** Already gone at Stripe (deleted from the dashboard, for example): nothing left to delete. */
function isMissing(err: unknown): boolean {
  const e = err as { code?: unknown; statusCode?: unknown } | null;
  return e?.code === "resource_missing" || e?.statusCode === 404;
}

/** Wait before the next try: 2, 4, 8… minutes, at most a day. */
export function eraseRetryDelay(attempts: number): number {
  return Math.min(MINUTE_MS * 2 ** Math.min(attempts, 20), MAX_WAIT_MS);
}

/** Deletes at Stripe the customers of deleted accounts that are due. Without Stripe configured, nothing. */
export async function eraseDeletedCustomers(db: PrismaClient, stripe: Pick<StripeApi, "customers"> | null, now = new Date()): Promise<EraseResult> {
  const result: EraseResult = { erased: 0, failed: 0 };
  if (!stripe) return result;
  const due = await db.billingCustomer.findMany({
    where: { userId: null, stripeDeletedAt: null, OR: [{ eraseAfter: null }, { eraseAfter: { lte: now } }] },
    orderBy: { createdAt: "asc" },
    take: BATCH,
    select: { id: true, stripeCustomerId: true, eraseAttempts: true },
  });
  for (const customer of due) {
    try {
      await stripe.customers.del(customer.stripeCustomerId);
    } catch (err) {
      if (!isMissing(err)) {
        const attempts = customer.eraseAttempts + 1;
        await db.billingCustomer.update({ where: { id: customer.id }, data: { eraseAttempts: attempts, eraseAfter: new Date(now.getTime() + eraseRetryDelay(attempts)) } });
        logError("billing.erase", err);
        result.failed++;
        continue;
      }
    }
    await db.billingCustomer.update({ where: { id: customer.id }, data: { stripeDeletedAt: now, eraseAfter: null } });
    result.erased++;
  }
  return result;
}
