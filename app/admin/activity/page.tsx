import { getFormatter, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { siteActivity } from "@/lib/activity/overview";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Activity" };
export const dynamic = "force-dynamic";

const DAYS = 30;

/** The activity of the whole site over the last days (lib/activity/overview.ts). */
export default async function AdminActivityPage() {
  // Checked here too: layouts are not re-run on every navigation (Next.js guidance).
  await requireAdmin();
  const t = await getTranslations("activityAdmin");
  const format = await getFormatter();
  const activity = await siteActivity(prisma, new Date(), DAYS);
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
    </div>
  );
}
