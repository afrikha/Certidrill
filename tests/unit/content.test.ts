import path from "node:path";
import { mkdtemp, mkdir, writeFile, cp } from "node:fs/promises";
import os from "node:os";
import { describe, expect, it } from "vitest";
import { listCertificationDirs, loadCertification, ContentError } from "@/lib/content/loader";
import { blueprintFileSchema } from "@/lib/content/schema";

const AZ104 = path.resolve(__dirname, "../../content/az-104");

describe("AZ-104 content", () => {
  it("loads a valid blueprint and objectives", async () => {
    const { blueprint, objectives } = await loadCertification(AZ104);
    expect(blueprint.certification.code).toBe("az-104");
    expect(blueprint.blueprint).toMatchObject({ durationMin: 100, passScore: 700, maxScore: 1000 });
    expect(blueprint.blueprint.questionCount).toEqual({ min: 45, max: 58 });
    expect(blueprint.domains.map((d) => d.code)).toEqual(["identities", "storage", "compute", "networking", "monitoring"]);
    const count = Object.values(objectives).flat().reduce((n, g) => n + g.objectives.length, 0);
    expect(count).toBe(81);
  });

  it("is discovered as a certification folder", async () => {
    const dirs = await listCertificationDirs(path.resolve(__dirname, "../../content"));
    expect(dirs.map((d) => path.basename(d))).toContain("az-104");
  });
});

describe("blueprint schema", () => {
  const base = {
    certification: { code: "x-1", title: "X", vendor: "V" },
    blueprint: {
      version: "1",
      durationMin: 60,
      questionCount: { min: 10, max: 20 },
      passScore: 700,
      maxScore: 1000,
      typeMix: { single: { min: 0.5, max: 1 } },
      difficultyMix: { easy: 0.3, medium: 0.5, hard: 0.2 },
      structure: {
        caseStudies: { count: { min: 0, max: 0 }, questionsEach: { min: 0, max: 0 }, placement: "end" },
        series: { count: { min: 0, max: 0 }, questionsEach: { min: 0, max: 0 } },
        maxPerObjective: 2,
        readiness: { consecutive: 3, minScore: 800 },
      },
    },
    domains: [
      { code: "a", order: 1, weight: { min: 0.4, max: 0.6 }, title: { en: "A", fr: "A" } },
      { code: "b", order: 2, weight: { min: 0.4, max: 0.6 }, title: { en: "B", fr: "B" } },
    ],
  };

  it("accepts a consistent blueprint", () => {
    expect(blueprintFileSchema.safeParse(base).success).toBe(true);
  });

  it("rejects weights that cannot sum to 100%", () => {
    const bad = structuredClone(base);
    bad.domains[0]!.weight = { min: 0.1, max: 0.2 };
    bad.domains[1]!.weight = { min: 0.1, max: 0.2 };
    expect(blueprintFileSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a difficulty mix not summing to 1", () => {
    const bad = structuredClone(base);
    bad.blueprint.difficultyMix = { easy: 0.5, medium: 0.5, hard: 0.5 };
    expect(blueprintFileSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects inverted ranges and a pass score above the max", () => {
    const bad = structuredClone(base);
    bad.blueprint.questionCount = { min: 30, max: 20 };
    bad.blueprint.passScore = 2000;
    const result = blueprintFileSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects duplicate domain codes", () => {
    const bad = structuredClone(base);
    bad.domains[1]!.code = "a";
    expect(blueprintFileSchema.safeParse(bad).success).toBe(false);
  });
});

describe("loader consistency checks", () => {
  async function fixture(mutate: (dir: string) => Promise<void>) {
    const root = await mkdtemp(path.join(os.tmpdir(), "certidrill-"));
    const dir = path.join(root, "az-104");
    await mkdir(dir);
    await cp(path.join(AZ104, "blueprint.yaml"), path.join(dir, "blueprint.yaml"));
    await cp(path.join(AZ104, "objectives.yaml"), path.join(dir, "objectives.yaml"));
    await mutate(dir);
    return dir;
  }

  it("rejects objectives for an unknown domain", async () => {
    const dir = await fixture(async (d) => {
      await writeFile(
        path.join(d, "objectives.yaml"),
        "unknown:\n  - group: { en: G, fr: G }\n    objectives:\n      - { code: '9.1.1', en: X, fr: X }\n",
      );
    });
    await expect(loadCertification(dir)).rejects.toBeInstanceOf(ContentError);
  });

  it("rejects duplicate objective codes", async () => {
    const dir = await fixture(async (d) => {
      const { readFile } = await import("node:fs/promises");
      const text = await readFile(path.join(d, "objectives.yaml"), "utf8");
      await writeFile(path.join(d, "objectives.yaml"), text.replace('code: "1.1.2"', 'code: "1.1.1"'));
    });
    await expect(loadCertification(dir)).rejects.toThrow(/duplicate objective code/);
  });

  it("rejects a folder name that differs from the certification code", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "certidrill-"));
    const dir = path.join(root, "other");
    await mkdir(dir);
    await cp(path.join(AZ104, "blueprint.yaml"), path.join(dir, "blueprint.yaml"));
    await cp(path.join(AZ104, "objectives.yaml"), path.join(dir, "objectives.yaml"));
    await expect(loadCertification(dir)).rejects.toThrow(/must match its folder name/);
  });
});
