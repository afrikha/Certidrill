import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const h = vi.hoisted(() => ({ codes: [] as string[], headers: new Headers() }));
vi.mock("@/lib/db", () => ({ prisma: { certification: { findMany: async () => h.codes.map((code) => ({ code })) } } }));
vi.mock("next/headers", () => ({ headers: async () => h.headers }));

import { languageAlternates, localizedPath, parseLocalizedPath, preferredLocale } from "@/lib/i18n/routing";
import { currentPublicPage } from "@/lib/i18n/public-page";
import { activeCodes, jsonLd, publicPageMetadata, publicPages, siteUrl } from "@/lib/seo";
import { config, proxy } from "@/proxy";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

afterEach(() => vi.unstubAllEnvs());

const req = (path: string, headers: Record<string, string> = {}) => new NextRequest(new URL(path, "https://certidrill.com"), { headers });

describe("localized public addresses", () => {
  it("maps a public page to one address per language and back", () => {
    expect(localizedPath("fr", "/")).toBe("/fr");
    expect(localizedPath("en", "/pricing")).toBe("/en/pricing");
    expect(parseLocalizedPath("/fr")).toEqual({ locale: "fr", path: "/" });
    expect(parseLocalizedPath("/fr/")).toEqual({ locale: "fr", path: "/" });
    expect(parseLocalizedPath("/en/pricing")).toEqual({ locale: "en", path: "/pricing" });
    for (const other of ["/", "/pricing", "/de", "/de/pricing", "/fr/dashboard", "/fr/pricing/x", "/login"]) expect(parseLocalizedPath(other)).toBeNull();
  });

  it("picks the cookie, else the first supported Accept-Language, else English", () => {
    expect(preferredLocale("fr", "en-US")).toBe("fr");
    expect(preferredLocale("de", "de-DE,fr;q=0.8,en;q=0.5")).toBe("fr");
    expect(preferredLocale(undefined, "FR-ca")).toBe("fr");
    expect(preferredLocale(undefined, null)).toBe("en");
    expect(preferredLocale(undefined, "ja,zh")).toBe("en");
  });

  it("lists every language of a page, x-default being English", () => {
    expect(languageAlternates("/pricing")).toEqual({ en: "/en/pricing", fr: "/fr/pricing", "x-default": "/en/pricing" });
  });

  it("covers in the proxy matcher exactly the public pages, bare and prefixed", () => {
    const pages = publicPages().map((p) => p.url);
    expect([...config.matcher].sort()).toEqual([...pages, "/", "/pricing"].sort());
  });
});

describe("proxy", () => {
  it("redirects a bare public page to the visitor's language, query kept, without caching across visitors", () => {
    const res = proxy(req("/pricing?certification=az-104", { "accept-language": "fr-FR,fr;q=0.9" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://certidrill.com/fr/pricing?certification=az-104");
    expect(res.headers.get("vary")).toBe("Cookie, Accept-Language");
    const fromCookie = proxy(req("/", { "accept-language": "fr", cookie: "NEXT_LOCALE=en" }));
    expect(fromCookie.headers.get("location")).toBe("https://certidrill.com/en");
  });

  it("serves a prefixed page from the bare one, tells it the language, and makes the cookie follow", () => {
    const res = proxy(req("/fr/pricing?certification=az-104", { "x-certidrill-path": "/forged" }));
    expect(res.headers.get("x-middleware-rewrite")).toBe("https://certidrill.com/pricing?certification=az-104");
    // Request headers passed upstream, the client's own value replaced.
    expect(res.headers.get("x-middleware-request-x-certidrill-locale")).toBe("fr");
    expect(res.headers.get("x-middleware-request-x-certidrill-path")).toBe("/pricing");
    const cookie = res.cookies.get("NEXT_LOCALE");
    expect(cookie).toMatchObject({ value: "fr", httpOnly: true, sameSite: "lax", path: "/" });
    // A session cookie: opening an address is not a choice.
    expect(cookie?.maxAge).toBeUndefined();
    expect(cookie?.expires).toBeUndefined();

    const same = proxy(req("/fr", { cookie: "NEXT_LOCALE=fr" }));
    expect(same.headers.get("x-middleware-rewrite")).toBe("https://certidrill.com/");
    expect(same.cookies.get("NEXT_LOCALE")).toBeUndefined();
  });

  it("lets any other address through", () => {
    const res = proxy(req("/login"));
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("metadata", () => {
  it("knows the public page being rendered only from both proxy headers, checked", async () => {
    h.headers = new Headers({ "x-certidrill-locale": "fr", "x-certidrill-path": "/pricing" });
    expect(await currentPublicPage()).toEqual({ locale: "fr", path: "/pricing" });
    h.headers = new Headers({ "x-certidrill-locale": "fr", "x-certidrill-path": "/dashboard" });
    expect(await currentPublicPage()).toBeNull();
    h.headers = new Headers({ "x-certidrill-path": "/" });
    expect(await currentPublicPage()).toBeNull();
  });

  it("names the active certifications in titles, or none", async () => {
    h.codes = ["az-104", "az-305"];
    expect(await activeCodes()).toBe("AZ-104 · AZ-305");
    h.codes = [];
    expect(await activeCodes()).toBe("none");
  });

  it("gives a public page its canonical address, its translations and its cards", () => {
    const m = publicPageMetadata({ locale: "fr", path: "/pricing", title: "Tarifs", description: "D" });
    expect(m.alternates).toEqual({ canonical: "/fr/pricing", languages: { en: "/en/pricing", fr: "/fr/pricing", "x-default": "/en/pricing" } });
    expect(m.openGraph).toMatchObject({ url: "/fr/pricing", locale: "fr_FR", alternateLocale: ["en_US"], siteName: "Certidrill", title: "Tarifs" });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "Tarifs" });
    expect(m.openGraph?.images).toEqual([{ url: "/opengraph-image", width: 1200, height: 630, alt: expect.any(String) }]);
  });

  it("reads the site address from AUTH_URL, ignoring a missing or invalid one", () => {
    expect(siteUrl("https://certidrill.com")?.origin).toBe("https://certidrill.com");
    expect(siteUrl("")).toBeNull();
    expect(siteUrl("not a url")).toBeNull();
  });

  it("escapes < in JSON-LD so a value cannot close the script element", () => {
    expect(jsonLd({ name: "</script><script>alert(1)</script>" })).not.toContain("<");
    expect(JSON.parse(jsonLd({ name: "a<b" }))).toEqual({ name: "a<b" });
  });
});

describe("robots.txt and sitemap.xml", () => {
  it("keeps the private areas out of crawling and points at the sitemap", () => {
    vi.stubEnv("AUTH_URL", "https://certidrill.com");
    const r = robots();
    expect(r.sitemap).toBe("https://certidrill.com/sitemap.xml");
    const rules = Array.isArray(r.rules) ? r.rules[0]! : r.rules;
    expect(rules.allow).toBe("/");
    for (const p of ["/api/", "/admin", "/dashboard", "/account", "/exam/", "/results/"]) expect(rules.disallow).toContain(p);
    vi.stubEnv("AUTH_URL", "");
    expect(robots().sitemap).toBeUndefined();
  });

  it("lists every public page in every language with absolute hreflang links", () => {
    vi.stubEnv("AUTH_URL", "https://certidrill.com");
    const entries = sitemap();
    expect(entries.map((e) => e.url)).toEqual(["https://certidrill.com/en", "https://certidrill.com/fr", "https://certidrill.com/en/pricing", "https://certidrill.com/fr/pricing"]);
    expect(entries[1]!.alternates?.languages).toEqual({ en: "https://certidrill.com/en", fr: "https://certidrill.com/fr", "x-default": "https://certidrill.com/en" });
    vi.stubEnv("AUTH_URL", "");
    expect(sitemap()).toEqual([]);
  });
});
