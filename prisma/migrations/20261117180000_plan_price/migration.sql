-- The price of a plan for one certification (a Pass priced per certification).
CREATE TABLE "plan_price" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_price_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "plan_price_amount_check" CHECK ("amountCents" > 0)
);

CREATE UNIQUE INDEX "plan_price_stripePriceId_key" ON "plan_price"("stripePriceId");
CREATE UNIQUE INDEX "plan_price_planId_certificationId_key" ON "plan_price"("planId", "certificationId");
CREATE INDEX "plan_price_certificationId_idx" ON "plan_price"("certificationId");

ALTER TABLE "plan_price" ADD CONSTRAINT "plan_price_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plan_price" ADD CONSTRAINT "plan_price_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "certification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
