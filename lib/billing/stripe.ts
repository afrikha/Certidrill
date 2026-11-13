/**
 * The Stripe client (offers lot B). Billing is configured by two secrets in
 * .env: STRIPE_SECRET_KEY (API calls) and STRIPE_WEBHOOK_SECRET (signature of
 * the events Stripe sends). Without them, payment stays unavailable and the
 * rest of the site works as before.
 */
import Stripe from "stripe";

/** What Certidrill uses of the API: a fake with the same shape stands in for it in tests. */
export type StripeApi = Pick<Stripe, "customers" | "checkout" | "prices" | "products">;

let client: Stripe | null = null;

/** Hosts STRIPE_API_BASE may point to: the fake Stripe of the tests runs on this machine. */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * STRIPE_API_BASE points the client to another server (http://127.0.0.1:12111):
 * the fake Stripe of the end-to-end tests. The secret key goes with every
 * call, so only this machine is accepted, and never with a live key.
 */
export function apiBase(base = process.env.STRIPE_API_BASE?.trim(), key = process.env.STRIPE_SECRET_KEY ?? ""): Pick<Stripe.StripeConfig, "host" | "port" | "protocol"> {
  if (!base) return {};
  const url = new URL(base);
  if (!LOOPBACK.has(url.hostname)) throw new Error("STRIPE_API_BASE must point to localhost (tests only)");
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) throw new Error("STRIPE_API_BASE cannot be used with a live key");
  return { host: url.hostname.replace(/^\[(.*)\]$/, "$1"), port: url.port || undefined, protocol: url.protocol === "http:" ? "http" : "https" };
}

/** The API client, or null while STRIPE_SECRET_KEY is not set. */
export function stripeApi(): StripeApi | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  client ??= new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000, telemetry: false, ...apiBase(process.env.STRIPE_API_BASE?.trim(), key) });
  return client;
}

export class WebhookSignatureError extends Error {
  constructor() {
    super("invalid Stripe signature");
    this.name = "WebhookSignatureError";
  }
}

/**
 * The event Stripe sent, once its signature is checked against the raw body
 * (the exact bytes received: a parsed then re-serialised body would not
 * match). Events older than 5 minutes are refused, so a captured request
 * cannot be replayed later.
 */
export function verifyEvent(payload: string, signature: string | null, secret: string, now = Date.now()): Stripe.Event {
  if (!signature) throw new WebhookSignatureError();
  try {
    return Stripe.webhooks.constructEvent(payload, signature, secret, 300, undefined, now);
  } catch {
    throw new WebhookSignatureError();
  }
}
