"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { createUser, UserExistsError } from "@/lib/users";
import { formString } from "@/lib/form-data";

export type CreateUserState = { ok?: true; error?: "exists" | "invalid" } | undefined;

export async function createUserAction(_prev: CreateUserState, formData: FormData): Promise<CreateUserState> {
  const admin = await requireAdmin();
  try {
    await createUser(prisma, {
      email: formString(formData, "email"),
      name: formString(formData, "name"),
      password: formString(formData, "password"),
      role: formData.get("role") === "admin" ? "admin" : "user",
      locale: formData.get("locale") === "fr" ? "fr" : "en",
    }, { actorId: admin.id });
  } catch (err) {
    if (err instanceof UserExistsError) return { error: "exists" };
    if (err instanceof ZodError) return { error: "invalid" };
    throw err;
  }
  revalidatePath("/admin/users");
  return { ok: true };
}
