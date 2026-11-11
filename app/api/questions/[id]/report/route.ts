import { z } from "zod";
import { apiRoute, jsonBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { REPORT_REASONS, reportQuestion } from "@/lib/exam/results";

const body = z.object({ reason: z.enum(REPORT_REASONS), comment: z.string().max(2000).optional() });

/** POST /api/questions/:id/report — reports an erroneous question seen in a finished attempt. */
export const POST = apiRoute<{ id: string }>(async ({ request, user, params }) => {
  const input = body.parse(await jsonBody(request));
  const report = await reportQuestion(prisma, { questionId: params.id, userId: user.id, ...input });
  return { id: report.id };
});
