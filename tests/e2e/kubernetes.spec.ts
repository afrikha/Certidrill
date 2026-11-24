import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../lib/auth/password";
import { login } from "./helpers";

/**
 * KCNA (docs/SPECS-KUBERNETES.md), offered in English only (docs/SPECS-AWS.md
 * §3.7), for a reader whose interface is in French: the course and the exam
 * are in English with the "English only" note, the labels stay French, the
 * score is a percentage and the CNCF trademark is shown. The bank and the
 * course are published in the e2e database only, and put back as seeded.
 */
const db = new PrismaClient();
const USER = { email: "e2e-k8s@certidrill.test", password: "e2e k8s password" };
const CODE = "kcna";
const NOTE = "Cet examen n'existe qu'en anglais : le contenu est en anglais.";

async function setContent(active: boolean) {
  const cert = await db.certification.update({ where: { code: CODE }, data: { active } });
  await db.question.updateMany({ where: { certificationId: cert.id }, data: { status: active ? "published" : "draft" } });
  await db.courseChapter.updateMany({ where: { certificationId: cert.id }, data: { status: active ? "published" : "draft" } });
  return cert;
}

test.beforeAll(async () => {
  await db.user.deleteMany({ where: { email: USER.email } });
  const user = await db.user.create({ data: { email: USER.email, passwordHash: await hashPassword(USER.password), emailVerified: new Date(), locale: "fr" } });
  const cert = await setContent(true);
  await db.entitlement.create({
    data: { userId: user.id, certificationId: cert.id, source: "admin", startsAt: new Date("2000-01-01T00:00:00Z"), expiresAt: new Date("2100-01-01T00:00:00Z") },
  });
});
test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: USER.email } });
  await setContent(false);
  await db.$disconnect();
});

test("KCNA with a French interface: English course and exam, the note, a score in percent, the CNCF trademark", async ({ page }) => {
  await login(page, USER);
  await page.goto(`/dashboard?certification=${CODE}`);
  await expect(page.getByTestId("english-only-badge").first()).toHaveText("Anglais seulement");

  // The course: French labels, English content, the note.
  const chapter = await db.courseChapter.findFirstOrThrow({ where: { certification: { code: CODE } }, orderBy: { order: "asc" }, include: { sections: { orderBy: { order: "asc" }, take: 1 } } });
  await page.goto(`/course/${CODE}`);
  await expect(page.getByTestId("english-only")).toHaveText(NOTE);
  await page.goto(`/course/${CODE}/${chapter.code}`);
  await expect(page.getByTestId("english-only")).toHaveText(NOTE);
  await expect(page.locator("article[lang=en]")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText((chapter.title as { en: string }).en);

  // The exam: 60 questions, 90 minutes, French labels, the note.
  await page.goto(`/dashboard?certification=${CODE}`);
  await page.getByRole("button", { name: "Nouvel examen blanc" }).click();
  await page.waitForURL(/\/exam\//);
  const attemptId = page.url().split("/exam/")[1]!;
  await expect(page.getByTestId("english-only")).toHaveText(NOTE);
  await page.getByRole("button", { name: "Démarrer" }).click();
  await expect(page.getByTestId("timer")).toHaveText(/^(1:30:00|1:29:\d\d)$/);
  const attempt = await db.attempt.findUniqueOrThrow({ where: { id: attemptId }, include: { items: { orderBy: { order: "asc" }, take: 1, include: { question: true } } } });
  expect(attempt.deadlineAt!.getTime() - attempt.startedAt!.getTime()).toBe(90 * 60_000);
  expect(await db.attemptItem.count({ where: { attemptId } })).toBe(60);
  const stem = (attempt.items[0]!.question.stem as { en: string }).en;
  await expect(page.locator("main article")).toContainText(stem.replace(/[`*_]/g, "").slice(0, 30));

  await page.getByRole("button", { name: "Révision", exact: true }).click();
  await page.getByRole("button", { name: "Terminer l'examen" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Terminer l'examen" }).click();
  await page.waitForURL(`**/results/${attemptId}`);

  // The report: on 100, pass mark 75, the Linux Foundation's percentage, the note, the trademark.
  await expect(page.getByTestId("scaled-score")).toContainText("/ 100");
  await expect(page.getByText("Seuil de réussite : 75")).toBeVisible();
  await expect(page.getByTestId("score-note")).toContainText("The Linux Foundation publie un score en pourcentage");
  await expect(page.getByTestId("english-only")).toHaveText(NOTE);
  await expect(page.locator("footer")).toContainText("Kubernetes est une marque déposée de The Linux Foundation.");
});
