import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../lib/auth/password";
import { login } from "./helpers";

/**
 * Several certifications on the production build: an inactive one is
 * invisible (pricing, dashboard, course), an active one with its own Pass
 * price shows "from X" and its price; the dashboard shows the global
 * indicator and one certification at a time.
 */
const db = new PrismaClient();
const USER = { email: "e2e-multi@certidrill.test", password: "e2e multi password" };

async function setActive(code: string, active: boolean) {
  await db.certification.update({ where: { code }, data: { active } });
}

test.beforeAll(async () => {
  await db.user.deleteMany({ where: { email: USER.email } });
  await db.user.create({ data: { email: USER.email, passwordHash: await hashPassword(USER.password), emailVerified: new Date(), locale: "en" } });
});
test.afterAll(async () => {
  // The other specs see AZ-104 alone, as seeded.
  await setActive("az-900", false);
  await db.planPrice.deleteMany();
  await db.$disconnect();
});

test("an inactive certification is invisible; an active one with its own price shows it", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByTestId("pass-prices")).toHaveCount(0);
  await expect(page.getByText("AZ-900", { exact: false })).toHaveCount(0);

  const pass = await db.plan.findUniqueOrThrow({ where: { code: "pass_90" } });
  const az900 = await db.certification.findUniqueOrThrow({ where: { code: "az-900" } });
  await db.planPrice.create({ data: { planId: pass.id, certificationId: az900.id, amountCents: 900, currency: "eur" } });
  // Priced but still inactive: nothing shows.
  await page.reload();
  await expect(page.getByTestId("pass-prices")).toHaveCount(0);

  await setActive("az-900", true);
  await page.reload();
  const card = page.locator('[data-offer="pass_90"]');
  await expect(card).toContainText("From €9.00");
  await card.getByText("Price per certification").click();
  const prices = page.getByTestId("pass-prices");
  await expect(prices.getByRole("row", { name: /az-900/i })).toContainText("€9.00");
  await expect(prices.getByRole("row", { name: /az-104/i })).toContainText("€19.00");
});

test("the dashboard shows every certification in the global indicator and one at a time below", async ({ page }) => {
  await setActive("az-900", true);
  await login(page, USER);
  await page.goto("/dashboard");
  // No exam yet: no global indicator, the first active certification, a picker.
  await expect(page.getByTestId("overview")).toHaveCount(0);
  const picker = page.getByTestId("certification-picker");
  await expect(picker.getByRole("combobox", { name: "Certification shown" })).toHaveValue("az-104");
  await expect(page.getByRole("heading", { name: /AZ-104/ }).first()).toBeVisible();
  await picker.getByRole("combobox").selectOption("az-900");
  await picker.getByRole("button", { name: "Show" }).click();
  await expect(page).toHaveURL(/certification=az-900/);
  await expect(page.getByRole("heading", { name: /AZ-900/ }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "New AZ-104 mock exam" })).toHaveCount(0);

  // An inactive certification asked for falls back to an active one.
  await setActive("az-900", false);
  await page.goto("/dashboard?certification=az-900");
  await expect(page.getByTestId("certification-picker")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /AZ-900/ })).toHaveCount(0);
});
