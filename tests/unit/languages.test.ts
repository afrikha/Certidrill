import path from "node:path";
import os from "node:os";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { afterAll, describe, expect, it } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { frenchProblems, missingFrench, served, servedDeep } from "@/lib/content/languages";
import { ContentError, loadCertification } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";
import { loadCourse, validateCourse } from "@/lib/content/course";
import { blueprintFileSchema } from "@/lib/content/schema";
import { pick } from "@/lib/i18n/config";
import { knownVendor, localizeDocsUrl, referenceWarnings, vendorOf, vendorWarnings } from "@/lib/vendors";

const CONTENT = path.resolve(__dirname, "../../content");
const roots: string[] = [];
afterAll(() => Promise.all(roots.map((r) => rm(r, { recursive: true, force: true }))));

/** A copy of a certification's folder, changed by `change`. */
async function copy(code: string, change: (dir: string) => Promise<unknown> = async () => undefined): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "languages-"));
  roots.push(root);
  const dir = path.join(root, code);
  await mkdir(dir);
  await cp(path.join(CONTENT, code), dir, { recursive: true });
  await change(dir);
  return dir;
}
async function edit(file: string, change: (text: string) => string) {
  await writeFile(file, change(await readFile(file, "utf8")));
}

describe("missingFrench / frenchProblems", () => {
  it("finds every text with English and no French, at any depth", () => {
    const file = { stem: { en: "Q" }, body: { options: [{ id: "a", text: { en: "A", fr: "A" } }, { id: "b", text: { en: "B", fr: "" } }] }, id: "x" };
    expect(missingFrench(file)).toEqual(["stem", "body.options.1.text"]);
  });
  it("reports them only when the certification offers French", () => {
    expect(frenchProblems({ title: { en: "T" } }, ["en"])).toEqual([]);
    expect(frenchProblems({ title: { en: "T" } }, ["en", "fr"])).toEqual(["title: fr is required (certification.languages includes fr)"]);
    expect(frenchProblems({ title: { en: "T", fr: "T" } }, ["en", "fr"])).toEqual([]);
  });
});

describe("served / servedDeep", () => {
  it("serves the English as French when French is not offered, even if a French text exists", () => {
    expect(served({ en: "E", fr: "F" }, ["en"])).toEqual({ en: "E", fr: "E" });
    expect(served({ en: "E" }, ["en"])).toEqual({ en: "E", fr: "E" });
    expect(served({ en: "E", fr: "F" }, ["en", "fr"])).toEqual({ en: "E", fr: "F" });
  });
  it("fills every text of a file, and leaves a bilingual file as it is", () => {
    const file = { id: "q", stem: { en: "S", fr: "Ancien" }, body: { options: [{ text: { en: "A" } }, { text: "code" }] }, when: new Date(0) };
    expect(servedDeep(file, ["en"])).toEqual({ id: "q", stem: { en: "S", fr: "S" }, body: { options: [{ text: { en: "A", fr: "A" } }, { text: "code" }] }, when: new Date(0) });
    expect(servedDeep(file, ["en", "fr"])).toBe(file);
  });
  it("pick falls back to English for a text without French", () => {
    expect(pick({ en: "E" }, "fr")).toBe("E");
    expect(pick({ en: "E", fr: "F" }, "fr")).toBe("F");
  });
});

describe("certification.languages in blueprint.yaml", () => {
  const parse = async (languages?: unknown) => {
    const file = parseYaml(await readFile(path.join(CONTENT, "kcna", "blueprint.yaml"), "utf8")) as { certification: Record<string, unknown> };
    if (languages === undefined) delete file.certification.languages;
    else file.certification.languages = languages;
    return blueprintFileSchema.safeParse(file);
  };
  it("defaults to English and French", async () => {
    const r = await parse();
    if (!r.success) throw new Error(JSON.stringify(r.error.issues));
    expect(r.data.certification.languages).toEqual(["en", "fr"]);
  });
  it("accepts English alone, and refuses no language, French alone, duplicates and other languages", async () => {
    expect((await parse(["en"])).success).toBe(true);
    for (const bad of [[], ["fr"], ["en", "en"], ["en", "de"]]) expect((await parse(bad)).success).toBe(false);
  });
});

describe("a certification offered in English only (KCNA)", () => {
  it("loads its referential, bank and course without any French", async () => {
    const content = await loadCertification(path.join(CONTENT, "kcna"));
    expect(content.blueprint.certification.languages).toEqual(["en"]);
    const bank = await loadBank(content);
    expect(bank.questions.length).toBeGreaterThan(0);
    const course = (await loadCourse(content))!;
    // The French course is the English one.
    const chapter = course.chapters[0]!;
    expect(chapter.title.fr).toBe(chapter.title.en);
    expect(chapter.sections[0]!.body.fr).toBe(chapter.sections[0]!.body.en);
  });

  it("needs French everywhere once languages includes fr: referential, questions, course", async () => {
    const dir = await copy("kcna", (d) => edit(path.join(d, "blueprint.yaml"), (t) => t.replace("languages: [en]", "languages: [en, fr]")));
    await expect(loadCertification(dir)).rejects.toThrow(/fr is required/);
  });

  it("needs the French chapter files only when French is offered", async () => {
    // A bilingual certification (AZ-104) stays as strict as before.
    const dir = await copy("az-104", async (d) => {
      const chapters = path.join(d, "course", "chapters");
      await rm(path.join(chapters, "11-entra-users-groups.fr.md"));
    });
    const report = (await validateCourse(await loadCertification(dir)))!;
    expect(report.problems.map((p) => p.message)).toContain('missing: chapter "11-entra-users-groups" has no fr file');
  });

  it("refuses a bilingual question without French", async () => {
    const dir = await copy("az-900", async (d) => {
      const content = await loadCertification(d);
      const bank = await loadBank(content);
      const q = bank.questions[0]!;
      await edit(q.file.replace(path.join(CONTENT, "az-900"), d), (t) => {
        const file = parseYaml(t) as { stem: { fr?: string } };
        delete file.stem.fr;
        return stringifyYaml(file);
      });
    });
    await expect(loadBank(await loadCertification(dir))).rejects.toBeInstanceOf(ContentError);
  });
});

describe("the CNCF vendor", () => {
  it("is known by its names, keeps its links as they are and scores all or nothing", () => {
    expect(knownVendor("CNCF")?.key).toBe("cncf");
    expect(knownVendor("Linux Foundation")?.key).toBe("cncf");
    const url = "https://kubernetes.io/docs/concepts/overview/";
    expect(localizeDocsUrl(url, "fr")).toBe(url);
    expect(referenceWarnings([{ url }, { url: "https://helm.sh/docs/" }], vendorOf("CNCF"))).toEqual([]);
    expect(referenceWarnings([{ url: "https://learn.microsoft.com/en-us/azure/" }], vendorOf("CNCF"))).toHaveLength(1);
    expect(vendorWarnings({ certification: { code: "kcna", title: "KCNA", vendor: "CNCF", active: false, languages: ["en"], format: "multiple-choice" }, blueprint: { scoring: { multi: "all_or_nothing", dragdrop: "all_or_nothing", command: "per_check", manifest: "per_check" } } })).toEqual([]);
  });
});

describe("texts and answers", () => {
  it("never takes an answer (a dropdown slot named en) for a text", () => {
    const question = { stem: { en: "S", fr: "S" }, answer: { values: { en: "one", type: "hours" } } };
    expect(missingFrench(question)).toEqual([]);
    expect(servedDeep({ ...question, stem: { en: "S" } }, ["en"]).answer).toEqual({ values: { en: "one", type: "hours" } });
  });
  it("finds an objective without French", () => {
    expect(missingFrench({ d: [{ group: { en: "G", fr: "G" }, objectives: [{ code: "1.1", en: "O" }] }] })).toEqual(["d.0.objectives.0"]);
  });
});
