"use client";

import type { PublicQuestion } from "@/lib/questions/public";
import { QuestionView } from "@/components/questions/question-view";

/** The question as the candidate left it (read-only). */
export function AnsweredQuestion({ question, response, seriesStemHtml }: Readonly<{ question: PublicQuestion; response: unknown; seriesStemHtml?: string }>) {
  return <QuestionView question={question} response={response} onChange={() => undefined} disabled seriesStemHtml={seriesStemHtml} />;
}
