-- When Stripe closed a dispute on a payment: a charge has one dispute only,
-- so an event that opens it again, delivered late, is ignored.
ALTER TABLE "payment" ADD COLUMN "disputeClosedAt" TIMESTAMP(3);
