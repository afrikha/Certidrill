import { expect, test } from "@playwright/test";

/** The legal notice (LCEN art. 6-III), reached from the footer of public pages, without an account. */
test("the legal notice is reachable from the footer and names the publisher and the host", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("contentinfo").getByRole("link", { name: "Legal notice" }).click();
  await expect(page).toHaveURL(/\/legal$/);
  await expect(page.getByRole("heading", { level: 1, name: "Legal notice" })).toBeVisible();
  for (const section of ["publisher", "director", "host", "ip", "data"]) {
    await expect(page.locator(`[data-section="${section}"] h2`)).toBeVisible();
  }
  await expect(page.locator('[data-section="publisher"]')).toContainText("Square-soft");
  await expect(page.locator('[data-section="host"]')).toContainText("IONOS");
  await expect(page.locator("main")).not.toContainText("__");
});

/** The terms of sale (CGV), from the footer and from the purchase box: withdrawal, VAT franchise, mediator. */
test("the terms of sale are reachable from the footer, with the withdrawal and VAT clauses", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("contentinfo").getByRole("link", { name: "Terms of sale" }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole("heading", { level: 1, name: "Terms of sale" })).toBeVisible();
  for (const section of ["scope", "service", "price", "order", "withdrawal", "conformity", "mediation", "law"]) {
    await expect(page.locator(`[data-section="${section}"] h2`)).toBeVisible();
  }
  await expect(page.locator('[data-section="withdrawal"]')).toContainText("L221-28");
  await expect(page.locator('[data-section="price"]')).toContainText("293 B");
  await expect(page.locator('[data-section="data"]').getByRole("link")).toHaveAttribute("href", "/privacy");
  await expect(page.locator("main")).not.toContainText("__");
});
