"use client";

import { useTranslations } from "next-intl";
import { Html } from "./html";
import type { BodyOf, QuestionInputProps } from "./types";

export function SingleInput({ body, response, onChange, disabled, uid }: QuestionInputProps<BodyOf<"single">, { optionId: string }>) {
  const t = useTranslations("question");
  return (
    <fieldset disabled={disabled}>
      <legend className="sr-only">{t("chooseOne")}</legend>
      <ul className="space-y-2">
        {body.options.map((o, i) => (
          <li key={o.id}>
            <label
              htmlFor={`${uid}-${o.id}`}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-blue-50"
            >
              <input
                id={`${uid}-${o.id}`}
                type="radio"
                name={uid}
                value={o.id}
                checked={response?.optionId === o.id}
                onChange={() => onChange({ optionId: o.id })}
                className="mt-1 size-4 accent-primary"
              />
              <span className="font-semibold text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
              <Html html={o.html} inline />
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
