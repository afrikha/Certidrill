/**
 * Public sign-up and e-mail verification (offers lot A3) on a real
 * PostgreSQL: the account only exists once the link is followed and the
 * password chosen at sign-up given again; an unverified address cannot start
 * an exam.
 */
import path from "node:path";
import { createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma as db } from "@/lib/db";
import { loadCertification } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";
import { seedBank, seedReferential } from "@/lib/content/seed";
import { confirmSignup, peekSignup, signUp, type Mailer } from "@/lib/auth/signup";
import { authorizeCredentials } from "@/lib/auth/callbacks";
import * as passwords from "@/lib/auth/password";
import { verifyPassword } from "@/lib/auth/password";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { createUser } from "@/lib/users";
import { AccessError } from "@/lib/access";
import { createAttempt, startAttempt } from "@/lib/exam/session";
import { SWITCHES } from "@/lib/settings";
import { EMAIL_VERIFY_HOURS } from "@/lib/auth/email";
import { publishSampleBank } from "./sample-bank";
import { grantFullAccess } from "./access";

const session = vi.hoisted(() => ({ current: null as null | { user: { id: string; role: string; locale: string } } }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => session.current) }));

import * as attempts from "@/app/api/attempts/route";

const BASE = "https://certidrill.test";
const PASSWORD = "a long enough password";
const T0 = new Date("2026-11-13T09:00:00Z");
const hours = (h: number) => new Date(T0.getTime() + h * 3_600_000);

let mailer: { verification: ReturnType<typeof vi.fn>; exists: ReturnType<typeof vi.fn> };
const limiter = () => createRateLimiter({ limit: 100, windowMs: 60_000 });
const signup = (email: string, opts: { password?: string; locale?: string; now?: Date; ip?: string } = {}) =>
  signUp(db, limiter(), { email, password: opts.password ?? PASSWORD, locale: opts.locale ?? "fr" }, { ip: opts.ip ?? "1.1.1.1", mailer: mailer as unknown as Mailer, base: BASE, now: opts.now ?? T0 });
/** The token of the n-th verification e-mail sent. */
const tokenOf = (n = 0) => new URL(mailer.verification.mock.calls[n]![0].url as string).searchParams.get("token")!;
const setSignup = (open: boolean) => db.appSetting.upsert({ where: { key: SWITCHES.signupOpen }, create: { key: SWITCHES.signupOpen, value: open }, update: { value: open } });

beforeAll(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "attempt_item","attempt_section","attempt","entitlement","signup_request","audit_log","question_report","question","case_study","question_series","objective","domain","blueprint","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
  );
  const content = await loadCertification(path.resolve(__dirname, "../../content/az-104"));
  await seedReferential(db, content);
  await seedBank(db, content, await loadBank(content));
  await publishSampleBank(db);
});
afterAll(async () => {
  await setSignup(false);
  await db.$disconnect();
});
beforeEach(async () => {
  mailer = { verification: vi.fn(async () => {}), exists: vi.fn(async () => {}) };
  await setSignup(true);
});

describe("sign-up", () => {
  it("is refused while the switch signup.open is off (or missing)", async () => {
    await setSignup(false);
    expect(await signup("closed@example.com")).toBe("closed");
    await db.appSetting.delete({ where: { key: SWITCHES.signupOpen } });
    expect(await signup("closed@example.com")).toBe("closed");
    expect(mailer.verification).not.toHaveBeenCalled();
    expect(await db.signupRequest.count({ where: { email: "closed@example.com" } })).toBe(0);
  });

  it("refuses an invalid address, a short password or an unknown language", async () => {
    expect(await signup("not-an-email")).toBe("invalid");
    expect(await signup("short@example.com", { password: "too short" })).toBe("invalid");
    expect(await signup("lang@example.com", { locale: "de" })).toBe("invalid");
    expect(await signup(`${"a".repeat(250)}@example.com`)).toBe("invalid");
  });

  it("creates no account before the link is followed, and stores neither the password nor the token in clear", async () => {
    expect(await signup("  New@Example.com ")).toBe("sent");
    expect(await db.user.findUnique({ where: { email: "new@example.com" } })).toBeNull();
    const [request] = await db.signupRequest.findMany({ where: { email: "new@example.com" } });
    const call = mailer.verification.mock.calls[0]![0];
    expect(call).toMatchObject({ to: "new@example.com", locale: "fr" });
    expect(call.url).toMatch(/^https:\/\/certidrill\.test\/verify-email\?token=[\w-]{43}$/);
    expect(request!.tokenHash).toBe(createHash("sha256").update(tokenOf()).digest("hex"));
    expect(request!.tokenHash).not.toContain(tokenOf());
    expect(request!.passwordHash).not.toContain(PASSWORD);
    expect(await verifyPassword(request!.passwordHash, PASSWORD)).toBe(true);
    expect(request!.expiresAt).toEqual(hours(EMAIL_VERIFY_HOURS));
  });

  it("answers the same for an existing address, and tells its owner instead of sending a link", async () => {
    await createUser(db, { email: "known@example.com", locale: "en" });
    expect(await signup("known@example.com")).toBe("sent");
    expect(mailer.verification).not.toHaveBeenCalled();
    expect(mailer.exists).toHaveBeenCalledWith({ to: "known@example.com", url: `${BASE}/login`, locale: "en" });
    expect(await db.signupRequest.count({ where: { email: "known@example.com" } })).toBe(0);
  });

  it("is rate limited per IP and per address", async () => {
    const tight = createRateLimiter({ limit: 2, windowMs: 60_000 });
    const run = (email: string, ip: string) => signUp(db, tight, { email, password: PASSWORD, locale: "en" }, { ip, mailer: mailer as unknown as Mailer, base: BASE, now: T0 });
    expect(await run("rl1@example.com", "9.9.9.9")).toBe("sent");
    expect(await run("rl2@example.com", "9.9.9.9")).toBe("sent");
    expect(await run("rl3@example.com", "9.9.9.9")).toBe("rate_limited");
    expect(await run("rl1@example.com", "8.8.8.8")).toBe("sent");
    expect(await run("rl1@example.com", "7.7.7.7")).toBe("rate_limited");
  });

  it("removes expired requests as new sign-ups come", async () => {
    await signup("stale@example.com");
    await signup("other@example.com", { now: hours(EMAIL_VERIFY_HOURS + 1) });
    expect(await db.signupRequest.count({ where: { email: "stale@example.com" } })).toBe(0);
  });

  it("needs AUTH_URL to build the link", async () => {
    await expect(signUp(db, limiter(), { email: "nourl@example.com", password: PASSWORD, locale: "en" }, { ip: "1.1.1.1", mailer: mailer as unknown as Mailer, base: "", now: T0 })).rejects.toThrow("AUTH_URL");
  });
});

describe("following the link", () => {
  const confirm = (token: string, password = PASSWORD, now = hours(1), lim = limiter()) => confirmSignup(db, lim, { token, password }, now);

  it("opening the link changes nothing; the account is created with the password given again, its address verified", async () => {
    await signup("alice@example.com", { password: "alice's own password", locale: "en" });
    const token = tokenOf();
    expect(await peekSignup(db, token, hours(1))).toEqual({ status: "valid", email: "alice@example.com" });
    expect(await peekSignup(db, token, hours(1))).toEqual({ status: "valid", email: "alice@example.com" });
    expect(await db.user.findUnique({ where: { email: "alice@example.com" } })).toBeNull();

    expect(await confirm(token, "alice's own password")).toEqual({ status: "verified", email: "alice@example.com" });
    const user = await db.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
    expect(user).toMatchObject({ role: "user", locale: "en", emailVerified: hours(1) });
    const request = new Request("http://localhost/api/auth/callback/credentials");
    expect(await authorizeCredentials(db, limiter(), { email: "alice@example.com", password: "alice's own password" }, request)).toMatchObject({ id: user.id });
    // Used: the link no longer works.
    expect(await confirm(token, "alice's own password")).toEqual({ status: "invalid" });
    expect(await peekSignup(db, token)).toEqual({ status: "invalid" });
    expect(await db.signupRequest.count({ where: { email: "alice@example.com" } })).toBe(0);
  });

  it("a wrong password keeps the link, and is limited to 5 tries", async () => {
    await signup("typo@example.com");
    const lim = createRateLimiter({ limit: 5, windowMs: 60_000 });
    for (let i = 0; i < 5; i++) expect(await confirm(tokenOf(), "not the password", hours(1), lim)).toEqual({ status: "wrong_password" });
    // Blocked, even with the right password, until the window ends.
    expect(await confirm(tokenOf(), PASSWORD, hours(1), lim)).toEqual({ status: "rate_limited" });
    expect(await db.user.findUnique({ where: { email: "typo@example.com" } })).toBeNull();
    expect(await confirm(tokenOf(), PASSWORD)).toMatchObject({ status: "verified" });
  });

  it("tries sent at once count against the limit too", async () => {
    await signup("parallel@example.com");
    const lim = createRateLimiter({ limit: 5, windowMs: 60_000 });
    const results = await Promise.all(Array.from({ length: 20 }, (_, n) => confirm(tokenOf(), `wrong password ${n}`, hours(1), lim)));
    expect(results.filter((r) => r.status === "wrong_password")).toHaveLength(5);
    expect(results.filter((r) => r.status === "rate_limited")).toHaveLength(15);
  });

  it("refuses an expired link, an unknown one and an empty one, without creating an account", async () => {
    await signup("late@example.com");
    expect(await peekSignup(db, tokenOf(), hours(EMAIL_VERIFY_HOURS))).toEqual({ status: "expired" });
    expect(await confirm(tokenOf(), PASSWORD, hours(EMAIL_VERIFY_HOURS))).toEqual({ status: "expired" });
    expect(await db.user.findUnique({ where: { email: "late@example.com" } })).toBeNull();
    expect(await db.signupRequest.count({ where: { email: "late@example.com" } })).toBe(0);
    for (const token of ["not-a-token", ""]) {
      expect(await confirm(token)).toEqual({ status: "invalid" });
      expect(await peekSignup(db, token)).toEqual({ status: "invalid" });
    }
  });

  it("someone signing up with another person's address cannot get the account, even if that person clicks the link", async () => {
    await signup("victim@example.com", { password: "attacker password" });
    // The owner of the mailbox opens the unsolicited link: without the attacker's password, no account.
    expect(await confirm(tokenOf(0), "a password the owner might try")).toEqual({ status: "wrong_password" });
    expect(await db.user.findUnique({ where: { email: "victim@example.com" } })).toBeNull();
    // The owner signs up themselves: the account has their password.
    await signup("victim@example.com", { password: "the owner's password" });
    expect(await confirm(tokenOf(1), "the owner's password")).toMatchObject({ status: "verified" });
    const user = await db.user.findUniqueOrThrow({ where: { email: "victim@example.com" } });
    expect(await verifyPassword(user.passwordHash!, "the owner's password")).toBe(true);
    // The attacker's pending sign-up is void.
    expect(await confirm(tokenOf(0), "attacker password")).toEqual({ status: "invalid" });
  });

  it("two submissions at once create the account once", async () => {
    await signup("double@example.com");
    const results = await Promise.all([confirm(tokenOf()), confirm(tokenOf())]);
    expect(results.map((r) => r.status).sort()).toEqual(["invalid", "verified"]);
    expect(await db.user.count({ where: { email: "double@example.com" } })).toBe(1);
  });

  it("says the account exists when it was created meanwhile (by an administrator)", async () => {
    await signup("meanwhile@example.com");
    await createUser(db, { email: "meanwhile@example.com" });
    expect(await confirm(tokenOf())).toEqual({ status: "exists", email: "meanwhile@example.com" });
    // The failed creation is rolled back with the deletion of the request: the link still answers.
    expect(await peekSignup(db, tokenOf())).toEqual({ status: "valid", email: "meanwhile@example.com" });
  });

  it("hashes the password whether or not the address has an account, so the response time does not tell", async () => {
    await createUser(db, { email: "timing@example.com" });
    const spy = vi.spyOn(passwords, "hashPassword");
    try {
      await signup("timing@example.com");
      await signup("timing-new@example.com");
      expect(spy).toHaveBeenCalledTimes(2);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("an unverified address cannot start a mock exam", () => {
  it("refuses with email_unverified (403), at creation and at start, even with full access", async () => {
    const admin = await createUser(db, { email: "vouched@example.com" });
    expect((await db.user.findUniqueOrThrow({ where: { id: admin.id } })).emailVerified).not.toBeNull();
    // An account without verified address (none is created so today; the rule guards future paths).
    const user = await db.user.create({ data: { email: "unverified@example.com" } });
    await grantFullAccess(db, user.id);
    const err = await createAttempt(db, { userId: user.id, certificationCode: "az-104", locale: "en" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AccessError);
    expect(err).toMatchObject({ code: "email_unverified", status: 403 });

    session.current = { user: { id: user.id, role: "user", locale: "en" } };
    const res = await attempts.POST(
      new Request("http://localhost/api/attempts", { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify({ certification: "az-104", locale: "en" }) }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "email_unverified" });

    // Created while verified, then started after the address lost its verification: refused too.
    await db.user.update({ where: { id: user.id }, data: { emailVerified: T0 } });
    const { attemptId } = await createAttempt(db, { userId: user.id, certificationCode: "az-104", locale: "en" });
    await db.user.update({ where: { id: user.id }, data: { emailVerified: null } });
    await expect(startAttempt(db, { attemptId, userId: user.id })).rejects.toMatchObject({ code: "email_unverified" });
  });
});
