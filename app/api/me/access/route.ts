import { apiRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getAccessSummary } from "@/lib/access";

/** GET /api/me/access — access level per active certification, and free mock exams left. */
export const GET = apiRoute(async ({ user }) => ({ certifications: await getAccessSummary(prisma, user.id) }));
