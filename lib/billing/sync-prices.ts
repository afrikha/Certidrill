/**
 * Links each plan, and each price of a certification (plan_price), to its
 * Stripe price (npm run stripe:sync-prices). A price is found by its lookup
 * key, so running it again changes nothing; a missing one is created with its product. Prices never change in
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

/** What one Stripe price must be: its lookup key, amount and terms, and where its id is stored. */
interface Wanted {
  /** Shown in the report: the plan code, or "<plan>/<certification>". */
  code: string;
  lookupKey: string;
  productName: string;
  amountCents: number;
  currency: string;
  taxBehavior: Plan["taxBehavior"];
  interval: Plan["interval"];
  metadata: Record<string, string>;
  current: string | null;
  save: (priceId: string) => Promise<unknown>;
}

function differences(want: Wanted, price: Stripe.Price): string[] {
  const out: string[] = [];
  if (price.unit_amount !== want.amountCents) out.push(`amount ${price.unit_amount} ≠ ${want.amountCents}`);
  if (price.currency !== want.currency.toLowerCase()) out.push(`currency ${price.currency} ≠ ${want.currency}`);
  if (price.tax_behavior !== want.taxBehavior) out.push(`tax ${price.tax_behavior} ≠ ${want.taxBehavior}`);
  const interval = price.recurring?.interval ?? "none";
  if (interval !== want.interval) out.push(`interval ${interval} ≠ ${want.interval}`);
  return out;
}

async function syncOne(stripe: StripeApi, want: Wanted, dryRun: boolean): Promise<SyncLine> {
  const found = (await stripe.prices.list({ lookup_keys: [want.lookupKey], active: true, limit: 1 })).data[0];
  if (found) {
    const diff = differences(want, found);
    if (diff.length > 0) return { code: want.code, action: "mismatch", priceId: found.id, detail: diff.join(", ") };
    if (want.current === found.id) return { code: want.code, action: "unchanged", priceId: found.id };
    if (!dryRun) await want.save(found.id);
    return { code: want.code, action: dryRun ? "would_link" : "linked", priceId: found.id };
  }
  if (dryRun) return { code: want.code, action: "would_create", priceId: null };
  const product = await stripe.products.create({ name: want.productName, metadata: want.metadata }, { idempotencyKey: `product-${want.lookupKey}` });
  const price = await stripe.prices.create(
    {
      product: product.id,
      unit_amount: want.amountCents,
      currency: want.currency.toLowerCase(),
      tax_behavior: want.taxBehavior,
      lookup_key: want.lookupKey,
      ...(want.interval === "none" ? {} : { recurring: { interval: want.interval } }),
      metadata: want.metadata,
    },
    { idempotencyKey: `price-${want.lookupKey}-${want.amountCents}-${want.currency}` },
  );
  await want.save(price.id);
  return { code: want.code, action: "created", priceId: price.id };
}

/**
 * Links every active plan, and every price of a certification for an active
 * plan, to its Stripe price. A plan's lookup key is its code; a
 * certification's price has the key "<plan>.<certification>.<amount><currency>",
 * so that a new amount is a new Stripe price, never a changed one.
 */
export async function syncPrices(db: PrismaClient, stripe: StripeApi, { dryRun = false }: { dryRun?: boolean } = {}): Promise<SyncLine[]> {
  const plans = await db.plan.findMany({
    where: { active: true, kind: { not: "free" } },
    orderBy: { code: "asc" },
    include: { prices: { include: { certification: { select: { code: true } } }, orderBy: { certification: { code: "asc" } } } },
  });
  const wanted: Wanted[] = plans.flatMap((plan) => [
    {
      code: plan.code,
      lookupKey: plan.code,
      productName: productName(plan),
      amountCents: plan.amountCents,
      currency: plan.currency,
      taxBehavior: plan.taxBehavior,
      interval: plan.interval,
      metadata: { planCode: plan.code },
      current: plan.stripePriceId,
      save: (id: string) => db.plan.update({ where: { id: plan.id }, data: { stripePriceId: id } }),
    },
    ...plan.prices.map((p) => ({
      code: `${plan.code}/${p.certification.code}`,
      lookupKey: `${plan.code}.${p.certification.code}.${p.amountCents}${p.currency.toLowerCase()}`,
      productName: `${productName(plan)} — ${p.certification.code.toUpperCase()}`,
      amountCents: p.amountCents,
      currency: p.currency,
      taxBehavior: plan.taxBehavior,
      interval: plan.interval,
      metadata: { planCode: plan.code, certificationCode: p.certification.code },
      current: p.stripePriceId,
      save: (id: string) => db.planPrice.update({ where: { id: p.id }, data: { stripePriceId: id } }),
    })),
  ]);
  const lines: SyncLine[] = [];
  // One price after the other: the report keeps the order, and Stripe is not flooded.
  for (const want of wanted) lines.push(await syncOne(stripe, want, dryRun)); // NOSONAR: sequential on purpose
  return lines;
}
