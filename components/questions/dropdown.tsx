"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Html } from "./html";
import type { BodyOf, QuestionInputProps } from "./types";

type R = { values: Record<string, string> };

/** Strip tags from sanitized inline HTML for <option> labels (options cannot hold markup). */
function label(html: string) {
  return html.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&");
}

export function DropdownInput({ body, response, onChange, disabled, uid }: QuestionInputProps<BodyOf<"dropdown">, R>) {
  const t = useTranslations("question");
  const values = response?.values ?? {};
  const slotNumbers = new Map(body.segments.filter((s) => s.kind === "slot").map((s, i) => [s.id, i + 1]));
  const content = body.segments.map((seg, i) => {
    if (seg.kind === "text") return <Fragment key={i}>{seg.text}</Fragment>;
    if (seg.kind === "html") return <Html key={i} html={seg.html} inline />;
    return (
      <select
        key={seg.id}
        aria-label={t("slot", { n: slotNumbers.get(seg.id) ?? 0 })}
        value={values[seg.id] ?? ""}
        disabled={disabled}
        onChange={(e) => {
          const next = { ...values };
          if (e.target.value) next[seg.id] = e.target.value;
          else delete next[seg.id];
          onChange(Object.keys(next).length ? { values: next } : null);
        }}
        className={cn(
          "mx-1 inline-block max-w-full rounded border px-1 py-0.5 align-baseline",
          values[seg.id] ? "border-primary bg-blue-50" : "border-dashed border-muted-foreground bg-background",
          body.layout === "code" && "font-mono text-[0.85rem]",
        )}
      >
        <option value="">{t("choose")}</option>
        {seg.options.map((o) => (
          <option key={o.id} value={o.id}>{label(o.html)}</option>
        ))}
      </select>
    );
  });

  return body.layout === "code" ? (
    <pre id={uid} className="overflow-x-auto rounded-md border border-border bg-muted p-4 font-mono text-sm leading-8 whitespace-pre-wrap">
      {content}
    </pre>
  ) : (
    <div id={uid} className="leading-9">{content}</div>
  );
}
