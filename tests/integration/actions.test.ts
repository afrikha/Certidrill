/**
 * Integration tests of the Auth.js logic and of the server actions, on a real
 * PostgreSQL. Next.js runtime APIs (redirect, cookies, revalidatePath) and the
 * Auth.js entry points are replaced by stubs.
 */
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { loadCertification } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";
import { seedBank, seedReferential } from "@/lib/content/seed";
import { createUser } from "@/lib/users";
import { verifyPassword } from "@/lib/auth/password";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { allowSignIn, authorizeCredentials, RateLimitedError, refreshToken, sessionUser, userLocale, VERIFY_REQUEST_URL } from "@/lib/auth/callbacks";
import { publishSampleBank } from "./sample-bank";

const h = vi.hoisted(() => {
  class AuthError extends Error {
    type: string;
    code?: string;
    constructor(type: string, code?: string) {
      super(type);
      this.type = type;
      this.code = code;
    }
  }
  return {
    session: null as null | { user: { id: string; role: string; locale: string } },
    cookies: new Map<string, { value: string; options: unknown }>(),
    signIn: vi.fn(),
    revalidatePath: vi.fn(),
    AuthError,
  };
});

class Redirect extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}

vi.mock("@/auth", () => ({ auth: vi.fn(async () => h.session), signIn: h.signIn, VERIFY_REQUEST_URL: "/login?provider=email&type=email" }));
vi.mock("next-auth", () => ({ AuthError: h.AuthError }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirect(url);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: (name: string, value: string, options: unknown) => h.cookies.set(name, { value, options }) }),
  headers: async () => new Headers(),
}));

import { changePassword } from "@/lib/actions/account";
import { createUserAction } from "@/lib/actions/admin";
import { confirmSignupAction, loginWithMagicLink, loginWithPassword, signupAction } from "@/lib/actions/auth";
import { createHash } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";
import { grantPassAction, revokeEntitlementAction, setSwitchAction } from "@/lib/actions/billing";
import { SWITCHES } from "@/lib/settings";
import { startNewExam } from "@/lib/actions/exam";
import { setLocale } from "@/lib/actions/locale";
import { deleteOutcomeAction, reportOutcomeAction } from "@/lib/actions/outcome";
import { requireAdmin, requireUser } from "@/lib/auth/guards";

const PASSWORD = "correct horse battery";
let userId: string;
let adminId: string;

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}
const as = (id: string | null, role = "user") => (h.session = id ? { user: { id, role, locale: "en" } } : null);
const request = (ip?: string) => new Request("http://localhost/api/auth/callback/credentials", { headers: ip ? { "x-forwarded-for": ip } : {} });

async function redirectOf(p: Promise<unknown>) {
  const err = await p.then(() => null, (e: unknown) => e);
  expect(err).toBeInstanceOf(Redirect);
  return (err as Redirect).url;
}

beforeAll(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "exam_outcome","attempt_item","attempt_section","attempt","question_report","question","case_study","question_series","objective","domain","blueprint","certification","auth_account","auth_session","auth_verification_token","signup_request","entitlement","user" CASCADE',
  );
  const content = await loadCertification(path.resolve(__dirname, "../../content/az-104"));
  await seedReferential(prisma, content);
  await seedBank(prisma, content, await loadBank(content));
  userId = (await createUser(prisma, { email: "carol@example.com", password: PASSWORD })).id;
  adminId = (await createUser(prisma, { email: "admin-actions@example.com", role: "admin" })).id;
});
afterAll(() => prisma.$disconnect());
beforeEach(() => {
  as(userId);
  h.signIn.mockReset();
  h.revalidatePath.mockReset();
  h.cookies.clear();
});

describe("password sign-in (authorizeCredentials)", () => {
  it("accepts the right password (e-mail case and spaces ignored) and refuses a wrong one", async () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
    expect(await authorizeCredentials(prisma, limiter, { email: "  Carol@Example.com ", password: PASSWORD }, request("1.1.1.1"))).toMatchObject({ id: userId, email: "carol@example.com" });
    expect(await authorizeCredentials(prisma, limiter, { email: "carol@example.com", password: "wrong password!" }, request("1.1.1.1"))).toBeNull();
    expect(await authorizeCredentials(prisma, limiter, { email: "nobody@example.com", password: PASSWORD }, request())).toBeNull();
    expect(await authorizeCredentials(prisma, limiter, { email: "not-an-email", password: PASSWORD }, request())).toBeNull();
    // An account without password (magic link only) cannot sign in with a password.
    expect(await authorizeCredentials(prisma, limiter, { email: "admin-actions@example.com", password: PASSWORD }, request())).toBeNull();
  });

  it("blocks an e-mail after repeated failures, even with the right password, and per IP", async () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
    for (let i = 0; i < 2; i++) await authorizeCredentials(prisma, limiter, { email: "carol@example.com", password: "bad password..." }, request("9.9.9.9"));
    await expect(authorizeCredentials(prisma, limiter, { email: "carol@example.com", password: PASSWORD }, request("2.2.2.2"))).rejects.toBeInstanceOf(RateLimitedError);
    // Same IP, other account: blocked too.
    await expect(authorizeCredentials(prisma, limiter, { email: "someone@example.com", password: PASSWORD }, request("9.9.9.9, 10.0.0.1"))).rejects.toBeInstanceOf(RateLimitedError);
  });
});

describe("magic links (allowSignIn) and session contents", () => {
  it("sends links only to existing accounts, without revealing which ones exist", async () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
    expect(await allowSignIn(prisma, limiter, "credentials", null)).toBe(true);
    expect(await allowSignIn(prisma, limiter, "email", "CAROL@example.com")).toBe(true);
    expect(await allowSignIn(prisma, limiter, "email", "stranger@example.com")).toBe(VERIFY_REQUEST_URL);
    expect(await allowSignIn(prisma, limiter, "email", undefined)).toBe(false);
    // Rate limited per address.
    expect(await allowSignIn(prisma, limiter, "email", "carol@example.com")).toBe(true);
    expect(await allowSignIn(prisma, limiter, "email", "carol@example.com")).toBe(false);
  });

  it("sends magic links in the account's language", async () => {
    await createUser(prisma, { email: "dora@example.com", password: PASSWORD, locale: "fr" });
    expect(await userLocale(prisma, "Dora@Example.com")).toBe("fr");
    expect(await userLocale(prisma, "carol@example.com")).toBe("en");
    // Unknown address or a locale no longer supported: the default locale.
    expect(await userLocale(prisma, "nobody@example.com")).toBe("en");
    await prisma.user.update({ where: { email: "dora@example.com" }, data: { locale: "de" } });
    expect(await userLocale(prisma, "dora@example.com")).toBe("en");
  });

  it("refreshes role and locale from the database, and signs out deleted users", async () => {
    const token = await refreshToken(prisma, { sub: undefined }, adminId);
    expect(token).toMatchObject({ sub: adminId, role: "admin", locale: "en", email: "admin-actions@example.com" });
    expect(sessionUser(token!)).toEqual({ id: adminId, email: "admin-actions@example.com", name: null, role: "admin", locale: "en" });
    expect(await refreshToken(prisma, {})).toEqual({});
    expect(await refreshToken(prisma, { sub: "deleted-user" })).toBeNull();
    expect(sessionUser({ sub: "x", email: "x@example.com" })).toMatchObject({ role: "user", locale: "en", name: null });
  });
});

describe("guards", () => {
  it("redirect anonymous users to /login and non-admins to /dashboard", async () => {
    as(null);
    expect(await redirectOf(requireUser())).toBe("/login");
    as(userId);
    expect(await requireUser()).toMatchObject({ id: userId });
    expect(await redirectOf(requireAdmin())).toBe("/dashboard");
    as(adminId, "admin");
    expect(await requireAdmin()).toMatchObject({ id: adminId });
  });
});

describe("server actions", () => {
  it("login with password: maps Auth.js errors to form states and lets the redirect through", async () => {
    h.signIn.mockRejectedValueOnce(new h.AuthError("CredentialsSignin"));
    expect(await loginWithPassword(undefined, form({ email: "carol@example.com", password: "x" }))).toEqual({ email: "carol@example.com", error: "invalid" });
    h.signIn.mockRejectedValueOnce(new h.AuthError("CredentialsSignin", "rate_limited"));
    expect(await loginWithPassword(undefined, form({ email: "carol@example.com", password: "x" }))).toMatchObject({ error: "rateLimited" });
    h.signIn.mockRejectedValueOnce(new h.AuthError("CallbackRouteError"));
    expect(await loginWithPassword(undefined, form({ email: "a@b.c" }))).toMatchObject({ error: "error" });
    h.signIn.mockRejectedValueOnce(new Redirect("/dashboard"));
    expect(await redirectOf(loginWithPassword(undefined, form({ email: "carol@example.com", password: PASSWORD })))).toBe("/dashboard");
    expect(h.signIn).toHaveBeenLastCalledWith("credentials", { email: "carol@example.com", password: PASSWORD, redirectTo: "/dashboard" });
  });

  it("magic link: normalizes the address and always lands on the same page", async () => {
    h.signIn.mockRejectedValueOnce(new h.AuthError("AccessDenied"));
    expect(await redirectOf(loginWithMagicLink(form({ email: "  Carol@Example.COM " })))).toBe(VERIFY_REQUEST_URL);
    expect(h.signIn).toHaveBeenCalledWith("email", { email: "carol@example.com", redirectTo: "/dashboard" });
    h.signIn.mockRejectedValueOnce(new Redirect("/login?provider=email"));
    expect(await redirectOf(loginWithMagicLink(form({ email: "carol@example.com" })))).toBe("/login?provider=email");
  });

  it("change password: checks the current one and the minimum length", async () => {
    expect(await changePassword(undefined, form({ current: PASSWORD, next: "short" }))).toEqual({ error: "passwordTooShort" });
    expect(await changePassword(undefined, form({ current: "not the password", next: "a brand new passphrase" }))).toEqual({ error: "passwordInvalid" });
    expect(await changePassword(undefined, form({ current: PASSWORD, next: "a brand new passphrase" }))).toEqual({ ok: true });
    const { passwordHash } = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await verifyPassword(passwordHash!, "a brand new passphrase")).toBe(true);
    // Accounts without a password (magic link) can set one without the current one.
    as(adminId, "admin");
    expect(await changePassword(undefined, form({ next: "admin passphrase 2026" }))).toEqual({ ok: true });
  });

  it("create user (admin only): duplicates and invalid input give form errors", async () => {
    expect(await redirectOf(createUserAction(undefined, form({ email: "new@example.com" })))).toBe("/dashboard");
    as(adminId, "admin");
    expect(await createUserAction(undefined, form({ email: "new@example.com", name: "New", role: "admin", locale: "fr", password: "" }))).toEqual({ ok: true });
    expect(h.revalidatePath).toHaveBeenCalledWith("/admin/users");
    expect(await prisma.user.findUniqueOrThrow({ where: { email: "new@example.com" } })).toMatchObject({ role: "admin", locale: "fr", passwordHash: null });
    expect(await createUserAction(undefined, form({ email: "NEW@example.com" }))).toEqual({ error: "exists" });
    expect(await createUserAction(undefined, form({ email: "not an email" }))).toEqual({ error: "invalid" });
    expect(await createUserAction(undefined, form({ email: "weak@example.com", password: "short" }))).toEqual({ error: "invalid" });
  });

  it("new exam: empty bank error, then redirect to the exam page", async () => {
    expect(await startNewExam(undefined, form({ certification: "az-104", locale: "fr" }))).toEqual({ error: "emptyBank" });
    await publishSampleBank(prisma);
    const url = await redirectOf(startNewExam(undefined, form({ certification: "az-104", locale: "xx" })));
    expect(url).toMatch(/^\/exam\/[a-z0-9]+$/);
    const attempt = await prisma.attempt.findUniqueOrThrow({ where: { id: url.split("/").pop()! } });
    expect(attempt.locale).toBe("en");
    await expect(startNewExam(undefined, form({ certification: "zz-999" }))).rejects.toThrow();
  });

  it("new exam: sends to the offer screen once the free exam is used", async () => {
    // The exam created above starts, then ends: the free quota (1) is used.
    const attempt = await prisma.attempt.findFirstOrThrow({ where: { userId, status: "in_progress" } });
    const now = new Date();
    await prisma.attempt.update({ where: { id: attempt.id }, data: { startedAt: now, deadlineAt: now, status: "expired", submittedAt: now } });
    expect(await redirectOf(startNewExam(undefined, form({ certification: "az-104", locale: "en" })))).toBe("/offer?reason=quota_exhausted&certification=az-104");
  });

  it("new exam: an unverified address is told to confirm it, not sent to the offer screen", async () => {
    const unverified = await prisma.user.create({ data: { email: "unverified-action@example.com" } });
    as(unverified.id);
    expect(await startNewExam(undefined, form({ certification: "az-104", locale: "en" }))).toEqual({ error: "emailUnverified" });
  });

  it("locale: sets the cookie, saves the preference of a signed-in user, ignores unknown locales", async () => {
    await setLocale(form({ locale: "de" }));
    expect(h.cookies.size).toBe(0);
    await setLocale(form({ locale: "fr" }));
    expect(h.cookies.get("NEXT_LOCALE")).toMatchObject({ value: "fr", options: { httpOnly: true, sameSite: "lax" } });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).locale).toBe("fr");
    expect(h.revalidatePath).toHaveBeenCalledWith("/", "layout");
    as(null);
    await setLocale(form({ locale: "en" }));
    expect(h.cookies.get("NEXT_LOCALE")?.value).toBe("en");
  });
});

describe("real exam outcome actions", () => {
  it("records a result, rejects a missing result or a bad score, and deletes only one's own", async () => {
    const report = (fields: Record<string, string>) => reportOutcomeAction(undefined, form({ certification: "az-104", takenOn: "2026-01-15", ...fields }));
    expect(await report({ result: "maybe" })).toEqual({ error: "missing_result" });
    expect(await report({ result: "passed", score: "abc" })).toEqual({ error: "invalid_score" });
    expect(await report({ result: "passed", score: "1e3" })).toEqual({ error: "invalid_score" });
    expect(await report({ result: "passed", score: "0x10" })).toEqual({ error: "invalid_score" });
    expect(await report({ result: "failed", takenOn: "15/01/2026" })).toEqual({ error: "invalid_date" });
    expect(h.revalidatePath).not.toHaveBeenCalled();
    expect(await report({ result: "passed", score: " 850 " })).toEqual({ ok: "passed" });
    expect(await report({ result: "failed", takenOn: "2026-01-20", score: "" })).toEqual({ ok: "failed" });
    expect(h.revalidatePath).toHaveBeenCalledWith("/dashboard");
    const mine = await prisma.examOutcome.findMany({ where: { userId }, orderBy: { takenOn: "asc" } });
    expect(mine.map((o) => [o.passed, o.score])).toEqual([[true, 850], [false, null]]);

    // Another user cannot delete it; a second delete is silent.
    as(adminId, "admin");
    await deleteOutcomeAction(form({ id: mine[0]!.id }));
    expect(await prisma.examOutcome.count({ where: { userId } })).toBe(2);
    as(userId);
    await deleteOutcomeAction(form({ id: mine[0]!.id }));
    await deleteOutcomeAction(form({ id: mine[0]!.id }));
    expect(await prisma.examOutcome.count({ where: { userId } })).toBe(1);

    as(null);
    await expect(report({ result: "passed" })).rejects.toThrow();
  });
});

describe("sign-up action", () => {
  const signup = (fields: Record<string, string>) =>
    signupAction(undefined, form({ email: "signup-action@example.com", password: PASSWORD, confirm: PASSWORD, locale: "fr", ...fields }));
  const setOpen = (value: boolean) => prisma.appSetting.upsert({ where: { key: SWITCHES.signupOpen }, create: { key: SWITCHES.signupOpen, value }, update: { value } });

  it("checks the confirmation, then sends the link; says when sign-ups are closed or the input is invalid", async () => {
    vi.stubEnv("AUTH_URL", "https://certidrill.test");
    vi.stubEnv("EMAIL_SERVER", "");
    vi.stubEnv("AUTH_LOG_MAGIC_LINKS", "true");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      await setOpen(false);
      expect(await signup({})).toEqual({ email: "signup-action@example.com", error: "closed" });
      await setOpen(true);
      expect(await signup({ confirm: "something else" })).toEqual({ email: "signup-action@example.com", error: "mismatch" });
      expect(await signup({ email: "nope" })).toEqual({ email: "nope", error: "invalid" });
      expect(await signup({})).toEqual({ sent: true, email: "signup-action@example.com" });
      expect(info).toHaveBeenCalledWith(expect.stringMatching(/e-mail verification link for signup-action@example\.com: https:\/\/certidrill\.test\/verify-email\?token=/));
      expect(await prisma.signupRequest.findFirstOrThrow({ where: { email: "signup-action@example.com" } })).toMatchObject({ locale: "fr" });
      // No SMTP and links not logged: the e-mail fails, the form says so (and the error is logged).
      vi.stubEnv("AUTH_LOG_MAGIC_LINKS", "");
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(await signup({ email: "smtp-down@example.com" })).toEqual({ email: "smtp-down@example.com", error: "error" });
      expect(error).toHaveBeenCalledWith(expect.stringContaining("signup.error"));
      error.mockRestore();
    } finally {
      info.mockRestore();
      await setOpen(false);
      vi.unstubAllEnvs();
    }
  });
});

describe("sign-up confirmation action", () => {
  const request = async (email: string, token: string) =>
    prisma.signupRequest.create({
      data: { email, passwordHash: await hashPassword(PASSWORD), locale: "en", tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 3_600_000) },
    });
  const confirm = (token: string, password = PASSWORD) => confirmSignupAction(undefined, form({ token, password }));

  it("asks again on a wrong password, then creates the account and signs in", async () => {
    await request("confirm-action@example.com", "token-ok");
    expect(await confirm("token-ok", "wrong password!")).toEqual({ error: "wrong_password" });
    expect(await prisma.user.findUnique({ where: { email: "confirm-action@example.com" } })).toBeNull();
    // signIn redirects to the dashboard; here it is a stub, so the fallback is the login page.
    expect(await redirectOf(confirm("token-ok"))).toBe("/login?verified=1");
    expect(h.signIn).toHaveBeenCalledWith("credentials", { email: "confirm-action@example.com", password: PASSWORD, redirectTo: "/dashboard" });
    expect(await prisma.user.findUniqueOrThrow({ where: { email: "confirm-action@example.com" } })).toMatchObject({ emailVerified: expect.any(Date) });
  });

  it("sends to the login page when signing in fails, and back to the sign-up for a dead link", async () => {
    await request("confirm-fail@example.com", "token-fail");
    h.signIn.mockRejectedValueOnce(new h.AuthError("CredentialsSignin"));
    expect(await redirectOf(confirm("token-fail"))).toBe("/login?verified=1");
    expect(await redirectOf(confirm("token-fail"))).toBe("/signup?verify=invalid");
    await request("confirm-exists@example.com", "token-exists");
    await createUser(prisma, { email: "confirm-exists@example.com" });
    expect(await redirectOf(confirm("token-exists"))).toBe("/login?verified=exists");
  });
});

describe("rights back-office actions", () => {
  it("are for administrators only", async () => {
    as(userId);
    expect(await redirectOf(grantPassAction(undefined, form({})))).toBe("/dashboard");
    expect(await redirectOf(revokeEntitlementAction(undefined, form({})))).toBe("/dashboard");
    expect(await redirectOf(setSwitchAction(form({ name: "team", enabled: "true" })))).toBe("/dashboard");
  });

  it("grant and revoke a Pass, with the errors of the form", async () => {
    as(adminId, "admin");
    const grant = (fields: Record<string, string>) => grantPassAction(undefined, form({ userId, certification: "az-104", days: "30", source: "admin", reason: "support ticket", ...fields }));
    expect(await grant({ days: "zero" })).toEqual({ error: "invalid" });
    expect(await grant({ certification: "zz-999" })).toEqual({ error: "not_found" });
    expect(h.revalidatePath).not.toHaveBeenCalled();
    expect(await grant({})).toEqual({ ok: true });
    expect(h.revalidatePath).toHaveBeenCalledWith("/admin/billing");
    const pass = await prisma.entitlement.findFirstOrThrow({ where: { userId, revokedAt: null } });
    expect(pass.source).toBe("admin");
    expect(await revokeEntitlementAction(undefined, form({ entitlementId: pass.id, reason: "" }))).toEqual({ error: "invalid" });
    expect(await revokeEntitlementAction(undefined, form({ entitlementId: pass.id, reason: "refund" }))).toEqual({ ok: true });
    expect((await prisma.entitlement.findUniqueOrThrow({ where: { id: pass.id } })).revokedAt).not.toBeNull();
  });

  it("switches: turns one on and off, ignores unknown names", async () => {
    as(adminId, "admin");
    const value = async () => (await prisma.appSetting.findUnique({ where: { key: SWITCHES.team } }))?.value;
    await setSwitchAction(form({ name: "team", enabled: "true" }));
    expect(await value()).toBe(true);
    await setSwitchAction(form({ name: "team", enabled: "false" }));
    expect(await value()).toBe(false);
    await setSwitchAction(form({ name: "toString", enabled: "true" }));
    await setSwitchAction(form({ name: "unknown", enabled: "true" }));
    expect(await prisma.appSetting.count({ where: { key: { notIn: Object.values(SWITCHES) } } })).toBe(0);
  });
});
