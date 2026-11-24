import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/guards";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { appVersion, STARTED_AT } from "@/lib/version";

/** Behind sign-in: kept out of search results. */
export { NO_INDEX as metadata } from "@/lib/seo";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  const t = await getTranslations("admin");
  const format = await getFormatter();
  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav aria-label={t("title")} className="mb-6 flex flex-wrap gap-x-4 gap-y-2 border-b border-border pb-3 text-sm">
          <span className="font-semibold">{t("title")}</span>
          <Link href="/admin/certifications" className="hover:underline">{t("certifications")}</Link>
          <Link href="/admin/questions" className="hover:underline">{t("questions")}</Link>
          <Link href="/admin/course" className="hover:underline">{t("course")}</Link>
          <Link href="/admin/users" className="hover:underline">{t("users")}</Link>
          <Link href="/admin/activity" className="hover:underline">{t("activity")}</Link>
          <Link href="/admin/billing" className="hover:underline">{t("billing")}</Link>
          <Link href="/admin/calibration" className="hover:underline">{t("calibration")}</Link>
        </nav>
        <main id="main">{children}</main>
        {/* The deployed version, for the administrators only (not in the public footer). */}
        <p className="mt-10 border-t border-border pt-3 text-xs text-muted-foreground" data-testid="app-version">
          {t("version", { version: appVersion(), started: format.dateTime(STARTED_AT, { dateStyle: "medium", timeStyle: "short" }) })}
        </p>
      </div>
      <SiteFooter />
    </>
  );
}
