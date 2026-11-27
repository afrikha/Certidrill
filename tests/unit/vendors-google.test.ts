/**
 * The Google Cloud vendor (docs/SPECS-GOOGLE-CLOUD.md §3.1, §3.2): its
 * names, documentation hosts, English-only links, all-or-nothing scoring,
 * its texts; the two Google Cloud certifications of content/.
 */
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import { loadCertification } from "@/lib/content/loader";
import { docsPage, groupByVendor, isDocsUrl, knownVendor, localizeDocsUrl, VENDORS, vendorOfUrl, vendorWarnings } from "@/lib/vendors";
import { simulate } from "@/tools/questions/simulate";

const google = VENDORS.google;

describe("the Google Cloud vendor", () => {
  it("is named by its aliases, in any case", () => {
    for (const name of ["Google Cloud", "google", "GCP", " google cloud "]) expect(knownVendor(name)?.key).toBe("google");
    expect(google).toMatchObject({ name: "Google Cloud", docsName: "Google Cloud Documentation", glossary: null });
    expect(google.scoring).toMatchObject({ multi: "all_or_nothing", dragdrop: "all_or_nothing" });
  });

  it("accepts the hosts of §3.1, and on github.com only Google Cloud's repositories", () => {
    for (const url of [
      "https://cloud.google.com/architecture/framework",
      "https://docs.cloud.google.com/iam/docs/overview",
      "https://services.google.com/fh/files/misc/professional_cloud_architect_exam_guide_english.pdf",
      "https://support.google.com/cloud/answer/6158849",
      "https://ai.google.dev/gemini-api/docs",
      "https://developers.google.com/identity",
      "https://firebase.google.com/docs",
      "https://registry.terraform.io/providers/hashicorp/google/latest/docs",
      "https://developer.hashicorp.com/terraform/docs",
      "https://github.com/GoogleCloudPlatform/cloud-foundation-fabric",
      "https://geminicli.com/docs",
      "https://antigravity.google/docs",
    ])
      expect(isDocsUrl(url, google), url).toBe(true);
    for (const url of ["http://cloud.google.com/x", "https://example.com/", "https://github.com/someone/fabric", "https://learn.microsoft.com/en-us/azure/"])
      expect(isDocsUrl(url, google), url).toBe(false);
    expect(vendorOfUrl("https://docs.cloud.google.com/run/docs")?.key).toBe("google");
    // A CNCF repository stays the CNCF's.
    expect(vendorOfUrl("https://github.com/kubernetes/kubernetes")?.key).toBe("cncf");
  });

  it("keeps its links as they are (English only)", () => {
    const url = "https://docs.cloud.google.com/compute/docs/instances?hl=en";
    expect(localizeDocsUrl(url, "fr")).toBe(url);
    expect(docsPage(url)).toBe(url);
  });

  it("has its trademark and score notes, in English and French", () => {
    expect(en.vendors.google.trademark).toContain("Professional Cloud Architect");
    expect(en.vendors.google.trademark).toContain("Associate Cloud Engineer");
    expect(fr.vendors.google.trademark).toContain("Professional Cloud Architect");
    expect(fr.vendors.google.trademark).toContain("Associate Cloud Engineer");
    expect(en.vendors.google.scoreNote).toContain("70%");
    expect(fr.vendors.google.scoreNote).toContain("70 %");
  });

  it("is a fourth group of the catalogue, after Microsoft, AWS and the CNCF", () => {
    const groups = groupByVendor([{ vendor: "Google Cloud", code: "gcp-pca" }, { vendor: "CNCF", code: "kcna" }, { vendor: "Microsoft", code: "az-104" }, { vendor: "AWS", code: "saa-c03" }]);
    expect(groups.map((g) => g.vendor.name)).toEqual(["Microsoft", "AWS", "CNCF", "Google Cloud"]);
  });
});

describe("the Google Cloud certifications", () => {
  it.each(["gcp-pca", "gcp-ace"])("%s: vendor Google Cloud, English only, inactive, scored in percent with all-or-nothing rules", async (code) => {
    const content = await loadCertification(path.resolve(__dirname, "../../content", code));
    const { certification, blueprint } = content.blueprint;
    expect(knownVendor(certification.vendor)?.key).toBe("google");
    expect(certification).toMatchObject({ languages: ["en"], active: false });
    expect(blueprint).toMatchObject({ maxScore: 100, passScore: 70, durationMin: 120, questionCount: { min: 50, max: 60 } });
    expect(vendorWarnings(content.blueprint)).toEqual([]);
  });

  it("gcp-pca draws two case studies per exam, interleaved; gcp-ace none", async () => {
    const pca = await simulate(await loadCertification(path.resolve(__dirname, "../../content/gcp-pca")), 5);
    const ace = await simulate(await loadCertification(path.resolve(__dirname, "../../content/gcp-ace")), 5);
    const exams = (s: typeof pca) => s.lines.filter((l) => l.startsWith("exam "));
    for (const line of exams(pca)) expect(line).toMatch(/sections m, case studies 2 /);
    for (const line of exams(ace)) expect(line).toMatch(/sections m, case studies 0 /);
    expect([pca.reused, pca.shortfall, pca.outOfRange.length, ace.reused, ace.shortfall, ace.outOfRange.length]).toEqual([0, 0, 0, 0, 0, 0]);
  }, 60_000);
});
