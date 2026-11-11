"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Html } from "./html";
import type { BodyOf, QuestionInputProps } from "./types";
import { htmlToText } from "./plain-text";
import { withKeys } from "@/components/with-keys";

type R = { values: Record<string, string> };

export function DropdownInput({ body, response, onChange, disabled, uid }: QuestionInputProps<BodyOf<"dropdown">, R>) {
  const t = useTranslations("question");
  const values = response?.values ?? {};
  const slotNumbers = new Map(body.segments.filter((s) => s.kind === "slot").map((s, i) => [s.id, i + 1]));
  const segmentText = (seg: (typeof body.segments)[number]) => {
    if (seg.kind === "slot") return `slot:${seg.id}`;
    return seg.kind === "text" ? `text:${seg.text}` : `html:${seg.html}`;
  };
  const content = withKeys(body.segments, segmentText).map(({ key, item: seg }) => {
    if (seg.kind === "text") return <Fragment key={key}>{seg.text}</Fragment>;
    if (seg.kind === "html") return <Html key={key} html={seg.html} inline />;
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
          <option key={o.id} value={o.id}>{htmlToText(o.html)}</option>
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
