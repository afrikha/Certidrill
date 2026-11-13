/**
 * Rights back-office (offers lot A3) on a real PostgreSQL: a Pass given by
 * hand unlocks mock exams and the full correction, extends the current one,
 * can be revoked; switches open and close the offers; every change is in the
 * audit log, written with the change itself.
 */
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { prisma as db } from "@/lib/db";
import { loadCertification } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";
import { seedBank, seedReferential } from "@/lib/content/seed";
import { createUser } from "@/lib/users";
import { assertCanTakeExam, getAccess } from "@/lib/access";
import { BillingAdminError, findUsers, grantPass, revokeEntitlement, setSwitch, userEntitlements } from "@/lib/access/admin";
import { recentAudit } from "@/lib/audit";
import { getOffers } from "@/lib/access/offers";
import { readSwitches, SWITCHES } from "@/lib/settings";
import { getAttemptResults } from "@/lib/exam/results";
import { publishSampleBank } from "./sample-bank";
import { playHalf } from "./access";

const T0 = new Date("2026-11-13T09:00:00Z");
const days = (n: number) => new Date(T0.getTime() + n * 86_400_000);
let adminId: string;
let certificationId: string;

beforeAll(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "attempt_item","attempt_section","attempt","entitlement","audit_log","question_report","question","case_study","question_series","objective","domain","blueprint","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
  );
  const content = await loadCertification(path.resolve(__dirname, "../../content/az-104"));
  await seedReferential(db, content);
  await seedBank(db, content, await loadBank(content));
  await publishSampleBank(db);
  certificationId = (await db.certification.findUniqueOrThrow({ where: { code: "az-104" } })).id;
  adminId = (await createUser(db, { email: "boss@example.com", role: "admin" })).id;
});
afterAll(async () => {
  // The other suites expect the switches as the migration leaves them: all off.
  for (const key of Object.values(SWITCHES)) await db.appSetting.upsert({ where: { key }, create: { key, value: false }, update: { value: false } });
  await db.$disconnect();
});

const newUser = async (email: string) => (await createUser(db, { email }, { actorId: adminId })).id;
const give = (userId: string, n: number, now = T0, source: "admin" | "extension" = "admin") =>
  grantPass(db, adminId, { userId, certificationCode: "az-104", days: n, source, reason: "goodwill" }, now);

describe("manual grant", () => {
  it("unlocks mock exams and the full correction once the free exam is used", async () => {
    const user = await newUser("granted@example.com");
    const attemptId = await playHalf(db, user);
    await expect(assertCanTakeExam(db, { userId: user, certificationId })).rejects.toMatchObject({ code: "quota_exhausted" });
    const before = await getAttemptResults(db, { attemptId, userId: user });
    expect(before.correction.level).toBe("free");
    expect(before.correction.locked.length).toBeGreaterThan(0);

    await give(user, 90, new Date());
    await expect(assertCanTakeExam(db, { userId: user, certificationId })).resolves.toBeUndefined();
    const after = await getAttemptResults(db, { attemptId, userId: user });
    expect(after.correction).toEqual({ level: "full", locked: [] });
    expect(after.items).toHaveLength(before.items.length + before.correction.locked.length);
    expect(await getAccess(db, user, certificationId)).toMatchObject({ level: "full", source: "pass", examsLeft: null });
  });

  it("extends the current Pass: the new one starts when it ends, extensions included", async () => {
    const user = await newUser("extend@example.com");
    const first = await give(user, 90);
    expect(first).toMatchObject({ startsAt: T0, expiresAt: days(90) });
    const second = await give(user, 30, days(10), "extension");
    expect(second).toMatchObject({ startsAt: days(90), expiresAt: days(120) });
    expect((await getAccess(db, user, certificationId, days(100))).expiresAt).toEqual(days(120));
    expect((await userEntitlements(db, user)).map((e) => e.source)).toEqual(["extension", "admin"]);
  });

  it("two grants at once chain one after the other instead of overlapping", async () => {
    const user = await newUser("race-grant@example.com");
    const both = await Promise.all([give(user, 90), give(user, 90)]);
    const windows = both.map((e) => [e.startsAt.getTime(), e.expiresAt.getTime()]).sort((a, b) => a[0]! - b[0]!);
    expect(windows).toEqual([[T0.getTime(), days(90).getTime()], [days(90).getTime(), days(180).getTime()]]);
  });

  it("refuses bad input, an unknown user or certification, and an inactive certification", async () => {
    const user = await newUser("bad-grant@example.com");
    const bad = (over: object) => grantPass(db, adminId, { userId: user, certificationCode: "az-104", days: 90, source: "admin", reason: "goodwill", ...over }, T0);
    for (const over of [{ days: 0 }, { days: 3651 }, { days: 1.5 }, { reason: "  " }, { reason: "x".repeat(501) }, { source: "purchase" }]) {
      await expect(bad(over), JSON.stringify(over)).rejects.toBeInstanceOf(ZodError);
    }
    await expect(bad({ certificationCode: "nope" })).rejects.toEqual(new BillingAdminError("not_found"));
    await expect(bad({ userId: "missing" })).rejects.toEqual(new BillingAdminError("not_found"));
    await db.certification.update({ where: { id: certificationId }, data: { active: false } });
    try {
      await expect(bad({})).rejects.toEqual(new BillingAdminError("inactive_certification"));
    } finally {
      await db.certification.update({ where: { id: certificationId }, data: { active: true } });
    }
    expect(await userEntitlements(db, user)).toEqual([]);
  });

  it("writes the grant to the audit log, with the actor, the dates and the reason", async () => {
    const user = await newUser("audited@example.com");
    const e = await give(user, 45);
    const [entry] = await recentAudit(db, { targetUserId: user, take: 1 });
    expect(entry).toMatchObject({
      action: "entitlement.grant",
      actor: { email: "boss@example.com" },
      target: { email: "audited@example.com" },
      details: { entitlementId: e.id, certification: "az-104", source: "admin", days: 45, startsAt: T0.toISOString(), expiresAt: days(45).toISOString(), reason: "goodwill" },
    });
  });
});

describe("revocation", () => {
  it("withdraws access at once; revoking twice changes nothing and is logged once", async () => {
    const user = await newUser("revoked@example.com");
    const e = await give(user, 90);
    expect(await revokeEntitlement(db, adminId, { entitlementId: e.id, reason: "refund" }, days(5))).toBe(true);
    expect((await getAccess(db, user, certificationId, days(6))).level).toBe("free");
    expect(await revokeEntitlement(db, adminId, { entitlementId: e.id, reason: "refund again" }, days(6))).toBe(false);
    expect(await revokeEntitlement(db, adminId, { entitlementId: "missing", reason: "refund" })).toBe(false);
    const log = await recentAudit(db, { targetUserId: user });
    expect(log.map((l) => l.action)).toEqual(["entitlement.revoke", "entitlement.grant", "user.create"]);
    expect(log[0]!.details).toMatchObject({ entitlementId: e.id, reason: "refund", certification: "az-104" });
    await expect(revokeEntitlement(db, adminId, { entitlementId: e.id, reason: "" })).rejects.toBeInstanceOf(ZodError);
  });

  it("a revoked Pass does not delay the next grant", async () => {
    const user = await newUser("regrant@example.com");
    const e = await give(user, 90);
    await revokeEntitlement(db, adminId, { entitlementId: e.id, reason: "mistake" }, T0);
    expect(await give(user, 90, days(1))).toMatchObject({ startsAt: days(1), expiresAt: days(91) });
  });
});

describe("switches", () => {
  it("open and close an offer without deployment, logging each real change", async () => {
    await db.auditLog.deleteMany({ where: { action: "setting.update" } });
    expect((await readSwitches(db)).allAccess).toBe(false);
    expect((await getOffers(db)).map((o) => o.kind)).not.toContain("subscription");
    // Turning off what is already off (or absent) records nothing.
    expect(await setSwitch(db, adminId, "allAccess", false)).toBe(false);
    expect(await setSwitch(db, adminId, "allAccess", true)).toBe(true);
    expect(await setSwitch(db, adminId, "allAccess", true)).toBe(false);
    expect((await getOffers(db)).map((o) => o.kind)).toContain("subscription");
    expect(await setSwitch(db, adminId, "allAccess", false)).toBe(true);
    expect(await db.appSetting.findUnique({ where: { key: SWITCHES.allAccess } })).toMatchObject({ value: false });
    const log = (await recentAudit(db)).filter((l) => l.action === "setting.update");
    expect(log.map((l) => l.details)).toEqual([
      { key: "offer.all_access.enabled", from: true, to: false },
      { key: "offer.all_access.enabled", from: false, to: true },
    ]);
    expect(log[0]).toMatchObject({ actor: { email: "boss@example.com" }, target: null });
  });
});

describe("users and audit", () => {
  it("finds users by part of their e-mail, case ignored", async () => {
    expect((await findUsers(db, "  GRANTED@ ")).map((u) => u.email)).toEqual(["granted@example.com"]);
    expect(await findUsers(db, "   ")).toEqual([]);
    expect((await findUsers(db, "example.com")).length).toBeGreaterThan(5);
  });

  it("logs account creation, from the back-office or the command line", async () => {
    const cli = await createUser(db, { email: "cli@example.com" });
    const [entry] = await recentAudit(db, { targetUserId: cli.id });
    expect(entry).toMatchObject({ action: "user.create", actor: null, target: { email: "cli@example.com" }, details: { role: "user" } });
  });

  it("keeps the entries when a user is deleted, without the address", async () => {
    const user = await newUser("gone@example.com");
    const e = await give(user, 10);
    await revokeEntitlement(db, adminId, { entitlementId: e.id, reason: "refund" });
    const ids = (await recentAudit(db, { targetUserId: user })).map((l) => l.id);
    expect(ids).toHaveLength(3);
    await db.user.delete({ where: { id: user } });
    const entries = await db.auditLog.findMany({ where: { id: { in: ids } } });
    expect(entries.map((l) => [l.action, l.targetUserId]).sort()).toEqual([["entitlement.grant", null], ["entitlement.revoke", null], ["user.create", null]]);
    // GDPR: deleting the account erases its address from the log too.
    expect(JSON.stringify(entries)).not.toContain("gone@example.com");
  });
});
