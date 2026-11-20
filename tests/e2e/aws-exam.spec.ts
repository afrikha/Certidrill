import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../lib/auth/password";
import { login } from "./helpers";

/**
 * A 75-question, 180-minute exam (SAP-C03) on the production build: the
 * welcome screen, timer, question counter, navigation, review screen and
 * report follow the blueprint. The bank is published in the e2e database
 * only, and put back as seeded (inactive, draft) afterwards.
 */
const db = new PrismaClient();
const USER = { email: "e2e-aws@certidrill.test", password: "e2e aws password" };
const CODE = "sap-c03";

async function setBank(active: boolean) {
  const cert = await db.certification.update({ where: { code: CODE }, data: { active } });
  await db.question.updateMany({ where: { certificationId: cert.id }, data: { status: active ? "published" : "draft" } });
  return cert;
}

test.beforeAll(async () => {
  await db.user.deleteMany({ where: { email: USER.email } });
  const user = await db.user.create({ data: { email: USER.email, passwordHash: await hashPassword(USER.password), emailVerified: new Date(), locale: "en" } });
  const cert = await setBank(true);
  await db.entitlement.create({
    data: { userId: user.id, certificationId: cert.id, source: "admin", startsAt: new Date("2000-01-01T00:00:00Z"), expiresAt: new Date("2100-01-01T00:00:00Z") },
  });
});
test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: USER.email } });
  await setBank(false);
  await db.$disconnect();
});

test("SAP-C03: 75 questions, 180 minutes, navigation, review and report", async ({ page }) => {
  await login(page, USER);
  await page.goto(`/dashboard?certification=${CODE}`);
  await page.getByRole("button", { name: "New mock exam" }).click();
  await page.waitForURL(/\/exam\//);
  const attemptId = page.url().split("/exam/")[1]!;

  await expect(page.getByText("AWS Certified Solutions Architect – Professional")).toBeVisible();
  await expect(page.getByText(/^Duration: 180 minutes\./)).toBeVisible();
  await expect(page.getByText("Number of questions: 75")).toBeVisible();
  await expect(page.getByText(/case study/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Start" }).click();

  // 3 hours on the clock, the counter on 75.
  await expect(page.getByTestId("timer")).toHaveText(/^(3:00:00|2:59:\d\d)$/);
  await expect(page.getByText("Question 1 of 75")).toBeVisible();
  const deadline = (await db.attempt.findUniqueOrThrow({ where: { id: attemptId } })).deadlineAt!;
  const started = (await db.attempt.findUniqueOrThrow({ where: { id: attemptId } })).startedAt!;
  expect(deadline.getTime() - started.getTime()).toBe(180 * 60_000);

  // Answer the first question, then walk forward with Next.
  const saved = page.waitForResponse((r) => r.request().method() === "PUT" && r.url().includes("/items/") && r.ok());
  const main = page.locator("main article");
  if (await main.getByRole("radio").count()) await main.getByRole("radio").first().check();
  else await main.getByRole("checkbox").first().check();
  await saved;
  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.getByText("Question 2 of 75")).toBeVisible();
  await page.getByRole("button", { name: "← Previous" }).click();
  await expect(page.getByText("Question 1 of 75")).toBeVisible();

  // The review screen lists the 75 questions and opens the last one.
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review your answers" })).toBeVisible();
  await expect(page.locator("main li")).toHaveCount(75);
  await page.getByRole("button", { name: /^Go to question 75 —/ }).click();
  await expect(page.getByText("Question 75 of 75")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next →" })).toHaveCount(0);
  await page.getByRole("button", { name: "Review →" }).click();

  const finish = page.getByRole("button", { name: "Finish the exam" });
  await finish.click();
  await page.getByRole("dialog").getByRole("button", { name: "Finish the exam" }).click();
  await page.waitForURL(`**/results/${attemptId}`);

  // The report: on 1000, pass mark 720, 75 points possible, time out of 180 minutes.
  await expect(page.getByTestId("scaled-score")).toContainText("/ 1000");
  await expect(page.getByText("Pass mark: 720")).toBeVisible();
  await expect(page.getByText(/^\d+ \/ 75 points$/)).toBeVisible();
  await expect(page.getByText(/^Time used: \d+ of 180 minutes$/)).toBeVisible();
  await expect(page.getByTestId("score-note")).toContainText("AWS");
  await expect(page.getByTestId("score-note")).not.toContainText("Microsoft");
});
