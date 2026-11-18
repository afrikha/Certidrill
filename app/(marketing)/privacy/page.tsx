import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "Privacy" };

/** Date of the policy's last change: update it with the text (messages, namespace privacy). */
const UPDATED = new Date("2026-11-18T00:00:00Z");
const SECTIONS = ["controller", "data", "purposes", "recipients", "retention", "rights", "cookies"] as const;

/**
 * The information owed to users (RGPD art. 13): what the site collects, why,
 * for how long, who sees it and their rights. Linked from the footer of every
 * public page and from the sign-up form.
 */
export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
  const format = await getFormatter();
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("updated", { date: format.dateTime(UPDATED, { dateStyle: "long", timeZone: "UTC" }) })}</p>
      </header>
      {SECTIONS.map((key) => (
        <section key={key} className="space-y-3" data-section={key}>
          <h2 className="text-xl font-semibold">{t(`sections.${key}.title`)}</h2>
          {(t.raw(`sections.${key}.body`) as string[]).map((paragraph) => (
            <p key={paragraph} className="leading-relaxed">{paragraph}</p>
          ))}
        </section>
      ))}
    </div>
  );
}
