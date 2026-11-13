"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { AccessError, isRefusalCode } from "@/lib/access";
import { createAttempt, SessionError } from "@/lib/exam/session";
import { isLocale } from "@/lib/i18n/config";
import { formString } from "@/lib/form-data";

export type NewExamState = { error?: "emptyBank" | "emailUnverified" } | undefined;

export async function startNewExam(_prev: NewExamState, formData: FormData): Promise<NewExamState> {
  const user = await requireUser();
  const certification = formString(formData, "certification");
  const locale = formData.get("locale");
  let attemptId = "";
  let offer: string | null = null;
  try {
    ({ attemptId } = await createAttempt(prisma, { userId: user.id, certificationCode: certification, locale: isLocale(locale) ? locale : "en" }));
  } catch (err) {
    if (err instanceof SessionError && err.code === "empty_bank") return { error: "emptyBank" };
    if (err instanceof AccessError && err.code === "email_unverified") return { error: "emailUnverified" };
    // Refused (free exam used, Pass ended…): the offer screen says why.
    if (err instanceof AccessError && isRefusalCode(err.code)) offer = err.code;
    else throw err;
  }
  if (offer) redirect(`/offer?${new URLSearchParams({ reason: offer, certification })}`);
  redirect(`/exam/${attemptId}`);
}
