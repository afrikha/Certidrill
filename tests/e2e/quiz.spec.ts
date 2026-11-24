import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../lib/auth/password";
import { login } from "./helpers";

/**
 * An end-of-chapter quiz on the production build (docs/SPECS-QUIZ-CHAPITRE.md
 * §3), AZ-104 chapter 11 (free), in French then in English: the box at the
 * bottom of the chapter, ten questions one at a time with their level, the
 * correction after each one and never before, the result out of 10 with its
 * detail, the best result kept, the state in the outline. The seed loads
 * everything in draft: the chapter and its quiz are published here, then
 * put back.
 */
const db = new PrismaClient();
const CHAPTER = "11-entra-users-groups";
const USERS = {
  fr: { email: "e2e-quiz-fr@certidrill.test", password: "e2e quiz fr password" },
  en: { email: "e2e-quiz-en@certidrill.test", password: "e2e quiz en password" },
};
const quizWhere = { usage: "quiz" as const, chapter: { code: CHAPTER, certification: { code: "az-104" } } };

test.beforeAll(async () => {
  for (const [locale, u] of Object.entries(USERS)) {
    await db.user.deleteMany({ where: { email: u.email } });
    await db.user.create({ data: { email: u.email, passwordHash: await hashPassword(u.password), emailVerified: new Date(), locale } });
  }
  await db.courseChapter.updateMany({ where: { code: { in: ["00-getting-started", CHAPTER] }, certification: { code: "az-104" } }, data: { status: "published" } });
  await db.question.updateMany({ where: quizWhere, data: { status: "published" } });
});
test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: Object.values(USERS).map((u) => u.email) } } });
  await db.question.updateMany({ where: quizWhere, data: { status: "draft" } });
  await db.courseChapter.updateMany({ where: { code: { in: ["00-getting-started", CHAPTER] }, certification: { code: "az-104" } }, data: { status: "draft" } });
  await db.$disconnect();
});

/** The longest run of letters and spaces of a text: found in a server response however its Markdown is rendered and escaped. */
const plainRun = (text: string) => (text.match(/[\p{L} ]+/gu) ?? []).reduce((a, b) => (b.trim().length > a.length ? b.trim() : a), "");

/** Records the body of every server action response of the quiz page (read here, then handed to the page unchanged). */
async function recordActions(page: Page): Promise<string[]> {
  const received: string[] = [];
  await page.route("**/quiz", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const response = await route.fetch();
    const body = await response.text();
    received.push(body);
    await route.fulfill({ response, body });
  });
  return received;
}

/**
 * Answers the ten questions: the single-choice ones with their key (radio
 * value = option id), the others left blank (wrong). The explanation of a
 * question is in no server response before its "Validate", and in the
 * response to it. Returns how many were answered right.
 */
async function takeQuiz(page: Page, received: string[], locale: "en" | "fr", labels: { validate: string; next: string; result: string; easy: string; hard: string }) {
  const questions = await db.question.findMany({ where: quizWhere, orderBy: { quizPosition: "asc" }, select: { id: true, type: true, answer: true, explanation: true } });
  let right = 0;
  for (const [i, q] of questions.entries()) {
    const card = page.getByTestId("quiz-question");
    await expect(card).toHaveAttribute("data-position", String(i + 1));
    await expect(page.getByTestId("quiz-level")).toHaveText(i < 5 ? labels.easy : labels.hard);
    await expect(page.getByTestId("quiz-correction")).toHaveCount(0);
    const explanation = plainRun((q.explanation as { correct: Record<string, string> }).correct[locale]!);
    expect(received.join("\n")).not.toContain(explanation);
    if (q.type === "single") {
      await card.locator(`input[type=radio][value="${(q.answer as { optionId: string }).optionId}"]`).check();
      right += 1;
    }
    const before = received.length;
    await page.getByRole("button", { name: labels.validate }).click();
    await expect(page.getByTestId("quiz-correction")).toBeVisible();
    await expect(page.getByTestId("quiz-verdict")).toHaveAttribute("data-passed", String(q.type === "single"));
    // Sent with the validation, and shown.
    expect(received.slice(before).join("\n")).toContain(explanation);
    await expect(page.getByTestId("quiz-correction")).toContainText(explanation);
    await page.getByRole("button", { name: i < questions.length - 1 ? labels.next : labels.result }).click();
  }
  return { right, hardRight: questions.slice(5).filter((q) => q.type === "single").length };
}

test.describe.serial("a chapter quiz", () => {
  test("in French: from the chapter, correction after each question, result and state in the outline", async ({ page, baseURL }) => {
    await page.context().addCookies([{ name: "NEXT_LOCALE", value: "fr", url: baseURL! }]);
    await login(page, USERS.fr);
    await page.goto(`/course/az-104/${CHAPTER}`);
    const box = page.getByTestId("quiz-box");
    await expect(box.getByRole("heading", { name: "Valider le chapitre" })).toBeVisible();
    await expect(box).toContainText("10 questions, environ 15 minutes.");
    await box.getByRole("link", { name: "Commencer le quiz" }).click();
    await page.waitForURL(`**/course/az-104/${CHAPTER}/quiz`);
    const received = await recordActions(page);
    await page.getByTestId("quiz-start").click();
    await expect(page.getByTestId("quiz-progress")).toHaveText("Question 1 sur 10");

    const { right, hardRight } = await takeQuiz(page, received, "fr", { validate: "Valider", next: "Question suivante", result: "Voir le résultat", easy: "Consolidation", hard: "Niveau examen" });
    const result = page.getByTestId("quiz-result");
    await expect(page.getByTestId("quiz-score")).toHaveText(`${right}/10`);
    await expect(page.getByTestId("quiz-detail")).toHaveText(`Consolidation ${right - hardRight}/5 · Niveau examen ${hardRight}/5`);
    await expect(result).toHaveAttribute("data-passed", "false");
    await expect(result).toContainText("À revoir");
    await expect(page.getByTestId("quiz-review").getByRole("link").first()).toHaveAttribute("href", new RegExp(`/course/az-104/${CHAPTER}#`));

    await page.goto("/course/az-104");
    await expect(page.getByTestId("quiz-badge")).toHaveText(`Quiz à revoir · meilleur score ${right}/10`);
  });

  test("in English: a worse attempt keeps the best result", async ({ page }) => {
    await login(page, USERS.en);
    // Best result of the French user's attempt is not this user's: a fresh start.
    await page.goto(`/course/az-104/${CHAPTER}/quiz`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Quiz:");
    const received = await recordActions(page);
    await page.getByTestId("quiz-start").click();
    const { right, hardRight } = await takeQuiz(page, received, "en", { validate: "Validate", next: "Next question", result: "See the result", easy: "Consolidation", hard: "Exam level" });
    await expect(page.getByTestId("quiz-score")).toHaveText(`${right}/10`);
    await expect(page.getByTestId("quiz-detail")).toHaveText(`Consolidation ${right - hardRight}/5 · Exam level ${hardRight}/5`);

    // Again, everything blank: 0/10, the best stays.
    await page.getByTestId("quiz-start").click();
    for (let i = 1; i <= 10; i++) {
      await page.getByRole("button", { name: "Validate" }).click();
      await page.getByRole("button", { name: i < 10 ? "Next question" : "See the result" }).click();
    }
    await expect(page.getByTestId("quiz-score")).toHaveText("0/10");
    await expect(page.getByTestId("quiz-best")).toContainText(`Best result: ${right}/10`);
    await page.goto(`/course/az-104/${CHAPTER}`);
    await expect(page.getByTestId("quiz-best")).toContainText(`Quiz to review · Best result: ${right}/10`);
    await page.goto("/course/az-104");
    await expect(page.getByTestId("quiz-badge")).toHaveText(`Quiz to review · best ${right}/10`);
  });
});
