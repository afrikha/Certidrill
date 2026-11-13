import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import type { Locale } from "@/lib/i18n/config";
import { cookieLocale } from "@/lib/i18n/cookie";
import { currentPublicPage } from "@/lib/i18n/public-page";
import { preferredLocale } from "@/lib/i18n/routing";

export { LOCALE_COOKIE } from "@/lib/i18n/cookie";

/**
 * Locale = the language of the address on a public page (/fr/pricing, both
 * headers set by the proxy and checked), else the cookies (the last public page
 * opened in this session, then the visitor's choice), else Accept-Language.
 */
export async function resolveLocale(): Promise<Locale> {
  const page = await currentPublicPage();
  if (page) return page.locale;
  const jar = await cookies();
  return preferredLocale(cookieLocale((n) => jar.get(n)?.value), (await headers()).get("accept-language"));
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "Europe/Paris",
  };
});

export { locales } from "@/lib/i18n/config";
