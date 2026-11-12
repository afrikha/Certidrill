import { useFormatter, useTranslations } from "next-intl";
import type { ProgressionConfig } from "@/lib/content/schema";
import { BADGES, type Badge, type BadgeCode, type MasteryTier, type XpGain } from "@/lib/progress/progression";
import { cn } from "@/lib/utils";

const TIER: Record<MasteryTier, string> = {
  gold: "border-yellow-500 bg-yellow-50 text-yellow-900",
  silver: "border-slate-400 bg-slate-50 text-slate-800",
  bronze: "border-orange-400 bg-orange-50 text-orange-900",
  none: "border-border bg-muted text-muted-foreground",
};
const MEDAL: Record<MasteryTier, string> = { gold: "🥇", silver: "🥈", bronze: "🥉", none: "·" };
const ICON: Record<BadgeCode, string> = {
  first_exam: "🚀",
  first_pass: "✅",
  personal_best: "📈",
  gold_domain: "🏅",
  hat_trick: "🎯",
  regular: "📅",
  comeback: "💪",
};

type T = ReturnType<typeof useTranslations<"progression">>;

/** Parameters of each badge's description, from the blueprint. */
function badgeValues(code: BadgeCode, rules: Pick<ProgressionConfig, "badges" | "mastery">): Record<string, number> {
  switch (code) {
    case "gold_domain":
      return { min: rules.mastery.gold };
    case "hat_trick":
      return { count: rules.badges.hatTrick.count, min: rules.badges.hatTrick.min };
    case "regular":
      return { weeks: rules.badges.regular.weeks };
    case "comeback":
      return { gain: rules.badges.comeback.gain };
    default:
      return {};
  }
}

/** Level number in a disc. Decorative: the level is always written next to it. */
function LevelDisc({ n, className }: Readonly<{ n: number; className?: string }>) {
  return (
    <span aria-hidden className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground tabular-nums", className)}>
      {n}
    </span>
  );
}

/** XP bar toward the next level. */
function XpBar({ xp, from, next, t }: Readonly<{ xp: number; from: number; next: number | null; t: T }>) {
  const share = next === null ? 1 : (xp - from) / (next - from);
  return (
    <div>
      <div className="h-3 rounded-sm bg-muted" aria-hidden>
        <div className="h-3 rounded-sm bg-primary" style={{ width: `${Math.round(Math.min(1, Math.max(0, share)) * 100)}%` }} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground" data-testid="xp-next">
        {next === null ? t("maxLevel", { xp }) : t("toNext", { xp, next, missing: next - xp })}
      </p>
    </div>
  );
}

/** Dashboard: level, XP, domain mastery and badges of a certification. Private to the user. */
export function ProgressionCard({ progression: p, rules, domainTitles }: Readonly<{
  progression: { xp: number; level: { n: number; from: number; next: number | null }; levels: number; title: string; nextTitle: string | null; badges: readonly Badge[]; mastery: readonly { code: string; scaledScore: number; tier: MasteryTier }[] };
  rules: Pick<ProgressionConfig, "badges" | "mastery">;
  domainTitles: Readonly<Record<string, string>>;
}>) {
  const t = useTranslations("progression");
  const format = useFormatter();
  const earned = new Map(p.badges.map((b) => [b.code, b]));
  return (
    <section aria-labelledby="progression-title" className="rounded-lg border border-border bg-background p-6 shadow-sm" data-testid="progression">
      <h2 id="progression-title" className="font-semibold">{t("title")}</h2>
      <div className="mt-4 flex items-center gap-4">
        <LevelDisc n={p.level.n} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold" data-testid="level">
            {t("level", { n: p.level.n, max: p.levels })} — {p.title}
          </p>
          {p.nextTitle && <p className="text-sm text-muted-foreground">{t("nextTitle", { title: p.nextTitle })}</p>}
          <div className="mt-2">
            <XpBar xp={p.xp} from={p.level.from} next={p.level.next} t={t} />
          </div>
        </div>
      </div>

      <h3 className="mt-6 mb-2 text-sm font-semibold">{t("mastery")}</h3>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {p.mastery.map((m) => (
          <li key={m.code} className={cn("rounded-md border px-3 py-2 text-sm", TIER[m.tier])} data-domain={m.code} data-tier={m.tier}>
            <span aria-hidden className="mr-1">{MEDAL[m.tier]}</span>
            <span className="font-semibold">{t(`tier_${m.tier}`)}</span>
            <span className="block">{domainTitles[m.code] ?? m.code}</span>
            <span className="block tabular-nums">{m.scaledScore}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-muted-foreground">{t("masteryHelp", { bronze: rules.mastery.bronze, silver: rules.mastery.silver, gold: rules.mastery.gold })}</p>

      <h3 className="mt-6 mb-2 text-sm font-semibold">{t("badges", { n: earned.size, total: BADGES.length })}</h3>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {BADGES.map((code) => {
          const badge = earned.get(code);
          return (
            <li key={code} className={cn("flex gap-3 rounded-md border px-3 py-2 text-sm", badge ? "border-primary" : "border-dashed border-border text-muted-foreground")} data-badge={code} data-earned={Boolean(badge)}>
              <span aria-hidden className={cn("text-2xl", !badge && "opacity-40 grayscale")}>{ICON[code]}</span>
              <span>
                <span className="block font-semibold">{t(`badge_${code}`)}</span>
                <span className="block">{t(`badge_${code}_how`, badgeValues(code, rules))}</span>
                <span className="block text-xs">{badge ? t("earnedOn", { date: format.dateTime(badge.earnedAt, { dateStyle: "medium" }) }) : t("locked")}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">{t("private")}</p>
    </section>
  );
}

/** Results page: XP earned by this exam, level-up and new badges. */
export function XpGainCard({ gain, xp, level, levels, previousTitle, badges }: Readonly<{
  gain: XpGain;
  xp: number;
  level: { n: number; title: string; from: number; next: number | null };
  levels: number;
  previousTitle: string | null;
  badges: readonly Badge[];
}>) {
  const t = useTranslations("progression");
  const levelUp = gain.levelAfter > gain.levelBefore;
  return (
    <section aria-labelledby="xp-gain-title" className="rounded-lg border border-border bg-background p-6 shadow-sm" data-testid="xp-gain">
      <h2 id="xp-gain-title" className="text-sm text-muted-foreground">{t("gainTitle")}</h2>
      <div className="mt-2 flex flex-wrap items-start gap-6">
        <div>
          <p className="text-4xl font-bold text-primary tabular-nums motion-safe:animate-[xp-pop_0.6s_ease-out]" data-testid="xp-total">+{gain.total} XP</p>
          <ul className="mt-2 text-sm text-muted-foreground">
            {gain.parts.map((part) => (
              <li key={part.code} className="flex justify-between gap-6">
                <span>{t(`part_${part.code}`)}</span>
                <span className="tabular-nums">+{part.xp}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-56 flex-1 space-y-2">
          {levelUp ? (
            <p className="flex items-center gap-3 text-lg font-bold motion-safe:animate-[xp-pop_0.6s_ease-out]" data-testid="level-up">
              <LevelDisc n={level.n} className="h-12 w-12 text-xl" />
              <span>
                {t("levelUp", { from: gain.levelBefore, to: gain.levelAfter, count: gain.levelAfter - gain.levelBefore })}
                <span className="block text-sm font-normal text-muted-foreground">{t("newTitle", { previous: previousTitle ?? "", title: level.title })}</span>
              </span>
            </p>
          ) : (
            <p className="font-semibold" data-testid="level">{t("level", { n: level.n, max: levels })} — {level.title}</p>
          )}
          <XpBar xp={xp} from={level.from} next={level.next} t={t} />
          {badges.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">{t("newBadges", { n: badges.length })}</h3>
              <ul className="mt-1 flex flex-wrap gap-2">
                {badges.map((b) => (
                  <li key={b.code} className="rounded-full border border-primary px-3 py-1 text-sm" data-badge={b.code}>
                    <span aria-hidden className="mr-1">{ICON[b.code]}</span>
                    {t(`badge_${b.code}`)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
