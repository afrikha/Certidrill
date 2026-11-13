import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import type { Locale } from "@/lib/i18n/config";
import { LOCALE_COOKIE } from "@/lib/i18n/cookie";
import { currentPublicPage } from "@/lib/i18n/public-page";
import { preferredLocale } from "@/lib/i18n/routing";

export { LOCALE_COOKIE } from "@/lib/i18n/cookie";

/**
 * Locale = the language of the address on a public page (/fr/pricing, both
 * headers set by the proxy and checked), else the explicit cookie (set from the
 * user's preference), else Accept-Language.
 */
export async function resolveLocale(): Promise<Locale> {
  const page = await currentPublicPage();
  if (page) return page.locale;
  return preferredLocale((await cookies()).get(LOCALE_COOKIE)?.value, (await headers()).get("accept-language"));
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
