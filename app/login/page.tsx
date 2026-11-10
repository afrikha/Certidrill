import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { loginWithMagicLink } from "@/lib/actions/auth";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert, Card } from "@/components/ui/card";
import { PasswordForm } from "./password-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ type?: string; error?: string }> }) {
  if ((await auth())?.user) redirect("/dashboard");
  const { type, error } = await searchParams;
  const sent = type === "email";
  const t = await getTranslations();

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-md px-4 py-12">
        <h1 className="mb-6 text-2xl font-bold">{t("login.title")}</h1>
        {sent && <Alert tone="success" className="mb-6">{t("login.sent")}</Alert>}
        {error && !sent && <Alert tone="error" className="mb-6">{t("login.error")}</Alert>}

        <Card>
          <h2 className="mb-4 font-semibold">{t("login.passwordTab")}</h2>
          <PasswordForm />
          <p className="mt-4 text-sm text-muted-foreground">{t("login.forgot")}</p>
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
