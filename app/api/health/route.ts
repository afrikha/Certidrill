import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Liveness + database check, used by Docker and the reverse proxy. Public:
 * it does not name the deployed version, shown to administrators only
 * (bottom of the back-office, lib/version.ts).
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "error" }, { status: 503 });
  }
}
