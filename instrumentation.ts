/** Runs once when the server starts (Next.js instrumentation): the e-mail queue worker. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build" || process.env.EMAIL_WORKER === "off") return;
  const [{ prisma }, { startEmailWorker }] = await Promise.all([import("@/lib/db"), import("@/lib/email/worker")]);
  startEmailWorker(prisma);
}
