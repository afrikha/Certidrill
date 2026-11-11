import { withKeys } from "@/components/with-keys";

/**
 * Score history: single series line (2 px, 8 px markers) over a recessive grid,
 * with the pass mark as a dashed reference line. Each point has a hover title;
 * a table view is provided by the caller.
 */
export function ScoreLine({ points, max, threshold, label }: Readonly<{
  points: { x: string; score: number; title: string }[];
  max: number;
  threshold: number;
  label: string;
}>) {
  const W = 640, H = 220, L = 40, R = 12, T = 12, B = 28;
  const iw = W - L - R, ih = H - T - B;
  const x = (i: number) => L + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => T + ih - (v / max) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * max));
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
  const every = Math.max(1, Math.ceil(points.length / 6));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-full">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeWidth={1} />
          <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--color-muted-foreground)">{t}</text>
        </g>
      ))}
      <line x1={L} x2={W - R} y1={y(threshold)} y2={y(threshold)} stroke="var(--color-foreground)" strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="5 4" />
      <text x={W - R} y={y(threshold) - 4} textAnchor="end" fontSize={11} fill="var(--color-muted-foreground)">{threshold}</text>
      <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round" />
      {withKeys(points, (p) => `${p.x}|${p.title}`).map(({ key, item: p }, i) => (
        <g key={key}>
          <circle cx={x(i)} cy={y(p.score)} r={4} fill="var(--color-primary)" stroke="var(--color-background)" strokeWidth={2} />
          {/* larger invisible hit target for the hover title */}
          <circle cx={x(i)} cy={y(p.score)} r={12} fill="transparent"><title>{p.title}</title></circle>
          {i % every === 0 && (
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--color-muted-foreground)">{p.x}</text>
          )}
        </g>
      ))}
    </svg>
  );
}
