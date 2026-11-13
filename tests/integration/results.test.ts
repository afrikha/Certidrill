import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadCertification } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";
import { seedBank, seedReferential } from "@/lib/content/seed";
import { publishSampleBank } from "./sample-bank";
import { createUser } from "@/lib/users";
import { createAttempt, getAttemptView, lockSection, saveItem, SessionError, startAttempt, submitAttempt } from "@/lib/exam/session";
import { getAttemptProgress, getAttemptResults, getProgress, getReadinessChange, reportQuestion, REPORTS_BEFORE_REVIEW } from "@/lib/exam/results";
import { grantFullAccess } from "./access";

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
  expect(await publishSampleBank(db)).toBe(28);
  userId = (await createUser(db, { email: "results@example.com" })).id;
  await grantFullAccess(db, userId);
});
afterAll(() => db.$disconnect());

/**
 * Plays an attempt: `answer(questionId)` returns the response to give (or
 * undefined to leave it blank). Sections are walked in order.
 */
async function play(seed: string, start: Date, answer: (questionId: string, key: unknown) => unknown, uid = userId) {
  const userId = uid;
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
  it("is empty for a user without finished attempts", async () => {
    const fresh = await createUser(db, { email: "fresh@example.com" });
    expect(await getProgress(db, fresh.id, "fr")).toEqual({ attempts: [], domainLevels: [], readiness: [], progression: [] });
  });

  it("lists attempts, averages domains over the last 3 and computes readiness", async () => {
    // Two perfect exams after the two above: the streak is 2 (the first scored low).
    const second = await play("perfect-2", at(400), (_id, key) => key);
    let p = await getProgress(db, userId, "en", at(401));
    expect(p.attempts.map((a) => a.scaledScore).slice(-2)).toEqual([1000, 1000]);
    let ready = p.readiness.find((r) => r.certification === "az-104")!;
    expect(ready).toMatchObject({ ready: false, streak: 2, needed: 3, minScore: 800, attempts: 3 });
    expect(ready.config).toMatchObject({ minAttempts: 3, domainFloor: 650, bands: { ready: 85 } });
    expect(ready.checks.find((c) => c.code === "streak")).toMatchObject({ ok: false, value: 2, target: 3 });
    expect(ready.index).toBeLessThan(85);

    const third = await play("perfect-3", at(500), (_id, key) => key);
    p = await getProgress(db, userId, "en", at(501));
    ready = p.readiness.find((r) => r.certification === "az-104")!;
    const levels = p.domainLevels.filter((d) => d.certification === "az-104");
    expect(levels).toHaveLength(5);
    for (const l of levels) expect(l.scaledScore).toBe(1000);
    expect(p.attempts).toHaveLength(4);
    // XP and levels: every exam gives XP, the four exams here reach level 4 or more.
    const prog = p.progression.find((x) => x.certification === "az-104")!;
    expect(prog.gains).toHaveLength(4);
    expect(prog.xp).toBe(prog.gains.reduce((sum, g) => sum + g.total, 0));
    expect(prog.level.n).toBeGreaterThanOrEqual(4);
    expect(prog.title).toBe(prog.config.levels[prog.level.n - 1]!.title.en);
    expect(prog.badges.map((b) => b.code)).toEqual(expect.arrayContaining(["first_exam", "first_pass", "personal_best", "gold_domain", "hat_trick"]));
    expect(prog.mastery.every((m) => m.tier === "gold")).toBe(true);
    expect(prog.mastery.map((m) => m.code)).toEqual(["identities", "storage", "compute", "networking", "monitoring"]);
    const fr = (await getProgress(db, userId, "fr", at(501))).progression[0]!;
    expect(fr.title).toBe(prog.config.levels[prog.level.n - 1]!.title.fr);

    // The results page: XP of this exam, level and badges it earned.
    const step = (await getAttemptProgress(db, { attemptId: third, userId, locale: "fr" })).progression!;
    expect(step.gain).toEqual(prog.gains.at(-1));
    expect(step).toMatchObject({ xp: prog.xp, levels: 10, level: { n: prog.level.n, title: fr.title } });
    expect(step.badges.map((b) => b.code)).toContain("hat_trick");
    expect(step.previousTitle === null).toBe(step.gain.levelBefore === step.gain.levelAfter);
    // Every level with its title in the user's language, for the animated XP bar.
    expect(step.ladder).toEqual(prog.config.levels.map((l) => ({ xp: l.xp, title: l.title.fr })));

    // The test bank has 28 published questions: every exam repeats most of them,
    // so perfect scores are not enough to be ready.
    expect(ready).toMatchObject({ ready: false, verdict: "almost", streak: 3, capped: true });
    expect(ready.raw).toBeGreaterThanOrEqual(85);
    expect(ready.checks.find((c) => c.code === "new_questions")).toMatchObject({ ok: false, blocking: true });

    // Without that rule (minNewShare 0), the same history is ready.
    const bp = await db.blueprint.findFirstOrThrow({ where: { current: true, certification: { code: "az-104" } } });
    const structure = bp.structure as { readiness: { freshness: Record<string, unknown> } };
    try {
      await db.blueprint.update({
        where: { id: bp.id },
        data: { structure: { ...structure, readiness: { ...structure.readiness, freshness: { ...structure.readiness.freshness, minNewShare: 0 } } } },
      });
      p = await getProgress(db, userId, "en", at(501));
      ready = p.readiness.find((r) => r.certification === "az-104")!;
      expect(ready).toMatchObject({ ready: true, verdict: "ready", streak: 3, capped: false });
      expect(ready.index).toBeGreaterThanOrEqual(85);

      // The results page shows how each exam moved the index.
      const change = (await getReadinessChange(db, { attemptId: third, userId }))!;
      expect(change.after.index).toBe(ready.index);
      expect(change.before!.index).toBeLessThan(change.after.index);
      expect(change.before!.verdict).not.toBe("ready");
      // The verdict bands of the blueprint, for the animated gauge.
      expect(change.bands).toEqual(ready.config.bands);
      const first = p.attempts.find((a) => a.certification === "az-104")!;
      expect((await getReadinessChange(db, { attemptId: first.id, userId }))!.before).toBeNull();
      expect((await getReadinessChange(db, { attemptId: second, userId }))!.after.streak).toBe(2);
      expect(await getReadinessChange(db, { attemptId: "missing", userId })).toBeNull();
      expect(await getReadinessChange(db, { attemptId: third, userId: (await createUser(db, { email: "other-change@example.com" })).id })).toBeNull();
    } finally {
      await db.blueprint.update({ where: { id: bp.id }, data: { structure: bp.structure as object } });
    }
  });

  it("follows the readiness settings of the current blueprint, and skips invalid ones", async () => {
    const bp = await db.blueprint.findFirstOrThrow({ where: { current: true, certification: { code: "az-104" } } });
    const structure = bp.structure as { readiness: Record<string, unknown> };
    try {
      await db.blueprint.update({ where: { id: bp.id }, data: { structure: { ...structure, readiness: { ...structure.readiness, minAttempts: 10 } } } });
      let p = await getProgress(db, userId, "en", at(501));
      expect(p.readiness[0]).toMatchObject({ ready: false, config: { minAttempts: 10 } });

      // A blueprint stored before the readiness index existed: no indicator, domain levels still there.
      await db.blueprint.update({ where: { id: bp.id }, data: { structure: { ...structure, readiness: { consecutive: 3, minScore: 800 } } } });
      p = await getProgress(db, userId, "en", at(501));
      expect(p.readiness).toEqual([]);
      expect(p.domainLevels).toHaveLength(5);
      expect(await getReadinessChange(db, { attemptId: p.attempts.at(-1)!.id, userId })).toBeNull();

      // A blueprint stored before progression existed: no XP card either.
      const withoutProgression: Record<string, unknown> = { ...structure };
      delete withoutProgression.progression;
      await db.blueprint.update({ where: { id: bp.id }, data: { structure: withoutProgression as object } });
      p = await getProgress(db, userId, "en", at(501));
      expect(p.progression).toEqual([]);
      expect(p.readiness).toHaveLength(1);
      expect(await getAttemptProgress(db, { attemptId: p.attempts.at(-1)!.id, userId })).toMatchObject({ progression: null });
    } finally {
      await db.blueprint.update({ where: { id: bp.id }, data: { structure: bp.structure as object } });
    }
  });
});

/**
 * A client whose first questionReport.findFirst sees no open report (as when two
 * requests run at the same time); optionally its create fails with `createError`.
 */
function withMissedLookup(client: PrismaClient, createError?: Error): PrismaClient {
  let missed = false;
  const reports = new Proxy(client.questionReport, {
    get(target, key, receiver) {
      if (key === "findFirst" && !missed) {
        missed = true;
        return async () => null;
      }
      if (key === "create" && createError) return async () => Promise.reject(createError);
      const value = Reflect.get(target, key, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return new Proxy(client, { get: (target, key, receiver) => (key === "questionReport" ? reports : Reflect.get(target, key, receiver)) });
}

describe("question reports", () => {
  it("keeps one open report per user and sends a question back to review only after 3 different users", async () => {
    // A question every player has seen: take one from the user's first attempt.
    const seenBy = async (uid: string) => new Set((await db.attemptItem.findMany({ where: { attempt: { userId: uid } }, select: { questionId: true } })).map((i) => i.questionId));
    const mine = await seenBy(userId);
    const reporters: string[] = [];
    for (let n = 0; n < 6 && reporters.length < 2; n++) {
      const other = (await createUser(db, { email: `reporter${n}@example.com` })).id;
      await play(`reporter-${n}`, at(600 + n * 100), () => undefined, other);
      reporters.push(other);
    }
    const [a, b] = await Promise.all(reporters.map(seenBy));
    const qid = [...mine].find((q) => a!.has(q) && b!.has(q));
    expect(qid).toBeDefined();
    await db.question.update({ where: { id: qid! }, data: { status: "published" } });

    // One user reporting three times: a single open report (the last one), question still published.
    await reportQuestion(db, { questionId: qid!, userId, reason: "ambiguous", comment: "  " });
    expect((await db.questionReport.findFirstOrThrow({ where: { questionId: qid! } })).comment).toBeNull();
    for (let i = 1; i < REPORTS_BEFORE_REVIEW; i++) await reportQuestion(db, { questionId: qid!, userId, reason: "typo", comment: `again ${i}` });
    const open = await db.questionReport.findMany({ where: { questionId: qid!, status: "open" } });
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ userId, reason: "typo", comment: `again ${REPORTS_BEFORE_REVIEW - 1}` });
    expect((await db.question.findUniqueOrThrow({ where: { id: qid! } })).status).toBe("published");

    // The database refuses a second open report from the same user (concurrent submits).
    await expect(db.questionReport.create({ data: { questionId: qid!, userId, reason: "other" } })).rejects.toMatchObject({ code: "P2002" });

    // Two more users: three distinct reporters → back to review.
    await reportQuestion(db, { questionId: qid!, userId: reporters[0]!, reason: "wrong_answer" });
    expect((await db.question.findUniqueOrThrow({ where: { id: qid! } })).status).toBe("published");
    await reportQuestion(db, { questionId: qid!, userId: reporters[1]!, reason: "outdated" });
    expect((await db.question.findUniqueOrThrow({ where: { id: qid! } })).status).toBe("needs_review");

    // Race: two submits from the same user both find no open report; the index
    // rejects the second insert and it updates the existing report instead.
    const racing = withMissedLookup(db);
    await reportQuestion(racing, { questionId: qid!, userId: reporters[0]!, reason: "translation", comment: "race" });
    expect(await db.questionReport.findMany({ where: { questionId: qid!, userId: reporters[0]!, status: "open" } })).toMatchObject([{ reason: "translation", comment: "race" }]);
    // Any other database error is not swallowed.
    await expect(reportQuestion(withMissedLookup(db, new Error("db down")), { questionId: qid!, userId, reason: "other" })).rejects.toThrow("db down");

    const stranger = await createUser(db, { email: "stranger@example.com" });
    await expect(reportQuestion(db, { questionId: qid!, userId: stranger.id, reason: "other" })).rejects.toBeInstanceOf(SessionError);
  });
});
