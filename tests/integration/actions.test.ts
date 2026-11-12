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
import { allowSignIn, authorizeCredentials, RateLimitedError, refreshToken, sessionUser, VERIFY_REQUEST_URL } from "@/lib/auth/callbacks";
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
import { loginWithMagicLink, loginWithPassword } from "@/lib/actions/auth";
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
    'TRUNCATE "exam_outcome","attempt_item","attempt_section","attempt","question_report","question","case_study","question_series","objective","domain","blueprint","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
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
