export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/** A user-facing text stored in every supported language. */
export type Localized = Record<Locale, string>;

export function pick(text: Localized, locale: Locale): string {
  return text[locale] ?? text[defaultLocale];
}
