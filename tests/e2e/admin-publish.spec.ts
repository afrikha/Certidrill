import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { loginAsAdmin } from "./helpers";

/**
 * Activation and publication by batch on the production build: an
 * administrator publishes the questions of an inactive certification from
 * the questions page, publishes its course, activates it, and it is then
 * offered to visitors. (The e2e server admits draft questions into exams:
 * the refusal of an incomplete bank is covered by the integration tests.)
 */
const db = new PrismaClient();
const CODE = "az-900";

async function restore() {
  const certification = await db.certification.update({ where: { code: CODE }, data: { active: false } });
  await db.question.updateMany({ where: { certificationId: certification.id, status: { not: "retired" } }, data: { status: "draft" } });
  await db.courseChapter.updateMany({ where: { certificationId: certification.id }, data: { status: "draft" } });
}

test.beforeAll(restore);
test.afterAll(async () => {
  // The other specs see AZ-900 as seeded.
  await restore();
  await db.$disconnect();
});

test("an administrator publishes a certification's questions and course by batch, then activates it", async ({ page }) => {
  const since = new Date();
  await loginAsAdmin(page);
  await page.goto("/admin/certifications");
  const row = page.locator(`[data-certification-row="${CODE}"]`);
  await expect(row.getByTestId("visibility")).toHaveText("inactive");
  await expect(row.getByTestId("published-questions")).toContainText("0 published");

  // Questions: the batch applies to the filters of the questions page.
  await row.getByRole("link", { name: "Publish questions…" }).click();
  await expect(page).toHaveURL(/certification=az-900/);
  const batch = page.getByTestId("question-batch");
  await batch.getByRole("button", { name: "Apply" }).click();
  // The box must be ticked (the browser blocks the submission).
  await expect(batch.locator("output")).toHaveCount(0);
  await batch.getByRole("checkbox").check();
  await batch.getByRole("button", { name: "Apply" }).click();
  await expect(batch.locator("output")).toContainText(/\d+ questions changed\./);
  const total = await db.question.count({ where: { certification: { code: CODE }, status: "published" } });
  expect(total).toBeGreaterThan(0);

  // Course, then activation.
  await page.goto("/admin/certifications");
  const course = row.getByTestId(`course-batch-${CODE}`);
  await course.getByRole("checkbox").check();
  await course.getByRole("button", { name: "Apply" }).click();
  await expect(course.locator("output")).toContainText(/chapters? changed\./);
  const activation = row.getByTestId(`active-form-${CODE}`);
  await activation.getByRole("button", { name: "Activate" }).click();
  await expect(activation.locator("output")).toHaveText("Activated: visible to everyone.");
  // The page now offers the opposite action.
  await expect(activation.getByRole("button", { name: "Deactivate" })).toBeVisible();

  await page.reload();
  await expect(row.getByTestId("visibility")).toHaveText("active");
  await expect(row.getByTestId("published-questions")).toContainText(`${total} published`);
  await expect(row.getByText("blueprint.yaml: inactive")).toBeVisible();
  const log = await db.auditLog.findMany({ where: { action: { in: ["question.status", "certification.active"] }, createdAt: { gte: since } }, orderBy: { createdAt: "asc" } });
  expect(log.map((l) => l.action)).toEqual(["question.status", "certification.active"]);

  // Offered to visitors: the home page lists the active certifications.
  await page.context().clearCookies();
  await page.goto("/");
  await expect(page.getByText(/AZ-900/).first()).toBeVisible();
});
