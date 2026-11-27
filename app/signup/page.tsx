import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { readSwitches } from "@/lib/settings";
import { EMAIL_VERIFY_HOURS } from "@/lib/auth/email";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Alert, Card } from "@/components/ui/card";
import { SignupForm } from "./signup-form";
import { NO_INDEX } from "@/lib/seo";

export const metadata: Metadata = { title: "Sign up", ...NO_INDEX };
export const dynamic = "force-dynamic";

/** Public sign-up, open while the switch signup.open is on (Administration → Billing). */
export default async function SignupPage({ searchParams }: Readonly<{ searchParams: Promise<{ verify?: string | string[] }> }>) {
  if ((await auth())?.user) redirect("/dashboard");
  const { verify } = await searchParams;
  const [{ signupOpen }, locale, t, tp] = await Promise.all([readSwitches(prisma), getLocale(), getTranslations("signup"), getTranslations("privacy")]);

  return (
    <>
      <SiteHeader />
      <main id="main" className="relative isolate mx-auto max-w-md px-4 py-14 before:pointer-events-none before:fixed before:inset-x-0 before:top-0 before:-z-10 before:h-[32rem] before:bg-[radial-gradient(60%_60%_at_50%_0%,var(--color-blue-100),transparent)] before:content-['']">
        <h1 className="mb-8 text-center text-3xl font-bold tracking-tight">{t("title")}</h1>
        {/* A verification link that did not work (lib/auth/signup.ts, confirmSignup). */}
        {(verify === "expired" || verify === "invalid") && <Alert tone="error" className="mb-6" data-testid="verify-error">{t(`verify_${verify}`)}</Alert>}
        {signupOpen ? (
          <Card>
            <SignupForm locale={locale} hours={EMAIL_VERIFY_HOURS} minLength={MIN_PASSWORD_LENGTH} />
            <p className="mt-4 text-xs text-muted-foreground" data-testid="signup-privacy">
              {tp("signupNotice")} <Link href="/privacy" className="text-primary underline">{tp("link").toLowerCase()}</Link>.
            </p>
          </Card>
        ) : (
          <Alert tone="info" data-testid="signup-closed">{t("closed")}</Alert>
        )}
        <p className="mt-6 text-sm">
          {t("haveAccount")} <Link href="/login" className="text-primary underline">{t("signIn")}</Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
