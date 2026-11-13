"use client";

import { useTranslations } from "next-intl";
import { easeOut, partShares, TIMELINE } from "@/lib/progress/celebration";
import type { Badge, XpGain } from "@/lib/progress/progression";
import { cn } from "@/lib/utils";
import { Confetti, useCelebrating, useStep } from "./celebration";
import { ICON, LevelDisc, XpBar } from "./progression";

/**
 * Results page: XP earned by this exam, level-up and new badges. While the
 * results animation plays (Celebration), each XP source arrives in turn and
 * fills the bar; crossing a level turns the disc, shows the level-up and
 * throws confetti; then the new badges turn over.
 */
export function XpGainCard({ gain, xp, level, levels, previousTitle, badges, ladder = [], delay = TIMELINE.alone }: Readonly<{
  gain: XpGain;
  xp: number;
  level: { n: number; title: string; from: number; next: number | null };
  levels: number;
  previousTitle: string | null;
  badges: readonly Badge[];
  /** XP and title of every level, to follow the bar across levels. */
  ladder?: readonly { xp: number; title: string }[];
  /** When the XP sources start, in ms after the start of the animation. */
  delay?: number;
}>) {
  const t = useTranslations("progression");
  const playing = useCelebrating() && ladder.length > 0;
  const span = Math.max(1, gain.parts.length) * TIMELINE.xp.step;
  const shares = partShares(useStep(delay, span, true), gain.parts.length).map(easeOut);
  const badgeStep = useStep(delay + span + TIMELINE.badges.gap, TIMELINE.badges.duration);

  const earned = playing ? gain.parts.reduce((sum, part, i) => sum + part.xp * shares[i]!, 0) : gain.total;
  const current = playing ? xp - gain.total + earned : xp;
  const n = playing ? Math.max(1, ladder.filter((l) => current >= l.xp).length) : level.n;
  const shown = playing ? { n, title: ladder[n - 1]!.title, from: ladder[n - 1]!.xp, next: ladder[n]?.xp ?? null } : level;
  const levelUp = gain.levelAfter > gain.levelBefore;
  const reached = levelUp && n > gain.levelBefore;

  return (
    <section aria-labelledby="xp-gain-title" className="relative overflow-hidden rounded-lg border border-border bg-background p-6 shadow-sm" data-testid="xp-gain">
      <h2 id="xp-gain-title" className="text-sm text-muted-foreground">{t("gainTitle")}</h2>
      <div className="mt-2 flex flex-wrap items-start gap-6">
        <div>
          <p className="text-4xl font-bold text-primary tabular-nums" data-testid="xp-total">+{Math.round(earned)} XP</p>
          <ul className="mt-2 text-sm text-muted-foreground">
            {gain.parts.map((part, i) => (
              <li key={part.code} className={cn("flex justify-between gap-6 transition-opacity duration-300", playing && shares[i] === 0 && "opacity-30")}>
                <span>{t(`part_${part.code}`)}</span>
                <span className="tabular-nums">+{part.xp}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-56 flex-1 space-y-2">
          {/* Same height before and after the level-up: nothing below moves. */}
          <div className={cn(levelUp && "flex min-h-12 items-center")}>
            {reached ? (
              <p className="flex items-center gap-3 text-lg font-bold" data-testid="level-up">
                <LevelDisc key={shown.n} n={shown.n} className={cn("h-12 w-12 text-xl", playing && "motion-safe:animate-[level-flip_0.7s_ease-in-out]")} />
                <span>
                  {t("levelUp", { from: gain.levelBefore, to: gain.levelAfter, count: gain.levelAfter - gain.levelBefore })}
                  <span className="block text-sm font-normal text-muted-foreground">{t("newTitle", { previous: previousTitle ?? "", title: level.title })}</span>
                </span>
              </p>
            ) : (
              <p className="font-semibold" data-testid="level">{t("level", { n: shown.n, max: levels })} — {shown.title}</p>
            )}
          </div>
          <XpBar xp={Math.round(current)} from={shown.from} next={shown.next} t={t} />
          {badges.length > 0 && (
            <div className={cn("transition-opacity duration-300", playing && badgeStep === 0 && "opacity-0")}>
              <h3 className="text-sm font-semibold">{t("newBadges", { n: badges.length })}</h3>
              <ul className="mt-1 flex flex-wrap gap-2">
                {badges.map((b) => (
                  <li
                    key={b.code}
                    className={cn("rounded-full border border-primary px-3 py-1 text-sm", playing && badgeStep > 0 && "motion-safe:animate-[badge-reveal_0.8s_ease-out]")}
                    data-badge={b.code}
                  >
                    <span aria-hidden className="mr-1">{ICON[b.code]}</span>
                    {t(`badge_${b.code}`)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <Confetti fire={playing && reached} />
    </section>
  );
}
