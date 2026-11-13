import { headers } from "next/headers";
import { isLocale, type Locale } from "./config";
import { LOCALE_HEADER, PATH_HEADER, isPublicPath, type PublicPath } from "./routing";

/**
 * The public page being rendered, from the two headers the proxy sets on
 * /en, /fr, /en/pricing and /fr/pricing (replacing any value sent by the
 * client), or null. Elsewhere the proxy does not run and a client may send
 * them itself: they only pick its own language and the page its own language
 * switcher returns to, so nothing else may rely on them.
 */
export async function currentPublicPage(): Promise<{ locale: Locale; path: PublicPath } | null> {
  const h = await headers();
  const locale = h.get(LOCALE_HEADER);
  const path = h.get(PATH_HEADER);
  return isLocale(locale) && isPublicPath(path) ? { locale, path } : null;
}
