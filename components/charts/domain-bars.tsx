/**
 * Horizontal bars: score per domain on the blueprint scale, with the pass mark
 * as a reference line. Single series → one hue, no legend; values in text ink.
 */
function detailSuffix(detail?: string): string {
  return detail ? ` (${detail})` : "";
}

export function DomainBars({ rows, max, threshold, thresholdLabel }: Readonly<{
  rows: { key: string; title: string; score: number; detail?: string }[];
  max: number;
  threshold: number;
  thresholdLabel: string;
}>) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.key} title={`${r.title}: ${r.score} / ${max}${detailSuffix(r.detail)}`}>
          <div className="mb-1 flex justify-between gap-4 text-sm">
            <span>{r.title}</span>
            <span className="font-semibold tabular-nums">
              {r.score}
              <span className="sr-only"> / {max}</span>
              {r.score >= threshold ? <span className="ml-1 text-success" aria-label="≥">✓</span> : null}
            </span>
          </div>
          <div className="relative h-3 rounded-sm bg-muted" aria-hidden>
            <div className="h-3 rounded-r bg-primary" style={{ width: pct(r.score) }} />
            <div className="absolute -top-1 h-5 border-l-2 border-dashed border-foreground/60" style={{ left: pct(threshold) }} />
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        <span className="mr-1 inline-block h-3 border-l-2 border-dashed border-foreground/60 align-middle" aria-hidden /> {thresholdLabel} ({threshold})
      </p>
    </div>
  );
}
