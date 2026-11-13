import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../lib/auth/password";
import { loginAsAdmin } from "./helpers";

/**
 * Offers lot B end to end, on the production build, with a fake Stripe
 * (tests/e2e/fake-stripe.mjs): the administrator opens online payment, a user
 * buys a Pass on /pricing, pays on the payment page and comes back; the Pass
 * is active once the signed webhook arrives (sent twice: one Pass, one
 * payment). Leaving the payment page charges nothing.
 */
const db = new PrismaClient();
const BUYER = { email: "e2e-buyer@certidrill.test", password: "e2e buyer password" };

async function setCheckout(value: boolean) {
  const key = "billing.checkout.enabled";
  await db.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

test.beforeAll(async () => {
  await db.user.deleteMany({ where: { email: BUYER.email } });
  await db.user.create({ data: { email: BUYER.email, passwordHash: await hashPassword(BUYER.password), emailVerified: new Date(), locale: "en" } });
  await setCheckout(false);
  // What npm run stripe:sync-prices stores, against the fake Stripe.
  await db.plan.update({ where: { code: "pass_90" }, data: { stripePriceId: "price_e2e_pass_90" } });
});
test.afterAll(async () => {
  // The other specs (and their snapshots) see payment closed, as in production.
  await setCheckout(false);
  await db.plan.update({ where: { code: "pass_90" }, data: { stripePriceId: null } });
  await db.$disconnect();
});

test("a user buys a Pass: paid on Stripe, active once the webhook arrives, once", async ({ page, browser }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Pricing", level: 1 })).toBeVisible();
  await expect(page.getByText("Online payment opens soon.")).toBeVisible();
  await expect(page.getByTestId("buy-pass")).toHaveCount(0);

  await loginAsAdmin(page);
  await page.goto("/admin/billing");
  const row = page.locator('[data-switch="checkoutOpen"]');
  await expect(row).toHaveAttribute("data-enabled", "false");
  await row.getByRole("button", { name: "Turn on" }).click();
  await expect(row).toHaveAttribute("data-enabled", "true");

  const buyer = await browser.newPage();
  await buyer.goto("/pricing");
  await buyer.getByRole("link", { name: "Sign in to buy" }).click();
  await buyer.waitForURL("**/login");
  await buyer.locator("#email").fill(BUYER.email);
  await buyer.locator("#password").fill(BUYER.password);
  await buyer.locator("main form button[type=submit]").first().click();
  await buyer.waitForURL("**/dashboard");

  await buyer.goto("/pricing");
  await buyer.getByTestId("buy-pass").click();
  await buyer.waitForURL(/\/pay\/cs_fake_/);
  await expect(buyer.getByRole("heading", { name: "Fake Stripe Checkout" })).toBeVisible();
  await buyer.getByRole("button", { name: "Pay" }).click();

  await buyer.waitForURL("**/billing/success?session_id=cs_fake_*");
  const status = buyer.getByTestId("purchase-status");
  // Back before the webhook: the page waits for it, it grants nothing itself.
  await expect(status).toHaveAttribute("data-status", "pending");
  await expect(status).toHaveAttribute("data-status", "paid", { timeout: 15_000 });
  await expect(status).toContainText("Your AZ-104 Pass is active until");

  const user = await db.user.findUniqueOrThrow({ where: { email: BUYER.email } });
  // The fake Stripe sends the webhook a second time.
  await expect.poll(() => db.stripeEvent.count({ where: { id: { startsWith: "evt_fake_" }, processedAt: { not: null } } })).toBeGreaterThan(0);
  await buyer.waitForTimeout(1500);
  expect(await db.entitlement.count({ where: { userId: user.id, source: "purchase" } })).toBe(1);
  expect(await db.payment.count({ where: { customer: { userId: user.id }, status: "paid" } })).toBe(1);

  await buyer.getByRole("link", { name: "See billing" }).click();
  await buyer.waitForURL("**/account/billing");
  await expect(buyer.getByTestId("billing-access").locator('[data-certification="az-104"]')).toHaveAttribute("data-level", "full");
  await expect(buyer.getByTestId("payments").locator('tr[data-status="paid"]')).toHaveCount(1);
  await expect(buyer.getByTestId("payments")).toContainText("€19.00");

  // Leaving the payment page: nothing charged, nothing granted.
  await buyer.goto("/pricing");
  await buyer.getByTestId("buy-pass").click();
  await buyer.waitForURL(/\/pay\/cs_fake_/);
  await buyer.getByRole("link", { name: "Cancel" }).click();
  await buyer.waitForURL("**/billing/cancel?certification=az-104");
  await expect(buyer.getByRole("heading", { name: "Payment cancelled" })).toBeVisible();
  expect(await db.entitlement.count({ where: { userId: user.id, source: "purchase" } })).toBe(1);
  await buyer.close();
});
