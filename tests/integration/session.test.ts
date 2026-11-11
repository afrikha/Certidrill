import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { loadCertification } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";
import { seedBank, seedReferential } from "@/lib/content/seed";
import { anyResponse, publishSampleBank } from "./sample-bank";
import { createUser } from "@/lib/users";
import { loadHistory } from "@/lib/exam/bank-query";
import {
  createAttempt,
  DEADLINE_GRACE_MS,
  expireOverdue,
  getAttemptView,
  lockSection,
  saveItem,
  SessionError,
  startAttempt,
  submitAttempt,
} from "@/lib/exam/session";

const db = new PrismaClient();
let userId: string;
let otherId: string;
const T0 = new Date("2026-11-11T09:00:00Z");
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof SessionError && e.code === code);
}

beforeAll(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "attempt_item","attempt_section","attempt","question_report","question","case_study","question_series","objective","domain","blueprint","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
  );
  const content = await loadCertification(path.resolve(__dirname, "../../content/az-104"));
  await seedReferential(db, content);
  await seedBank(db, content, await loadBank(content));
  expect(await publishSampleBank(db)).toBe(28);
  userId = (await createUser(db, { email: "candidate@example.com" })).id;
  otherId = (await createUser(db, { email: "other@example.com" })).id;
});
afterAll(() => db.$disconnect());

beforeEach(async () => {
  await db.attempt.deleteMany({});
});

describe("attempt lifecycle", () => {
  it("creates an attempt, resumes it, and hides questions until the clock starts", async () => {
    const created = await createAttempt(db, { userId, certificationCode: "az-104", locale: "fr", now: T0, seed: "s1" });
    expect(created.resumed).toBe(false);
    expect(created.shortfall).toBeGreaterThan(0); // 28 sample questions < 45
    const again = await createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: T0 });
    expect(again).toMatchObject({ attemptId: created.attemptId, resumed: true });

    const view = await getAttemptView(db, { attemptId: created.attemptId, userId, now: T0 });
    expect(view.status).toBe("not_started");
    expect(view.items).toEqual([]);
    expect(view.totalQuestions).toBe(28);
    expect(view.sectionKinds).toContain("case_study");
    expect(view.sectionKinds).toContain("series");
    expect(view.locale).toBe("fr");
  });

  it("starts the clock once, from the server time", async () => {
    const { attemptId } = await createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: T0, seed: "s2" });
    const started = await startAttempt(db, { attemptId, userId, now: at(1) });
    expect(started.deadlineAt!.getTime() - started.startedAt!.getTime()).toBe(100 * 60_000);
    const again = await startAttempt(db, { attemptId, userId, now: at(5) });
    expect(again.startedAt).toEqual(started.startedAt);
    const view = await getAttemptView(db, { attemptId, userId, now: at(31) });
    expect(view.remainingMs).toBe(70 * 60_000);
  });

  it("never exposes answers or explanations before submission", async () => {
    const { attemptId } = await createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: T0, seed: "s3" });
    await startAttempt(db, { attemptId, userId, now: T0 });
    const view = await getAttemptView(db, { attemptId, userId, now: at(1) });
    expect(view.items).toHaveLength(28);
    const json = JSON.stringify(view);
    const questions = await db.question.findMany();
    for (const q of questions) {
      const explanation = (q.explanation as { correct: { en: string } }).correct.en;
      expect(json).not.toContain(JSON.stringify(explanation).slice(1, -1));
    }
    expect(json).not.toMatch(/"answer"|"explanation"|"optionIds":\[/);
  });

  it("is invisible to other users", async () => {
    const { attemptId } = await createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: T0, seed: "s4" });
    await expectCode(getAttemptView(db, { attemptId, userId: otherId, now: T0 }), "not_found");
    await expectCode(startAttempt(db, { attemptId, userId: otherId, now: T0 }), "not_found");
    await expectCode(submitAttempt(db, { attemptId, userId: otherId, now: T0 }), "not_found");
  });
});

describe("sections", () => {
  async function started(seed: string) {
    const { attemptId } = await createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: T0, seed });
    await startAttempt(db, { attemptId, userId, now: T0 });
    return { attemptId, view: await getAttemptView(db, { attemptId, userId, now: at(1) }) };
  }

  it("only accepts writes in the current section, and never in a locked one — even through the API", async () => {
    const { attemptId, view } = await started("sections-1");
    const [first, second] = view.sections;
    const itemOf = (sectionId: string) => view.items.find((i) => i.sectionId === sectionId)!;
    expect(view.currentSectionId).toBe(first!.id);

    // A later section cannot be written before the current one is left.
    const later = itemOf(second!.id);
    await expectCode(saveItem(db, { attemptId, itemId: later.id, userId, response: anyResponse(later), now: at(2) }), "not_current_section");

    if (first!.kind === "case_study") {
      const item = itemOf(first!.id);
      await saveItem(db, { attemptId, itemId: item.id, userId, response: anyResponse(item), now: at(2) });
      // free navigation inside the case study: the answer can be changed
      await saveItem(db, { attemptId, itemId: item.id, userId, response: null, now: at(3) });
      await saveItem(db, { attemptId, itemId: item.id, userId, response: anyResponse(item), now: at(3) });
    }
    {
      await lockSection(db, { attemptId, sectionId: first!.id, userId, now: at(4) });
      const item = itemOf(first!.id);
      await expectCode(saveItem(db, { attemptId, itemId: item.id, userId, response: anyResponse(item), now: at(5) }), "locked");
      await lockSection(db, { attemptId, sectionId: first!.id, userId, now: at(5) }); // idempotent
    }
  });

  it("walks a whole exam: case studies, one-way series, main section with flags, then submission", async () => {
    const { attemptId, view } = await started("sections-6");
    expect(view.sectionKinds).toEqual(expect.arrayContaining(["case_study", "series", "main"]));
    let minute = 2;
    for (const section of view.sections) {
      const items = view.items.filter((i) => i.sectionId === section.id);
      if (section.kind === "series") {
        const [a, b] = items;
        await expectCode(saveItem(db, { attemptId, itemId: b!.id, userId, response: { value: true }, now: at(minute) }), "out_of_order");
        await saveItem(db, { attemptId, itemId: a!.id, userId, response: { value: true }, now: at(minute) });
        await expectCode(saveItem(db, { attemptId, itemId: a!.id, userId, response: { value: false }, now: at(minute) }), "final_answer");
        await expectCode(saveItem(db, { attemptId, itemId: b!.id, userId, response: null, now: at(minute) }), "invalid_response");
        for (const it of items.slice(1)) await saveItem(db, { attemptId, itemId: it.id, userId, response: { value: false }, now: at(minute) });
      } else {
        for (const it of items) await saveItem(db, { attemptId, itemId: it.id, userId, response: anyResponse(it), now: at(minute) });
      }
      if (section.kind === "main") {
        const it = items[0]!;
        await expectCode(saveItem(db, { attemptId, itemId: it.id, userId, response: { nonsense: 1 }, now: at(minute) }), "invalid_response");
        const flagged = await saveItem(db, { attemptId, itemId: it.id, userId, flagged: true, now: at(minute) });
        expect(flagged.flagged).toBe(true);
      }
      if (section.id === view.sections.at(-1)!.id) {
        await expectCode(lockSection(db, { attemptId, sectionId: section.id, userId, now: at(minute) }), "last_section");
      } else {
        await lockSection(db, { attemptId, sectionId: section.id, userId, now: at(minute) });
      }
      minute += 5;
    }

    const submitted = await submitAttempt(db, { attemptId, userId, now: at(minute) });
    expect(submitted.status).toBe("submitted");
    expect(submitted.scaledScore).toBeGreaterThanOrEqual(0);
    expect(submitted.scaledScore).toBeLessThanOrEqual(1000);
    expect(submitted.passed).toBe(submitted.scaledScore! >= 700);
    const items = await db.attemptItem.findMany({ where: { attemptId } });
    const earned = items.reduce((s, i) => s + i.pointsEarned!, 0);
    const possible = items.reduce((s, i) => s + i.pointsMax!, 0);
    expect(submitted.scaledScore).toBe(Math.round((1000 * earned) / possible));

    // closed for good
    await expectCode(saveItem(db, { attemptId, itemId: items[0]!.id, userId, response: null, now: at(minute + 1) }), "finished");
    const again = await submitAttempt(db, { attemptId, userId, now: at(minute + 2) });
    expect(again.submittedAt).toEqual(submitted.submittedAt);
    expect(await db.attemptSection.count({ where: { attemptId, lockedAt: null } })).toBe(0);

    // history: every question is now seen, wrong ones are marked missed
    const history = await loadHistory(db, userId, submitted.certificationId);
    expect(history.seenAt.size).toBe(items.length);
    const missed = items.filter((i) => i.pointsEarned! < i.pointsMax!).length;
    expect(history.missed.size).toBe(missed);
  });

  it("refuses writes before the start", async () => {
    const { attemptId } = await createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: T0, seed: "s5" });
    const item = await db.attemptItem.findFirstOrThrow({ where: { attemptId } });
    await expectCode(saveItem(db, { attemptId, itemId: item.id, userId, flagged: true, now: T0 }), "not_started");
    await expectCode(submitAttempt(db, { attemptId, userId, now: T0 }), "not_started");
  });
});

describe("submission and saves racing", () => {
  /** A client whose next $transaction first runs `before` (another request landing at that moment). */
  function withBeforeTransaction(client: PrismaClient, before: () => Promise<unknown>): PrismaClient {
    let pending = true;
    return new Proxy(client, {
      get(target, key, receiver) {
        if (key === "$transaction" && pending) {
          pending = false;
          return async (...args: unknown[]) => {
            await before();
            return (target.$transaction as (...a: unknown[]) => unknown)(...args);
          };
        }
        const value = Reflect.get(target, key, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }

  async function startedExam(seed: string) {
    const { attemptId } = await createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: T0, seed });
    await startAttempt(db, { attemptId, userId, now: T0 });
    const view = await getAttemptView(db, { attemptId, userId, now: at(1) });
    const item = view.items.find((i) => i.sectionId === view.currentSectionId)!;
    const { answer } = await db.question.findUniqueOrThrow({ where: { id: item.question.id }, select: { answer: true } });
    return { attemptId, item, answer };
  }

  it("scores an answer saved while the submission starts (regression: saved but not scored)", async () => {
    const { attemptId, item, answer } = await startedExam("race-save-first");
    const racing = withBeforeTransaction(db, () => saveItem(db, { attemptId, itemId: item.id, userId, response: answer, now: at(2) }));
    await submitAttempt(racing, { attemptId, userId, now: at(2) });
    const stored = await db.attemptItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(stored.response).toEqual(answer);
    expect(stored.pointsEarned).toBe(stored.pointsMax);
    expect(stored.pointsEarned).toBeGreaterThan(0);
  });

  it("refuses an answer that arrives once the attempt is closed", async () => {
    const { attemptId, item, answer } = await startedExam("race-submit-first");
    const racing = withBeforeTransaction(db, () => submitAttempt(db, { attemptId, userId, now: at(2) }));
    await expectCode(saveItem(racing, { attemptId, itemId: item.id, userId, response: answer, now: at(2) }), "finished");
    const stored = await db.attemptItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(stored.response).toBeNull();
    expect(stored.pointsEarned).toBe(0);
  });
});

describe("expiry", () => {
  it("accepts writes within the grace period, then auto-submits as expired with the saved answers", async () => {
    const { attemptId } = await createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: T0, seed: "exp-1" });
    const started = await startAttempt(db, { attemptId, userId, now: T0 });
    const deadline = started.deadlineAt!.getTime();
    const view = await getAttemptView(db, { attemptId, userId, now: at(1) });
    const current = view.items.find((i) => i.sectionId === view.currentSectionId)!;
    await saveItem(db, { attemptId, itemId: current.id, userId, response: anyResponse(current), now: new Date(deadline + DEADLINE_GRACE_MS - 1) });

    await expectCode(saveItem(db, { attemptId, itemId: current.id, userId, response: null, now: new Date(deadline + DEADLINE_GRACE_MS + 1) }), "expired");
    const attempt = await db.attempt.findUniqueOrThrow({ where: { id: attemptId } });
    expect(attempt.status).toBe("expired");
    expect(attempt.submittedAt).toEqual(started.deadlineAt);
    const saved = await db.attemptItem.findUniqueOrThrow({ where: { id: current.id } });
    expect(saved.response).not.toBeNull();
    expect(saved.pointsMax).toBeGreaterThan(0);
  });

  it("records a late submission as expired at the deadline (time used never exceeds the duration)", async () => {
    const { attemptId } = await createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: T0, seed: "exp-late" });
    const started = await startAttempt(db, { attemptId, userId, now: T0 });
    const deadline = started.deadlineAt!.getTime();
    const late = await submitAttempt(db, { attemptId, userId, now: new Date(deadline + DEADLINE_GRACE_MS + 60_000) });
    expect(late.status).toBe("expired");
    expect(late.submittedAt).toEqual(started.deadlineAt);
  });

  it("records a submission within the grace period as submitted", async () => {
    const { attemptId } = await createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: T0, seed: "exp-grace" });
    const started = await startAttempt(db, { attemptId, userId, now: T0 });
    const within = new Date(started.deadlineAt!.getTime() + DEADLINE_GRACE_MS - 1);
    const done = await submitAttempt(db, { attemptId, userId, now: within });
    expect(done.status).toBe("submitted");
    expect(done.submittedAt).toEqual(within);
  });

  it("expires on read and before creating a new attempt", async () => {
    const { attemptId } = await createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: T0, seed: "exp-2" });
    await startAttempt(db, { attemptId, userId, now: T0 });
    const late = at(101);
    const view = await getAttemptView(db, { attemptId, userId, now: late });
    expect(view.status).toBe("expired");
    expect(view.items).toEqual([]);

    const second = await createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: at(200), seed: "exp-3" });
    await startAttempt(db, { attemptId: second.attemptId, userId, now: at(200) });
    await expireOverdue(db, userId, at(400));
    expect((await db.attempt.findUniqueOrThrow({ where: { id: second.attemptId } })).status).toBe("expired");
    const third = await createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: at(400), seed: "exp-4" });
    expect(third.resumed).toBe(false);
  });
});

describe("bank and history queries", () => {
  it("only lets published content into exams unless EXAM_INCLUDE_UNPUBLISHED is set", async () => {
    const { examStatuses } = await import("@/lib/exam/bank-query");
    const previous = process.env.EXAM_INCLUDE_UNPUBLISHED;
    try {
      delete process.env.EXAM_INCLUDE_UNPUBLISHED;
      expect(examStatuses()).toEqual(["published"]);
      process.env.EXAM_INCLUDE_UNPUBLISHED = "true";
      expect(examStatuses()).toContain("draft");
    } finally {
      if (previous === undefined) delete process.env.EXAM_INCLUDE_UNPUBLISHED;
      else process.env.EXAM_INCLUDE_UNPUBLISHED = previous;
    }
  });

  it("refuses an inactive certification and an empty bank", async () => {
    await expectCode(createAttempt(db, { userId, certificationCode: "nope", locale: "en", now: T0 }), "inactive_certification");
    await db.question.updateMany({ data: { status: "draft" } });
    await db.caseStudy.updateMany({ data: { status: "draft" } });
    await db.questionSeries.updateMany({ data: { status: "draft" } });
    try {
      await expectCode(createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: T0 }), "empty_bank");
    } finally {
      await publishSampleBank(db);
    }
  });

  it("keeps the most recent outcome of each question in the history", async () => {
    const run = async (seed: string, start: Date, correct: boolean) => {
      const { attemptId } = await createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: start, seed });
      await startAttempt(db, { attemptId, userId, now: start });
      await submitAttempt(db, { attemptId, userId, now: new Date(start.getTime() + 60_000) });
      // Force the outcome of one question.
      const item = await db.attemptItem.findFirstOrThrow({ where: { attemptId, questionId: "stor-lifecycle-cool-delete" } });
      await db.attemptItem.update({ where: { id: item.id }, data: { pointsEarned: correct ? 1 : 0, pointsMax: 1 } });
      return attemptId;
    };
    // Created in this order, but the second one started earlier: dates decide, not creation order.
    await run("h-new", at(500), true);
    await run("h-old", at(300), false);
    const certificationId = (await db.certification.findUniqueOrThrow({ where: { code: "az-104" } })).id;
    const history = await loadHistory(db, userId, certificationId);
    expect(history.seenAt.get("stor-lifecycle-cool-delete")).toBe(at(500).getTime());
    expect(history.missed.has("stor-lifecycle-cool-delete")).toBe(false);
  });
});
