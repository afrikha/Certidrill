import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "../helpers";

/**
 * Non-regression: the accessibility tree (roles, names, structure) of each
 * question type and of the public pages is compared to a committed snapshot
 * (`*.aria.yml`). Unlike pixel screenshots, ARIA snapshots do not depend on
 * fonts or the operating system, so they are stable between machines and CI.
 *
 * After an intended UI change: `npm run test:regression -- --update-snapshots`,
 * review the diff of the .aria.yml files and commit them.
 */
const QUESTIONS = [
  ["single", "stor-lifecycle-cool-delete"],
  ["multi", "stor-redundancy-regional-outage"],
  ["yesno_statements", "stor-sas-types"],
  ["dropdown", "stor-cli-create-zrs"],
  ["dragdrop", "id-roles-least-privilege"],
  ["ordering", "net-udr-nva"],
  ["hotarea", "net-nsg-effective-rules"],
  ["series_yesno", "series-auditors-1"],
] as const;

test.describe("question types", () => {
  test.beforeEach(async ({ page }) => loginAsAdmin(page));

  for (const lang of ["en", "fr"] as const) {
    for (const [type, id] of QUESTIONS) {
      test(`${type} (${lang})`, async ({ page }) => {
        await page.goto(`/admin/questions/${id}?lang=${lang}`);
        const question = page.locator(`#q-${id}`);
        await expect(question).toBeVisible();
        await expect(question).toMatchAriaSnapshot({ name: `${type}-${lang}.aria.yml` });
      });
    }
  }
});

test.describe("public pages", () => {
  for (const lang of ["en", "fr"] as const) {
    test(`home and login (${lang})`, async ({ page, context }) => {
      await context.addCookies([{ name: "NEXT_LOCALE", value: lang, url: test.info().project.use.baseURL! }]);
      await page.goto("/");
      await expect(page.locator("main")).toMatchAriaSnapshot({ name: `home-${lang}.aria.yml` });
      await page.goto("/login");
      await expect(page.locator("main")).toMatchAriaSnapshot({ name: `login-${lang}.aria.yml` });
    });
  }

  test("not found page", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.locator("main")).toMatchAriaSnapshot({ name: "not-found.aria.yml" });
  });
});
