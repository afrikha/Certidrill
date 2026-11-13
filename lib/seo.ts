import type { Metadata } from "next";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { locales, type Locale } from "@/lib/i18n/config";
import { SHARE_IMAGE } from "@/lib/share-image";
import { OG_LOCALE, PUBLIC_PATHS, languageAlternates, localizedPath, type PublicPath } from "@/lib/i18n/routing";

export const SITE_NAME = "Certidrill";

/** The public address of the site (AUTH_URL, as for the links in e-mails), or null when not configured. */
export function siteUrl(base = process.env.AUTH_URL): URL | null {
  if (!base) return null;
  try {
    return new URL(base);
  } catch {
    return null;
  }
}

/** "AZ-104" (or "AZ-104 · AZ-305"), "none" without an active certification: the value of {codes} in the seo messages. */
export const activeCodes = cache(async (): Promise<string> => {
  const rows = await prisma.certification.findMany({ where: { active: true }, orderBy: { code: "asc" }, select: { code: true } });
  return rows.length ? rows.map((c) => c.code.toUpperCase()).join(" · ") : "none";
});

/**
 * Metadata of a public page: its canonical address, the hreflang links to the
 * same page in every language, and the Open Graph and X (Twitter) cards. The
 * image is named here: an openGraph object set by a page replaces the one
 * that app/opengraph-image.tsx adds at the root.
 */
export function publicPageMetadata({ locale, path, title, description }: { locale: Locale; path: PublicPath; title: string; description: string }): Metadata {
  const url = localizedPath(locale, path);
  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url,
      title,
      description,
      locale: OG_LOCALE[locale],
      alternateLocale: locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      images: [SHARE_IMAGE],
    },
    twitter: { card: "summary_large_image", title, description, images: [SHARE_IMAGE] },
  };
}

/** Pages kept out of search results (sign-in, the application, the admin): not indexed, links not followed. */
export const NO_INDEX: Metadata = { robots: { index: false, follow: false } };

/** Every public page in every language, for the sitemap. */
export function publicPages(): { path: PublicPath; locale: Locale; url: string }[] {
  return PUBLIC_PATHS.flatMap((path) => locales.map((locale) => ({ path, locale, url: localizedPath(locale, path) })));
}

/** A JSON-LD script body: `<` escaped so that no value can close the script element. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
