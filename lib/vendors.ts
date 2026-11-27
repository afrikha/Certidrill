/**
 * What depends on the vendor of a certification (certification.vendor in
 * blueprint.yaml): its documentation site, the language of its links, the
 * scoring its exam applies. Never a test on a certification code: a new
 * vendor is an entry here, its texts are under `vendors.<key>` in messages/.
 */
import type { BlueprintFile, ScoringRules } from "@/lib/content/schema";

export type VendorKey = "microsoft" | "aws" | "cncf";
type DocsLocale = "en" | "fr";

export interface Vendor {
  key: VendorKey;
  /** The vendor, as named in the texts (not a logo, not a badge). */
  name: string;
  /** The label of the "learn more" links: the vendor's documentation, a name, not translated. */
  docsName: string;
  /** Hosts that the references of questions and chapters may point to. */
  docsHosts: readonly string[];
  /**
   * For a shared host (github.com), the only paths allowed on it: an
   * organization ("/kubernetes/") or a repository ("/docker/docs/"). Any
   * other path of that host is not the vendor's documentation.
   */
  docsPaths?: Readonly<Record<string, readonly string[]>>;
  /** The same documentation page in the reader's language; a page of another site as it is. */
  localizeDocsUrl: (url: string, locale: DocsLocale) => string;
  /** The page without its language, to compare the English and French links of a chapter. */
  docsPage: (url: string) => string;
  /** How its exam scores the types with several elements, which blueprint.scoring should state. */
  scoring: ScoringRules;
  /**
   * Its French terminology, relative to content/: the vendor's glossary when
   * its documentation translates otherwise than Microsoft Learn (content:validate
   * reports its `avoid` variants); null for content/glossary.yaml.
   */
  glossary: string | null;
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
    scoring: { multi: "per_option", dragdrop: "per_element", command: "per_check", manifest: "per_check" },
    glossary: null,
  },
  aws: {
    key: "aws",
    name: "AWS",
    docsName: "AWS Documentation",
    // AWS re:Post (Knowledge Center), and the official documentation of AWS products that have their own site (Kiro, Strands Agents).
    docsHosts: ["docs.aws.amazon.com", "aws.amazon.com", "repost.aws", "kiro.dev", "strandsagents.com"],
    // The guides have a French version under /fr_fr/; aws.amazon.com (FAQ) stays as it is.
    localizeDocsUrl: (url, locale) => url.replace(AWS_DOCS, `https://docs.aws.amazon.com/${locale === "fr" ? "fr_fr/" : ""}`),
    docsPage: (url) => url.replace(AWS_DOCS, "https://docs.aws.amazon.com/"),
    scoring: { multi: "all_or_nothing", dragdrop: "all_or_nothing", command: "per_check", manifest: "per_check" },
    glossary: "_shared/glossary-aws.yaml",
  },
  cncf: {
    key: "cncf",
    name: "CNCF",
    docsName: "Kubernetes Documentation",
    // The Kubernetes docs, the CNCF and Linux Foundation pages of the exams, the CNCF projects' own documentation,
    // and the security frameworks the KCSA curriculum names (NIST, MITRE ATT&CK, SLSA, OWASP).
    docsHosts: [
      "kubernetes.io", "www.cncf.io", "cncf.io", "glossary.cncf.io", "landscape.cncf.io", "tag-security.cncf.io",
      "training.linuxfoundation.org", "docs.linuxfoundation.org", "github.com",
      "helm.sh", "prometheus.io", "opentelemetry.io", "falco.org", "istio.io", "linkerd.io", "argo-cd.readthedocs.io",
      "argoproj.github.io", "fluxcd.io", "etcd.io", "containerd.io", "opencontainers.org", "cilium.io", "docs.cilium.io",
      "coredns.io", "www.openpolicyagent.org", "openpolicyagent.org", "kyverno.io", "docs.sigstore.dev", "www.sigstore.dev",
      "in-toto.io", "spiffe.io", "cert-manager.io", "www.envoyproxy.io", "keda.sh", "knative.dev", "cri-o.io", "gateway-api.sigs.k8s.io",
      "goharbor.io", "gvisor.dev", "katacontainers.io", "kubescape.io", "trivy.dev", "kubewarden.io",
      // Kustomize (kubectl.docs.kubernetes.io), container images (CKAD 1.1: Docker and Podman).
      "kubectl.docs.kubernetes.io", "docs.docker.com", "docs.podman.io",
      "slsa.dev", "csrc.nist.gov", "nvlpubs.nist.gov", "attack.mitre.org", "owasp.org", "community.owasp.org",
    ],
    // github.com is shared: the organizations of the Kubernetes and CNCF projects, and the repositories of the other tools the curriculum names.
    docsPaths: {
      "github.com": [
        "/kubernetes/", "/kubernetes-sigs/", "/kubernetes-csi/", "/cncf/", "/opencontainers/", "/containernetworking/", "/open-policy-agent/",
        "/goharbor/", "/cilium/", "/kata-containers/", "/kubescape/", "/open-gitops/", "/sigstore/", "/falcosecurity/", "/spdx/",
        "/aquasecurity/kube-bench/", "/aquasecurity/trivy/", "/docker/docs/", "/google/gvisor/", "/GoogleContainerTools/distroless/",
      ],
    },
    // English only: the Kubernetes certifications are not offered in French.
    localizeDocsUrl: (url) => url,
    docsPage: (url) => url,
    scoring: { multi: "all_or_nothing", dragdrop: "all_or_nothing", command: "per_check", manifest: "per_check" },
    glossary: null,
  },
};

const ALIASES: Record<string, VendorKey> = { microsoft: "microsoft", aws: "aws", "amazon web services": "aws", cncf: "cncf", "linux foundation": "cncf" };

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

/**
 * True when the address is on one of the vendor's documentation hosts (https
 * only) and, on a shared host, under one of the paths allowed on it.
 */
export function isDocsUrl(url: string, vendor: Vendor): boolean {
  const host = hostOf(url);
  if (!url.startsWith("https://") || !host || !vendor.docsHosts.includes(host)) return false;
  const paths = vendor.docsPaths?.[host];
  if (!paths) return true;
  // Owners and repositories are case-insensitive on GitHub.
  const path = new URL(url).pathname.toLowerCase();
  return paths.some((p) => path.startsWith(p.toLowerCase()) || `${path}/` === p.toLowerCase());
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
