import { expect, test } from "@playwright/test";
import { Prisma, PrismaClient } from "@prisma/client";
import { hashPassword } from "../../lib/auth/password";
import { login } from "./helpers";

/**
 * CKAD practice (docs/SPECS-KUBERNETES-PRATIQUE.md), for a reader whose
 * interface is in French, the content in English: a practice series of 17
 * exercises (`command` and `manifest`) from the dashboard to the review,
 * graded at submission with the real kubectl v1.37, never before; then the
 * exercises of a chapter quiz (positions 6–10), corrected check by check.
 * The bank and the course are published in the e2e database only, and put
 * back as seeded.
 */
const db = new PrismaClient();
const USER = { email: "e2e-ckad@certidrill.test", password: "e2e ckad password" };
const CODE = "ckad";
const NOTICE = "L'examen réel se passe sur de vrais clusters. Ces exercices entraînent les commandes et les manifestes sans cluster. Pour la mise en condition, utilisez aussi les deux sessions du simulateur fournies avec l'examen.";

type Variant = { command?: string; manifest?: string };
type ExerciseAnswer = { checks: { id: string }[]; solution: Variant[]; negatives: Variant[] };

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

/** Types an answer in the field of its exercise. */
async function answer(page: import("@playwright/test").Page, type: string, variant: Variant) {
  const main = page.locator("main");
  if (type === "command") await main.getByLabel("Commande", { exact: true }).fill(variant.command!);
  else await main.getByLabel("Manifeste YAML", { exact: true }).fill(variant.manifest!);
}

test.describe.serial("CKAD practice", () => {
  test("a practice series of 17 exercises: labels, banner, graded at submission, checks in the review", async ({ page, baseURL }) => {
    test.setTimeout(180_000);
    await page.context().addCookies([{ name: "NEXT_LOCALE", value: "fr", url: baseURL! }]);
    await login(page, USER);

    // The dashboard: a practice series, never a mock exam, and the banner.
    await page.goto(`/dashboard?certification=${CODE}`);
    await expect(page.getByRole("heading", { name: "Nouvelle série d'entraînement pratique CKAD" })).toBeVisible();
    await expect(page.getByTestId("performance-notice").first()).toHaveText(NOTICE);
    await expect(page.getByText("Nouvel examen blanc")).toHaveCount(0);
    await page.getByRole("button", { name: "Nouvelle série d'entraînement pratique" }).click();
    await page.waitForURL(/\/exam\//);
    const attemptId = page.url().split("/exam/")[1]!;

    // The welcome screen: 17 exercises, 120 minutes, the banner and the English-only note.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Série d'entraînement pratique CKAD");
    await expect(page.getByTestId("performance-notice")).toHaveText(NOTICE);
    await expect(page.getByTestId("english-only")).toBeVisible();
    await page.getByRole("button", { name: "Démarrer" }).click();
    await expect(page.getByTestId("timer")).toHaveText(/^(2:00:00|1:59:\d\d)$/);

    const items = await db.attemptItem.findMany({ where: { attemptId }, orderBy: { order: "asc" }, include: { question: true } });
    expect(items).toHaveLength(17);
    expect(new Set(items.map((i) => i.question.type))).toEqual(new Set(["command", "manifest"]));

    // The answer key is never sent before submission.
    const solutionText = (items[0]!.question.answer as ExerciseAnswer).solution[0]!;
    const view = await page.request.get(`/api/attempts/${attemptId}`);
    expect(view.ok()).toBe(true);
    const viewText = await view.text();
    expect(viewText).not.toContain("\"checks\"");
    expect(viewText).not.toContain("\"solution\"");
    // The whole solution (a manifest may start like its public starter).
    expect(viewText).not.toContain(JSON.stringify(solutionText.command ?? solutionText.manifest).slice(1, -1));

    // Every exercise answered with its solution, but the first with a negative (it must fail a check).
    for (const [i, item] of items.entries()) {
      const a = item.question.answer as ExerciseAnswer;
      await expect(page.locator("main article")).toBeVisible();
      await answer(page, item.question.type, i === 0 ? a.negatives[0]! : a.solution[0]!);
      if (i < items.length - 1) await page.getByRole("button", { name: "Suivant →" }).click();
    }
    // Nothing graded while the series runs.
    expect(await db.attemptItem.count({ where: { attemptId, grading: { not: Prisma.DbNull } } })).toBe(0);

    await page.getByRole("button", { name: "Révision", exact: true }).click();
    await page.getByRole("button", { name: "Terminer l'examen" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Terminer l'examen" }).click();
    await page.waitForURL(`**/results/${attemptId}`, { timeout: 60_000 });

    // Graded with kubectl at submission: every check of the solutions passes, the negative fails one.
    const graded = await db.attemptItem.findMany({ where: { attemptId }, orderBy: { order: "asc" } });
    for (const [i, item] of graded.entries()) {
      const results = (item.grading as { results: { passed: boolean }[] } | null)?.results;
      expect(results, `item ${i + 1}`).toBeTruthy();
      if (i === 0) expect(results!.some((r) => !r.passed)).toBe(true);
      else expect(results!.every((r) => r.passed), `item ${i + 1}: ${JSON.stringify(item.grading)}`).toBe(true);
    }

    await expect(page.getByTestId("scaled-score")).toContainText("/ 100");
    await expect(page.getByTestId("performance-notice")).toHaveText(NOTICE);

    // The review: each check ✓/✗, the first exercise with a failed one.
    await page.goto(`/results/${attemptId}/review`);
    const first = page.getByTestId("correction-item").first();
    await expect(first.getByTestId("exercise-checks")).toBeVisible();
    await expect(first.locator("[data-passed=false]").first()).toBeVisible();
    const second = page.getByTestId("correction-item").nth(1);
    await expect(second.getByTestId("exercise-checks").locator("[data-passed=false]")).toHaveCount(0);
    await expect(second.getByTestId("exercise-checks")).toContainText(/Vérifications : (\d+) sur \1/);
  });

  test("a chapter quiz: the exercises of positions 6 to 10, corrected check by check", async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await page.context().addCookies([{ name: "NEXT_LOCALE", value: "fr", url: baseURL! }]);
    await login(page, USER);
    const quizExercise = await db.question.findFirstOrThrow({ where: { usage: "quiz", certification: { code: CODE }, type: { in: ["command", "manifest"] } }, select: { chapterId: true } });
    const chapter = await db.courseChapter.findUniqueOrThrow({ where: { id: quizExercise.chapterId! } });
    const questions = await db.question.findMany({ where: { usage: "quiz", chapterId: chapter.id }, orderBy: { quizPosition: "asc" } });
    expect(questions).toHaveLength(10);
    expect(questions.slice(5).every((q) => q.type === "command" || q.type === "manifest")).toBe(true);

    await page.goto(`/course/${CODE}/${chapter.code}/quiz`);
    await page.getByTestId("quiz-start").click();
    for (const [i, q] of questions.entries()) {
      await expect(page.getByTestId("quiz-question")).toHaveAttribute("data-position", String(i + 1));
      if (q.type === "command" || q.type === "manifest") {
        await answer(page, q.type, (q.answer as ExerciseAnswer).solution[0]!);
      } else if (q.type === "single") {
        await page.getByTestId("quiz-question").locator(`input[type=radio][value="${(q.answer as { optionId: string }).optionId}"]`).check();
      }
      await page.getByRole("button", { name: "Valider" }).click();
      await expect(page.getByTestId("quiz-correction")).toBeVisible();
      if (q.type === "command" || q.type === "manifest") {
        const checks = page.getByTestId("exercise-checks");
        await expect(checks).toBeVisible();
        await expect(checks.locator("[data-passed=false]")).toHaveCount(0);
        await expect(checks.locator("[data-passed=true]")).toHaveCount((q.answer as ExerciseAnswer).checks.length);
        await expect(page.getByTestId("quiz-verdict")).toHaveAttribute("data-passed", "true");
      }
      await page.getByRole("button", { name: i < questions.length - 1 ? "Question suivante" : "Voir le résultat" }).click();
    }
    await expect(page.getByTestId("quiz-result")).toBeVisible();
  });
});
