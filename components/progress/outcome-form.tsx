"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { reportOutcomeAction } from "@/lib/actions/outcome";
import { Alert } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

/** "I took the real exam": date, result and (optional) score. */
export function OutcomeForm({ certification, maxScore, today }: Readonly<{ certification: string; maxScore: number; today: string }>) {
  const t = useTranslations("outcome");
  const [state, action, pending] = useActionState(reportOutcomeAction, undefined);
  const id = (name: string) => `outcome-${certification}-${name}`;
  return (
    <form action={action} className="space-y-4">
      {state?.ok && <Alert tone="success">{t(`thanks_${state.ok}`)}</Alert>}
      {state?.error && <Alert tone="error">{t(`error_${state.error}`)}</Alert>}
      <input type="hidden" name="certification" value={certification} />
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label htmlFor={id("date")}>{t("date")}</Label>
          <Input id={id("date")} name="takenOn" type="date" max={today} required className="w-44" />
        </div>
        <fieldset>
          <legend className="mb-1 block text-sm font-medium">{t("result")}</legend>
          <div className="flex gap-4 py-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="result" value="passed" required /> {t("passed")}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="result" value="failed" /> {t("failed")}
            </label>
          </div>
        </fieldset>
        <div>
          <Label htmlFor={id("score")}>{t("score", { max: maxScore })}</Label>
          <Input id={id("score")} name="score" type="number" min={0} max={maxScore} step={1} inputMode="numeric" className="w-32" />
        </div>
        <Button type="submit" disabled={pending}>{t("send")}</Button>
      </div>
    </form>
  );
}
