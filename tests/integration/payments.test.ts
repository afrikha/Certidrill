/**
 * Buying a Pass (offers lot B) on a real PostgreSQL, without Stripe: the API
 * client is a fake that records its calls, and events are signed locally with
 * the webhook secret, as Stripe signs them. Covers the acceptance criteria of
 * the lot: no right without a verified webhook, an event received twice (or
 * at once, or out of order) gives one right and one payment.
 */
import path from "node:path";
import Stripe from "stripe";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma as db } from "@/lib/db";
import { loadCertification } from "@/lib/content/loader";
import { seedReferential } from "@/lib/content/seed";
import { createUser } from "@/lib/users";
import { getAccess } from "@/lib/access";
import { revokeEntitlement } from "@/lib/access/admin";
import { BillingError, canBuyOnline, CHECKOUT_MINUTES, heldPayments, paymentHistory, purchaseStatus, startCheckout } from "@/lib/billing/checkout";
import { apiBase, stripeApi, verifyEvent, WebhookSignatureError, type StripeApi } from "@/lib/billing/stripe";
import { handleStripeEvent, HELD_NOTE } from "@/lib/billing/webhook";
import { drainOutbox, MAX_ATTEMPTS, type Mail } from "@/lib/email/outbox";
import { kickEmailWorker, startEmailWorker, stopEmailWorker } from "@/lib/email/worker";
import { SWITCHES } from "@/lib/settings";

const session = vi.hoisted(() => ({ current: null as null | { user: { id: string; role: string; locale: string } } }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => session.current) }));
const afterQueue = vi.hoisted(() => [] as (() => unknown)[]);
vi.mock("next/server", async (original) => ({ ...(await original<typeof import("next/server")>()), after: (fn: () => unknown) => afterQueue.push(fn) }));

import * as checkoutRoute from "@/app/api/billing/checkout/route";
import * as statusRoute from "@/app/api/billing/status/route";
import * as webhookRoute from "@/app/api/webhooks/stripe/route";

const BASE = "http://localhost:3000";
const SECRET = "whsec_test_secret";
const T0 = new Date("2026-11-13T10:00:00Z");
const DAY = 86_400_000;
const at = (days: number) => new Date(T0.getTime() + days * DAY);

let certificationId: string;
let n = 0;

/** A Stripe stand-in: records what Certidrill asks, answers like the API. */
/** failCheckout: "refused" answers like a 4xx from Stripe, "timeout" like a call whose outcome is unknown. */
function fakeStripe({ failCheckout = null as "refused" | "timeout" | null, noUrl = false } = {}) {
  const calls = { customers: [] as unknown[][], sessions: [] as unknown[][], expired: [] as string[] };
  const api = {
    customers: {
      create: vi.fn(async (...args: unknown[]) => {
        calls.customers.push(args);
        return { id: `cus_${(args[1] as { idempotencyKey: string }).idempotencyKey}` };
      }),
    },
    checkout: {
      sessions: {
        create: vi.fn(async (...args: unknown[]) => {
          calls.sessions.push(args);
          if (failCheckout === "refused") throw Object.assign(new Error("No such price"), { type: "StripeInvalidRequestError", statusCode: 400 });
          if (failCheckout === "timeout") throw Object.assign(new Error("Request timed out"), { type: "StripeConnectionError" });
          const id = `cs_test_${++n}`;
          return { id, url: noUrl ? null : `https://checkout.stripe.test/${id}` };
        }),
        expire: vi.fn(async (id: string) => {
          calls.expired.push(id);
          return { id, status: "expired" };
        }),
      },
    },
  };
  return { api: api as unknown as StripeApi, calls };
}

const setSwitch = (key: string, value: boolean) => db.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
const openSales = () => setSwitch(SWITCHES.checkoutOpen, true);

async function verifiedUser(email: string, locale: "en" | "fr" = "en") {
  return (await createUser(db, { email, locale })).id;
}

/** A checkout started by `userId`; returns its payment row. */
async function checkout(userId: string, stripe = fakeStripe().api) {
  const { url } = await startCheckout(db, stripe, userId, { planCode: "pass_90", certificationCode: "az-104" }, { base: BASE, now: T0 });
  const id = url.split("/").at(-1)!;
  return db.payment.findUniqueOrThrow({ where: { stripeCheckoutSessionId: id } });
}

function sessionObject(payment: { id: string; stripeCheckoutSessionId: string | null }, extra: Record<string, unknown> = {}) {
  return {
    id: payment.stripeCheckoutSessionId,
    object: "checkout.session",
    mode: "payment",
    payment_status: "paid",
    client_reference_id: payment.id,
    metadata: { paymentId: payment.id },
    amount_total: 1900,
    currency: "eur",
    total_details: { amount_tax: 317 },
    payment_intent: "pi_123",
    ...extra,
  };
}

function event(type: string, object: Record<string, unknown>, id = `evt_${++n}`): Stripe.Event {
  return { id, object: "event", type, created: Math.floor(T0.getTime() / 1000), data: { object } } as unknown as Stripe.Event;
}

const paid = (payment: { id: string; stripeCheckoutSessionId: string | null }, id?: string) => event("checkout.session.completed", sessionObject(payment), id);

beforeAll(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "email_outbox","stripe_event","entitlement","payment","billing_customer","attempt_item","attempt_section","attempt","audit_log","question_report","question","case_study","question_series","objective","domain","blueprint","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
  );
  const content = await loadCertification(path.resolve(__dirname, "../../content/az-104"));
  await seedReferential(db, content);
  certificationId = (await db.certification.findUniqueOrThrow({ where: { code: "az-104" } })).id;
  await db.plan.update({ where: { code: "pass_90" }, data: { stripePriceId: "price_pass_90" } });
});
beforeEach(() => {
  session.current = null;
  afterQueue.length = 0;
});
afterAll(async () => {
  await setSwitch(SWITCHES.checkoutOpen, false);
  await db.plan.update({ where: { code: "pass_90" }, data: { stripePriceId: null } });
  await db.$disconnect();
});

describe("checkout", () => {
  it("is refused while online payment is closed, and for an unverified address", async () => {
    const user = await verifiedUser("closed@example.com");
    const input = { planCode: "pass_90", certificationCode: "az-104" };
    await expect(startCheckout(db, fakeStripe().api, user, input, { base: BASE })).rejects.toMatchObject({ code: "sales_closed", status: 403 });
    expect(await canBuyOnline(db, "pass_90", fakeStripe().api)).toBe(false);

    await openSales();
    const unverified = (await db.user.create({ data: { email: "unverified-buyer@example.com" } })).id;
    await expect(startCheckout(db, fakeStripe().api, unverified, input, { base: BASE })).rejects.toMatchObject({ code: "email_unverified", status: 403 });
    await expect(startCheckout(db, fakeStripe().api, "nobody", input, { base: BASE })).rejects.toMatchObject({ code: "not_found" });
  });

  it("sells only a Pass on sale, for an active certification, once Stripe is configured", async () => {
    await openSales();
    const user = await verifiedUser("catalogue@example.com");
    const stripe = fakeStripe().api;
    const tryBuy = (planCode: string, certificationCode = "az-104", options: { base?: string; api?: StripeApi | null } = {}) =>
      startCheckout(db, options.api === undefined ? stripe : options.api, user, { planCode, certificationCode }, { base: options.base ?? BASE });
    await expect(tryBuy("all_monthly")).rejects.toMatchObject({ code: "not_found" });
    await expect(tryBuy("free")).rejects.toMatchObject({ code: "not_found" });
    await expect(tryBuy("nope")).rejects.toMatchObject({ code: "not_found" });
    await expect(tryBuy("pass_90", "az-999")).rejects.toMatchObject({ code: "not_found" });
    await expect(tryBuy("pass_90", "az-104", { api: null })).rejects.toMatchObject({ code: "unavailable", status: 503 });
    await expect(startCheckout(db, stripe, user, { planCode: "pass_90", certificationCode: "az-104" }, { base: "" })).rejects.toMatchObject({ code: "unavailable" });
    await expect(tryBuy("")).rejects.toThrow();

    await db.plan.update({ where: { code: "pass_90" }, data: { active: false } });
    await expect(tryBuy("pass_90")).rejects.toMatchObject({ code: "not_found" });
    await db.plan.update({ where: { code: "pass_90" }, data: { active: true, stripePriceId: null } });
    await expect(tryBuy("pass_90")).rejects.toMatchObject({ code: "unavailable" });
    expect(await canBuyOnline(db, "pass_90", stripe)).toBe(false);
    await db.plan.update({ where: { code: "pass_90" }, data: { stripePriceId: "price_pass_90" } });
    // Same answer whatever the machine's .env holds: CI has no AUTH_URL.
    try {
      vi.stubEnv("AUTH_URL", "");
      expect(await canBuyOnline(db, "pass_90", stripe)).toBe(false);
      vi.stubEnv("AUTH_URL", BASE);
      expect(await canBuyOnline(db, "pass_90", stripe)).toBe(true);
      expect(await canBuyOnline(db, "pass_90", null)).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
    expect(await db.payment.count({ where: { customer: { userId: user } } })).toBe(0);
  });

  it("creates a pending payment and a Checkout session from the plan, never from the browser", async () => {
    await openSales();
    const user = await verifiedUser("buyer@example.com", "fr");
    const { api, calls } = fakeStripe();
    const payment = await checkout(user, api);
    expect(payment).toMatchObject({ status: "pending", amountCents: 1900, currency: "eur", certificationId });
    const [params, options] = calls.sessions[0] as [Stripe.Checkout.SessionCreateParams, { idempotencyKey: string }];
    expect(params).toMatchObject({
      mode: "payment",
      customer: expect.stringMatching(new RegExp(`^cus_customer-${user}-[0-9a-f]{16}$`)),
      client_reference_id: payment.id,
      line_items: [{ price: "price_pass_90", quantity: 1 }],
      metadata: { paymentId: payment.id, planCode: "pass_90", certificationCode: "az-104" },
      locale: "fr",
      expires_at: Math.floor(T0.getTime() / 1000) + CHECKOUT_MINUTES * 60,
      success_url: `${BASE}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE}/billing/cancel?certification=az-104`,
    });
    expect(JSON.stringify(params)).not.toContain("1900");
    expect(options.idempotencyKey).toBe(`checkout-${payment.id}`);
    expect(calls.customers[0]).toEqual([
      { email: "buyer@example.com", preferred_locales: ["fr"], metadata: { userId: user } },
      { idempotencyKey: expect.stringMatching(new RegExp(`^customer-${user}-[0-9a-f]{16}$`)) },
    ]);

    // A second purchase reuses the Stripe customer.
    await checkout(user, api);
    expect(calls.customers).toHaveLength(1);
    expect(await db.billingCustomer.count({ where: { userId: user } })).toBe(1);
    // Nothing is granted before the webhook, even with the session id in hand.
    expect(await getAccess(db, user, certificationId, T0)).toMatchObject({ level: "free" });
    expect(await purchaseStatus(db, user, payment.stripeCheckoutSessionId!)).toEqual({ status: "pending", certification: "az-104", startsAt: null, expiresAt: null, chained: false });
  });

  it("stores one Stripe customer when two checkouts start at once", async () => {
    await openSales();
    const user = await verifiedUser("twice@example.com");
    const { api } = fakeStripe();
    await Promise.all([checkout(user, api), checkout(user, api)]);
    expect(await db.billingCustomer.count({ where: { userId: user } })).toBe(1);
    expect(await db.payment.count({ where: { customer: { userId: user } } })).toBe(2);
  });

  it("sends a new idempotency key once the address changed, so Stripe does not refuse it", async () => {
    await openSales();
    const user = await verifiedUser("moved@example.com");
    const { api, calls } = fakeStripe({ failCheckout: "refused" });
    await expect(checkout(user, api)).rejects.toThrow("No such price");
    await db.billingCustomer.deleteMany({ where: { userId: user } });
    await db.user.update({ where: { id: user }, data: { email: "moved-again@example.com" } });
    await expect(checkout(user, api)).rejects.toThrow("No such price");
    const [first, second] = calls.customers.map((c) => (c[1] as { idempotencyKey: string }).idempotencyKey);
    expect(first).not.toBe(second);
  });

  it("closes a session Stripe answered without a payment page", async () => {
    await openSales();
    const user = await verifiedUser("no-url@example.com");
    const { api, calls } = fakeStripe({ noUrl: true });
    await expect(checkout(user, api)).rejects.toMatchObject({ code: "unavailable" });
    expect(calls.expired).toHaveLength(1);
    expect(await db.payment.findFirstOrThrow({ where: { customer: { userId: user } } })).toMatchObject({ status: "expired", stripeCheckoutSessionId: calls.expired[0] });
  });

  it("keeps no payment when Stripe refuses the session, and keeps it when the outcome is unknown", async () => {
    await openSales();
    const user = await verifiedUser("stripe-down@example.com");
    await expect(checkout(user, fakeStripe({ failCheckout: "refused" }).api)).rejects.toThrow("No such price");
    expect(await db.payment.count({ where: { customer: { userId: user } } })).toBe(0);
    // A time-out: Stripe may have created the session. Paid later, it still grants the Pass.
    await expect(checkout(user, fakeStripe({ failCheckout: "timeout" }).api)).rejects.toThrow("Request timed out");
    const kept = await db.payment.findFirstOrThrow({ where: { customer: { userId: user } } });
    expect(kept).toMatchObject({ status: "pending", stripeCheckoutSessionId: null });
    const session = { ...sessionObject(kept), id: "cs_created_anyway" };
    expect(await handleStripeEvent(db, event("checkout.session.completed", session), T0)).toBe("processed");
    expect(await db.payment.findUniqueOrThrow({ where: { id: kept.id } })).toMatchObject({ status: "paid", stripeCheckoutSessionId: "cs_created_anyway" });
    expect(await db.entitlement.count({ where: { paymentId: kept.id } })).toBe(1);
  });

  it("answers the session URL through the API, with a rate limit", async () => {
    await openSales();
    const user = await verifiedUser("api-buyer@example.com");
    const post = (body: unknown) =>
      checkoutRoute.POST(new Request(`${BASE}/api/billing/checkout`, { method: "POST", headers: { origin: BASE, "content-type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({}) });
    expect((await post({ planCode: "pass_90", certificationCode: "az-104" })).status).toBe(401);
    session.current = { user: { id: user, role: "user", locale: "en" } };
    // Refused before Stripe is asked anything: not counted.
    for (let i = 0; i < 12; i++) expect((await post({ planCode: "nope", certificationCode: "az-104" })).status).toBe(404);
    // No STRIPE_SECRET_KEY in the tests: payment is unavailable.
    const res = await post({ planCode: "pass_90", certificationCode: "az-104" });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "unavailable" });
    for (let i = 0; i < 9; i++) await post({ planCode: "pass_90", certificationCode: "az-104" });
    const limited = await post({ planCode: "pass_90", certificationCode: "az-104" });
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: "rate_limited" });
  });
});

describe("webhook", () => {
  it("grants the Pass on a paid session, once, however often the event comes", async () => {
    await openSales();
    const user = await verifiedUser("paid@example.com");
    const payment = await checkout(user);
    const completed = paid(payment);
    expect(await handleStripeEvent(db, completed, T0)).toBe("processed");
    expect(await handleStripeEvent(db, completed, T0)).toBe("duplicate");
    // Another event of the same payment: no second right.
    expect(await handleStripeEvent(db, event("checkout.session.async_payment_succeeded", sessionObject(payment)), T0)).toBe("processed");

    const rows = await db.entitlement.findMany({ where: { userId: user } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ source: "purchase", paymentId: payment.id, startsAt: T0, expiresAt: at(90), revokedAt: null });
    expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: "paid", paidAt: T0, amountCents: 1900, chargedCents: 1900, taxCents: 317, stripePaymentIntentId: "pi_123" });
    expect(await getAccess(db, user, certificationId, at(1))).toMatchObject({ level: "full", source: "pass", expiresAt: at(90) });
    expect(await purchaseStatus(db, user, payment.stripeCheckoutSessionId!)).toEqual({ status: "paid", certification: "az-104", startsAt: T0.toISOString(), expiresAt: at(90).toISOString(), chained: false });
    expect((await db.emailOutbox.findMany({ where: { userId: user }, orderBy: { sendAfter: "asc" } })).map((e) => [e.kind, e.sendAfter])).toEqual([
      ["purchase", T0],
      ["pass_reminder", at(83)],
      ["pass_expired", at(90)],
    ]);
    expect(await db.stripeEvent.findUniqueOrThrow({ where: { id: completed.id } })).toMatchObject({ processedAt: T0, error: null });
  });

  it("gives one right when the same event is delivered several times at once", async () => {
    await openSales();
    const user = await verifiedUser("parallel@example.com");
    const payment = await checkout(user);
    const completed = paid(payment);
    const outcomes = await Promise.all(Array.from({ length: 5 }, () => handleStripeEvent(db, completed, T0)));
    expect(outcomes.sort()).toEqual(["duplicate", "duplicate", "duplicate", "duplicate", "processed"]);
    expect(await db.entitlement.count({ where: { userId: user } })).toBe(1);
    expect(await db.emailOutbox.count({ where: { userId: user, kind: "purchase" } })).toBe(1);
  });

  it("chains a Pass bought while one is running: the new one starts when it ends", async () => {
    await openSales();
    const user = await verifiedUser("chain@example.com");
    const first = await checkout(user);
    await handleStripeEvent(db, paid(first), T0);
    const second = await checkout(user);
    await handleStripeEvent(db, paid(second), at(30));
    const passes = await db.entitlement.findMany({ where: { userId: user }, orderBy: { startsAt: "asc" } });
    expect(passes.map((p) => [p.startsAt, p.expiresAt])).toEqual([
      [T0, at(90)],
      [at(90), at(180)],
    ]);
    expect(await getAccess(db, user, certificationId, at(31))).toMatchObject({ expiresAt: at(180) });
    expect(await purchaseStatus(db, user, second.stripeCheckoutSessionId!)).toMatchObject({ status: "paid", chained: true, startsAt: at(90).toISOString() });
  });

  it("follows delayed payments, failures and expiry, and never undoes a paid payment", async () => {
    await openSales();
    const user = await verifiedUser("async@example.com");
    const later = await checkout(user);
    // Completed but not paid yet (bank transfer, SEPA…): nothing granted.
    expect(await handleStripeEvent(db, event("checkout.session.completed", sessionObject(later, { payment_status: "unpaid", payment_intent: { id: "pi_obj" } })), T0)).toBe("processed");
    expect(await db.payment.findUniqueOrThrow({ where: { id: later.id } })).toMatchObject({ status: "pending", stripePaymentIntentId: "pi_obj" });
    expect(await db.entitlement.count({ where: { userId: user } })).toBe(0);
    await handleStripeEvent(db, event("checkout.session.async_payment_failed", sessionObject(later, { payment_status: "unpaid" })), T0);
    expect(await db.payment.findUniqueOrThrow({ where: { id: later.id } })).toMatchObject({ status: "failed" });

    const abandoned = await checkout(user);
    await handleStripeEvent(db, event("checkout.session.expired", sessionObject(abandoned, { payment_status: "unpaid" })), T0);
    expect(await db.payment.findUniqueOrThrow({ where: { id: abandoned.id } })).toMatchObject({ status: "expired" });

    const done = await checkout(user);
    await handleStripeEvent(db, paid(done), T0);
    // Out of order: a late "expired" or "completed (unpaid)" changes nothing.
    await handleStripeEvent(db, event("checkout.session.expired", sessionObject(done)), T0);
    await handleStripeEvent(db, event("checkout.session.completed", sessionObject(done, { payment_status: "unpaid" })), T0);
    expect(await db.payment.findUniqueOrThrow({ where: { id: done.id } })).toMatchObject({ status: "paid", stripePaymentIntentId: "pi_123" });
    expect(await db.entitlement.count({ where: { userId: user } })).toBe(1);
  });

  it("ignores events that are not about a Certidrill payment", async () => {
    await openSales();
    const user = await verifiedUser("foreign@example.com");
    const payment = await checkout(user);
    const ignored = [
      event("customer.created", { id: "cus_1", object: "customer" }),
      event("checkout.session.completed", { ...sessionObject(payment), mode: "subscription" }),
      event("checkout.session.completed", { ...sessionObject(payment), metadata: {}, client_reference_id: null }),
      event("checkout.session.completed", { ...sessionObject(payment), metadata: { paymentId: "unknown" } }),
      event("checkout.session.completed", { ...sessionObject(payment), id: "cs_other" }),
      event("checkout.session.expired", { ...sessionObject(payment), metadata: null, client_reference_id: "unknown" }),
      event("checkout.session.completed", { ...sessionObject(payment), payment_status: "unpaid", metadata: { paymentId: "unknown" } }),
    ];
    for (const e of ignored) expect(await handleStripeEvent(db, e, T0)).toBe("ignored");
    expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: "pending" });
    expect(await db.stripeEvent.count({ where: { id: { in: ignored.map((e) => e.id) }, processedAt: { not: null } } })).toBe(ignored.length);
  });

  it("holds a payment below the plan price: recorded, no Pass, flagged for review", async () => {
    await openSales();
    const user = await verifiedUser("underpaid@example.com");
    for (const extra of [{ amount_total: 900 }, { currency: "usd" }, { amount_total: null }, { payment_status: "no_payment_required", amount_total: 0 }]) {
      const payment = await checkout(user);
      const e = event("checkout.session.completed", sessionObject(payment, extra));
      expect(await handleStripeEvent(db, e, T0)).toBe("held");
      expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: "held", amountCents: 1900, currency: "eur" });
      expect(await purchaseStatus(db, user, payment.stripeCheckoutSessionId!)).toMatchObject({ status: "held", startsAt: null });
      expect(await db.stripeEvent.findUniqueOrThrow({ where: { id: e.id } })).toMatchObject({ processedAt: T0, error: HELD_NOTE });
      // Received again: still nothing granted.
      expect(await handleStripeEvent(db, e, T0)).toBe("duplicate");
    }
    expect(await db.payment.findFirstOrThrow({ where: { customer: { userId: user } }, orderBy: { createdAt: "asc" } })).toMatchObject({ amountCents: 1900, chargedCents: 900 });
    expect((await paymentHistory(db, user)).map((p) => p.status)).toEqual(["held", "held", "held", "held"]);
    const held = (await heldPayments(db)).filter((p) => p.customer.user?.id === user);
    expect(held).toHaveLength(4);
    expect(held.find((p) => p.chargedCents === 900)).toMatchObject({ amountCents: 1900, chargedCurrency: "eur", certification: { code: "az-104" }, customer: { user: { email: "underpaid@example.com" } } });
    // Charged in another currency: recorded as such, the price asked kept.
    expect(held.find((p) => p.chargedCurrency === "usd")).toMatchObject({ amountCents: 1900, currency: "eur", chargedCents: 1900 });
    expect(await db.entitlement.count({ where: { userId: user } })).toBe(0);
    expect(await db.emailOutbox.count({ where: { userId: user } })).toBe(0);
  });

  it("compares currencies whatever their case: a plan priced in EUR is not held", async () => {
    await openSales();
    const user = await verifiedUser("upper-currency@example.com");
    await db.plan.update({ where: { code: "pass_90" }, data: { currency: "EUR" } });
    try {
      const payment = await checkout(user);
      expect(await handleStripeEvent(db, event("checkout.session.completed", sessionObject(payment, { currency: "eur" })), T0)).toBe("processed");
      expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: "paid" });
      expect(await db.entitlement.count({ where: { userId: user, paymentId: payment.id } })).toBe(1);
    } finally {
      await db.plan.update({ where: { code: "pass_90" }, data: { currency: "eur" } });
    }
  });

  it("records the amount Stripe charged, more than the price included", async () => {
    await openSales();
    const user = await verifiedUser("overpaid@example.com");
    const payment = await checkout(user);
    expect(await handleStripeEvent(db, event("checkout.session.completed", sessionObject(payment, { amount_total: 2500, total_details: null, currency: null })), T0)).toBe("processed");
    expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: "paid", amountCents: 1900, chargedCents: 2500, chargedCurrency: "eur", taxCents: 0, currency: "eur" });
    expect(await db.entitlement.count({ where: { paymentId: payment.id } })).toBe(1);
  });

  it("holds a payment whose account was deleted before it was confirmed, for the administrator", async () => {
    await openSales();
    const user = await verifiedUser("gone@example.com");
    const payment = await checkout(user);
    await db.user.delete({ where: { id: user } });
    const e = paid(payment);
    expect(await handleStripeEvent(db, e, T0)).toBe("held");
    expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: "held", chargedCents: 1900 });
    expect(await db.stripeEvent.findUniqueOrThrow({ where: { id: e.id } })).toMatchObject({ error: HELD_NOTE });
    expect(await db.entitlement.count({ where: { paymentId: payment.id } })).toBe(0);
    expect((await heldPayments(db)).find((p) => p.id === payment.id)).toMatchObject({ customer: { user: null } });
  });

  it("holds the payment when the account is deleted while the event is processed", async () => {
    await openSales();
    const user = await verifiedUser("racing@example.com");
    const payment = await checkout(user);
    let processing!: Promise<string>;
    await db.$transaction(async (tx) => {
      // Another request holds the account, the webhook reads the payment and waits for it.
      await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${user} FOR UPDATE`;
      processing = handleStripeEvent(db, paid(payment), T0);
      await new Promise((resolve) => setTimeout(resolve, 300));
      await tx.user.delete({ where: { id: user } });
    });
    expect(await processing).toBe("held");
    expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: "held" });
    expect(await db.entitlement.count({ where: { paymentId: payment.id } })).toBe(0);
  });

  it("rolls a failed event back whole, keeps its error, and processes it when Stripe retries", async () => {
    await openSales();
    const user = await verifiedUser("broken@example.com");
    const payment = await checkout(user);
    await db.plan.update({ where: { code: "pass_90" }, data: { durationDays: null } });
    const completed = paid(payment);
    try {
      await expect(handleStripeEvent(db, completed, T0)).rejects.toThrow("has no duration");
    } finally {
      await db.plan.update({ where: { code: "pass_90" }, data: { durationDays: 90 } });
    }
    expect(await db.stripeEvent.findUniqueOrThrow({ where: { id: completed.id } })).toMatchObject({ processedAt: null, error: expect.stringContaining("has no duration") });
    expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: "pending" });
    expect(await handleStripeEvent(db, completed, T0)).toBe("processed");
    expect(await db.stripeEvent.findUniqueOrThrow({ where: { id: completed.id } })).toMatchObject({ error: null });
    expect(await db.entitlement.count({ where: { userId: user } })).toBe(1);
  });

  it("does not reveal a purchase to another user", async () => {
    await openSales();
    const owner = await verifiedUser("owner@example.com");
    const other = await verifiedUser("other@example.com");
    const payment = await checkout(owner);
    await expect(purchaseStatus(db, other, payment.stripeCheckoutSessionId!)).rejects.toBeInstanceOf(BillingError);
    session.current = { user: { id: other, role: "user", locale: "en" } };
    const get = (q: string) => statusRoute.GET(new Request(`${BASE}/api/billing/status${q}`), { params: Promise.resolve({}) });
    expect((await get(`?session_id=${payment.stripeCheckoutSessionId}`)).status).toBe(404);
    expect((await get("")).status).toBe(400);
    session.current = { user: { id: owner, role: "user", locale: "en" } };
    const res = await get(`?session_id=${payment.stripeCheckoutSessionId}`);
    expect(await res.json()).toMatchObject({ status: "pending" });
  });
});

describe("webhook route", () => {
  const post = (body: string, headers: Record<string, string>) => webhookRoute.POST(new Request(`${BASE}/api/webhooks/stripe`, { method: "POST", headers, body }));
  const sign = (payload: string, timestamp?: number) => Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET, timestamp });

  it("answers 503 without a webhook secret, 400 on a bad or old signature", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    expect((await post("{}", {})).status).toBe(503);
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
    try {
      const body = JSON.stringify(event("customer.created", { id: "cus" }));
      expect((await post(body, {})).status).toBe(400);
      expect((await post(body, { "stripe-signature": "t=1,v1=bad" })).status).toBe(400);
      // Signed with another secret, or for another body.
      expect((await post(body, { "stripe-signature": Stripe.webhooks.generateTestHeaderString({ payload: body, secret: "whsec_other" }) })).status).toBe(400);
      expect((await post(`${body} `, { "stripe-signature": sign(body) })).status).toBe(400);
      // A captured request replayed 10 minutes later.
      expect((await post(body, { "stripe-signature": sign(body, Math.floor(Date.now() / 1000) - 600) })).status).toBe(400);
      expect((await post("x".repeat(300_000), { "stripe-signature": "t=1,v1=x" })).status).toBe(413);
      expect(() => verifyEvent(body, null, SECRET)).toThrow(WebhookSignatureError);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("grants the Pass on a signed event and sends the confirmation right after", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
    try {
      await openSales();
      const user = await verifiedUser("signed@example.com");
      const payment = await checkout(user);
      const body = JSON.stringify(paid(payment));
      const res = await post(body, { "stripe-signature": sign(body) });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true, outcome: "processed" });
      expect(afterQueue).toHaveLength(1);
      const again = await post(body, { "stripe-signature": sign(body) });
      expect(await again.json()).toEqual({ received: true, outcome: "duplicate" });
      expect(afterQueue).toHaveLength(1);
      expect(await db.entitlement.count({ where: { userId: user } })).toBe(1);

      // A failure answers 500: Stripe sends the event again later.
      const next = await checkout(user);
      const failing = JSON.stringify(paid(next));
      await db.plan.update({ where: { code: "pass_90" }, data: { durationDays: null } });
      try {
        expect((await post(failing, { "stripe-signature": sign(failing) })).status).toBe(500);
      } finally {
        await db.plan.update({ where: { code: "pass_90" }, data: { durationDays: 90 } });
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("stripe client", () => {
  it("exists only with a secret key, and can target a local fake API", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(stripeApi()).toBeNull();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    vi.stubEnv("STRIPE_API_BASE", "http://127.0.0.1:12111");
    try {
      const api = stripeApi();
      expect(api).not.toBeNull();
      expect(stripeApi()).toBe(api);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("sends the key to a local fake API only, and never a live key", () => {
    expect(apiBase(undefined, "sk_test_1")).toEqual({});
    expect(apiBase("http://127.0.0.1:12111", "sk_test_1")).toEqual({ host: "127.0.0.1", port: "12111", protocol: "http" });
    expect(apiBase("https://[::1]", "sk_test_1")).toEqual({ host: "::1", port: undefined, protocol: "https" });
    expect(() => apiBase("https://evil.example.com", "sk_test_1")).toThrow("localhost");
    expect(() => apiBase("http://localhost:12111", "sk_live_1")).toThrow("live key");
    expect(() => apiBase("http://localhost:12111", "rk_live_1")).toThrow("live key");
  });
});

describe("e-mail queue", () => {
  const outbox = () => db.emailOutbox.findMany({ orderBy: [{ sendAfter: "asc" }, { kind: "asc" }] });
  const recorder = () => {
    const sent: Mail[] = [];
    return { sent, sender: async (m: Mail) => void sent.push(m) };
  };

  async function buyer(email: string, locale: "en" | "fr" = "en") {
    await db.emailOutbox.deleteMany();
    await openSales();
    const user = await verifiedUser(email, locale);
    const payment = await checkout(user);
    await handleStripeEvent(db, paid(payment), T0);
    return { user, payment };
  }

  it("sends the confirmation now, the reminder 7 days before the end, then the expiry notice", async () => {
    const { user } = await buyer("mails@example.com", "fr");
    const { sent, sender } = recorder();
    expect(await drainOutbox(db, { now: T0, sender, base: BASE })).toEqual({ sent: 1, skipped: 0, retried: 0, failed: 0 });
    expect(sent[0]).toMatchObject({ to: "mails@example.com", kind: "purchase", link: `${BASE}/account/billing` });
    expect(sent[0]!.message.subject).toBe("Votre Pass AZ-104 est actif");
    expect(sent[0]!.message.text).toContain("11 février 2027");
    expect(sent[0]!.message.text).toMatch(/19,00\s€/);
    expect(await drainOutbox(db, { now: at(82), sender, base: BASE })).toMatchObject({ sent: 0 });
    expect(await drainOutbox(db, { now: at(83), sender, base: BASE })).toMatchObject({ sent: 1 });
    expect(sent[1]!.message.subject).toBe("Votre Pass AZ-104 expire dans 7 jours");
    expect(sent[1]!.link).toBe(`${BASE}/pricing`);
    expect(await drainOutbox(db, { now: at(90), sender, base: BASE })).toMatchObject({ sent: 1 });
    expect(sent[2]!.message.subject).toBe("Votre Pass AZ-104 a expiré");
    expect((await outbox()).map((e) => [e.kind, e.status, e.attempts])).toEqual([
      ["purchase", "sent", 1],
      ["pass_reminder", "sent", 1],
      ["pass_expired", "sent", 1],
    ]);
    expect(await drainOutbox(db, { now: at(200), sender, base: BASE })).toEqual({ sent: 0, skipped: 0, retried: 0, failed: 0 });
    expect(user).toBeTruthy();
  });

  it("skips reminders that no longer apply: Pass extended, revoked, or refunded", async () => {
    const { user, payment } = await buyer("extended@example.com");
    const { sent, sender } = recorder();
    // Bought again: the first end date is no longer the end.
    const second = await checkout(user);
    await handleStripeEvent(db, paid(second), at(10));
    await drainOutbox(db, { now: at(10), sender, base: BASE });
    expect(await drainOutbox(db, { now: at(90), sender, base: BASE })).toMatchObject({ skipped: 2 });
    expect(await drainOutbox(db, { now: at(173), sender, base: BASE })).toMatchObject({ sent: 1, skipped: 0 });
    // A reminder sent too late (the worker was down) is skipped rather than sent after the end.
    await db.emailOutbox.updateMany({ where: { userId: user, kind: "pass_reminder", status: "sent" }, data: { status: "pending" } });
    expect(await drainOutbox(db, { now: at(180), sender, base: BASE })).toMatchObject({ sent: 1, skipped: 1 });
    expect(sent.map((m) => m.kind)).toEqual(["purchase", "purchase", "pass_reminder", "pass_expired"]);

    const { user: revoked, payment: revokedPayment } = await buyer("revoked@example.com");
    const pass = await db.entitlement.findFirstOrThrow({ where: { paymentId: revokedPayment.id } });
    await revokeEntitlement(db, null as unknown as string, { entitlementId: pass.id, reason: "refund" }, T0);
    expect(await drainOutbox(db, { now: at(100), sender, base: BASE })).toMatchObject({ sent: 0, skipped: 3 });
    expect(revoked).toBeTruthy();
    expect(payment).toBeTruthy();
  });

  it("retries a failing send with a growing wait, then gives up", async () => {
    await buyer("smtp-down@example.com");
    const failing = async () => {
      throw new Error("SMTP unreachable");
    };
    expect(await drainOutbox(db, { now: T0, sender: failing, base: BASE })).toMatchObject({ retried: 1 });
    let row = (await outbox())[0]!;
    expect(row).toMatchObject({ kind: "purchase", status: "pending", attempts: 1, lastError: "SMTP unreachable", lockedUntil: null, sendAfter: new Date(T0.getTime() + 60_000) });
    // Not due again before its wait.
    expect(await drainOutbox(db, { now: new Date(T0.getTime() + 30_000), sender: failing, base: BASE })).toMatchObject({ retried: 0 });
    let now = T0;
    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      now = row.sendAfter;
      await drainOutbox(db, { now, sender: failing, base: BASE });
      row = (await db.emailOutbox.findUniqueOrThrow({ where: { id: row.id } }))!;
    }
    expect(row).toMatchObject({ status: "failed", attempts: MAX_ATTEMPTS });
    // Without AUTH_URL, nothing can be built: retried too.
    await db.emailOutbox.update({ where: { id: row.id }, data: { status: "pending", attempts: 0 } });
    expect(await drainOutbox(db, { now: at(1), sender: recorder().sender, base: "" })).toMatchObject({ retried: 1 });
    await db.emailOutbox.update({ where: { id: row.id }, data: { kind: "mystery", sendAfter: at(1) } });
    expect(await drainOutbox(db, { now: at(2), sender: recorder().sender, base: BASE })).toMatchObject({ retried: 1 });
    expect((await db.emailOutbox.findUniqueOrThrow({ where: { id: row.id } })).lastError).toContain("unknown e-mail kind");
  });

  it("leaves the rest of a batch to the next run when the mail server is slow", async () => {
    const { user } = await buyer("slow-smtp@example.com");
    // All due, the purchase e-mail first.
    for (const [kind, ms] of [["purchase", 3000], ["pass_reminder", 2000], ["pass_expired", 1000]] as const) {
      await db.emailOutbox.updateMany({ where: { userId: user, kind }, data: { sendAfter: new Date(T0.getTime() - ms) } });
    }
    let clock = Date.now();
    const spy = vi.spyOn(Date, "now").mockImplementation(() => clock);
    try {
      // The mail server takes 5 minutes: past the lock, the rest waits.
      const slow = async () => {
        clock += 5 * 60_000;
      };
      expect(await drainOutbox(db, { now: T0, sender: slow, base: BASE })).toEqual({ sent: 1, skipped: 0, retried: 0, failed: 0 });
    } finally {
      spy.mockRestore();
    }
    expect((await outbox()).filter((e) => e.status === "pending").map((e) => e.kind).sort()).toEqual(["pass_expired", "pass_reminder"]);
  });

  it("never sends an e-mail twice when two workers run at once", async () => {
    await buyer("workers@example.com");
    const { sent, sender } = recorder();
    const results = await Promise.all([drainOutbox(db, { now: T0, sender, base: BASE }), drainOutbox(db, { now: T0, sender, base: BASE })]);
    expect(results.reduce((s, r) => s + r.sent, 0)).toBe(1);
    expect(sent).toHaveLength(1);
  });

  it("skips e-mails whose subject is gone, and the worker runs on its own", async () => {
    const { user } = await buyer("vanished@example.com");
    await db.emailOutbox.updateMany({ where: { userId: user, kind: "pass_reminder" }, data: { payload: { certificationId: "gone", expiresAt: at(90).toISOString() } } });
    await db.emailOutbox.updateMany({ where: { userId: user, kind: "pass_expired" }, data: { payload: { certificationId, expiresAt: "not a date" } } });
    await db.emailOutbox.updateMany({ where: { userId: user, kind: "purchase" }, data: { payload: { paymentId: "gone" } } });
    expect(await drainOutbox(db, { now: at(100), sender: recorder().sender, base: BASE })).toMatchObject({ skipped: 3 });

    // The real worker: without SMTP nor AUTH_LOG_MAGIC_LINKS, sending fails and is retried.
    await db.emailOutbox.updateMany({ where: { userId: user }, data: { status: "pending", sendAfter: new Date(0), payload: { paymentId: "gone" }, kind: "purchase" } });
    await db.emailOutbox.updateMany({ where: { userId: user }, data: { kind: "mystery" } });
    vi.stubEnv("AUTH_URL", BASE);
    try {
      await Promise.all([kickEmailWorker(db), kickEmailWorker(db)]);
      expect((await db.emailOutbox.findMany({ where: { userId: user } })).every((e) => e.attempts === 1)).toBe(true);
      startEmailWorker(db, 60_000);
      startEmailWorker(db, 60_000);
      stopEmailWorker();
      stopEmailWorker();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("price sync", () => {
  /** A Stripe price list held in memory, searched by lookup key like the API. */
  function priceStore(initial: Partial<Stripe.Price>[] = []) {
    const prices = [...initial];
    const products: unknown[] = [];
    const api = {
      prices: {
        list: vi.fn(async ({ lookup_keys }: { lookup_keys: string[] }) => ({ data: prices.filter((p) => lookup_keys.includes(p.lookup_key!)) })),
        create: vi.fn(async (params: Stripe.PriceCreateParams) => {
          const price = { id: `price_${params.lookup_key}`, lookup_key: params.lookup_key, unit_amount: params.unit_amount, currency: params.currency, tax_behavior: params.tax_behavior, recurring: params.recurring ?? null };
          prices.push(price as Partial<Stripe.Price>);
          return price;
        }),
      },
      products: {
        create: vi.fn(async (params: Stripe.ProductCreateParams) => {
          products.push(params);
          return { id: `prod_${products.length}` };
        }),
      },
    };
    return { api: api as unknown as StripeApi, products, prices };
  }

  it("creates the missing prices once, links existing ones, and reports a changed price", async () => {
    const { syncPrices, productName } = await import("@/lib/billing/sync-prices");
    await db.plan.updateMany({ data: { stripePriceId: null } });
    try {
      const existing = { id: "price_old_pass", lookup_key: "pass_90", unit_amount: 1900, currency: "eur", tax_behavior: "inclusive", recurring: null } as Partial<Stripe.Price>;
      const store = priceStore([existing]);
      const dry = await syncPrices(db, store.api, { dryRun: true });
      expect(dry.find((l) => l.code === "pass_90")).toMatchObject({ action: "would_link", priceId: "price_old_pass" });
      expect(dry.find((l) => l.code === "all_monthly")).toMatchObject({ action: "would_create" });
      expect(await db.plan.count({ where: { stripePriceId: { not: null } } })).toBe(0);

      const lines = await syncPrices(db, store.api);
      expect(Object.fromEntries(lines.map((l) => [l.code, l.action]))).toEqual({ all_monthly: "created", all_yearly: "created", pass_90: "linked", team_monthly: "created" });
      expect(store.products).toContainEqual({ name: "Tout accès", metadata: { planCode: "all_monthly" } });
      expect(productName({ kind: "pass", durationDays: 90 })).toBe("Pass Certification — 90 jours");
      expect(store.prices.find((p) => p.lookup_key === "all_yearly")).toMatchObject({ unit_amount: 7900, recurring: { interval: "year" } });
      expect(await db.plan.findUniqueOrThrow({ where: { code: "pass_90" } })).toMatchObject({ stripePriceId: "price_old_pass" });

      // Again: nothing to do, whatever the case of the plan's currency.
      expect((await syncPrices(db, store.api)).every((l) => l.action === "unchanged")).toBe(true);
      await db.plan.update({ where: { code: "pass_90" }, data: { currency: "EUR" } });
      expect((await syncPrices(db, store.api)).find((l) => l.code === "pass_90")).toMatchObject({ action: "unchanged" });
      await db.plan.update({ where: { code: "pass_90" }, data: { currency: "eur" } });
      // The plan's price changed without a new code: reported, not touched.
      await db.plan.update({ where: { code: "pass_90" }, data: { amountCents: 2400 } });
      expect((await syncPrices(db, store.api)).find((l) => l.code === "pass_90")).toMatchObject({ action: "mismatch", detail: "amount 1900 ≠ 2400" });
    } finally {
      await db.plan.update({ where: { code: "pass_90" }, data: { amountCents: 1900, currency: "eur" } });
      await db.plan.updateMany({ data: { stripePriceId: null } });
      await db.plan.update({ where: { code: "pass_90" }, data: { stripePriceId: "price_pass_90" } });
    }
  });
});
