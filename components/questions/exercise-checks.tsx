import { useTranslations } from "next-intl";
import type { CheckLine } from "@/lib/exam/results";
import { cn } from "@/lib/utils";
import { Html } from "./html";

/**
 * The checks of a practical exercise after submission, each passed (✓) or
 * failed (✗), and why the answer could not be checked (YAML error, command
 * refused…): docs/SPECS-KUBERNETES-PRATIQUE.md §4. Used by the quiz
 * correction and the review of a series.
 */
export function ExerciseChecks({ checks, error }: Readonly<{ checks?: CheckLine[]; error?: string }>) {
  const t = useTranslations("question");
  if (!checks?.length) return null;
  const passed = checks.filter((c) => c.passed).length;
  return (
    <section className="rounded-md border border-border p-4 text-sm" data-testid="exercise-checks">
      <h2 className="mb-2 font-semibold">{t("checks", { passed, total: checks.length })}</h2>
      {error && (
        <p className="mb-2 rounded bg-red-50 px-3 py-2 text-danger" data-testid="exercise-error">
          {t("exerciseError")} <code className="font-mono text-xs">{error}</code>
        </p>
      )}
      <ul className="space-y-1">
        {checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2" data-check={c.id} data-passed={c.passed}>
            <span aria-hidden="true" className={cn("font-bold", c.passed ? "text-success" : "text-danger")}>{c.passed ? "✓" : "✗"}</span>
            <span className="sr-only">{c.passed ? t("checkPassed") : t("checkFailed")}</span>
            <Html html={c.labelHtml} inline />
          </li>
        ))}
      </ul>
    </section>
  );
}
