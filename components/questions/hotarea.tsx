"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Html } from "./html";
import type { BodyOf, QuestionInputProps } from "./types";

type R = { values: Record<string, string> };

/**
 * Hot area rendered as a table whose clickable cells are buttons. With several
 * prompts, the active prompt is chosen first, then the area.
 */
export function HotAreaInput({ body, response, onChange, disabled, uid }: QuestionInputProps<BodyOf<"hotarea">, R>) {
  const t = useTranslations("question");
  const values = response?.values ?? {};
  const [active, setActive] = useState(body.prompts[0]?.id ?? "");
  const multiple = body.prompts.length > 1;
  const activePrompt = body.prompts.find((p) => p.id === active);

  return (
    <div className="space-y-4">
      {multiple && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("hotPrompt")}</legend>
          <div className="flex flex-col gap-2">
            {body.prompts.map((p) => (
              <label key={p.id} htmlFor={`${uid}-p-${p.id}`} className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2 has-[:checked]:border-primary has-[:checked]:bg-blue-50">
                <input id={`${uid}-p-${p.id}`} type="radio" name={`${uid}-prompt`} checked={active === p.id} onChange={() => setActive(p.id)} className="mt-1 size-4 accent-primary" />
                <Html html={p.html} inline />
                {values[p.id] && <span className="ml-auto text-xs text-success">✓</span>}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {!multiple && activePrompt && <Html html={activePrompt.html} className="font-medium" />}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {body.caption && <caption className="mb-2 text-left font-semibold"><Html html={body.caption} inline /></caption>}
          {body.header && (
            <thead>
              <tr>{body.header.map((h, i) => <th key={i} scope="col" className="border border-border bg-muted px-3 py-2 text-left"><Html html={h} inline /></th>)}</tr>
            </thead>
          )}
          <tbody>
            {body.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className="border border-border p-0">
                    {cell.area ? (
                      <button
                        type="button"
                        disabled={disabled}
                        aria-pressed={values[active] === cell.area}
                        onClick={() => onChange({ values: { ...values, [active]: cell.area! } })}
                        className={cn(
                          "block w-full cursor-pointer px-3 py-2 text-left underline decoration-dotted decoration-muted-foreground underline-offset-4 hover:bg-blue-50",
                          values[active] === cell.area && "bg-blue-100 outline-2 -outline-offset-2 outline-primary",
                          Object.entries(values).some(([p, a]) => p !== active && a === cell.area) && "bg-muted",
                        )}
                      >
                        {cell.html ? <Html html={cell.html} inline /> : <span className="sr-only">{t("area")}</span>}
                      </button>
                    ) : (
                      <div className="px-3 py-2">{cell.html && <Html html={cell.html} inline />}</div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
