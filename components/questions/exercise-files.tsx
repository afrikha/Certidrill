"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { PublicFile } from "@/lib/questions/public";

/**
 * The files of the working directory of an exercise, read-only, one tab per
 * file (docs/SPECS-KUBERNETES-PRATIQUE.md §4). Arrow keys move between tabs.
 */
export function ExerciseFiles({ files }: Readonly<{ files: PublicFile[] }>) {
  const t = useTranslations("question");
  const base = useId();
  const [current, setCurrent] = useState(0);
  if (!files.length) return null;
  const select = (i: number) => {
    const next = (i + files.length) % files.length;
    setCurrent(next);
    document.getElementById(`${base}-tab-${next}`)?.focus();
  };
  const file = files[current] ?? files[0]!;
  return (
    <section aria-label={t("files")} className="rounded-md border border-border">
      <div role="tablist" aria-label={t("files")} className="flex flex-wrap gap-1 border-b border-border bg-muted px-2 pt-2">
        {files.map((f, i) => (
          <button
            key={f.name}
            id={`${base}-tab-${i}`}
            type="button"
            role="tab"
            aria-selected={i === current}
            aria-controls={`${base}-panel`}
            tabIndex={i === current ? 0 : -1}
            onClick={() => setCurrent(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") select(i + 1);
              else if (e.key === "ArrowLeft") select(i - 1);
            }}
            className={cn(
              "rounded-t-md px-3 py-1.5 font-mono text-xs",
              i === current ? "border border-b-0 border-border bg-background font-semibold" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.name}
          </button>
        ))}
      </div>
      <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${current}`} tabIndex={0} className="max-h-96 overflow-auto p-3">
        <pre className="font-mono text-[0.8rem] leading-relaxed whitespace-pre"><code>{file.content}</code></pre>
      </div>
    </section>
  );
}
