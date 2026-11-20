/**
 * The catalogue as the public texts see it: the active certifications, their
 * vendors (for the trademark notice, the documentation named, the grouping),
 * and whether any of their exams has case studies or Yes/No series (the
 * description of the site states them only then).
 */
import { cache } from "react";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/log";
import { structureSchema } from "@/lib/content/schema";
import { vendorsOf, type Vendor } from "@/lib/vendors";

export interface Catalog {
  certifications: { code: string; title: string; vendor: string }[];
  vendors: Vendor[];
  caseStudies: boolean;
  series: boolean;
}

const EMPTY: Catalog = { certifications: [], vendors: [], caseStudies: false, series: false };

/** The active catalogue, read once per request; empty when the database cannot be read (the footer of an error page). */
export const activeCatalog = cache(async (): Promise<Catalog> => {
  try {
    const rows = await prisma.certification.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: { code: true, title: true, vendor: true, blueprints: { where: { current: true }, take: 1, select: { structure: true } } },
    });
    // A section exists when its count can be above 0 (blueprint.structure).
    const has = (section: "caseStudies" | "series") =>
      rows.some((r) => {
        const s = structureSchema.shape[section].safeParse((r.blueprints[0]?.structure as Record<string, unknown> | undefined)?.[section]);
        return s.success && s.data.count.max > 0;
      });
    return {
      certifications: rows.map(({ code, title, vendor }) => ({ code, title, vendor })),
      vendors: vendorsOf(rows),
      caseStudies: has("caseStudies"),
      series: has("series"),
    };
  } catch (err) {
    logError("catalog.read", err);
    return EMPTY;
  }
});

/** Names joined as the language does ("Microsoft et AWS", "Microsoft or AWS"); "none" when there is none (the select of the messages). */
export function joinNames(locale: string, names: readonly string[], type: "conjunction" | "disjunction" = "conjunction"): string {
  return names.length ? new Intl.ListFormat(locale, { type }).format(names) : "none";
}
