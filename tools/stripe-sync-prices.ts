/**
 * Creates or finds the Stripe price of each active plan (lookup key = plan
 * code) and stores its id in the plan table. Safe to run again.
 *   npm run stripe:sync-prices [-- --dry-run]
 * Needs STRIPE_SECRET_KEY (test or live key: the prices are created in that mode).
 */
import { parseArgs } from "node:util";
import { PrismaClient } from "@prisma/client";
import { stripeApi } from "../lib/billing/stripe";
import { syncPrices } from "../lib/billing/sync-prices";

async function main() {
  const { values } = parseArgs({ options: { "dry-run": { type: "boolean", default: false } } });
  const stripe = stripeApi();
  if (!stripe) throw new Error("STRIPE_SECRET_KEY is not set");
  const mode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test";
  const db = new PrismaClient();
  try {
    const lines = await syncPrices(db, stripe, { dryRun: values["dry-run"] });
    console.log(`Stripe ${mode} mode${values["dry-run"] ? " (dry run: nothing changed)" : ""}`);
    for (const l of lines) console.log(`${l.action.padEnd(13)} ${l.code.padEnd(14)} ${l.priceId ?? ""}${l.detail ? `  (${l.detail})` : ""}`);
    if (lines.some((l) => l.action === "mismatch")) {
      console.error("Some Stripe prices differ from their plan: archive them in Stripe, or give the plan a new code (a new price is a new plan).");
      process.exitCode = 1;
    }
  } finally {
    await db.$disconnect();
  }
}

try {
  await main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
