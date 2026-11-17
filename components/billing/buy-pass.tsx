"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/components/exam/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const KNOWN_ERRORS = new Set(["sales_closed", "unavailable", "email_unverified", "rate_limited"]);

/** Stripe's payment page is on HTTPS; plain HTTP only on this machine (the fake Stripe of the e2e tests). */
export function isPaymentUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  } catch {
    return false;
  }
}

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
}: Readonly<{
  planCode: string;
  /** The certifications on sale, with their formatted price when it may differ from one to another. */
  certifications: readonly { code: string; title: string; price?: string }[];
  defaultCertification?: string;
  className?: string;
}>) {
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
      const { url } = await api<{ url: unknown }>("/api/billing/checkout", { method: "POST", body: { planCode, certificationCode: certification } });
      if (!isPaymentUrl(url)) throw new Error("unexpected payment page address");
      window.location.assign(url);
    } catch (err) {
      const code = err instanceof ApiError && KNOWN_ERRORS.has(err.code) ? err.code : "generic";
      setError(t(`error_${code}`));
      setBusy(false);
    }
  }

  const selectId = `buy-${planCode}-certification`;
  // The price is shown next to the choice only when it depends on the certification.
  const prices = new Set(certifications.map((c) => c.price));
  const selectedPrice = prices.size > 1 ? certifications.find((c) => c.code === certification)?.price : undefined;
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
      {selectedPrice && (
        <p className="text-sm font-medium" data-testid="pass-price" aria-live="polite">
          {t("selectedPrice", { price: selectedPrice, code: certification.toUpperCase() })}
        </p>
      )}
      <Button type="button" onClick={buy} disabled={busy || !certification} className="w-full py-2.5" data-testid="buy-pass">
        {busy ? t("redirecting") : t("buy")}
      </Button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
