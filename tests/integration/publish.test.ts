/**
 * Activation and publication by batch in the back-office, on a real
 * PostgreSQL with the AZ-900 bank (fundamentals, every file in draft): the
 * activation refused while the published bank cannot build complete exams,
 * the batch on the filters with its case studies and series, the audit log,
 * and a re-seed that keeps what the back-office set until the file changes it.
 */
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma as db } from "@/lib/db";
import { loadCertification, type CertificationContent } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";
import type { QuestionBank } from "@/lib/content/bank";
import { bankStatusAfterSeed, seedBank, seedReferential } from "@/lib/content/seed";
import { createUser } from "@/lib/users";
import { batchWhere, certificationRows, checkExamBank, PublishError, setCertificationActive, setQuestionStatuses } from "@/lib/content/publish";

let content: CertificationContent;
let bank: QuestionBank;
let adminId: string;
let certificationId: string;

const reset = async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "audit_log","attempt_item","attempt_section","attempt","entitlement","question_report","question","case_study","question_series","objective","domain","blueprint","certification","user" CASCADE',
  );
  await seedReferential(db, content);
  await seedBank(db, content, bank);
  adminId = (await createUser(db, { email: "publisher@example.com", role: "admin" })).id;
  certificationId = (await db.certification.findUniqueOrThrow({ where: { code: "az-900" } })).id;
};

const refusal = (p: Promise<unknown>) => p.then(() => null, (err: unknown) => (err instanceof PublishError ? err.code : err));
const statuses = async () => Object.fromEntries((await db.question.groupBy({ by: ["status"], where: { certificationId }, _count: { _all: true } })).map((g) => [g.status, g._count._all]));

beforeAll(async () => {
  content = await loadCertification(path.resolve(__dirname, "../../content/az-900"));
  bank = await loadBank(content);
});
beforeEach(reset);
afterAll(() => db.$disconnect());

describe("bankStatusAfterSeed", () => {
  const before = { status: "published" as const, fileStatus: "draft" as const, version: 1 };
  it("keeps the database status while the file keeps its status and version", () => {
    expect(bankStatusAfterSeed(before, { status: "draft", version: 1 })).toBe("published");
    expect(bankStatusAfterSeed({ ...before, status: "needs_review", fileStatus: "published" }, { status: "published", version: 1 })).toBe("needs_review");
  });
  it("takes the file's status when the file changes it, with a new version, for a new or retired row", () => {
    expect(bankStatusAfterSeed(before, { status: "reviewed", version: 1 })).toBe("reviewed");
    expect(bankStatusAfterSeed(before, { status: "draft", version: 2 })).toBe("draft");
    expect(bankStatusAfterSeed(undefined, { status: "draft", version: 1 })).toBe("draft");
    expect(bankStatusAfterSeed({ ...before, status: "retired" }, { status: "draft", version: 1 })).toBe("draft");
  });
});

describe("activation", () => {
  it("is refused while no published question builds an exam, then allowed and recorded", async () => {
    expect((await db.certification.findUniqueOrThrow({ where: { code: "az-900" } })).active).toBe(false);
    expect(await checkExamBank(db, certificationId)).toMatchObject({ ok: false, available: 0 });
    expect(await refusal(setCertificationActive(db, adminId, "az-900", true))).toBe("incomplete_bank");
    expect(await refusal(setCertificationActive(db, adminId, "nope", true))).toBe("not_found");

    await setQuestionStatuses(db, adminId, { certification: "az-900", to: "published" });
    expect((await checkExamBank(db, certificationId)).ok).toBe(true);
    expect(await setCertificationActive(db, adminId, "az-900", true)).toBe(true);
    expect(await setCertificationActive(db, adminId, "az-900", true)).toBe(false);
    const log = await db.auditLog.findMany({ where: { action: "certification.active" } });
    expect(log.map((l) => l.details)).toEqual([{ certification: "az-900", active: true }]);

    // Deactivation is always allowed.
    expect(await setCertificationActive(db, adminId, "az-900", false)).toBe(true);
  });

  it("survives a re-seed while blueprint.yaml keeps active: false, and follows the file when it changes", async () => {
    await setQuestionStatuses(db, adminId, { certification: "az-900", to: "published" });
    await setCertificationActive(db, adminId, "az-900", true);
    await seedReferential(db, content);
    expect(await db.certification.findUniqueOrThrow({ where: { code: "az-900" } })).toMatchObject({ active: true, fileActive: false });

    const activeInFile = { ...content, blueprint: { ...content.blueprint, certification: { ...content.blueprint.certification, active: true } } };
    await seedReferential(db, activeInFile);
    await setCertificationActive(db, adminId, "az-900", false);
    await seedReferential(db, activeInFile);
    expect(await db.certification.findUniqueOrThrow({ where: { code: "az-900" } })).toMatchObject({ active: false, fileActive: true });
    // The file changes its value: it wins.
    await seedReferential(db, content);
    expect(await db.certification.findUniqueOrThrow({ where: { code: "az-900" } })).toMatchObject({ active: false, fileActive: false });
  });
});

describe("questions by batch", () => {
  it("changes only the filtered questions, with one audit entry listing them", async () => {
    const domain = content.blueprint.domains[0]!.code;
    const expected = await db.question.count({ where: batchWhere(certificationId, { domain, type: "single" }) });
    expect(expected).toBeGreaterThan(0);
    expect(await setQuestionStatuses(db, adminId, { certification: "az-900", domain, type: "single", to: "reviewed" })).toBe(expected);
    expect((await statuses()).reviewed).toBe(expected);
    // Again: nothing left to change.
    expect(await setQuestionStatuses(db, adminId, { certification: "az-900", domain, type: "single", to: "reviewed" })).toBe(0);
    // From reviewed only.
    expect(await setQuestionStatuses(db, adminId, { certification: "az-900", status: "reviewed", to: "published" })).toBe(expected);
    expect(await statuses()).toEqual({ published: expected, draft: bank.questions.length - expected });

    const log = await db.auditLog.findMany({ where: { action: "question.status" }, orderBy: { createdAt: "asc" } });
    expect(log).toHaveLength(2);
    expect(log[0]!.details).toMatchObject({ certification: "az-900", filters: { type: "single", status: null, domain }, to: "reviewed", count: expected });
    expect((log[0]!.details as { ids: string[] }).ids).toHaveLength(expected);
  });

  it("never republishes a question reported by users (needs_review), even when filtered on it", async () => {
    const [reported] = bank.questions;
    await db.question.update({ where: { id: reported!.id }, data: { status: "needs_review" } });
    expect(await setQuestionStatuses(db, adminId, { certification: "az-900", to: "published" })).toBe(bank.questions.length - 1);
    expect(await setQuestionStatuses(db, adminId, { certification: "az-900", status: "needs_review", to: "published" })).toBe(0);
    expect((await db.question.findUniqueOrThrow({ where: { id: reported!.id } })).status).toBe("needs_review");
  });

  it("never touches retired questions, and publishes the case studies and series of the batch", async () => {
    const [first] = bank.questions;
    await db.question.update({ where: { id: first!.id }, data: { status: "retired" } });
    expect(await setQuestionStatuses(db, adminId, { certification: "az-900", to: "published" })).toBe(bank.questions.length - 1);
    expect(await setQuestionStatuses(db, adminId, { certification: "az-900", status: "retired", to: "published" })).toBe(0);
    expect((await db.question.findUniqueOrThrow({ where: { id: first!.id } })).status).toBe("retired");

    // AZ-900 has neither: a case study and a series added by hand follow their questions.
    const [a, b] = bank.questions.slice(1, 3);
    await db.caseStudy.create({ data: { id: "cs-test", certificationId, title: {}, tabs: [], status: "draft" } });
    await db.questionSeries.create({ data: { id: "sr-test", certificationId, stem: {}, status: "draft" } });
    await db.question.update({ where: { id: a!.id }, data: { caseStudyId: "cs-test", status: "draft" } });
    await db.question.update({ where: { id: b!.id }, data: { seriesId: "sr-test", status: "draft" } });
    expect(await setQuestionStatuses(db, adminId, { certification: "az-900", status: "draft", to: "published" })).toBe(2);
    expect((await db.caseStudy.findUniqueOrThrow({ where: { id: "cs-test" } })).status).toBe("published");
    expect((await db.questionSeries.findUniqueOrThrow({ where: { id: "sr-test" } })).status).toBe("published");
  });

  it("publishes a case study or a series only when all its questions are, and takes it out of exams with any question that leaves published", async () => {
    // Two questions of different types: a batch on one type takes only one of them.
    const a = bank.questions[0]!;
    const b = bank.questions.find((q) => q.type !== a.type)!;
    const c = bank.questions.find((q) => q.id !== a.id && q.id !== b.id)!;
    await db.caseStudy.create({ data: { id: "cs-mixed", certificationId, title: {}, tabs: [], status: "published" } });
    await db.question.updateMany({ where: { id: { in: [a.id, b.id] } }, data: { caseStudyId: "cs-mixed", status: "published" } });
    await db.question.update({ where: { id: c.id }, data: { caseStudyId: "cs-mixed", status: "retired" } });
    const caseStudy = () => db.caseStudy.findUniqueOrThrow({ where: { id: "cs-mixed" } }).then((x) => x.status);

    // One of its questions back to draft: the case study leaves the exams with it, rather than being drawn truncated.
    expect(await setQuestionStatuses(db, adminId, { certification: "az-900", type: a.type, status: "published", to: "draft" })).toBe(1);
    expect(await caseStudy()).toBe("draft");

    // Questions at different statuses: a batch publishing one of them leaves the case study as it is…
    await db.question.update({ where: { id: b.id }, data: { status: "reviewed" } });
    await setQuestionStatuses(db, adminId, { certification: "az-900", status: "draft", to: "published" });
    expect(await caseStudy()).toBe("draft");
    // …and the batch completing it publishes it (the retired question does not count).
    await setQuestionStatuses(db, adminId, { certification: "az-900", status: "reviewed", to: "published" });
    expect(await caseStudy()).toBe("published");
  });

  it("keeps the published status at re-seed while the files stay in draft, and follows a new version", async () => {
    await setQuestionStatuses(db, adminId, { certification: "az-900", to: "published" });
    await seedBank(db, content, bank);
    expect(await statuses()).toEqual({ published: bank.questions.length });

    const [first] = bank.questions;
    await seedBank(db, content, { ...bank, questions: bank.questions.map((q) => (q.id === first!.id ? { ...q, version: q.version + 1 } : q)) });
    expect(await statuses()).toEqual({ published: bank.questions.length - 1, draft: 1 });
  });

  it("refuses a batch that would leave an active certification without complete exams, and changes nothing", async () => {
    await setQuestionStatuses(db, adminId, { certification: "az-900", to: "published" });
    await setCertificationActive(db, adminId, "az-900", true);
    const before = await db.auditLog.count({ where: { action: "question.status" } });
    expect(await refusal(setQuestionStatuses(db, adminId, { certification: "az-900", to: "draft" }))).toBe("breaks_active");
    expect(await statuses()).toEqual({ published: bank.questions.length });
    expect(await db.auditLog.count({ where: { action: "question.status" } })).toBe(before);

    // A few questions less still build complete exams: allowed, and the audit lists the ids changed.
    const [one] = bank.questions;
    expect(await setQuestionStatuses(db, adminId, { certification: "az-900", type: one!.type, domain: content.blueprint.domains[0]!.code, to: "reviewed" })).toBeGreaterThan(0);
    const last = await db.auditLog.findFirstOrThrow({ where: { action: "question.status" }, orderBy: { createdAt: "desc" } });
    const details = last.details as { ids: string[]; count: number };
    expect(details.ids).toHaveLength(details.count);
    expect(await db.question.count({ where: { id: { in: details.ids }, status: "reviewed" } })).toBe(details.count);
  });

  it("lists every certification with its counts and exam check", async () => {
    await setQuestionStatuses(db, adminId, { certification: "az-900", to: "published" });
    const [row] = await certificationRows(db);
    expect(row).toMatchObject({ code: "az-900", active: false, fileActive: false, questions: { published: bank.questions.length }, exam: { ok: true, shortfall: 0 } });
  });
});
