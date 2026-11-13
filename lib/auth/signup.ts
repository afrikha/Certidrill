/**
 * Public sign-up (offers lot A3, decision of 2026-11-13): e-mail and password,
 * then a verification link. Open only while the switch signup.open is on.
 *
 * The account is created when the link is followed, not before: the request
 * (address, password hash, language) waits in signup_request. Following the
 * link asks for the password chosen at sign-up again: the account needs both
 * the mailbox (the link) and the password. So someone who signs up with
 * another person's address cannot get the account even if that person clicks
 * the unsolicited link, and opening the link alone (a mail scanner) changes
 * nothing.
 *
 * The answer is the same whether the address is new or already registered
 * ("check your inbox"), so the form does not reveal who has an account: the
 * owner of an existing address receives a notice with a sign-in link instead.
 */
import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from "@/lib/auth/password";
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

  // Hashed whether or not the address has an account: the hash takes tens
  // of milliseconds and would otherwise tell the two apart. Both answers
  // also send an e-mail; what remains (one insert) is small next to SMTP.
  const passwordHash = await hashPassword(password);
  // Expired requests are of no use: removed as they are met, no job needed.
  await db.signupRequest.deleteMany({ where: { expiresAt: { lte: now } } });
  const existing = await db.user.findUnique({ where: { email }, select: { locale: true } });
  if (existing) {
    await mailer.exists({ to: email, url: siteUrl("/login", base), locale: existing.locale });
    return "sent";
  }
  const token = randomBytes(32).toString("base64url");
  await db.signupRequest.create({
    data: { email, passwordHash, locale, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + EMAIL_VERIFY_HOURS * 3_600_000) },
  });
  await mailer.verification({ to: email, url: siteUrl("/verify-email", base, { token }), locale });
  return "sent";
}

/** What a verification link leads to, without using it (the page that asks for the password). */
export async function peekSignup(db: PrismaClient, token: string, now = new Date()): Promise<{ status: "valid"; email: string } | { status: "invalid" | "expired" }> {
  if (!token) return { status: "invalid" };
  const request = await db.signupRequest.findUnique({ where: { tokenHash: hashToken(token) }, select: { email: true, expiresAt: true } });
  if (!request) return { status: "invalid" };
  if (request.expiresAt <= now) return { status: "expired" };
  return { status: "valid", email: request.email };
}

export type ConfirmResult =
  | { status: "verified" | "exists"; email: string }
  | { status: "invalid" | "expired" | "wrong_password" | "rate_limited" };

/**
 * Creates the account of a verification link, its address verified, once
 * the password chosen at sign-up is given again. A wrong password keeps the
 * link (5 tries per link per 15 minutes, the right one included). The request is deleted in the transaction
 * that creates the account: two submissions at once create it once, and a
 * failure keeps the link.
 */
export async function confirmSignup(
  db: PrismaClient,
  limiter: RateLimiter,
  { token, password }: { token: string; password: string },
  now = new Date(),
): Promise<ConfirmResult> {
  if (!token) return { status: "invalid" };
  const tokenHash = hashToken(token);
  const request = await db.signupRequest.findUnique({ where: { tokenHash } });
  if (!request) return { status: "invalid" };
  if (request.expiresAt <= now) {
    await db.signupRequest.deleteMany({ where: { id: request.id } });
    return { status: "expired" };
  }
  // Counted before the check, so that tries sent at once cannot all pass
  // before the first failure is recorded. The right password ends the link.
  if (!limiter.hit(`confirm:${tokenHash}`)) return { status: "rate_limited" };
  if (!(await verifyPassword(request.passwordHash, password))) return { status: "wrong_password" };
  const { email } = request;
  try {
    // One transaction: if the account cannot be created, the link is kept.
    const created = await db.$transaction(async (tx) => {
      // Deleted first: a concurrent submission waits on this row, then finds it gone.
      const { count } = await tx.signupRequest.deleteMany({ where: { id: request.id } });
      if (count === 0) return false;
      await tx.user.create({ data: { email, passwordHash: request.passwordHash, locale: request.locale, emailVerified: now } });
      // The other pending sign-ups of this address are void once it has an account.
      await tx.signupRequest.deleteMany({ where: { email } });
      return true;
    });
    if (!created) return { status: "invalid" }; // used meanwhile by a concurrent submission
  } catch (err) {
    // Another link of the same address, or an administrator, was first.
    if ((err as { code?: string }).code === "P2002") return { status: "exists", email };
    throw err;
  }
  return { status: "verified", email };
}
