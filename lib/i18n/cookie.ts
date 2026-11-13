/** The visitor's language choice, read by i18n/request.ts and the proxy. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * First-party only, never read by scripts. A language the visitor chose
 * (setLocale) is kept one year; one set by the proxy because the visitor opened
 * /fr or /en is a session cookie, gone when the browser closes, since no choice
 * was made. Neither changes the language of the account (User.locale, used for
 * e-mails), which only setLocale writes.
 */
export function localeCookieOptions({ chosen }: { chosen: boolean }) {
  return {
    path: "/",
    ...(chosen && { maxAge: 365 * 24 * 60 * 60 }),
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}
