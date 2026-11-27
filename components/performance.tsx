import { getLocale, getTranslations } from "next-intl/server";
import type { CertificationFormat } from "@/lib/content/schema";
import { isLocale } from "@/lib/i18n/config";

/**
 * Certifications whose real exam is performance-based (CKAD, CKA): practical
 * exercises without a cluster, named "practice series", never "mock exam"
 * (docs/SPECS-KUBERNETES-PRATIQUE.md §5). The ICU messages take `format`.
 */
export const isPerformance = (format: string | null | undefined): format is Extract<CertificationFormat, "performance"> => format === "performance";

/** The `format` value of the messages: "performance" or "other". */
export const formatArg = (format: string | null | undefined) => (isPerformance(format) ? "performance" : "other");

/**
 * The banner of a performance-based certification: on its course, its
 * dashboard card and at the top of each series. Nothing for another format.
 * `locale`: the language of the page when it is not the interface's (a series).
 */
export async function PerformanceNotice({ format, locale: given, className }: Readonly<{ format: string; locale?: string; className?: string }>) {
  if (!isPerformance(format)) return null;
  const locale = given ?? (await getLocale());
  const t = await getTranslations({ locale: isLocale(locale) ? locale : "en", namespace: "common" });
  return (
    <p role="note" data-testid="performance-notice" className={className ?? "rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"}>
      {t("performanceNotice")}
    </p>
  );
}

/** The "practice series" label of a performance-based certification in a catalogue; nothing otherwise. */
export async function PerformanceBadge({ format }: Readonly<{ format: string }>) {
  if (!isPerformance(format)) return null;
  const t = await getTranslations("common");
  return <span data-testid="performance-badge" className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">{t("performanceBadge")}</span>;
}
