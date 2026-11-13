"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { confirmSignupAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/card";

export function ConfirmForm({ token, email }: Readonly<{ token: string; email: string }>) {
  const t = useTranslations("signup");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(confirmSignupAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="error" data-testid="confirm-error">{t(`confirm_${state.error}`)}</Alert>}
      <input type="hidden" name="token" value={token} />
      {/* For password managers: the account this password belongs to. */}
      <input type="hidden" name="email" value={email} autoComplete="username" />
      <div>
        <Label htmlFor="confirm-password">{tc("password")}</Label>
        <Input id="confirm-password" name="password" type="password" autoComplete="current-password" required maxLength={256} />
      </div>
      <Button type="submit" disabled={pending} className="w-full">{t("confirmSubmit")}</Button>
    </form>
  );
}
