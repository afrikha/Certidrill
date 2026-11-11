import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/guards";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  const t = await getTranslations("admin");
  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav aria-label={t("title")} className="mb-6 flex gap-4 border-b border-border pb-3 text-sm">
          <span className="font-semibold">{t("title")}</span>
          <Link href="/admin/questions" className="hover:underline">{t("questions")}</Link>
          <Link href="/admin/users" className="hover:underline">{t("users")}</Link>
        </nav>
        <main id="main">{children}</main>
      </div>
      <SiteFooter />
    </>
  );
}
