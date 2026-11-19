-- Offers lot C: the waiver of the right of withdrawal stored with each
-- payment, disputes, and refunds and disputes found by payment intent.
ALTER TYPE "PaymentStatus" ADD VALUE 'disputed';

ALTER TABLE "payment" ADD COLUMN "waiverAcceptedAt" TIMESTAMP(3),
ADD COLUMN "waiverText" TEXT,
ADD COLUMN "termsVersion" TEXT;

CREATE INDEX "payment_stripePaymentIntentId_idx" ON "payment"("stripePaymentIntentId");
