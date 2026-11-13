/**
 * Offers on sale, from the plan table and the offer switches: a disabled offer
 * is not shown (specs des offres §8). The Pass is always on sale while its plan
 * is active; "Tout accès", "Équipes" and packs open with their switch.
 */
import type { BillingInterval, PlanKind, PrismaClient, TaxBehavior } from "@prisma/client";
import { readSwitches } from "@/lib/settings";

export interface Offer {
  code: string;
  kind: PlanKind;
  amountCents: number;
  currency: string;
  taxBehavior: TaxBehavior;
  interval: BillingInterval;
  durationDays: number | null;
  minSeats: number | null;
}

const ORDER: Record<PlanKind, number> = { pass: 0, subscription: 1, team: 2, pack: 3, free: 4 };

export async function getOffers(db: PrismaClient): Promise<Offer[]> {
  const [plans, switches] = await Promise.all([db.plan.findMany({ where: { active: true, kind: { not: "free" } } }), readSwitches(db)]);
  const open: Record<PlanKind, boolean> = { free: false, pass: true, subscription: switches.allAccess, team: switches.team, pack: switches.pack };
  return plans
    .filter((p) => open[p.kind])
    .sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || a.amountCents - b.amountCents)
    .map(({ code, kind, amountCents, currency, taxBehavior, interval, durationDays, minSeats }) => ({ code, kind, amountCents, currency, taxBehavior, interval, durationDays, minSeats }));
}
