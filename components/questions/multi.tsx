"use client";

import { useTranslations } from "next-intl";
import { Html } from "./html";
import type { BodyOf, QuestionInputProps } from "./types";

export function MultiInput({ body, response, onChange, disabled, uid }: QuestionInputProps<BodyOf<"multi">, { optionIds: string[] }>) {
  const t = useTranslations("question");
  const selected = response?.optionIds ?? [];
  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    onChange(next.length ? { optionIds: next } : null);
  };
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-sm font-medium">{t("chooseN", { n: body.choose })}</legend>
      <ul className="space-y-2">
        {body.options.map((o, i) => (
          <li key={o.id}>
            <label
              htmlFor={`${uid}-${o.id}`}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-blue-50"
            >
              <input
                id={`${uid}-${o.id}`}
                type="checkbox"
                value={o.id}
                checked={selected.includes(o.id)}
                onChange={() => toggle(o.id)}
                className="mt-1 size-4 accent-primary"
              />
              <span className="font-semibold text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
              <Html html={o.html} inline />
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
        {t("selectedCount", { count: selected.length, n: body.choose })}
      </p>
    </fieldset>
  );
}
