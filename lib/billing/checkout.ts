/**
 * Starting a purchase (POST /api/billing/checkout): a Stripe Checkout session
 * in payment mode for one Pass or several (a cart: one Pass per
 * certification, paid at once). The browser only names the plan and the
 * certifications; each price is read here: the certification's own price for
 * the plan, or the plan's (./prices.ts). One payment row per Pass, grouped by
 * checkoutId. Nothing is granted here: the rights come with the verified
 * webhook (./webhook.ts).
 */
import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AccessError } from "@/lib/access";
import { getOffers } from "@/lib/access/offers";
import { logError } from "@/lib/log";
import { readSwitches } from "@/lib/settings";
import { priceFor, priceRange, pricesByCertification, type CertificationPrice } from "./prices";
import type { StripeApi } from "./stripe";
import { MAX_CART } from "./cart";
import { INVOICE_FOOTER, liveSalesBlocked, TERMS_VERSION, waiverText } from "./terms";

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

const code = z.string().trim().min(1).max(32);

/**
 * The plan and the certifications of a purchase: `certificationCodes` (a
 * cart), or `certificationCode` for one Pass. Codes are lower-cased and
 * deduplicated: one Pass per certification in a purchase. `waiver` is the
 * box the buyer ticked (immediate access, right of withdrawal waived, terms
 * accepted): no purchase without it. `locale` is the language of the page,
 * that of the text ticked (the account's otherwise): the API route sets it
 * from the request, never from the body.
 */
export const checkoutSchema = z
  .object({
    planCode: z.string().trim().min(1).max(64),
    certificationCode: code.optional(),
    certificationCodes: z.array(code).min(1).max(MAX_CART).optional(),
    waiver: z.literal(true),
    locale: z.enum(["en", "fr"]).optional(),
  })
  .refine((v) => (v.certificationCode === undefined) !== (v.certificationCodes === undefined), "certificationCode or certificationCodes")
  .transform(({ planCode, certificationCode, certificationCodes, locale }) => ({
    planCode,
    certificationCodes: [...new Set((certificationCodes ?? [certificationCode!]).map((c) => c.toLowerCase()))],
    locale,
  }));

/** A Checkout session stays payable this long (Stripe accepts 30 minutes to 24 hours). */
export const CHECKOUT_MINUTES = 60;

/**
 * The active certifications whose Pass can be bought online now, with their
 * price: payment open, Stripe configured, and a Stripe price for the
 * certification's price. Empty when nothing can be bought.
 */
export async function buyableCertifications(db: PrismaClient, planCode: string, stripe: StripeApi | null): Promise<CertificationPrice[]> {
  if (!stripe || !process.env.AUTH_URL || liveSalesBlocked()) return [];
  const [switches, prices] = await Promise.all([readSwitches(db), pricesByCertification(db, planCode)]);
  return switches.checkoutOpen ? prices.filter((p) => p.stripePriceId) : [];
}

export interface PassPricing {
  /** The Pass price of every active certification. */
  prices: CertificationPrice[];
  /** Those that can be bought online now (see buyableCertifications). */
  buyable: CertificationPrice[];
  /** The lowest and highest prices, for a "from X" label; null without price or with mixed currencies. */
  range: { min: number; max: number; currency: string } | null;
}

/** The Pass prices shown on the landing, pricing and offer pages. */
export async function passPricing(db: PrismaClient, planCode: string, stripe: StripeApi | null): Promise<PassPricing> {
  const [prices, buyable] = await Promise.all([pricesByCertification(db, planCode), buyableCertifications(db, planCode, stripe)]);
  return { prices, buyable, range: priceRange(prices) };
}

/** The user's Stripe customer, created on their first purchase. */
async function ensureCustomer(db: PrismaClient, stripe: StripeApi, user: { id: string; email: string; locale: string }) {
  const existing = await db.billingCustomer.findUnique({ where: { userId: user.id } });
  if (existing) return existing;
  // A new idempotency key for each purchase: the client's own network retries
  // reuse it, but a later purchase never gets Stripe's cached answer, which
  // would name a customer deleted meanwhile (forgetCustomer).
  const customer = await stripe.customers.create(
    { email: user.email, preferred_locales: [user.locale], metadata: { userId: user.id } },
    { idempotencyKey: `customer-${user.id}-${randomUUID()}` },
  );
  try {
    return await db.billingCustomer.create({ data: { userId: user.id, stripeCustomerId: customer.id } });
  } catch (err) {
    if ((err as Prisma.PrismaClientKnownRequestError).code !== "P2002") {
      await forgetCustomer(db, stripe, customer.id);
      throw err;
    }
    // Another checkout started at once stored its own customer first: this
    // one is not kept, at Stripe either.
    const stored = await db.billingCustomer.findUniqueOrThrow({ where: { userId: user.id } });
    if (stored.stripeCustomerId !== customer.id) await forgetCustomer(db, stripe, customer.id);
    return stored;
  }
}

/**
 * A Stripe customer created but not stored (the database failed, or another
 * checkout stored its own first) would keep the e-mail address with nothing
 * here to erase it later (lib/billing/erase.ts): deleted at once, unless it
 * was stored meanwhile. Best effort:
 * a failure here is logged, the checkout's own error is what the caller sees.
 */
async function forgetCustomer(db: PrismaClient, stripe: StripeApi, stripeCustomerId: string) {
  try {
    if (await db.billingCustomer.findUnique({ where: { stripeCustomerId }, select: { id: true } })) return;
    await stripe.customers.del(stripeCustomerId);
  } catch (cleanup) {
    logError("billing.customer_cleanup", cleanup);
  }
}

export async function startCheckout(
  db: PrismaClient,
  stripe: StripeApi | null,
  userId: string,
  input: z.input<typeof checkoutSchema>,
  { base = process.env.AUTH_URL, now = new Date() }: { base?: string; now?: Date } = {},
): Promise<{ url: string }> {
  const { planCode, certificationCodes, locale } = checkoutSchema.parse(input);
  const [switches, offers, user, plan, found] = await Promise.all([
    readSwitches(db),
    getOffers(db),
    db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, locale: true, emailVerified: true } }),
    db.plan.findUnique({ where: { code: planCode } }),
    db.certification.findMany({ where: { code: { in: certificationCodes }, active: true }, select: { id: true, code: true, title: true } }),
  ]);
  // Live payment waits for final terms (lib/billing/terms.ts), whatever the switch says.
  if (!switches.checkoutOpen || liveSalesBlocked()) throw new BillingError("sales_closed");
  if (!user) throw new BillingError("not_found");
  // Paying needs a verified address (specs des offres §4), like taking an exam.
  if (!user.emailVerified) throw new AccessError("email_unverified");
  // Only a Pass on sale can be bought here (subscriptions come with lot D).
  if (!plan || plan.kind !== "pass" || !offers.some((o) => o.code === plan.code)) throw new BillingError("not_found");
  // Every certification asked must be on sale, in the order asked.
  const certifications = certificationCodes.map((c) => found.find((f) => f.code === c));
  if (certifications.some((c) => !c)) throw new BillingError("not_found");
  // The certification's own price for the plan, or the plan's.
  const lines = await Promise.all(certifications.map(async (c) => ({ certification: c!, price: await priceFor(db, plan, c!.id) })));
  if (!stripe || !base || !plan.durationDays || lines.some((l) => !l.price.stripePriceId)) throw new BillingError("unavailable");
  // One Checkout session charges one currency.
  if (new Set(lines.map((l) => l.price.currency.toLowerCase())).size > 1) throw new BillingError("unavailable");

  const customer = await ensureCustomer(db, stripe, user);
  const checkoutId = randomUUID();
  // The waiver as ticked, kept with each Pass of the purchase (proof of the express consent).
  const waiver = { waiverAcceptedAt: now, waiverText: waiverText(locale ?? user.locale), termsVersion: TERMS_VERSION };
  await db.payment.createMany({
    data: lines.map((l) => ({ checkoutId, billingCustomerId: customer.id, planId: plan.id, certificationId: l.certification.id, amountCents: l.price.amountCents, currency: l.price.currency, ...waiver })),
  });
  const codes = lines.map((l) => l.certification.code.toUpperCase());
  let session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer: customer.stripeCustomerId,
        client_reference_id: checkoutId,
        line_items: lines.map((l) => ({ price: l.price.stripePriceId!, quantity: 1 })),
        metadata: { checkoutId, planCode: plan.code, certificationCodes: lines.map((l) => l.certification.code).join(",") },
        payment_intent_data: { metadata: { checkoutId }, description: `Pass ${codes.join(", ")} — ${plan.durationDays} days` },
        // A Stripe invoice for the purchase, found again by its metadata (webhook: invoice.finalized).
        invoice_creation: { enabled: true, invoice_data: { metadata: { checkoutId }, footer: INVOICE_FOOTER, description: `Pass ${codes.join(", ")} — ${plan.durationDays} days` } },
        custom_text: { submit: { message: lines.length === 1 ? `${codes[0]} — ${lines[0]!.certification.title}` : codes.join(", ") } },
        locale: user.locale === "fr" ? "fr" : "en",
        expires_at: Math.floor(now.getTime() / 1000) + CHECKOUT_MINUTES * 60,
        success_url: `${new URL("/billing/success", base)}?session_id={CHECKOUT_SESSION_ID}`,
        // The whole cart, so that it is ticked again on the way back.
        cancel_url: new URL(`/billing/cancel?${new URLSearchParams({ certification: lines.map((l) => l.certification.code).join(",") })}`, base).toString(),
      },
      { idempotencyKey: `checkout-${checkoutId}` },
    );
  } catch (err) {
    // Refused by Stripe (a 4xx answer): no session, nothing to pay, nothing
    // to keep. Any other failure (time-out, network, Stripe down) may come
    // after Stripe created the session: the payments stay pending, so that
    // the webhook still finds them if the buyer pays.
    if (refusedByStripe(err)) await db.payment.deleteMany({ where: { checkoutId } });
    throw err;
  }
  if (!session.url) {
    // Nothing to send the buyer to: the session is closed so it cannot be paid.
    await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
    await db.payment.updateMany({ where: { checkoutId }, data: { stripeCheckoutSessionId: session.id, status: "expired" } });
    throw new BillingError("unavailable");
  }
  // If this fails, the webhook still finds the payments by metadata.checkoutId.
  await db.payment.updateMany({ where: { checkoutId }, data: { stripeCheckoutSessionId: session.id } });
  return { url: session.url };
}

/** A definitive answer from Stripe: the request was refused, nothing was created. 409 (a conflict) is not. */
function refusedByStripe(err: unknown): boolean {
  const status = (err as { statusCode?: unknown } | null)?.statusCode;
  return typeof status === "number" && status >= 400 && status < 500 && status !== 409;
}

/** The statuses a purchase's Passes share; the order says which one a purchase shows when they differ. */
const PURCHASE_ORDER = ["pending", "held", "failed", "expired", "disputed", "refunded", "paid"] as const;

/**
 * State of one of the user's purchases, by its Checkout session (the return
 * page polls it): one entry per Pass, in certification order, and the status
 * of the purchase. The webhook settles the Passes of a purchase together;
 * should they differ (one refunded since), the first in PURCHASE_ORDER shows.
 */
export async function purchaseStatus(db: PrismaClient, userId: string, sessionId: string) {
  const payments = await db.payment.findMany({
    where: { stripeCheckoutSessionId: sessionId, customer: { userId } },
    orderBy: { certification: { code: "asc" } },
    select: { status: true, paidAt: true, certification: { select: { code: true } }, entitlement: { select: { startsAt: true, expiresAt: true } } },
  });
  if (payments.length === 0) throw new BillingError("not_found");
  const status = PURCHASE_ORDER.find((s) => payments.some((p) => p.status === s)) ?? payments[0]!.status;
  return {
    status,
    passes: payments.map((payment) => {
      const pass = payment.entitlement;
      return {
        status: payment.status,
        certification: payment.certification.code,
        startsAt: pass?.startsAt.toISOString() ?? null,
        expiresAt: pass?.expiresAt.toISOString() ?? null,
        /** Bought while a Pass was running: it starts when that one ends. */
        chained: !!pass && !!payment.paidAt && pass.startsAt > payment.paidAt,
      };
    }),
  };
}

/** The user's payments, newest first (/account/billing): abandoned or unfinished checkouts left out. */
export function paymentHistory(db: PrismaClient, userId: string) {
  return db.payment.findMany({
    where: { customer: { userId }, status: { in: ["paid", "held", "refunded", "disputed", "failed"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      amountCents: true,
      chargedCents: true,
      chargedCurrency: true,
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
 * by hand (/admin/billing). The first `take` set the carts shown, and each
 * cart comes whole, so that its total is right (a page can then hold a few
 * more rows).
 */
export async function heldPayments(db: PrismaClient, take = 100) {
  // The payments of one cart side by side.
  const orderBy = [{ paidAt: "asc" }, { checkoutId: "asc" }, { id: "asc" }] satisfies Prisma.PaymentOrderByWithRelationInput[];
  const page = await db.payment.findMany({ where: { status: "held" }, orderBy, take, select: { checkoutId: true } });
  return db.payment.findMany({
    where: { status: "held", checkoutId: { in: [...new Set(page.map((p) => p.checkoutId))] } },
    orderBy,
    select: {
      id: true,
      checkoutId: true,
      paidAt: true,
      amountCents: true,
      chargedCents: true,
      chargedCurrency: true,
      currency: true,
      stripePaymentIntentId: true,
      certification: { select: { code: true } },
      customer: { select: { user: { select: { id: true, email: true } } } },
    },
  });
}
