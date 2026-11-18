-- A purchase (one Stripe Checkout session) may hold several Passes: one
-- payment row per Pass, grouped by checkoutId. Earlier payments are each
-- their own purchase; their sessions name them by paymentId (= checkoutId).
ALTER TABLE "payment" ADD COLUMN "checkoutId" TEXT;
UPDATE "payment" SET "checkoutId" = "id";
ALTER TABLE "payment" ALTER COLUMN "checkoutId" SET NOT NULL;

DROP INDEX "payment_stripeCheckoutSessionId_key";
CREATE INDEX "payment_stripeCheckoutSessionId_idx" ON "payment"("stripeCheckoutSessionId");
CREATE INDEX "payment_checkoutId_idx" ON "payment"("checkoutId");
