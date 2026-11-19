/**
 * Stripe events (POST /api/webhooks/stripe). The only place where a purchase
 * grants a right (specs des offres §1): the return page never does.
 *
 * Idempotence: each event is recorded in stripe_event in the same transaction
 * as its effects. An event received again once processed changes nothing; one
 * whose processing failed is rolled back whole and processed again when
 * Stripe retries it. Several events can report the same purchase
 * (checkout.session.completed, then async_payment_succeeded): its payment
 * rows (one per Pass, see checkoutId) are locked and a paid payment is never
 * fulfilled twice; entitlement.paymentId is unique as a last guard.
 *
 * After the purchase (offers lot C): the invoice's page is recorded
 * (invoice.finalized, invoice.paid), a full refund withdraws the Passes of the
 * payment (charge.refunded), and so does a dispute while it lasts
 * (charge.dispute.created, or charge.dispute.updated when an inquiry becomes
 * one); a dispute won makes the payments paid again (charge.dispute.closed). A cart shares one Stripe payment: its Passes go
 * together. A partial refund is left to an administrator, who knows which
 * Pass it is for.
 */
import type { PaymentStatus, Prisma, PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import { addPass } from "@/lib/access/passes";
import { auditMany } from "@/lib/audit";
import { enqueuePassEmails } from "@/lib/email/outbox";
import { logEvent } from "@/lib/log";

/**
 * held: paid, but no Pass can be granted (charged too little, another
 * currency, account deleted): payment status held, for an administrator.
 * review: a partial refund, or a dispute won, that an administrator settles
 * by hand (which Pass to withdraw, or give back).
 */
export type WebhookOutcome = "processed" | "duplicate" | "ignored" | "held" | "review";

/** Kept in stripe_event.error for a held payment, so that it stands out. */
export const HELD_NOTE = "held for review: charged below the plan price or in another currency, or the account was deleted; no Pass granted";
/** Kept in stripe_event.error for an event an administrator settles by hand. */
export const REVIEW_NOTE = "for review: a partial refund (no Pass withdrawn: revoke the one it is for) or a dispute won (Passes still withdrawn: grant them again if wanted), in /admin/billing";

/** What stripe_event.error keeps for an event an administrator has to look at. */
const NOTES: Partial<Record<WebhookOutcome, string>> = { held: HELD_NOTE, review: REVIEW_NOTE };

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
      await tx.stripeEvent.update({ where: { id: event.id }, data: { processedAt: now, error: NOTES[outcome] ?? null } });
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
    case "invoice.finalized":
    case "invoice.paid":
      return recordInvoice(tx, event.data.object);
    case "charge.refunded":
      return refund(tx, event, now);
    case "charge.dispute.created":
    case "charge.dispute.updated":
      return dispute(tx, event, now);
    case "charge.dispute.closed":
      return closeDispute(tx, event, now);
    default:
      return Promise.resolve("ignored");
  }
}

/**
 * The payments of the purchase a session is for (one per Pass), locked until
 * the end of the transaction, in id order. Empty for a session Certidrill did
 * not create (another application on the same Stripe account) or that does
 * not match the recorded one. Sessions created before carts name their one
 * payment by paymentId, which is also its checkoutId.
 */
async function lockPayments(tx: Tx, session: Stripe.Checkout.Session) {
  if (session.mode !== "payment") return [];
  const checkoutId = session.metadata?.checkoutId ?? session.metadata?.paymentId ?? session.client_reference_id;
  if (!checkoutId) return [];
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "payment" WHERE "checkoutId" = ${checkoutId} ORDER BY "id" FOR UPDATE`;
  if (rows.length === 0) return [];
  const payments = await tx.payment.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    orderBy: { id: "asc" },
    include: { customer: { select: { userId: true } }, plan: { select: { durationDays: true } } },
  });
  if (payments.some((p) => p.stripeCheckoutSessionId !== null && p.stripeCheckoutSessionId !== session.id)) {
    logEvent("billing.session_mismatch", { checkoutId, sessionId: session.id });
    return [];
  }
  return payments;
}

const intentId = (session: Stripe.Checkout.Session) =>
  typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);

/**
 * Shares an amount between the Passes of a purchase in proportion to their
 * prices, in whole cents, the remainder to the largest fractions: the shares
 * add up to the amount. One Pass gets it all.
 */
export function share(amount: number, weights: readonly number[]): number[] {
  const total = weights.reduce((n, w) => n + w, 0);
  if (weights.length === 1 || total === 0) return weights.map((_, i) => (i === 0 ? amount : 0));
  const exact = weights.map((w) => (amount * w) / total);
  const shares = exact.map(Math.floor);
  let left = amount - shares.reduce((n, x) => n + x, 0);
  const order = exact.map((x, i) => ({ i, rest: x - Math.floor(x) })).sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    shares[i]! += 1;
    left -= 1;
  }
  return shares;
}

/** Paid: records the amounts Stripe charged, then grants each Pass and queues its e-mails. */
async function fulfil(tx: Tx, session: Stripe.Checkout.Session, now: Date): Promise<WebhookOutcome> {
  const payments = await lockPayments(tx, session);
  if (payments.length === 0) return "ignored";
  // Already fulfilled (another event of the same purchase), held, or refunded since.
  const open = payments.filter((p) => p.status === "pending" || p.status === "failed" || p.status === "expired");
  if (open.length === 0) return "processed";
  // Stripe writes currencies in lower case; a plan may not.
  const currency = (session.currency ?? payments[0]!.currency).toLowerCase();
  const sameCurrency = payments.every((p) => p.currency.toLowerCase() === currency);
  const asked = payments.reduce((n, p) => n + p.amountCents, 0);
  // What Stripe charged is recorded either way, next to the prices asked. Less
  // than the prices (a Stripe price edited by hand or out of date, see npm
  // run stripe:sync-prices) grants nothing: the whole purchase is held for an
  // administrator to refund or grant by hand. More (tax added on top) is fine.
  const short = session.amount_total === null || session.amount_total < asked || !sameCurrency;
  if (session.amount_total !== asked || !sameCurrency) {
    logEvent("billing.amount_mismatch", { checkoutId: payments[0]!.checkoutId, expected: asked, charged: session.amount_total, currency, held: short });
  }
  // Each Pass's part of the total and of the tax, in proportion to its price.
  const weights = payments.map((p) => p.amountCents);
  const charged = session.amount_total === null ? null : share(session.amount_total, weights);
  const tax = share(session.total_details?.amount_tax ?? 0, weights);
  const userId = payments[0]!.customer.userId;
  let outcome: WebhookOutcome = "processed";
  for (const payment of open) {
    const index = payments.indexOf(payment);
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        // Held: no Pass can follow; an administrator refunds or grants by hand (/admin/billing).
        status: short || !userId ? "held" : "paid",
        paidAt: now,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: intentId(session),
        chargedCents: charged?.[index] ?? null,
        chargedCurrency: currency,
        taxCents: tax[index]!,
      },
    });
    if (short) {
      outcome = "held";
      continue;
    }
    if (!userId) {
      // The account was deleted before the payment was confirmed: refund by hand.
      logEvent("billing.paid_without_user", { paymentId: payment.id });
      outcome = "held";
      continue;
    }
    if (!payment.plan.durationDays) throw new Error(`plan of payment ${payment.id} has no duration`);
    const pass = await addPass(tx, { userId, certificationId: payment.certificationId, days: payment.plan.durationDays, source: "purchase", paymentId: payment.id, now });
    if (!pass) {
      // The account was deleted meanwhile (its row is locked only now): held too.
      await tx.payment.update({ where: { id: payment.id }, data: { status: "held" } });
      logEvent("billing.paid_without_user", { paymentId: payment.id });
      outcome = "held";
      continue;
    }
    await enqueuePassEmails(tx, { userId, paymentId: payment.id, certificationId: payment.certificationId, expiresAt: pass.expiresAt, now });
    logEvent("billing.pass_granted", { paymentId: payment.id, entitlementId: pass.id });
  }
  return outcome;
}

/** Completed but not paid yet (a delayed method): only the payment intent is recorded. */
async function track(tx: Tx, session: Stripe.Checkout.Session): Promise<WebhookOutcome> {
  const payments = await lockPayments(tx, session);
  if (payments.length === 0) return "ignored";
  const pending = payments.filter((p) => p.status === "pending").map((p) => p.id);
  if (pending.length > 0) await tx.payment.updateMany({ where: { id: { in: pending } }, data: { stripeCheckoutSessionId: session.id, stripePaymentIntentId: intentId(session) } });
  return "processed";
}

/** Failed or expired: only payments still pending change (a late event never undoes a payment). */
async function settle(tx: Tx, session: Stripe.Checkout.Session, status: Extract<PaymentStatus, "failed" | "expired">): Promise<WebhookOutcome> {
  const payments = await lockPayments(tx, session);
  if (payments.length === 0) return "ignored";
  const pending = payments.filter((p) => p.status === "pending").map((p) => p.id);
  if (pending.length > 0) await tx.payment.updateMany({ where: { id: { in: pending } }, data: { status } });
  return "processed";
}

/**
 * The invoice of a purchase (invoice_creation, ./checkout.ts): its page is
 * shown on /account/billing. Found by the checkoutId of its metadata, so the
 * order of the events does not matter; only Stripe's HTTPS page is kept.
 */
async function recordInvoice(tx: Tx, invoice: Stripe.Invoice): Promise<WebhookOutcome> {
  const checkoutId = invoice.metadata?.checkoutId;
  if (!checkoutId) return "ignored";
  const url = invoice.hosted_invoice_url?.startsWith("https://") ? invoice.hosted_invoice_url : null;
  const { count } = await tx.payment.updateMany({ where: { checkoutId }, data: { stripeInvoiceId: invoice.id, ...(url && { invoiceUrl: url }) } });
  return count === 0 ? "ignored" : "processed";
}

const idOf = (value: string | { id: string } | null | undefined) => (typeof value === "string" ? value : (value?.id ?? null));

/** The payments of a Stripe payment intent (one per Pass of the purchase), locked, with their Pass. */
async function lockByIntent(tx: Tx, intent: string | null) {
  if (!intent) return [];
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "payment" WHERE "stripePaymentIntentId" = ${intent} ORDER BY "id" FOR UPDATE`;
  if (rows.length === 0) return [];
  return tx.payment.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    orderBy: { id: "asc" },
    select: {
      id: true,
      status: true,
      disputeClosedAt: true,
      customer: { select: { userId: true } },
      entitlement: { select: { id: true, userId: true, source: true, expiresAt: true, revokedAt: true, certification: { select: { code: true } } } },
    },
  });
}

type IntentPayment = Awaited<ReturnType<typeof lockByIntent>>[number];

/** Withdraws the Passes of these payments, each with its trace in the audit log (no actor: Stripe). */
async function revokePasses(tx: Tx, payments: IntentPayment[], reason: "refund" | "dispute", event: Stripe.Event, now: Date) {
  const passes = payments.flatMap(({ entitlement: e }) => (e && !e.revokedAt ? [e] : []));
  if (passes.length === 0) return;
  await tx.entitlement.updateMany({ where: { id: { in: passes.map((e) => e.id) } }, data: { revokedAt: now } });
  await auditMany(
    tx,
    passes.map((e) => ({
      actorId: null,
      action: "entitlement.revoke",
      targetUserId: e.userId,
      details: { entitlementId: e.id, certification: e.certification.code, source: e.source, expiresAt: e.expiresAt.toISOString(), reason, stripeEvent: event.id },
    })),
  );
  for (const e of passes) logEvent("billing.pass_revoked", { entitlementId: e.id, reason });
}

/**
 * Refunded in Stripe. In full: every Pass of the payment is withdrawn and the
 * payments read refunded. In part: nothing changes here, as the part refunded
 * may be for one Pass of a cart, or a gesture: an administrator decides.
 */
async function refund(tx: Tx, event: Stripe.ChargeRefundedEvent, now: Date): Promise<WebhookOutcome> {
  const charge = event.data.object;
  const payments = await lockByIntent(tx, idOf(charge.payment_intent));
  if (payments.length === 0) return "ignored";
  // Already refunded in full: a later partial refund event (or a repeat) has nothing left to decide.
  if (payments.every((p) => p.status === "refunded")) return "processed";
  if (!charge.refunded) {
    logEvent("billing.partial_refund", { paymentIntent: idOf(charge.payment_intent), refunded: charge.amount_refunded, amount: charge.amount });
    return "review";
  }
  const settled = payments.filter((p) => p.status === "paid" || p.status === "held" || p.status === "disputed");
  if (settled.length === 0) return "processed";
  await tx.payment.updateMany({ where: { id: { in: settled.map((p) => p.id) } }, data: { status: "refunded" } });
  await revokePasses(tx, settled, "refund", event, now);
  return "processed";
}

/** A dispute still open (an inquiry, warning_*, is only a question from the bank; won and lost are over). */
const OPEN_DISPUTE = new Set<Stripe.Dispute.Status>(["needs_response", "under_review"]);

/**
 * Contested by the buyer with their bank: the Passes are withdrawn while the
 * dispute lasts. Opened directly (created), or by an inquiry the bank turns
 * into a dispute (updated). Only paid payments change: a held one has no Pass
 * and stays in the list for an administrator, so that closing the dispute
 * never makes it paid.
 */
async function dispute(tx: Tx, event: Stripe.ChargeDisputeCreatedEvent | Stripe.ChargeDisputeUpdatedEvent, now: Date): Promise<WebhookOutcome> {
  const contest = event.data.object;
  const payments = await lockByIntent(tx, idOf(contest.payment_intent));
  if (payments.length === 0) return "ignored";
  if (!OPEN_DISPUTE.has(contest.status)) return "processed";
  // Stripe does not keep the order of events: one opening the dispute that comes after its close changes nothing.
  const open = payments.filter((p) => p.status === "paid" && !p.disputeClosedAt);
  if (open.length === 0) return "processed";
  await tx.payment.updateMany({ where: { id: { in: open.map((p) => p.id) } }, data: { status: "disputed" } });
  await revokePasses(tx, open, "dispute", event, now);
  return "processed";
}

/**
 * The dispute is over. Lost: the money went back to the buyer, the Passes
 * stay withdrawn, or are withdrawn now if the close comes before the event
 * that opened the dispute (Stripe does not keep the order). Won: the payments are paid again, and an administrator
 * gives the Passes back by hand if they are still wanted (a Pass may have
 * been bought again meanwhile, or the account closed).
 */
async function closeDispute(tx: Tx, event: Stripe.ChargeDisputeClosedEvent, now: Date): Promise<WebhookOutcome> {
  const contest = event.data.object;
  const payments = await lockByIntent(tx, idOf(contest.payment_intent));
  if (payments.length === 0) return "ignored";
  // Closed, whatever the outcome: a late event that opens it again is ignored (dispute()).
  await tx.payment.updateMany({ where: { id: { in: payments.map((p) => p.id) }, disputeClosedAt: null }, data: { disputeClosedAt: now } });
  if (contest.status === "lost") {
    // Never seen open (events out of order): withdrawn now, as an open dispute would have.
    const paid = payments.filter((p) => p.status === "paid");
    if (paid.length > 0) {
      await tx.payment.updateMany({ where: { id: { in: paid.map((p) => p.id) } }, data: { status: "disputed" } });
      await revokePasses(tx, paid, "dispute", event, now);
    }
    return "processed";
  }
  const disputed = payments.filter((p) => p.status === "disputed");
  if (contest.status !== "won" || disputed.length === 0) return "processed";
  await tx.payment.updateMany({ where: { id: { in: disputed.map((p) => p.id) } }, data: { status: "paid" } });
  logEvent("billing.dispute_won", { paymentIntent: idOf(contest.payment_intent), payments: disputed.length });
  return "review";
}
