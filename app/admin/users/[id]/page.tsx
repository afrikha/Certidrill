import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { pick, type Locale } from "@/lib/i18n/config";
import { userActivity, type ActivityEvent } from "@/lib/activity/timeline";
import { failedLogins } from "@/lib/activity/logins";
import { Card } from "@/components/ui/card";

export const metadata = { title: "User activity" };
export const dynamic = "force-dynamic";

const TAKE = 200;
const FAILED_TAKE = 50;

/** What one user did on the site, newest first (lib/activity/timeline.ts). */
export default async function UserActivityPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  // Checked here too: layouts are not re-run on every navigation (Next.js guidance).
  await requireAdmin();
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  const events = user ? await userActivity(prisma, user.id, TAKE) : null;
  if (!user || !events) notFound();
  const failed = await failedLogins(prisma, user.id, FAILED_TAKE);
  const t = await getTranslations("activityAdmin");
  const tb = await getTranslations("billingAdmin");
  const tp = await getTranslations("billing");
  const locale = (await getLocale()) as Locale;
  const format = await getFormatter();
  const when = (d: Date) => format.dateTime(d, { dateStyle: "short", timeStyle: "short" });
  const money = (cents: number, currency: string) => format.number(cents / 100, { style: "currency", currency: currency.toUpperCase() });
  const yesNo = (v: boolean | null) => (v === null ? "other" : v ? "yes" : "no");

  // An action written before its label exists shows as written, not as a broken page.
  const actionLabel = (action: string) => {
    const key = `action_${action.replaceAll(".", "_")}`;
    return tb.has(key) ? tb(key as "action_user_create") : action;
  };

  function describe(e: ActivityEvent): { what: string; details: string } {
    switch (e.kind) {
      case "login":
        return { what: t(`login_${e.login}`), details: t("ip", { ip: e.ip }) };
      case "exam_started":
        return { what: t("kind_exam_started", { mode: e.mode }), details: e.certification.toUpperCase() };
      case "exam_finished":
        return {
          what: t("kind_exam_finished", { mode: e.mode }),
          details: `${e.certification.toUpperCase()} · ${t("examResult", { status: e.status, hasScore: e.score === null ? "no" : "yes", score: e.score ?? 0, passed: yesNo(e.passed) })}`,
        };
      case "course_read":
        return { what: t("kind_course_read"), details: `${e.certification.toUpperCase()} · ${t("courseRead", { chapter: pick(e.chapter, locale), sections: e.sections })}` };
      case "report":
        return { what: t("kind_report"), details: `${e.questionId} · ${e.reason}` };
      case "outcome":
        return { what: t("kind_outcome"), details: `${e.certification.toUpperCase()} · ${t("outcome", { passed: e.passed ? "yes" : "no", hasScore: e.score === null ? "no" : "yes", score: e.score ?? 0 })}` };
      case "payment":
        return { what: t("kind_payment"), details: `${e.certification.toUpperCase()} · ${money(e.amountCents, e.currency)} · ${tp(`status_${e.status}`)}` };
      case "pass_granted":
        return { what: t("kind_pass_granted"), details: `${e.certification.toUpperCase()} · ${t("passGranted", { source: tb(`source_${e.source}`), date: format.dateTime(e.expiresAt, { dateStyle: "medium" }) })}` };
      case "pass_revoked":
        return { what: t("kind_pass_revoked"), details: e.certification.toUpperCase() };
      case "admin":
        return { what: actionLabel(e.action), details: e.actor ? t("byActor", { actor: e.actor }) : t("byCli") };
      default:
        return { what: t(`kind_${e.kind}`), details: "" };
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm">
        <Link href="/admin/users" className="text-primary underline">{t("backToUsers")}</Link>
        {" · "}
        <Link href={`/admin/billing?${new URLSearchParams({ user: user.id })}`} className="text-primary underline">{t("toBilling")}</Link>
      </p>
      <h1 className="text-2xl font-bold break-all">{t("userTitle", { email: user.email })}</h1>
      <p className="text-sm text-muted-foreground">{t("userHelp", { take: TAKE })}</p>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm" data-testid="user-activity">
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="px-4 py-2">{t("when")}</th>
              <th scope="col" className="px-4 py-2">{t("what")}</th>
              <th scope="col" className="px-4 py-2">{t("details")}</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => {
              const { what, details } = describe(e);
              return (
                <tr key={`${e.kind}-${e.at.getTime()}-${i}`} className="border-t border-border align-top" data-kind={e.kind}>
                  <td className="whitespace-nowrap px-4 py-2 tabular-nums">{when(e.at)}</td>
                  <td className="px-4 py-2 font-medium">{what}</td>
                  <td className="px-4 py-2 text-muted-foreground">{details}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <h2 className="text-lg font-semibold">{t("failedTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("failedHelp", { shown: failed.rows.length, total: failed.total })}</p>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm" data-testid="user-failed-logins">
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="px-4 py-2">{t("when")}</th>
              <th scope="col" className="px-4 py-2">{t("what")}</th>
              <th scope="col" className="px-4 py-2">{t("details")}</th>
            </tr>
          </thead>
          <tbody>
            {failed.rows.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-3 text-muted-foreground">{t("noFailed")}</td></tr>
            )}
            {failed.rows.map((l) => (
              <tr key={l.id} className="border-t border-border align-top" data-kind={l.kind}>
                <td className="whitespace-nowrap px-4 py-2 tabular-nums">{when(l.createdAt)}</td>
                <td className="px-4 py-2 font-medium">{t(`login_${l.kind}`)}</td>
                <td className="px-4 py-2 text-muted-foreground">{t("ip", { ip: l.ip })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
