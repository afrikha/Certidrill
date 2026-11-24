"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { QuestionView } from "@/components/questions/question-view";
import { Html } from "@/components/questions/html";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { withKeys } from "@/components/with-keys";
import { answerQuizAction, startQuizAction } from "@/lib/actions/quiz";
import type { QuizBest, QuizCorrection, QuizResult, QuizStep } from "@/lib/course/quiz";
import { cn } from "@/lib/utils";
import { ReportForm } from "@/app/(app)/results/[id]/review/report-form";

type View =
  | { kind: "intro" }
  | { kind: "question"; id: string; step: QuizStep; response: unknown }
  | { kind: "corrected"; id: string; step: QuizStep; response: unknown; correction: QuizCorrection; next: QuizStep | null; result: QuizResult | null }
  | { kind: "result"; result: QuizResult };

/** The correction of one question, shown as soon as it is validated (§3.2). */
function Correction({ c }: Readonly<{ c: QuizCorrection }>) {
  const t = useTranslations("quiz");
  return (
    <section className="space-y-4" data-testid="quiz-correction" aria-live="polite">
      <p className={cn("font-semibold", c.passed ? "text-success" : "text-danger")} data-testid="quiz-verdict" data-passed={c.passed}>
        {c.passed ? "✓" : "✗"} {c.passed ? t("correct") : t("incorrect")} · {t("points", { earned: c.earned, max: c.max })}
      </p>
      <div className="rounded-md bg-green-50 p-4 text-sm">
        <h2 className="mb-2 font-semibold text-green-900">{t("answerKey")}</h2>
        <ul className="space-y-1">
          {withKeys(c.correctAnswer, (l) => `${l.label ?? ""}|${l.html}`).map(({ key, item: line }) => (
            <li key={key}>{line.label && <><Html html={line.label} inline /> → </>}<strong><Html html={line.html} inline /></strong></li>
          ))}
        </ul>
      </div>
      <div className="text-sm">
        <h2 className="mb-2 font-semibold">{t("explanation")}</h2>
        <Html html={c.explanationHtml} />
        {c.optionExplanations.length > 0 && (
          <>
            <h3 className="mb-1 mt-3 font-semibold">{t("whyWrong")}</h3>
            <ul className="list-disc space-y-1 pl-5">
              {withKeys(c.optionExplanations, (o) => o.label).map(({ key, item: o }) => (
                <li key={key}><Html html={o.label} inline /> — <Html html={o.html} inline /></li>
              ))}
            </ul>
          </>
        )}
        {c.sections.length > 0 && (
          <ul className="mt-3 space-y-1" data-testid="quiz-sections">
            {c.sections.map((s) => (
              <li key={s.code}><Link href={s.href} className="font-medium text-primary underline">{t("reviewSection", { section: s.title })}</Link></li>
            ))}
          </ul>
        )}
        {c.references.length > 0 && (
          <>
            <h3 className="mb-1 mt-3 font-semibold">{t("references")}</h3>
            <ul className="space-y-1">
              {c.references.map((r) => (
                <li key={r.url}><a href={r.url} target="_blank" rel="noreferrer" className="text-primary underline">{r.title}</a></li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function Result({ result, length, easy }: Readonly<{ result: QuizResult; length: number; easy: number }>) {
  const t = useTranslations("quiz");
  const format = useFormatter();
  return (
    <Card className={cn("space-y-3 border-l-4", result.passed ? "border-l-success" : "border-l-warning")} data-testid="quiz-result" data-passed={result.passed}>
      <h2 className="text-lg font-semibold">{t("resultTitle")}</h2>
      <p className="text-3xl font-bold tabular-nums" data-testid="quiz-score">{t("score", { score: result.score, total: length })}</p>
      <p className="text-sm" data-testid="quiz-detail">{t("detail", { easy: result.easyScore, easyN: easy, hard: result.hardScore, hardN: length - easy })}</p>
      <p className={cn("font-semibold", result.passed ? "text-success" : "text-amber-800")}>{result.passed ? `✓ ${t("mastered")}` : t("toReview")}</p>
      {result.review.length > 0 && (
        <div className="text-sm">
          <h3 className="mb-1 font-semibold">{t("reread")}</h3>
          <ul className="list-disc space-y-1 pl-5" data-testid="quiz-review">
            {result.review.map((s) => <li key={s.code}><Link href={s.href} className="text-primary underline">{s.title}</Link></li>)}
          </ul>
        </div>
      )}
      {result.best && (
        <p className="text-sm text-muted-foreground" data-testid="quiz-best">
          {t("best", { score: result.best.score, total: length, date: format.dateTime(new Date(result.best.completedAt), { dateStyle: "medium" }) })}
        </p>
      )}
    </Card>
  );
}

/**
 * The quiz in the browser: one question at a time. Validating sends the
 * answer; only then does the server send its correction (never before).
 */
export function QuizClient({
  certification,
  chapter,
  attempt,
  last,
  best,
  rules,
}: Readonly<{
  certification: string;
  chapter: string;
  attempt: { id: string; step: QuizStep; answered: number } | null;
  last: QuizResult | null;
  best: QuizBest | null;
  rules: { length: number; easy: number };
}>) {
  const t = useTranslations("quiz");
  const format = useFormatter();
  const [view, setView] = useState<View>(() => {
    if (attempt) return { kind: "question", id: attempt.id, step: attempt.step, response: null };
    if (last) return { kind: "result", result: last };
    return { kind: "intro" };
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const start = () =>
    startTransition(async () => {
      setError(null);
      const out = await startQuizAction(certification, chapter);
      if (!out.ok) return setError(t(`error_${out.error}`));
      setView({ kind: "question", id: out.id, step: out.step, response: null });
    });

  const validate = (v: Extract<View, { kind: "question" }>) =>
    startTransition(async () => {
      setError(null);
      const out = await answerQuizAction(v.id, v.step.position, v.response);
      if (!out.ok) return setError(t(`error_${out.error}`));
      setView({ kind: "corrected", id: v.id, step: v.step, response: v.response, correction: out.correction, next: out.next, result: out.result });
    });

  const startButton = (label: string) => (
    <Button type="button" onClick={start} disabled={pending} data-testid="quiz-start">{label}</Button>
  );

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
      {view.kind === "intro" && (
        <div className="space-y-3">
          {best && <p className="text-sm">{t("best", { score: best.score, total: rules.length, date: format.dateTime(new Date(best.completedAt), { dateStyle: "medium" }) })}</p>}
          {startButton(t("start"))}
        </div>
      )}
      {(view.kind === "question" || view.kind === "corrected") && (
        <Card className="space-y-5" data-testid="quiz-question" data-position={view.step.position}>
          <header className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold" data-testid="quiz-progress">{t("progress", { position: view.step.position, total: rules.length })}</span>
            <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", view.step.hard ? "bg-primary/10 text-primary" : "bg-muted")} data-testid="quiz-level">
              {view.step.hard ? t("level_hard") : t("level_easy")}
            </span>
          </header>
          <QuestionView
            key={`${view.step.position}-${view.step.question.id}`}
            question={view.step.question}
            response={view.response}
            onChange={(response) => view.kind === "question" && setView({ ...view, response })}
            disabled={view.kind === "corrected" || pending}
          />
          {view.kind === "question" && (
            <Button type="button" onClick={() => validate(view)} disabled={pending} data-testid="quiz-validate">{t("validate")}</Button>
          )}
          {view.kind === "corrected" && (
            <>
              <Correction c={view.correction} />
              <ReportForm questionId={view.step.question.id} />
              {view.next ? (
                <Button type="button" onClick={() => setView({ kind: "question", id: view.id, step: view.next!, response: null })} data-testid="quiz-next">{t("next")}</Button>
              ) : (
                <Button type="button" onClick={() => setView({ kind: "result", result: view.result! })} data-testid="quiz-see-result">{t("seeResult")}</Button>
              )}
            </>
          )}
        </Card>
      )}
      {view.kind === "result" && (
        <>
          <Result result={view.result} length={rules.length} easy={rules.easy} />
          {startButton(t("restart"))}
        </>
      )}
    </div>
  );
}
