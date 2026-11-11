"use client";

import { useTranslations } from "next-intl";
import type { PublicBody, PublicQuestion } from "@/lib/questions/public";
import { Html } from "./html";
import { SingleInput } from "./single";
import { MultiInput } from "./multi";
import { YesNoStatementsInput } from "./yesno-statements";
import { DropdownInput } from "./dropdown";
import { DragDropInput } from "./dragdrop";
import { OrderingInput } from "./ordering";
import { HotAreaInput } from "./hotarea";
import { SeriesYesNoInput } from "./series-yesno";

export interface QuestionViewProps {
  question: PublicQuestion;
  response: unknown;
  onChange: (response: unknown) => void;
  disabled?: boolean;
  /** Shared goal of a Yes/No series, shown above the question. */
  seriesStemHtml?: string;
}

/** Displays a question (stem, exhibits) and the input matching its type. */
export function QuestionView({ question, response, onChange, disabled, seriesStemHtml }: Readonly<QuestionViewProps>) {
  const t = useTranslations("question");
  const uid = `q-${question.id}`;
  return (
    <article aria-labelledby={`${uid}-stem`} className="space-y-6">
      {seriesStemHtml && (
        <div className="rounded-md border border-border p-4">
          <p className="mb-2 text-xs text-muted-foreground">{t("seriesNotice")}</p>
          <Html html={seriesStemHtml} />
        </div>
      )}
      {/* In a series, the shared scenario is the series stem; the question's own stem is only a summary. */}
      <div id={`${uid}-stem`} className={question.body.type === "series_yesno" ? "sr-only" : undefined}>
        <Html html={question.stemHtml} />
      </div>
      {question.exhibits.length > 0 && (
        <div className="space-y-3">
          {question.exhibits.map((e) => (
            <details key={e.id} open className="rounded-md border border-border">
              <summary className="cursor-pointer bg-muted px-4 py-2 text-sm font-semibold">
                <Html html={e.titleHtml} inline />
              </summary>
              <div className="overflow-x-auto p-4"><Html html={e.html} /></div>
            </details>
          ))}
        </div>
      )}
      <Input body={question.body} response={response} onChange={onChange} disabled={disabled} uid={uid} />
    </article>
  );
}

function Input({ body, response, onChange, disabled, uid }: Readonly<{ body: PublicBody; response: unknown; onChange: (r: unknown) => void; disabled?: boolean; uid: string }>) {
  const common = { onChange, disabled, uid };
  switch (body.type) {
    case "single":
      return <SingleInput body={body} response={response as { optionId: string } | null} {...common} />;
    case "multi":
      return <MultiInput body={body} response={response as { optionIds: string[] } | null} {...common} />;
    case "yesno_statements":
      return <YesNoStatementsInput body={body} response={response as { values: Record<string, boolean> } | null} {...common} />;
    case "dropdown":
      return <DropdownInput body={body} response={response as { values: Record<string, string> } | null} {...common} />;
    case "dragdrop":
      return <DragDropInput body={body} response={response as { mapping: Record<string, string> } | null} {...common} />;
    case "ordering":
      return <OrderingInput body={body} response={response as { sequence: string[] } | null} {...common} />;
    case "hotarea":
      return <HotAreaInput body={body} response={response as { values: Record<string, string> } | null} {...common} />;
    case "series_yesno":
      return <SeriesYesNoInput body={body} response={response as { value: boolean } | null} {...common} />;
  }
}
