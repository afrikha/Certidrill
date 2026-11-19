import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "Terms of sale" };

const SECTIONS = ["scope", "service", "account", "price", "order", "access", "withdrawal", "conformity", "availability", "data", "mediation", "law", "changes"] as const;

/**
 * The terms of sale (CGV, offers lot C), accepted at each purchase with the
 * waiver of the right of withdrawal (components/billing/buy-pass.tsx). Their
 * version (lib/billing/terms.ts) is stored with each payment: change it with
 * the text. While a passage is still between square brackets, live payment
 * stays closed.
 */
export default async function TermsPage() {
  const [t, tp] = await Promise.all([getTranslations("terms"), getTranslations("privacy")]);
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("updated")}</p>
      </div>
      {SECTIONS.map((key) => (
        <section key={key} id={key} className="space-y-3" data-section={key}>
          <h2 className="text-xl font-semibold">{t(`sections.${key}.title`)}</h2>
          {(t.raw(`sections.${key}.body`) as string[]).map((paragraph) => (
            <p key={paragraph} className="leading-relaxed">{paragraph}</p>
          ))}
          {key === "data" && (
            <p><Link href="/privacy" className="text-primary underline">{tp("link")}</Link></p>
          )}
        </section>
      ))}
    </div>
  );
}
