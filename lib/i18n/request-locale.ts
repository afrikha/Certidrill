import type { Locale } from "./config";
import { cookieLocale } from "./cookie";
import { preferredLocale } from "./routing";

/**
 * The language the application pages are shown in, read from a request
 * itself (an API route, outside the rendering): the language cookies, then
 * Accept-Language, as i18n/request.ts does for pages.
 */
export function requestLocale(request: Request): Locale {
  const jar = new Map<string, string>();
  for (const pair of (request.headers.get("cookie") ?? "").split(";")) {
    const at = pair.indexOf("=");
    if (at > 0) jar.set(pair.slice(0, at).trim(), pair.slice(at + 1).trim());
  }
  return preferredLocale(cookieLocale((name) => jar.get(name)), request.headers.get("accept-language"));
}
