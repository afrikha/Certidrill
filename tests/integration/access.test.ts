/**
 * Access to mock exams (specs des offres §3) on a real PostgreSQL: free quota,
 * Pass rights, administrators, free certifications, and the 402 answers of
 * the API. Only the Auth.js session of the API calls is replaced by a stub.
 */
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma as db } from "@/lib/db";
import { loadCertification } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";
import { seedBank, seedReferential } from "@/lib/content/seed";
import { createUser } from "@/lib/users";
import { AccessError, assertCanTakeExam, getAccess, getAccessSummary } from "@/lib/access";
import { createAttempt, getAttemptView, saveItem, startAttempt, submitAttempt } from "@/lib/exam/session";
import { anyResponse, publishSampleBank } from "./sample-bank";

const session = vi.hoisted(() => ({ current: null as null | { user: { id: string; role: string; locale: string } } }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => session.current) }));

import * as attempts from "@/app/api/attempts/route";
import * as me from "@/app/api/me/access/route";

const T0 = new Date("2026-11-13T09:00:00Z");
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);
const DAY = 24 * 60;
let certificationId: string;

beforeAll(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "attempt_item","attempt_section","attempt","entitlement","question_report","question","case_study","question_series","objective","domain","blueprint","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
  );
  const content = await loadCertification(path.resolve(__dirname, "../../content/az-104"));
  await seedReferential(db, content);
  await seedBank(db, content, await loadBank(content));
  await publishSampleBank(db);
  certificationId = (await db.certification.findUniqueOrThrow({ where: { code: "az-104" } })).id;
});
afterAll(() => db.$disconnect());

const newUser = async (email: string, role: "user" | "admin" = "user") => (await createUser(db, { email, role })).id;

/** Creates, starts and submits a mock exam at `start`. */
async function takeExam(userId: string, start: Date) {
  const { attemptId } = await createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: start });
  await startAttempt(db, { attemptId, userId, now: start });
  await submitAttempt(db, { attemptId, userId, now: new Date(start.getTime() + 60_000) });
  return attemptId;
}

const grant = (userId: string, fromMinutes: number, toMinutes: number) =>
  db.entitlement.create({ data: { userId, certificationId, source: "admin", startsAt: at(fromMinutes), expiresAt: at(toMinutes) } });

const refusal = (p: Promise<unknown>) => p.then(() => null, (err: unknown) => (err instanceof AccessError ? err.code : err));

describe("free quota", () => {
  it("allows one full mock exam per certification, counted when its clock starts", async () => {
    const user = await newUser("free@example.com");
    expect(await getAccess(db, user, certificationId, at(0))).toMatchObject({ level: "free", source: "none", started: 0, examsLeft: 1 });

    // Created but never started: the quota is untouched, and the same attempt comes back.
    const { attemptId } = await createAttempt(db, { userId: user, certificationCode: "az-104", locale: "en", now: at(0) });
    expect(await getAccess(db, user, certificationId, at(1))).toMatchObject({ started: 0, examsLeft: 1 });
    expect((await createAttempt(db, { userId: user, certificationCode: "az-104", locale: "en", now: at(1) })).attemptId).toBe(attemptId);

    await startAttempt(db, { attemptId, userId: user, now: at(2) });
    expect(await getAccess(db, user, certificationId, at(3))).toMatchObject({ started: 1, examsLeft: 0 });
    // The started exam can be used and finished normally.
    const view = await getAttemptView(db, { attemptId, userId: user, now: at(3) });
    const first = view.items[0]!;
    await saveItem(db, { attemptId, itemId: first.id, userId: user, response: anyResponse(first), now: at(3) });
    await submitAttempt(db, { attemptId, userId: user, now: at(4) });

    // A second one is refused.
    expect(await refusal(createAttempt(db, { userId: user, certificationCode: "az-104", locale: "en", now: at(5) }))).toBe("quota_exhausted");
  });

  it("counts an abandoned exam", async () => {
    const user = await newUser("quitter@example.com");
    const { attemptId } = await createAttempt(db, { userId: user, certificationCode: "az-104", locale: "en", now: at(0) });
    await startAttempt(db, { attemptId, userId: user, now: at(0) });
    // Never submitted: it expires when the next exam is asked for, and still counts.
    expect(await refusal(createAttempt(db, { userId: user, certificationCode: "az-104", locale: "en", now: at(3 * DAY) }))).toBe("quota_exhausted");
  });

  it("follows the free plan: no free exam when it is inactive", async () => {
    const user = await newUser("closed@example.com");
    await db.plan.update({ where: { code: "free" }, data: { active: false } });
    try {
      expect(await refusal(assertCanTakeExam(db, { userId: user, certificationId, now: at(0) }))).toBe("quota_exhausted");
      await db.plan.update({ where: { code: "free" }, data: { active: true, examQuota: 2 } });
      expect((await getAccess(db, user, certificationId, at(0))).examsLeft).toBe(2);
      await db.plan.update({ where: { code: "free" }, data: { examQuota: null } });
      expect((await getAccess(db, user, certificationId, at(0))).examsLeft).toBeNull();
    } finally {
      await db.plan.update({ where: { code: "free" }, data: { active: true, examQuota: 1 } });
    }
  });
});

describe("full access", () => {
  it("a Pass gives unlimited exams until its end, then the refusal says it expired", async () => {
    const user = await newUser("pass@example.com");
    await grant(user, 0, 90 * DAY);
    expect(await getAccess(db, user, certificationId, at(1))).toMatchObject({ level: "full", source: "pass", expiresAt: at(90 * DAY), examsLeft: null });
    await takeExam(user, at(1));
    await takeExam(user, at(100));
    expect((await getAccess(db, user, certificationId, at(200))).started).toBe(2);
    // After the end: back to the free level, quota already used.
    expect(await refusal(createAttempt(db, { userId: user, certificationCode: "az-104", locale: "en", now: at(91 * DAY) }))).toBe("pass_expired");
  });

  it("an exam started with a Pass can be finished after the Pass ends", async () => {
    const user = await newUser("late@example.com");
    const right = await grant(user, 0, 60);
    await takeExam(user, at(1));
    const { attemptId } = await createAttempt(db, { userId: user, certificationCode: "az-104", locale: "en", now: at(10) });
    await startAttempt(db, { attemptId, userId: user, now: at(10) });
    await db.entitlement.update({ where: { id: right.id }, data: { revokedAt: at(20) } });
    expect((await submitAttempt(db, { attemptId, userId: user, now: at(70) })).status).toBe("submitted");
  });

  it("checks again when the clock starts: an exam created with a right that ended meanwhile is refused", async () => {
    const user = await newUser("waited@example.com");
    const right = await grant(user, 0, 60);
    await takeExam(user, at(1));
    const { attemptId } = await createAttempt(db, { userId: user, certificationCode: "az-104", locale: "en", now: at(10) });
    await db.entitlement.update({ where: { id: right.id }, data: { revokedAt: at(20) } });
    // Refunded (revoked), not expired: the reason is the quota.
    expect(await refusal(startAttempt(db, { attemptId, userId: user, now: at(30) }))).toBe("quota_exhausted");
  });

  it("administrators and free certifications are never limited", async () => {
    const admin = await newUser("boss@example.com", "admin");
    await takeExam(admin, at(1));
    await takeExam(admin, at(100));
    expect(await getAccess(db, admin, certificationId, at(200))).toMatchObject({ level: "full", source: "admin", examsLeft: null });

    const user = await newUser("az900@example.com");
    await db.certification.update({ where: { id: certificationId }, data: { freeAccess: true } });
    try {
      await takeExam(user, at(1));
      await takeExam(user, at(100));
      expect(await getAccess(db, user, certificationId, at(200))).toMatchObject({ level: "full", source: "free_certification" });
    } finally {
      await db.certification.update({ where: { id: certificationId }, data: { freeAccess: false } });
    }
  });
});

describe("API", () => {
  const ORIGIN = "http://localhost:3000";
  const as = (id: string) => (session.current = { user: { id, role: "user", locale: "en" } });
  const ctx = { params: Promise.resolve({}) };

  it("answers 402 with the reason when the quota is used up, and reports the access", async () => {
    const user = await newUser("api-free@example.com");
    as(user);
    const summary = await (await me.GET(new Request(`${ORIGIN}/api/me/access`), ctx)).json();
    expect(summary).toEqual({ certifications: [{ certification: "az-104", title: expect.any(String), level: "free", source: "none", expiresAt: null, started: 0, examsLeft: 1 }] });

    await takeExam(user, new Date());
    const post = () => attempts.POST(new Request(`${ORIGIN}/api/attempts`, { method: "POST", headers: { origin: ORIGIN, "content-type": "application/json" }, body: JSON.stringify({ certification: "az-104", locale: "en" }) }), ctx);
    const res = await post();
    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({ error: "quota_exhausted" });
    expect((await getAccessSummary(db, user))[0]).toMatchObject({ started: 1, examsLeft: 0 });
  });
});
