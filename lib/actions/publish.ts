"use server";

import { revalidatePath } from "next/cache";
import type { ContentStatus, QuestionType } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formString } from "@/lib/form-data";
import { questionTypes } from "@/lib/content/schema";
import { isChapterStatus } from "@/lib/course/admin";
import { isBatchStatus, type BatchStatus } from "@/lib/content/batch-status";
import { PublishError, setCertificationActive, setCourseStatuses, setQuestionStatuses } from "@/lib/content/publish";

export type PublishState = { ok?: true; count?: number; groups?: number; to?: BatchStatus; active?: boolean; unchanged?: true; error?: "invalid" | "not_found" | "incomplete_bank" | "breaks_active" | "unconfirmed" } | undefined;

/** Everything a certification's visibility touches. */
function revalidateCertification() {
  revalidatePath("/", "layout");
}

async function run(work: () => Promise<number | boolean | { questions: number; groups: number }>): Promise<PublishState> {
  let result: number | boolean | { questions: number; groups: number };
  try {
    result = await work();
  } catch (err) {
    if (err instanceof PublishError) return { error: err.code };
    throw err;
  }
  if (typeof result === "object") {
    if (result.questions === 0 && result.groups === 0) return { unchanged: true };
    revalidateCertification();
    return { ok: true, count: result.questions, groups: result.groups };
  }
  if (result === false || result === 0) return { unchanged: true };
  revalidateCertification();
  return typeof result === "number" ? { ok: true, count: result } : { ok: true };
}

/** Activates or deactivates a certification (refused while its published bank cannot build complete exams). */
export async function setCertificationActiveAction(_prev: PublishState, formData: FormData): Promise<PublishState> {
  const admin = await requireAdmin();
  const active = formString(formData, "active");
  if (active !== "true" && active !== "false") return { error: "invalid" };
  const state = await run(() => setCertificationActive(prisma, admin.id, formString(formData, "certification"), active === "true"));
  // The page shows the new value at once: the message says what was asked, not the current value.
  return state?.ok ? { ...state, active: active === "true" } : state;
}

/** Sets the status of the questions the filters of the questions page select; the box must be ticked. */
export async function setQuestionStatusesAction(_prev: PublishState, formData: FormData): Promise<PublishState> {
  const admin = await requireAdmin();
  const to = formString(formData, "to");
  const type = formString(formData, "type");
  const status = formString(formData, "status");
  const usage = formString(formData, "usage") || "exam";
  if (usage !== "exam" && usage !== "quiz") return { error: "invalid" };
  if (!isBatchStatus(to) || (type && !(questionTypes as readonly string[]).includes(type)) || (status && !isChapterStatus(status))) return { error: "invalid" };
  if (formString(formData, "confirm") !== "yes") return { error: "unconfirmed" };
  const state = await run(() =>
    setQuestionStatuses(prisma, admin.id, {
      certification: formString(formData, "certification"),
      type: (type || undefined) as QuestionType | undefined,
      status: (status || undefined) as ContentStatus | undefined,
      domain: formString(formData, "domain") || undefined,
      usage,
      chapter: (usage === "quiz" && formString(formData, "chapter")) || undefined,
      to,
    }),
  );
  // The groups line of the result says whether they were published or taken out of exams.
  return state?.ok ? { ...state, to } : state;
}

/** Sets the status of every chapter of a certification's course (only those in `from` when given). */
export async function setCourseStatusesAction(_prev: PublishState, formData: FormData): Promise<PublishState> {
  const admin = await requireAdmin();
  const to = formString(formData, "to");
  const from = formString(formData, "from");
  if (!isBatchStatus(to) || (from && !isChapterStatus(from))) return { error: "invalid" };
  if (formString(formData, "confirm") !== "yes") return { error: "unconfirmed" };
  return run(() => setCourseStatuses(prisma, admin.id, { certification: formString(formData, "certification"), to, from: (from || undefined) as ContentStatus | undefined }));
}
