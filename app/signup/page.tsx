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

export const metadata = { title: "Sign up" };
export const dynamic = "force-dynamic";

/** Public sign-up, open while the switch signup.open is on (Administration → Billing). */
export default async function SignupPage({ searchParams }: Readonly<{ searchParams: Promise<{ verify?: string | string[] }> }>) {
  if ((await auth())?.user) redirect("/dashboard");
  const { verify } = await searchParams;
  const [{ signupOpen }, locale, t] = await Promise.all([readSwitches(prisma), getLocale(), getTranslations("signup")]);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-md px-4 py-12">
        <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
        {/* A verification link that did not work (lib/auth/signup.ts, confirmSignup). */}
        {(verify === "expired" || verify === "invalid") && <Alert tone="error" className="mb-6" data-testid="verify-error">{t(`verify_${verify}`)}</Alert>}
        {signupOpen ? (
          <Card>
            <SignupForm locale={locale} hours={EMAIL_VERIFY_HOURS} minLength={MIN_PASSWORD_LENGTH} />
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
