import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, locales, type Locale } from "@/lib/i18n/config";

export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Locale = explicit cookie (set from the user's preference), else Accept-Language. */
export async function resolveLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const tag = part.split(";")[0]?.trim().slice(0, 2).toLowerCase();
    if (isLocale(tag)) return tag;
  }
  return defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "Europe/Paris",
  };
});

export { locales };
