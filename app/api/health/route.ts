import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Liveness + database check, used by Docker and the reverse proxy. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "error" }, { status: 503 });
  }
}
