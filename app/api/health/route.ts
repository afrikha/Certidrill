import { prisma } from "@/lib/db";
import { appVersion } from "@/lib/version";

export const dynamic = "force-dynamic";

/** Liveness + database check, used by Docker and the reverse proxy; names the deployed version (lib/version.ts). */
export async function GET() {
  const version = appVersion();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", version });
  } catch {
    return Response.json({ status: "error", version }, { status: 503 });
  }
}
