import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { isLocale } from "@/lib/i18n/config";
import { OG_LOCALE } from "@/lib/i18n/routing";
import { SITE_NAME, siteUrl } from "@/lib/seo";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("seo");
  return {
    // Relative addresses (canonical, hreflang, Open Graph image) are resolved against it.
    metadataBase: siteUrl(),
    applicationName: SITE_NAME,
    title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
    description: t("siteDescription"),
    openGraph: { type: "website", siteName: SITE_NAME, ...(isLocale(locale) && { locale: OG_LOCALE[locale] }) },
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
