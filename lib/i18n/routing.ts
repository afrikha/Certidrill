import { defaultLocale, isLocale, locales, type Locale } from "./config";

/**
 * The public pages that search engines index, each served under one prefix per
 * language: /en, /fr, /en/pricing, /fr/pricing. The proxy (proxy.ts) rewrites
 * a prefixed address to the page itself and tells it the language through
 * LOCALE_HEADER; an address without prefix is redirected to the visitor's
 * language. The rest of the site (sign-in, the application, the admin) keeps a
 * single address and its language comes from the NEXT_LOCALE cookie.
 */
export const PUBLIC_PATHS = ["/", "/pricing"] as const;
export type PublicPath = (typeof PUBLIC_PATHS)[number];

/** Set by the proxy on a prefixed public page: its language, then its path without prefix. */
export const LOCALE_HEADER = "x-certidrill-locale";
export const PATH_HEADER = "x-certidrill-path";

export function isPublicPath(value: unknown): value is PublicPath {
  return typeof value === "string" && (PUBLIC_PATHS as readonly string[]).includes(value);
}

/** The address of a public page in one language: localizedPath("fr", "/") is "/fr". */
export function localizedPath(locale: Locale, path: PublicPath): string {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** "/fr/pricing" → { locale: "fr", path: "/pricing" }; null for any other address. */
export function parseLocalizedPath(pathname: string): { locale: Locale; path: PublicPath } | null {
  const [, first, ...rest] = pathname.split("/");
  if (!isLocale(first)) return null;
  const path = rest.length === 0 || (rest.length === 1 && rest[0] === "") ? "/" : `/${rest.join("/")}`;
  return isPublicPath(path) ? { locale: first, path } : null;
}

/** The visitor's language: the NEXT_LOCALE cookie (set from their choice), else Accept-Language, else English. */
export function preferredLocale(cookie: string | undefined, acceptLanguage: string | null | undefined): Locale {
  if (isLocale(cookie)) return cookie;
  for (const part of (acceptLanguage ?? "").split(",")) {
    const tag = part.split(";")[0]?.trim().slice(0, 2).toLowerCase();
    if (isLocale(tag)) return tag;
  }
  return defaultLocale;
}

/** Language → address of a public page, for hreflang links and the sitemap. x-default is the English page. */
export function languageAlternates(path: PublicPath): Record<Locale | "x-default", string> {
  const entries = locales.map((l) => [l, localizedPath(l, path)] as const);
  return { ...Object.fromEntries(entries), "x-default": localizedPath(defaultLocale, path) } as Record<Locale | "x-default", string>;
}

/** Open Graph locale tags (language_TERRITORY). */
export const OG_LOCALE: Record<Locale, string> = { en: "en_US", fr: "fr_FR" };
