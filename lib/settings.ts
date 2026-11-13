/**
 * Switches stored in the app_setting table (changed without deployment).
 * A missing or non-boolean value reads as false: an offer opens only on purpose.
 */
import type { PrismaClient } from "@prisma/client";

export const SWITCHES = {
  allAccess: "offer.all_access.enabled",
  team: "offer.team.enabled",
  pack: "offer.pack.enabled",
  signupOpen: "signup.open",
  /** Online payment (Stripe Checkout): closed until the legal pages and VAT are ready (offers lot C). */
  checkoutOpen: "billing.checkout.enabled",
} as const;

export type Switch = keyof typeof SWITCHES;

export async function readSwitches(db: PrismaClient): Promise<Record<Switch, boolean>> {
  const rows = await db.appSetting.findMany({ where: { key: { in: Object.values(SWITCHES) } } });
  const on = new Map(rows.map((r) => [r.key, r.value === true]));
  return Object.fromEntries(Object.entries(SWITCHES).map(([name, key]) => [name, on.get(key) ?? false])) as Record<Switch, boolean>;
}
