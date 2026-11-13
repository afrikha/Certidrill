import { expect, test } from "@playwright/test";

/**
 * Search engines on the production build: one address per language for the
 * public pages (hreflang, canonical), the language switcher moving between
 * them, robots.txt, the sitemap, icons and the share card, and noindex on the
 * pages behind sign-in.
 */
const head = (page: import("@playwright/test").Page, selector: string, attr = "href") => page.locator(`head ${selector}`).getAttribute(attr);

test("a bare public address opens in the visitor's language, with its canonical and hreflang links", async ({ page, baseURL }) => {
  const response = await page.goto("/");
  expect(new URL(page.url()).pathname).toBe("/en");
  expect(response?.request().redirectedFrom()?.url()).toBe(`${baseURL}/`);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveTitle(/AZ-104 practice exams with explained corrections · Certidrill/);
  expect(await head(page, 'meta[name="description"]', "content")).toMatch(/AZ-104 mock exams/);
  expect(await head(page, 'link[rel="canonical"]')).toBe(`${baseURL}/en`);
  expect(await head(page, 'link[rel="alternate"][hreflang="fr"]')).toBe(`${baseURL}/fr`);
  expect(await head(page, 'link[rel="alternate"][hreflang="x-default"]')).toBe(`${baseURL}/en`);
  expect(await head(page, 'meta[property="og:url"]', "content")).toBe(`${baseURL}/en`);
  expect(await head(page, 'meta[property="og:locale"]', "content")).toBe("en_US");
  expect(await head(page, 'meta[property="og:image"]', "content")).toContain("/opengraph-image");
  expect(await head(page, 'meta[name="twitter:card"]', "content")).toBe("summary_large_image");
  await expect(page.locator('head meta[name="robots"]')).toHaveCount(0);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "null");
  expect(ld["@graph"].map((n: { "@type": string }) => n["@type"])).toEqual(["Organization", "WebSite"]);
});

test("the French address is served in French; the switcher moves between the two addresses", async ({ page, baseURL }) => {
  await page.goto("/fr/pricing");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page).toHaveTitle(/Examens blancs AZ-104 : tarifs · Certidrill/);
  expect(await head(page, 'link[rel="canonical"]')).toBe(`${baseURL}/fr/pricing`);
  expect(await head(page, 'link[rel="alternate"][hreflang="en"]')).toBe(`${baseURL}/en/pricing`);
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Tarifs" })).toHaveAttribute("href", "/fr/pricing");

  await page.getByRole("form", { name: "Langue" }).getByRole("button", { name: "en" }).click();
  await page.waitForURL("**/en/pricing");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("form", { name: "Language" }).getByRole("button", { name: "en" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/en/pricing");

  await page.getByRole("form", { name: "Language" }).getByRole("button", { name: "fr" }).click();
  await page.waitForURL("**/fr/pricing");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});

test("the pages reached from a public page stay in its language", async ({ page }) => {
  // An English browser landing on the French page (from a search result).
  await page.goto("/fr");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Se connecter" }).click();
  await page.waitForURL("**/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Connexion à Certidrill");
  expect(await head(page, 'meta[name="robots"]', "content")).toContain("noindex");
  // A bare address now follows that choice.
  await page.goto("/pricing");
  expect(new URL(page.url()).pathname).toBe("/fr/pricing");
});

test("robots.txt, the sitemap, the icons and the share card", async ({ request, baseURL }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Allow: /");
  for (const path of ["/api/", "/admin", "/dashboard", "/exam/", "/results/"]) expect(robots).toContain(`Disallow: ${path}`);
  expect(robots).toContain(`Sitemap: ${baseURL}/sitemap.xml`);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  for (const path of ["/en", "/fr", "/en/pricing", "/fr/pricing"]) expect(xml).toContain(`<loc>${baseURL}${path}</loc>`);
  expect(xml).toContain(`hreflang="fr"`);

  for (const [path, type] of [["/favicon.ico", "image/x-icon"], ["/icon.svg", "image/svg+xml"], ["/apple-icon", "image/png"], ["/opengraph-image", "image/png"]] as const) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()["content-type"], path).toContain(type);
  }
});

test("the pages behind sign-in are not indexed", async ({ page }) => {
  for (const path of ["/signup", "/verify-email"]) {
    await page.goto(path);
    expect(await head(page, 'meta[name="robots"]', "content"), path).toContain("noindex");
  }
});
