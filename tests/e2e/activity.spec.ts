import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../lib/auth/password";
import { login, loginAsAdmin } from "./helpers";

/**
 * Activity follow-up on the production build: a user's sign-ins (with their
 * IP) and wrong password are recorded and shown on their account page; the
 * administrator sees them in the user's timeline and in the site overview.
 */
const db = new PrismaClient();
const USER = { email: "e2e-activity@certidrill.test", password: "e2e activity password" };

test.beforeAll(async () => {
  await db.user.deleteMany({ where: { email: USER.email } });
  await db.user.create({ data: { email: USER.email, passwordHash: await hashPassword(USER.password), emailVerified: new Date() } });
});
test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: USER.email } });
  await db.$disconnect();
});

test("a user's sign-ins are recorded with their IP, shown to them and to the administrator", async ({ page, browser }) => {
  // A wrong password, then the right one.
  await page.goto("/login");
  await page.locator("#email").fill(USER.email);
  await page.locator("#password").fill("not the password");
  await page.locator("main form button[type=submit]").first().click();
  await expect(page.getByRole("alert")).toBeVisible();
  await login(page, USER);

  await page.goto("/account");
  const logins = page.getByTestId("account-logins");
  await expect(logins.locator('[data-kind="password"]')).toHaveCount(1);
  await expect(logins.locator('[data-kind="failed"]')).toHaveCount(1);
  await expect(logins).toContainText("IP ");

  const admin = await browser.newPage();
  await loginAsAdmin(admin);
  await admin.goto("/admin/users");
  await admin.getByRole("link", { name: USER.email }).click();
  await expect(admin.getByRole("heading", { name: `Activity of ${USER.email}` })).toBeVisible();
  const timeline = admin.getByTestId("user-activity");
  await expect(timeline.locator('[data-kind="login"]')).toHaveCount(2);
  await expect(timeline.locator('[data-kind="account_created"]')).toHaveCount(1);
  await expect(timeline).toContainText("Wrong password");

  await admin.goto("/admin/activity");
  const today = new Date().toISOString().slice(0, 10);
  const row = admin.getByTestId("activity-days").locator(`[data-day="${today}"]`);
  await expect(row.locator('[data-column="signups"]')).not.toHaveText("0");
  await expect(row.locator('[data-column="activeUsers"]')).not.toHaveText("0");
  expect(Number(await admin.getByTestId("active-week").textContent())).toBeGreaterThanOrEqual(2);
  await admin.close();
});
