import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MAX_BODY_BYTES, PayloadTooLargeError, readBody } from "@/lib/api";
import { verifyEvent, WebhookSignatureError } from "@/lib/billing/stripe";
import { handleStripeEvent } from "@/lib/billing/webhook";
import { kickEmailWorker } from "@/lib/email/worker";
import { logError, logEvent } from "@/lib/log";

/**
 * POST /api/webhooks/stripe — events sent by Stripe. No session and no
 * same-origin check: the Stripe signature of the raw body authenticates the
 * request (STRIPE_WEBHOOK_SECRET). A 2xx tells Stripe the event is handled;
 * any other answer makes it retry later.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  let payload: string;
  try {
    payload = await readBody(request, MAX_BODY_BYTES * 4);
  } catch (err) {
    if (err instanceof PayloadTooLargeError) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    throw err;
  }
  let event;
  try {
    event = verifyEvent(payload, request.headers.get("stripe-signature"), secret);
  } catch (err) {
    if (err instanceof WebhookSignatureError) return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
    throw err;
  }
  try {
    const outcome = await handleStripeEvent(prisma, event);
    logEvent("billing.webhook", { id: event.id, type: event.type, outcome });
    // The confirmation e-mail leaves now rather than at the next minute.
    if (outcome === "processed") after(() => kickEmailWorker(prisma));
    return NextResponse.json({ received: true, outcome });
  } catch (err) {
    logError("billing.webhook", err, { id: event.id, type: event.type });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
