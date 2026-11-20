"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { api, ApiError } from "@/components/exam/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_CART } from "@/lib/billing/cart";
import { groupByVendor } from "@/lib/vendors";

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
 * The purchase of one Pass or several at once (a cart: one Pass per
 * certification, one payment): asks the server for a Stripe Checkout session
 * (only the plan and the certifications are sent, never a price), then goes
 * to Stripe's payment page. The total shown is for information: the server
 * reads the prices again. The waiver box (terms accepted, immediate access,
 * right of withdrawal waived) must be ticked first: the server refuses a
 * purchase without it, and stores the text shown, in the page's language.
 */
export function BuyPass({
  planCode,
  certifications,
  defaultCertification,
  className,
}: Readonly<{
  planCode: string;
  /** The certifications on sale, with their price and vendor (certification.vendor). */
  certifications: readonly { code: string; title: string; vendor?: string; amountCents: number; currency: string }[];
  /** Ticked first: one code, or several separated by commas (a cart back from Stripe). */
  defaultCertification?: string;
  className?: string;
}>) {
  const t = useTranslations("billing");
  const tVendor = useTranslations("vendors");
  const format = useFormatter();
  // Several vendors: the certifications under their vendor's name, with a filter (the ticked ones stay ticked).
  const groups = groupByVendor(certifications.map((c) => ({ ...c, vendor: c.vendor ?? "" })));
  const [vendorShown, setVendorShown] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(() => {
    // One code, or a cart back from Stripe ("a,b"): the known ones, in the limit.
    const wanted = (defaultCertification ?? "").split(",").filter((code) => certifications.some((c) => c.code === code));
    const first = certifications[0]?.code;
    if (wanted.length > 0) return [...new Set(wanted)].slice(0, MAX_CART);
    return first ? [first] : [];
  });
  const waiverId = useId();
  const [waived, setWaived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      // In the order of the list, whatever the order of the clicks.
      const certificationCodes = certifications.filter((c) => selected.includes(c.code)).map((c) => c.code);
      const { url } = await api<{ url: unknown }>("/api/billing/checkout", { method: "POST", body: { planCode, certificationCodes, waiver: true } });
      if (!isPaymentUrl(url)) throw new Error("unexpected payment page address");
      window.location.assign(url);
    } catch (err) {
      const code = err instanceof ApiError && KNOWN_ERRORS.has(err.code) ? err.code : "generic";
      setError(t(`error_${code}`));
      setBusy(false);
    }
  }

  const toggle = (code: string, on: boolean) => setSelected((s) => (on ? [...s, code] : s.filter((c) => c !== code)));
  const money = (cents: number, currency: string) => format.number(cents / 100, { style: "currency", currency: currency.toUpperCase() });
  const chosen = certifications.filter((c) => selected.includes(c.code));
  const currencies = new Set(chosen.map((c) => c.currency.toLowerCase()));
  const total = currencies.size === 1 ? money(chosen.reduce((n, c) => n + c.amountCents, 0), chosen[0]!.currency) : null;
  const full = selected.length >= MAX_CART;
  return (
    <div className={cn("space-y-3", className)}>
      {certifications.length > 1 && (
        <fieldset className="space-y-1 text-left">
          <legend className="text-sm font-medium">{t("certifications")}</legend>
          {groups.length > 1 && (
            <div role="group" aria-label={tVendor("filterLabel")} className="flex flex-wrap gap-2 py-1" data-testid="cart-vendors">
              {[{ key: null, name: tVendor("filterAll") }, ...groups.map((g) => ({ key: g.vendor.key, name: g.vendor.name }))].map((v) => (
                <button
                  key={v.key ?? "all"}
                  type="button"
                  aria-pressed={vendorShown === v.key}
                  onClick={() => setVendorShown(v.key)}
                  className={cn("rounded-full border px-2.5 py-0.5 text-xs", vendorShown === v.key ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}
          <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-2" data-testid="cart">
            {groups.flatMap((g) => [
              ...(groups.length > 1 ? [{ heading: g.vendor }] : []),
              ...g.certifications.map((c) => ({ certification: c, vendor: g.vendor })),
            ]).map((row) => {
              if ("heading" in row) {
                return (
                  <li key={`vendor-${row.heading.key}`} hidden={vendorShown !== null && vendorShown !== row.heading.key} className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {row.heading.name}
                  </li>
                );
              }
              const c = row.certification;
              const on = selected.includes(c.code);
              return (
                <li key={c.code} hidden={vendorShown !== null && vendorShown !== row.vendor.key}>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 accent-primary"
                      checked={on}
                      disabled={!on && full}
                      onChange={(e) => toggle(c.code, e.target.checked)}
                    />
                    <span className="flex-1">
                      <span className="font-mono font-semibold">{c.code.toUpperCase()}</span> — {c.title}
                    </span>
                    <span className="tabular-nums">{money(c.amountCents, c.currency)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {full && <p className="text-xs text-muted-foreground">{t("cartFull", { count: MAX_CART })}</p>}
        </fieldset>
      )}
      {total && (
        <p className="text-sm font-medium" data-testid="pass-price" aria-live="polite">
          {t("cartTotal", { count: chosen.length, total })}
        </p>
      )}
      <div className="space-y-1 text-left text-xs" data-testid="waiver">
        <label htmlFor={waiverId} className="flex items-start gap-2">
          <input id={waiverId} type="checkbox" className="mt-0.5 size-4 shrink-0 accent-primary" checked={waived} onChange={(e) => setWaived(e.target.checked)} required />
          <span>{t("waiver")}</span>
        </label>
        <Link href="/terms" className="ml-6 inline-block text-primary underline" target="_blank" rel="noopener">{t("waiverRead")}</Link>
      </div>
      <Button type="button" onClick={buy} disabled={busy || chosen.length === 0 || !waived} className="w-full py-2.5" data-testid="buy-pass">
        {busy ? t("redirecting") : t("buyMany", { count: chosen.length })}
      </Button>
      {!waived && chosen.length > 0 && <p className="text-xs text-muted-foreground">{t("waiverRequired")}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
