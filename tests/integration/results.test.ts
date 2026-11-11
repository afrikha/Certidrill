import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadCertification } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";
import { seedBank, seedReferential } from "@/lib/content/seed";
import { createUser } from "@/lib/users";
import { createAttempt, getAttemptView, lockSection, saveItem, SessionError, startAttempt, submitAttempt } from "@/lib/exam/session";
import { getAttemptResults, getProgress, reportQuestion, REPORTS_BEFORE_REVIEW } from "@/lib/exam/results";

const db = new PrismaClient();
let userId: string;
const T0 = new Date("2026-11-11T09:00:00Z");
const at = (m: number) => new Date(T0.getTime() + m * 60_000);

beforeAll(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "attempt_item","attempt_section","attempt","question_report","question","case_study","question_series","objective","domain","blueprint","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
  );
  const content = await loadCertification(path.resolve(__dirname, "../../content/az-104"));
  await seedReferential(db, content);
  await seedBank(db, content, await loadBank(content));
  await db.question.updateMany({ data: { status: "published" } });
  await db.caseStudy.updateMany({ data: { status: "published" } });
  await db.questionSeries.updateMany({ data: { status: "published" } });
  userId = (await createUser(db, { email: "results@example.com" })).id;
});
afterAll(() => db.$disconnect());

/**
 * Plays an attempt: `answer(questionId)` returns the response to give (or
 * undefined to leave it blank). Sections are walked in order.
 */
async function play(seed: string, start: Date, answer: (questionId: string, key: unknown) => unknown) {
  const { attemptId } = await createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: start, seed });
  await startAttempt(db, { attemptId, userId, now: start });
  const view = await getAttemptView(db, { attemptId, userId, now: start });
  const keys = new Map((await db.question.findMany()).map((q) => [q.id, q.answer]));
  for (const section of view.sections) {
    for (const item of view.items.filter((i) => i.sectionId === section.id)) {
      const response = answer(item.question.id, keys.get(item.question.id));
      if (response !== undefined) await saveItem(db, { attemptId, itemId: item.id, userId, response, now: start });
      else if (section.kind === "series") await saveItem(db, { attemptId, itemId: item.id, userId, response: { value: !(keys.get(item.question.id) as { value: boolean }).value }, now: start });
    }
    if (section.id !== view.sections.at(-1)!.id) await lockSection(db, { attemptId, sectionId: section.id, userId, now: start });
  }
  await submitAttempt(db, { attemptId, userId, now: new Date(start.getTime() + 42 * 60_000) });
  return attemptId;
}

describe("score report", () => {
  it("computes domain scores that match a manual calculation", async () => {
    // Test set: every storage question answered correctly; on networking, the
    // two-answer peering question gets one correct option out of two; the rest is blank or wrong.
    const attemptId = await play("manual-1", T0, (id, key) => {
      if (id.startsWith("stor-") || id.startsWith("cs-nw-lab") || id === "cs-nw-lifecycle") return key;
      if (id === "net-peering-transitivity") return { optionIds: ["b"] };
      return undefined;
    });
    const r = await getAttemptResults(db, { attemptId, userId });
    const items = await db.attemptItem.findMany({ where: { attemptId }, include: { question: { include: { objective: { include: { domain: true } } } } } });

    // Manual expectations from the bank: storage questions and their points.
    // stor-lifecycle (1) + stor-redundancy multi (2) + stor-sas yes/no (3) + stor-cli dropdown (2)
    // + stor-portal hotarea (1) + cs-nw-lab single (1) + cs-nw-lifecycle dropdown (2) = 12 points.
    const storage = r.domains.find((d) => d.key === "storage")!;
    expect(storage.earned).toBe(12);
    expect(storage.possible).toBe(12);
    expect(storage.scaledScore).toBe(1000);

    const networking = r.domains.find((d) => d.key === "networking")!;
    const netPossible = items.filter((i) => i.question.objective.domain.code === "networking").reduce((s, i) => s + i.pointsMax!, 0);
    expect(networking.earned).toBe(1);
    expect(networking.possible).toBe(netPossible);
    expect(networking.scaledScore).toBe(Math.round((1000 * 1) / netPossible));

    for (const code of ["identities", "compute", "monitoring"]) expect(r.domains.find((d) => d.key === code)!.earned).toBe(0);
    const possible = items.reduce((s, i) => s + i.pointsMax!, 0);
    expect(r.earned).toBe(13);
    expect(r.possible).toBe(possible);
    expect(r.scaledScore).toBe(Math.round((1000 * 13) / possible));
    expect(r.passed).toBe(false);
    expect(r.timeUsedMs).toBe(42 * 60_000);
    expect(r.domains.map((d) => d.key)).toEqual(["identities", "storage", "compute", "networking", "monitoring"]);
  });

  it("returns a full correction with explanations and Microsoft Learn links, in both languages", async () => {
    const attemptId = await play("correction-1", at(100), (_id, key) => key);
    const en = await getAttemptResults(db, { attemptId, userId });
    expect(en.scaledScore).toBe(1000);
    expect(en.passed).toBe(true);
    for (const i of en.items) {
      expect(i.correctAnswer.length).toBeGreaterThan(0);
      expect(i.explanationHtml.length).toBeGreaterThan(20);
      expect(i.references[0]!.url).toMatch(/^https:\/\/learn\.microsoft\.com\//);
    }
    const fr = await getAttemptResults(db, { attemptId, userId, locale: "fr" });
    const q = fr.items.find((i) => i.question.id === "stor-lifecycle-cool-delete");
    if (q) expect(q.explanationHtml).toContain("stratégie de gestion du cycle de vie");
    const yesno = en.items.find((i) => i.question.id === "stor-sas-types");
    if (yesno) expect(yesno.correctAnswer.map((l) => l.html)).toEqual(["Yes", "Yes", "No"]);
  });

  it("is not available before submission, nor to other users", async () => {
    const { attemptId } = await createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: at(300), seed: "open" });
    await expect(getAttemptResults(db, { attemptId, userId })).rejects.toBeInstanceOf(SessionError);
    const other = await createUser(db, { email: "nosy@example.com" });
    await expect(getAttemptResults(db, { attemptId, userId: other.id })).rejects.toBeInstanceOf(SessionError);
    await db.attempt.delete({ where: { id: attemptId } });
  });
});

describe("progress", () => {
  it("lists attempts, averages domains over the last 3 and computes readiness", async () => {
    // Two perfect exams after the two above: the streak is 2 (the first scored low).
    await play("perfect-2", at(400), (_id, key) => key);
    let p = await getProgress(db, userId, "en");
    expect(p.attempts.map((a) => a.scaledScore).slice(-2)).toEqual([1000, 1000]);
    let ready = p.readiness.find((r) => r.certification === "az-104")!;
    expect(ready).toMatchObject({ ready: false, streak: 2, needed: 3, minScore: 800 });

    await play("perfect-3", at(500), (_id, key) => key);
    p = await getProgress(db, userId, "en");
    ready = p.readiness.find((r) => r.certification === "az-104")!;
    expect(ready).toMatchObject({ ready: true, streak: 3 });
    const levels = p.domainLevels.filter((d) => d.certification === "az-104");
    expect(levels).toHaveLength(5);
    for (const l of levels) expect(l.scaledScore).toBe(1000);
    expect(p.attempts).toHaveLength(4);
  });
});

describe("question reports", () => {
  it("records reports on seen questions and sends a question back to review after 3 reports", async () => {
    const qid = "stor-lifecycle-cool-delete";
    await reportQuestion(db, { questionId: qid, userId, reason: "ambiguous", comment: "  " });
    expect((await db.questionReport.findFirstOrThrow({ where: { questionId: qid } })).comment).toBeNull();
    for (let i = 1; i < REPORTS_BEFORE_REVIEW; i++) await reportQuestion(db, { questionId: qid, userId, reason: "typo" });
    expect((await db.question.findUniqueOrThrow({ where: { id: qid } })).status).toBe("needs_review");

    const stranger = await createUser(db, { email: "stranger@example.com" });
    await expect(reportQuestion(db, { questionId: qid, userId: stranger.id, reason: "other" })).rejects.toBeInstanceOf(SessionError);
  });
});
