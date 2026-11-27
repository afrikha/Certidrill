"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { answerQuizQuestion, QuizError, startQuiz, type QuizCorrection, type QuizErrorCode, type QuizResult, type QuizStep } from "@/lib/course/quiz";
import { quizLimiter } from "@/lib/security/rate-limit";
import { ExerciseBusyError } from "@/lib/exercises/grade";

type Failure = { ok: false; error: QuizErrorCode | "rate_limited" | "busy" };

async function viewerAndLocale() {
  const user = await requireUser();
  const current = await getLocale();
  const locale: Locale = isLocale(current) ? current : defaultLocale;
  return { user, viewer: { userId: user.id, isAdmin: user.role === "admin" }, locale };
}

async function guarded<T>(userId: string, run: () => Promise<T>): Promise<T | Failure> {
  if (!quizLimiter.hit(userId)) return { ok: false, error: "rate_limited" };
  try {
    return await run();
  } catch (err) {
    if (err instanceof QuizError) return { ok: false, error: err.code };
    // kubectl busy checking other exercises: the answer is not recorded, the student sends it again.
    if (err instanceof ExerciseBusyError) return { ok: false, error: "busy" };
    throw err;
  }
}

/** Starts (or starts again) the quiz of a chapter: its first question, without its answer. */
export async function startQuizAction(certification: string, chapter: string): Promise<{ ok: true; id: string; step: QuizStep } | Failure> {
  const { user, viewer, locale } = await viewerAndLocale();
  return guarded(user.id, async () => ({ ok: true as const, ...(await startQuiz(prisma, { certification: String(certification), chapter: String(chapter), viewer, locale })) }));
}

/**
 * Validates the answer to one question: its correction (the first time its
 * answer key leaves the server), then the next question or the result.
 */
export async function answerQuizAction(
  attemptId: string,
  position: number,
  response: unknown,
): Promise<{ ok: true; correction: QuizCorrection; next: QuizStep | null; result: QuizResult | null } | Failure> {
  const { user, viewer, locale } = await viewerAndLocale();
  return guarded(user.id, async () => {
    const out = await answerQuizQuestion(prisma, { attemptId: String(attemptId), position: Number(position), response, viewer, locale });
    // A result changes the outline, the chapter page and the progression.
    if (out.result) {
      revalidatePath("/course", "layout");
      revalidatePath("/dashboard");
    }
    return { ok: true as const, ...out };
  });
}
