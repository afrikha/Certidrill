export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/** A user-facing text stored in every supported language. */
export type Localized = Record<Locale, string>;

/** A content text: English always, French only when the certification offers it (docs/SPECS-AWS.md §3.7). */
export type ContentText = { en: string; fr?: string };

/** The text in that locale, or in English when it has none (content offered in English only). */
export function pick(text: ContentText, locale: Locale): string {
  return text[locale] || text.en;
}
