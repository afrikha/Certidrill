"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { changePassword } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/card";

export function ChangePasswordForm() {
  const t = useTranslations("account");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="max-w-md space-y-4">
      {state?.ok && <Alert tone="success">{t("passwordChanged")}</Alert>}
      {state?.error && <Alert tone="error">{t(state.error)}</Alert>}
      <div>
        <Label htmlFor="current">{t("currentPassword")}</Label>
        <Input id="current" name="current" type="password" autoComplete="current-password" />
      </div>
      <div>
        <Label htmlFor="next">{t("newPassword")}</Label>
        <Input id="next" name="next" type="password" autoComplete="new-password" minLength={12} required />
      </div>
      <Button type="submit" disabled={pending}>{tc("save")}</Button>
    </form>
  );
}
