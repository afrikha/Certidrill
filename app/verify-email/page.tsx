import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { peekSignup } from "@/lib/auth/signup";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { ConfirmForm } from "./confirm-form";
import { NO_INDEX } from "@/lib/seo";

// The token is in the address of this page: never sent to other sites.
export const metadata: Metadata = { title: "Confirm your sign-up", referrer: "no-referrer", ...NO_INDEX };
export const dynamic = "force-dynamic";

/**
 * The link of the sign-up e-mail. Opening it changes nothing (a mail scanner
 * may open it first): the account is created once the password chosen at
 * sign-up is given again (lib/auth/signup.ts, confirmSignup).
 */
export default async function VerifyEmailPage({ searchParams }: Readonly<{ searchParams: Promise<{ token?: string | string[] }> }>) {
  if ((await auth())?.user) redirect("/dashboard");
  const { token: raw } = await searchParams;
  const token = typeof raw === "string" ? raw : "";
  const link = await peekSignup(prisma, token);
  if (link.status !== "valid") redirect(`/signup?verify=${link.status}`);
  const t = await getTranslations("signup");

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-md px-4 py-12">
        <h1 className="mb-2 text-2xl font-bold">{t("confirmTitle")}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{t("confirmHelp", { email: link.email })}</p>
        <Card>
          <ConfirmForm token={token} email={link.email} />
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
