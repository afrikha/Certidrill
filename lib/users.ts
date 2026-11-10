import type { PrismaClient, Role } from "@prisma/client";
import { z } from "zod";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { locales } from "@/lib/i18n/config";

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

/** Sign-ups are closed: accounts are created by an administrator (CLI or back-office). */
export async function createUser(db: PrismaClient, input: CreateUserInput) {
  const data = createUserSchema.parse(input);
  const existing = await db.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existing) throw new UserExistsError(data.email);
  return db.user.create({
    data: {
      email: data.email,
      name: data.name ?? null,
      role: data.role as Role,
      locale: data.locale,
      passwordHash: data.password ? await hashPassword(data.password) : null,
    },
    select: { id: true, email: true, name: true, role: true, locale: true, createdAt: true },
  });
}
