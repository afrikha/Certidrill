import { headers } from "next/headers";
import { isLocale, type Locale } from "./config";
import { LOCALE_HEADER, PATH_HEADER, isPublicPath, type PublicPath } from "./routing";

/** The public page being rendered (set by the proxy), or null outside the public pages. */
export async function currentPublicPage(): Promise<{ locale: Locale; path: PublicPath } | null> {
  const h = await headers();
  const locale = h.get(LOCALE_HEADER);
  const path = h.get(PATH_HEADER);
  return isLocale(locale) && isPublicPath(path) ? { locale, path } : null;
}
