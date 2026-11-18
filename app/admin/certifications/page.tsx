import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { certificationRows } from "@/lib/content/publish";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ActiveForm, CourseBatchForm } from "./forms";

export const metadata = { title: "Certifications" };

/**
 * Activation and publication: every certification with its questions and
 * chapters by status, whether its published bank builds complete exams, and
 * the buttons to activate it and publish its course. Questions are published
 * by batch from the questions page, with its filters.
 */
export default async function AdminCertificationsPage() {
  // Checked here too: layouts are not re-run on every navigation (Next.js guidance).
  await requireAdmin();
  const t = await getTranslations("publishAdmin");
  const rows = await certificationRows(prisma);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("intro")}</p>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="px-4 py-2">{t("certification")}</th>
              <th scope="col" className="px-4 py-2">{t("visibility")}</th>
              <th scope="col" className="px-4 py-2">{t("questions")}</th>
              <th scope="col" className="px-4 py-2">{t("exam")}</th>
              <th scope="col" className="px-4 py-2">{t("course")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const total = Object.values(r.questions).reduce((n, x) => n + (x ?? 0), 0) - (r.questions.retired ?? 0);
              const published = r.questions.published ?? 0;
              return (
                <tr key={r.code} className="border-t border-border align-top" data-certification-row={r.code}>
                  <th scope="row" className="px-4 py-3 font-normal">
                    <span className="font-mono font-semibold uppercase">{r.code}</span>
                    <span className="block text-muted-foreground">{r.title}</span>
                  </th>
                  <td className="space-y-2 px-4 py-3">
                    <span className={cn("inline-block rounded px-1.5 text-xs", r.active ? "bg-success/15 text-success" : "bg-muted")} data-testid="visibility">
                      {r.active ? t("active") : t("inactive")}
                    </span>
                    {r.active !== r.fileActive && <span className="block text-xs text-muted-foreground">{t("fileDiffers", { value: r.fileActive ? t("active") : t("inactive") })}</span>}
                    <ActiveForm code={r.code} active={r.active} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="tabular-nums" data-testid="published-questions">{t("publishedOf", { published, total })}</span>
                    <span className="block text-xs text-muted-foreground">
                      {(["draft", "reviewed", "needs_review"] as const).filter((s) => r.questions[s]).map((s) => t("statusCount", { status: t(`status_${s}`), count: r.questions[s] ?? 0 })).join(" · ")}
                    </span>
                    <Link href={`/admin/questions?${new URLSearchParams({ certification: r.code })}`} className="text-xs text-primary underline">{t("publishQuestions")}</Link>
                  </td>
                  <td className="px-4 py-3" data-testid="exam-check">
                    {r.exam.ok ? (
                      <span className="text-success">{t("examOk")}</span>
                    ) : (
                      <span className="text-danger">{r.exam.available === 0 ? t("examEmpty") : t("examShort", { count: r.exam.shortfall })}</span>
                    )}
                  </td>
                  <td className="space-y-2 px-4 py-3">
                    <span className="tabular-nums">{t("publishedChapters", { published: r.chapters.published, total: r.chapters.total })}</span>
                    {r.chapters.total > 0 && <CourseBatchForm code={r.code} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
