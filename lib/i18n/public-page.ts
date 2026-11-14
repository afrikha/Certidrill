import { headers } from "next/headers";
import { isLocale, type Locale } from "./config";
import { LOCALE_HEADER, PATH_HEADER, QUERY_HEADER, isPublicPath, keptQuery, type PublicPath } from "./routing";

/**
 * The public page being rendered, with the query a language change keeps,
 * from the headers the proxy sets on /en, /fr, /en/pricing and /fr/pricing
 * (replacing any value sent by the client), or null. Elsewhere the proxy does
 * not run and a client may send them itself: they only pick its own language
 * and the page (and parameters) its own language switcher returns to, so
 * nothing else may rely on them.
 */
export async function currentPublicPage(): Promise<{ locale: Locale; path: PublicPath; query: string } | null> {
  const h = await headers();
  const locale = h.get(LOCALE_HEADER);
  const path = h.get(PATH_HEADER);
  if (!isLocale(locale) || !isPublicPath(path)) return null;
  // Checked again: outside the proxy, the client may have sent it.
  const params = new URLSearchParams(h.get(QUERY_HEADER) ?? "");
  return { locale, path, query: keptQuery((n) => params.get(n)) };
}
