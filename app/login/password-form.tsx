"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginWithPassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/card";

export function PasswordForm() {
  const t = useTranslations();
  const [state, action, pending] = useActionState(loginWithPassword, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="error">{t(`login.${state.error}`)}</Alert>}
      <div>
        <Label htmlFor="email">{t("common.email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state?.email} key={state?.email} required />
      </div>
      <div>
        <Label htmlFor="password">{t("common.password")}</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <Button type="submit" disabled={pending} className="w-full">{t("common.signIn")}</Button>
    </form>
  );
}
