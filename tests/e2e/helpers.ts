import type { Page } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

export async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.locator("#email").fill(E2E_ADMIN.email);
  await page.locator("#password").fill(E2E_ADMIN.password);
  await page.locator("main form button[type=submit]").first().click();
  await page.waitForURL("**/dashboard");
}

export async function responseJson(page: Page): Promise<unknown> {
  return JSON.parse((await page.getByTestId("response-json").textContent()) ?? "null");
}
