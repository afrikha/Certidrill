/**
 * What depends on the vendor of a certification (certification.vendor in
 * blueprint.yaml): its documentation site, the language of its links, the
 * scoring its exam applies. Never a test on a certification code: a new
 * vendor is an entry here, its texts are under `vendors.<key>` in messages/.
 */
import type { BlueprintFile, ScoringRules } from "@/lib/content/schema";

export type VendorKey = "microsoft" | "aws";
type DocsLocale = "en" | "fr";

export interface Vendor {
  key: VendorKey;
  /** The vendor, as named in the texts (not a logo, not a badge). */
  name: string;
  /** The label of the "learn more" links: the vendor's documentation, a name, not translated. */
  docsName: string;
  /** Hosts that the references of questions and chapters may point to. */
  docsHosts: readonly string[];
  /** The same documentation page in the reader's language; a page of another site as it is. */
  localizeDocsUrl: (url: string, locale: DocsLocale) => string;
  /** The page without its language, to compare the English and French links of a chapter. */
  docsPage: (url: string) => string;
  /** How its exam scores the types with several elements, which blueprint.scoring should state. */
  scoring: ScoringRules;
}

const LEARN_LOCALE = /^https:\/\/learn\.microsoft\.com\/[a-z]{2}-[a-z]{2}\//i;
/** docs.aws.amazon.com, with or without a language (fr_fr, ja_jp…) after the host. */
const AWS_DOCS = /^https:\/\/docs\.aws\.amazon\.com\/(?:[a-z]{2}_[a-z]{2}\/)?/i;

export const VENDORS: Record<VendorKey, Vendor> = {
  microsoft: {
    key: "microsoft",
    name: "Microsoft",
    docsName: "Microsoft Learn",
    docsHosts: ["learn.microsoft.com"],
    // /en-us/ ↔ /fr-fr/: the same page in each language.
    localizeDocsUrl: (url, locale) => url.replace(LEARN_LOCALE, `https://learn.microsoft.com/${locale === "fr" ? "fr-fr" : "en-us"}/`),
    docsPage: (url) => url.replace(LEARN_LOCALE, "https://learn.microsoft.com/"),
    scoring: { multi: "per_option", dragdrop: "per_element" },
  },
  aws: {
    key: "aws",
    name: "AWS",
    docsName: "AWS Documentation",
    docsHosts: ["docs.aws.amazon.com", "aws.amazon.com"],
    // The guides have a French version under /fr_fr/; aws.amazon.com (FAQ) stays as it is.
    localizeDocsUrl: (url, locale) => url.replace(AWS_DOCS, `https://docs.aws.amazon.com/${locale === "fr" ? "fr_fr/" : ""}`),
    docsPage: (url) => url.replace(AWS_DOCS, "https://docs.aws.amazon.com/"),
    scoring: { multi: "all_or_nothing", dragdrop: "all_or_nothing" },
  },
};

const ALIASES: Record<string, VendorKey> = { microsoft: "microsoft", aws: "aws", "amazon web services": "aws" };

/** The vendor named in blueprint.yaml (any case), or null when it has no entry here. */
export function knownVendor(vendor: string): Vendor | null {
  const key = ALIASES[vendor.trim().toLowerCase()];
  return key ? VENDORS[key] : null;
}

/** The vendor of a certification; Microsoft, the first vendor, for a name with no entry here (validation reports it). */
export function vendorOf(vendor: string): Vendor {
  return knownVendor(vendor) ?? VENDORS.microsoft;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** True when the address is on one of the vendor's documentation hosts (https only). */
export function isDocsUrl(url: string, vendor: Vendor): boolean {
  return url.startsWith("https://") && vendor.docsHosts.includes(hostOf(url) ?? "");
}

/** The vendor whose documentation the address is on, or null. */
export function vendorOfUrl(url: string): Vendor | null {
  return Object.values(VENDORS).find((v) => isDocsUrl(url, v)) ?? null;
}

/** A documentation address in the reader's language, whichever vendor's; any other address as it is. */
export function localizeDocsUrl(url: string, locale: DocsLocale): string {
  return vendorOfUrl(url)?.localizeDocsUrl(url, locale) ?? url;
}

/** A documentation address without its language; any other address as it is. */
export function docsPage(url: string): string {
  return vendorOfUrl(url)?.docsPage(url) ?? url;
}

/** The vendors of some certifications, once each, in a stable order (that of VENDORS). */
export function vendorsOf(certifications: readonly { vendor: string }[]): Vendor[] {
  const keys = new Set(certifications.map((c) => vendorOf(c.vendor).key));
  return Object.values(VENDORS).filter((v) => keys.has(v.key));
}

/** Certifications grouped by vendor, in the order of VENDORS, each group in its given order. */
export function groupByVendor<T extends { vendor: string }>(certifications: readonly T[]): { vendor: Vendor; certifications: T[] }[] {
  return vendorsOf(certifications).map((vendor) => ({ vendor, certifications: certifications.filter((c) => vendorOf(c.vendor).key === vendor.key) }));
}

/**
 * Warnings about a blueprint and its vendor: a vendor with no entry here, or
 * scoring rules other than those of the vendor's exam (allowed, but worth a look).
 */
export function vendorWarnings(file: Pick<BlueprintFile, "certification"> & { blueprint: Pick<BlueprintFile["blueprint"], "scoring"> }): string[] {
  const vendor = knownVendor(file.certification.vendor);
  if (!vendor) return [`vendor "${file.certification.vendor}" has no entry in lib/vendors.ts (known: ${Object.values(VENDORS).map((v) => v.name).join(", ")})`];
  const rules = file.blueprint.scoring;
  return (Object.keys(vendor.scoring) as (keyof ScoringRules)[])
    .filter((type) => rules[type] !== vendor.scoring[type])
    .map((type) => `blueprint.scoring.${type} is ${rules[type]}, the ${vendor.name} exam scores it ${vendor.scoring[type]}`);
}

/** Warnings about the references of a question: each should be on the vendor's documentation. */
export function referenceWarnings(references: readonly { url: string }[], vendor: Vendor): string[] {
  return references.filter((r) => !isDocsUrl(r.url, vendor)).map((r) => `reference ${r.url} is not on ${vendor.docsName} (${vendor.docsHosts.join(", ")})`);
}
