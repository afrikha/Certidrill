import { getLocale, getTranslations } from "next-intl/server";
import { isLocale, type Locale } from "@/lib/i18n/config";

/** Whether the content of a certification is shown in another language than the interface (docs/SPECS-AWS.md §3.7). */
export function contentNotInLocale(languages: readonly string[], locale: Locale): boolean {
  return !languages.includes(locale);
}

/**
 * The note shown on the course, the exam, the correction and the report of a
 * certification offered in English only, when the interface is in French.
 * `locale`: the language of the page when it is not the interface's (an exam, a report, a correction).
 */
export async function EnglishOnlyNotice({ languages, locale: given, className }: Readonly<{ languages: readonly string[]; locale?: string; className?: string }>) {
  const locale = given ?? (await getLocale());
  if (!isLocale(locale) || !contentNotInLocale(languages, locale)) return null;
  const t = await getTranslations({ locale, namespace: "common" });
  return (
    <p role="note" data-testid="english-only" className={className ?? "rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"}>
      {t("englishOnly")}
    </p>
  );
}

/** The "English only" label of a certification in a catalogue, when the interface is in French; nothing otherwise. */
export async function EnglishOnlyBadge({ languages }: Readonly<{ languages: readonly string[] }>) {
  const locale = await getLocale();
  if (!isLocale(locale) || !contentNotInLocale(languages, locale)) return null;
  const t = await getTranslations("common");
  return <span data-testid="english-only-badge" className="ml-2 rounded-full border border-border px-2 py-0.5 text-xs font-normal text-muted-foreground">{t("englishOnlyBadge")}</span>;
}
