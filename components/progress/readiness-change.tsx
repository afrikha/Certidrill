"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReadinessConfig } from "@/lib/content/schema";
import { newlyMet, TIMELINE } from "@/lib/progress/celebration";
import { verdictOf, type Readiness, type ReadinessCheck } from "@/lib/progress/readiness";
import { cn } from "@/lib/utils";
import { useCelebrating, useStep } from "./celebration";
import { checkText, deltaText, RANK, ReadinessGauge, TONE, type T } from "./readiness";

/** A rule this exam met: a cross that turns into a tick when its turn comes. */
function UnlockedRule({ check, ticked, flash, domainTitle, t }: Readonly<{ check: ReadinessCheck; ticked: boolean; flash: boolean; domainTitle: (code: string) => string; t: T }>) {
  return (
    <li className={cn("flex gap-2 rounded-sm", flash && "motion-safe:animate-[rule-flash_1.2s_ease-out]")} data-check={check.code} data-ok={ticked}>
      <svg viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0" aria-hidden>
        <circle cx={10} cy={10} r={8.5} fill="none" strokeWidth={2} className={cn("transition-colors duration-300", ticked ? "stroke-success" : "stroke-danger")} />
        <path d="M7 7l6 6M13 7l-6 6" fill="none" strokeWidth={2.4} strokeLinecap="round" className={cn("stroke-danger transition-opacity", ticked && "opacity-0")} />
        <path d="M6 10.5l2.8 2.7L14.2 7.5" fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="stroke-success transition-[stroke-dashoffset] duration-500" strokeDasharray={14} strokeDashoffset={ticked ? 0 : 14} />
      </svg>
      <span>
        <span className="sr-only">{t("met")} </span>
        {checkText(t, check, domainTitle)}
      </span>
    </li>
  );
}

/**
 * On the results page: how this exam moved the readiness index. While the
 * results animation plays (Celebration), the gauge moves from the previous
 * index, the verdict follows the bands it crosses, and the rules this exam met
 * tick one by one.
 */
export function ReadinessChange({ before, after, bands, domainTitles = {} }: Readonly<{
  before: Readiness | null;
  after: Readiness;
  bands: ReadinessConfig["bands"];
  domainTitles?: Readonly<Record<string, string>>;
}>) {
  const t = useTranslations("readiness");
  const playing = useCelebrating();
  const from = before?.index ?? 0;
  const value = from + (after.index - from) * useStep(TIMELINE.gauge.delay, TIMELINE.gauge.duration);
  // The final verdict is the computed one (caps included); while moving, the band of the value shown.
  const verdict = playing ? verdictOf(value, bands) : after.verdict;
  const tone = TONE[verdict];
  const promoted = before !== null && RANK[after.verdict] > RANK[before.verdict];
  const reached = promoted && RANK[verdict] > RANK[before.verdict];

  const unlocked = newlyMet(before, after);
  const { delay, step, duration } = TIMELINE.rules;
  const span = Math.max(1, unlocked.length - 1) * step + duration;
  const elapsed = useStep(delay, span, true) * span;
  const domainTitle = (code: string) => domainTitles[code] ?? code;

  return (
    <section aria-labelledby="readiness-change-title" className={cn("rounded-lg border-2 bg-background p-6 shadow-sm transition-colors duration-500", tone.border)} data-testid="readiness-change" data-verdict={verdict}>
      <h2 id="readiness-change-title" className="text-sm text-muted-foreground">{t("title")}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-6">
        <div className="flex w-56 flex-col items-center">
          <ReadinessGauge index={value} verdict={verdict} marks={[bands.progressing, bands.almost, bands.ready]} previous={before?.index ?? null} />
          <p className="-mt-10 text-4xl font-bold tabular-nums" data-testid="readiness-change-index">
            {Math.round(value)}<span className="text-lg text-muted-foreground"> / 100</span>
          </p>
          <p
            key={playing && reached ? "reached" : "stage"}
            className={cn("rounded-full px-3 font-bold transition-colors duration-500", tone.text, playing && reached && "motion-safe:animate-[stage-burst_1s_ease-out]")}
          >
            {t(`verdict_${verdict}`)}
          </p>
        </div>
        <div className="min-w-0 flex-1 space-y-2 text-sm">
          <p className="font-semibold" data-testid="readiness-delta">{deltaText(t, before, after)}</p>
          {promoted && (
            <p className={cn("font-semibold transition-opacity duration-300", TONE[after.verdict].text, playing && !reached && "opacity-0")}>
              {t("promoted", { verdict: t(`verdict_${after.verdict}`) })}
            </p>
          )}
          {unlocked.length > 0 && (
            <div>
              <h3 className="mb-1 font-semibold">{t("unlocked")}</h3>
              <ul className="space-y-1" data-testid="readiness-unlocked">
                {unlocked.map((c, i) => (
                  <UnlockedRule key={c.code} check={c} ticked={elapsed >= i * step + 1} flash={playing && elapsed >= i * step + 1} domainTitle={domainTitle} t={t} />
                ))}
              </ul>
            </div>
          )}
          <Link href="/dashboard" className="inline-block text-primary underline">{t("seeDetails")}</Link>
        </div>
      </div>
    </section>
  );
}
