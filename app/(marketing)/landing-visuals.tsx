/**
 * Decorative pieces of the landing page: a stylised exam screen and a score
 * card, drawn in HTML (no image to keep in sync with the real interface).
 * They are hidden from assistive technologies: the text says the same.
 */
import { cn } from "@/lib/utils";

const ICONS = {
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  chat: <><path d="M4 5h16v11H8l-4 4V5Z" /><path d="M8 9h8M8 12h5" /></>,
  trend: <><path d="M3 17 9 11l4 4 8-8" /><path d="M15 7h6v6" /></>,
  check: <path d="m5 12 4 4 10-10" />,
} as const;

export function Icon({ name, className }: Readonly<{ name: keyof typeof ICONS; className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn("size-5", className)}>
      {ICONS[name]}
    </svg>
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
 * A mock exam in progress, and the score it leads to. The figures come from
 * the current blueprint: an exam of typical length, a little past halfway,
 * a passing score with one bar per domain.
 */
export function ExamPreview({ blueprint: b }: Readonly<{ blueprint: PreviewBlueprint }>) {
  const total = Math.round((b.minQuestions + b.maxQuestions) / 2);
  const current = Math.round(total * 0.52);
  const left = Math.round(b.durationMin * 0.72);
  const clock = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}:45`;
  const progress = Math.round((current / total) * 100);
  const passPercent = (b.passScore / b.maxScore) * 100;
  const score = Math.round(b.passScore + (b.maxScore - b.passScore) * 0.37);
  // Illustrative domain results around the pass mark: mostly passed, one to work on.
  const domains = Array.from({ length: b.domains }, (_, i) => [86, 74, 91, 64, 80, 77][i % 6]!);
  return (
    <div aria-hidden className="relative isolate mx-auto w-full max-w-md select-none lg:mx-0">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-blue-200/70 via-sky-100/60 to-transparent blur-2xl" />
      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-xl shadow-blue-900/10">
        <div className="flex items-center justify-between border-b border-border bg-muted px-4 py-2.5 text-xs">
          <span className="font-medium text-muted-foreground">Question {current} / {total}</span>
          <span className="rounded-md bg-foreground px-2 py-1 font-mono font-semibold tabular-nums text-background">{clock}</span>
        </div>
        <div className="h-1 bg-muted"><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div>
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-end text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-800">⚑</span>
          </div>
          <div className="space-y-2">
            <div className="h-2.5 w-11/12 rounded-full bg-slate-200" />
            <div className="h-2.5 w-4/5 rounded-full bg-slate-200" />
            <div className="h-2.5 w-2/3 rounded-full bg-slate-200" />
          </div>
          <ul className="space-y-2 pt-1">
            {[false, true, false, false].map((selected, i) => (
              <li key={i} className={cn("flex items-center gap-3 rounded-md border px-3 py-2.5", selected ? "border-primary bg-blue-50" : "border-border")}>
                <span className={cn("grid size-4 shrink-0 place-items-center rounded-full border-2", selected ? "border-primary" : "border-slate-300")}>
                  {selected && <span className="size-2 rounded-full bg-primary" />}
                </span>
                <span className={cn("h-2 rounded-full", selected ? "bg-blue-300" : "bg-slate-200")} style={{ width: `${[62, 74, 48, 56][i]}%` }} />
              </li>
            ))}
          </ul>
          <div className="flex justify-between pt-2">
            <span className="h-8 w-20 rounded-md border border-border" />
            <span className="h-8 w-24 rounded-md bg-primary" />
          </div>
        </div>
      </div>

      <div className="absolute -bottom-8 -left-2 w-52 rounded-xl border border-border bg-background p-4 shadow-lg shadow-blue-900/10 sm:-left-10">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tabular-nums">{score}</span>
          <span className="text-sm text-muted-foreground">/ {b.maxScore}</span>
          <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-success">✓</span>
        </div>
        <div className="mt-3 space-y-1.5">
          {domains.map((d, i) => (
            <div key={i} className="h-1.5 rounded-full bg-muted">
              <div className={cn("h-full rounded-full", d >= passPercent ? "bg-success" : "bg-warning")} style={{ width: `${d}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
