"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createUserAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/card";

export function CreateUserForm() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(createUserAction, undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {state?.ok && <Alert tone="success" className="sm:col-span-2">{t("created")}</Alert>}
      {state?.error && <Alert tone="error" className="sm:col-span-2">{t(state.error)}</Alert>}
      <div>
        <Label htmlFor="new-email">{tc("email")}</Label>
        <Input id="new-email" name="email" type="email" required />
      </div>
      <div>
        <Label htmlFor="new-name">{tc("name")}</Label>
        <Input id="new-name" name="name" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="new-password">{t("passwordOptional")}</Label>
        <Input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} />
      </div>
      <div className="flex gap-4">
        <div>
          <Label htmlFor="new-role">{t("role")}</Label>
          <Select id="new-role" name="role" defaultValue="user">
            <option value="user">user</option>
            <option value="admin">admin</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="new-locale">{tc("language")}</Label>
          <Select id="new-locale" name="locale" defaultValue="fr">
            <option value="fr">Français</option>
            <option value="en">English</option>
          </Select>
        </div>
      </div>
      <div className="flex items-end justify-end">
        <Button type="submit" disabled={pending}>{t("createUser")}</Button>
      </div>
    </form>
  );
}
