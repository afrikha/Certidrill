/** The visitor's language choice, read by i18n/request.ts and the proxy. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** One year, first-party only, never read by scripts. */
export function localeCookieOptions() {
  return {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}
