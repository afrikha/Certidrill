import type { MetadataRoute } from "next";
import { languageAlternates } from "@/lib/i18n/routing";
import { publicPages, siteUrl } from "@/lib/seo";

// AUTH_URL is read when serving, not when building the image.
export const dynamic = "force-dynamic";

/** Every public page in every language, each listing its translations (hreflang). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  if (!base) return [];
  const absolute = (path: string) => new URL(path, base).href;
  return publicPages().map(({ path, url }) => ({
    url: absolute(url),
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.8,
    alternates: { languages: Object.fromEntries(Object.entries(languageAlternates(path)).map(([l, u]) => [l, absolute(u)])) },
  }));
}
