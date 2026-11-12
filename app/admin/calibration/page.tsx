import { getFormatter, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { getCalibration } from "@/lib/progress/outcomes";
import { MIN_REPORTS, type CalibrationBand } from "@/lib/progress/calibration";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Calibration" };
export const dynamic = "force-dynamic";

/** Real exam results against what the readiness index said the day before. */
export default async function CalibrationPage() {
  // Checked here too: layouts are not re-run on every navigation (Next.js guidance).
  await requireAdmin();
  const t = await getTranslations("calibration");
  const tr = await getTranslations("readiness");
  const format = await getFormatter();
  const certifications = await getCalibration(prisma);
  const bandLabel = (band: CalibrationBand) => {
    if (band === "none") return t("noIndex");
    if (band === "unknown") return t("unknownVerdict");
    return tr(`verdict_${band}`);
  };
  const percent = (x: number | null) => (x === null ? "—" : format.number(x, { style: "percent", maximumFractionDigits: 0 }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("intro", { min: MIN_REPORTS })}</p>
      {certifications.length === 0 && <Card><p className="text-sm">{t("empty")}</p></Card>}
      {certifications.map(({ certification, calibration: c }) => (
        <Card key={certification} className="overflow-x-auto" data-testid={`calibration-${certification}`}>
          <h2 className="mb-1 font-semibold"><span className="font-mono uppercase">{certification}</span></h2>
          <p className="mb-4 text-sm" data-testid="calibration-total">
            {t("total", { reports: c.reports, passed: c.passed })} · {t("meanIndex", { passed: c.meanIndex.passed ?? "—", failed: c.meanIndex.failed ?? "—" })}
          </p>
          <table className="w-full max-w-2xl text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-2">{t("verdict")}</th>
                <th scope="col">{t("reports")}</th>
                <th scope="col">{t("passedCount")}</th>
                <th scope="col">{t("passRate")}</th>
              </tr>
            </thead>
            <tbody>
              {/* The "unknown" band only appears when it has reports. */}
              {c.bands.filter((b) => b.band !== "unknown" || b.reports > 0).map((b) => (
                <tr key={b.band} className="border-b border-border" data-band={b.band}>
                  <th scope="row" className="py-2 font-normal">{bandLabel(b.band)}</th>
                  <td className="tabular-nums">{b.reports}</td>
                  <td className="tabular-nums">{b.passed}</td>
                  <td className="tabular-nums">
                    {percent(b.passRate)}
                    {b.reports > 0 && !b.enough && <span className="ml-2 text-xs text-muted-foreground">{t("few")}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  );
}
