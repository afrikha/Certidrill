"use client";

import { useTranslations } from "next-intl";
import { ExerciseFiles } from "./exercise-files";
import type { BodyOf, QuestionInputProps } from "./types";

type R = { command: string };

/** The longest command accepted (lib/exercises/engine.ts, MAX_COMMAND_LENGTH). */
const MAX_LENGTH = 2000;

/**
 * A `command` exercise: the files of the working directory, then a shell
 * prompt with the namespace of the context and a one-line command field
 * (docs/SPECS-KUBERNETES-PRATIQUE.md §4). Nothing runs in the browser: the
 * command is checked on the server when the exam or the quiz is submitted.
 */
export function CommandInput({ body, response, onChange, disabled, uid }: Readonly<QuestionInputProps<BodyOf<"command">, R>>) {
  const t = useTranslations("question");
  const id = `${uid}-command`;
  return (
    <div className="space-y-4">
      <ExerciseFiles files={body.files} />
      <div>
        <label htmlFor={id} className="mb-1 block text-sm font-semibold">{t("command")}</label>
        <div className="flex items-center gap-2 rounded-md border border-border bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 focus-within:ring-2 focus-within:ring-primary">
          <span aria-hidden="true" className="shrink-0 select-none text-emerald-400">{body.namespace} $</span>
          <input
            id={id}
            type="text"
            value={response?.command ?? ""}
            disabled={disabled}
            maxLength={MAX_LENGTH}
            onChange={(e) => onChange(e.target.value === "" ? null : { command: e.target.value })}
            // Enter would submit nothing: there is no form, the answer is saved as it is typed.
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            aria-describedby={`${id}-hint`}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-500 disabled:opacity-60"
            placeholder={body.tools[0] ?? "kubectl"}
          />
        </div>
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">
          {t("commandHint", { namespace: body.namespace, tools: body.tools.join(", ") })}
        </p>
      </div>
    </div>
  );
}
