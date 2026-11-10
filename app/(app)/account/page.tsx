import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { Card } from "@/components/ui/card";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ChangePasswordForm } from "./password-form";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  const t = await getTranslations("account");
  const tc = await getTranslations("common");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <Card>
        <p className="text-sm"><span className="font-medium">{tc("email")}:</span> {user.email}</p>
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold">{t("changePassword")}</h2>
        <ChangePasswordForm />
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold">{t("preferences")}</h2>
        <div className="flex items-center gap-3 text-sm">{tc("language")} <LocaleSwitcher /></div>
      </Card>
    </div>
  );
}
