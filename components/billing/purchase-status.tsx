"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { api } from "@/components/exam/api";
import { buttonClasses } from "@/components/ui/button";

export interface Purchase {
  status: "pending" | "paid" | "held" | "failed" | "expired" | "refunded";
  certification: string;
  startsAt: string | null;
  expiresAt: string | null;
  chained: boolean;
}

/** Waits for the webhook: the page only shows what the server has recorded, it never grants anything. */
const POLL_MS = 2000;
const GIVE_UP_MS = 90_000;

export function PurchaseStatus({ sessionId, initial }: Readonly<{ sessionId: string; initial: Purchase }>) {
  const t = useTranslations("billing");
  const format = useFormatter();
  const [purchase, setPurchase] = useState(initial);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (purchase.status !== "pending") return;
    const started = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - started > GIVE_UP_MS) {
        setSlow(true);
        clearInterval(timer);
        return;
      }
      try {
        const next = await api<Purchase>(`/api/billing/status?${new URLSearchParams({ session_id: sessionId })}`);
        if (next.status !== "pending") {
          setPurchase(next);
          clearInterval(timer);
        }
      } catch {
        // A network hiccup: the next tick tries again.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [purchase.status, sessionId]);

  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "long" });
  const certification = purchase.certification.toUpperCase();
  let message: string;
  if (purchase.status === "paid" && purchase.expiresAt && purchase.startsAt) {
    message = purchase.chained
      ? t("successPaidLater", { certification, start: date(purchase.startsAt), date: date(purchase.expiresAt) })
      : t("successPaid", { certification, date: date(purchase.expiresAt) });
  } else if (purchase.status === "pending") {
    message = slow ? t("successSlow") : t("successPending");
  } else if (purchase.status === "paid" || purchase.status === "held") {
    // Paid but no Pass (yet): held for a check, nothing more to wait for here.
    message = t("successHeld");
  } else {
    const key = { failed: "successFailed", expired: "successExpired", refunded: "successRefunded" } as const;
    message = t(key[purchase.status]);
  }

  return (
    <div className="space-y-6" data-testid="purchase-status" data-status={purchase.status}>
      <p role="status" className="text-lg">{message}</p>
      <div className="flex flex-wrap gap-3">
        {purchase.status === "paid" && <Link href="/dashboard" className={buttonClasses("primary")}>{t("toDashboard")}</Link>}
        {(purchase.status === "failed" || purchase.status === "expired") && <Link href="/pricing" className={buttonClasses("primary")}>{t("backToPricing")}</Link>}
        <Link href="/account/billing" className={buttonClasses("secondary")}>{t("toBilling")}</Link>
      </div>
    </div>
  );
}
