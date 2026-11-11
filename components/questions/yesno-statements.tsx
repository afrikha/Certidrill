"use client";

import { useTranslations } from "next-intl";
import { Html } from "./html";
import type { BodyOf, QuestionInputProps } from "./types";

type R = { values: Record<string, boolean> };

export function YesNoStatementsInput({ body, response, onChange, disabled, uid }: QuestionInputProps<BodyOf<"yesno_statements">, R>) {
  const t = useTranslations("question");
  const values = response?.values ?? {};
  const set = (id: string, v: boolean) => onChange({ values: { ...values, [id]: v } });
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{t("yesNoCaption")}</caption>
      <thead>
        <tr className="border-b border-border">
          <th scope="col" className="py-2 text-left">{t("statement")}</th>
          <th scope="col" className="w-16 py-2">{t("yes")}</th>
          <th scope="col" className="w-16 py-2">{t("no")}</th>
        </tr>
      </thead>
      <tbody>
        {body.statements.map((s) => (
          <tr key={s.id} className="border-b border-border">
            <th scope="row" id={`${uid}-${s.id}`} className="py-3 pr-4 text-left font-normal">
              <Html html={s.html} inline />
            </th>
            {[true, false].map((v) => (
              <td key={String(v)} className="text-center">
                <input
                  type="radio"
                  name={`${uid}-${s.id}`}
                  aria-label={`${v ? t("yes") : t("no")}`}
                  aria-describedby={`${uid}-${s.id}`}
                  checked={values[s.id] === v}
                  onChange={() => set(s.id, v)}
                  disabled={disabled}
                  className="size-4 accent-primary"
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
