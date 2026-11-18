import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { Card } from "@/components/ui/card";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ChangePasswordForm } from "./password-form";
import { prisma } from "@/lib/db";
import { recentLogins } from "@/lib/activity/logins";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  const t = await getTranslations("account");
  const tc = await getTranslations("common");
  const tb = await getTranslations("billing");
  const ta = await getTranslations("activityAdmin");
  const format = await getFormatter();
  const logins = await recentLogins(prisma, user.id);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <Card>
        <p className="text-sm"><span className="font-medium">{tc("email")}:</span> {user.email}</p>
        <p className="mt-3 text-sm"><Link href="/account/billing" className="text-primary underline">{tb("billingLink")}</Link></p>
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold">{t("changePassword")}</h2>
        <ChangePasswordForm />
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold">{t("preferences")}</h2>
        <div className="flex items-center gap-3 text-sm">{tc("language")} <LocaleSwitcher /></div>
      </Card>
      <Card>
        <h2 className="mb-1 font-semibold">{t("logins")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("loginsHelp")}</p>
        {logins.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noLogins")}</p>
        ) : (
          <ul className="divide-y divide-border text-sm" data-testid="account-logins">
            {logins.map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-x-4 py-2" data-kind={l.kind}>
                <span>{ta(`login_${l.kind}`)}</span>
                <span className="text-muted-foreground tabular-nums">{format.dateTime(l.createdAt, { dateStyle: "medium", timeStyle: "short" })} · {ta("ip", { ip: l.ip })}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
