import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getAttemptResults, getReadinessChange } from "@/lib/exam/results";
import { SessionError } from "@/lib/exam/session";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DomainBars } from "@/components/charts/domain-bars";
import { ReadinessChange } from "@/components/progress/readiness";

export const metadata = { title: "Results" };
export const dynamic = "force-dynamic";

export default async function ResultsPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const user = await requireUser();
  let r;
  try {
    r = await getAttemptResults(prisma, { attemptId: id, userId: user.id, locale: user.locale === "fr" ? "fr" : "en" });
  } catch (err) {
    if (err instanceof SessionError && err.code === "not_found") notFound();
    if (err instanceof SessionError && err.code === "not_started") redirect(`/exam/${id}`);
    throw err;
  }
  const change = await getReadinessChange(prisma, { attemptId: r.id, userId: user.id });
  const t = await getTranslations("results");
  const minutes = Math.round(r.timeUsedMs / 60_000);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")} — <span className="font-mono uppercase">{r.certification.code}</span></h1>
      <Card className="flex flex-wrap items-center gap-8">
        <div>
          <p className="text-sm text-muted-foreground">{t("score")}</p>
          <p className="text-5xl font-bold tabular-nums" data-testid="scaled-score">
            {r.scaledScore}<span className="text-2xl text-muted-foreground"> / {r.maxScore}</span>
          </p>
        </div>
        <div>
          <p className={"text-2xl font-bold " + (r.passed ? "text-success" : "text-danger")} data-testid="verdict">
            {r.passed ? `✓ ${t("passed")}` : `✗ ${t("failed")}`}
          </p>
          <p className="text-sm text-muted-foreground">{t("passMark", { n: r.passScore })}</p>
        </div>
        <ul className="text-sm text-muted-foreground">
          <li>{t(`status_${r.status}`)}</li>
          <li>{t("timeUsed", { used: minutes, total: r.durationMin })}</li>
          <li>{t("points", { earned: r.earned, possible: r.possible })}</li>
        </ul>
      </Card>

      {change && <ReadinessChange before={change.before} after={change.after} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">{t("byDomain")}</h2>
          <DomainBars
            rows={r.domains.map((d) => ({ key: d.key, title: d.title, score: d.scaledScore, detail: `${d.earned}/${d.possible}` }))}
            max={r.maxScore}
            threshold={r.passScore}
            thresholdLabel={t("threshold")}
          />
          <table className="sr-only" data-testid="domain-table">
            <caption>{t("byDomain")}</caption>
            <tbody>
              {r.domains.map((d) => (
                <tr key={d.key} data-domain={d.key}><th scope="row">{d.title}</th><td>{d.scaledScore}</td><td>{d.earned}/{d.possible}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="overflow-x-auto">
          <h2 className="mb-4 font-semibold">{t("byType")}</h2>
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-border"><th scope="col" className="py-2">{t("type")}</th><th scope="col">{t("questions")}</th><th scope="col">Points</th><th scope="col">{t("score")}</th></tr></thead>
            <tbody>
              {r.types.map((ty) => (
                <tr key={ty.key} className="border-b border-border">
                  <td className="py-2 font-mono text-xs">{ty.key}</td><td>{ty.questions}</td><td>{ty.earned}/{ty.possible}</td><td className="font-semibold">{ty.scaledScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">{t("approx")}</p>
      <Link href={`/results/${r.id}/review`} className={buttonClasses("primary")}>{t("seeCorrection")} →</Link>
    </div>
  );
}
