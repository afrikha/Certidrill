import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../lib/auth/password";
import { login, loginAsAdmin } from "./helpers";

/**
 * Course lot B on the production build (docs/SPECS-COURS.md §6): a reader opens
 * the course from the menu, reads a chapter, marks sections read and unread,
 * and finds the progress on the outline and the dashboard; on a computer and
 * on a phone. The seed loads every chapter as a draft: three are published
 * here, the others stay invisible to readers and open to administrators only.
 */
const db = new PrismaClient();
const READER = { email: "e2e-reader@certidrill.test", password: "e2e reader password" };
const PUBLISHED = ["00-getting-started", "11-entra-users-groups", "12-rbac"];

test.beforeAll(async () => {
  const passwordHash = await hashPassword(READER.password);
  await db.user.upsert({
    where: { email: READER.email },
    create: { email: READER.email, passwordHash, name: "E2E Reader", emailVerified: new Date(), locale: "en" },
    update: { passwordHash, emailVerified: new Date(), locale: "en" },
  });
  await db.courseProgress.deleteMany({ where: { user: { email: READER.email } } });
  await db.courseChapter.updateMany({ where: { code: { in: PUBLISHED } }, data: { status: "published" } });
});
test.afterAll(async () => {
  // As loaded by the seed: every chapter in draft.
  await db.courseChapter.updateMany({ where: { code: { in: PUBLISHED } }, data: { status: "draft" } });
  await db.courseProgress.deleteMany({ where: { user: { email: READER.email } } });
  await db.$disconnect();
});

/** Every section of the chapter, as the reader sees it. */
const sections = (page: Page) => page.getByTestId("course-section");

async function noSidewaysScroll(page: Page) {
  const width = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(width[0]).toBeLessThanOrEqual(width[1]!);
}

test.describe.serial("reading the course", () => {
  test("on a computer: outline, chapter, mark read and unread, progress", async ({ page }) => {
    await login(page, READER);
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Course" }).click();
    await page.waitForURL("**/course/az-104");
    await expect(page.getByRole("heading", { level: 1, name: "AZ-104 course" })).toBeVisible();
    // Published chapters only.
    await expect(page.getByTestId("course-chapter")).toHaveCount(3);
    await expect(page.getByText("0 of 17 sections read")).toBeVisible();

    await page.getByTestId("course-resume").click();
    await page.waitForURL("**/course/az-104/00-getting-started#*");
    await page.getByRole("navigation", { name: "Chapters" }).getByRole("link", { name: /Manage Microsoft Entra users and groups/ }).click();
    await page.waitForURL("**/course/az-104/11-entra-users-groups");
    await expect(page.getByRole("heading", { level: 1, name: "Manage Microsoft Entra users and groups" })).toBeVisible();
    await expect(sections(page)).toHaveCount(7);
    // Table of contents beside the text, objectives as pills, a scrolling table, code that can be copied.
    const toc = page.getByRole("navigation", { name: "In this chapter" });
    await expect(toc).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Sections of this chapter" })).toBeHidden();
    const first = sections(page).first();
    await expect(first.getByRole("list", { name: "Exam objectives" }).getByRole("listitem").first()).toContainText("1.1.1");
    await expect(page.getByRole("region", { name: "Table (scrolls sideways)" }).first()).toBeVisible();
    await expect(page.locator("button[data-copy]").first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Further reading" })).toBeVisible();

    await first.getByRole("button", { name: /Mark as read/ }).click();
    await expect(first.getByText("✓ Read")).toBeVisible();
    await expect(first.getByRole("button", { name: /Mark as unread/ })).toBeVisible();
    await page.reload();
    await expect(sections(page).first().getByText("✓ Read")).toBeVisible();
    await expect(page.getByText("1/7 sections")).toBeVisible();
    await sections(page).nth(1).getByRole("button", { name: /Mark as read/ }).click();
    await expect(sections(page).nth(1).getByText("✓ Read")).toBeVisible();
    // Reversible.
    await sections(page).nth(1).getByRole("button", { name: /Mark as unread/ }).click();
    await expect(sections(page).nth(1).getByRole("button", { name: /Mark as read/ })).toBeVisible();

    // The table of contents leads to a section by its stable anchor.
    await toc.getByRole("link", { name: /Managing licenses/ }).click();
    await expect(page).toHaveURL(/#licenses$/);
    await expect(page.locator("section#licenses")).toBeInViewport();

    await page.goto("/course/az-104");
    await expect(page.getByText("1 of 17 sections read")).toBeVisible();
    await expect(page.getByTestId("course-resume")).toHaveAttribute("href", "/course/az-104/00-getting-started#exam-format");
    await page.goto("/dashboard");
    const card = page.getByTestId("dashboard-course");
    await expect(card.getByText("1 of 17 sections read")).toBeVisible();
    await expect(card.getByRole("link", { name: /Resume: Getting started with the AZ-104 exam/ })).toBeVisible();
  });

  test("a chapter in draft is not found by a reader, and shown to an administrator as a preview", async ({ page, browser }) => {
    await login(page, READER);
    const res = await page.goto("/course/az-104/21-storage-access");
    expect(res?.status()).toBe(404);

    const admin = await browser.newPage();
    await loginAsAdmin(admin);
    await admin.goto("/course/az-104/21-storage-access");
    await expect(admin.getByText(/Preview: this chapter is not published \(Draft\)/)).toBeVisible();
    await admin.goto("/course/az-104");
    await expect(admin.getByTestId("course-chapter")).toHaveCount(16);
    await admin.close();
  });

  test("the language changes on the same chapter", async ({ page }) => {
    await login(page, READER);
    await page.goto("/course/az-104/12-rbac#scopes");
    await page.getByRole("button", { name: "fr", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Gérer l'accès aux ressources Azure" })).toBeVisible();
    await expect(page).toHaveURL(/\/course\/az-104\/12-rbac/);
    await page.getByRole("button", { name: "en", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Manage access to Azure resources" })).toBeVisible();
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("the chapter reads without sideways scrolling, with a folding table of contents", async ({ page }) => {
    await login(page, READER);
    await page.goto("/course/az-104/12-rbac");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await noSidewaysScroll(page);
    await expect(page.getByRole("navigation", { name: "In this chapter" })).toBeHidden();
    const toc = page.getByRole("navigation", { name: "Sections of this chapter" });
    await toc.getByText("In this chapter").click();
    await toc.getByRole("link", { name: /Key points/ }).click();
    await expect(page).toHaveURL(/#key-points$/);
    // Wide tables and code scroll inside their own box.
    const table = page.getByRole("region", { name: "Table (scrolls sideways)" }).first();
    await expect(table).toBeVisible();
    expect(await table.evaluate((el) => getComputedStyle(el).overflowX)).toBe("auto");
    await noSidewaysScroll(page);

    const last = sections(page).last();
    await last.getByRole("button", { name: /Mark as read/ }).click();
    await expect(last.getByText("✓ Read")).toBeVisible();
    await page.goto("/course/az-104");
    await noSidewaysScroll(page);
    await expect(page.getByText("2 of 17 sections read")).toBeVisible();
  });
});
