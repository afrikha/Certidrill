import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { siteActivity } from "@/lib/activity/overview";
import { siteInsights, type ChapterReaders } from "@/lib/activity/insights";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Activity" };
export const dynamic = "force-dynamic";

const DAYS = 30;
/** Accounts created over this many days are followed for the retention. */
const COHORT_DAYS = 90;

/** The activity of the whole site over the last days (lib/activity/overview.ts). */
export default async function AdminActivityPage() {
  // Checked here too: layouts are not re-run on every navigation (Next.js guidance).
  await requireAdmin();
  const t = await getTranslations("activityAdmin");
  const format = await getFormatter();
  const locale = (await getLocale()) === "fr" ? "fr" : "en";
  const now = new Date();
  const [activity, insights] = await Promise.all([siteActivity(prisma, now, DAYS), siteInsights(prisma, now, DAYS, COHORT_DAYS)]);
  const percent = (n: number | null) => (n === null ? "—" : format.number(n, { style: "percent", maximumFractionDigits: 0 }));
  const share = (n: number, of: number) => percent(of === 0 ? null : n / of);
  const chapterList = (list: ChapterReaders[]) =>
    list.length === 0 ? "—" : list.map((c) => `${c.title[locale]} (${c.readers})`).join(" · ");
  const { funnel, retention } = insights;
  const steps = [
    ["funnelSignups", funnel.signups],
    ["funnelVerified", funnel.verified],
    ["funnelFirstExam", funnel.firstExam],
    ["funnelPurchased", funnel.purchased],
  ] as const;
  // Certifications without any activity are left out of the tables.
  const exams = insights.certifications.filter((c) => c.examsStarted + c.practiceStarted > 0);
  const courses = insights.certifications.filter((c) => c.courseReaders > 0);
  const columns = ["signups", "activeUsers", "examsStarted", "examsFinished", "passesSold"] as const;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("overviewHelp", { days: DAYS })}</p>
      <div className="grid gap-4 sm:grid-cols-3" data-testid="activity-totals">
        <Card>
          <p className="text-sm text-muted-foreground">{t("activeWeek")}</p>
          <p className="text-2xl font-bold tabular-nums" data-testid="active-week">{activity.activeWeek}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">{t("activeTotal", { days: DAYS })}</p>
          <p className="text-2xl font-bold tabular-nums" data-testid="active-total">{activity.activeTotal}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">{t("revenue")}</p>
          {activity.revenue.length === 0 ? (
            <p className="text-sm">{t("noRevenue")}</p>
          ) : (
            activity.revenue.map((r) => (
              <p key={r.currency} className="text-2xl font-bold tabular-nums">
                {format.number(r.cents / 100, { style: "currency", currency: r.currency.toUpperCase() })}{" "}
                <span className="text-sm font-normal text-muted-foreground">({r.passes})</span>
              </p>
            ))
          )}
        </Card>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm" data-testid="activity-days">
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="px-4 py-2">{t("day")}</th>
              {columns.map((c) => <th key={c} scope="col" className="px-4 py-2 text-right">{t(c)}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...activity.days].reverse().map((d) => (
              <tr key={d.day} className="border-t border-border" data-day={d.day}>
                <th scope="row" className="whitespace-nowrap px-4 py-2 font-normal">{format.dateTime(new Date(`${d.day}T00:00:00Z`), { dateStyle: "medium", timeZone: "UTC" })}</th>
                {columns.map((c) => <td key={c} className="px-4 py-2 text-right tabular-nums" data-column={c}>{d[c]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <section className="space-y-3" aria-labelledby="funnel-title">
        <h2 id="funnel-title" className="text-xl font-semibold">{t("funnelTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("funnelHelp", { days: DAYS })}</p>
        <div className="grid gap-4 sm:grid-cols-4" data-testid="activity-funnel">
          {steps.map(([key, n], i) => (
            <Card key={key}>
              <p className="text-sm text-muted-foreground">{t(key)}</p>
              <p className="text-2xl font-bold tabular-nums" data-step={key}>{n}</p>
              {i > 0 && <p className="text-sm text-muted-foreground">{t("ofSignups", { rate: share(n, funnel.signups) })}</p>}
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="retention-title">
        <h2 id="retention-title" className="text-xl font-semibold">{t("retentionTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("retentionHelp", { days: COHORT_DAYS })}</p>
        <div className="grid gap-4 sm:grid-cols-2" data-testid="activity-retention">
          {([["retention7", retention.day7], ["retention30", retention.day30]] as const).map(([key, r]) => (
            <Card key={key}>
              <p className="text-sm text-muted-foreground">{t(key)}</p>
              <p className="text-2xl font-bold tabular-nums" data-retention={key}>{share(r.returned, r.cohort)}</p>
              <p className="text-sm text-muted-foreground">{t("retentionCount", { returned: r.returned, cohort: r.cohort })}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="exams-title">
        <h2 id="exams-title" className="text-xl font-semibold">{t("examsTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("examsHelp", { days: DAYS })}</p>
        {exams.length === 0 ? (
          <p className="text-sm">{t("noExams")}</p>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm" data-testid="activity-exams">
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="px-4 py-2">{t("certification")}</th>
                  <th scope="col" className="px-4 py-2 text-right">{t("examsStarted")}</th>
                  <th scope="col" className="px-4 py-2 text-right">{t("examsFinished")}</th>
                  <th scope="col" className="px-4 py-2 text-right">{t("averageScore")}</th>
                  <th scope="col" className="px-4 py-2 text-right">{t("passRate")}</th>
                  <th scope="col" className="px-4 py-2 text-right">{t("practiceStarted")}</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((c) => (
                  <tr key={c.code} className="border-t border-border" data-certification={c.code}>
                    <th scope="row" className="px-4 py-2 font-normal">
                      {c.code.toUpperCase()} {!c.active && <span className="text-muted-foreground">({t("inactive")})</span>}
                    </th>
                    <td className="px-4 py-2 text-right tabular-nums" data-column="examsStarted">{c.examsStarted}</td>
                    <td className="px-4 py-2 text-right tabular-nums" data-column="examsFinished">{c.examsFinished}</td>
                    <td className="px-4 py-2 text-right tabular-nums" data-column="averageScore">{c.averageScore ?? "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums" data-column="passRate">{percent(c.passRate)}</td>
                    <td className="px-4 py-2 text-right tabular-nums" data-column="practiceStarted">{c.practiceStarted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="course-title">
        <h2 id="course-title" className="text-xl font-semibold">{t("courseTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("courseHelp")}</p>
        {courses.length === 0 ? (
          <p className="text-sm">{t("noCourse")}</p>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm" data-testid="activity-course">
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="px-4 py-2">{t("certification")}</th>
                  <th scope="col" className="px-4 py-2 text-right">{t("courseReaders")}</th>
                  <th scope="col" className="px-4 py-2 text-right">{t("chaptersCompleted")}</th>
                  <th scope="col" className="px-4 py-2">{t("topChapters")}</th>
                  <th scope="col" className="px-4 py-2">{t("bottomChapters")}</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.code} className="border-t border-border" data-certification={c.code}>
                    <th scope="row" className="px-4 py-2 font-normal">
                      {c.code.toUpperCase()} {!c.active && <span className="text-muted-foreground">({t("inactive")})</span>}
                    </th>
                    <td className="px-4 py-2 text-right tabular-nums" data-column="courseReaders">{c.courseReaders}</td>
                    <td className="px-4 py-2 text-right tabular-nums" data-column="chaptersCompleted">
                      {t("chaptersOf", { done: format.number(c.chaptersCompletedAvg ?? 0, { maximumFractionDigits: 1 }), total: c.chapters })}
                    </td>
                    <td className="px-4 py-2">{chapterList(c.topChapters)}</td>
                    <td className="px-4 py-2">{chapterList(c.bottomChapters)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
