/**
 * Back-office insights (lib/activity/insights.ts): exams and course by
 * certification, the sign-up funnel and the retention, against a real database.
 */
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadCertification } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";
import { loadCourse } from "@/lib/content/course";
import { seedBank, seedCourse, seedReferential } from "@/lib/content/seed";
import { createUser } from "@/lib/users";
import { recordLogin } from "@/lib/activity/logins";
import { siteInsights } from "@/lib/activity/insights";

const db = new PrismaClient();
const DAY = 86_400_000;
const NOW = new Date();
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

beforeAll(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "login_event","course_progress","course_section","course_chapter","course_module","exam_outcome","email_outbox","entitlement","payment","billing_customer","audit_log","attempt_item","attempt_section","attempt","question_report","question","case_study","question_series","objective","domain","blueprint","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
  );
  const content = await loadCertification(path.resolve(__dirname, "../../content/az-104"));
  await seedReferential(db, content);
  await seedBank(db, content, await loadBank(content));
  await seedCourse(db, content, await loadCourse(content));
});
afterAll(() => db.$disconnect());

describe("site insights", () => {
  it("counts exams and course by certification, the funnel and the retention, without the administrators", async () => {
    const certification = await db.certification.findUniqueOrThrow({ where: { code: "az-104" } });
    const blueprint = await db.blueprint.findFirstOrThrow({ where: { certificationId: certification.id } });
    const chapters = await db.courseChapter.findMany({ where: { certificationId: certification.id }, orderBy: { order: "asc" }, include: { sections: { orderBy: { order: "asc" } } } });
    const [first, second] = chapters;
    expect(second!.sections.length).toBeGreaterThan(1);

    const user = async (email: string, createdAt: Date, role: "user" | "admin" = "user") => {
      const id = (await createUser(db, { email, role })).id;
      await db.user.update({ where: { id }, data: { createdAt } });
      return id;
    };
    // Erin signed up 40 days ago and came back 35 days later; Fred 10 days ago, active 2 days later only;
    // Gina 2 days ago, address not verified; an administrator's activity is left out.
    const erin = await user("erin-insights@example.com", ago(40));
    const fred = await user("fred-insights@example.com", ago(10));
    const gina = await user("gina-insights@example.com", ago(2));
    const admin = await user("admin-insights@example.com", ago(20), "admin");
    await db.user.update({ where: { id: gina }, data: { emailVerified: null } });
    await recordLogin(db, { userId: erin, kind: "password", ip: "192.0.2.1" }, ago(5));
    await recordLogin(db, { userId: fred, kind: "password", ip: "192.0.2.2" }, ago(8));
    // A refused try is no activity.
    await recordLogin(db, { userId: fred, kind: "failed", ip: "192.0.2.2" }, ago(1));

    const attempt = (userId: string, data: Partial<{ mode: "exam" | "practice"; status: "in_progress" | "submitted" | "expired"; scaledScore: number; passed: boolean }>) =>
      db.attempt.create({ data: { userId, certificationId: certification.id, blueprintId: blueprint.id, locale: "en", seed: crypto.randomUUID(), createdAt: ago(8), ...data } });
    await attempt(fred, { status: "submitted", scaledScore: 800, passed: true });
    await attempt(fred, { status: "expired", scaledScore: 600, passed: false });
    await attempt(fred, { mode: "practice" });
    await attempt(admin, { status: "submitted", scaledScore: 1000, passed: true });

    // Fred reads all of the first chapter, Erin one section of it, Gina one of the second.
    const read = (userId: string, sectionId: string, readAt: Date) => db.courseProgress.create({ data: { userId, sectionId, readAt } });
    for (const s of first!.sections) await read(fred, s.id, ago(8));
    await read(erin, first!.sections[0]!.id, ago(5));
    await read(gina, second!.sections[0]!.id, ago(1));
    await read(admin, second!.sections[0]!.id, ago(1));

    // Fred bought a Pass.
    const plan = await db.plan.findUniqueOrThrow({ where: { code: "pass_90" } });
    const customer = await db.billingCustomer.create({ data: { userId: fred, stripeCustomerId: "cus_insights" } });
    const payment = await db.payment.create({
      data: { billingCustomerId: customer.id, planId: plan.id, certificationId: certification.id, checkoutId: "co-insights", amountCents: 1900, currency: "EUR", status: "paid", paidAt: ago(7) },
    });
    await db.entitlement.create({ data: { userId: fred, certificationId: certification.id, source: "purchase", startsAt: ago(7), expiresAt: new Date(NOW.getTime() + 83 * DAY), paymentId: payment.id } });

    const insights = await siteInsights(db, NOW, 30, 90);
    const az = insights.certifications.find((c) => c.code === "az-104")!;
    expect(az).toMatchObject({ examsStarted: 2, examsFinished: 2, practiceStarted: 1, averageScore: 700, passRate: 0.5, courseReaders: 3, chapters: chapters.length });
    // Fred completed one chapter; Erin and Gina none.
    expect(az.chaptersCompletedAvg).toBeCloseTo(1 / 3);
    expect(az.topChapters[0]).toMatchObject({ code: first!.code, readers: 2 });
    expect(az.bottomChapters.every((c) => c.readers === 0)).toBe(true);

    // Erin signed up 40 days ago: outside the 30-day funnel.
    expect(insights.funnel).toEqual({ signups: 2, verified: 1, firstExam: 1, purchased: 1 });
    // Erin and Fred are 7 days old or more, Erin only 30; only Erin came back.
    expect(insights.retention).toEqual({ day7: { cohort: 2, returned: 1 }, day30: { cohort: 1, returned: 1 } });
  });

  it("gives empty figures without activity", async () => {
    const insights = await siteInsights(db, new Date(NOW.getTime() - 400 * DAY), 30, 90);
    const az = insights.certifications.find((c) => c.code === "az-104")!;
    expect(az).toMatchObject({ examsStarted: 0, averageScore: null, passRate: null });
    expect(insights.funnel).toEqual({ signups: 0, verified: 0, firstExam: 0, purchased: 0 });
    expect(insights.retention).toEqual({ day7: { cohort: 0, returned: 0 }, day30: { cohort: 0, returned: 0 } });
  });
});
