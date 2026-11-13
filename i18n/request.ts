import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { LOCALE_COOKIE } from "@/lib/i18n/cookie";
import { LOCALE_HEADER, preferredLocale } from "@/lib/i18n/routing";

export { LOCALE_COOKIE } from "@/lib/i18n/cookie";

/**
 * Locale = the language of the address on a public page (/fr/pricing, set by
 * the proxy), else the explicit cookie (set from the user's preference), else
 * Accept-Language. A client sending LOCALE_HEADER itself only picks its own
 * language.
 */
export async function resolveLocale(): Promise<Locale> {
  const h = await headers();
  const fromPath = h.get(LOCALE_HEADER);
  if (isLocale(fromPath)) return fromPath;
  return preferredLocale((await cookies()).get(LOCALE_COOKIE)?.value, h.get("accept-language"));
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
