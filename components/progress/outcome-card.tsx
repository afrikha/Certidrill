import { useFormatter, useTranslations } from "next-intl";
import { deleteOutcomeAction } from "@/lib/actions/outcome";
import { Button } from "@/components/ui/button";
import { OutcomeForm } from "./outcome-form";

export interface OutcomeItem {
  id: string;
  takenOn: string;
  passed: boolean;
  score: number | null;
}

/** Dashboard: report the result of the real exam, and see or delete one's own reports. */
export function OutcomeCard({ certification, maxScore, today, outcomes }: Readonly<{ certification: string; maxScore: number; today: string; outcomes: readonly OutcomeItem[] }>) {
  const t = useTranslations("outcome");
  const format = useFormatter();
  return (
    <section aria-labelledby={`outcome-title-${certification}`} className="rounded-lg border border-border bg-background p-6 shadow-sm" data-testid="outcome">
      <h2 id={`outcome-title-${certification}`} className="font-semibold">{t("title")}</h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">{t("why")}</p>
      <OutcomeForm certification={certification} maxScore={maxScore} today={today} />
      {outcomes.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold">{t("mine")}</h3>
          <ul className="space-y-2 text-sm">
            {outcomes.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3" data-outcome={o.takenOn}>
                <span>{format.dateTime(new Date(`${o.takenOn}T12:00:00Z`), { dateStyle: "long" })}</span>
                <span className={o.passed ? "font-semibold text-success" : "font-semibold text-danger"}>{o.passed ? t("passed") : t("failed")}</span>
                {o.score !== null && <span className="tabular-nums">{o.score} / {maxScore}</span>}
                <form action={deleteOutcomeAction}>
                  <input type="hidden" name="id" value={o.id} />
                  <Button type="submit" variant="ghost" className="px-2 py-1 text-xs underline" aria-label={t("deleteOne", { date: o.takenOn })}>{t("delete")}</Button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">{t("privacy")}</p>
    </section>
  );
}
