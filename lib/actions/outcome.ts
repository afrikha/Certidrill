"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formString } from "@/lib/form-data";
import { deleteOutcome, OutcomeError, recordOutcome, type OutcomeErrorCode } from "@/lib/progress/outcomes";

export type OutcomeState = { ok?: "passed" | "failed"; error?: OutcomeErrorCode | "missing_result" } | undefined;

/** "I took the real exam": records the result reported on the dashboard. */
export async function reportOutcomeAction(_prev: OutcomeState, formData: FormData): Promise<OutcomeState> {
  const user = await requireUser();
  const result = formString(formData, "result");
  if (result !== "passed" && result !== "failed") return { error: "missing_result" };
  const rawScore = formString(formData, "score").trim();
  const score = rawScore === "" ? null : Number(rawScore);
  try {
    await recordOutcome(prisma, {
      userId: user.id,
      certificationCode: formString(formData, "certification"),
      takenOn: formString(formData, "takenOn"),
      passed: result === "passed",
      score,
    });
  } catch (err) {
    if (err instanceof OutcomeError) return { error: err.code };
    throw err;
  }
  revalidatePath("/dashboard");
  return { ok: result };
}

/** Deletes one of the user's own reports. */
export async function deleteOutcomeAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  try {
    await deleteOutcome(prisma, { id: formString(formData, "id"), userId: user.id });
  } catch (err) {
    // Already gone (double click): nothing to do.
    if (!(err instanceof OutcomeError)) throw err;
  }
  revalidatePath("/dashboard");
}
