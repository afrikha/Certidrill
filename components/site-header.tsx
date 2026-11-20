import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { hasVisibleCourse } from "@/lib/course/read";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/i18n/routing";
import { activeCatalog, joinNames } from "@/lib/catalog";
import { LocaleSwitcher } from "./locale-switcher";

export async function SiteHeader() {
  const session = await auth();
  const t = await getTranslations("common");
  const current = await getLocale();
  const locale = isLocale(current) ? current : defaultLocale;
  const user = session?.user;
  const course = user?.id ? await hasVisibleCourse(prisma, { userId: user.id, isAdmin: user.role === "admin" }) : false;
  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3" aria-label="Main">
        <Link href={localizedPath(locale, "/")} className="text-lg font-bold tracking-tight">
          Certi<span className="text-primary">drill</span>
        </Link>
        {/* Wraps on a phone rather than widening the page. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href={localizedPath(locale, "/pricing")} className="hover:underline">{t("pricing")}</Link>
          {session?.user ? (
            <>
              <Link href="/dashboard" className="hover:underline">{t("dashboard")}</Link>
              {course && <Link href="/course" className="hover:underline">{t("course")}</Link>}
              <Link href="/account" className="hover:underline">{t("account")}</Link>
              {session.user.role === "admin" && <Link href="/admin/users" className="hover:underline">{t("admin")}</Link>}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="hover:underline">{t("signOut")}</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="hover:underline">{t("signIn")}</Link>
          )}
          <LocaleSwitcher />
        </div>
      </nav>
    </header>
  );
}

export async function SiteFooter() {
  const t = await getTranslations("common");
  const [tp, tl, tt, tv, locale, { vendors }] = await Promise.all([getTranslations("privacy"), getTranslations("legal"), getTranslations("terms"), getTranslations("vendors"), getLocale(), activeCatalog()]);
  // The vendors of the active certifications, and their trademark notices.
  const trademarks = vendors.map((v) => tv(v.key + ".trademark") + " ").join("");
  const disclaimer = t("disclaimer", { vendors: joinNames(locale, vendors.map((v) => v.name), "disjunction"), trademarks });
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto max-w-6xl space-y-2 px-4 py-6 text-xs text-muted-foreground">
        <p data-testid="disclaimer">{disclaimer}</p>
        <p className="space-x-4">
          <Link href="/legal" className="underline hover:text-foreground">{tl("link")}</Link>
          <Link href="/privacy" className="underline hover:text-foreground">{tp("link")}</Link>
          <Link href="/terms" className="underline hover:text-foreground">{tt("link")}</Link>
        </p>
      </div>
    </footer>
  );
}
