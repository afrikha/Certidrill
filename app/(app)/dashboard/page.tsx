import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { expireOverdue } from "@/lib/exam/session";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NewExamForm } from "./new-exam-form";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations("dashboard");
  const format = await getFormatter();
  await expireOverdue(prisma, user.id);

  const certifications = await prisma.certification.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
    include: { blueprints: { where: { current: true } } },
  });
  const inProgress = await prisma.attempt.findMany({ where: { userId: user.id, status: "in_progress" }, include: { certification: true } });
  const recent = await prisma.attempt.findMany({
    where: { userId: user.id, status: { in: ["submitted", "expired"] } },
    include: { certification: true },
    orderBy: { submittedAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("welcome", { name: user.name ?? user.email })}</h1>

      {inProgress.map((a) => (
        <Card key={a.id} className="border-primary">
          <p className="font-semibold">
            {t("inProgress")} — <span className="font-mono uppercase">{a.certification.code}</span>
            {!a.startedAt && <span className="font-normal text-muted-foreground"> ({t("notStarted")})</span>}
          </p>
          <Link href={`/exam/${a.id}`} className={buttonClasses("primary", "mt-4")}>{t("resume")}</Link>
        </Card>
      ))}

      {certifications.map((c) => {
        const bp = c.blueprints[0];
        const busy = inProgress.some((a) => a.certificationId === c.id);
        return (
          <Card key={c.id}>
            <h2 className="mb-1 font-semibold">{t("newExamFor", { code: c.code.toUpperCase() })}</h2>
            {bp && (
              <p className="mb-4 text-sm text-muted-foreground">
                {c.title} — {bp.durationMin} min, {bp.minQuestions}–{bp.maxQuestions} questions, {bp.passScore}/{bp.maxScore}
              </p>
            )}
            {!busy && <NewExamForm code={c.code} defaultLocale={user.locale} />}
          </Card>
        );
      })}

      <Card className="overflow-x-auto">
        <h2 className="mb-4 font-semibold">{t("recent")}</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noAttempts")}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-2">{t("date")}</th>
                <th scope="col">Certification</th>
                <th scope="col">{t("score")}</th>
                <th scope="col">{t("status")}</th>
                <th scope="col"><span className="sr-only">{t("viewResults")}</span></th>
              </tr>
            </thead>
            <tbody>
              {recent.map((a) => (
                <tr key={a.id} className="border-b border-border">
                  <td className="py-2">{a.submittedAt ? format.dateTime(a.submittedAt, { dateStyle: "medium", timeStyle: "short" }) : "—"}</td>
                  <td className="font-mono uppercase">{a.certification.code}</td>
                  <td className="font-semibold">{a.scaledScore}</td>
                  <td className={a.passed ? "text-success" : "text-danger"}>{a.passed ? t("passed") : t("failed")}</td>
                  <td><Link href={`/results/${a.id}`} className="text-primary underline">{t("viewResults")}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
