import { apiRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { lockSection } from "@/lib/exam/session";

/** POST /api/attempts/:id/sections/:sectionId/lock — leaves a section for good. */
export const POST = apiRoute<{ id: string; sectionId: string }>(async ({ user, params }) => {
  const section = await lockSection(prisma, { attemptId: params.id, sectionId: params.sectionId, userId: user.id });
  return { id: section.id, lockedAt: section.lockedAt };
});
