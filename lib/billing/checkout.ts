/**
 * Starting a purchase (POST /api/billing/checkout): a Stripe Checkout session
 * in payment mode for one Pass. The browser only names the plan and the
 * certification; the price is the plan's, read here. Nothing is granted here:
 * the right comes with the verified webhook (./webhook.ts).
 */
import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AccessError } from "@/lib/access";
import { getOffers } from "@/lib/access/offers";
import { readSwitches } from "@/lib/settings";
import type { StripeApi } from "./stripe";

export type BillingErrorCode = "sales_closed" | "unavailable" | "not_found" | "rate_limited";

const STATUS: Record<BillingErrorCode, number> = { sales_closed: 403, unavailable: 503, not_found: 404, rate_limited: 429 };

export class BillingError extends Error {
  readonly status: number;
  constructor(readonly code: BillingErrorCode) {
    super(code);
    this.name = "BillingError";
    this.status = STATUS[code];
  }
}

export const checkoutSchema = z.object({
  planCode: z.string().trim().min(1).max(64),
  certificationCode: z.string().trim().min(1).max(32),
});

/** A Checkout session stays payable this long (Stripe accepts 30 minutes to 24 hours). */
export const CHECKOUT_MINUTES = 60;

/** Whether the Pass can be bought online now: payment open, Stripe configured, a Stripe price for the plan. */
export async function canBuyOnline(db: PrismaClient, planCode: string, stripe: StripeApi | null): Promise<boolean> {
  if (!stripe || !process.env.AUTH_URL) return false;
  const [switches, plan] = await Promise.all([readSwitches(db), db.plan.findUnique({ where: { code: planCode }, select: { stripePriceId: true } })]);
  return switches.checkoutOpen && !!plan?.stripePriceId;
}

/** The user's Stripe customer, created on their first purchase. */
async function ensureCustomer(db: PrismaClient, stripe: StripeApi, user: { id: string; email: string; locale: string }) {
  const existing = await db.billingCustomer.findUnique({ where: { userId: user.id } });
  if (existing) return existing;
  // Two checkouts started at once send the same idempotency key: Stripe
  // creates one customer and answers both with it. Stripe refuses a key sent
  // again with other parameters for 24 hours: the key changes with them.
  const params = { email: user.email, preferred_locales: [user.locale], metadata: { userId: user.id } };
  const digest = createHash("sha256").update(JSON.stringify(params)).digest("hex").slice(0, 16);
  const customer = await stripe.customers.create(params, { idempotencyKey: `customer-${user.id}-${digest}` });
  try {
    return await db.billingCustomer.create({ data: { userId: user.id, stripeCustomerId: customer.id } });
  } catch (err) {
    if ((err as Prisma.PrismaClientKnownRequestError).code !== "P2002") throw err;
    // The other checkout stored it first.
    return db.billingCustomer.findUniqueOrThrow({ where: { userId: user.id } });
  }
}

export async function startCheckout(
  db: PrismaClient,
  stripe: StripeApi | null,
  userId: string,
  input: z.input<typeof checkoutSchema>,
  { base = process.env.AUTH_URL, now = new Date() }: { base?: string; now?: Date } = {},
): Promise<{ url: string }> {
  const { planCode, certificationCode } = checkoutSchema.parse(input);
  const [switches, offers, user, plan, certification] = await Promise.all([
    readSwitches(db),
    getOffers(db),
    db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, locale: true, emailVerified: true } }),
    db.plan.findUnique({ where: { code: planCode } }),
    db.certification.findFirst({ where: { code: certificationCode, active: true }, select: { id: true, code: true, title: true } }),
  ]);
  if (!switches.checkoutOpen) throw new BillingError("sales_closed");
  if (!user) throw new BillingError("not_found");
  // Paying needs a verified address (specs des offres §4), like taking an exam.
  if (!user.emailVerified) throw new AccessError("email_unverified");
  // Only a Pass on sale can be bought here (subscriptions come with lot D).
  if (!plan || plan.kind !== "pass" || !offers.some((o) => o.code === plan.code)) throw new BillingError("not_found");
  if (!certification) throw new BillingError("not_found");
  if (!stripe || !base || !plan.stripePriceId || !plan.durationDays) throw new BillingError("unavailable");

  const customer = await ensureCustomer(db, stripe, user);
  const payment = await db.payment.create({
    data: { billingCustomerId: customer.id, planId: plan.id, certificationId: certification.id, amountCents: plan.amountCents, currency: plan.currency },
  });
  let session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer: customer.stripeCustomerId,
        client_reference_id: payment.id,
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        metadata: { paymentId: payment.id, planCode: plan.code, certificationCode: certification.code },
        payment_intent_data: { metadata: { paymentId: payment.id }, description: `Pass ${certification.code.toUpperCase()} — ${plan.durationDays} days` },
        custom_text: { submit: { message: `${certification.code.toUpperCase()} — ${certification.title}` } },
        locale: user.locale === "fr" ? "fr" : "en",
        expires_at: Math.floor(now.getTime() / 1000) + CHECKOUT_MINUTES * 60,
        success_url: `${new URL("/billing/success", base)}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: new URL(`/billing/cancel?${new URLSearchParams({ certification: certification.code })}`, base).toString(),
      },
      { idempotencyKey: `checkout-${payment.id}` },
    );
  } catch (err) {
    // No session: nothing to pay, nothing to keep.
    await db.payment.delete({ where: { id: payment.id } });
    throw err;
  }
  if (!session.url) {
    // Nothing to send the buyer to: the session is closed so it cannot be paid.
    await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
    await db.payment.update({ where: { id: payment.id }, data: { stripeCheckoutSessionId: session.id, status: "expired" } });
    throw new BillingError("unavailable");
  }
  // If this fails, the webhook still finds the payment by metadata.paymentId.
  await db.payment.update({ where: { id: payment.id }, data: { stripeCheckoutSessionId: session.id } });
  return { url: session.url };
}

/** State of one of the user's purchases, by its Checkout session (the return page polls it). */
export async function purchaseStatus(db: PrismaClient, userId: string, sessionId: string) {
  const payment = await db.payment.findFirst({
    where: { stripeCheckoutSessionId: sessionId, customer: { userId } },
    select: { status: true, paidAt: true, certification: { select: { code: true } }, entitlement: { select: { startsAt: true, expiresAt: true } } },
  });
  if (!payment) throw new BillingError("not_found");
  const pass = payment.entitlement;
  return {
    status: payment.status,
    certification: payment.certification.code,
    startsAt: pass?.startsAt.toISOString() ?? null,
    expiresAt: pass?.expiresAt.toISOString() ?? null,
    /** Bought while a Pass was running: it starts when that one ends. */
    chained: !!pass && !!payment.paidAt && pass.startsAt > payment.paidAt,
  };
}

/** The user's payments, newest first (/account/billing): abandoned or unfinished checkouts left out. */
export function paymentHistory(db: PrismaClient, userId: string) {
  return db.payment.findMany({
    where: { customer: { userId }, status: { in: ["paid", "held", "refunded", "failed"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      amountCents: true,
      chargedCents: true,
      currency: true,
      createdAt: true,
      paidAt: true,
      invoiceUrl: true,
      plan: { select: { kind: true, durationDays: true } },
      certification: { select: { code: true } },
      entitlement: { select: { startsAt: true, expiresAt: true } },
    },
  });
}

/**
 * Payments held for an administrator (charged below the plan price, or in
 * another currency), oldest first: refund them in Stripe or grant the Pass
 * by hand (/admin/billing).
 */
export function heldPayments(db: PrismaClient) {
  return db.payment.findMany({
    where: { status: "held" },
    orderBy: { paidAt: "asc" },
    take: 100,
    select: {
      id: true,
      paidAt: true,
      amountCents: true,
      chargedCents: true,
      currency: true,
      stripePaymentIntentId: true,
      certification: { select: { code: true } },
      customer: { select: { user: { select: { id: true, email: true } } } },
    },
  });
}
