"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { AttemptView } from "@/lib/exam/session";
import { isAnswered, isComplete } from "@/lib/questions/public";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Item = AttemptView["items"][number];

export function itemState(item: Item, response: unknown): "answered" | "incomplete" | "unanswered" {
  if (isComplete(item.question.body, response)) return "answered";
  return isAnswered(response) ? "incomplete" : "unanswered";
}

/** Review screen of the main section: states, filters, direct access, finish. */
export function ReviewScreen({ items, responses, flags, onOpen, onBack, onFinish, finishLabel }: {
  items: Item[];
  responses: Record<string, unknown>;
  flags: Record<string, boolean>;
  onOpen: (item: Item) => void;
  onBack: () => void;
  onFinish: () => void;
  finishLabel: string;
}) {
  const t = useTranslations("exam");
  const [filter, setFilter] = useState<"all" | "flagged" | "incomplete">("all");
  const shown = items.filter((i) =>
    filter === "flagged" ? flags[i.id] : filter === "incomplete" ? itemState(i, responses[i.id]) !== "answered" : true,
  );
  const label = { answered: t("stateAnswered"), incomplete: t("stateIncomplete"), unanswered: t("stateUnanswered") };
  return (
    <section aria-labelledby="review-title" className="space-y-6">
      <div>
        <h1 id="review-title" className="text-xl font-bold">{t("reviewTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("reviewHelp")}</p>
      </div>
      <div role="radiogroup" aria-label={t("reviewTitle")} className="flex gap-2">
        {(["all", "flagged", "incomplete"] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={filter === f}
            onClick={() => setFilter(f)}
            className={cn("rounded-full border px-3 py-1 text-sm", filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}
          >
            {t(f === "all" ? "filterAll" : f === "flagged" ? "filterFlagged" : "filterIncomplete")}
            {" "}({f === "all" ? items.length : f === "flagged" ? items.filter((i) => flags[i.id]).length : items.filter((i) => itemState(i, responses[i.id]) !== "answered").length})
          </button>
        ))}
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2">
        {shown.map((i) => {
          const state = itemState(i, responses[i.id]);
          return (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => onOpen(i)}
                aria-label={`${t("goToQuestion", { n: i.order })} — ${label[state]}${flags[i.id] ? ` — ${t("stateFlagged")}` : ""}`}
                className={cn(
                  "flex w-full flex-col items-start rounded-md border px-3 py-2 text-left text-sm hover:bg-muted",
                  state === "answered" ? "border-primary" : state === "incomplete" ? "border-warning" : "border-dashed border-muted-foreground",
                )}
              >
                <span className="font-semibold">{i.order}</span>
                <span className={cn("text-xs", state === "answered" ? "text-primary" : state === "incomplete" ? "text-warning" : "text-muted-foreground")}>
                  {label[state]}
                </span>
                {flags[i.id] && <span className="text-xs font-medium text-danger">⚑ {t("stateFlagged")}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-3 border-t border-border pt-4">
        <Button variant="secondary" onClick={onBack}>← {t("backToQuestions")}</Button>
        <Button className="ml-auto" onClick={onFinish}>{finishLabel}</Button>
      </div>
    </section>
  );
}
