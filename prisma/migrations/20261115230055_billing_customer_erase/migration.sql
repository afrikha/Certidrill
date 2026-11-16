-- Right to erasure at Stripe: the Stripe customer of a deleted account is deleted
-- by the worker (lib/billing/erase.ts); these columns follow that deletion.
ALTER TABLE "billing_customer" ADD COLUMN     "eraseAfter" TIMESTAMP(3),
ADD COLUMN     "eraseAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stripeDeletedAt" TIMESTAMP(3);
