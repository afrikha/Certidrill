import type { PrismaClient, Role } from "@prisma/client";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import type { RateLimiter } from "@/lib/security/rate-limit";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";

/**
 * Auth.js logic kept out of auth.ts so that it can be tested against a real
 * database: password sign-in with rate limiting, closed sign-ups for magic
 * links, and the JWT/session contents.
 */
export const VERIFY_REQUEST_URL = "/login?provider=email&type=email";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(256),
});

export class RateLimitedError extends Error {
  constructor() {
    super("rate_limited");
    this.name = "RateLimitedError";
  }
}

/** Credentials provider: returns the user, null on bad credentials, throws RateLimitedError when blocked. */
export async function authorizeCredentials(db: PrismaClient, limiter: RateLimiter, raw: unknown, request: Request) {
  const parsed = credentialsSchema.safeParse(raw);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limiter.blocked(`email:${email}`) || limiter.blocked(`ip:${ip}`)) throw new RateLimitedError();

  const user = await db.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, password))) {
    // Only failures count towards the limit.
    limiter.hit(`email:${email}`);
    limiter.hit(`ip:${ip}`);
    return null;
  }
  limiter.reset(`email:${email}`);
  return { id: user.id, email: user.email, name: user.name };
}

/**
 * signIn callback. Closed sign-ups (decision of 2026-11-11): accounts are
 * created by an administrator, a magic link is only sent to an existing account.
 */
export async function allowSignIn(db: PrismaClient, limiter: RateLimiter, provider: string | undefined, email: string | null | undefined) {
  if (provider !== "email") return true;
  const normalized = email?.toLowerCase();
  if (!normalized) return false;
  if (!limiter.hit(`magic:${normalized}`)) return false;
  const existing = await db.user.findUnique({ where: { email: normalized }, select: { id: true } });
  // Same redirect as a real send (Auth.js appends these parameters to
  // pages.verifyRequest), so the response does not reveal which addresses
  // have an account.
  return existing ? true : VERIFY_REQUEST_URL;
}

/** Language of the account with this e-mail (the default locale if unknown): magic links are sent in it. */
export async function userLocale(db: PrismaClient, email: string): Promise<Locale> {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() }, select: { locale: true } });
  return isLocale(user?.locale) ? user.locale : defaultLocale;
}

export type AppToken = { sub?: string; role?: Role; locale?: string; email?: string | null; name?: string | null; [k: string]: unknown };

/** jwt callback: refreshes role, locale, e-mail and name from the database; null signs out a deleted user. */
export async function refreshToken<T extends AppToken>(db: PrismaClient, token: T, userId?: string): Promise<T | null> {
  if (userId) token.sub = userId;
  if (!token.sub) return token;
  const dbUser = await db.user.findUnique({ where: { id: token.sub }, select: { role: true, locale: true, email: true, name: true } });
  if (!dbUser) return null;
  return { ...token, role: dbUser.role, locale: dbUser.locale, email: dbUser.email, name: dbUser.name };
}

/** session callback: the user fields exposed to the app. */
export function sessionUser(token: AppToken) {
  return {
    id: token.sub as string,
    email: token.email as string,
    name: token.name ?? null,
    role: token.role ?? ("user" as Role),
    locale: token.locale ?? "en",
  };
}
