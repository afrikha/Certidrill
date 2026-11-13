import { ZodError } from "zod";
import { apiRoute, jsonBody } from "@/lib/api";
import { AccessError } from "@/lib/access";
import { prisma } from "@/lib/db";
import { BillingError, startCheckout } from "@/lib/billing/checkout";
import { stripeApi } from "@/lib/billing/stripe";
import { checkoutLimiter } from "@/lib/security/rate-limit";

/**
 * POST /api/billing/checkout { planCode, certificationCode } — starts a Stripe
 * Checkout session and answers its URL. Never an amount: the price is the plan's.
 */
export const POST = apiRoute(async ({ request, user }) => {
  const input = await jsonBody(request);
  const slot = checkoutLimiter.take(`checkout:${user.id}`);
  if (!slot.ok) throw new BillingError("rate_limited");
  try {
    return await startCheckout(prisma, stripeApi(), user.id, input as { planCode: string; certificationCode: string });
  } catch (err) {
    // Refused before Stripe was asked anything: not an attempt.
    if (err instanceof ZodError || err instanceof AccessError || (err instanceof BillingError && (err.code === "sales_closed" || err.code === "not_found"))) slot.release();
    throw err;
  }
});
