"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { startNewExam } from "@/lib/actions/exam";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/card";

export function NewExamForm({ code, defaultLocale }: { code: string; defaultLocale: string }) {
  const t = useTranslations("dashboard");
  const [state, action, pending] = useActionState(startNewExam, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-4">
      <input type="hidden" name="certification" value={code} />
      <div>
        <Label htmlFor={`locale-${code}`}>{t("examLanguage")}</Label>
        <Select id={`locale-${code}`} name="locale" defaultValue={defaultLocale}>
          <option value="fr">Français</option>
          <option value="en">English</option>
        </Select>
      </div>
      <Button type="submit" disabled={pending}>{t("newExam")}</Button>
      {state?.error && <Alert tone="error" className="w-full">{state.error === "emptyBank" ? t("emptyBank") : "Error"}</Alert>}
    </form>
  );
}
