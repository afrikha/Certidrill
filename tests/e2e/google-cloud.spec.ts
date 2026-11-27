import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../lib/auth/password";
import { login } from "./helpers";

/**
 * Google Cloud (docs/SPECS-GOOGLE-CLOUD.md §3, §7), for a reader whose
 * interface is in French, the content in English only: a Professional Cloud
 * Architect mock exam with two case studies whose questions are mixed with
 * the others, each shown beside its case study (folded on a phone); an
 * Associate Cloud Engineer mock exam without any. Both scored in percent,
 * 70 to pass, with the Google score note and trademark. The banks are
 * published in the e2e database only, and put back as seeded.
 */
const db = new PrismaClient();
const USER = { email: "e2e-gcp@certidrill.test", password: "e2e gcp password" };
const CODES = ["gcp-pca", "gcp-ace"] as const;
const NOTE = "Cet examen n'existe qu'en anglais : le contenu est en anglais.";

async function setContent(code: string, active: boolean) {
  const cert = await db.certification.update({ where: { code }, data: { active } });
  await db.question.updateMany({ where: { certificationId: cert.id }, data: { status: active ? "published" : "draft" } });
  await db.caseStudy.updateMany({ where: { certificationId: cert.id }, data: { status: active ? "published" : "draft" } });
  return cert;
}

test.beforeAll(async () => {
  await db.user.deleteMany({ where: { email: USER.email } });
  const user = await db.user.create({ data: { email: USER.email, passwordHash: await hashPassword(USER.password), emailVerified: new Date(), locale: "fr" } });
  for (const code of CODES) {
    const cert = await setContent(code, true);
    await db.entitlement.create({
      data: { userId: user.id, certificationId: cert.id, source: "admin", startsAt: new Date("2000-01-01T00:00:00Z"), expiresAt: new Date("2100-01-01T00:00:00Z") },
    });
  }
});
test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: USER.email } });
  for (const code of CODES) await setContent(code, false);
  await db.$disconnect();
});

/** From the dashboard to the first question; the attempt id. */
async function startExam(page: Page, code: string): Promise<string> {
  await page.goto(`/dashboard?certification=${code}`);
  await page.getByRole("button", { name: "Nouvel examen blanc" }).click();
  await page.waitForURL(/\/exam\//);
  const attemptId = page.url().split("/exam/")[1]!;
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Examen blanc ${code.toUpperCase()}`);
  await expect(page.getByTestId("english-only")).toHaveText(NOTE);
  return attemptId;
}

/** Submits with the review screen, then checks the report: percent, 70 to pass, the Google note and trademark. */
async function finishAndCheckReport(page: Page, attemptId: string) {
  await page.getByRole("button", { name: "Révision", exact: true }).click();
  await page.getByRole("button", { name: "Terminer l'examen" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Terminer l'examen" }).click();
  await page.waitForURL(`**/results/${attemptId}`);
  await expect(page.getByTestId("scaled-score")).toContainText("/ 100");
  await expect(page.getByTestId("scaled-score")).not.toContainText("1000");
  await expect(page.getByText("Seuil de réussite : 70")).toBeVisible();
  // Nothing answered: failed.
  await expect(page.getByTestId("verdict")).toHaveText("✗ Échoué");
  await expect(page.getByTestId("score-note")).toHaveText(
    "Google n'indique que la réussite ou l'échec et ne publie aucun seuil. Ici, score = 100 × points obtenus / points possibles, et 70 % est le seuil d'entraînement de Certidrill.",
  );
  await expect(page.locator("footer")).toContainText("Google Cloud, Professional Cloud Architect et Associate Cloud Engineer sont des marques de Google LLC.");
}

test.describe.serial("Google Cloud", () => {
  test("Professional Cloud Architect: 50–60 questions, two case studies beside their questions, a score in percent", async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await page.context().addCookies([{ name: "NEXT_LOCALE", value: "fr", url: baseURL! }]);
    await login(page, USER);
    const attemptId = await startExam(page, "gcp-pca");
    await expect(page.getByText(/^2 études de cas : leurs questions sont mêlées aux autres/)).toBeVisible();
    await page.getByRole("button", { name: "Démarrer" }).click();
    await expect(page.getByTestId("timer")).toHaveText(/^(2:00:00|1:59:\d\d)$/);

    const items = await db.attemptItem.findMany({ where: { attemptId }, orderBy: { order: "asc" }, include: { question: true, section: true } });
    expect(items.length).toBeGreaterThanOrEqual(50);
    expect(items.length).toBeLessThanOrEqual(60);
    // One section: the case-study questions are mixed with the others.
    expect(new Set(items.map((i) => i.section.kind))).toEqual(new Set(["main"]));
    const cases = [...new Set(items.flatMap((i) => i.question.caseStudyId ?? []))];
    expect(cases).toHaveLength(2);
    const positions = items.flatMap((i, p) => (i.question.caseStudyId ? [p] : []));
    expect(positions.at(-1)! - positions[0]! + 1).toBeGreaterThan(positions.length);

    // Walk the exam: beside each case-study question its case study, beside the others none.
    const titles = new Map(
      (await db.caseStudy.findMany({ where: { id: { in: cases } } })).map((c) => [c.id, (c.title as { en: string }).en]),
    );
    const seen = new Set<string>();
    for (const [p, item] of items.entries()) {
      await expect(page.getByText(`Question ${p + 1} sur ${items.length}`)).toBeVisible();
      const panel = page.getByTestId("case-study-panel");
      const caseId = item.question.caseStudyId;
      if (caseId) {
        await expect(panel).toHaveAttribute("data-case-study", caseId);
        await expect(panel.getByRole("heading", { level: 2 })).toHaveText(titles.get(caseId)!);
        // Side by side on a desktop screen: the panel left of the question, both visible.
        const [a, q] = [await panel.boundingBox(), await page.locator("main article").boundingBox()];
        expect(a!.x + a!.width).toBeLessThanOrEqual(q!.x + 1);
        await expect(panel.getByRole("tabpanel")).toBeVisible();
        seen.add(caseId);
      } else {
        await expect(panel).toHaveCount(0);
      }
      if (p < items.length - 1) await page.getByRole("button", { name: "Suivant →" }).click();
    }
    expect(seen.size).toBe(2);

    // On a phone: the case study folded above the question, opened on demand.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Révision", exact: true }).click();
    await page.getByRole("button", { name: new RegExp(`^Aller à la question ${positions[0]! + 1} —`) }).click();
    const toggle = page.getByRole("button", { name: "Afficher l'étude de cas" });
    await expect(toggle).toBeVisible();
    await expect(page.getByTestId("case-study-panel").getByRole("tabpanel")).toBeHidden();
    await toggle.click();
    await expect(page.getByTestId("case-study-panel").getByRole("tabpanel")).toBeVisible();
    await expect(page.getByRole("button", { name: "Masquer l'étude de cas" })).toHaveAttribute("aria-expanded", "true");
    await page.setViewportSize({ width: 1280, height: 720 });

    await finishAndCheckReport(page, attemptId);
  });

  test("Associate Cloud Engineer: 50–60 questions, no case study, a score in percent", async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    await page.context().addCookies([{ name: "NEXT_LOCALE", value: "fr", url: baseURL! }]);
    await login(page, USER);
    const attemptId = await startExam(page, "gcp-ace");
    await expect(page.getByText(/études? de cas/)).toHaveCount(0);
    await page.getByRole("button", { name: "Démarrer" }).click();
    await expect(page.getByTestId("timer")).toHaveText(/^(2:00:00|1:59:\d\d)$/);

    const items = await db.attemptItem.findMany({ where: { attemptId }, include: { question: true, section: true } });
    expect(items.length).toBeGreaterThanOrEqual(50);
    expect(items.length).toBeLessThanOrEqual(60);
    expect(items.every((i) => i.question.caseStudyId === null && i.section.kind === "main")).toBe(true);
    await expect(page.locator("main article")).toBeVisible();
    await expect(page.getByTestId("case-study-panel")).toHaveCount(0);

    await finishAndCheckReport(page, attemptId);
  });
});
