import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { QuizSummary } from "@/lib/course/quiz";
import { QUIZ_RULES } from "@/lib/course/quiz-rules";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * "Check this chapter" at the bottom of a chapter page: the quiz, with the
 * best result; put forward once every section is read (§3.1).
 */
export function QuizBox({ summary, href, finished }: Readonly<{ summary: QuizSummary; href: string; finished: boolean }>) {
  const t = useTranslations("quiz");
  const format = useFormatter();
  const { best } = summary;
  return (
    <Card className={cn("space-y-3", finished && "border-primary bg-primary/5")} data-testid="quiz-box">
      <h2 className="text-xl font-semibold">{t("boxTitle")}</h2>
      <p className="text-sm">{t("boxText", { n: QUIZ_RULES.length, minutes: QUIZ_RULES.minutes })}</p>
      {finished && !best && <p className="text-sm font-medium">{t("boxDone")}</p>}
      {best && (
        <p className="text-sm" data-testid="quiz-best">
          <span className="font-semibold">{t(`state_${summary.state}`)}</span> ·{" "}
          {t("best", { score: best.score, total: QUIZ_RULES.length, date: format.dateTime(new Date(best.completedAt), { dateStyle: "medium" }) })}
        </p>
      )}
      <Link href={href} className={buttonClasses(finished || !best ? "primary" : "secondary")}>{best ? t("restart") : t("start")}</Link>
    </Card>
  );
}
