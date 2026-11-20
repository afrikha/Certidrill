import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadCertification } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";
import { seedBank, seedReferential } from "@/lib/content/seed";
import { createUser } from "@/lib/users";
import { createAttempt, getAttemptView, saveItem, startAttempt, submitAttempt } from "@/lib/exam/session";
import { getAttemptResults } from "@/lib/exam/results";
import { activeCatalog } from "@/lib/catalog";
import { groupByVendor } from "@/lib/vendors";
import { grantFullAccess } from "./access";

/**
 * The acceptance criteria of docs/SPECS-AWS.md §5 on the real SAA-C03 content
 * (the bank is published in this test database only: the files stay in draft).
 */
const db = new PrismaClient();
const T0 = new Date("2026-11-20T09:00:00Z");
let userId: string;

beforeAll(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "attempt_item","attempt_section","attempt","question_report","question","case_study","question_series","objective","domain","blueprint","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
  );
  for (const code of ["az-104", "saa-c03", "soa-c03", "sap-c03"]) {
    const content = await loadCertification(path.resolve(__dirname, "../../content", code));
    await seedReferential(db, content);
    await seedBank(db, content, await loadBank(content));
  }
  userId = (await createUser(db, { email: "aws@example.com" })).id;
}, 120_000); // four real banks to seed
afterAll(() => db.$disconnect());

const saa = () => db.certification.findUniqueOrThrow({ where: { code: "saa-c03" } });

describe("SAA-C03 (docs/SPECS-AWS.md §5)", () => {
  it("is seeded inactive and in draft, and stays out of the catalogue until active", async () => {
    const cert = await saa();
    expect(cert).toMatchObject({ vendor: "AWS", active: false });
    expect(await db.question.count({ where: { certificationId: cert.id, status: { not: "draft" } } })).toBe(0);
    await db.certification.update({ where: { code: "az-104" }, data: { active: true } });
    expect(groupByVendor((await activeCatalog()).certifications).map((g) => g.vendor.key)).toEqual(["microsoft"]);

    await db.certification.update({ where: { id: cert.id }, data: { active: true } });
    const groups = groupByVendor((await activeCatalog()).certifications);
    expect(groups.map((g) => [g.vendor.name, g.certifications.map((c) => c.code)])).toEqual([
      ["Microsoft", ["az-104"]],
      ["AWS", ["saa-c03"]],
    ]);
    await db.certification.update({ where: { id: cert.id }, data: { active: false } });
  });

  it("scores 130 minutes, 65 single and multi questions, all or nothing, on 1000", async () => {
    const cert = await saa();
    await db.certification.update({ where: { id: cert.id }, data: { active: true } });
    await db.question.updateMany({ where: { certificationId: cert.id }, data: { status: "published" } });
    await grantFullAccess(db, userId, "saa-c03");
    const blueprint = await db.blueprint.findFirstOrThrow({ where: { certificationId: cert.id, current: true } });
    expect(blueprint.scoring).toEqual({ multi: "all_or_nothing", dragdrop: "all_or_nothing" });

    const { attemptId, shortfall } = await createAttempt(db, { userId, certificationCode: "saa-c03", locale: "fr", now: T0 });
    expect(shortfall).toBe(0);
    await startAttempt(db, { attemptId, userId, now: T0 });
    const view = await getAttemptView(db, { attemptId, userId, now: T0 });
    expect(view.durationMin).toBe(130);
    expect(view.sectionKinds).toEqual(["main"]);
    expect(view.items).toHaveLength(65);
    expect(new Set(view.items.map((i) => i.question.type))).toEqual(new Set(["single", "multi"]));
    // A multi question is worth 1, never one point per selection.
    for (const i of view.items) expect(i.question.maxPoints).toBe(1);

    // Every answer right, except one multi question with only one of its correct options.
    const keys = new Map((await db.question.findMany({ where: { certificationId: cert.id } })).map((q) => [q.id, q.answer as { optionId?: string; optionIds?: string[] }]));
    const half = view.items.find((i) => i.question.type === "multi")!;
    for (const item of view.items) {
      const key = keys.get(item.question.id)!;
      const response = item === half ? { optionIds: key.optionIds!.slice(0, 1) } : key;
      await saveItem(db, { attemptId, itemId: item.id, userId, response, now: T0 });
    }
    await submitAttempt(db, { attemptId, userId, now: new Date(T0.getTime() + 60 * 60_000) });

    const r = await getAttemptResults(db, { attemptId, userId });
    expect(r.certification.vendor).toBe("AWS");
    expect(r.maxScore).toBe(1000);
    expect(r.passScore).toBe(720);
    expect([r.earned, r.possible]).toEqual([64, 65]);
    const missed = r.items.find((i) => i.question.id === half.question.id)!;
    expect([missed.earned, missed.max]).toEqual([0, 1]);
    expect(r.types.find((t) => t.key === "multi")!.possible).toBe(view.items.filter((i) => i.question.type === "multi").length);
  });
});

describe("the other AWS certifications", () => {
  it("are seeded inactive and in draft; SOA-C03 shows its new name", async () => {
    for (const code of ["soa-c03", "sap-c03"]) {
      const cert = await db.certification.findUniqueOrThrow({ where: { code } });
      expect(cert).toMatchObject({ vendor: "AWS", active: false });
      expect(await db.question.count({ where: { certificationId: cert.id, status: { not: "draft" } } })).toBe(0);
    }
    expect((await db.certification.findUniqueOrThrow({ where: { code: "soa-c03" } })).title).toBe("AWS Certified CloudOps Engineer – Associate");
    await db.certification.update({ where: { code: "soa-c03" }, data: { active: true } });
    const aws = groupByVendor((await activeCatalog()).certifications).find((g) => g.vendor.key === "aws")!;
    expect(aws.certifications.find((c) => c.code === "soa-c03")?.title).toBe("AWS Certified CloudOps Engineer – Associate");
    await db.certification.update({ where: { code: "soa-c03" }, data: { active: false } });
  });

  it("SAP-C03: a 75-question exam of 180 minutes, scored all or nothing on 1000", async () => {
    const cert = await db.certification.findUniqueOrThrow({ where: { code: "sap-c03" } });
    await db.certification.update({ where: { id: cert.id }, data: { active: true } });
    await db.question.updateMany({ where: { certificationId: cert.id }, data: { status: "published" } });
    await grantFullAccess(db, userId, "sap-c03");
    const blueprint = await db.blueprint.findFirstOrThrow({ where: { certificationId: cert.id, current: true } });
    expect([blueprint.durationMin, blueprint.scoring]).toEqual([180, { multi: "all_or_nothing", dragdrop: "all_or_nothing" }]);

    const { attemptId, shortfall } = await createAttempt(db, { userId, certificationCode: "sap-c03", locale: "en", now: T0 });
    expect(shortfall).toBe(0);
    const started = await startAttempt(db, { attemptId, userId, now: T0 });
    expect(started.deadlineAt!.getTime() - T0.getTime()).toBe(180 * 60_000);
    const view = await getAttemptView(db, { attemptId, userId, now: T0 });
    expect([view.durationMin, view.totalQuestions, view.items.length]).toEqual([180, 75, 75]);
    expect(view.sectionKinds).toEqual(["main"]);
    expect(view.items.map((i) => i.order)).toEqual(Array.from({ length: 75 }, (_, k) => k + 1));
    for (const i of view.items) expect(i.question.maxPoints).toBe(1);

    // Every domain is represented as the blueprint weights it.
    const domains = await db.domain.findMany({ where: { blueprintId: blueprint.id } });
    const questions = new Map((await db.question.findMany({ where: { id: { in: view.items.map((i) => i.question.id) } }, include: { objective: true } })).map((q) => [q.id, q]));
    for (const d of domains) {
      const n = view.items.filter((i) => questions.get(i.question.id)!.objective.domainId === d.id).length;
      expect(n, d.code).toBeGreaterThanOrEqual(Math.floor(d.weightMin * 75) - 1);
      expect(n, d.code).toBeLessThanOrEqual(Math.ceil(d.weightMax * 75) + 1);
    }

    // The last question still saves; 74 right, one multi question half right.
    const keys = new Map([...questions.values()].map((q) => [q.id, q.answer as { optionId?: string; optionIds?: string[] }]));
    const half = view.items.find((i) => i.question.type === "multi")!;
    for (const item of view.items) {
      const key = keys.get(item.question.id)!;
      await saveItem(db, { attemptId, itemId: item.id, userId, response: item === half ? { optionIds: key.optionIds!.slice(0, 1) } : key, now: T0 });
    }
    // 179 minutes later, still in time.
    await submitAttempt(db, { attemptId, userId, now: new Date(T0.getTime() + 179 * 60_000) });

    const r = await getAttemptResults(db, { attemptId, userId });
    expect(r.status).toBe("submitted");
    expect([r.durationMin, r.maxScore, r.passScore]).toEqual([180, 1000, 720]);
    expect([r.earned, r.possible]).toEqual([74, 75]);
    expect(r.scaledScore).toBe(Math.round((1000 * 74) / 75));
    expect(r.items).toHaveLength(75);
    expect(r.domains.reduce((n, d) => n + d.possible, 0)).toBe(75);
  });
});
