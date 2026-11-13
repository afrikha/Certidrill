/**
 * Public sign-up (offers lot A3, decision of 2026-11-13): e-mail and password,
 * then a verification link. Open only while the switch signup.open is on.
 *
 * The account is created when the link is followed, not before: the request
 * (address, password hash, language) waits in signup_request. So nobody can
 * create an account, nor choose its password, on an address they do not
 * control. Each sign-up has its own link, bound to its own password.
 *
 * The answer is the same whether the address is new or already registered
 * ("check your inbox"), so the form does not reveal who has an account: the
 * owner of an existing address receives a notice with a sign-in link instead.
 */
import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { EMAIL_VERIFY_HOURS, sendAccountExistsEmail, sendVerificationEmail } from "@/lib/auth/email";
import { locales } from "@/lib/i18n/config";
import { readSwitches } from "@/lib/settings";
import type { RateLimiter } from "@/lib/security/rate-limit";

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(256),
  locale: z.enum(locales),
});

export type SignupResult = "sent" | "closed" | "invalid" | "rate_limited";

export interface Mailer {
  verification: typeof sendVerificationEmail;
  exists: typeof sendAccountExistsEmail;
}

const defaultMailer: Mailer = { verification: sendVerificationEmail, exists: sendAccountExistsEmail };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** A link on the public address of the site (AUTH_URL), never on the Host header of a request. */
function siteUrl(path: string, base: string | undefined, params: Record<string, string> = {}): string {
  if (!base) throw new Error("AUTH_URL is not configured");
  const url = new URL(path, base);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}

export async function signUp(
  db: PrismaClient,
  limiter: RateLimiter,
  raw: { email: string; password: string; locale: string },
  { ip, mailer = defaultMailer, base = process.env.AUTH_URL, now = new Date() }: { ip: string; mailer?: Mailer; base?: string; now?: Date },
): Promise<SignupResult> {
  if (!(await readSwitches(db)).signupOpen) return "closed";
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return "invalid";
  const { email, password, locale } = parsed.data;
  // Per IP (scripted sign-ups) and per address (mail bombing of one inbox).
  if (!limiter.hit(`signup-ip:${ip}`) || !limiter.hit(`signup:${email}`)) return "rate_limited";

  // Expired requests are of no use: removed as they are met, no job needed.
  await db.signupRequest.deleteMany({ where: { expiresAt: { lte: now } } });
  const existing = await db.user.findUnique({ where: { email }, select: { locale: true } });
  if (existing) {
    await mailer.exists({ to: email, url: siteUrl("/login", base), locale: existing.locale });
    return "sent";
  }
  const token = randomBytes(32).toString("base64url");
  await db.signupRequest.create({
    data: { email, passwordHash: await hashPassword(password), locale, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + EMAIL_VERIFY_HOURS * 3_600_000) },
  });
  await mailer.verification({ to: email, url: siteUrl("/verify-email", base, { token }), locale });
  return "sent";
}

export type ConfirmResult = { status: "verified"; email: string } | { status: "exists"; email: string } | { status: "invalid" | "expired" };

/**
 * Follows a verification link: creates the account, its address verified.
 * The request is deleted first, so two clicks on the same link create the
 * account once, and a used link reads as invalid.
 */
export async function confirmSignup(db: PrismaClient, token: string, now = new Date()): Promise<ConfirmResult> {
  if (!token) return { status: "invalid" };
  const request = await db.signupRequest.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!request) return { status: "invalid" };
  const { count } = await db.signupRequest.deleteMany({ where: { id: request.id } });
  if (count === 0) return { status: "invalid" }; // used meanwhile by a concurrent click
  if (request.expiresAt <= now) return { status: "expired" };
  const { email } = request;
  try {
    await db.$transaction([
      db.user.create({ data: { email, passwordHash: request.passwordHash, locale: request.locale, emailVerified: now } }),
      // The other pending sign-ups of this address are void once it has an account.
      db.signupRequest.deleteMany({ where: { email } }),
    ]);
  } catch (err) {
    // Another link of the same address, or an administrator, was first.
    if ((err as { code?: string }).code === "P2002") return { status: "exists", email };
    throw err;
  }
  return { status: "verified", email };
}
