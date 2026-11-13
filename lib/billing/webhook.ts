/**
 * Stripe events (POST /api/webhooks/stripe). The only place where a purchase
 * grants a right (specs des offres §1): the return page never does.
 *
 * Idempotence: each event is recorded in stripe_event in the same transaction
 * as its effects. An event received again once processed changes nothing; one
 * whose processing failed is rolled back whole and processed again when
 * Stripe retries it. Several events can report the same payment
 * (checkout.session.completed, then async_payment_succeeded): the payment row
 * is locked and a paid payment is never fulfilled twice; entitlement.paymentId
 * is unique as a last guard.
 */
import type { PaymentStatus, Prisma, PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import { addPass } from "@/lib/access/passes";
import { enqueuePassEmails } from "@/lib/email/outbox";
import { logEvent } from "@/lib/log";

/** held: paid, but no Pass can be granted (charged too little, another currency, account deleted): payment status held, for an administrator. */
export type WebhookOutcome = "processed" | "duplicate" | "ignored" | "held";

/** Kept in stripe_event.error for a held payment, so that it stands out. */
export const HELD_NOTE = "held for review: charged below the plan price or in another currency, or the account was deleted; no Pass granted";

type Tx = Prisma.TransactionClient;

export async function handleStripeEvent(db: PrismaClient, event: Stripe.Event, now = new Date()): Promise<WebhookOutcome> {
  try {
    return await db.$transaction(async (tx) => {
      // Claims the event. A concurrent delivery of the same event waits here
      // for this transaction, then finds it processed.
      const claimed = await tx.$queryRaw<{ id: string }[]>`
        INSERT INTO "stripe_event" ("id", "type", "receivedAt") VALUES (${event.id}, ${event.type}, ${now})
        ON CONFLICT ("id") DO UPDATE SET "error" = NULL WHERE "stripe_event"."processedAt" IS NULL
        RETURNING "id"`;
      if (claimed.length === 0) return "duplicate";
      const outcome = await apply(tx, event, now);
      await tx.stripeEvent.update({ where: { id: event.id }, data: { processedAt: now, error: outcome === "held" ? HELD_NOTE : null } });
      return outcome;
    });
  } catch (err) {
    // Kept for the administrator; the event stays unprocessed and Stripe sends it again.
    const error = (err instanceof Error ? err.message : String(err)).slice(0, 1000);
    await db.stripeEvent
      .upsert({ where: { id: event.id }, create: { id: event.id, type: event.type, receivedAt: now, error }, update: { error } })
      .catch(() => undefined);
    throw err;
  }
}

function apply(tx: Tx, event: Stripe.Event, now: Date): Promise<WebhookOutcome> {
  switch (event.type) {
    case "checkout.session.completed":
      // Paid now (card), or later for delayed methods (async_payment_succeeded).
      // Nothing to pay (a 100 % discount, should one exist): fulfilled, and held below the price.
      return event.data.object.payment_status === "unpaid" ? track(tx, event.data.object) : fulfil(tx, event.data.object, now);
    case "checkout.session.async_payment_succeeded":
      return fulfil(tx, event.data.object, now);
    case "checkout.session.async_payment_failed":
      return settle(tx, event.data.object, "failed");
    case "checkout.session.expired":
      return settle(tx, event.data.object, "expired");
    default:
      return Promise.resolve("ignored");
  }
}

/**
 * The payment a session is for, locked until the end of the transaction.
 * Null for a session Certidrill did not create (another application on the
 * same Stripe account) or that does not match the recorded one.
 */
async function lockPayment(tx: Tx, session: Stripe.Checkout.Session) {
  if (session.mode !== "payment") return null;
  const id = session.metadata?.paymentId ?? session.client_reference_id;
  if (!id) return null;
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "payment" WHERE "id" = ${id} FOR UPDATE`;
  if (rows.length === 0) return null;
  const payment = await tx.payment.findUniqueOrThrow({
    where: { id },
    include: { customer: { select: { userId: true } }, plan: { select: { durationDays: true } } },
  });
  if (payment.stripeCheckoutSessionId !== null && payment.stripeCheckoutSessionId !== session.id) {
    logEvent("billing.session_mismatch", { paymentId: id, sessionId: session.id });
    return null;
  }
  return payment;
}

const intentId = (session: Stripe.Checkout.Session) =>
  typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);

/** Paid: records the amounts Stripe charged, then grants the Pass and queues its e-mails. */
async function fulfil(tx: Tx, session: Stripe.Checkout.Session, now: Date): Promise<WebhookOutcome> {
  const payment = await lockPayment(tx, session);
  if (!payment) return "ignored";
  // Already fulfilled (another event of the same payment), held, or refunded since.
  if (payment.status !== "pending" && payment.status !== "failed" && payment.status !== "expired") return "processed";
  // Stripe writes currencies in lower case; a plan may not.
  const currency = (session.currency ?? payment.currency).toLowerCase();
  const sameCurrency = currency === payment.currency.toLowerCase();
  // What Stripe charged is recorded either way, next to the price asked. Less
  // than the plan price (a Stripe price edited by hand or out of date, see npm
  // run stripe:sync-prices) grants nothing: the payment is held for an
  // administrator to refund or grant by hand. More (tax added on top) is fine.
  const short = session.amount_total === null || session.amount_total < payment.amountCents || !sameCurrency;
  if (session.amount_total !== payment.amountCents || !sameCurrency) {
    logEvent("billing.amount_mismatch", { paymentId: payment.id, expected: payment.amountCents, charged: session.amount_total, currency, held: short });
  }
  await tx.payment.update({
    where: { id: payment.id },
    data: {
      // Held: no Pass can follow; an administrator refunds or grants by hand (/admin/billing).
      status: short || !payment.customer.userId ? "held" : "paid",
      paidAt: now,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: intentId(session),
      chargedCents: session.amount_total,
      chargedCurrency: currency,
      taxCents: session.total_details?.amount_tax ?? 0,
    },
  });
  if (short) return "held";
  const userId = payment.customer.userId;
  if (!userId) {
    // The account was deleted before the payment was confirmed: refund by hand.
    logEvent("billing.paid_without_user", { paymentId: payment.id });
    return "held";
  }
  if (!payment.plan.durationDays) throw new Error(`plan of payment ${payment.id} has no duration`);
  const pass = await addPass(tx, { userId, certificationId: payment.certificationId, days: payment.plan.durationDays, source: "purchase", paymentId: payment.id, now });
  if (!pass) {
    // The account was deleted meanwhile (its row is locked only now): held too.
    await tx.payment.update({ where: { id: payment.id }, data: { status: "held" } });
    logEvent("billing.paid_without_user", { paymentId: payment.id });
    return "held";
  }
  await enqueuePassEmails(tx, { userId, paymentId: payment.id, certificationId: payment.certificationId, expiresAt: pass.expiresAt, now });
  logEvent("billing.pass_granted", { paymentId: payment.id, entitlementId: pass.id });
  return "processed";
}

/** Completed but not paid yet (a delayed method): only the payment intent is recorded. */
async function track(tx: Tx, session: Stripe.Checkout.Session): Promise<WebhookOutcome> {
  const payment = await lockPayment(tx, session);
  if (!payment) return "ignored";
  if (payment.status === "pending") await tx.payment.update({ where: { id: payment.id }, data: { stripeCheckoutSessionId: session.id, stripePaymentIntentId: intentId(session) } });
  return "processed";
}

/** Failed or expired: only a payment still pending changes (a late event never undoes a payment). */
async function settle(tx: Tx, session: Stripe.Checkout.Session, status: Extract<PaymentStatus, "failed" | "expired">): Promise<WebhookOutcome> {
  const payment = await lockPayment(tx, session);
  if (!payment) return "ignored";
  if (payment.status === "pending") await tx.payment.update({ where: { id: payment.id }, data: { status } });
  return "processed";
}
