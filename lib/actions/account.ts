"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from "@/lib/auth/password";

export type PasswordState = { ok?: true; error?: "passwordInvalid" | "passwordTooShort" } | undefined;

const schema = z.object({ current: z.string().max(256), next: z.string().max(256) });

export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const user = await requireUser();
  const { current, next } = schema.parse({ current: formData.get("current") ?? "", next: formData.get("next") ?? "" });
  if (next.length < MIN_PASSWORD_LENGTH) return { error: "passwordTooShort" };
  const db = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (db.passwordHash && !(await verifyPassword(db.passwordHash, current))) return { error: "passwordInvalid" };
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: true };
}
