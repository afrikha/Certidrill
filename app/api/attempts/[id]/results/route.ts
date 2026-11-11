import { apiRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getAttemptResults } from "@/lib/exam/results";
import { isLocale } from "@/lib/i18n/config";

/** GET /api/attempts/:id/results[?lang=fr] — report and correction, after submission only. */
export const GET = apiRoute<{ id: string }>(async ({ request, user, params }) => {
  const lang = new URL(request.url).searchParams.get("lang");
  return getAttemptResults(prisma, { attemptId: params.id, userId: user.id, locale: isLocale(lang) ? lang : undefined });
});
