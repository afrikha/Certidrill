import { apiRoute, jsonBody } from "@/lib/api";
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
  if (!checkoutLimiter.hit(`checkout:${user.id}`)) throw new BillingError("rate_limited");
  return startCheckout(prisma, stripeApi(), user.id, input as { planCode: string; certificationCode: string });
});
