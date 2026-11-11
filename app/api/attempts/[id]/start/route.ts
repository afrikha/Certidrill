import { apiRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getAttemptView, startAttempt } from "@/lib/exam/session";

/** POST /api/attempts/:id/start — starts the clock (idempotent). */
export const POST = apiRoute<{ id: string }>(async ({ user, params }) => {
  await startAttempt(prisma, { attemptId: params.id, userId: user.id });
  return getAttemptView(prisma, { attemptId: params.id, userId: user.id });
});
