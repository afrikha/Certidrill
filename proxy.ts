import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, localeCookieOptions } from "@/lib/i18n/cookie";
import { LOCALE_HEADER, PATH_HEADER, isPublicPath, localizedPath, parseLocalizedPath, preferredLocale } from "@/lib/i18n/routing";

/**
 * Public pages have one address per language (lib/i18n/routing.ts), so search
 * engines index each language and the hreflang links can point at them.
 *
 * - /fr/pricing is served by the /pricing page, told its language and path
 *   through request headers (read by i18n/request.ts and the locale switcher).
 *   The NEXT_LOCALE cookie follows that language, so the pages reached from
 *   there (sign-in, the application) stay in the language being read. It is
 *   then a session cookie: the visitor made no choice (lib/i18n/cookie.ts).
 * - /pricing is redirected (307: it depends on the visitor) to the visitor's
 *   language, the query kept.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const localized = parseLocalizedPath(pathname);

  if (!localized) {
    if (!isPublicPath(pathname)) return NextResponse.next();
    const locale = preferredLocale(request.cookies.get(LOCALE_COOKIE)?.value, request.headers.get("accept-language"));
    const url = request.nextUrl.clone();
    url.pathname = localizedPath(locale, pathname);
    url.search = search;
    const response = NextResponse.redirect(url, 307);
    response.headers.set("Vary", "Cookie, Accept-Language");
    return response;
  }

  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, localized.locale);
  headers.set(PATH_HEADER, localized.path);
  const url = request.nextUrl.clone();
  url.pathname = localized.path;
  const response = NextResponse.rewrite(url, { request: { headers } });
  if (request.cookies.get(LOCALE_COOKIE)?.value !== localized.locale) {
    response.cookies.set(LOCALE_COOKIE, localized.locale, localeCookieOptions({ chosen: false }));
  }
  return response;
}

export const config = {
  // Static list (read at build time): PUBLIC_PATHS, bare and under each locale.
  matcher: ["/", "/pricing", "/en", "/en/pricing", "/fr", "/fr/pricing"],
};
