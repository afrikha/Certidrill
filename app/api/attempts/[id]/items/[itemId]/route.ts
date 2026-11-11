import { z } from "zod";
import { apiRoute, jsonBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { saveItem } from "@/lib/exam/session";

const body = z.object({ response: z.unknown().optional(), flagged: z.boolean().optional() }).strict();

/** PUT /api/attempts/:id/items/:itemId — saves a response and/or the review flag. */
export const PUT = apiRoute<{ id: string; itemId: string }>(async ({ request, user, params }) => {
  const input = body.parse(await jsonBody(request));
  const item = await saveItem(prisma, { attemptId: params.id, itemId: params.itemId, userId: user.id, response: input.response, flagged: input.flagged });
  return { id: item.id, flagged: item.flagged, answered: item.answeredAt !== null, savedAt: new Date().toISOString() };
});
