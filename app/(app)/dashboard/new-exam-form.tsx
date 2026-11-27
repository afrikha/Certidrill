"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { startNewExam } from "@/lib/actions/exam";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/card";

/** `format`: certification.format, a performance-based exam starts a practice series (docs/SPECS-KUBERNETES-PRATIQUE.md §5). */
export function NewExamForm({ code, defaultLocale, format = "multiple-choice" }: Readonly<{ code: string; defaultLocale: string; format?: string }>) {
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
      <Button type="submit" disabled={pending}>{t("newExam", { format: format === "performance" ? "performance" : "other" })}</Button>
      {state?.error && <Alert tone="error" className="w-full" data-testid="new-exam-error">{t(state.error, { format: format === "performance" ? "performance" : "other" })}</Alert>}
    </form>
  );
}
