import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { hasVisibleCourse } from "@/lib/course/read";
import { readSwitches } from "@/lib/settings";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/i18n/routing";
import { activeCatalog, joinNames } from "@/lib/catalog";
import { buttonClasses } from "@/components/ui/button";
import { LocaleSwitcher } from "./locale-switcher";

/** The mark and name of the site; the mark is decorative, the name is the link text. */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
      <svg viewBox="0 0 32 32" aria-hidden className="size-7 shrink-0">
        <defs>
          <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2563eb" />
            <stop offset="1" stopColor="#4f46e5" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#logo-gradient)" />
        <path d="m9.5 16.5 4.5 4.5 8.5-9.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>Certi<span className="text-primary">drill</span></span>
    </span>
  );
}

const navLink = "shrink-0 rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

export async function SiteHeader() {
  const session = await auth();
  const t = await getTranslations("common");
  const current = await getLocale();
  const locale = isLocale(current) ? current : defaultLocale;
  const user = session?.user;
  const [course, { signupOpen }] = await Promise.all([
    user?.id ? hasVisibleCourse(prisma, { userId: user.id, isAdmin: user.role === "admin" }) : false,
    user ? { signupOpen: false } : readSwitches(prisma),
  ]);
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/70">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5" aria-label="Main">
        <Link href={localizedPath(locale, "/")} className="rounded-md">
          <Logo />
        </Link>
        {/* On a phone, the links scroll sideways on their own line rather than widening the page. */}
        <div className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-1 overflow-x-auto px-4 pb-1 text-sm [scrollbar-width:none] sm:mx-0 sm:w-auto sm:overflow-visible sm:p-0">
          <Link href={localizedPath(locale, "/pricing")} className={navLink}>{t("pricing")}</Link>
          {user ? (
            <>
              <Link href="/dashboard" className={navLink}>{t("dashboard")}</Link>
              {course && <Link href="/course" className={navLink}>{t("course")}</Link>}
              <Link href="/account" className={navLink}>{t("account")}</Link>
              {user.role === "admin" && <Link href="/admin/users" className={navLink}>{t("admin")}</Link>}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className={navLink}>{t("signOut")}</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={navLink}>{t("signIn")}</Link>
              {signupOpen && <Link href="/signup" className={buttonClasses("primary", "ml-1 shrink-0 px-3 py-1.5")}>{t("signUp")}</Link>}
            </>
          )}
          <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />
          <LocaleSwitcher />
        </div>
      </nav>
    </header>
  );
}

export async function SiteFooter() {
  const t = await getTranslations("common");
  const [tp, tl, tt, tv, current, { vendors }] = await Promise.all([getTranslations("privacy"), getTranslations("legal"), getTranslations("terms"), getTranslations("vendors"), getLocale(), activeCatalog()]);
  const locale = isLocale(current) ? current : defaultLocale;
  // The vendors of the active certifications, and their trademark notices.
  const trademarks = vendors.map((v) => tv(v.key + ".trademark") + " ").join("");
  const disclaimer = t("disclaimer", { vendors: joinNames(locale, vendors.map((v) => v.name), "disjunction"), trademarks });
  const link = "text-muted-foreground transition-colors hover:text-foreground";
  return (
    <footer className="mt-16 border-t border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-[2fr_1fr_1fr]">
          <div className="col-span-2 sm:col-span-1">
            <Link href={localizedPath(locale, "/")} className="inline-block rounded-md"><Logo /></Link>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">{t("tagline")}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold">{t("footerProduct")}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href={`${localizedPath(locale, "/")}#certifications`} className={link}>{t("footerCatalog")}</Link></li>
              <li><Link href={localizedPath(locale, "/pricing")} className={link}>{t("pricing")}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold">{t("footerLegal")}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/legal" className={link}>{tl("link")}</Link></li>
              <li><Link href="/privacy" className={link}>{tp("link")}</Link></li>
              <li><Link href="/terms" className={link}>{tt("link")}</Link></li>
            </ul>
          </div>
        </div>
        <p data-testid="disclaimer" className="mt-10 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">{disclaimer}</p>
      </div>
    </footer>
  );
}
