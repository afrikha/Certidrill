import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { loginWithMagicLink } from "@/lib/actions/auth";
import { prisma } from "@/lib/db";
import { readSwitches } from "@/lib/settings";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert, Card } from "@/components/ui/card";
import { PasswordForm } from "./password-form";
import { NO_INDEX } from "@/lib/seo";

export const metadata: Metadata = { title: "Sign in", ...NO_INDEX };

export default async function LoginPage({ searchParams }: Readonly<{ searchParams: Promise<{ type?: string; error?: string; verified?: string }> }>) {
  if ((await auth())?.user) redirect("/dashboard");
  const { type, error, verified } = await searchParams;
  const sent = type === "email";
  const [t, { signupOpen }] = await Promise.all([getTranslations(), readSwitches(prisma)]);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-md px-4 py-12">
        <h1 className="mb-6 text-2xl font-bold">{t("login.title")}</h1>
        {sent && <Alert tone="success" className="mb-6">{t("login.sent")}</Alert>}
        {error && !sent && <Alert tone="error" className="mb-6">{t("login.error")}</Alert>}
        {/* After the sign-up link (app/verify-email): the account exists, sign in with the chosen password. */}
        {verified === "1" && <Alert tone="success" className="mb-6" data-testid="login-verified">{t("login.verified")}</Alert>}
        {verified === "exists" && <Alert tone="info" className="mb-6" data-testid="login-verified">{t("login.verifiedExists")}</Alert>}

        <Card>
          <h2 className="mb-4 font-semibold">{t("login.passwordTab")}</h2>
          <PasswordForm />
          <p className="mt-4 text-sm text-muted-foreground">{t("login.forgot")}</p>
          {signupOpen && (
            <p className="mt-2 text-sm">
              {t("login.noAccount")} <Link href="/signup" className="text-primary underline">{t("login.signup")}</Link>
            </p>
          )}
        </Card>

        <Card className="mt-6">
          <h2 className="mb-2 font-semibold">{t("login.magicTab")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("login.magicHelp")}</p>
          <form action={loginWithMagicLink} className="space-y-4">
            <div>
              <Label htmlFor="magic-email">{t("common.email")}</Label>
              <Input id="magic-email" name="email" type="email" autoComplete="email" required />
            </div>
            <Button type="submit" variant="secondary" className="w-full">{t("login.sendLink")}</Button>
          </form>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
