import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { E2E_ADMIN } from "./global-setup";
import { loginAsAdmin } from "./helpers";

/**
 * Lot 4 acceptance: a complete exam (case study, one-way series, main section,
 * review, submission), locked sections enforced by the API, resume after
 * closing the browser with time still running, and expiry.
 */
const db = new PrismaClient();
test.afterAll(() => db.$disconnect());

test.beforeEach(async ({ page }) => {
  const user = await db.user.findUniqueOrThrow({ where: { email: E2E_ADMIN.email } });
  await db.attempt.deleteMany({ where: { userId: user.id } });
  await loginAsAdmin(page);
});

/** Records every API response body so we can check that no answer leaks before submission. */
function recordApi(page: Page) {
  const bodies: string[] = [];
  page.on("response", async (res) => {
    if (res.url().includes("/api/attempts")) bodies.push(await res.text().catch(() => ""));
  });
  return bodies;
}

async function startExam(page: Page, locale: "en" | "fr" = "en") {
  await page.goto("/dashboard");
  await page.getByLabel(/Exam language|Langue de l'examen/).selectOption(locale);
  await page.getByRole("button", { name: /New mock exam|Nouvel examen blanc/ }).click();
  await page.waitForURL(/\/exam\//);
  await expect(page.getByRole("heading", { name: /mock exam|Examen blanc/ })).toBeVisible();
  await page.getByRole("button", { name: /^(Start|Démarrer)$/ }).click();
  await expect(page.getByTestId("timer")).toBeVisible();
  return page.url().split("/exam/")[1]!;
}

async function sectionLabel(page: Page) {
  return (await page.locator("header span.text-muted-foreground").first().textContent())?.trim();
}

/** Gives some answer to the question on screen, whatever its type. */
async function answerSomething(page: Page) {
  const main = page.locator("main article");
  const radio = main.getByRole("radio").first();
  if (await radio.count()) return radio.check();
  const box = main.getByRole("checkbox").first();
  if (await box.count()) return box.check();
  const select = main.getByRole("combobox").first();
  if (await select.count()) return select.selectOption({ index: 1 });
  const add = main.getByRole("button", { name: /Add|Ajouter/ }).first();
  if (await add.count()) return add.click();
  const area = main.locator("td button").first();
  if (await area.count()) return area.click();
}

/** Answers the question on screen and waits until the server has stored it. */
async function answerAndWaitSaved(page: Page) {
  const saved = page.waitForResponse((r) => r.request().method() === "PUT" && r.url().includes("/items/") && r.ok());
  if ((await sectionLabel(page))?.match(/series|Série/)) {
    await page.locator("main article").getByRole("radio").first().check();
    await page.getByRole("button", { name: /Confirm and continue|Valider et continuer/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: /^(Confirm|Confirmer)$/ }).click();
  } else {
    await answerSomething(page);
  }
  await saved;
}

test("complete exam: sections, review, submission, no answer in network traffic", async ({ page }) => {
  const bodies = recordApi(page);
  const attemptId = await startExam(page);
  await expect(page.getByText(/Question \d+ of \d+/)).toBeVisible();
  const confirmIn = (name: RegExp) => page.getByRole("dialog").getByRole("button", { name }).click();

  let lockedItemId: string | undefined;
  let sawMain = false;
  for (let guard = 0; guard < 50; guard++) {
    // Either the next section is on screen, or the exam is over and we are on the results page.
    await page.waitForFunction(() => location.pathname.includes("/results/") || !!document.querySelector("header span.text-muted-foreground"));
    if (page.url().includes("/results/")) break;
    const label = await sectionLabel(page);
    const view = await (await page.request.get(`/api/attempts/${attemptId}`)).json();
    const firstItemOfSection = view.items.find((i: { sectionId: string }) => i.sectionId === view.currentSectionId)?.id;

    if (label === "Case study") {
      await expect(page.getByRole("tablist")).toBeVisible();
      await page.getByRole("tab").nth(1).click();
      const count = await page.getByRole("navigation", { name: "Questions of the case study" }).getByRole("button").count();
      for (let i = 0; i < count; i++) {
        await answerSomething(page);
        if (i < count - 1) await page.getByRole("button", { name: "Next →" }).click();
      }
      const leave = page.getByRole("button", { name: /^(Leave the case study|Finish the exam)$/ });
      const name = (await leave.textContent())!.trim();
      await leave.click();
      await confirmIn(new RegExp(`^${name}$`));
    } else if (label === "Yes/No series") {
      await expect(page.getByText("This question is part of a series").first()).toBeVisible();
      await expect(page.getByRole("button", { name: "Confirm and continue" })).toBeDisabled();
      await page.locator("main article").getByRole("radio", { name: "No" }).check();
      await page.getByRole("button", { name: "Confirm and continue" }).click();
      await confirmIn(/^Confirm$/);
    } else if (label === "Questions") {
      sawMain = true;
      await answerAndWaitSaved(page);
      await page.getByLabel("Mark for review").check();
      await page.getByRole("button", { name: "Next →" }).click();
      await answerAndWaitSaved(page);
      await expect(page.getByTestId("save-status")).toHaveText(/All answers saved/);
      await page.getByRole("button", { name: "Review", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Review your answers" })).toBeVisible();
      await page.getByRole("radio", { name: /Flagged \(1\)/ }).click();
      await expect(page.locator("main li")).toHaveCount(1);
      await page.getByRole("radio", { name: /All/ }).click();
      const finish = page.getByRole("button", { name: /^(Finish this section|Finish the exam)$/ });
      const name = (await finish.textContent())!.trim();
      await finish.click();
      await expect(page.getByRole("dialog")).toContainText(/not answered/);
      await confirmIn(new RegExp(`^${name}$`));
    } else {
      throw new Error(`unexpected section ${label}`);
    }
    await expect(page.getByRole("dialog")).toBeHidden();
    if (!lockedItemId && label !== "Yes/No series" && !page.url().includes("/results/")) lockedItemId = firstItemOfSection;
    await page.waitForLoadState("networkidle");
  }
  expect(sawMain).toBe(true);
  await page.waitForURL(`**/results/${attemptId}`);
  await expect(page.getByTestId("scaled-score")).toBeVisible();

  // A locked section cannot be modified, even by calling the API directly.
  expect(lockedItemId).toBeDefined();
  const res = await page.request.put(`/api/attempts/${attemptId}/items/${lockedItemId}`, {
    data: { response: null },
    headers: { Origin: new URL(page.url()).origin },
  });
  expect(res.status()).toBe(409);

  // No correct answer or explanation was sent to the browser before submission.
  const leaked = bodies.filter((b) => /"answer"|"explanation"/.test(b));
  expect(leaked).toEqual([]);
  const explanation = ((await db.question.findFirstOrThrow({ where: { id: "stor-lifecycle-cool-delete" } })).explanation as { correct: { en: string } }).correct.en;
  expect(bodies.some((b) => b.includes(explanation.slice(0, 60)))).toBe(false);
});

test("a locked section refuses writes through the API while the exam runs", async ({ page }) => {
  const attemptId = await startExam(page);
  const before = await (await page.request.get(`/api/attempts/${attemptId}`)).json();
  const first = before.sections[0];
  const item = before.items.find((i: { sectionId: string }) => i.sectionId === first.id);
  const origin = { Origin: new URL(page.url()).origin };
  const lock = await page.request.post(`/api/attempts/${attemptId}/sections/${first.id}/lock`, { headers: origin });
  expect(lock.ok()).toBe(true);
  const res = await page.request.put(`/api/attempts/${attemptId}/items/${item.id}`, { data: { flagged: true }, headers: origin });
  expect(res.status()).toBe(409);
  expect((await res.json()).error).toBe("locked");
  // Cross-site requests are rejected.
  const csrf = await page.request.post(`/api/attempts/${attemptId}/submit`, { headers: { Origin: "https://evil.example" } });
  expect(csrf.status()).toBe(403);
});

test("resume after closing the browser: answers restored, offline time counted", async ({ page, context }) => {
  const attemptId = await startExam(page, "fr");
  // Go to the first main-section question through the API state.
  const view = await (await page.request.get(`/api/attempts/${attemptId}`)).json();
  expect(view.locale).toBe("fr");
  const section = view.sections.find((s: { id: string }) => s.id === view.currentSectionId);
  const current = view.items.find((i: { sectionId: string; answered: boolean }) => i.sectionId === section.id && (section.kind !== "series" || !i.answered));
  await answerAndWaitSaved(page);
  await expect(page.getByTestId("save-status")).toHaveText(/enregistrées/);
  await page.close();

  // 30 minutes pass while the browser is closed.
  await db.attempt.update({
    where: { id: attemptId },
    data: { startedAt: new Date(Date.now() - 30 * 60_000), deadlineAt: new Date(Date.now() + 70 * 60_000) },
  });

  const again = await context.newPage();
  await again.goto(`/exam/${attemptId}`);
  await expect(again.getByText(/Examen repris/)).toBeAttached();
  await expect(again.getByTestId("timer")).toHaveText(/^(1:0\d|69|70):/);
  const restored = await (await again.request.get(`/api/attempts/${attemptId}`)).json();
  const item = restored.items.find((i: { id: string }) => i.id === current.id);
  expect(item.response).not.toBeNull();

});

test("expiry: the exam is submitted automatically with the saved answers", async ({ page }) => {
  const attemptId = await startExam(page);
  await answerAndWaitSaved(page);

  // Bring the deadline 3 seconds ahead: the client counts down, then the server expires the attempt.
  await db.attempt.update({ where: { id: attemptId }, data: { deadlineAt: new Date(Date.now() + 3_000) } });
  await page.reload();
  await page.waitForURL(`**/results/${attemptId}`, { timeout: 20_000 });
  const attempt = await db.attempt.findUniqueOrThrow({ where: { id: attemptId } });
  expect(attempt.status).toBe("expired");
  expect(attempt.scaledScore).not.toBeNull();
  const items = await db.attemptItem.findMany({ where: { attemptId } });
  expect(items.some((i) => i.response !== null)).toBe(true);
});

test("an expired attempt is closed when the page is opened after the deadline", async ({ page }) => {
  const attemptId = await startExam(page);
  await page.close();
  await db.attempt.update({ where: { id: attemptId }, data: { deadlineAt: new Date(Date.now() - 60_000) } });
  const res = await page.context().request.get(`/api/attempts/${attemptId}`);
  expect((await res.json()).status).toBe("expired");
});

test("results: report, correction with filters and language, question report, dashboard progress", async ({ page }) => {
  const attemptId = await startExam(page);
  await answerAndWaitSaved(page);
  await page.request.post(`/api/attempts/${attemptId}/submit`, { headers: { Origin: new URL(page.url()).origin } });
  await page.goto(`/results/${attemptId}`);
  await expect(page.getByTestId("scaled-score")).toBeVisible();
  await expect(page.getByTestId("verdict")).toHaveText(/Fail|Pass/);
  await expect(page.getByTestId("domain-table").locator("tr")).toHaveCount(5);
  await expect(page.getByText(/approximation/)).toBeVisible();
  // How this exam moved the readiness index.
  await expect(page.getByTestId("readiness-change")).toContainText(/\/ 100/);
  await expect(page.getByTestId("readiness-delta")).toHaveText(/First measure|since your previous exam/);
  // XP earned by this exam: at least the base XP of a finished exam.
  await expect(page.getByTestId("xp-total")).toHaveText(/^\+\d+ XP$/);

  await page.getByRole("link", { name: /See the detailed correction/ }).click();
  await page.waitForURL(/\/review/);
  await expect(page.getByTestId("correction-item").first()).toBeVisible();
  const all = await page.getByTestId("correction-item").count();
  expect(all).toBeGreaterThan(10);
  await expect(page.getByText("Correct answer").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Microsoft Learn/ }).first()).toHaveAttribute("href", /learn\.microsoft\.com/);
  await page.getByRole("link", { name: "Missed", exact: true }).click();
  await expect(page).toHaveURL(/filter=missed/);
  await page.waitForLoadState("networkidle");
  expect(await page.getByTestId("correction-item").count()).toBeLessThanOrEqual(all);
  await page.getByRole("link", { name: "fr", exact: true }).click();
  await expect(page.getByText("Bonne réponse").first()).toBeVisible();

  const first = page.getByTestId("correction-item").first();
  await first.getByText(/Signaler cette question|Report this question/).click();
  await first.getByRole("button", { name: /Envoyer|Send/ }).click();
  await expect(first.getByRole("status")).toHaveText(/Thank you|Merci/);

  await page.goto("/dashboard");
  await expect(page.getByTestId("last-score")).toBeVisible();
  // One nearly blank exam: far from ready, and the checklist says why.
  await expect(page.getByTestId("readiness-verdict")).toHaveText(/^(Not ready|Pas prêt)$/);
  await expect(page.getByTestId("readiness-index")).toHaveText(/^\d+ \/ 100$/);
  await expect(page.getByTestId("readiness").locator('[data-check="attempts"]')).toBeVisible();
  // Level, domain mastery and badges: a first exam always earns "first exam".
  await expect(page.getByTestId("progression").getByTestId("level")).toHaveText(/(Level|Niveau) \d+/);
  await expect(page.getByTestId("progression").locator('[data-badge="first_exam"]')).toHaveAttribute("data-earned", "true");
  // "I took the real exam": the report appears in the user's list and in the admin calibration.
  const outcome = page.getByTestId("outcome");
  await outcome.getByLabel(/Date of the exam|Date de l'examen/).fill("2026-01-15");
  await outcome.getByRole("radio", { name: /Failed|Échoué/ }).check();
  await outcome.getByRole("button", { name: /Save|Enregistrer/ }).click();
  await expect(outcome.getByRole("status")).toHaveText(/Thank you|Merci/);
  await expect(outcome.locator('[data-outcome="2026-01-15"]')).toBeVisible();
  await page.goto("/admin/calibration");
  await expect(page.getByTestId("calibration-az-104").getByTestId("calibration-total")).toHaveText(/[1-9]\d* (reports?|déclarations?)/);
  await page.goto("/dashboard");
  const progress = await (await page.request.get("/api/me/progress")).json();
  expect(progress.attempts.length).toBeGreaterThan(0);
});
