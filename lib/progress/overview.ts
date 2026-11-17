/**
 * The progress of a user across certifications: one line per certification
 * they practise (exams, last score, readiness, level), and totals for the
 * global indicator of the dashboard. Every figure stays per certification
 * (its own scale, readiness and XP); the totals only add counts that mean the
 * same thing everywhere.
 */
import type { Progress } from "@/lib/exam/results";
import type { Verdict } from "./readiness";

export interface OverviewRow {
  certification: string;
  exams: number;
  lastScore: number;
  lastPassed: boolean;
  lastAt: string;
  /** Mock exams passed among them. */
  passed: number;
  readiness: { index: number; verdict: Verdict; ready: boolean } | null;
  level: { n: number; title: string; xp: number } | null;
  badges: number;
  /** Real exams reported as passed. */
  realPassed: boolean;
}

export interface Overview {
  /** Most recently practised first. */
  rows: OverviewRow[];
  totals: { certifications: number; exams: number; passed: number; ready: number; xp: number; badges: number; realPassed: number };
}

export function progressOverview(progress: Progress, outcomes: readonly { certification: string; passed: boolean }[] = []): Overview {
  const byCertification = new Map<string, Progress["attempts"]>();
  for (const a of progress.attempts) byCertification.set(a.certification, [...(byCertification.get(a.certification) ?? []), a]);
  const rows: OverviewRow[] = [...byCertification].map(([certification, attempts]) => {
    const last = attempts.at(-1)!;
    const r = progress.readiness.find((x) => x.certification === certification);
    const p = progress.progression.find((x) => x.certification === certification);
    return {
      certification,
      exams: attempts.length,
      lastScore: last.scaledScore,
      lastPassed: last.passed,
      lastAt: last.submittedAt,
      passed: attempts.filter((a) => a.passed).length,
      readiness: r ? { index: r.index, verdict: r.verdict, ready: r.ready } : null,
      level: p ? { n: p.level.n, title: p.title, xp: p.xp } : null,
      badges: p?.badges.length ?? 0,
      realPassed: outcomes.some((o) => o.certification === certification && o.passed),
    };
  });
  rows.sort((a, b) => b.lastAt.localeCompare(a.lastAt) || a.certification.localeCompare(b.certification));
  const sum = (f: (r: OverviewRow) => number) => rows.reduce((n, r) => n + f(r), 0);
  return {
    rows,
    totals: {
      certifications: rows.length,
      exams: sum((r) => r.exams),
      passed: sum((r) => r.passed),
      ready: rows.filter((r) => r.readiness?.ready).length,
      xp: sum((r) => r.level?.xp ?? 0),
      badges: sum((r) => r.badges),
      realPassed: rows.filter((r) => r.realPassed).length,
    },
  };
}

/**
 * The certification the dashboard shows: the one asked for when it is
 * active, else the latest practised (or with an exam in progress), else the
 * first active one.
 */
export function selectedCertification(active: readonly string[], asked: string | null, overview: Overview, inProgress: readonly string[] = []): string | null {
  if (asked && active.includes(asked)) return asked;
  const recent = [...inProgress, ...overview.rows.map((r) => r.certification)].find((c) => active.includes(c));
  return recent ?? active[0] ?? null;
}
