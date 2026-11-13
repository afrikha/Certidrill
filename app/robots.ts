import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

// AUTH_URL is read when serving, not when building the image.
export const dynamic = "force-dynamic";

/**
 * Crawlers may read the public pages and the sign-in pages (which carry a
 * noindex tag); the application, the admin and the API are behind sign-in and
 * not crawled at all.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/dashboard", "/account", "/exam/", "/results/", "/billing/", "/offer"],
    },
    ...(base && { sitemap: new URL("/sitemap.xml", base).href }),
  };
}
