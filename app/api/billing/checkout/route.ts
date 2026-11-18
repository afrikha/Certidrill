import { ZodError } from "zod";
import { apiRoute, jsonBody } from "@/lib/api";
import { AccessError } from "@/lib/access";
import { prisma } from "@/lib/db";
import { BillingError, startCheckout } from "@/lib/billing/checkout";
import { stripeApi } from "@/lib/billing/stripe";
import { checkoutLimiter } from "@/lib/security/rate-limit";

/**
 * POST /api/billing/checkout { planCode, certificationCodes: [...] } (or
 * certificationCode for one Pass) — starts a Stripe Checkout session for one
 * Pass per certification and answers its URL. Never an amount: the prices are read on the server.
 */
export const POST = apiRoute(async ({ request, user }) => {
  const input = await jsonBody(request);
  const slot = checkoutLimiter.take(`checkout:${user.id}`);
  if (!slot.ok) throw new BillingError("rate_limited");
  try {
    return await startCheckout(prisma, stripeApi(), user.id, input as Parameters<typeof startCheckout>[3]);
  } catch (err) {
    // Refused before Stripe was asked anything: not an attempt.
    if (err instanceof ZodError || err instanceof AccessError || (err instanceof BillingError && (err.code === "sales_closed" || err.code === "not_found"))) slot.release();
    throw err;
  }
});
