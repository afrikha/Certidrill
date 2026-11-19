/**
 * Prices per certification. A plan has one price (table `plan`); a
 * certification may have its own price for that plan (table `plan_price`),
 * e.g. a cheaper Pass for a fundamentals exam. The browser never sends a
 * price: every purchase reads it here.
 */
import type { Plan, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { audit } from "@/lib/audit";

export interface Price {
  amountCents: number;
  currency: string;
  /** The Stripe price to charge; null until `npm run stripe:sync-prices` links one. */
  stripePriceId: string | null;
  /** true when the certification has its own price, false for the plan's. */
  custom: boolean;
}

type PlanPriceFields = Pick<Plan, "amountCents" | "currency" | "stripePriceId">;

/** The price of a plan for a certification: its own price when it has one, the plan's otherwise. */
export function resolvePrice(plan: PlanPriceFields, own?: { amountCents: number; currency: string; stripePriceId: string | null } | null): Price {
  if (own) return { amountCents: own.amountCents, currency: own.currency, stripePriceId: own.stripePriceId, custom: true };
  return { amountCents: plan.amountCents, currency: plan.currency, stripePriceId: plan.stripePriceId, custom: false };
}

/** The price of one plan for one certification (by id). */
export async function priceFor(db: PrismaClient, plan: Plan, certificationId: string): Promise<Price> {
  const own = await db.planPrice.findUnique({ where: { planId_certificationId: { planId: plan.id, certificationId } } });
  return resolvePrice(plan, own);
}

export interface CertificationPrice extends Price {
  code: string;
  title: string;
  /** certification.vendor: the Pass are grouped by vendor on the pricing page. */
  vendor: string;
}

/** The price of a plan for every active certification, in code order. */
export async function pricesByCertification(db: PrismaClient, planCode: string): Promise<CertificationPrice[]> {
  const plan = await db.plan.findUnique({ where: { code: planCode } });
  if (!plan) return [];
  const [certifications, own] = await Promise.all([
    db.certification.findMany({ where: { active: true }, orderBy: { code: "asc" }, select: { id: true, code: true, title: true, vendor: true } }),
    db.planPrice.findMany({ where: { planId: plan.id } }),
  ]);
  const byCertification = new Map(own.map((p) => [p.certificationId, p]));
  return certifications.map((c) => ({ code: c.code, title: c.title, vendor: c.vendor, ...resolvePrice(plan, byCertification.get(c.id)) }));
}

/** The lowest and highest amounts of a list of prices in one currency, for "from X" labels; null when empty or mixed. */
export function priceRange(prices: readonly Pick<Price, "amountCents" | "currency">[]): { min: number; max: number; currency: string } | null {
  if (prices.length === 0 || prices.some((p) => p.currency.toLowerCase() !== prices[0]!.currency.toLowerCase())) return null;
  const amounts = prices.map((p) => p.amountCents);
  return { min: Math.min(...amounts), max: Math.max(...amounts), currency: prices[0]!.currency };
}

/** "12", "12.5", "12,50": an amount in currency units, from 0.50 to 9999.99. */
const amountSchema = z
  .string()
  .trim()
  .regex(/^\d{1,4}([.,]\d{1,2})?$/)
  .transform((v) => Math.round(Number(v.replace(",", ".")) * 100))
  .refine((cents) => cents >= 50, "at least 0.50");

export const certificationPriceSchema = z.object({
  planCode: z.string().trim().min(1).max(64),
  certificationCode: z.string().trim().min(1).max(32),
  /** Empty: back to the plan's price. */
  amount: z.union([z.literal("").transform(() => null), amountSchema]),
});

/**
 * Sets (or removes, with an empty amount) the price of a plan for one
 * certification, with its trace in the audit log. The plan's own price
 * removes the row. A new amount needs a new Stripe price: the link is cleared
 * until `npm run stripe:sync-prices` creates it, and that certification's
 * Pass is not on sale online meanwhile. Returns false when nothing changed,
 * null for an unknown plan or certification.
 */
export async function setCertificationPrice(db: PrismaClient, actorId: string, input: z.input<typeof certificationPriceSchema>): Promise<boolean | null> {
  const { planCode, certificationCode, amount } = certificationPriceSchema.parse(input);
  return db.$transaction(async (tx) => {
    const [plan, certification] = await Promise.all([
      tx.plan.findUnique({ where: { code: planCode } }),
      tx.certification.findUnique({ where: { code: certificationCode }, select: { id: true } }),
    ]);
    if (!plan || plan.kind === "free" || !certification) return null;
    const key = { planId_certificationId: { planId: plan.id, certificationId: certification.id } };
    const own = await tx.planPrice.findUnique({ where: key });
    const from = own?.amountCents ?? plan.amountCents;
    const to = amount === null || amount === plan.amountCents ? null : amount;
    if ((own?.amountCents ?? null) === to) return false;
    if (to === null) await tx.planPrice.deleteMany({ where: key.planId_certificationId });
    else await tx.planPrice.upsert({ where: key, create: { ...key.planId_certificationId, amountCents: to, currency: plan.currency }, update: { amountCents: to, stripePriceId: null } });
    await audit(tx, { actorId, action: "price.update", details: { plan: planCode, certification: certificationCode, from, to: to ?? plan.amountCents, currency: plan.currency } });
    return true;
  });
}
