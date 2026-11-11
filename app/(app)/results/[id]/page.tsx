import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { finalizeIfExpired } from "@/lib/exam/session";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Results" };
export const dynamic = "force-dynamic";

/** Score summary (the full report and correction come with lot 5). */
export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  await finalizeIfExpired(prisma, id, user.id);
  const attempt = await prisma.attempt.findFirst({ where: { id, userId: user.id }, include: { certification: true, blueprint: true } });
  if (!attempt) notFound();
  if (attempt.status === "in_progress") redirect(`/exam/${id}`);
  const t = await getTranslations("dashboard");
  return (
    <Card>
      <h1 className="text-2xl font-bold uppercase">{attempt.certification.code}</h1>
      <p className="mt-4 text-5xl font-bold" data-testid="scaled-score">{attempt.scaledScore}<span className="text-2xl text-muted-foreground"> / {attempt.blueprint.maxScore}</span></p>
      <p className={"mt-2 text-lg font-semibold " + (attempt.passed ? "text-success" : "text-danger")} data-testid="verdict">
        {attempt.passed ? t("passed") : t("failed")} ({attempt.blueprint.passScore})
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{attempt.status}</p>
    </Card>
  );
}
