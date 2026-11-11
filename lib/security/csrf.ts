/**
 * CSRF protection for the JSON API: mutating requests must come from our own
 * origin (Origin header, or Referer as a fallback). Session cookies are also
 * SameSite=Lax (Auth.js default).
 */
export function isSameOrigin(request: Request): boolean {
  const expected = new URL(request.url).host;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const hosts = new Set([expected, forwardedHost, request.headers.get("host")].filter(Boolean) as string[]);
  const source = request.headers.get("origin") ?? request.headers.get("referer");
  if (!source) return false;
  try {
    return hosts.has(new URL(source).host);
  } catch {
    return false;
  }
}
