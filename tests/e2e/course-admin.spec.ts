import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../lib/auth/password";
import { login, loginAsAdmin } from "./helpers";

/**
 * Course back-office on the production build (docs/SPECS-COURS.md §9, lot D):
 * an administrator reviews a chapter in both languages, publishes it from the
 * interface, and a reader then finds it in the course.
 */
const db = new PrismaClient();
const READER = { email: "e2e-course-admin-reader@certidrill.test", password: "e2e course reader password" };
const CHAPTER = "11-entra-users-groups";

test.beforeAll(async () => {
  const passwordHash = await hashPassword(READER.password);
  await db.user.upsert({
    where: { email: READER.email },
    create: { email: READER.email, passwordHash, name: "E2E Course Reader", emailVerified: new Date(), locale: "en" },
    update: { passwordHash, emailVerified: new Date(), locale: "en" },
  });
  // As loaded by the seed: every chapter in draft.
  await db.courseChapter.updateMany({ data: { status: "draft" } });
});
test.afterAll(async () => {
  await db.courseChapter.updateMany({ data: { status: "draft" } });
  await db.$disconnect();
});

test("an administrator reviews a chapter side by side, publishes it, and a reader then finds it", async ({ page, browser }) => {
  // Nothing published: no course for the reader.
  const reader = await browser.newPage();
  await login(reader, READER);
  await expect(reader.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Course" })).toHaveCount(0);

  await loginAsAdmin(page);
  await page.goto("/admin/questions");
  await page.getByRole("navigation", { name: "Administration" }).getByRole("link", { name: "Course" }).click();
  await page.waitForURL("**/admin/course");
  await expect(page.getByTestId("admin-course-chapter")).toHaveCount(16);
  const row = page.locator(`[data-testid="admin-course-chapter"][data-chapter="${CHAPTER}"]`);
  await expect(row.getByRole("combobox")).toHaveValue("draft");

  // Review: both languages side by side by default, then one language.
  await row.getByRole("link", { name: "Manage Microsoft Entra users and groups" }).click();
  await page.waitForURL(`**/admin/course/az-104/${CHAPTER}`);
  const first = page.getByTestId("admin-course-section").first();
  await expect(first.locator('[lang="en"] h3')).toBeVisible();
  await expect(first.locator('[lang="fr"] h3')).toBeVisible();
  await page.getByRole("navigation", { name: "Language" }).getByRole("link", { name: "French" }).click();
  await page.waitForURL("**?view=fr");
  await expect(page.getByTestId("admin-course-section").first().locator('[lang="en"]')).toHaveCount(0);
  await expect(page.getByTestId("admin-course-section").first().locator('[lang="fr"] h3')).toBeVisible();

  // Publish from the interface.
  await page.getByLabel("Status").selectOption("published");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByLabel("Status")).toHaveValue("published");
  await expect(page.getByText("course.yaml: Draft")).toBeVisible();
  await page.goto("/admin/course");
  await expect(row.getByRole("combobox")).toHaveValue("published");
  await expect(page.getByTestId("admin-course-history")).toContainText(`${CHAPTER}, Draft → Published`);

  // The reader now has the course, and the chapter.
  await reader.goto("/dashboard");
  await reader.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Course" }).click();
  await reader.waitForURL("**/course/az-104");
  await expect(reader.getByTestId("course-chapter")).toHaveCount(1);
  await reader.getByRole("link", { name: /Manage Microsoft Entra users and groups/ }).first().click();
  await reader.waitForURL(`**/course/az-104/${CHAPTER}`);
  await expect(reader.getByTestId("course-section")).toHaveCount(7);
  await expect(reader.getByText(/Preview: this chapter is not published/)).toHaveCount(0);
  await reader.close();
});
