-- CreateEnum
CREATE TYPE "PlanKind" AS ENUM ('free', 'pass', 'subscription', 'team', 'pack');

-- CreateEnum
CREATE TYPE "TaxBehavior" AS ENUM ('inclusive', 'exclusive');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('none', 'month', 'year');

-- CreateEnum
CREATE TYPE "EntitlementSource" AS ENUM ('purchase', 'pack_code', 'extension', 'admin');

-- AlterTable
ALTER TABLE "certification" ADD COLUMN     "freeAccess" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "plan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "PlanKind" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "taxBehavior" "TaxBehavior" NOT NULL DEFAULT 'inclusive',
    "interval" "BillingInterval" NOT NULL DEFAULT 'none',
    "durationDays" INTEGER,
    "minSeats" INTEGER,
    "examQuota" INTEGER,
    "stripePriceId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "source" "EntitlementSource" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paymentId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_code_key" ON "plan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "plan_stripePriceId_key" ON "plan"("stripePriceId");

-- CreateIndex
CREATE INDEX "entitlement_userId_certificationId_idx" ON "entitlement"("userId", "certificationId");

-- AddForeignKey
ALTER TABLE "entitlement" ADD CONSTRAINT "entitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement" ADD CONSTRAINT "entitlement_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "certification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Initial catalogue (specs des offres §2). These rows are data: prices and
-- limits are then changed in the database, without deployment. The Pass pack
-- (lot F) waits for its price.
INSERT INTO "plan" ("id", "code", "kind", "amountCents", "currency", "taxBehavior", "interval", "durationDays", "minSeats", "examQuota", "active") VALUES
  ('plan_free',         'free',         'free',         0,    'eur', 'inclusive', 'none',  NULL, NULL, 1,    true),
  ('plan_pass_90',      'pass_90',      'pass',         1900, 'eur', 'inclusive', 'none',  90,   NULL, NULL, true),
  ('plan_all_monthly',  'all_monthly',  'subscription', 1200, 'eur', 'inclusive', 'month', NULL, NULL, NULL, true),
  ('plan_all_yearly',   'all_yearly',   'subscription', 7900, 'eur', 'inclusive', 'year',  NULL, NULL, NULL, true),
  ('plan_team_monthly', 'team_monthly', 'team',         900,  'eur', 'exclusive', 'month', NULL, 5,    NULL, true);

-- Offer switches: "Tout accès", "Équipes" and the packs open on decision;
-- public sign-up opens with offers lot A3.
INSERT INTO "app_setting" ("key", "value", "updatedAt") VALUES
  ('offer.all_access.enabled', 'false', CURRENT_TIMESTAMP),
  ('offer.team.enabled',       'false', CURRENT_TIMESTAMP),
  ('offer.pack.enabled',       'false', CURRENT_TIMESTAMP),
  ('signup.open',              'false', CURRENT_TIMESTAMP);
