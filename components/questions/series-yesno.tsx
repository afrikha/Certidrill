"use client";

import { useTranslations } from "next-intl";
import { Html } from "./html";
import type { BodyOf, QuestionInputProps } from "./types";

export function SeriesYesNoInput({ body, response, onChange, disabled, uid }: QuestionInputProps<BodyOf<"series_yesno">, { value: boolean }>) {
  const t = useTranslations("question");
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-muted p-4">
        <p className="mb-1 text-sm font-semibold">{t("solution")}</p>
        <Html html={body.solutionHtml} />
      </div>
      <fieldset disabled={disabled}>
        <legend className="mb-2 font-medium">{t("meetsGoal")}</legend>
        <div className="flex gap-3">
          {[true, false].map((v) => (
            <label key={String(v)} htmlFor={`${uid}-${v}`} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 has-[:checked]:border-primary has-[:checked]:bg-blue-50">
              <input id={`${uid}-${v}`} type="radio" name={uid} checked={response?.value === v} onChange={() => onChange({ value: v })} className="size-4 accent-primary" />
              {v ? t("yes") : t("no")}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
