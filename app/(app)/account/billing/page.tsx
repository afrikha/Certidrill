import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getAccessSummary } from "@/lib/access";
import { paymentHistory } from "@/lib/billing/checkout";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

/** The user's access per certification and their payments (specs des offres §7). */
export default async function AccountBillingPage() {
  const user = await requireUser();
  const t = await getTranslations("billing");
  const tAccess = await getTranslations("access");
  const tOffer = await getTranslations("offer");
  const format = await getFormatter();
  const [access, payments] = await Promise.all([getAccessSummary(prisma, user.id), paymentHistory(prisma, user.id)]);
  const date = (d: Date | string) => format.dateTime(new Date(d), { dateStyle: "medium" });
  const money = (cents: number, currency: string) => format.number(cents / 100, { style: "currency", currency: currency.toUpperCase() });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t("accountTitle")}</h1>
        <Link href="/pricing" className={buttonClasses("primary")}>{t("buyOrExtend")}</Link>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">{t("accessTitle")}</h2>
        <ul className="divide-y divide-border text-sm" data-testid="billing-access">
          {access.map((a) => (
            <li key={a.certification} className="flex flex-wrap items-center justify-between gap-2 py-2" data-certification={a.certification} data-level={a.level}>
              <span><span className="font-mono uppercase">{a.certification}</span> — {a.title}</span>
              <span className={cn("font-medium", a.level === "full" ? "text-success" : "text-muted-foreground")}>
                {a.level === "full" ? t("accessFull") : t("accessFree")}
                {a.level === "full" && a.source !== "pass" && tAccess(`full_${a.source}`) && <> ({tAccess(`full_${a.source}`)})</>}
                {a.expiresAt && <> · {t("accessUntil", { date: date(a.expiresAt) })}</>}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm" data-testid="payments">
          <caption className="px-4 pt-3 text-left font-semibold">{t("paymentsTitle")}</caption>
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="px-4 py-2">{t("date")}</th>
              <th scope="col" className="px-4 py-2">{t("offer")}</th>
              <th scope="col" className="px-4 py-2">{t("amount")}</th>
              <th scope="col" className="px-4 py-2">{t("status")}</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-3 text-muted-foreground">{t("noPayments")}</td></tr>
            )}
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-border" data-status={p.status}>
                <td className="whitespace-nowrap px-4 py-2">{date(p.paidAt ?? p.createdAt)}</td>
                <td className="px-4 py-2">
                  {tOffer(`name_${p.plan.kind}`)} <span className="font-mono uppercase">{p.certification.code}</span>
                  {p.entitlement && <span className="block text-xs text-muted-foreground">{date(p.entitlement.startsAt)} → {date(p.entitlement.expiresAt)}</span>}
                </td>
                <td className="px-4 py-2 tabular-nums">{p.chargedCents === null ? money(p.amountCents, p.currency) : money(p.chargedCents, p.chargedCurrency ?? p.currency)}</td>
                <td className="px-4 py-2">
                  {t(`status_${p.status}`)}
                  {p.invoiceUrl?.startsWith("https://") && <> · <a href={p.invoiceUrl} className="text-primary underline" rel="noopener noreferrer" target="_blank">{t("invoice")}</a></>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
