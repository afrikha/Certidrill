import { useTranslations } from "next-intl";
import type { Readiness, ReadinessCheck, Verdict } from "@/lib/progress/readiness";
import { cn } from "@/lib/utils";

/** Colour of each verdict, as text and as SVG stroke. */
export const TONE: Record<Verdict, { text: string; stroke: string; border: string }> = {
  not_ready: { text: "text-danger", stroke: "stroke-danger", border: "border-danger" },
  progressing: { text: "text-warning", stroke: "stroke-warning", border: "border-warning" },
  almost: { text: "text-primary", stroke: "stroke-primary", border: "border-primary" },
  ready: { text: "text-success", stroke: "stroke-success", border: "border-success" },
};

/** Point of the gauge's arc (centre 100,100, radius 80) for a value 0–100. */
function arcPoint(value: number, radius = 80): { x: number; y: number } {
  const angle = Math.PI * (1 - value / 100);
  return { x: 100 + radius * Math.cos(angle), y: 100 - radius * Math.sin(angle) };
}

/**
 * Half-circle gauge of the index. Decorative: the index and the verdict are
 * always written next to it.
 */
export function ReadinessGauge({ index, verdict, marks, previous = null }: Readonly<{ index: number; verdict: Verdict; marks: readonly number[]; previous?: number | null }>) {
  const arc = "M 20 100 A 80 80 0 0 1 180 100";
  const ghost = previous === null ? null : { inner: arcPoint(previous, 64), outer: arcPoint(previous, 96) };
  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-56" aria-hidden data-testid="readiness-gauge">
      <path d={arc} fill="none" className="stroke-muted" strokeWidth={16} strokeLinecap="round" />
      {index > 0 && <path d={arc} fill="none" className={TONE[verdict].stroke} strokeWidth={16} strokeLinecap="round" pathLength={100} strokeDasharray={`${index} 100`} />}
      {marks.map((m) => {
        const inner = arcPoint(m, 68);
        const outer = arcPoint(m, 92);
        return <line key={m} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} className="stroke-foreground/50" strokeWidth={2} />;
      })}
      {/* The previous index, for comparison. */}
      {ghost && <line x1={ghost.inner.x} y1={ghost.inner.y} x2={ghost.outer.x} y2={ghost.outer.y} className="stroke-foreground" strokeOpacity={0.7} strokeWidth={2} strokeDasharray="3 3" data-testid="readiness-previous" />}
    </svg>
  );
}

export type T = ReturnType<typeof useTranslations<"readiness">>;

export function checkText(t: T, c: ReadinessCheck, domainTitle: (code: string) => string): string {
  const state = c.ok ? "ok" : "ko";
  switch (c.code) {
    case "streak":
      return t(`streak_${state}`, { value: c.value, target: c.target, min: c.min });
    case "weakest_domain":
      return t(`weakest_domain_${state}`, { value: c.value, target: c.target, domain: domainTitle(c.domain) });
    case "index":
      return t(`index_${state}`, { value: c.value, target: c.target, criterion: t(`criterion_${c.criterion}`) });
    default:
      return t(`${c.code}_${state}`, { value: c.value, target: c.target });
  }
}

function CheckList({ checks, domainTitle, t }: Readonly<{ checks: readonly ReadinessCheck[]; domainTitle: (code: string) => string; t: T }>) {
  return (
    <ul className="space-y-1 text-sm">
      {checks.map((c) => (
        <li key={c.code} className="flex gap-2" data-check={c.code} data-ok={c.ok}>
          <span aria-hidden className={cn("font-bold", c.ok ? "text-success" : "text-danger")}>{c.ok ? "✓" : "✗"}</span>
          <span>
            <span className="sr-only">{c.ok ? t("met") : t("notMet")} </span>
            {checkText(t, c, domainTitle)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The central indicator of the dashboard: index, verdict, the rules for
 * "ready" and what the index is made of.
 */
export function ReadinessCard({ readiness: r, bands, weights, domainTitles }: Readonly<{
  readiness: Readiness;
  bands: readonly number[];
  weights: Record<keyof Readiness["criteria"], number>;
  domainTitles: Readonly<Record<string, string>>;
}>) {
  const t = useTranslations("readiness");
  const domainTitle = (code: string) => domainTitles[code] ?? code;
  const rules = r.checks.filter((c) => c.blocking);
  const details = r.checks.filter((c) => !c.blocking);
  const tone = TONE[r.verdict];
  const criteria = Object.keys(r.criteria) as (keyof Readiness["criteria"])[];
  return (
    <section aria-labelledby="readiness-title" className={cn("rounded-lg border-2 bg-background p-6 shadow-sm", tone.border)} data-testid="readiness" data-verdict={r.verdict}>
      <h2 id="readiness-title" className="font-semibold">{t("title")}</h2>
      <div className="mt-4 grid items-center gap-6 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center">
          <ReadinessGauge index={r.index} verdict={r.verdict} marks={bands} />
          <p className="-mt-10 text-4xl font-bold tabular-nums" data-testid="readiness-index">
            {r.index}<span className="text-lg text-muted-foreground"> / 100</span>
          </p>
          <p className={cn("mt-1 text-lg font-bold", tone.text)} data-testid="readiness-verdict">{t(`verdict_${r.verdict}`)}</p>
          {r.capped && <p className="mt-1 max-w-56 text-center text-xs text-muted-foreground" data-testid="readiness-capped">{t("capped", { raw: r.raw })}</p>}
        </div>
        <div className="space-y-4">
          <p className="text-sm">{t(`summary_${r.verdict}`)}</p>
          <div>
            <h3 className="mb-1 text-sm font-semibold">{t("rules")}</h3>
            <CheckList checks={rules} domainTitle={domainTitle} t={t} />
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold">{t("details")}</h3>
            <CheckList checks={details} domainTitle={domainTitle} t={t} />
          </div>
        </div>
      </div>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted-foreground">{t("howTitle")}</summary>
        <p className="mt-2">{t("how")}</p>
        <table className="mt-2 w-full max-w-md text-left">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="py-1 pr-4">{t("criterion")}</th>
              <th scope="col" className="pr-4">{t("weight")}</th>
              <th scope="col">{t("points")}</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((k) => (
              <tr key={k} className="border-b border-border">
                <td className="py-1 pr-4">{t(`criterion_${k}`)}</td>
                <td className="pr-4 tabular-nums">{Math.round(weights[k] * 100)} %</td>
                <td className="tabular-nums">{r.criteria[k]} / 100</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <p className="mt-4 text-xs text-muted-foreground">{t("disclaimer")}</p>
    </section>
  );
}

export function deltaText(t: T, before: Readiness | null, after: Readiness): string {
  if (!before) return t("first");
  const delta = after.index - before.index;
  if (delta > 0) return t("up", { n: delta });
  if (delta < 0) return t("down", { n: -delta });
  return t("same");
}

export const RANK: Record<Verdict, number> = { not_ready: 0, progressing: 1, almost: 2, ready: 3 };
