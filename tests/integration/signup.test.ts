/**
 * Public sign-up and e-mail verification (offers lot A3) on a real
 * PostgreSQL: the account only exists once the link is followed, with the
 * password chosen at sign-up; an unverified address cannot start an exam.
 */
import path from "node:path";
import { createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma as db } from "@/lib/db";
import { loadCertification } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";
import { seedBank, seedReferential } from "@/lib/content/seed";
import { confirmSignup, signUp, type Mailer } from "@/lib/auth/signup";
import { authorizeCredentials } from "@/lib/auth/callbacks";
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
import { GET as verifyRoute } from "@/app/verify-email/route";

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
  it("creates the account with the chosen password and language, its address verified; the link works once", async () => {
    await signup("alice@example.com", { password: "alice's own password", locale: "en" });
    const token = tokenOf();
    expect(await confirmSignup(db, token, hours(1))).toEqual({ status: "verified", email: "alice@example.com" });
    const user = await db.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
    expect(user).toMatchObject({ role: "user", locale: "en", emailVerified: hours(1) });
    const request = new Request("http://localhost/api/auth/callback/credentials");
    expect(await authorizeCredentials(db, limiter(), { email: "alice@example.com", password: "alice's own password" }, request)).toMatchObject({ id: user.id });
    expect(await confirmSignup(db, token, hours(1))).toEqual({ status: "invalid" });
    expect(await db.signupRequest.count({ where: { email: "alice@example.com" } })).toBe(0);
  });

  it("refuses an expired link, an unknown one and an empty one, without creating an account", async () => {
    await signup("late@example.com");
    expect(await confirmSignup(db, tokenOf(), hours(EMAIL_VERIFY_HOURS))).toEqual({ status: "expired" });
    expect(await db.user.findUnique({ where: { email: "late@example.com" } })).toBeNull();
    expect(await confirmSignup(db, "not-a-token")).toEqual({ status: "invalid" });
    expect(await confirmSignup(db, "")).toEqual({ status: "invalid" });
  });

  it("someone signing up with another person's address cannot choose the password of the account", async () => {
    // The attacker signs up first, then the owner of the address.
    await signup("victim@example.com", { password: "attacker password" });
    await signup("victim@example.com", { password: "the owner's password" });
    // The owner follows the link of their own sign-up: the account has their password.
    expect(await confirmSignup(db, tokenOf(1), hours(1))).toMatchObject({ status: "verified" });
    const user = await db.user.findUniqueOrThrow({ where: { email: "victim@example.com" } });
    expect(await verifyPassword(user.passwordHash!, "the owner's password")).toBe(true);
    expect(await verifyPassword(user.passwordHash!, "attacker password")).toBe(false);
    // The other pending sign-up of the address is void.
    expect(await confirmSignup(db, tokenOf(0), hours(1))).toEqual({ status: "invalid" });
  });

  it("two clicks at once on the same link create the account once", async () => {
    await signup("double@example.com");
    const results = await Promise.all([confirmSignup(db, tokenOf(), hours(1)), confirmSignup(db, tokenOf(), hours(1))]);
    expect(results.map((r) => r.status).sort()).toEqual(["invalid", "verified"]);
    expect(await db.user.count({ where: { email: "double@example.com" } })).toBe(1);
  });

  it("says the account exists when it was created meanwhile (by an administrator)", async () => {
    await signup("meanwhile@example.com");
    await createUser(db, { email: "meanwhile@example.com" });
    expect(await confirmSignup(db, tokenOf(), hours(1))).toEqual({ status: "exists", email: "meanwhile@example.com" });
  });

  it("GET /verify-email redirects to the login page or back to the sign-up, on the public address", async () => {
    vi.stubEnv("AUTH_URL", BASE);
    try {
      await signup("route@example.com");
      const go = async (token: string) => {
        const res = await verifyRoute(new Request(`http://internal:3000/verify-email?token=${encodeURIComponent(token)}`));
        expect(res.status).toBe(303);
        expect(res.headers.get("referrer-policy")).toBe("no-referrer");
        expect(res.headers.get("cache-control")).toBe("no-store");
        return res.headers.get("location");
      };
      expect(await go(tokenOf())).toBe(`${BASE}/login?verified=1`);
      expect(await go(tokenOf())).toBe(`${BASE}/signup?verify=invalid`);
      await signup("route-expired@example.com", { now: hours(-EMAIL_VERIFY_HOURS - 1) });
      expect(await go(tokenOf(1))).toBe(`${BASE}/signup?verify=expired`);
      await signup("route-exists@example.com");
      await createUser(db, { email: "route-exists@example.com" });
      expect(await go(tokenOf(2))).toBe(`${BASE}/login?verified=exists`);
    } finally {
      vi.unstubAllEnvs();
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
