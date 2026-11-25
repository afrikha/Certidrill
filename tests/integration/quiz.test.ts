/**
 * End-of-chapter quizzes (docs/SPECS-QUIZ-CHAPITRE.md) on a real PostgreSQL
 * with the AZ-104 content: quiz questions never reach a mock exam nor the
 * bank's counts (§4.1), the seed of quizzes/ (§4.2), the publication by
 * batch, and the student flow (§3, §5): access, no answer key before the
 * validation, result, best score, outline state and progression XP.
 */
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadCertification, type CertificationContent } from "@/lib/content/loader";
import { loadBank, type QuestionBank } from "@/lib/content/bank";
import { loadCourse, type Course } from "@/lib/content/course";
import { loadQuizzes, type ChapterQuiz } from "@/lib/content/quiz";
import { seedBank, seedCourse, seedQuizzes, seedReferential } from "@/lib/content/seed";
import { certificationRows, checkExamBank, setQuestionStatuses } from "@/lib/content/publish";
import { loadAssemblyBank } from "@/lib/exam/bank-query";
import { createAttempt } from "@/lib/exam/session";
import { quizXp, reportQuestion } from "@/lib/exam/results";
import { answerQuizQuestion, getQuizPage, QuizError, quizSummaries, startQuiz } from "@/lib/course/quiz";
import { createUser } from "@/lib/users";
import { publishSampleBank } from "./sample-bank";
import { grantFullAccess } from "./access";

const db = new PrismaClient();
let content: CertificationContent;
let bank: QuestionBank;
let course: Course | null;
let quizzes: ChapterQuiz[];
let certificationId: string;
let adminId: string;
let free: { userId: string; isAdmin: boolean };
let full: { userId: string; isAdmin: boolean };
let admin: { userId: string; isAdmin: boolean };

const isQuiz = (id: string) => id.includes("-qz-");
const code = (err: unknown) => (err instanceof QuizError ? err.code : err);
const refusal = (p: Promise<unknown>) => p.then(() => null, code);

beforeAll(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "quiz_attempt","course_progress","course_section","course_chapter","course_module","attempt_item","attempt_section","attempt","entitlement","audit_log","question_report","question","case_study","question_series","objective","domain","blueprint","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
  );
  content = await loadCertification(path.resolve(__dirname, "../../content/az-104"));
  bank = await loadBank(content);
  course = await loadCourse(content);
  quizzes = await loadQuizzes(content, course, bank);
  await seedReferential(db, content);
  await seedBank(db, content, bank);
  await seedCourse(db, content, course);
  await seedQuizzes(db, content, quizzes);
  await publishSampleBank(db);
  await db.courseChapter.updateMany({ where: { code: { in: ["11-entra-users-groups", "12-rbac"] } }, data: { status: "published" } });
  certificationId = (await db.certification.findUniqueOrThrow({ where: { code: "az-104" } })).id;
  adminId = (await createUser(db, { email: "quiz-admin@example.com", role: "admin" })).id;
  admin = { userId: adminId, isAdmin: true };
  free = { userId: (await createUser(db, { email: "quiz-free@example.com" })).id, isAdmin: false };
  full = { userId: (await createUser(db, { email: "quiz-full@example.com" })).id, isAdmin: false };
  await grantFullAccess(db, full.userId);
});
afterAll(() => db.$disconnect());

describe("seed of quizzes/", () => {
  it("loads the 15 quizzes of AZ-104 as quiz questions, at their chapter and position", async () => {
    expect(quizzes).toHaveLength(15);
    const rows = await db.question.findMany({ where: { usage: "quiz", certificationId }, include: { chapter: true } });
    expect(rows).toHaveLength(150);
    const rbac = rows.filter((q) => q.chapter?.code === "12-rbac").sort((a, b) => a.quizPosition! - b.quizPosition!);
    expect(rbac.map((q) => q.id)).toEqual(Array.from({ length: 10 }, (_, i) => `az104-qz-12-${String(i + 1).padStart(2, "0")}`));
    expect(rows.every((q) => isQuiz(q.id) && q.status === "draft")).toBe(true);
    expect(await db.question.count({ where: { usage: "exam", id: { contains: "-qz-" } } })).toBe(0);
    // The file tools (simulation, blind export, content:check) read the bank through loadBank: no quiz there.
    expect(bank.questions.filter((q) => isQuiz(q.id))).toEqual([]);
  });

  it("is idempotent, keeps a status set in the back-office and retires a question removed from the files", async () => {
    expect(await seedQuizzes(db, content, quizzes)).toMatchObject({ quizzes: 15, questions: 150, written: 0, retired: 0 });
    // The exam bank's seed leaves the quizzes alone.
    expect(await seedBank(db, content, bank)).toMatchObject({ retired: 0 });
    await db.question.update({ where: { id: "az104-qz-12-01" }, data: { status: "reviewed" } });
    expect((await seedQuizzes(db, content, quizzes)).written).toBe(0);
    expect((await db.question.findUniqueOrThrow({ where: { id: "az104-qz-12-01" } })).status).toBe("reviewed");

    const fewer = quizzes.map((q) => (q.chapter === "13-governance" ? { ...q, questions: q.questions.slice(0, 9) } : q));
    expect(await seedQuizzes(db, content, fewer)).toMatchObject({ retired: 1 });
    const removed = await db.question.findFirstOrThrow({ where: { status: "retired", usage: "quiz" } });
    expect(removed.quizPosition).toBeNull();
    // Back in the files: back at its position, with the file's status.
    expect(await seedQuizzes(db, content, quizzes)).toMatchObject({ written: 1, retired: 0 });
    expect(await db.question.findUniqueOrThrow({ where: { id: removed.id } })).toMatchObject({ status: "draft", quizPosition: 10 });
    await db.question.update({ where: { id: "az104-qz-12-01" }, data: { status: "draft" } });
  });
});

describe("never in a mock exam (§4.1)", () => {
  it("keeps every quiz question out of the exam bank and the exams, even with EXAM_INCLUDE_UNPUBLISHED=true", async () => {
    const previous = process.env.EXAM_INCLUDE_UNPUBLISHED;
    // Every quiz question published, then every status allowed in exams.
    await db.question.updateMany({ where: { usage: "quiz" }, data: { status: "published" } });
    try {
      for (const flag of [undefined, "true"]) {
        if (flag) process.env.EXAM_INCLUDE_UNPUBLISHED = flag;
        else delete process.env.EXAM_INCLUDE_UNPUBLISHED;
        const assembly = await loadAssemblyBank(db, certificationId);
        const ids = [...assembly.questions, ...assembly.caseStudies.flatMap((c) => c.questions), ...assembly.series.flatMap((s) => s.questions)].map((q) => q.id);
        expect(ids.length).toBeGreaterThan(0);
        expect(ids.filter(isQuiz)).toEqual([]);
      }
      // EXAM_INCLUDE_UNPUBLISHED=true: exams draw from the whole bank, never a quiz.
      for (const seed of ["quiz-1", "quiz-2", "quiz-3"]) {
        const { attemptId } = await createAttempt(db, { userId: full.userId, certificationCode: "az-104", locale: "en", seed });
        const items = await db.attemptItem.findMany({ where: { attemptId }, select: { questionId: true } });
        expect(items.length).toBeGreaterThan(40);
        expect(items.filter((i) => isQuiz(i.questionId))).toEqual([]);
        await db.attempt.delete({ where: { id: attemptId } });
      }
    } finally {
      if (previous === undefined) delete process.env.EXAM_INCLUDE_UNPUBLISHED;
      else process.env.EXAM_INCLUDE_UNPUBLISHED = previous;
      await db.question.updateMany({ where: { usage: "quiz" }, data: { status: "draft" } });
    }
  });

  it("counts the exam bank without the quizzes, and the quizzes apart", async () => {
    const row = (await certificationRows(db)).find((r) => r.code === "az-104")!;
    const examCount = await db.question.count({ where: { certificationId, usage: "exam" } });
    expect(Object.values(row.questions).reduce((n, x) => n + (x ?? 0), 0)).toBe(examCount);
    expect(row.quizzes).toEqual({ draft: 150 });
    const before = await checkExamBank(db, certificationId);
    await db.question.updateMany({ where: { usage: "quiz" }, data: { status: "published" } });
    expect(await checkExamBank(db, certificationId)).toEqual(before);
    await db.question.updateMany({ where: { usage: "quiz" }, data: { status: "draft" } });
  });
});

describe("publication by batch (§4.2)", () => {
  it("never touches the quizzes from the bank, and publishes one chapter's quiz on its own", async () => {
    const published = await db.question.count({ where: { usage: "exam", status: "published" } });
    await setQuestionStatuses(db, adminId, { certification: "az-104", status: "published", to: "published" });
    expect(await db.question.count({ where: { usage: "quiz", status: { not: "draft" } } })).toBe(0);
    expect(await setQuestionStatuses(db, adminId, { certification: "az-104", usage: "quiz", chapter: "11-entra-users-groups", to: "published" })).toEqual({ questions: 10, groups: 0 });
    expect(await db.question.count({ where: { usage: "quiz", status: "published" } })).toBe(10);
    expect(await db.question.count({ where: { usage: "exam", status: "published" } })).toBe(published);
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "question.status" }, orderBy: { createdAt: "desc" } });
    expect(log.details).toMatchObject({ filters: { usage: "quiz", chapter: "11-entra-users-groups" }, count: 10 });
  });
});

/** The stored answer key of each quiz question: a right answer for the tests. */
const keys = async () => new Map((await db.question.findMany({ where: { usage: "quiz" }, select: { id: true, answer: true } })).map((q) => [q.id, q.answer]));

describe("the student flow (§3, §5)", () => {
  const chapter = "11-entra-users-groups";

  it("shows a published quiz, never one with a question in draft, except as an administrator's preview", async () => {
    expect((await getQuizPage(db, { certification: "az-104", chapter, viewer: free, locale: "fr" })).preview).toBe(false);
    expect(await refusal(getQuizPage(db, { certification: "az-104", chapter: "12-rbac", viewer: full, locale: "en" }))).toBe("unavailable");
    expect((await getQuizPage(db, { certification: "az-104", chapter: "12-rbac", viewer: admin, locale: "en" })).preview).toBe(true);
    expect(await refusal(getQuizPage(db, { certification: "az-104", chapter: "00-getting-started", viewer: admin, locale: "en" }))).toBe("unavailable");
    expect(await refusal(getQuizPage(db, { certification: "az-104", chapter: "21-storage-access", viewer: full, locale: "en" }))).toBe("not_found");
    expect([...(await quizSummaries(db, free, "az-104")).keys()]).toEqual([chapter]);
  });

  it("opens the quiz of a free chapter at the free level, the others with full access only", async () => {
    await setQuestionStatuses(db, adminId, { certification: "az-104", usage: "quiz", chapter: "12-rbac", to: "published" });
    expect((await getQuizPage(db, { certification: "az-104", chapter: "12-rbac", viewer: free, locale: "en" })).locked).toBe(true);
    expect(await refusal(startQuiz(db, { certification: "az-104", chapter: "12-rbac", viewer: free, locale: "en" }))).toBe("locked");
    expect((await getQuizPage(db, { certification: "az-104", chapter: "12-rbac", viewer: full, locale: "en" })).locked).toBe(false);
    expect((await getQuizPage(db, { certification: "az-104", chapter, viewer: free, locale: "en" })).locked).toBe(false);
  });

  it("sends a question without its answer key, then its correction once validated, and scores out of 10", async () => {
    const key = await keys();
    const started = await startQuiz(db, { certification: "az-104", chapter, viewer: free, locale: "fr", seed: "s1" });
    expect(started.step).toMatchObject({ position: 1, hard: false, question: { id: "az104-qz-11-01" } });
    const sent = JSON.stringify(started.step);
    expect(sent).not.toMatch(/"answer"|"explanation"|optionId|correct/);

    // Out of order, or someone else's attempt: refused.
    expect(await refusal(answerQuizQuestion(db, { attemptId: started.id, position: 2, response: null, viewer: free, locale: "fr" }))).toBe("out_of_order");
    expect(await refusal(answerQuizQuestion(db, { attemptId: started.id, position: 1, response: null, viewer: full, locale: "fr" }))).toBe("not_found");

    let step = started.step;
    for (let p = 1; p <= 10; p++) {
      expect(step.position).toBe(p);
      expect(step.hard).toBe(p > 5);
      // Wrong at positions 2 and 7, right elsewhere.
      const response = p === 2 || p === 7 ? null : key.get(step.question.id);
      const out = await answerQuizQuestion(db, { attemptId: started.id, position: p, response, viewer: free, locale: "fr" });
      expect(out.correction).toMatchObject({ position: p, passed: p !== 2 && p !== 7 });
      expect(out.correction.correctAnswer.length).toBeGreaterThan(0);
      expect(out.correction.explanationHtml).not.toBe("");
      expect(out.correction.sections.every((s) => s.href.startsWith(`/course/az-104/${chapter}#`))).toBe(true);
      if (p < 10) step = out.next!;
      else expect(out.result).toMatchObject({ score: 8, hardScore: 4, easyScore: 4, passed: true, best: { score: 8, hardScore: 4, passed: true } });
    }
    expect(await refusal(answerQuizQuestion(db, { attemptId: started.id, position: 10, response: null, viewer: free, locale: "fr" }))).toBe("finished");
    const page = await getQuizPage(db, { certification: "az-104", chapter, viewer: free, locale: "fr" });
    expect(page.attempt).toBeNull();
    expect(page.last).toMatchObject({ score: 8, passed: true });
    expect((await quizSummaries(db, free, "az-104")).get(chapter)).toMatchObject({ state: "mastered", best: { score: 8 } });
    // A quiz question is reported like an exam question.
    await expect(reportQuestion(db, { questionId: "az104-qz-11-02", userId: free.userId, reason: "ambiguous" })).resolves.toBeTruthy();
    await expect(reportQuestion(db, { questionId: "az104-qz-11-02", userId: full.userId, reason: "ambiguous" })).rejects.toThrow();
    // Started but not reached: a question of the chapter's bank the user has not answered yet cannot be reported.
    const other = await startQuiz(db, { certification: "az-104", chapter, viewer: full, locale: "en", seed: "s1" });
    await answerQuizQuestion(db, { attemptId: other.id, position: 1, response: null, viewer: full, locale: "en" });
    await expect(reportQuestion(db, { questionId: other.step.question.id, userId: full.userId, reason: "typo" })).resolves.toBeTruthy();
    await expect(reportQuestion(db, { questionId: "az104-qz-11-02", userId: full.userId, reason: "ambiguous" })).rejects.toThrow();
  });

  it("keeps the best result after a worse attempt, lists the sections to reread, resumes an attempt in progress", async () => {
    const started = await startQuiz(db, { certification: "az-104", chapter, viewer: free, locale: "en", seed: "s2" });
    let step = started.step;
    let result;
    for (let p = 1; p <= 10; p++) {
      const out = await answerQuizQuestion(db, { attemptId: started.id, position: p, response: null, viewer: free, locale: "en" });
      if (out.next) step = out.next;
      result = out.result;
    }
    expect(step.position).toBe(10);
    expect(result).toMatchObject({ score: 0, passed: false, best: { score: 8, passed: true } });
    expect(result!.review.length).toBeGreaterThan(0);
    const sections = await db.courseSection.findMany({ where: { chapter: { code: chapter } }, orderBy: { order: "asc" }, select: { code: true } });
    const order = sections.map((s) => s.code);
    expect(result!.review.map((s) => order.indexOf(s.code))).toEqual([...result!.review.map((s) => order.indexOf(s.code))].sort((a, b) => a - b));
    expect((await quizSummaries(db, free, "az-104")).get(chapter)).toMatchObject({ state: "mastered", best: { score: 8 } });

    // In progress: the page resumes at the next question; a new start drops it.
    const third = await startQuiz(db, { certification: "az-104", chapter, viewer: free, locale: "en" });
    await answerQuizQuestion(db, { attemptId: third.id, position: 1, response: null, viewer: free, locale: "en" });
    expect((await getQuizPage(db, { certification: "az-104", chapter, viewer: free, locale: "en" })).attempt).toMatchObject({ id: third.id, answered: 1, step: { position: 2 } });
    await startQuiz(db, { certification: "az-104", chapter, viewer: free, locale: "en" });
    expect(await db.quizAttempt.count({ where: { id: third.id } })).toBe(0);
  });

  it("gives the progression XP once per chapter mastered, and nothing to the readiness or the exam statistics", async () => {
    expect(await quizXp(db, free.userId, "az-104")).toBe(25);
    const again = await startQuiz(db, { certification: "az-104", chapter, viewer: free, locale: "en" });
    const key = await keys();
    let step = again.step;
    for (let p = 1; p <= 10; p++) {
      const out = await answerQuizQuestion(db, { attemptId: again.id, position: p, response: key.get(step.question.id), viewer: free, locale: "en" });
      if (out.next) step = out.next;
      else expect(out.result).toMatchObject({ score: 10, best: { score: 10 } });
    }
    expect(await quizXp(db, free.userId, "az-104")).toBe(25);
    expect(await quizXp(db, free.userId, "az-104", new Date("2000-01-01"))).toBe(0);
    expect(await db.attempt.count({ where: { userId: free.userId } })).toBe(0);
  });
});
