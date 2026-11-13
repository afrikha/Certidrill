-- A payment charged below the plan price (or in another currency): no Pass until an administrator looks.
ALTER TYPE "PaymentStatus" ADD VALUE 'held';

-- What Stripe charged; amountCents stays the price asked.
ALTER TABLE "payment" ADD COLUMN "chargedCents" INTEGER;
