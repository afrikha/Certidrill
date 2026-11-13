import { isLocale, type Locale } from "./config";

/**
 * Two cookies, first-party only and never read by scripts:
 * - LOCALE_COOKIE, the language the visitor chose with the switcher
 *   (setLocale), kept one year. Only setLocale writes it, together with the
 *   language of the account (User.locale, used for e-mails).
 * - PAGE_LOCALE_COOKIE, the language of the last public page opened (/fr, /en),
 *   set by the proxy so that the pages reached from there (sign-in, the
 *   application) stay in the language being read. No choice was made: it is a
 *   session cookie, gone when the browser closes, and it never replaces the
 *   chosen one.
 */
export const LOCALE_COOKIE = "NEXT_LOCALE";
export const PAGE_LOCALE_COOKIE = "NEXT_LOCALE_PAGE";

export function localeCookieOptions({ chosen }: { chosen: boolean }) {
  return {
    path: "/",
    ...(chosen && { maxAge: 365 * 24 * 60 * 60 }),
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}

/** The language from the cookies: the last public page opened in this session, else the visitor's choice. */
export function cookieLocale(get: (name: string) => string | undefined): Locale | undefined {
  const page = get(PAGE_LOCALE_COOKIE);
  if (isLocale(page)) return page;
  const chosen = get(LOCALE_COOKIE);
  return isLocale(chosen) ? chosen : undefined;
}
