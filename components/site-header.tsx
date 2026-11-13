import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth, signOut } from "@/auth";
import { LocaleSwitcher } from "./locale-switcher";

export async function SiteHeader() {
  const session = await auth();
  const t = await getTranslations("common");
  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3" aria-label="Main">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Certi<span className="text-primary">drill</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/pricing" className="hover:underline">{t("pricing")}</Link>
          {session?.user ? (
            <>
              <Link href="/dashboard" className="hover:underline">{t("dashboard")}</Link>
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
  return (
    <footer className="mt-16 border-t border-border">
      <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground">{t("disclaimer")}</p>
    </footer>
  );
}
