/**
 * Activity follow-up: sign-ins kept one year (login_event), a user's timeline
 * and the site overview, against a real database.
 */
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadCertification } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";
import { loadCourse } from "@/lib/content/course";
import { seedBank, seedCourse, seedReferential } from "@/lib/content/seed";
import { createUser } from "@/lib/users";
import { audit } from "@/lib/audit";
import { LOGIN_RETENTION_DAYS, loggedIp, purgeLogins, recordLogin, recordLoginByEmail } from "@/lib/activity/logins";
import { userActivity } from "@/lib/activity/timeline";
import { siteActivity } from "@/lib/activity/overview";
import { publishSampleBank } from "./sample-bank";
import { grantFullAccess, playHalf } from "./access";

const db = new PrismaClient();
const DAY = 86_400_000;
// The real time: some rows (accounts, exams) take the database's clock.
const NOW = new Date();
const dayString = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * DAY).toISOString().slice(0, 10);
let alice: string;
let bob: string;

beforeAll(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "login_event","course_progress","course_section","course_chapter","course_module","exam_outcome","email_outbox","entitlement","payment","billing_customer","audit_log","attempt_item","attempt_section","attempt","question_report","question","case_study","question_series","objective","domain","blueprint","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
  );
  const content = await loadCertification(path.resolve(__dirname, "../../content/az-104"));
  await seedReferential(db, content);
  await seedBank(db, content, await loadBank(content));
  await publishSampleBank(db);
  await seedCourse(db, content, await loadCourse(content));
  alice = (await createUser(db, { email: "alice-activity@example.com" })).id;
  bob = (await createUser(db, { email: "bob-activity@example.com" })).id;
});
afterAll(() => db.$disconnect());

describe("sign-ins (login_event)", () => {
  it("records an event of an existing account, finds an account by its e-mail, ignores an unknown one, and never throws", async () => {
    await recordLogin(db, { userId: alice, kind: "password", ip: "203.0.113.7" }, new Date(NOW.getTime() - 2 * DAY));
    await recordLoginByEmail(db, { email: "alice-activity@example.com", kind: "failed", ip: "2001:db8::1" }, new Date(NOW.getTime() - DAY));
    await recordLoginByEmail(db, { email: "nobody-activity@example.com", kind: "failed", ip: "198.51.100.1" });
    // A deleted account (or a database error) loses the event, not the sign-in.
    await expect(recordLogin(db, { userId: "no-such-user", kind: "password", ip: "1.1.1.1" })).resolves.toBeUndefined();
    const logins = await db.loginEvent.findMany({ where: { userId: alice }, orderBy: { createdAt: "desc" } });
    expect(logins.map((l) => [l.kind, l.ip])).toEqual([
      ["failed", "2001:db8::1"],
      ["password", "203.0.113.7"],
    ]);
    expect(await db.loginEvent.count({ where: { ip: "198.51.100.1" } })).toBe(0);
  });

  it("keeps an address only when it is an IPv4 or IPv6 address", () => {
    expect(loggedIp(" 203.0.113.7 ")).toBe("203.0.113.7");
    expect(loggedIp("2001:db8::1")).toBe("2001:db8::1");
    for (const bad of ["unknown", "", "203.0.113.7, 10.0.0.1", "<script>", "x".repeat(200)]) expect(loggedIp(bad)).toBe("unknown");
  });

  it("deletes the events older than a year, keeps the others", async () => {
    const old = await db.loginEvent.create({ data: { userId: bob, kind: "password", ip: "192.0.2.1", createdAt: new Date(NOW.getTime() - (LOGIN_RETENTION_DAYS + 1) * DAY) } });
    const kept = await db.loginEvent.create({ data: { userId: bob, kind: "password", ip: "192.0.2.2", createdAt: new Date(NOW.getTime() - (LOGIN_RETENTION_DAYS - 1) * DAY) } });
    expect(await purgeLogins(db, NOW)).toBe(1);
    expect(await db.loginEvent.findUnique({ where: { id: old.id } })).toBeNull();
    expect(await db.loginEvent.findUnique({ where: { id: kept.id } })).not.toBeNull();
    await db.loginEvent.delete({ where: { id: kept.id } });
  });

  it("goes with the account when it is deleted", async () => {
    const carl = (await createUser(db, { email: "carl-activity@example.com" })).id;
    await recordLogin(db, { userId: carl, kind: "magic_link", ip: "192.0.2.9" });
    await db.user.delete({ where: { id: carl } });
    expect(await db.loginEvent.count({ where: { userId: carl } })).toBe(0);
  });
});

describe("a user's timeline", () => {
  it("merges the account, sign-ins, exams, course reading, reports, outcomes, Passes and administrators' actions, newest first", async () => {
    await grantFullAccess(db, alice);
    await playHalf(db, alice, new Date(NOW.getTime() - 3 * DAY));
    // Two sections of one chapter the same day: one line.
    const sections = await db.courseSection.findMany({ where: { chapter: { code: "12-rbac" } }, orderBy: { order: "asc" }, take: 2 });
    for (const [i, s] of sections.entries()) await db.courseProgress.create({ data: { userId: alice, sectionId: s.id, readAt: new Date(NOW.getTime() - 4 * DAY + i * 60_000) } });
    const question = await db.question.findFirstOrThrow();
    await db.questionReport.create({ data: { userId: alice, questionId: question.id, reason: "typo", createdAt: new Date(NOW.getTime() - 5 * DAY) } });
    const certification = await db.certification.findUniqueOrThrow({ where: { code: "az-104" } });
    await db.examOutcome.create({ data: { userId: alice, certificationId: certification.id, takenOn: new Date("2026-11-10"), passed: true, score: 812, createdAt: new Date(NOW.getTime() - 6 * DAY) } });
    const admin = (await createUser(db, { email: "admin-activity@example.com", role: "admin" })).id;
    await db.entitlement.updateMany({ where: { userId: alice }, data: { revokedAt: new Date(NOW.getTime() - 7 * DAY) } });
    await audit(db, { actorId: admin, action: "entitlement.revoke", targetUserId: alice, details: { reason: "test" } });

    const events = (await userActivity(db, alice))!;
    const kinds = events.map((e) => e.kind);
    for (const kind of ["account_created", "login", "exam_started", "exam_finished", "course_read", "report", "outcome", "pass_granted", "pass_revoked", "admin"]) {
      expect(kinds).toContain(kind);
    }
    expect(events.map((e) => e.at.getTime())).toEqual([...events.map((e) => e.at.getTime())].sort((a, b) => b - a));
    expect(events.find((e) => e.kind === "course_read")).toMatchObject({ certification: "az-104", sections: 2 });
    expect(events.find((e) => e.kind === "exam_finished")).toMatchObject({ certification: "az-104", mode: "exam", status: "submitted" });
    expect(events.find((e) => e.kind === "admin")).toMatchObject({ action: "entitlement.revoke", actor: "admin-activity@example.com" });
    expect(events.find((e) => e.kind === "outcome")).toMatchObject({ passed: true, score: 812 });
    // Another user's timeline holds none of Alice's events.
    const bobs = (await userActivity(db, bob))!.map((e) => e.kind);
    for (const kind of ["exam_started", "course_read", "report", "outcome", "pass_granted"]) expect(bobs).not.toContain(kind);
    expect(await userActivity(db, "no-such-user")).toBeNull();
    // At most `take` events.
    expect(await userActivity(db, alice, 3)).toHaveLength(3);
  });
});

describe("site overview", () => {
  it("counts sign-ups, distinct active users, exams and Passes sold by UTC day", async () => {
    const day = (n: number) => new Date(NOW.getTime() - n * DAY);
    const dan = (await createUser(db, { email: "dan-activity@example.com" })).id;
    await db.user.update({ where: { id: dan }, data: { createdAt: day(1) } });
    // Dan is active yesterday twice (one user), Bob ten days ago; a failed try is no activity.
    await recordLogin(db, { userId: dan, kind: "password", ip: "192.0.2.10" }, day(1));
    await recordLogin(db, { userId: dan, kind: "magic_link", ip: "192.0.2.10" }, day(1));
    await recordLogin(db, { userId: bob, kind: "password", ip: "192.0.2.11" }, day(10));
    await recordLogin(db, { userId: bob, kind: "failed", ip: "192.0.2.11" }, day(2));
    const plan = await db.plan.findUniqueOrThrow({ where: { code: "pass_90" } });
    const certification = await db.certification.findUniqueOrThrow({ where: { code: "az-104" } });
    const customer = await db.billingCustomer.create({ data: { userId: dan, stripeCustomerId: "cus_activity" } });
    const paid = { billingCustomerId: customer.id, planId: plan.id, certificationId: certification.id, amountCents: 1900, currency: "EUR", status: "paid" as const };
    await db.payment.create({ data: { ...paid, checkoutId: "co-1", paidAt: day(1) } });
    await db.payment.create({ data: { ...paid, checkoutId: "co-2", paidAt: day(1) } });
    await db.payment.create({ data: { ...paid, checkoutId: "co-3", status: "pending" } });
    // An attempt left to expire is never handed in: it ends at its deadline.
    const blueprint = await db.blueprint.findFirstOrThrow({ where: { certificationId: certification.id } });
    await db.attempt.create({
      data: { userId: dan, certificationId: certification.id, blueprintId: blueprint.id, locale: "en", seed: "expired", status: "expired", createdAt: day(1), deadlineAt: new Date(day(1).getTime() + 60_000) },
    });

    const activity = await siteActivity(db, NOW, 30);
    expect(activity.days).toHaveLength(30);
    expect(activity.days.at(-1)!.day).toBe(dayString(0));
    const yesterday = activity.days.find((d) => d.day === dayString(1))!;
    expect(yesterday).toMatchObject({ signups: 1, activeUsers: 1, passesSold: 2 });
    // Bob's failed try two days ago counts for nobody: only Alice's sign-in that day.
    expect(activity.days.find((d) => d.day === dayString(2))).toMatchObject({ activeUsers: 1 });
    expect(activity.days.find((d) => d.day === dayString(9))).toMatchObject({ activeUsers: 0 });
    expect(activity.days.find((d) => d.day === dayString(10))).toMatchObject({ activeUsers: 1 });
    // Alice (exam, course, sign-ins of the earlier tests) and Dan this week; Bob only over the month.
    expect(activity.activeWeek).toBe(2);
    expect(activity.activeTotal).toBe(3);
    // Alice's handed-in exam and Dan's expired one.
    expect(activity.days.reduce((n, d) => n + d.examsStarted, 0)).toBe(2);
    expect(activity.days.reduce((n, d) => n + d.examsFinished, 0)).toBe(2);
    expect(activity.revenue).toEqual([{ currency: "eur", cents: 3800, passes: 2 }]);
  });
});
