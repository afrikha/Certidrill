/**
 * Decorative pieces of the landing page: a stylised exam screen, a
 * correction, domain mastery, experience and the overview of several
 * certifications, drawn in HTML (no image to keep in sync with the real
 * interface). They are hidden from assistive technologies: the text of the
 * page says the same.
 */
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

const ICONS = {
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  chat: <><path d="M4 5h16v11H8l-4 4V5Z" /><path d="M8 9h8M8 12h5" /></>,
  trend: <><path d="M3 17 9 11l4 4 8-8" /><path d="M15 7h6v6" /></>,
  check: <path d="m5 12 4 4 10-10" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" /><path d="M4 19a2 2 0 0 1 2-2h13" /><path d="M9 7h6" /></>,
  quiz: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="m8 9 1.5 1.5L12 8" /><path d="M14 9h2" /><path d="m8 15 1.5 1.5L12 14" /><path d="M14 15h2" /></>,
  gauge: <><path d="M4 18a8 8 0 1 1 16 0" /><path d="m12 18 4-6" /></>,
  award: <><circle cx="12" cy="9" r="6" /><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7" /></>,
  stack: <><rect x="3" y="4" width="18" height="5" rx="1.5" /><rect x="3" y="10" width="18" height="5" rx="1.5" /><rect x="3" y="16" width="18" height="4" rx="1.5" /></>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9Z" /></>,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className }: Readonly<{ name: IconName; className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn("size-5", className)}>
      {ICONS[name]}
    </svg>
  );
}

/** Lines of text, drawn as bars. */
function Lines({ widths, className }: Readonly<{ widths: readonly number[]; className?: string }>) {
  return (
    <div className="space-y-2">
      {widths.map((w, i) => <div key={i} className={cn("h-2 rounded-full bg-slate-200", className)} style={{ width: `${w}%` }} />)}
    </div>
  );
}

interface PreviewBlueprint {
  durationMin: number;
  minQuestions: number;
  maxQuestions: number;
  passScore: number;
  maxScore: number;
  domains: number;
}

/**
 * A mock exam in progress, with the readiness and experience it leads to.
 * The figures come from a current blueprint: an exam of typical length, a
 * little past halfway.
 */
export async function ExamPreview({ blueprint: b }: Readonly<{ blueprint: PreviewBlueprint }>) {
  const t = await getTranslations("home.preview");
  const total = Math.round((b.minQuestions + b.maxQuestions) / 2);
  const current = Math.round(total * 0.52);
  const left = Math.round(b.durationMin * 0.72);
  const clock = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}:45`;
  const progress = Math.round((current / total) * 100);
  return (
    <div aria-hidden className="relative isolate mx-auto w-full max-w-md select-none lg:mx-0 lg:ml-auto">
      <div className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-gradient-to-br from-blue-300/50 via-indigo-200/40 to-cyan-100/30 blur-3xl" />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-blue-950/15 ring-1 ring-slate-900/5">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-slate-300" />
            <span className="size-2.5 rounded-full bg-slate-300" />
            <span className="size-2.5 rounded-full bg-slate-300" />
          </span>
          <span className="font-medium text-slate-600">{t("question", { current, total })}</span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-2 py-1 font-mono font-semibold tabular-nums text-white">
            <Icon name="clock" className="size-3.5" />{clock}
          </span>
        </div>
        <div className="h-1 bg-slate-100"><div className="h-full rounded-r-full bg-gradient-to-r from-blue-600 to-indigo-500" style={{ width: `${progress}%` }} /></div>
        <div className="space-y-4 p-5">
          <div className="flex justify-end">
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">⚑ {t("flag")}</span>
          </div>
          <Lines widths={[92, 80, 64]} />
          <ul className="space-y-2">
            {[false, true, false, false].map((selected, i) => (
              <li key={i} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2.5", selected ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-slate-200")}>
                <span className={cn("grid size-4 shrink-0 place-items-center rounded-full border-2", selected ? "border-blue-600" : "border-slate-300")}>
                  {selected && <span className="size-2 rounded-full bg-blue-600" />}
                </span>
                <span className={cn("h-2 rounded-full", selected ? "bg-blue-300" : "bg-slate-200")} style={{ width: `${[62, 74, 48, 56][i]}%` }} />
              </li>
            ))}
          </ul>
          <div className="flex justify-between pt-1 text-xs font-medium">
            <span className="rounded-lg border border-slate-200 px-3 py-2 text-slate-600">{t("previous")}</span>
            <span className="rounded-lg bg-blue-600 px-4 py-2 text-white">{t("next")}</span>
          </div>
        </div>
      </div>

      {/* Readiness, below left */}
      <div className="absolute -bottom-10 -left-3 w-48 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl shadow-blue-950/10 backdrop-blur sm:-left-12">
        <p className="text-xs font-medium text-slate-500">{t("readiness")}</p>
        <div className="mt-2 flex items-center gap-3">
          <svg viewBox="0 0 36 36" className="size-12 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="94.2" strokeDashoffset="20" className="text-emerald-500" />
          </svg>
          <span className="text-sm font-semibold text-emerald-700">{t("almost")}</span>
        </div>
      </div>

      {/* Experience, top right */}
      <div className="absolute -right-2 -top-16 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl shadow-blue-950/10 backdrop-blur sm:-right-8">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-white"><Icon name="award" className="size-4" /></span>
          <div>
            <p className="text-xs font-semibold text-slate-900">{t("level", { n: 4 })}</p>
            <p className="text-xs font-medium text-indigo-600">{t("xp", { xp: 120 })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A corrected question: the right option, and why another one is wrong. */
export async function CorrectionPreview() {
  const t = await getTranslations("home.preview");
  return (
    <div aria-hidden className="select-none space-y-2.5 text-xs">
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3">
        <p className="flex items-center gap-1.5 font-semibold text-emerald-800"><Icon name="check" className="size-4" />{t("correct")}</p>
        <div className="mt-2"><Lines widths={[90, 70]} className="bg-emerald-200" /></div>
      </div>
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
        <p className="flex items-center gap-1.5 font-semibold text-rose-800"><Icon name="x" className="size-4" />{t("wrong")}</p>
        <div className="mt-2"><Lines widths={[84, 56]} className="bg-rose-200" /></div>
      </div>
    </div>
  );
}

/** Mastery of the domains of an exam: gold, silver, bronze. */
export async function MasteryPreview() {
  const t = await getTranslations("home.preview");
  const rows = [
    [92, "gold", "bg-amber-400"],
    [81, "silver", "bg-slate-400"],
    [74, "bronze", "bg-orange-400"],
    [58, null, "bg-slate-300"],
  ] as const;
  return (
    <div aria-hidden className="select-none space-y-2 text-xs">
      {rows.map(([value, tier, color], i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-slate-100"><div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} /></div>
          <span className="w-12 text-right font-medium text-slate-500">{tier ? t(tier) : ""}</span>
        </div>
      ))}
    </div>
  );
}

/** A chapter being read, and its quiz. */
export async function CoursePreview() {
  const t = await getTranslations("home.preview");
  return (
    <div aria-hidden className="select-none space-y-2 text-xs">
      {[[3, 3, true], [2, 4, false]].map(([read, total, done], i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", done ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700")}>
            {done ? <Icon name="check" className="size-3.5" /> : <Icon name="book" className="size-3.5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-800">{t("chapter", { n: i + 1 })}</p>
            <p className="text-slate-500">{t("read", { read: Number(read), total: Number(total) })}</p>
          </div>
          {done && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">{t("quizScore", { score: 5, total: 5 })}</span>}
        </div>
      ))}
    </div>
  );
}

/** Experience towards the next level, and a badge. */
export async function XpPreview() {
  const t = await getTranslations("home.preview");
  return (
    <div aria-hidden className="select-none text-xs">
      <div className="flex items-center justify-between font-semibold text-slate-700">
        <span>{t("level", { n: 4 })}</span>
        <span className="text-indigo-600">{t("xp", { xp: 120 })}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-full w-2/3 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" /></div>
      <div className="mt-3 flex items-center gap-2">
        {["from-amber-300 to-amber-500", "from-sky-300 to-blue-500", "from-emerald-300 to-emerald-500"].map((g) => (
          <span key={g} className={cn("grid size-8 place-items-center rounded-full bg-gradient-to-br text-white shadow-sm", g)}><Icon name="award" className="size-4" /></span>
        ))}
        <span className="ml-1 font-medium text-slate-600">{t("badge")}</span>
      </div>
    </div>
  );
}

/** The overview of several certifications, with the codes of the catalogue. */
export async function OverviewPreview({ codes }: Readonly<{ codes: readonly string[] }>) {
  const t = await getTranslations("home.preview");
  const states = [["ready", "bg-emerald-50 text-emerald-700", 88], ["almost", "bg-blue-50 text-blue-700", 72], ["progressing", "bg-amber-50 text-amber-700", 45]] as const;
  return (
    <div aria-hidden className="select-none rounded-xl border border-slate-200 bg-white text-xs shadow-sm">
      <p className="border-b border-slate-100 px-3 py-2 font-semibold text-slate-700">{t("overview")}</p>
      <ul className="divide-y divide-slate-100">
        {codes.slice(0, 3).map((code, i) => {
          const [state, tone, value] = states[i]!;
          return (
            <li key={code} className="flex items-center gap-3 px-3 py-2">
              <span className="w-16 shrink-0 font-mono font-semibold uppercase text-slate-800">{code}</span>
              <div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${value}%` }} /></div>
              <span className={cn("shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-center font-medium", tone)}>{t(state)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** A chapter quiz just submitted: answers checked, the score. */
export async function QuizPreview() {
  const t = await getTranslations("home.preview");
  return (
    <div aria-hidden className="select-none space-y-2 text-xs">
      {[true, true, false].map((right, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <span className={cn("grid size-5 shrink-0 place-items-center rounded-full", right ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
            <Icon name={right ? "check" : "x"} className="size-3" />
          </span>
          <span className="h-2 rounded-full bg-slate-200" style={{ width: `${[70, 55, 62][i]}%` }} />
        </div>
      ))}
      <p className="pt-1 text-right font-semibold text-slate-700">{t("quizScore", { score: 4, total: 5 })}</p>
    </div>
  );
}
