import { z } from "zod";
import { apiRoute, jsonBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { createAttempt } from "@/lib/exam/session";
import { locales } from "@/lib/i18n/config";

const body = z.object({ certification: z.string().min(1).max(40), locale: z.enum(locales) });

/** POST /api/attempts — assembles an exam and creates the attempt (or returns the one in progress). */
export const POST = apiRoute(async ({ request, user }) => {
  const { certification, locale } = body.parse(await jsonBody(request));
  return createAttempt(prisma, { userId: user.id, certificationCode: certification, locale });
});
