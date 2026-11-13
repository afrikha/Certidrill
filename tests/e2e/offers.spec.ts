import { createHash, randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../lib/auth/password";
import { loginAsAdmin } from "./helpers";

/**
 * Offers lot A on the production build: the administrator opens sign-ups,
 * a visitor signs up and follows the link, the administrator grants a Pass
 * by hand, and the offer screen shows the offers on sale.
 */
const db = new PrismaClient();
const EMAIL = "e2e-signup@certidrill.test";
const PASSWORD = "e2e signup password";

async function setSignup(value: boolean) {
  await db.appSetting.upsert({ where: { key: "signup.open" }, create: { key: "signup.open", value }, update: { value } });
}

test.beforeAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
  await db.signupRequest.deleteMany({ where: { email: EMAIL } });
  await setSignup(false);
});
test.afterAll(async () => {
  // The other specs (and their snapshots) see sign-ups closed, as in production.
  await setSignup(false);
  await db.$disconnect();
});

test("the administrator opens sign-ups; a visitor signs up, follows the link and signs in", async ({ page, browser }) => {
  await page.goto("/signup");
  await expect(page.getByTestId("signup-closed")).toBeVisible();

  await loginAsAdmin(page);
  await page.goto("/admin/billing");
  const row = page.locator('[data-switch="signupOpen"]');
  await expect(row).toHaveAttribute("data-enabled", "false");
  await row.getByRole("button", { name: "Turn on" }).click();
  await expect(row).toHaveAttribute("data-enabled", "true");
  await expect(page.getByTestId("audit-log").locator('[data-action="setting.update"]').first()).toContainText("signup.open");

  const visitor = await browser.newPage();
  await visitor.goto("/");
  await visitor.getByRole("link", { name: "Create a free account" }).click();
  await visitor.waitForURL("**/signup");
  await visitor.locator("#signup-email").fill(EMAIL);
  await visitor.locator("#signup-password").fill(PASSWORD);
  await visitor.locator("#signup-confirm").fill("not the same password");
  await visitor.getByRole("button", { name: "Create my account" }).click();
  await expect(visitor.getByTestId("signup-error")).toHaveText("The two passwords do not match.");
  await visitor.locator("#signup-password").fill(PASSWORD);
  await visitor.locator("#signup-confirm").fill(PASSWORD);
  await visitor.getByRole("button", { name: "Create my account" }).click();
  await expect(visitor.getByTestId("signup-sent")).toBeVisible();
  // No account before the link is followed.
  expect(await db.user.findUnique({ where: { email: EMAIL } })).toBeNull();
  expect(await db.signupRequest.count({ where: { email: EMAIL } })).toBe(1);

  // The e-mail is not read here: a request with a known token stands for it.
  const token = randomBytes(32).toString("base64url");
  await db.signupRequest.create({
    data: { email: EMAIL, passwordHash: await hashPassword(PASSWORD), locale: "en", tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 3_600_000) },
  });
  // Opening the link creates nothing: the password chosen at sign-up is asked again.
  await visitor.goto(`/verify-email?token=${token}`);
  await expect(visitor.getByRole("heading", { name: "Confirm your sign-up" })).toBeVisible();
  expect(await db.user.findUnique({ where: { email: EMAIL } })).toBeNull();
  await visitor.locator("#confirm-password").fill("not the password at all");
  await visitor.getByRole("button", { name: "Create my account" }).click();
  await expect(visitor.getByTestId("confirm-error")).toBeVisible();
  await visitor.locator("#confirm-password").fill(PASSWORD);
  await visitor.getByRole("button", { name: "Create my account" }).click();
  // Created and signed in.
  await visitor.waitForURL("**/dashboard");
  await expect(visitor.getByTestId("access").first()).toContainText("Free access");
  // The same link a second time: back to the sign-up page, which says so.
  const other = await browser.newPage();
  await other.goto(`/verify-email?token=${token}`);
  await expect(other.getByTestId("verify-error")).toBeVisible();
  await other.close();

  // The administrator grants a Pass by hand: the dashboard shows it.
  await page.goto(`/admin/billing?q=${encodeURIComponent("e2e-signup")}`);
  await page.getByTestId("user-results").getByRole("link", { name: EMAIL }).click();
  await expect(page.getByTestId("billing-user")).toContainText(EMAIL);
  const grant = page.getByTestId("grant-form");
  await grant.locator("#grant-days").fill("30");
  await grant.locator("#grant-reason").fill("e2e goodwill");
  await grant.getByRole("button", { name: "Grant" }).click();
  await expect(grant.getByText(/Pass granted/)).toBeVisible();
  await expect(page.locator('[data-certification="az-104"]')).toHaveAttribute("data-level", "full");
  await expect(page.getByTestId("entitlements").locator('[data-state="active"]')).toHaveCount(1);
  await expect(page.getByTestId("audit-log").locator('[data-action="entitlement.grant"]')).toContainText("e2e goodwill");

  await visitor.reload();
  await expect(visitor.getByTestId("access").first()).toContainText(/Pass: (29|30) days left/);
  await visitor.close();
});

test("the offer screen gives the reason and the offers on sale, and resists odd parameters", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/offer?reason=quota_exhausted&certification=az-104");
  await expect(page.getByTestId("offer")).toHaveAttribute("data-reason", "quota_exhausted");
  await expect(page.locator("[data-offer]")).toHaveCount(1);
  await expect(page.locator('[data-offer="pass_90"]')).toContainText("€19.00");
  await expect(page.locator('[data-offer="pass_90"] button')).toBeDisabled();

  const odd = await page.goto("/offer?reason=a&reason=b&certification=x&certification=y");
  expect(odd?.status()).toBe(200);
  await expect(page.getByTestId("offer")).toHaveAttribute("data-reason", "correction");
});
