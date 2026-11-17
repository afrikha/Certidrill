import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Overview } from "@/lib/progress/overview";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TONE } from "./readiness";

/**
 * The global indicator of the dashboard: totals across the certifications the
 * user practises, then one line per certification (its own scale, readiness
 * and level), each opening that certification's progress.
 */
export function OverviewCard({ overview, selected, titles }: Readonly<{ overview: Overview; selected: string | null; titles: Record<string, string> }>) {
  const t = useTranslations("dashboard");
  const tr = useTranslations("readiness");
  const { totals, rows } = overview;
  const tiles = [
    ["totalCertifications", totals.certifications],
    ["totalExams", totals.exams],
    ["totalPassed", totals.passed],
    ["totalReady", totals.ready],
    ["totalXp", totals.xp],
    ["totalBadges", totals.badges],
    ["totalRealPassed", totals.realPassed],
  ] as const;
  return (
    <Card className="overflow-x-auto" data-testid="overview">
      <h2 className="font-semibold">{t("overviewTitle")}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{t("overviewHelp")}</p>
      <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {tiles.map(([key, value]) => (
          <div key={key} className="flex flex-col-reverse rounded-lg border border-border p-3" data-total={key}>
            <dt className="text-xs text-muted-foreground">{t(key)}</dt>
            <dd className="text-2xl font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="py-2">{t("colCertification")}</th>
            <th scope="col">{t("colExams")}</th>
            <th scope="col">{t("colLast")}</th>
            <th scope="col">{t("colReadiness")}</th>
            <th scope="col">{t("colLevel")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.certification} className={cn("border-b border-border", r.certification === selected && "bg-muted")} data-certification={r.certification}>
              <th scope="row" className="py-2 pr-3 font-normal">
                <Link href={`/dashboard?${new URLSearchParams({ certification: r.certification })}`} aria-current={r.certification === selected ? "true" : undefined} className="text-primary underline">
                  <span className="font-mono uppercase">{r.certification}</span>
                </Link>{" "}
                <span className="text-muted-foreground">{titles[r.certification]}</span>
                {r.realPassed && <span className="ml-2 rounded bg-success/15 px-1.5 text-xs text-success">{t("realPassed")}</span>}
              </th>
              <td className="tabular-nums">{r.exams}</td>
              <td className={cn("font-semibold tabular-nums", r.lastPassed ? "text-success" : "text-danger")}>{r.lastScore}</td>
              <td>{r.readiness ? <span className={TONE[r.readiness.verdict].text}>{r.readiness.index} · {tr(`verdict_${r.readiness.verdict}`)}</span> : "—"}</td>
              <td>{r.level ? t("levelShort", { n: r.level.n, title: r.level.title }) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
