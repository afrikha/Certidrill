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
import { BillingError, buyableCertifications, CHECKOUT_MINUTES, heldPayments, paymentHistory, purchaseStatus, startCheckout } from "@/lib/billing/checkout";
import { apiBase, stripeApi, verifyEvent, WebhookSignatureError, type StripeApi } from "@/lib/billing/stripe";
import { eraseDeletedCustomers, eraseRetryDelay } from "@/lib/billing/erase";
import { handleStripeEvent, HELD_NOTE, REVIEW_NOTE, share } from "@/lib/billing/webhook";
import { TERMS_VERSION } from "@/lib/billing/terms";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import { drainOutbox, MAX_ATTEMPTS, type Mail } from "@/lib/email/outbox";
import { kickEmailWorker, startEmailWorker, stopEmailWorker } from "@/lib/email/worker";
import { SWITCHES } from "@/lib/settings";

/** Whether some certification's Pass can be bought online now. */
const canBuyOnline = async (db: Parameters<typeof buyableCertifications>[0], planCode: string, stripe: StripeApi | null) => (await buyableCertifications(db, planCode, stripe)).length > 0;

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
function fakeStripe({ failCheckout = null as "refused" | "timeout" | null, noUrl = false, failDelete = false } = {}) {
  const calls = { customers: [] as unknown[][], customerIds: [] as string[], sessions: [] as unknown[][], expired: [] as string[], deleted: [] as string[] };
  // Like Stripe, a key sent again gets the first answer, even for a customer deleted since.
  const answered = new Map<string, { id: string }>();
  const api = {
    customers: {
      create: vi.fn(async (...args: unknown[]) => {
        calls.customers.push(args);
        const key = (args[1] as { idempotencyKey: string }).idempotencyKey;
        if (!answered.has(key)) answered.set(key, { id: `cus_test_${++n}` });
        const customer = answered.get(key)!;
        calls.customerIds.push(customer.id);
        return customer;
      }),
      del: vi.fn(async (id: string) => {
        calls.deleted.push(id);
        if (failDelete) throw Object.assign(new Error("Request timed out"), { type: "StripeConnectionError" });
        return { id, deleted: true };
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
  const { url } = await startCheckout(db, stripe, userId, { planCode: "pass_90", certificationCode: "az-104", waiver: true }, { base: BASE, now: T0 });
  const id = url.split("/").at(-1)!;
  return db.payment.findFirstOrThrow({ where: { stripeCheckoutSessionId: id } });
}

function sessionObject(payment: { checkoutId: string; stripeCheckoutSessionId: string | null }, extra: Record<string, unknown> = {}) {
  return {
    id: payment.stripeCheckoutSessionId,
    object: "checkout.session",
    mode: "payment",
    payment_status: "paid",
    client_reference_id: payment.checkoutId,
    metadata: { checkoutId: payment.checkoutId },
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

const paid = (payment: { checkoutId: string; stripeCheckoutSessionId: string | null }, id?: string) => event("checkout.session.completed", sessionObject(payment), id);

beforeAll(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "email_outbox","stripe_event","entitlement","plan_price","payment","billing_customer","attempt_item","attempt_section","attempt","audit_log","question_report","question","case_study","question_series","objective","domain","blueprint","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
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
    const input = { planCode: "pass_90", certificationCode: "az-104", waiver: true as const };
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
      startCheckout(db, options.api === undefined ? stripe : options.api, user, { planCode, certificationCode, waiver: true }, { base: options.base ?? BASE });
    await expect(tryBuy("all_monthly")).rejects.toMatchObject({ code: "not_found" });
    await expect(tryBuy("free")).rejects.toMatchObject({ code: "not_found" });
    await expect(tryBuy("nope")).rejects.toMatchObject({ code: "not_found" });
    await expect(tryBuy("pass_90", "az-999")).rejects.toMatchObject({ code: "not_found" });
    await expect(tryBuy("pass_90", "az-104", { api: null })).rejects.toMatchObject({ code: "unavailable", status: 503 });
    await expect(startCheckout(db, stripe, user, { planCode: "pass_90", certificationCode: "az-104", waiver: true }, { base: "" })).rejects.toMatchObject({ code: "unavailable" });
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
      customer: calls.customerIds[0],
      client_reference_id: payment.checkoutId,
      line_items: [{ price: "price_pass_90", quantity: 1 }],
      metadata: { checkoutId: payment.checkoutId, planCode: "pass_90", certificationCodes: "az-104" },
      locale: "fr",
      expires_at: Math.floor(T0.getTime() / 1000) + CHECKOUT_MINUTES * 60,
      success_url: `${BASE}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE}/billing/cancel?certification=az-104`,
    });
    expect(JSON.stringify(params)).not.toContain("1900");
    expect(options.idempotencyKey).toBe(`checkout-${payment.checkoutId}`);
    expect(calls.customers[0]).toEqual([
      { email: "buyer@example.com", preferred_locales: ["fr"], metadata: { userId: user } },
      { idempotencyKey: expect.stringMatching(new RegExp(`^customer-${user}-[0-9a-f-]{36}$`)) },
    ]);

    // A second purchase reuses the Stripe customer.
    await checkout(user, api);
    expect(calls.customers).toHaveLength(1);
    expect(await db.billingCustomer.count({ where: { userId: user } })).toBe(1);
    // Nothing is granted before the webhook, even with the session id in hand.
    expect(await getAccess(db, user, certificationId, T0)).toMatchObject({ level: "free" });
    expect(await purchaseStatus(db, user, payment.stripeCheckoutSessionId!)).toEqual({ status: "pending", passes: [{ status: "pending", certification: "az-104", startsAt: null, expiresAt: null, chained: false }] });
  });

  it("charges the certification's own price when it has one, the plan's otherwise", async () => {
    await openSales();
    const user = await verifiedUser("own-price@example.com");
    const pass = await db.plan.findUniqueOrThrow({ where: { code: "pass_90" } });
    // Not linked to Stripe yet: not on sale for that certification.
    const own = await db.planPrice.create({ data: { planId: pass.id, certificationId, amountCents: 1200, currency: "eur" } });
    try {
      vi.stubEnv("AUTH_URL", BASE);
      expect(await buyableCertifications(db, "pass_90", fakeStripe().api)).toEqual([]);
      await expect(checkout(user)).rejects.toMatchObject({ code: "unavailable" });
      await db.planPrice.update({ where: { id: own.id }, data: { stripePriceId: "price_pass_90_az104" } });
      expect(await buyableCertifications(db, "pass_90", fakeStripe().api)).toEqual([
        { code: "az-104", title: expect.any(String), amountCents: 1200, currency: "eur", stripePriceId: "price_pass_90_az104", custom: true },
      ]);
      const { api, calls } = fakeStripe();
      const payment = await checkout(user, api);
      expect(payment).toMatchObject({ amountCents: 1200, currency: "eur", planId: pass.id });
      expect((calls.sessions[0] as [Stripe.Checkout.SessionCreateParams])[0].line_items).toEqual([{ price: "price_pass_90_az104", quantity: 1 }]);
    } finally {
      vi.unstubAllEnvs();
      await db.planPrice.delete({ where: { id: own.id } });
    }
    // Back to the plan's price.
    expect(await checkout(user)).toMatchObject({ amountCents: 1900 });
  });

  it("stores one Stripe customer when two checkouts start at once, and deletes the other at Stripe", async () => {
    await openSales();
    const user = await verifiedUser("twice@example.com");
    const { api, calls } = fakeStripe();
    // Both reach Stripe before either stores its customer.
    const create = vi.mocked(api.customers.create);
    const answer = create.getMockImplementation()!;
    let release!: () => void;
    const both = new Promise<void>((resolve) => (release = resolve));
    create.mockImplementation(async (...args) => {
      if (create.mock.calls.length === 2) release();
      await both;
      return answer(...args);
    });
    await Promise.all([checkout(user, api), checkout(user, api)]);
    const stored = await db.billingCustomer.findUniqueOrThrow({ where: { userId: user } });
    expect(await db.payment.count({ where: { customer: { userId: user } } })).toBe(2);
    expect(calls.customerIds).toHaveLength(2);
    expect(calls.deleted).toEqual(calls.customerIds.filter((id) => id !== stored.stripeCustomerId));
  });

  it("deletes at once a Stripe customer the database failed to store, so no address stays at Stripe", async () => {
    await openSales();
    const user = await verifiedUser("store-failed@example.com");
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const store = vi.spyOn(db.billingCustomer, "create");
    try {
      for (const failDelete of [false, true]) {
        store.mockRejectedValueOnce(new Error("Connection lost"));
        const { api, calls } = fakeStripe({ failDelete });
        // The caller sees the database error, never the cleanup's.
        await expect(checkout(user, api)).rejects.toThrow("Connection lost");
        expect(calls.deleted).toEqual(calls.customerIds);
        expect(calls.sessions).toHaveLength(0);
      }
      expect(quiet).toHaveBeenCalledOnce();
      expect(await db.billingCustomer.count({ where: { userId: user } })).toBe(0);
      // Stored meanwhile by another checkout: kept at Stripe.
      store.mockImplementationOnce((async ({ data }: { data: { stripeCustomerId: string } }) => {
        await db.billingCustomer.create({ data: { stripeCustomerId: data.stripeCustomerId, stripeDeletedAt: T0 } });
        throw new Error("Connection lost");
      }) as never);
      const { api, calls } = fakeStripe();
      await expect(checkout(user, api)).rejects.toThrow("Connection lost");
      expect(calls.deleted).toEqual([]);
    } finally {
      store.mockRestore();
      quiet.mockRestore();
    }
  });

  it("never stores the Stripe customer deleted after a failed store when the buyer tries again", async () => {
    await openSales();
    const user = await verifiedUser("retry-after-loss@example.com");
    const { api, calls } = fakeStripe();
    const store = vi.spyOn(db.billingCustomer, "create").mockRejectedValueOnce(new Error("Connection lost"));
    try {
      await expect(checkout(user, api)).rejects.toThrow("Connection lost");
    } finally {
      store.mockRestore();
    }
    await checkout(user, api);
    const [first, second] = calls.customers.map((c) => (c[1] as { idempotencyKey: string }).idempotencyKey);
    expect(first).not.toBe(second);
    const stored = await db.billingCustomer.findUniqueOrThrow({ where: { userId: user } });
    expect(calls.deleted).toEqual([calls.customerIds[0]]);
    expect(stored.stripeCustomerId).toBe(calls.customerIds[1]);
    expect(calls.sessions[0]![0]).toMatchObject({ customer: stored.stripeCustomerId });
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
    expect((await post({ planCode: "pass_90", certificationCode: "az-104", waiver: true })).status).toBe(401);
    session.current = { user: { id: user, role: "user", locale: "en" } };
    // Without the waiver box ticked: refused, and not counted either.
    for (let i = 0; i < 12; i++) expect((await post({ planCode: "pass_90", certificationCode: "az-104" })).status).toBe(400);
    expect((await post({ planCode: "pass_90", certificationCode: "az-104", waiver: false })).status).toBe(400);
    // Refused before Stripe is asked anything: not counted.
    for (let i = 0; i < 12; i++) expect((await post({ planCode: "nope", certificationCode: "az-104", waiver: true })).status).toBe(404);
    // No STRIPE_SECRET_KEY in the tests: payment is unavailable.
    const res = await post({ planCode: "pass_90", certificationCode: "az-104", waiver: true });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "unavailable" });
    for (let i = 0; i < 9; i++) await post({ planCode: "pass_90", certificationCode: "az-104", waiver: true });
    const limited = await post({ planCode: "pass_90", certificationCode: "az-104", waiver: true });
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
    expect(await purchaseStatus(db, user, payment.stripeCheckoutSessionId!)).toEqual({ status: "paid", passes: [{ status: "paid", certification: "az-104", startsAt: T0.toISOString(), expiresAt: at(90).toISOString(), chained: false }] });
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
    expect((await purchaseStatus(db, user, second.stripeCheckoutSessionId!)).passes[0]).toMatchObject({ status: "paid", chained: true, startsAt: at(90).toISOString() });
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
      expect(await purchaseStatus(db, user, payment.stripeCheckoutSessionId!)).toMatchObject({ status: "held", passes: [{ status: "held", startsAt: null }] });
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

describe("cart: several Passes in one purchase", () => {
  let fundamentalsId: string;
  beforeAll(async () => {
    await seedReferential(db, await loadCertification(path.resolve(__dirname, "../../content/az-900")));
    const c = await db.certification.update({ where: { code: "az-900" }, data: { active: true } });
    fundamentalsId = c.id;
    const pass = await db.plan.findUniqueOrThrow({ where: { code: "pass_90" } });
    await db.planPrice.create({ data: { planId: pass.id, certificationId: c.id, amountCents: 900, currency: "eur", stripePriceId: "price_pass_90_az900" } });
  });
  afterAll(async () => {
    await db.planPrice.deleteMany({ where: { certificationId: fundamentalsId } });
    await db.certification.update({ where: { code: "az-900" }, data: { active: false } });
  });

  async function cart(userId: string, codes: string[], stripe = fakeStripe().api) {
    const { url } = await startCheckout(db, stripe, userId, { planCode: "pass_90", certificationCodes: codes, waiver: true }, { base: BASE, now: T0 });
    return db.payment.findMany({ where: { stripeCheckoutSessionId: url.split("/").at(-1)! }, include: { certification: { select: { code: true } } }, orderBy: { certification: { code: "asc" } } });
  }

  it("charges one session with a line per Pass, each at its own price, one payment row per Pass", async () => {
    await openSales();
    const user = await verifiedUser("cart@example.com");
    const { api, calls } = fakeStripe();
    // Duplicates and case are folded: one Pass per certification.
    const payments = await cart(user, ["az-900", "AZ-104", "az-900"], api);
    expect(payments.map((p) => [p.certification.code, p.amountCents, p.status])).toEqual([["az-104", 1900, "pending"], ["az-900", 900, "pending"]]);
    expect(new Set(payments.map((p) => p.checkoutId)).size).toBe(1);
    expect(calls.sessions).toHaveLength(1);
    const [params] = calls.sessions[0] as [Stripe.Checkout.SessionCreateParams];
    expect(params).toMatchObject({
      client_reference_id: payments[0]!.checkoutId,
      line_items: [{ price: "price_pass_90_az900", quantity: 1 }, { price: "price_pass_90", quantity: 1 }],
      metadata: { checkoutId: payments[0]!.checkoutId, planCode: "pass_90", certificationCodes: "az-900,az-104" },
    });
    // Back from Stripe without paying, the whole cart is ticked again.
    expect(new URL(params.cancel_url!).searchParams.get("certification")).toBe("az-900,az-104");
    expect(JSON.stringify(params)).not.toMatch(/1900|"900"/);
  });

  it("refuses a cart with a certification not on sale, too many Passes, or no Stripe price, and keeps nothing a refused session made", async () => {
    await openSales();
    const user = await verifiedUser("cart-refused@example.com");
    await expect(cart(user, ["az-104", "nope"])).rejects.toMatchObject({ code: "not_found" });
    await expect(cart(user, Array.from({ length: 11 }, (_, i) => `c-${i}`))).rejects.toThrow();
    await expect(startCheckout(db, fakeStripe().api, user, { planCode: "pass_90" } as never, { base: BASE })).rejects.toThrow();
    await db.planPrice.updateMany({ where: { certificationId: fundamentalsId }, data: { stripePriceId: null } });
    try {
      await expect(cart(user, ["az-104", "az-900"])).rejects.toMatchObject({ code: "unavailable" });
    } finally {
      await db.planPrice.updateMany({ where: { certificationId: fundamentalsId }, data: { stripePriceId: "price_pass_90_az900" } });
    }
    await db.planPrice.updateMany({ where: { certificationId: fundamentalsId }, data: { currency: "usd" } });
    try {
      // One session charges one currency.
      await expect(cart(user, ["az-104", "az-900"])).rejects.toMatchObject({ code: "unavailable" });
    } finally {
      await db.planPrice.updateMany({ where: { certificationId: fundamentalsId }, data: { currency: "eur" } });
    }
    await expect(cart(user, ["az-104", "az-900"], fakeStripe({ failCheckout: "refused" }).api)).rejects.toThrow("No such price");
    expect(await db.payment.count({ where: { customer: { userId: user } } })).toBe(0);
  });

  it("grants every Pass of a paid cart once, sharing what Stripe charged and the tax by price", async () => {
    await openSales();
    const user = await verifiedUser("cart-paid@example.com");
    const payments = await cart(user, ["az-104", "az-900"]);
    const completed = event("checkout.session.completed", sessionObject(payments[0]!, { amount_total: 2800, total_details: { amount_tax: 467 } }));
    expect(await handleStripeEvent(db, completed, T0)).toBe("processed");
    expect(await handleStripeEvent(db, completed, T0)).toBe("duplicate");
    expect(await handleStripeEvent(db, event("checkout.session.async_payment_succeeded", sessionObject(payments[0]!, { amount_total: 2800 })), T0)).toBe("processed");
    const after = await db.payment.findMany({ where: { checkoutId: payments[0]!.checkoutId }, include: { entitlement: true, certification: { select: { code: true } } }, orderBy: { certification: { code: "asc" } } });
    expect(after.map((p) => [p.certification.code, p.status, p.chargedCents, p.taxCents, p.stripePaymentIntentId])).toEqual([
      ["az-104", "paid", 1900, 317, "pi_123"],
      ["az-900", "paid", 900, 150, "pi_123"],
    ]);
    expect(after.every((p) => p.entitlement?.expiresAt.getTime() === at(90).getTime())).toBe(true);
    expect(await db.entitlement.count({ where: { userId: user } })).toBe(2);
    expect(await getAccess(db, user, fundamentalsId, T0)).toMatchObject({ level: "full" });
    expect(await getAccess(db, user, certificationId, T0)).toMatchObject({ level: "full" });
    // One confirmation per Pass.
    expect(await db.emailOutbox.count({ where: { userId: user, kind: "purchase" } })).toBe(2);
    const status = await purchaseStatus(db, user, payments[0]!.stripeCheckoutSessionId!);
    expect(status).toMatchObject({ status: "paid", passes: [{ certification: "az-104", status: "paid" }, { certification: "az-900", status: "paid" }] });
  });

  it("holds the whole cart when Stripe charged less than its prices, and expires it whole", async () => {
    await openSales();
    const user = await verifiedUser("cart-short@example.com");
    const short = await cart(user, ["az-104", "az-900"]);
    expect(await handleStripeEvent(db, event("checkout.session.completed", sessionObject(short[0]!, { amount_total: 1900 })), T0)).toBe("held");
    expect(await db.payment.findMany({ where: { checkoutId: short[0]!.checkoutId }, select: { status: true, chargedCents: true } })).toEqual(
      expect.arrayContaining([{ status: "held", chargedCents: 1289 }, { status: "held", chargedCents: 611 }]),
    );
    expect(await db.entitlement.count({ where: { userId: user } })).toBe(0);
    // Side by side for the administrator, under the cart they share.
    const held = (await heldPayments(db)).filter((p) => p.checkoutId === short[0]!.checkoutId);
    expect(held.map((p) => p.certification.code).sort((a, b) => a.localeCompare(b))).toEqual(["az-104", "az-900"]);

    const abandoned = await cart(user, ["az-104", "az-900"]);
    expect(await handleStripeEvent(db, event("checkout.session.expired", sessionObject(abandoned[0]!)), T0)).toBe("processed");
    expect((await db.payment.findMany({ where: { checkoutId: abandoned[0]!.checkoutId } })).map((p) => p.status)).toEqual(["expired", "expired"]);
  });

  it("lists held carts whole, whatever the page size", async () => {
    await openSales();
    const user = await verifiedUser("cart-page@example.com");
    for (const codes of [["az-104", "az-900"], ["az-104", "az-900"]]) {
      const payments = await cart(user, codes);
      await handleStripeEvent(db, event("checkout.session.completed", sessionObject(payments[0]!, { amount_total: 100 })), T0);
    }
    // Every held payment in page order (other tests hold some too).
    const all = await heldPayments(db, 10_000);
    expect(new Set(all.map((p) => p.checkoutId)).size).toBeGreaterThanOrEqual(2);
    // A page size that ends in the middle of a cart: the page goes on to its end.
    const cut = all.findIndex((p, i) => i > 0 && p.checkoutId === all[i - 1]!.checkoutId);
    expect(cut).toBeGreaterThan(0);
    expect((await heldPayments(db, cut)).length).toBeGreaterThan(cut);
    for (const take of [1, 2, 3, cut, all.length]) {
      // The carts of the first `take` rows, each with all its rows, in the same order.
      const carts = new Set(all.slice(0, take).map((p) => p.checkoutId));
      expect((await heldPayments(db, take)).map((p) => p.id)).toEqual(all.filter((p) => carts.has(p.checkoutId)).map((p) => p.id));
    }
  });

  it("fulfils only the open lines of a cart replayed with one already paid, against the price of the whole cart", async () => {
    await openSales();
    const user = await verifiedUser("cart-replay@example.com");
    const [az104, az900] = await cart(user, ["az-104", "az-900"]);
    // Not a state a cart reaches by itself (its lines are settled together): the replay must still be sound.
    await db.payment.update({ where: { id: az104!.id }, data: { status: "paid" } });
    // amount_total is for the whole session, so it is checked against every line's price.
    const total = az104!.amountCents + az900!.amountCents;
    expect(await handleStripeEvent(db, event("checkout.session.completed", sessionObject(az900!, { amount_total: total, total_details: { amount_tax: 0 } })), T0)).toBe("processed");
    // Charged exactly the prices: each line's part is its own price.
    expect(await db.payment.findUniqueOrThrow({ where: { id: az900!.id } })).toMatchObject({ status: "paid", chargedCents: az900!.amountCents });
    expect(await db.payment.findUniqueOrThrow({ where: { id: az104!.id } })).toMatchObject({ status: "paid", chargedCents: null });
    expect((await db.entitlement.findMany({ where: { userId: user } })).map((e) => e.paymentId)).toEqual([az900!.id]);
  });

  it("still fulfils a session started before carts, which names its one payment", async () => {
    await openSales();
    const user = await verifiedUser("legacy@example.com");
    const [payment] = await cart(user, ["az-104"]);
    // Migrated rows: checkoutId = id, and the session's metadata says paymentId.
    await db.payment.update({ where: { id: payment!.id }, data: { checkoutId: payment!.id } });
    const legacy = event("checkout.session.completed", { ...sessionObject({ ...payment!, checkoutId: payment!.id }), metadata: { paymentId: payment!.id } });
    expect(await handleStripeEvent(db, legacy, T0)).toBe("processed");
    expect(await db.entitlement.count({ where: { paymentId: payment!.id } })).toBe(1);
  });

  it("shares an amount in whole cents that add up", () => {
    expect(share(2800, [1900, 900])).toEqual([1900, 900]);
    expect(share(467, [1900, 900])).toEqual([317, 150]);
    expect(share(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(share(1999, [1999])).toEqual([1999]);
    expect(share(0, [1900, 900])).toEqual([0, 0]);
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
    // The waiver ticked at purchase, restated word for word, with the terms.
    expect(sent[0]!.message.text).toContain(fr.billing.waiver);
    expect(sent[0]!.message.text).toContain("renoncé à votre droit de rétractation");
    expect(sent[0]!.message.text).toContain(`${BASE}/terms`);
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

  it("states in the confirmation what Stripe charged, in its currency", async () => {
    await db.emailOutbox.deleteMany();
    await openSales();
    const user = await verifiedUser("charged@example.com", "fr");
    const payment = await checkout(user);
    // The plan's price is 19,00 € tax included; Stripe added 6,00 €.
    await handleStripeEvent(db, event("checkout.session.completed", sessionObject(payment, { amount_total: 2500, total_details: null, currency: "EUR" })), T0);
    const { sent, sender } = recorder();
    expect(await drainOutbox(db, { now: T0, sender, base: BASE })).toMatchObject({ sent: 1 });
    expect(sent[0]!.message.text).toMatch(/25,00\s€/);
    expect(sent[0]!.message.text).not.toMatch(/19,00\s€/);
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

describe("erasure at Stripe", () => {
  /** A Stripe whose customer deletions answer `outcome` (in turn, then "ok"). */
  function deleter(...outcomes: ("ok" | "missing" | "notFound" | "down")[]) {
    const del = vi.fn(async (id: string) => {
      const outcome = outcomes.shift() ?? "ok";
      if (outcome === "missing") throw Object.assign(new Error(`No such customer: '${id}'`), { type: "StripeInvalidRequestError", code: "resource_missing", statusCode: 404 });
      if (outcome === "down") throw Object.assign(new Error("Request timed out"), { type: "StripeConnectionError" });
      if (outcome === "notFound") throw Object.assign(new Error("Not Found"), { type: "StripeInvalidRequestError", statusCode: 404 });
      return { id, deleted: true };
    });
    return { api: { customers: { del } } as unknown as Pick<StripeApi, "customers">, del };
  }

  /** A buyer with a paid Pass, then the account deleted: its Stripe customer is due for deletion. */
  async function deletedBuyer(email: string) {
    await openSales();
    const user = await verifiedUser(email);
    const payment = await checkout(user);
    await handleStripeEvent(db, paid(payment), T0);
    // A sole trader's country and VAT number: personal data too.
    const customer = await db.billingCustomer.update({ where: { userId: user }, data: { country: "FR", vatNumber: "FR12345678901" } });
    await db.user.delete({ where: { id: user } });
    return { customer, payment };
  }

  beforeEach(async () => {
    await db.billingCustomer.updateMany({ where: { userId: null }, data: { stripeDeletedAt: T0 } });
  });

  it("deletes the Stripe customer of a deleted account, once, and keeps the payments", async () => {
    const living = await verifiedUser("erase-living@example.com");
    await checkout(living);
    const { customer, payment } = await deletedBuyer("erase-done@example.com");
    const { api, del } = deleter();
    expect(await eraseDeletedCustomers(db, api, T0)).toEqual({ erased: 1, failed: 0 });
    expect(del).toHaveBeenCalledExactlyOnceWith(customer.stripeCustomerId);
    expect(await db.billingCustomer.findUniqueOrThrow({ where: { id: customer.id } })).toMatchObject({ userId: null, stripeDeletedAt: T0, eraseAfter: null, country: null, vatNumber: null });
    // The payment stays, as an accounting record, without the person.
    expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: "paid", billingCustomerId: customer.id });
    // Done: the next pass has nothing to do; a living account is never touched.
    expect(await eraseDeletedCustomers(db, api, T0)).toEqual({ erased: 0, failed: 0 });
    expect(del).toHaveBeenCalledOnce();
    expect(await db.billingCustomer.findUniqueOrThrow({ where: { userId: living } })).toMatchObject({ stripeDeletedAt: null });
  });

  it("retries a failed deletion later, waiting longer each time", async () => {
    const { customer } = await deletedBuyer("erase-retry@example.com");
    // A 404 that is not Stripe's "no such customer" (a proxy, a wrong address) is a failure too.
    const { api, del } = deleter("notFound", "down");
    expect(await eraseDeletedCustomers(db, api, T0)).toEqual({ erased: 0, failed: 1 });
    expect(await db.billingCustomer.findUniqueOrThrow({ where: { id: customer.id } })).toMatchObject({ stripeDeletedAt: null, eraseAttempts: 1, eraseAfter: new Date(T0.getTime() + 2 * 60_000) });
    // Not due yet.
    expect(await eraseDeletedCustomers(db, api, new Date(T0.getTime() + 60_000))).toEqual({ erased: 0, failed: 0 });
    expect(await eraseDeletedCustomers(db, api, new Date(T0.getTime() + 2 * 60_000))).toEqual({ erased: 0, failed: 1 });
    const later = new Date(T0.getTime() + 10 * 60_000);
    expect(await eraseDeletedCustomers(db, api, later)).toEqual({ erased: 1, failed: 0 });
    expect(del).toHaveBeenCalledTimes(3);
    expect(await db.billingCustomer.findUniqueOrThrow({ where: { id: customer.id } })).toMatchObject({ stripeDeletedAt: later, eraseAttempts: 2 });
    expect([1, 2, 3, 10, 11, 50].map(eraseRetryDelay)).toEqual([2, 4, 8, 1024, 1440, 1440].map((m) => m * 60_000));
  });

  it("counts a customer already gone at Stripe as deleted, and does nothing without Stripe", async () => {
    const { customer } = await deletedBuyer("erase-gone@example.com");
    expect(await eraseDeletedCustomers(db, null, T0)).toEqual({ erased: 0, failed: 0 });
    expect(await eraseDeletedCustomers(db, deleter("missing").api, T0)).toEqual({ erased: 1, failed: 0 });
    expect(await db.billingCustomer.findUniqueOrThrow({ where: { id: customer.id } })).toMatchObject({ stripeDeletedAt: T0 });
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
      // A certification's own price: its own Stripe price, a new one for a new amount.
      const pass = await db.plan.findUniqueOrThrow({ where: { code: "pass_90" } });
      const own = await db.planPrice.create({ data: { planId: pass.id, certificationId, amountCents: 1200, currency: "eur" } });
      expect((await syncPrices(db, store.api)).find((l) => l.code === "pass_90/az-104")).toMatchObject({ action: "created", priceId: "price_pass_90.az-104.1200eur" });
      expect(store.products).toContainEqual({ name: "Pass Certification — 90 jours — AZ-104", metadata: { planCode: "pass_90", certificationCode: "az-104" } });
      expect(await db.planPrice.findUniqueOrThrow({ where: { id: own.id } })).toMatchObject({ stripePriceId: "price_pass_90.az-104.1200eur" });
      expect((await syncPrices(db, store.api)).find((l) => l.code === "pass_90/az-104")).toMatchObject({ action: "unchanged" });
      await db.planPrice.update({ where: { id: own.id }, data: { amountCents: 1500 } });
      expect((await syncPrices(db, store.api)).find((l) => l.code === "pass_90/az-104")).toMatchObject({ action: "created", priceId: "price_pass_90.az-104.1500eur" });
      await db.planPrice.delete({ where: { id: own.id } });
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

describe("certification prices", () => {
  it("sets a certification's own price once, with its trace, clears its Stripe link on a new amount, and goes back to the plan's", async () => {
    const { setCertificationPrice, pricesByCertification } = await import("@/lib/billing/prices");
    const admin = (await db.user.create({ data: { email: "price-admin@example.com", role: "admin" } })).id;
    const set = (amount: string, certificationCode = "az-104", planCode = "pass_90") => setCertificationPrice(db, admin, { planCode, certificationCode, amount });
    const own = () => db.planPrice.findFirst({ where: { certificationId } });

    expect(await set("12,50")).toBe(true);
    expect(await own()).toMatchObject({ amountCents: 1250, currency: "eur", stripePriceId: null });
    expect(await set("12.5")).toBe(false);
    await db.planPrice.updateMany({ where: { certificationId }, data: { stripePriceId: "price_linked" } });
    expect((await pricesByCertification(db, "pass_90")).find((p) => p.code === "az-104")).toMatchObject({ amountCents: 1250, custom: true, stripePriceId: "price_linked" });
    // A new amount is a new Stripe price: the link goes.
    expect(await set("15")).toBe(true);
    expect(await own()).toMatchObject({ amountCents: 1500, stripePriceId: null });
    // The plan's own amount, or empty: back to the plan's price.
    expect(await set("19")).toBe(true);
    expect(await own()).toBeNull();
    expect(await set("")).toBe(false);
    expect((await pricesByCertification(db, "pass_90")).find((p) => p.code === "az-104")).toMatchObject({ amountCents: 1900, custom: false, stripePriceId: "price_pass_90" });

    expect(await set("10", "az-999")).toBeNull();
    expect(await set("10", "az-104", "free")).toBeNull();
    for (const bad of ["0", "0.10", "abc", "12.345", "100000", "-5"]) await expect(set(bad)).rejects.toThrow();
    const log = await db.auditLog.findMany({ where: { action: "price.update" }, orderBy: { createdAt: "asc" } });
    expect(log.map((l) => l.details)).toEqual([
      { plan: "pass_90", certification: "az-104", from: 1900, to: 1250, currency: "eur" },
      { plan: "pass_90", certification: "az-104", from: 1250, to: 1500, currency: "eur" },
      { plan: "pass_90", certification: "az-104", from: 1500, to: 1900, currency: "eur" },
    ]);
  });

  it("gives a price range for the 'from X' labels, none for mixed currencies", async () => {
    const { priceRange } = await import("@/lib/billing/prices");
    expect(priceRange([])).toBeNull();
    expect(priceRange([{ amountCents: 1900, currency: "eur" }, { amountCents: 900, currency: "EUR" }])).toEqual({ min: 900, max: 1900, currency: "eur" });
    expect(priceRange([{ amountCents: 1900, currency: "eur" }, { amountCents: 900, currency: "usd" }])).toBeNull();
  });
});

describe("terms, invoices, refunds and disputes (offers lot C)", () => {
  // AZ-900 on sale for the carts, as in the cart tests.
  let fundamentalsId: string;
  beforeAll(async () => {
    const c = await db.certification.update({ where: { code: "az-900" }, data: { active: true } });
    fundamentalsId = c.id;
    const pass = await db.plan.findUniqueOrThrow({ where: { code: "pass_90" } });
    await db.planPrice.create({ data: { planId: pass.id, certificationId: c.id, amountCents: 900, currency: "eur", stripePriceId: "price_pass_90_az900" } });
  });
  afterAll(async () => {
    await db.planPrice.deleteMany({ where: { certificationId: fundamentalsId } });
    await db.certification.update({ where: { code: "az-900" }, data: { active: false } });
  });
  /** A paid purchase of `codes` (one Pass, or a cart), charged on its own payment intent. */
  async function bought(email: string, { locale = "en" as "en" | "fr", codes = ["az-104"], intent = `pi_${email}` } = {}) {
    await openSales();
    const user = await verifiedUser(email, locale);
    const { url } = await startCheckout(db, fakeStripe().api, user, { planCode: "pass_90", certificationCodes: codes, waiver: true, locale }, { base: BASE, now: T0 });
    const sessionId = url.split("/").at(-1)!;
    const payments = await db.payment.findMany({ where: { stripeCheckoutSessionId: sessionId }, orderBy: { id: "asc" } });
    const total = payments.reduce((n, p) => n + p.amountCents, 0);
    expect(await handleStripeEvent(db, event("checkout.session.completed", sessionObject(payments[0]!, { amount_total: total, payment_intent: intent })), T0)).toBe("processed");
    return { user, intent, checkoutId: payments[0]!.checkoutId, ids: payments.map((p) => p.id) };
  }
  const charge = (intent: string, extra: Record<string, unknown> = {}) => ({ id: `ch_${intent}`, object: "charge", payment_intent: intent, amount: 1900, amount_refunded: 1900, refunded: true, ...extra });
  const contest = (intent: string, status: string) => ({ id: `dp_${intent}`, object: "dispute", payment_intent: intent, charge: `ch_${intent}`, status });
  const passes = (ids: string[]) => db.entitlement.findMany({ where: { paymentId: { in: ids } }, orderBy: { paymentId: "asc" } });
  const statuses = async (ids: string[]) => (await db.payment.findMany({ where: { id: { in: ids } }, orderBy: { id: "asc" } })).map((p) => p.status);

  it("stores the waiver ticked, in the page's language, and asks Stripe for an invoice with the VAT mention", async () => {
    await openSales();
    const user = await verifiedUser("waiver@example.com", "en");
    const { api, calls } = fakeStripe();
    const later = new Date(T0.getTime() + 60_000);
    // The page was in French, the account in English: the French text is the one ticked.
    await startCheckout(db, api, user, { planCode: "pass_90", certificationCode: "az-104", waiver: true, locale: "fr" }, { base: BASE, now: later });
    const payment = await db.payment.findFirstOrThrow({ where: { customer: { userId: user } } });
    expect(payment).toMatchObject({ waiverAcceptedAt: later, waiverText: fr.billing.waiver, termsVersion: TERMS_VERSION });
    const [params] = calls.sessions[0] as [Stripe.Checkout.SessionCreateParams];
    expect(params.invoice_creation).toMatchObject({ enabled: true, invoice_data: { metadata: { checkoutId: payment.checkoutId } } });
    expect(params.invoice_creation?.invoice_data?.footer).toContain("Square-soft");
    expect(params.invoice_creation?.invoice_data?.footer).toContain("TVA non applicable, art. 293 B du CGI");

    // Without a page language, the account's.
    await startCheckout(db, api, user, { planCode: "pass_90", certificationCode: "az-104", waiver: true }, { base: BASE, now: later });
    expect((await db.payment.findFirstOrThrow({ where: { customer: { userId: user } }, orderBy: { createdAt: "desc" } })).waiverText).toBe(en.billing.waiver);
    // Without the box ticked, nothing is asked of Stripe.
    await expect(startCheckout(db, api, user, { planCode: "pass_90", certificationCode: "az-104" } as never, { base: BASE })).rejects.toThrow();
    await expect(startCheckout(db, api, user, { planCode: "pass_90", certificationCode: "az-104", waiver: false } as never, { base: BASE })).rejects.toThrow();
    expect(calls.sessions).toHaveLength(2);
  });

  it("keeps live payment closed while the terms have a passage between brackets, whatever the switch", async () => {
    await openSales();
    const user = await verifiedUser("live@example.com");
    const { api, calls } = fakeStripe();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_example");
    try {
      // The terms still name the mediator between brackets.
      await expect(startCheckout(db, api, user, { planCode: "pass_90", certificationCode: "az-104", waiver: true }, { base: BASE })).rejects.toMatchObject({ code: "sales_closed" });
      vi.stubEnv("AUTH_URL", BASE);
      expect(await canBuyOnline(db, "pass_90", api)).toBe(false);
      vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
      expect(await canBuyOnline(db, "pass_90", api)).toBe(true);
      await startCheckout(db, api, user, { planCode: "pass_90", certificationCode: "az-104", waiver: true }, { base: BASE });
      expect(calls.sessions).toHaveLength(1);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("records the invoice of a purchase, for each Pass of a cart, whatever the order of the events", async () => {
    await openSales();
    const user = await verifiedUser("invoice@example.com");
    await startCheckout(db, fakeStripe().api, user, { planCode: "pass_90", certificationCode: "az-104", waiver: true }, { base: BASE, now: T0 });
    const payment = await db.payment.findFirstOrThrow({ where: { customer: { userId: user } } });
    const invoice = (url: string | null) => ({ id: "in_1", object: "invoice", metadata: { checkoutId: payment.checkoutId }, hosted_invoice_url: url });
    // Before the payment is confirmed, and with a page that is not Stripe's HTTPS one: the id only.
    expect(await handleStripeEvent(db, event("invoice.finalized", invoice("http://example.com/x")), T0)).toBe("processed");
    expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ stripeInvoiceId: "in_1", invoiceUrl: null });
    expect(await handleStripeEvent(db, event("invoice.paid", invoice("https://invoice.stripe.com/i/acct_1/test_1")), T0)).toBe("processed");
    expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ invoiceUrl: "https://invoice.stripe.com/i/acct_1/test_1" });
    // Another application's invoice, or one without metadata: ignored.
    expect(await handleStripeEvent(db, event("invoice.paid", { ...invoice("https://invoice.stripe.com/i/x"), metadata: { checkoutId: "other" } }), T0)).toBe("ignored");
    expect(await handleStripeEvent(db, event("invoice.paid", { ...invoice("https://invoice.stripe.com/i/x"), metadata: null }), T0)).toBe("ignored");

    // A cart: one invoice for all its Passes.
    const { checkoutId, ids } = await bought("invoice-cart@example.com", { codes: ["az-104", "az-900"] });
    await handleStripeEvent(db, event("invoice.finalized", { id: "in_2", object: "invoice", metadata: { checkoutId }, hosted_invoice_url: "https://invoice.stripe.com/i/acct_1/test_2" }), T0);
    for (const p of await db.payment.findMany({ where: { id: { in: ids } } })) expect(p).toMatchObject({ stripeInvoiceId: "in_2", invoiceUrl: "https://invoice.stripe.com/i/acct_1/test_2" });
  });

  it("withdraws the Pass on a full refund, once, with its trace in the audit log", async () => {
    const { user, intent, ids } = await bought("refund@example.com");
    expect((await getAccess(db, user, certificationId, at(1))).level).toBe("full");
    const refunded = event("charge.refunded", charge(intent));
    expect(await handleStripeEvent(db, refunded, at(1))).toBe("processed");
    expect(await statuses(ids)).toEqual(["refunded"]);
    const [pass] = await passes(ids);
    expect(pass!.revokedAt).toEqual(at(1));
    expect((await getAccess(db, user, certificationId, at(2))).level).not.toBe("full");
    const log = await db.auditLog.findMany({ where: { targetUserId: user, action: "entitlement.revoke" } });
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ actorId: null, details: { entitlementId: pass!.id, reason: "refund", stripeEvent: refunded.id } });
    // Received again, or another refund event of the same charge: nothing more.
    expect(await handleStripeEvent(db, refunded, at(2))).toBe("duplicate");
    expect(await handleStripeEvent(db, event("charge.refunded", charge(intent)), at(3))).toBe("processed");
    expect((await passes(ids))[0]!.revokedAt).toEqual(at(1));
    expect(await db.auditLog.count({ where: { targetUserId: user, action: "entitlement.revoke" } })).toBe(1);
    // A payment Certidrill does not know (another application on the account): ignored.
    expect(await handleStripeEvent(db, event("charge.refunded", charge("pi_unknown")), at(3))).toBe("ignored");
    expect(await handleStripeEvent(db, event("charge.refunded", charge("", { payment_intent: null })), at(3))).toBe("ignored");
  });

  it("leaves a partial refund to an administrator, and withdraws every Pass of a cart refunded in full", async () => {
    const { user, intent, ids } = await bought("partial@example.com", { codes: ["az-104", "az-900"] });
    const partial = event("charge.refunded", charge(intent, { amount: 2800, amount_refunded: 900, refunded: false }));
    expect(await handleStripeEvent(db, partial, at(1))).toBe("review");
    expect(await db.stripeEvent.findUniqueOrThrow({ where: { id: partial.id } })).toMatchObject({ error: REVIEW_NOTE });
    expect(await statuses(ids)).toEqual(["paid", "paid"]);
    expect((await passes(ids)).every((p) => p.revokedAt === null)).toBe(true);

    expect(await handleStripeEvent(db, event("charge.refunded", charge(intent, { amount: 2800, amount_refunded: 2800 })), at(2))).toBe("processed");
    expect(await statuses(ids)).toEqual(["refunded", "refunded"]);
    expect((await passes(ids)).every((p) => p.revokedAt?.getTime() === at(2).getTime())).toBe(true);
    expect(await db.auditLog.count({ where: { targetUserId: user, action: "entitlement.revoke" } })).toBe(2);
    expect((await paymentHistory(db, user)).map((p) => p.status)).toEqual(["refunded", "refunded"]);
  });

  it("clears a held payment refunded in Stripe from the list of payments to check", async () => {
    await openSales();
    const user = await verifiedUser("held-refund@example.com");
    const payment = await checkout(user);
    // Charged below the price: held, no Pass.
    expect(await handleStripeEvent(db, event("checkout.session.completed", sessionObject(payment, { amount_total: 100, payment_intent: "pi_held_refund" })), T0)).toBe("held");
    expect((await heldPayments(db)).some((p) => p.id === payment.id)).toBe(true);
    expect(await handleStripeEvent(db, event("charge.refunded", charge("pi_held_refund", { amount: 100, amount_refunded: 100 })), at(1))).toBe("processed");
    expect(await statuses([payment.id])).toEqual(["refunded"]);
    expect((await heldPayments(db)).some((p) => p.id === payment.id)).toBe(false);
  });

  it("withdraws the Pass while a dispute lasts, keeps it withdrawn if lost, and flags a dispute won", async () => {
    const lost = await bought("dispute-lost@example.com");
    // An inquiry from the bank is not a dispute: nothing changes.
    expect(await handleStripeEvent(db, event("charge.dispute.created", contest(lost.intent, "warning_needs_response")), at(1))).toBe("processed");
    expect(await statuses(lost.ids)).toEqual(["paid"]);
    expect(await handleStripeEvent(db, event("charge.dispute.created", contest(lost.intent, "needs_response")), at(1))).toBe("processed");
    expect(await statuses(lost.ids)).toEqual(["disputed"]);
    expect((await passes(lost.ids))[0]!.revokedAt).toEqual(at(1));
    expect(await db.auditLog.findFirstOrThrow({ where: { targetUserId: lost.user, action: "entitlement.revoke" } })).toMatchObject({ details: { reason: "dispute" } });
    expect(await handleStripeEvent(db, event("charge.dispute.closed", contest(lost.intent, "lost")), at(30))).toBe("processed");
    expect(await statuses(lost.ids)).toEqual(["disputed"]);
    expect((await paymentHistory(db, lost.user))[0]!.status).toBe("disputed");

    const won = await bought("dispute-won@example.com");
    await handleStripeEvent(db, event("charge.dispute.created", contest(won.intent, "needs_response")), at(1));
    const closed = event("charge.dispute.closed", contest(won.intent, "won"));
    expect(await handleStripeEvent(db, closed, at(30))).toBe("review");
    expect(await db.stripeEvent.findUniqueOrThrow({ where: { id: closed.id } })).toMatchObject({ error: REVIEW_NOTE });
    // Paid again; the Pass stays withdrawn until an administrator grants it again.
    expect(await statuses(won.ids)).toEqual(["paid"]);
    expect((await passes(won.ids))[0]!.revokedAt).toEqual(at(1));
    // A dispute won after a refund: the refund stands.
    const refunded = await bought("dispute-refunded@example.com");
    await handleStripeEvent(db, event("charge.refunded", charge(refunded.intent)), at(1));
    expect(await handleStripeEvent(db, event("charge.dispute.created", contest(refunded.intent, "needs_response")), at(2))).toBe("processed");
    await handleStripeEvent(db, event("charge.dispute.closed", contest(refunded.intent, "won")), at(30));
    expect(await statuses(refunded.ids)).toEqual(["refunded"]);
    // A dispute on a payment Certidrill does not know: ignored.
    expect(await handleStripeEvent(db, event("charge.dispute.created", contest("pi_unknown", "needs_response")), at(1))).toBe("ignored");
  });

  it("withdraws the Pass when an inquiry becomes a dispute, and never on a late update of a closed one", async () => {
    const { intent, ids } = await bought("inquiry@example.com");
    expect(await handleStripeEvent(db, event("charge.dispute.created", contest(intent, "warning_needs_response")), at(1))).toBe("processed");
    expect(await handleStripeEvent(db, event("charge.dispute.updated", contest(intent, "warning_under_review")), at(2))).toBe("processed");
    expect(await statuses(ids)).toEqual(["paid"]);
    expect(await handleStripeEvent(db, event("charge.dispute.updated", contest(intent, "needs_response")), at(3))).toBe("processed");
    expect(await statuses(ids)).toEqual(["disputed"]);
    expect((await passes(ids))[0]!.revokedAt).toEqual(at(3));
    await handleStripeEvent(db, event("charge.dispute.closed", contest(intent, "won")), at(30));
    // An update after the close (status won), or one still open delivered late: nothing withdrawn again.
    expect(await handleStripeEvent(db, event("charge.dispute.updated", contest(intent, "won")), at(31))).toBe("processed");
    expect(await handleStripeEvent(db, event("charge.dispute.updated", contest(intent, "under_review")), at(32))).toBe("processed");
    expect(await handleStripeEvent(db, event("charge.dispute.created", contest(intent, "needs_response")), at(33))).toBe("processed");
    expect(await statuses(ids)).toEqual(["paid"]);
    expect(await db.auditLog.count({ where: { action: "entitlement.revoke", details: { path: ["entitlementId"], equals: (await passes(ids))[0]!.id } } })).toBe(1);
  });

  it("leaves a held payment held through a dispute, so that it stays to check", async () => {
    await openSales();
    const user = await verifiedUser("held-dispute@example.com");
    const payment = await checkout(user);
    expect(await handleStripeEvent(db, event("checkout.session.completed", sessionObject(payment, { amount_total: 100, payment_intent: "pi_held_dispute" })), T0)).toBe("held");
    expect(await handleStripeEvent(db, event("charge.dispute.created", contest("pi_held_dispute", "needs_response")), at(1))).toBe("processed");
    expect(await statuses([payment.id])).toEqual(["held"]);
    await handleStripeEvent(db, event("charge.dispute.closed", contest("pi_held_dispute", "won")), at(30));
    expect(await statuses([payment.id])).toEqual(["held"]);
    expect((await heldPayments(db)).some((p) => p.id === payment.id)).toBe(true);
  });

  it("sends no confirmation e-mail for a Pass refunded before it left", async () => {
    await db.emailOutbox.deleteMany();
    const { intent } = await bought("refund-mail@example.com");
    await handleStripeEvent(db, event("charge.refunded", charge(intent)), T0);
    const sent: Mail[] = [];
    await drainOutbox(db, { now: T0, sender: async (m) => void sent.push(m), base: BASE });
    expect(sent.filter((m) => m.kind === "purchase")).toHaveLength(0);
  });
});
