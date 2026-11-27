"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ExerciseFiles } from "./exercise-files";
import type { BodyOf, QuestionInputProps } from "./types";

type R = { manifest: string };

/** The largest manifest accepted (lib/exercises/grade.ts, MAX_MANIFEST_BYTES). */
const MAX_LENGTH = 50_000;

/**
 * A `manifest` exercise: the files, then a light YAML editor (monospace
 * textarea with line numbers, docs/SPECS-KUBERNETES-PRATIQUE.md §4), filled
 * with the starter until the candidate types. Tab inserts two spaces; Escape
 * then Tab leaves the editor, so the keyboard is never trapped.
 */
export function ManifestInput({ body, response, onChange, disabled, uid }: Readonly<QuestionInputProps<BodyOf<"manifest">, R>>) {
  const t = useTranslations("question");
  const id = `${uid}-manifest`;
  const gutter = useRef<HTMLDivElement>(null);
  const [tabLeaves, setTabLeaves] = useState(false);
  const value = response?.manifest ?? body.starter;
  const lines = Math.max(1, value.split("\n").length);
  const set = (text: string) => onChange(text.trim() === "" ? null : { manifest: text });

  return (
    <div className="space-y-4">
      <ExerciseFiles files={body.files} />
      <div>
        <label htmlFor={id} className="mb-1 block text-sm font-semibold">{t("manifest")}</label>
        <div className="flex overflow-hidden rounded-md border border-border bg-background font-mono text-[0.8rem] leading-5 focus-within:ring-2 focus-within:ring-primary">
          <div ref={gutter} aria-hidden="true" className="select-none overflow-hidden border-r border-border bg-muted px-2 py-2 text-right text-muted-foreground">
            {Array.from({ length: lines }, (_, i) => <div key={i}>{i + 1}</div>)}
          </div>
          <textarea
            id={id}
            value={value}
            disabled={disabled}
            maxLength={MAX_LENGTH}
            rows={Math.min(30, Math.max(14, lines + 1))}
            wrap="off"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            aria-describedby={`${id}-hint`}
            onChange={(e) => set(e.target.value)}
            onScroll={(e) => {
              if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
            }}
            onBlur={() => setTabLeaves(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setTabLeaves(true);
                return;
              }
              if (e.key !== "Tab" || e.shiftKey || tabLeaves) {
                if (e.key !== "Tab") setTabLeaves(false);
                return;
              }
              e.preventDefault();
              const el = e.currentTarget;
              const { selectionStart: start, selectionEnd: end } = el;
              const next = `${el.value.slice(0, start)}  ${el.value.slice(end)}`;
              set(next);
              requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2));
            }}
            className="min-h-64 flex-1 resize-y bg-transparent px-3 py-2 whitespace-pre outline-none disabled:opacity-60"
          />
        </div>
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">{t("manifestHint")}</p>
      </div>
    </div>
  );
}
