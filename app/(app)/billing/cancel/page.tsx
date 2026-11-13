import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";

export const metadata = { title: "Payment cancelled" };

/** Where Stripe sends the buyer back when they leave the payment page. Nothing was charged. */
export default async function PurchaseCancelPage({ searchParams }: Readonly<{ searchParams: Promise<{ certification?: string | string[] }> }>) {
  await requireUser();
  const t = await getTranslations("billing");
  const sp = await searchParams;
  const certification = typeof sp.certification === "string" ? sp.certification : null;
  const back = certification ? `/pricing?${new URLSearchParams({ certification })}` : "/pricing";
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("cancelTitle")}</h1>
      <Card className="space-y-6">
        <p>{t("cancelText")}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={back} className={buttonClasses("primary")}>{t("backToPricing")}</Link>
          <Link href="/dashboard" className={buttonClasses("secondary")}>{t("toDashboard")}</Link>
        </div>
      </Card>
    </div>
  );
}
