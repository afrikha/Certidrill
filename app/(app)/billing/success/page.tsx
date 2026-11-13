import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { BillingError, purchaseStatus } from "@/lib/billing/checkout";
import { PurchaseStatus, type Purchase } from "@/components/billing/purchase-status";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Purchase" };
export const dynamic = "force-dynamic";

/**
 * Where Stripe sends the buyer back after paying. Reaching it grants nothing:
 * the page shows the payment as the webhook recorded it, and waits for it.
 */
export default async function PurchaseSuccessPage({ searchParams }: Readonly<{ searchParams: Promise<{ session_id?: string | string[] }> }>) {
  const user = await requireUser();
  const t = await getTranslations("billing");
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : "";
  let initial: Purchase | null = null;
  if (sessionId) {
    try {
      initial = await purchaseStatus(prisma, user.id, sessionId);
    } catch (err) {
      if (!(err instanceof BillingError)) throw err;
    }
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{t("successTitle")}</h1>
      <Card>{initial ? <PurchaseStatus sessionId={sessionId} initial={initial} /> : <p role="status">{t("successUnknown")}</p>}</Card>
    </div>
  );
}
