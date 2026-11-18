"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { api } from "@/components/exam/api";
import { buttonClasses } from "@/components/ui/button";

type Status = "pending" | "paid" | "held" | "failed" | "expired" | "refunded";

/** One purchase (one payment at Stripe): one Pass or several (a cart). */
export interface Purchase {
  status: Status;
  passes: { status: Status; certification: string; startsAt: string | null; expiresAt: string | null; chained: boolean }[];
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
  const passMessage = (pass: Purchase["passes"][number]) => {
    const certification = pass.certification.toUpperCase();
    if (!pass.expiresAt || !pass.startsAt) return t("successHeld");
    return pass.chained
      ? t("successPaidLater", { certification, start: date(pass.startsAt), date: date(pass.expiresAt) })
      : t("successPaid", { certification, date: date(pass.expiresAt) });
  };
  const granted = purchase.status === "paid" && purchase.passes.every((p) => p.status === "paid" && p.expiresAt && p.startsAt);
  let message: string;
  if (granted && purchase.passes.length === 1) {
    message = passMessage(purchase.passes[0]!);
  } else if (granted) {
    message = t("successPaidMany", { count: purchase.passes.length });
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
      {granted && purchase.passes.length > 1 && (
        <ul className="list-disc space-y-1 pl-5" data-testid="purchase-passes">
          {purchase.passes.map((p) => <li key={p.certification}>{passMessage(p)}</li>)}
        </ul>
      )}
      <div className="flex flex-wrap gap-3">
        {purchase.status === "paid" && <Link href="/dashboard" className={buttonClasses("primary")}>{t("toDashboard")}</Link>}
        {(purchase.status === "failed" || purchase.status === "expired") && <Link href="/pricing" className={buttonClasses("primary")}>{t("backToPricing")}</Link>}
        <Link href="/account/billing" className={buttonClasses("secondary")}>{t("toBilling")}</Link>
      </div>
    </div>
  );
}
