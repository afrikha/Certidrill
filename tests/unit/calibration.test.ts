import { describe, expect, it } from "vitest";
import { calibrate, MIN_REPORTS } from "@/lib/progress/calibration";

const sample = (passed: boolean, verdict: string | null, index: number | null = null) => ({ passed, readinessVerdict: verdict, readinessIndex: index });

describe("calibrate", () => {
  it("is empty without reports", () => {
    const c = calibrate([]);
    expect(c).toMatchObject({ reports: 0, passed: 0, meanIndex: { passed: null, failed: null } });
    expect(c.bands.map((b) => b.band)).toEqual(["none", "not_ready", "progressing", "almost", "ready"]);
    expect(c.bands.every((b) => b.reports === 0 && b.passRate === null && !b.enough)).toBe(true);
  });

  it("gives the pass rate per verdict before the real exam, and the mean index of passes and failures", () => {
    const c = calibrate([
      sample(true, "ready", 90),
      sample(true, "ready", 88),
      sample(false, "ready", 86),
      sample(false, "not_ready", 30),
      sample(true, null),
      // An unknown verdict (renamed since) counts as no index.
      sample(false, "legacy", null),
    ]);
    expect(c).toMatchObject({ reports: 6, passed: 3, meanIndex: { passed: 89, failed: 58 } });
    const band = (b: string) => c.bands.find((x) => x.band === b)!;
    expect(band("ready")).toEqual({ band: "ready", reports: 3, passed: 2, passRate: 2 / 3, enough: false });
    expect(band("not_ready")).toMatchObject({ reports: 1, passed: 0, passRate: 0 });
    expect(band("none")).toMatchObject({ reports: 2, passed: 1, passRate: 0.5 });
    expect(band("almost")).toMatchObject({ reports: 0, passRate: null });
  });

  it("flags a band with enough reports", () => {
    const c = calibrate(Array.from({ length: MIN_REPORTS }, (_, i) => sample(i % 2 === 0, "almost", 75)));
    expect(c.bands.find((b) => b.band === "almost")).toMatchObject({ reports: MIN_REPORTS, passRate: 0.5, enough: true });
  });
});
