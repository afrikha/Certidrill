"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { createAttempt, SessionError } from "@/lib/exam/session";
import { isLocale } from "@/lib/i18n/config";

export type NewExamState = { error?: "emptyBank" | "error" } | undefined;

export async function startNewExam(_prev: NewExamState, formData: FormData): Promise<NewExamState> {
  const user = await requireUser();
  const certification = String(formData.get("certification") ?? "");
  const locale = formData.get("locale");
  let attemptId: string;
  try {
    ({ attemptId } = await createAttempt(prisma, { userId: user.id, certificationCode: certification, locale: isLocale(locale) ? locale : "en" }));
  } catch (err) {
    if (err instanceof SessionError && err.code === "empty_bank") return { error: "emptyBank" };
    throw err;
  }
  redirect(`/exam/${attemptId}`);
}
