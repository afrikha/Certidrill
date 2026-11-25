import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadCertification } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";
import { loadCourse } from "@/lib/content/course";
import { seedBank, seedCourse, seedReferential } from "@/lib/content/seed";
import { createUser } from "@/lib/users";
import { createAttempt, getAttemptView, saveItem, startAttempt, submitAttempt } from "@/lib/exam/session";
import { getAttemptResults } from "@/lib/exam/results";
import { activeCatalog } from "@/lib/catalog";
import { groupByVendor } from "@/lib/vendors";
import { grantFullAccess } from "./access";

/**
 * docs/SPECS-KUBERNETES.md (KCNA, CNCF vendor, score in percent) and
 * docs/SPECS-AWS.md §3.7 (content offered in English only), on the real
 * content (published in this test database only: the files stay in draft).
 */
const db = new PrismaClient();
const T0 = new Date("2026-11-24T09:00:00Z");
let userId: string;

beforeAll(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "attempt_item","attempt_section","attempt","question_report","question","case_study","question_series","objective","domain","blueprint","course_section","course_chapter","course_module","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
  );
  for (const code of ["az-900", "kcna", "dva-c03"]) {
    const content = await loadCertification(path.resolve(__dirname, "../../content", code));
    await seedReferential(db, content);
    await seedBank(db, content, await loadBank(content));
    await seedCourse(db, content, await loadCourse(content));
  }
  userId = (await createUser(db, { email: "k8s@example.com" })).id;
}, 240_000);
afterAll(() => db.$disconnect());

describe("content offered in English only (docs/SPECS-AWS.md §3.7)", () => {
  it("stores the languages of each certification", async () => {
    const languages = Object.fromEntries((await db.certification.findMany({ select: { code: true, languages: true } })).map((c) => [c.code, c.languages]));
    expect(languages).toEqual({ "az-900": ["en", "fr"], kcna: ["en"], "dva-c03": ["en"] });
  });

  it("serves the English as French, even where French files exist (DVA-C03)", async () => {
    for (const code of ["kcna", "dva-c03"]) {
      const questions = await db.question.findMany({ where: { certification: { code } }, select: { stem: true }, take: 20 });
      for (const q of questions) {
        const stem = q.stem as { en: string; fr: string };
        expect(stem.fr, code).toBe(stem.en);
      }
      const objective = await db.objective.findFirstOrThrow({ where: { domain: { blueprint: { certification: { code } } } } });
      const title = objective.title as { en: string; fr: string };
      expect(title.fr).toBe(title.en);
      const section = await db.courseSection.findFirstOrThrow({ where: { chapter: { certification: { code } } } });
      const body = section.body as { en: string; fr: string };
      expect(body.fr).toBe(body.en);
    }
    // A bilingual certification keeps its French.
    const az = await db.question.findFirstOrThrow({ where: { certification: { code: "az-900" } } });
    const stem = az.stem as { en: string; fr: string };
    expect(stem.fr).not.toBe(stem.en);
  });
});

describe("KCNA (docs/SPECS-KUBERNETES.md)", () => {
  it("is in a CNCF group of the catalogue, after Microsoft", async () => {
    await db.certification.updateMany({ where: { code: { in: ["az-900", "kcna"] } }, data: { active: true } });
    const groups = groupByVendor((await activeCatalog()).certifications);
    expect(groups.map((g) => [g.vendor.name, g.certifications.map((c) => c.code)])).toEqual([
      ["Microsoft", ["az-900"]],
      ["CNCF", ["kcna"]],
    ]);
  });

  it("runs a mock exam end to end: 60 questions, 90 minutes, a score in percent, pass at 75, English content in a French exam", async () => {
    const cert = await db.certification.findUniqueOrThrow({ where: { code: "kcna" } });
    await db.question.updateMany({ where: { certificationId: cert.id }, data: { status: "published" } });
    await grantFullAccess(db, userId, "kcna");

    const { attemptId, shortfall } = await createAttempt(db, { userId, certificationCode: "kcna", locale: "fr", now: T0 });
    expect(shortfall).toBe(0);
    await startAttempt(db, { attemptId, userId, now: T0 });
    const view = await getAttemptView(db, { attemptId, userId, now: T0 });
    expect([view.durationMin, view.items.length, view.certification.languages]).toEqual([90, 60, ["en"]]);
    for (const i of view.items) expect([i.question.type, i.question.maxPoints]).toEqual(["single", 1]);
    // The French exam shows the English stems.
    const questions = new Map((await db.question.findMany({ where: { id: { in: view.items.map((i) => i.question.id) } } })).map((q) => [q.id, q]));
    const first = view.items[0]!;
    const english = (questions.get(first.question.id)!.stem as { en: string }).en;
    expect(first.question.stemHtml).toContain(english.split(/[`*_[]/)[0]!.slice(0, 20));

    // 48 of 60 right: 80 %, a pass.
    for (const [k, item] of view.items.entries()) {
      const key = questions.get(item.question.id)!.answer as { optionId: string };
      const wrong = (item.question.body as { options: { id: string }[] }).options.find((o) => o.id !== key.optionId)!.id;
      await saveItem(db, { attemptId, itemId: item.id, userId, response: { optionId: k < 48 ? key.optionId : wrong }, now: T0 });
    }
    await submitAttempt(db, { attemptId, userId, now: new Date(T0.getTime() + 60 * 60_000) });
    const r = await getAttemptResults(db, { attemptId, userId });
    expect([r.maxScore, r.passScore, r.scaledScore, r.passed]).toEqual([100, 75, 80, true]);
    expect(r.certification).toMatchObject({ vendor: "CNCF", languages: ["en"] });
  });
});
