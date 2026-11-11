import { apiRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { submitAttempt } from "@/lib/exam/session";

/** POST /api/attempts/:id/submit — scores and closes the attempt (idempotent). */
export const POST = apiRoute<{ id: string }>(async ({ user, params }) => {
  const attempt = await submitAttempt(prisma, { attemptId: params.id, userId: user.id });
  return { id: attempt.id, status: attempt.status };
});
