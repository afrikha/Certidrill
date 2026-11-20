/**
 * The multi-certification content tools: the --cert option, the blind
 * export split, the simulation of exams, the shared glossary and the
 * blueprints without case study nor series (fundamentals), and the AWS
 * glossary with its terminology check.
 */
import path from "node:path";
import { describe, expect, it } from "vitest";
import { certOfFile, parseCertArgs, requireCertDirs } from "../../tools/cert-args";
import { splitGroups } from "../../tools/questions/export-blind";
import { simulate } from "../../tools/questions/simulate";
import { CONTENT_ROOT, loadCertification } from "@/lib/content/loader";
import { glossaryConflicts, loadGlossaries, loadVendorGlossary, sharedGlossarySchema, terminologyWarnings, vendorGlossaryConflicts } from "@/lib/content/glossary";
import { VENDORS } from "@/lib/vendors";
import { structureSchema } from "@/lib/content/schema";

const dir = (code: string) => path.join(CONTENT_ROOT, code);

describe("--cert", () => {
  it("resolves one code, a list, a repeated option and all, and keeps the other arguments in order", async () => {
    expect(await parseCertArgs(["--prefix", "s1-"])).toEqual({ dirs: null, rest: ["--prefix", "s1-"] });
    expect(await parseCertArgs(["--cert", "dp-900", "x", "--cert=az-900,dp-900", "y"])).toEqual({ dirs: [dir("az-900"), dir("dp-900")], rest: ["x", "y"] });
    const all = (await parseCertArgs(["--cert", "all"])).dirs!;
    expect(all.length).toBeGreaterThanOrEqual(23);
    expect(all.map((d) => path.basename(d))).toContain("az-104");
  });

  it("fails on an unknown code with the known ones, on a missing value, and when the command needs it", async () => {
    await expect(parseCertArgs(["--cert", "az-999"])).rejects.toThrow(/unknown certification az-999; known: .*az-104/);
    await expect(parseCertArgs(["--cert"])).rejects.toThrow("--cert expects");
    await expect(parseCertArgs(["--cert", "--prefix"])).rejects.toThrow("--cert expects");
    await expect(requireCertDirs([], "usage: x")).rejects.toThrow("--cert <code|all> is required\nusage: x");
  });

  it("tells the certification of a content file", () => {
    expect(certOfFile(path.join(CONTENT_ROOT, "dp-900", "questions", "x.yaml"))).toBe("dp-900");
    expect(certOfFile(path.join(CONTENT_ROOT, "glossary.yaml"))).toBeUndefined();
    expect(certOfFile("/elsewhere/file.yaml")).toBeUndefined();
  });
});

describe("blind export split", () => {
  const q = (id: string, extra: { caseStudy?: string; series?: string } = {}) => ({ id, ...extra });

  it("cuts into groups of about the same size without separating a case study or a series", () => {
    const qs = [q("a"), q("b"), q("c1", { caseStudy: "cs" }), q("c2", { caseStudy: "cs" }), q("c3", { caseStudy: "cs" }), q("d"), q("s1", { series: "sr" }), q("s2", { series: "sr" }), q("e")];
    const groups = splitGroups(qs, 3);
    expect(groups.flat()).toEqual(qs);
    expect(groups).toHaveLength(3);
    for (const g of groups) {
      const cs = g.filter((x) => x.caseStudy).length;
      expect([0, 3]).toContain(cs);
      expect([0, 2]).toContain(g.filter((x) => x.series).length);
    }
  });

  it("never makes more groups than asked, and one group when n = 1", () => {
    const qs = Array.from({ length: 10 }, (_, i) => q(`q${i}`));
    expect(splitGroups(qs, 1)).toEqual([qs]);
    expect(splitGroups(qs, 4).length).toBeLessThanOrEqual(4);
    expect(splitGroups(qs, 4).map((g) => g.length)).toEqual([3, 3, 3, 1]);
  });
});

describe("fundamentals blueprints", () => {
  it("default to no case study and no series when the blueprint leaves them out", async () => {
    const { caseStudies, series, ...rest } = (await loadCertification(dir("az-104"))).blueprint.blueprint.structure;
    expect(caseStudies.count.max).toBeGreaterThan(0);
    expect(series.count.max).toBeGreaterThan(0);
    const s = structureSchema.parse(rest);
    expect(s.caseStudies).toEqual({ count: { min: 0, max: 0 }, questionsEach: { min: 0, max: 0 }, placement: "end" });
    expect(s.series).toEqual({ count: { min: 0, max: 0 }, questionsEach: { min: 0, max: 0 } });
  });

  it("assemble exams without case study nor series sections (AZ-900)", async () => {
    const content = await loadCertification(dir("az-900"));
    expect(content.blueprint.blueprint.structure.caseStudies.count).toEqual({ min: 0, max: 0 });
    expect(content.blueprint.blueprint.structure.series.count).toEqual({ min: 0, max: 0 });
    const s = await simulate(content, 3);
    expect(s).toMatchObject({ code: "az-900", exams: 3, reused: 0, shortfall: 0, outOfRange: [] });
    // One section per exam: the main one.
    for (const line of s.lines.slice(0, 3)) expect(line).toMatch(/sections m \|/);
  });
});

describe("shared glossary", () => {
  const base = sharedGlossarySchema.parse({ typography: [], keep_in_english: ["Azure Bastion"], translated_product_names: [{ en: "Azure Backup", fr: "Sauvegarde Azure" }], terms: [{ en: "tenant", fr: "locataire", area: "identity", confirmed: true }] });
  const term = (en: string, fr: string) => ({ en, fr, area: "x", confirmed: false });

  it("loads the shared file and the additions of each certification without conflict", async () => {
    const g = await loadGlossaries([dir("az-104"), dir("az-900")]);
    expect(g.shared.terms.length).toBeGreaterThan(500);
    expect([...g.perCertification.keys()]).toEqual(["az-104"]);
  });

  it("finds one English term with two French forms, in the shared file or against a certification", () => {
    expect(glossaryConflicts(base)).toEqual([]);
    expect(glossaryConflicts({ ...base, terms: [...base.terms, term("Tenant", "client")] })).toEqual([`"Tenant": « locataire » (glossary.yaml) and « client » (glossary.yaml)`]);
    // Same form, other case or apostrophe: no conflict.
    expect(glossaryConflicts({ ...base, terms: [...base.terms, term("TENANT", "Locataire")] })).toEqual([]);
    const cert = new Map([["az-700", { terms: [term("tenant", "client"), term("hub", "hub"), term("hub", "concentrateur")] }]]);
    expect(glossaryConflicts(base, cert)).toEqual([`"hub": « hub » and « concentrateur » (az-700/glossary.yaml)`, `"tenant": « locataire » (glossary.yaml) and « client » (az-700/glossary.yaml)`].reverse());
  });

  it("finds a term both kept in English and translated, and an undecided term that already has a form", () => {
    const g = { ...base, keep_in_english: ["Azure Backup"], undecided: [{ en: "tenant", options: ["locataire", "client"] }] };
    expect(glossaryConflicts(g)).toEqual([`"Azure Backup" is both kept in English and translated`, `"tenant" is undecided but already has a French form (glossary.yaml)`]);
  });
});

describe("seed: unchanged rows", async () => {
  const { sameRow } = await import("@/lib/content/seed");
  it("compares the written fields by value, JSON key order aside, and ignores undefined ones", () => {
    const stored = { id: "q1", stem: { en: "A", fr: "B" }, body: { options: [{ id: "a" }] }, exhibits: null, version: 1, extra: "not written" };
    expect(sameRow(stored, { stem: { fr: "B", en: "A" }, body: { options: [{ id: "a" }] }, version: 1, exhibits: undefined })).toBe(true);
    expect(sameRow(stored, { stem: { en: "A", fr: "B!" } })).toBe(false);
    expect(sameRow(stored, { version: 2 })).toBe(false);
    expect(sameRow(stored, { seriesOrder: null })).toBe(true);
    expect(sameRow(stored, { seriesOrder: 3 })).toBe(false);
  });
});

describe("AWS glossary", () => {
  const term = (en: string, fr: string, extra: object = {}) => ({ en, fr, area: "x", confirmed: true, ...extra });

  it("loads content/_shared/glossary-aws.yaml (lib/vendors.ts) without conflict", async () => {
    expect(VENDORS.aws.glossary).toBe("_shared/glossary-aws.yaml");
    const g = (await loadVendorGlossary(VENDORS.aws.glossary!))!;
    const fr = (en: string) => g.terms.find((t) => t.en.toLowerCase() === en)?.fr;
    expect([fr("bucket"), fr("subnet"), fr("availability zone"), fr("security group")]).toEqual(["compartiment", "sous-réseau", "zone de disponibilité", "groupe de sécurité"]);
    expect(await loadVendorGlossary("_shared/missing.yaml")).toBeNull();
  });

  it("finds a term listed twice, kept in English and translated, or both used and to avoid", () => {
    const g = { keep_in_english: ["Amazon S3"], terms: [term("bucket", "compartiment", { avoid: ["bucket"] })] };
    expect(vendorGlossaryConflicts(g, "g.yaml")).toEqual([]);
    expect(
      vendorGlossaryConflicts({ keep_in_english: ["policy"], terms: [...g.terms, term("Bucket", "seau"), term("policy", "politique", { also_seen: ["stratégie"], avoid: ["Stratégie"] })] }, "g.yaml"),
    ).toEqual([`"Bucket": listed twice in g.yaml (« compartiment » and « seau »)`, `"policy": « Stratégie » is both used and to avoid (g.yaml)`, `"policy" is both kept in English and translated (g.yaml)`]);
  });

  it("reports the variants to avoid in French prose, whole words, case-sensitive, outside code", () => {
    const terms = [term("bucket", "compartiment", { avoid: ["bucket", "buckets"] }), term("IAM policy", "politique IAM", { avoid: ["stratégie IAM"] })];
    const text = "Créez un bucket. Les buckets et la stratégie IAM.\n\n```json\n{ \"bucket\": 1 }\n```\nLe nom `my-bucket` ; un Bucket ; un sous-bucket ; un compartiment (bucket) ; la stratégie de migration.";
    expect(terminologyWarnings(text, terms)).toEqual([
      `French text uses « bucket »: the glossary says « compartiment » for "bucket"`,
      `French text uses « buckets »: the glossary says « compartiment » for "bucket"`,
      `French text uses « stratégie IAM »: the glossary says « politique IAM » for "IAM policy"`,
    ]);
    expect(terminologyWarnings("Deux bucket, un bucket.", terms)).toEqual([`French text uses « bucket » (2×): the glossary says « compartiment » for "bucket"`]);
  });

  it("leaves out section markers and the exam's English words quoted in guillemets", () => {
    const terms = [term("bucket", "compartiment", { avoid: ["bucket", "buckets"] })];
    expect(terminologyWarnings("<!-- section: bucket | objectives: 1.1 -->\nL'énoncé dit « find PII in S3 buckets ».", terms)).toEqual([]);
    expect(terminologyWarnings("« find PII » dans un bucket.", terms)).toEqual([`French text uses « bucket »: the glossary says « compartiment » for "bucket"`]);
  });
});
