import { apiRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getProgress } from "@/lib/exam/results";
import { isLocale } from "@/lib/i18n/config";

/** GET /api/me/progress — attempt history, level per domain, readiness. */
export const GET = apiRoute(async ({ user }) => getProgress(prisma, user.id, isLocale(user.locale) ? user.locale : "en"));
