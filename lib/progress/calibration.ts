/**
 * Calibration of the readiness index against real exam results reported by
 * candidates: for each verdict the index gave before the real exam, how many
 * candidates passed. Pure functions.
 */
import type { Verdict } from "./readiness";

export interface OutcomeSample {
  passed: boolean;
  readinessIndex: number | null;
  readinessVerdict: string | null;
}

export type CalibrationBand = Verdict | "none" | "unknown";
/**
 * "none": no mock exam before the real one, so no index. "unknown": a verdict
 * this code no longer knows (renamed since), kept apart so it cannot pass for
 * either of the others.
 */
export const CALIBRATION_BANDS: readonly CalibrationBand[] = ["none", "not_ready", "progressing", "almost", "ready", "unknown"];
const VERDICTS: ReadonlySet<string> = new Set(["not_ready", "progressing", "almost", "ready"]);

/** Below this many reports in a band, its pass rate says little. */
export const MIN_REPORTS = 20;

export interface Calibration {
  bands: { band: CalibrationBand; reports: number; passed: number; passRate: number | null; enough: boolean }[];
  reports: number;
  passed: number;
  /** Mean index before the real exam, of those who passed and of those who failed (null without any). */
  meanIndex: { passed: number | null; failed: number | null };
}

function bandOf(verdict: string | null): CalibrationBand {
  if (verdict === null) return "none";
  return VERDICTS.has(verdict) ? (verdict as Verdict) : "unknown";
}

function mean(xs: readonly number[]): number | null {
  return xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null;
}

export function calibrate(samples: readonly OutcomeSample[]): Calibration {
  const bands = CALIBRATION_BANDS.map((band) => {
    const mine = samples.filter((s) => bandOf(s.readinessVerdict) === band);
    const passed = mine.filter((s) => s.passed).length;
    return { band, reports: mine.length, passed, passRate: mine.length ? passed / mine.length : null, enough: mine.length >= MIN_REPORTS };
  });
  const indexOf = (passed: boolean) => samples.filter((s) => s.passed === passed && s.readinessIndex !== null).map((s) => s.readinessIndex!);
  return {
    bands,
    reports: samples.length,
    passed: samples.filter((s) => s.passed).length,
    meanIndex: { passed: mean(indexOf(true)), failed: mean(indexOf(false)) },
  };
}
