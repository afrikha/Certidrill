import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "Legal notice" };

const SECTIONS = ["publisher", "director", "host", "ip", "data"] as const;

/**
 * The legal notice owed by a website published by a company (LCEN art. 6-III):
 * publisher, publication director and host. Linked from the footer of every
 * public page, next to the privacy policy.
 */
export default async function LegalPage() {
  const [t, tp] = await Promise.all([getTranslations("legal"), getTranslations("privacy")]);
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      {SECTIONS.map((key) => (
        <section key={key} className="space-y-3" data-section={key}>
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
