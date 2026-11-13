import type { PrismaClient, Role } from "@prisma/client";
import { z } from "zod";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { locales } from "@/lib/i18n/config";
import { audit } from "@/lib/audit";

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  name: z.string().trim().max(100).optional().transform((v) => v || undefined),
  password: z
    .string()
    .max(256)
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => v === undefined || v.length >= MIN_PASSWORD_LENGTH, `at least ${MIN_PASSWORD_LENGTH} characters`),
  role: z.enum(["user", "admin"]).default("user"),
  locale: z.enum(locales).default("en"),
});
export type CreateUserInput = z.input<typeof createUserSchema>;

export class UserExistsError extends Error {
  constructor(email: string) {
    super(`A user with e-mail ${email} already exists`);
    this.name = "UserExistsError";
  }
}

/**
 * An account created by an administrator (CLI or back-office). Its e-mail is
 * taken as verified: the administrator vouches for it. Public sign-ups go
 * through lib/auth/signup.ts instead.
 */
export async function createUser(db: PrismaClient, input: CreateUserInput, { actorId = null }: { actorId?: string | null } = {}) {
  const data = createUserSchema.parse(input);
  const existing = await db.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existing) throw new UserExistsError(data.email);
  const passwordHash = data.password ? await hashPassword(data.password) : null;
  return db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email: data.email, name: data.name ?? null, role: data.role as Role, locale: data.locale, passwordHash, emailVerified: new Date() },
      select: { id: true, email: true, name: true, role: true, locale: true, createdAt: true },
    });
    await audit(tx, { actorId, action: "user.create", targetUserId: user.id, details: { role: user.role } });
    return user;
  });
}
