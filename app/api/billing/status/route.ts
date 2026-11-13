import { z } from "zod";
import { apiRoute } from "@/lib/api";
import { prisma } from "@/lib/db";
import { purchaseStatus } from "@/lib/billing/checkout";

const sessionId = z.string().min(1).max(255);

/** GET /api/billing/status?session_id=… — where a purchase of the user stands (the return page polls it). */
export const GET = apiRoute(async ({ request, user }) => {
  const id = sessionId.parse(new URL(request.url).searchParams.get("session_id") ?? "");
  return purchaseStatus(prisma, user.id, id);
});
