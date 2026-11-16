import type { Page } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

export async function loginAsAdmin(page: Page) {
  await login(page, E2E_ADMIN);
}

/** Signs in with a password; lands on the dashboard. */
export async function login(page: Page, { email, password }: { email: string; password: string }) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("main form button[type=submit]").first().click();
  await page.waitForURL("**/dashboard");
}

export async function responseJson(page: Page): Promise<unknown> {
  return JSON.parse((await page.getByTestId("response-json").textContent()) ?? "null");
}
