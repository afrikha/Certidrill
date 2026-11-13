"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/components/exam/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const KNOWN_ERRORS = new Set(["sales_closed", "unavailable", "email_unverified", "rate_limited"]);

/**
 * The purchase button of a Pass: asks the server for a Stripe Checkout
 * session (only the plan and the certification are sent, never a price),
 * then goes to Stripe's payment page.
 */
export function BuyPass({
  planCode,
  certifications,
  defaultCertification,
  className,
}: Readonly<{ planCode: string; certifications: readonly { code: string; title: string }[]; defaultCertification?: string; className?: string }>) {
  const t = useTranslations("billing");
  const [certification, setCertification] = useState(
    certifications.some((c) => c.code === defaultCertification) ? defaultCertification! : (certifications[0]?.code ?? ""),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api<{ url: string }>("/api/billing/checkout", { method: "POST", body: { planCode, certificationCode: certification } });
      window.location.assign(url);
    } catch (err) {
      const code = err instanceof ApiError && KNOWN_ERRORS.has(err.code) ? err.code : "generic";
      setError(t(`error_${code}`));
      setBusy(false);
    }
  }

  const selectId = `buy-${planCode}-certification`;
  return (
    <div className={cn("space-y-3", className)}>
      {certifications.length > 1 && (
        <div className="space-y-1 text-left">
          <label htmlFor={selectId} className="text-sm font-medium">{t("certification")}</label>
          <select
            id={selectId}
            value={certification}
            onChange={(e) => setCertification(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {certifications.map((c) => (
              <option key={c.code} value={c.code}>{c.code.toUpperCase()} — {c.title}</option>
            ))}
          </select>
        </div>
      )}
      <Button type="button" onClick={buy} disabled={busy || !certification} className="w-full py-2.5" data-testid="buy-pass">
        {busy ? t("redirecting") : t("buy")}
      </Button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
