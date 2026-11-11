import { apiRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getAttemptView } from "@/lib/exam/session";

/** GET /api/attempts/:id — sections, questions without answers, responses, remaining time. */
export const GET = apiRoute<{ id: string }>(async ({ user, params }) => getAttemptView(prisma, { attemptId: params.id, userId: user.id }));
