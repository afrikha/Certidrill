"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signupAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/card";

export function SignupForm({ locale, hours, minLength }: Readonly<{ locale: string; hours: number; minLength: number }>) {
  const t = useTranslations("signup");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(signupAction, undefined);
  if (state?.sent) {
    return (
      <Alert tone="success" data-testid="signup-sent">
        {t("sent", { hours })}
      </Alert>
    );
  }
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="error" data-testid="signup-error">{t(`error_${state.error}`, { min: minLength })}</Alert>}
      <input type="hidden" name="locale" value={locale} />
      <div>
        <Label htmlFor="signup-email">{tc("email")}</Label>
        <Input id="signup-email" name="email" type="email" autoComplete="email" maxLength={254} defaultValue={state?.email} key={state?.email} required />
      </div>
      <div>
        <Label htmlFor="signup-password">{tc("password")}</Label>
        <Input id="signup-password" name="password" type="password" autoComplete="new-password" minLength={minLength} maxLength={256} required aria-describedby="signup-password-hint" />
        <p id="signup-password-hint" className="mt-1 text-xs text-muted-foreground">{t("passwordHint", { min: minLength })}</p>
      </div>
      <div>
        <Label htmlFor="signup-confirm">{t("confirm")}</Label>
        <Input id="signup-confirm" name="confirm" type="password" autoComplete="new-password" minLength={minLength} maxLength={256} required />
      </div>
      <Button type="submit" disabled={pending} className="w-full">{t("submit")}</Button>
    </form>
  );
}
