"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PublicQuestion } from "@/lib/questions/public";
import { isComplete } from "@/lib/questions/public";
import { parseResponse } from "@/lib/questions/schema";
import { QuestionView } from "@/components/questions/question-view";

/** Interactive preview: the question as in the exam, plus its serialized response. */
export function Preview({ question, seriesStemHtml }: Readonly<{ question: PublicQuestion; seriesStemHtml?: string }>) {
  const t = useTranslations("admin");
  const [response, setResponse] = useState<unknown>(null);
  const valid = response === null || parseResponse(question.type, response).success;
  return (
    <div className="space-y-6">
      <QuestionView question={question} response={response} onChange={setResponse} seriesStemHtml={seriesStemHtml} />
      <section aria-labelledby="serialized" className="border-t border-border pt-4">
        <h2 id="serialized" className="mb-2 text-sm font-semibold">{t("serialized")}</h2>
        <pre data-testid="response-json" className="overflow-x-auto rounded bg-muted p-3 text-xs">{JSON.stringify(response)}</pre>
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
          {valid ? t("responseValid") : t("responseInvalid")} · {isComplete(question.body, response) ? t("complete") : t("incomplete")}
        </p>
      </section>
    </div>
  );
}
