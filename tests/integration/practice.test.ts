import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadCertification } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";
import { loadCourse } from "@/lib/content/course";
import { loadQuizzes } from "@/lib/content/quiz";
import { seedBank, seedCourse, seedQuizzes, seedReferential } from "@/lib/content/seed";
import { createUser } from "@/lib/users";
import { createAttempt, getAttemptView, saveItem, startAttempt, submitAttempt } from "@/lib/exam/session";
import { getAttemptResults } from "@/lib/exam/results";
import { answerQuizQuestion, startQuiz } from "@/lib/course/quiz";
import { kubectlBinary } from "@/lib/exercises/kubectl";
import { grantFullAccess } from "./access";

/**
 * docs/SPECS-KUBERNETES-PRATIQUE.md on the real CKAD content (published in
 * this test database only): a practice series of 17 exercises graded at
 * submission with kubectl v1.37 and scored per check, the answer key never
 * sent before, the checks in the correction; the exercises of a chapter quiz.
 */
const db = new PrismaClient();
const T0 = new Date("2026-11-27T09:00:00Z");
const CODE = "ckad";
let userId: string;

type Variant = { command?: string; manifest?: string };
type ExerciseAnswer = { checks: { id: string }[]; solution: Variant[]; negatives: Variant[] };
const asResponse = (type: string, v: Variant) => (type === "command" ? { command: v.command! } : { manifest: v.manifest! });

if (!kubectlBinary() && process.env.CI) throw new Error("kubectl v1.37 must be installed in CI");

beforeAll(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "attempt_item","attempt_section","attempt","quiz_attempt","question_report","question","case_study","question_series","objective","domain","blueprint","course_section","course_chapter","course_module","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
  );
  const content = await loadCertification(path.resolve(__dirname, "../../content", CODE));
  await seedReferential(db, content);
  const bank = await loadBank(content);
  await seedBank(db, content, bank);
  const course = await loadCourse(content);
  await seedCourse(db, content, course);
  await seedQuizzes(db, content, await loadQuizzes(content, course, bank));
  await db.certification.update({ where: { code: CODE }, data: { active: true } });
  await db.question.updateMany({ data: { status: "published" } });
  await db.courseChapter.updateMany({ data: { status: "published" } });
  userId = (await createUser(db, { email: "ckad@example.com" })).id;
  await grantFullAccess(db, userId, CODE);
}, 240_000);
afterAll(() => db.$disconnect());

describe.runIf(kubectlBinary())("a CKAD practice series (§4, §5)", () => {
  it("is stored as a performance-based certification, scored per check", async () => {
    const cert = await db.certification.findUniqueOrThrow({ where: { code: CODE }, include: { blueprints: { where: { current: true } } } });
    expect(cert.format).toBe("performance");
    expect(cert.blueprints[0]!.scoring).toMatchObject({ command: "per_check", manifest: "per_check" });
    expect(cert.blueprints[0]).toMatchObject({ durationMin: 120, minQuestions: 17, maxQuestions: 17, passScore: 66, maxScore: 100 });
  });

  it("draws 17 exercises, sends no answer key, grades at submission with kubectl and scores each check", async () => {
    const { attemptId } = await createAttempt(db, { userId, certificationCode: CODE, locale: "fr", now: T0, seed: "practice-1" });
    await startAttempt(db, { attemptId, userId, now: T0 });
    const view = await getAttemptView(db, { attemptId, userId, now: T0 });
    expect(view.certification.format).toBe("performance");
    expect(view.items).toHaveLength(17);
    const sent = JSON.stringify(view);
    expect(sent).not.toMatch(/"checks"|"solution"|"negatives"|"grading"/);

    const keys = new Map((await db.question.findMany({ select: { id: true, type: true, answer: true } })).map((q) => [q.id, q]));
    // The first right, the second wrong (a negative), the third blank, the others right.
    for (const [i, item] of view.items.entries()) {
      const q = keys.get(item.question.id)!;
      const a = q.answer as ExerciseAnswer;
      if (i === 2) continue;
      await saveItem(db, { attemptId, itemId: item.id, userId, response: asResponse(q.type, i === 1 ? a.negatives[0]! : a.solution[0]!), now: T0 });
    }
    // Saving grades nothing.
    expect(await db.attemptItem.count({ where: { attemptId, grading: { not: Prisma.DbNull } } })).toBe(0);

    await submitAttempt(db, { attemptId, userId, now: new Date(T0.getTime() + 60 * 60_000) });
    const items = await db.attemptItem.findMany({ where: { attemptId }, orderBy: { order: "asc" }, include: { question: true } });
    for (const [i, it] of items.entries()) {
      const checks = (it.question.answer as ExerciseAnswer).checks;
      expect(it.pointsMax).toBe(checks.length);
      // A blank exercise is not run: no grading, no point.
      if (i === 2) {
        expect([it.grading, it.pointsEarned]).toEqual([null, 0]);
        continue;
      }
      const results = (it.grading as { results: { id: string; passed: boolean }[] }).results;
      expect(results.map((r) => r.id)).toEqual(checks.map((c) => c.id));
      const passed = results.filter((r) => r.passed).length;
      expect(it.pointsEarned).toBe(passed);
      if (i === 1) expect(passed).toBeLessThan(checks.length);
      else expect(passed, `${it.question.id}`).toBe(checks.length);
    }

    const r = await getAttemptResults(db, { attemptId, userId });
    expect(r.certification.format).toBe("performance");
    const possible = items.reduce((s, it) => s + it.pointsMax!, 0);
    const earned = items.reduce((s, it) => s + it.pointsEarned!, 0);
    expect(r.scaledScore).toBe(Math.round((100 * earned) / possible));
    // The correction: each check with its result; the blank one fails them all.
    const second = r.items.find((it) => it.order === 2)!;
    expect(second.checks!.some((c) => !c.passed)).toBe(true);
    expect(second.checks!.every((c) => c.labelHtml !== "")).toBe(true);
    const third = r.items.find((it) => it.order === 3)!;
    expect(third.checks!.every((c) => !c.passed)).toBe(true);
    expect(third.exerciseError).toBeUndefined();
    expect(r.items.find((it) => it.order === 1)!.checks!.every((c) => c.passed)).toBe(true);
  }, 120_000);

  it("scores all or nothing when the blueprint says so", async () => {
    const bp = await db.blueprint.findFirstOrThrow({ where: { current: true, certification: { code: CODE } } });
    await db.blueprint.update({ where: { id: bp.id }, data: { scoring: { ...(bp.scoring as object), command: "all_or_nothing", manifest: "all_or_nothing" } } });
    try {
      const { attemptId } = await createAttempt(db, { userId, certificationCode: CODE, locale: "en", now: T0, seed: "practice-2" });
      await startAttempt(db, { attemptId, userId, now: T0 });
      const view = await getAttemptView(db, { attemptId, userId, now: T0 });
      const q = await db.question.findUniqueOrThrow({ where: { id: view.items[0]!.question.id } });
      await saveItem(db, { attemptId, itemId: view.items[0]!.id, userId, response: asResponse(q.type, (q.answer as ExerciseAnswer).negatives[0]!), now: T0 });
      const right = await db.question.findUniqueOrThrow({ where: { id: view.items[1]!.question.id } });
      await saveItem(db, { attemptId, itemId: view.items[1]!.id, userId, response: asResponse(right.type, (right.answer as ExerciseAnswer).solution[0]!), now: T0 });
      await submitAttempt(db, { attemptId, userId, now: new Date(T0.getTime() + 30 * 60_000) });
      const [first, second] = await db.attemptItem.findMany({ where: { attemptId }, orderBy: { order: "asc" }, take: 2 });
      expect([first!.pointsEarned, first!.pointsMax]).toEqual([0, 1]);
      expect([second!.pointsEarned, second!.pointsMax]).toEqual([1, 1]);
    } finally {
      await db.blueprint.update({ where: { id: bp.id }, data: { scoring: bp.scoring as object } });
    }
  }, 120_000);
});

describe.runIf(kubectlBinary())("the exercises of a chapter quiz (positions 6 to 10)", () => {
  it("sends no answer key, then corrects each exercise check by check", async () => {
    const viewer = { userId, isAdmin: false };
    const quizQuestion = await db.question.findFirstOrThrow({ where: { usage: "quiz", type: { in: ["command", "manifest"] } }, include: { chapter: true } });
    const chapter = quizQuestion.chapter!.code;
    const questions = new Map((await db.question.findMany({ where: { usage: "quiz", chapterId: quizQuestion.chapterId } })).map((q) => [q.id, q]));
    const started = await startQuiz(db, { certification: CODE, chapter, viewer, locale: "fr", seed: "quiz-1" });
    let step = started.step;
    for (let p = 1; p <= 10; p++) {
      expect(JSON.stringify(step)).not.toMatch(/"checks"|"solution"|"negatives"/);
      const q = questions.get(step.question.id)!;
      const exercise = q.type === "command" || q.type === "manifest";
      if (p > 5) expect(exercise).toBe(true);
      const a = q.answer as ExerciseAnswer;
      // Exercises: the solution at 6 and 8, a negative at 7, blank at 9 and 10.
      const response = !exercise ? q.answer : p === 6 || p === 8 ? asResponse(q.type, a.solution[0]!) : p === 7 ? asResponse(q.type, a.negatives[0]!) : null;
      const out = await answerQuizQuestion(db, { attemptId: started.id, position: p, response, viewer, locale: "fr" });
      if (exercise) {
        expect(out.correction.checks).toHaveLength(a.checks.length);
        expect(out.correction.passed).toBe(p === 6 || p === 8);
        if (p === 7) expect(out.correction.checks!.some((c) => !c.passed)).toBe(true);
        if (p >= 9) expect(out.correction.exerciseError).toBe("no answer");
      }
      if (p < 10) step = out.next!;
      else expect(out.result).toMatchObject({ hardScore: 2 });
    }
    const attempt = await db.quizAttempt.findUniqueOrThrow({ where: { id: started.id } });
    const results = attempt.results as Record<string, { grading?: { results: unknown[] } }>;
    expect(results["6"]!.grading!.results.length).toBeGreaterThan(0);
  }, 120_000);
});
