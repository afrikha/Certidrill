/**
 * Links each plan to its Stripe price (npm run stripe:sync-prices). A price is
 * found by its lookup key, the plan code, so running it again changes
 * nothing; a missing one is created with its product. Prices never change in
 * Stripe: a plan whose Stripe price no longer matches is reported, not
 * modified (a new price is a new plan, specs des offres §8).
 */
import type { Plan, PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import fr from "@/messages/fr.json";
import type { StripeApi } from "./stripe";

export type SyncAction = "unchanged" | "linked" | "created" | "mismatch" | "would_link" | "would_create";

export interface SyncLine {
  code: string;
  action: SyncAction;
  priceId: string | null;
  /** What differs, for a mismatch. */
  detail?: string;
}

/** The product name shown on the Stripe payment page and receipts. */
export function productName(plan: Pick<Plan, "kind" | "durationDays">): string {
  const name = fr.offer[`name_${plan.kind}`];
  return plan.durationDays ? `${name} — ${plan.durationDays} jours` : name;
}

function differences(plan: Plan, price: Stripe.Price): string[] {
  const out: string[] = [];
  if (price.unit_amount !== plan.amountCents) out.push(`amount ${price.unit_amount} ≠ ${plan.amountCents}`);
  if (price.currency !== plan.currency) out.push(`currency ${price.currency} ≠ ${plan.currency}`);
  if (price.tax_behavior !== plan.taxBehavior) out.push(`tax ${price.tax_behavior} ≠ ${plan.taxBehavior}`);
  const interval = price.recurring?.interval ?? "none";
  if (interval !== plan.interval) out.push(`interval ${interval} ≠ ${plan.interval}`);
  return out;
}

export async function syncPrices(db: PrismaClient, stripe: StripeApi, { dryRun = false }: { dryRun?: boolean } = {}): Promise<SyncLine[]> {
  const plans = await db.plan.findMany({ where: { active: true, kind: { not: "free" } }, orderBy: { code: "asc" } });
  const lines: SyncLine[] = [];
  for (const plan of plans) {
    const found = (await stripe.prices.list({ lookup_keys: [plan.code], active: true, limit: 1 })).data[0];
    if (found) {
      const diff = differences(plan, found);
      if (diff.length > 0) {
        lines.push({ code: plan.code, action: "mismatch", priceId: found.id, detail: diff.join(", ") });
      } else if (plan.stripePriceId === found.id) {
        lines.push({ code: plan.code, action: "unchanged", priceId: found.id });
      } else {
        if (!dryRun) await db.plan.update({ where: { id: plan.id }, data: { stripePriceId: found.id } });
        lines.push({ code: plan.code, action: dryRun ? "would_link" : "linked", priceId: found.id });
      }
      continue;
    }
    if (dryRun) {
      lines.push({ code: plan.code, action: "would_create", priceId: null });
      continue;
    }
    const product = await stripe.products.create({ name: productName(plan), metadata: { planCode: plan.code } }, { idempotencyKey: `product-${plan.code}` });
    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: plan.amountCents,
        currency: plan.currency,
        tax_behavior: plan.taxBehavior,
        lookup_key: plan.code,
        ...(plan.interval === "none" ? {} : { recurring: { interval: plan.interval } }),
        metadata: { planCode: plan.code },
      },
      { idempotencyKey: `price-${plan.code}-${plan.amountCents}-${plan.currency}` },
    );
    await db.plan.update({ where: { id: plan.id }, data: { stripePriceId: price.id } });
    lines.push({ code: plan.code, action: "created", priceId: price.id });
  }
  return lines;
}
