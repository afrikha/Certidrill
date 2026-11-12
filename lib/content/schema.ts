import { z } from "zod";

/** Text available in every supported locale. */
export const localizedSchema = z.strictObject({
  en: z.string().min(1),
  fr: z.string().min(1),
});

const share = z.number().min(0).max(1);
const range = z
  .object({ min: z.number().int().min(0), max: z.number().int().min(0) })
  .refine((r) => r.min <= r.max, "min must be <= max");
const shareRange = z
  .object({ min: share, max: share })
  .refine((r) => r.min <= r.max, "min must be <= max");

export const questionTypes = [
  "single",
  "multi",
  "yesno_statements",
  "dropdown",
  "dragdrop",
  "ordering",
  "hotarea",
  "series_yesno",
] as const;
export const questionTypeSchema = z.enum(questionTypes);
export type QuestionTypeCode = z.infer<typeof questionTypeSchema>;

export const typeMixSchema = z.partialRecord(questionTypeSchema, shareRange);

export const difficultyMixSchema = z
  .object({ easy: share, medium: share, hard: share })
  .refine((d) => Math.abs(d.easy + d.medium + d.hard - 1) < 1e-6, "difficulty shares must sum to 1");

/**
 * Readiness index (0–100) and the rules for "ready". See lib/progress/readiness.ts.
 * Scores are on the blueprint scale (scaledScore).
 */
export const readinessSchema = z
  .object({
    /** No "ready" before this many finished exams. */
    minAttempts: z.number().int().min(1),
    /** No "ready" unless the last `consecutive` exams all scored `minScore` or more. */
    consecutive: z.number().int().min(1),
    minScore: z.number().int().min(0),
    /** No "ready" while a domain averages less than this over the `recent` exams. */
    domainFloor: z.number().int().min(0),
    /** Exams used for consistency, domain levels and freshness. */
    recent: z.number().int().min(1),
    /** Exams used for the level criterion (weighted, the latest weighs most). */
    window: z.number().int().min(1),
    /** A score of `from` or less gives 0 points, `to` or more gives 100. */
    scale: z.object({ from: z.number().int().min(0), to: z.number().int().min(0) }).refine((r) => r.from < r.to, "from must be < to"),
    weights: z
      .object({ level: share, consistency: share, domains: share, freshness: share })
      .refine((w) => Math.abs(w.level + w.consistency + w.domains + w.freshness - 1) < 1e-6, "readiness weights must sum to 1"),
    /** Lower bound of each verdict on the index; below `progressing`: not ready. */
    bands: z
      .object({ progressing: z.number().min(0).max(100), almost: z.number().min(0).max(100), ready: z.number().min(0).max(100) })
      .refine((b) => b.progressing < b.almost && b.almost < b.ready, "bands must increase: progressing < almost < ready"),
    freshness: z
      .object({
        /** The last exam starts to count less after this many days… */
        staleDays: z.number().int().min(1),
        /** …and no longer counts for recency after this many days. */
        zeroDays: z.number().int().min(1),
        /** Share of never-seen questions expected in recent exams. */
        minNewShare: share,
      })
      .refine((f) => f.staleDays < f.zeroDays, "zeroDays must be > staleDays"),
  });
export type ReadinessConfig = z.infer<typeof readinessSchema>;

export const structureSchema = z.object({
  caseStudies: z.object({
    count: range,
    questionsEach: range,
    placement: z.enum(["start", "end", "random"]),
  }),
  series: z.object({ count: range, questionsEach: range }),
  maxPerObjective: z.number().int().min(1),
  warningsMin: z.array(z.number().int().positive()).default([]),
  readiness: readinessSchema,
});
export type BlueprintStructure = z.infer<typeof structureSchema>;

export const domainFileSchema = z.object({
  code: z.string().regex(/^[a-z0-9-]+$/),
  order: z.number().int().min(1),
  weight: shareRange,
  title: localizedSchema,
});

export const blueprintFileSchema = z
  .object({
    certification: z.object({
      code: z.string().regex(/^[a-z0-9-]+$/),
      title: z.string().min(1),
      vendor: z.string().min(1),
      active: z.boolean().default(true),
    }),
    blueprint: z.object({
      version: z.string().min(1),
      durationMin: z.number().int().positive(),
      questionCount: range,
      passScore: z.number().int().positive(),
      maxScore: z.number().int().positive(),
      typeMix: typeMixSchema,
      difficultyMix: difficultyMixSchema,
      structure: structureSchema,
    }),
    domains: z.array(domainFileSchema).min(1),
  })
  .superRefine((file, ctx) => {
    const { blueprint, domains } = file;
    if (blueprint.passScore > blueprint.maxScore) {
      ctx.addIssue({ code: "custom", message: "passScore must be <= maxScore", path: ["blueprint", "passScore"] });
    }
    const codes = new Set(domains.map((d) => d.code));
    if (codes.size !== domains.length) {
      ctx.addIssue({ code: "custom", message: "domain codes must be unique", path: ["domains"] });
    }
    const minSum = domains.reduce((s, d) => s + d.weight.min, 0);
    const maxSum = domains.reduce((s, d) => s + d.weight.max, 0);
    if (minSum > 1 + 1e-6 || maxSum < 1 - 1e-6) {
      ctx.addIssue({
        code: "custom",
        message: `domain weights cannot sum to 100% (min ${minSum.toFixed(2)}, max ${maxSum.toFixed(2)})`,
        path: ["domains"],
      });
    }
  });
export type BlueprintFile = z.infer<typeof blueprintFileSchema>;

export const objectiveFileSchema = z.object({
  code: z.string().regex(/^\d+(\.\d+)*$/),
  en: z.string().min(1),
  fr: z.string().min(1),
  learnUrl: z.url().optional(),
});

/** objectives.yaml: { [domainCode]: [{ group: Localized, objectives: [...] }] } */
export const objectivesFileSchema = z.record(
  z.string(),
  z.array(z.object({ group: localizedSchema, objectives: z.array(objectiveFileSchema).min(1) })).min(1),
);
export type ObjectivesFile = z.infer<typeof objectivesFileSchema>;
