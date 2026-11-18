import { expect, test } from "@playwright/test";

/** The privacy policy (RGPD art. 13), reached from the footer of public pages, without an account. */
test("the privacy policy is reachable from the footer and says how long sign-ins are kept", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy policy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
  for (const section of ["controller", "data", "purposes", "recipients", "retention", "rights", "cookies"]) {
    await expect(page.locator(`[data-section="${section}"] h2`)).toBeVisible();
  }
  await expect(page.locator('[data-section="retention"]')).toContainText("Sign-ins: one year");
  await expect(page.locator('[data-section="data"]')).toContainText("full IP address");
  // The policy is complete: no bracketed passage left for the publisher to fill in.
  await expect(page.locator("main")).not.toContainText("[To ");
});
