-- A payment charged below the plan price (or in another currency): no Pass until an administrator looks.
ALTER TYPE "PaymentStatus" ADD VALUE 'held';

-- What Stripe charged, and in which currency; amountCents and currency stay the price asked.
ALTER TABLE "payment" ADD COLUMN "chargedCents" INTEGER,
ADD COLUMN "chargedCurrency" TEXT;
