import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadCertification } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";
import { seedBank, seedReferential } from "@/lib/content/seed";
import { createUser } from "@/lib/users";
import { createAttempt, getAttemptView, saveItem, startAttempt, submitAttempt } from "@/lib/exam/session";
import { getAttemptResults } from "@/lib/exam/results";
import { grantFullAccess } from "./access";

/**
 * docs/SPECS-GOOGLE-CLOUD.md §3.3 on the real gcp-pca content (published in
 * this test database only): two case studies whose questions are mixed with
 * the others in the main section, each sent with its case study, never with
 * an answer or an explanation before submission; the correction names the
 * case study; the score is out of 100, 70 to pass.
 */
const db = new PrismaClient();
const T0 = new Date("2026-11-27T09:00:00Z");
const CODE = "gcp-pca";
let userId: string;

beforeAll(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "attempt_item","attempt_section","attempt","quiz_attempt","question_report","question","case_study","question_series","objective","domain","blueprint","course_section","course_chapter","course_module","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
  );
  const content = await loadCertification(path.resolve(__dirname, "../../content", CODE));
  await seedReferential(db, content);
  await seedBank(db, content, await loadBank(content));
  await db.certification.update({ where: { code: CODE }, data: { active: true } });
  await db.question.updateMany({ data: { status: "published" } });
  await db.caseStudy.updateMany({ data: { status: "published" } });
  userId = (await createUser(db, { email: "gcp@example.com" })).id;
  await grantFullAccess(db, userId, CODE);
}, 240_000);
afterAll(() => db.$disconnect());

describe("a gcp-pca mock exam: interleaved case studies", () => {
  it("mixes the questions of two case studies with the others, each sent with its case study and no answer", async () => {
    const { attemptId } = await createAttempt(db, { userId, certificationCode: CODE, locale: "fr", now: T0, seed: "gcp-1" });

    // Before the start: the count of case studies, no question, no case study.
    const before = await getAttemptView(db, { attemptId, userId, now: T0 });
    expect(before.status).toBe("not_started");
    expect(before.interleavedCaseStudies).toBe(2);
    expect(before.sectionKinds).toEqual(["main"]);
    expect([before.items, before.caseStudies]).toEqual([[], {}]);

    await startAttempt(db, { attemptId, userId, now: T0 });
    const view = await getAttemptView(db, { attemptId, userId, now: T0 });
    expect(view.items.length).toBeGreaterThanOrEqual(50);
    expect(view.items.length).toBeLessThanOrEqual(60);
    expect(view.sections.map((s) => s.kind)).toEqual(["main"]);

    const rows = new Map((await db.question.findMany({ where: { id: { in: view.items.map((i) => i.question.id) } } })).map((q) => [q.id, q]));
    // Each item carries the case study of its question, and only those.
    for (const item of view.items) expect(item.caseStudyId).toBe(rows.get(item.question.id)!.caseStudyId ?? undefined);
    const ids = [...new Set(view.items.flatMap((i) => i.caseStudyId ?? []))].sort();
    expect(ids).toHaveLength(2);
    expect(Object.keys(view.caseStudies).sort()).toEqual(ids);
    for (const id of ids) {
      const cs = view.caseStudies[id]!;
      const row = await db.caseStudy.findUniqueOrThrow({ where: { id } });
      // English only: the French reader gets the English case study.
      expect(cs.titleHtml).toContain((row.title as { en: string }).en.slice(0, 10));
      expect(cs.tabs.length).toBe((row.tabs as unknown[]).length);
      expect(cs.tabs.every((t) => t.html.length > 0)).toBe(true);
    }
    // Interleaved: an independent question between the first and the last case-study question.
    const positions = view.items.flatMap((i, p) => (i.caseStudyId ? [p] : []));
    expect(positions.at(-1)! - positions[0]! + 1).toBeGreaterThan(positions.length);
    // No answer key, no explanation before submission.
    expect(JSON.stringify(view)).not.toMatch(/"answer"|"explanation"|"optionId"|"optionIds"|"correct"/);

    // The first case-study question answered right, then submitted.
    const first = view.items[positions[0]!]!;
    const answer = rows.get(first.question.id)!.answer;
    await saveItem(db, { attemptId, itemId: first.id, userId, response: answer, now: T0 });
    await submitAttempt(db, { attemptId, userId, now: new Date(T0.getTime() + 60 * 60_000) });

    const r = await getAttemptResults(db, { attemptId, userId });
    expect([r.maxScore, r.passScore]).toEqual([100, 70]);
    expect(r.passed).toBe(false);
    const titles = new Map((await db.caseStudy.findMany({ where: { id: { in: ids } } })).map((c) => [c.id, (c.title as { en: string }).en]));
    // The correction names the case study of each interleaved question, and none for the others.
    for (const it of r.items) {
      const caseId = view.items.find((v) => v.id === it.id)!.caseStudyId;
      expect(it.sectionKind).toBe("main");
      expect(it.caseStudyTitle).toBe(caseId ? titles.get(caseId) : undefined);
    }
    expect(r.items.find((it) => it.id === first.id)!.earned).toBe(1);
  }, 120_000);
});
