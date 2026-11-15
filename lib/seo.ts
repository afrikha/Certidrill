import type { Metadata } from "next";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/log";
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
 * image is named here, its text in the page's language: an openGraph object
 * set by a page replaces the one that app/opengraph-image.tsx adds at the root.
 */
export function publicPageMetadata({ locale, path, title, description, imageAlt }: { locale: Locale; path: PublicPath; title: string; description: string; imageAlt: string }): Metadata {
  const url = localizedPath(locale, path);
  const image = { ...SHARE_IMAGE, alt: imageAlt };
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
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

/**
 * When the public pages last changed: their text comes with a new version of
 * the site (CERTIDRILL_BUILT_AT, set by next.config.ts), their prices with a
 * new plan (a price is never edited: a new tariff is a new plan). The latest of
 * the two, or undefined when neither is known. Without the database, the build
 * date alone: the sitemap still answers.
 */
export async function publicPagesModifiedAt(builtAt = process.env.CERTIDRILL_BUILT_AT): Promise<Date | undefined> {
  const built = builtAt ? new Date(builtAt) : null;
  let newestPlan: Date | null = null;
  try {
    newestPlan = (await prisma.plan.aggregate({ _max: { createdAt: true } }))._max.createdAt;
  } catch (err) {
    logError("seo.sitemap", err);
  }
  const dates = [built, newestPlan].filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()));
  return dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : undefined;
}

/** Pages kept out of search results (sign-in, the application, the admin): not indexed, links not followed. */
export const NO_INDEX: Metadata = { robots: { index: false, follow: false } };

/** Every public page in every language, for the sitemap. */
export function publicPages(): { path: PublicPath; locale: Locale; url: string }[] {
  return PUBLIC_PATHS.flatMap((path) => locales.map((locale) => ({ path, locale, url: localizedPath(locale, path) })));
}

/** A JSON-LD script body: `<` escaped so that no value can close the script element. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replaceAll("<", String.raw`\u003c`);
}
