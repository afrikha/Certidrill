import Link from "next/link";
import { useTranslations } from "next-intl";
import type { QuizSummary } from "@/lib/course/quiz";
import { QUIZ_RULES } from "@/lib/course/quiz-rules";
import { cn } from "@/lib/utils";

const TONE = {
  not_attempted: "bg-muted",
  to_review: "bg-amber-100 text-amber-900",
  mastered: "bg-green-100 text-green-900",
} as const;

/** The state of a chapter's quiz in the course outline, with its best score (docs/SPECS-QUIZ-CHAPITRE.md §3.1). */
export function QuizBadge({ summary, href }: Readonly<{ summary: QuizSummary; href: string }>) {
  const t = useTranslations("quiz");
  const state = t(`state_${summary.state}`);
  return (
    <Link href={href} className={cn("inline-block rounded px-2 py-0.5 text-xs font-semibold underline-offset-2 hover:underline", TONE[summary.state])} data-testid="quiz-badge" data-state={summary.state}>
      {summary.state === "mastered" && <span aria-hidden>✓ </span>}
      {summary.best ? t("badge", { state, score: summary.best.score, total: QUIZ_RULES.length }) : state}
    </Link>
  );
}
