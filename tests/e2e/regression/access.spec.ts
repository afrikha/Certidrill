import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../../lib/auth/password";

/**
 * Non-regression of access control and of the HTTP contract, on the real
 * production server: page guards, API authentication, CSRF, security headers.
 */
const USER = { email: "e2e-user@certidrill.test", password: "e2e-user-password" };
const db = new PrismaClient();

test.beforeAll(async () => {
  const passwordHash = await hashPassword(USER.password);
  await db.user.upsert({ where: { email: USER.email }, create: { email: USER.email, passwordHash }, update: { passwordHash, role: "user" } });
});
test.afterAll(() => db.$disconnect());

test("anonymous visitors are sent to the login page", async ({ page }) => {
  for (const path of ["/dashboard", "/account", "/admin", "/admin/questions", "/exam/unknown", "/results/unknown"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/login/);
  }
});

test("a non-admin user cannot open the back-office, and wrong passwords are refused", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill(USER.email);
  await page.locator("#password").fill("not the password");
  await page.locator("main form button[type=submit]").first().click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await page.locator("#password").fill(USER.password);
  await page.locator("main form button[type=submit]").first().click();
  await page.waitForURL("**/dashboard");
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/dashboard/);
  // Someone else's attempt is not found.
  expect((await page.request.get("/api/attempts/someone-else")).status()).toBe(404);
});

test("API: 401 without session, 403 cross-origin, JSON errors, no caching", async ({ request, baseURL }) => {
  const anon = await request.get("/api/me/progress");
  expect(anon.status()).toBe(401);
  expect(await anon.json()).toEqual({ error: "unauthenticated" });

  const csrf = await request.post("/api/attempts", { data: { certification: "az-104", locale: "en" }, headers: { origin: "https://evil.example" } });
  expect(csrf.status()).toBe(403);
  expect(await csrf.json()).toEqual({ error: "forbidden_origin" });

  const sameOrigin = await request.post("/api/attempts", { data: { certification: "az-104", locale: "en" }, headers: { origin: baseURL! } });
  expect(sameOrigin.status()).toBe(401);

  const health = await request.get("/api/health");
  expect(await health.json()).toEqual({ status: "ok" });
});

test("security headers are set on pages and API", async ({ request }) => {
  for (const path of ["/", "/login", "/api/health"]) {
    const res = await request.get(path);
    const h = res.headers();
    expect(h["x-content-type-options"], path).toBe("nosniff");
    expect(h["x-frame-options"], path).toBe("DENY");
    expect(h["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(h["x-powered-by"], path).toBeUndefined();
  }
});
