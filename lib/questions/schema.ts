/**
 * Question schemas — the single definition of each question type (spec §6),
 * shared by the seed, the API, the scoring engine and the generation tools.
 *
 * For each type: `body` (what is displayed), `answer` (the key — never sent to
 * the browser before submission) and `response` (what the candidate submits).
 */
import { z } from "zod";
import { localizedSchema } from "@/lib/content/schema";

export { questionTypes, type QuestionTypeCode } from "@/lib/content/schema";

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/, "ids are 1-40 chars of [a-zA-Z0-9_-]");

/** A text that is either language-neutral (code, command, service name) or localized. */
export const textSchema = z.union([z.string().min(1), localizedSchema]);
export type Text = z.infer<typeof textSchema>;

const choice = z.strictObject({ id, text: textSchema });
export type Choice = z.infer<typeof choice>;

function uniqueIds(list: { id: string }[], ctx: z.RefinementCtx, path: string) {
  const seen = new Set<string>();
  for (const item of list) {
    if (seen.has(item.id)) ctx.addIssue({ code: "custom", message: `duplicate id "${item.id}"`, path: [path] });
    seen.add(item.id);
  }
}

// ---------------------------------------------------------------- per-type definitions

export const singleBody = z.object({ options: z.array(choice).min(2).max(8) }).superRefine((b, ctx) => uniqueIds(b.options, ctx, "options"));
export const singleAnswer = z.object({ optionId: id });
export const singleResponse = z.object({ optionId: id });

export const multiBody = z
  .object({ options: z.array(choice).min(3).max(10), choose: z.number().int().min(2) })
  .superRefine((b, ctx) => {
    uniqueIds(b.options, ctx, "options");
    if (b.choose >= b.options.length) ctx.addIssue({ code: "custom", message: "choose must be < number of options", path: ["choose"] });
  });
export const multiAnswer = z.object({ optionIds: z.array(id).min(2) });
export const multiResponse = z.object({ optionIds: z.array(id).max(10) });

export const yesnoStatementsBody = z
  .object({ statements: z.array(choice).min(2).max(5) })
  .superRefine((b, ctx) => uniqueIds(b.statements, ctx, "statements"));
export const yesnoStatementsAnswer = z.object({ values: z.record(id, z.boolean()) });
export const yesnoStatementsResponse = z.object({ values: z.record(id, z.boolean()) });

/**
 * Answer area with drop-down lists. The template contains `[[slotId]]` markers;
 * `layout: code` renders it as a monospace block (command, ARM/Bicep), `text`
 * as prose.
 */
export const dropdownBody = z
  .object({
    layout: z.enum(["code", "text"]),
    language: z.string().optional(),
    template: textSchema,
    slots: z.array(z.strictObject({ id, options: z.array(choice).min(2).max(10) })).min(1).max(6),
  })
  .superRefine((b, ctx) => {
    uniqueIds(b.slots, ctx, "slots");
    for (const s of b.slots) uniqueIds(s.options, ctx, "slots");
    const templates = typeof b.template === "string" ? [b.template] : [b.template.en, b.template.fr];
    for (const t of templates) {
      const markers = [...t.matchAll(/\[\[([a-zA-Z0-9_-]+)\]\]/g)].map((m) => m[1]);
      const slotIds = b.slots.map((s) => s.id);
      if (markers.length !== slotIds.length || slotIds.some((s) => !markers.includes(s))) {
        ctx.addIssue({ code: "custom", message: "template must contain each [[slotId]] marker exactly once", path: ["template"] });
      }
    }
  });
export const dropdownAnswer = z.object({ values: z.record(id, id) });
export const dropdownResponse = z.object({ values: z.record(id, id) });

/** Drag items onto targets. Each target receives one item; `reuse` lets an item go to several targets. */
export const dragdropBody = z
  .object({
    items: z.array(choice).min(2).max(10),
    targets: z.array(choice).min(1).max(8),
    reuse: z.boolean().default(false),
  })
  .superRefine((b, ctx) => {
    uniqueIds(b.items, ctx, "items");
    uniqueIds(b.targets, ctx, "targets");
  });
export const dragdropAnswer = z.object({ mapping: z.record(id, id) });
export const dragdropResponse = z.object({ mapping: z.record(id, id) });

/** Pick `count` actions among the list and put them in the right order. */
export const orderingBody = z
  .object({ actions: z.array(choice).min(4).max(10), count: z.number().int().min(2) })
  .superRefine((b, ctx) => {
    uniqueIds(b.actions, ctx, "actions");
    if (b.count > b.actions.length) ctx.addIssue({ code: "custom", message: "count must be <= number of actions", path: ["count"] });
  });
export const orderingAnswer = z.object({ sequence: z.array(id).min(2) });
export const orderingResponse = z.object({ sequence: z.array(id).max(10) });

/**
 * Hot area: a table (configuration screen, settings grid…) whose cells marked
 * with an `area` id are clickable. Each prompt is answered by clicking one area.
 */
const hotCell = z.strictObject({ text: textSchema.optional(), area: id.optional() });
export const hotareaBody = z
  .object({
    prompts: z.array(choice).min(1).max(4),
    grid: z.object({
      caption: textSchema.optional(),
      header: z.array(textSchema).optional(),
      rows: z.array(z.array(hotCell).min(1)).min(1),
    }),
  })
  .superRefine((b, ctx) => {
    uniqueIds(b.prompts, ctx, "prompts");
    const areas = b.grid.rows.flat().flatMap((c) => (c.area ? [c.area] : []));
    if (new Set(areas).size !== areas.length) ctx.addIssue({ code: "custom", message: "area ids must be unique", path: ["grid"] });
    if (areas.length < 2) ctx.addIssue({ code: "custom", message: "a hot area needs at least 2 clickable areas", path: ["grid"] });
  });
export const hotareaAnswer = z.object({ values: z.record(id, id) });
export const hotareaResponse = z.object({ values: z.record(id, id) });

/** One question of a "does the solution meet the goal?" series. The shared goal is the series stem. */
export const seriesYesnoBody = z.object({ solution: textSchema });
export const seriesYesnoAnswer = z.object({ value: z.boolean() });
export const seriesYesnoResponse = z.object({ value: z.boolean() });

export const typeSchemas = {
  single: { body: singleBody, answer: singleAnswer, response: singleResponse },
  multi: { body: multiBody, answer: multiAnswer, response: multiResponse },
  yesno_statements: { body: yesnoStatementsBody, answer: yesnoStatementsAnswer, response: yesnoStatementsResponse },
  dropdown: { body: dropdownBody, answer: dropdownAnswer, response: dropdownResponse },
  dragdrop: { body: dragdropBody, answer: dragdropAnswer, response: dragdropResponse },
  ordering: { body: orderingBody, answer: orderingAnswer, response: orderingResponse },
  hotarea: { body: hotareaBody, answer: hotareaAnswer, response: hotareaResponse },
  series_yesno: { body: seriesYesnoBody, answer: seriesYesnoAnswer, response: seriesYesnoResponse },
} as const;

type Schemas = typeof typeSchemas;
export type QuestionBody<T extends keyof Schemas = keyof Schemas> = z.infer<Schemas[T]["body"]>;
export type QuestionAnswer<T extends keyof Schemas = keyof Schemas> = z.infer<Schemas[T]["answer"]>;
export type QuestionResponse<T extends keyof Schemas = keyof Schemas> = z.infer<Schemas[T]["response"]>;

// ---------------------------------------------------------------- common envelope

export const exhibitSchema = z.strictObject({ id, title: textSchema, body: textSchema });
export const referenceSchema = z.strictObject({ title: z.string().min(1), url: z.url() });
export const explanationSchema = z.strictObject({
  correct: localizedSchema,
  /** Why each wrong option / statement / slot choice is wrong, keyed by its id. */
  options: z.record(z.string(), localizedSchema).optional(),
});

const statusSchema = z.enum(["draft", "needs_review", "reviewed", "published", "retired"]);

const envelope = {
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,60}$/),
  objective: z.string().regex(/^\d+(\.\d+)*$/),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  status: statusSchema.default("draft"),
  version: z.number().int().min(1).default(1),
  shuffle: z.boolean().default(true),
  caseStudy: z.string().optional(),
  series: z.string().optional(),
  seriesOrder: z.number().int().min(1).optional(),
  stem: localizedSchema,
  exhibits: z.array(exhibitSchema).default([]),
  explanation: explanationSchema,
  references: z.array(referenceSchema).min(1, "at least one Microsoft Learn reference"),
};

const variant = <T extends keyof Schemas>(type: T) =>
  z.strictObject({ ...envelope, type: z.literal(type), body: typeSchemas[type].body, answer: typeSchemas[type].answer });

/** A question as stored in content/<cert>/questions/**.yaml. */
export const questionFileSchema = z
  .discriminatedUnion("type", [
    variant("single"),
    variant("multi"),
    variant("yesno_statements"),
    variant("dropdown"),
    variant("dragdrop"),
    variant("ordering"),
    variant("hotarea"),
    variant("series_yesno"),
  ])
  .superRefine((q, ctx) => {
    for (const issue of answerIssues(q)) ctx.addIssue({ code: "custom", message: issue, path: ["answer"] });
    if (q.type === "series_yesno" && !q.series) ctx.addIssue({ code: "custom", message: "series_yesno requires `series`", path: ["series"] });
    if (q.type !== "series_yesno" && q.series) ctx.addIssue({ code: "custom", message: "only series_yesno questions belong to a series", path: ["series"] });
  });
export type QuestionFile = z.infer<typeof questionFileSchema>;

/** Checks that an answer key is consistent with its body (ids exist, counts match). */
export function answerIssues(q: { type: string; body: unknown; answer: unknown }): string[] {
  const issues: string[] = [];
  const has = (list: { id: string }[], ids: string[], what: string) => {
    for (const i of ids) if (!list.some((x) => x.id === i)) issues.push(`unknown ${what} "${i}"`);
  };
  switch (q.type) {
    case "single": {
      const b = q.body as QuestionBody<"single">;
      has(b.options, [(q.answer as QuestionAnswer<"single">).optionId], "option");
      break;
    }
    case "multi": {
      const b = q.body as QuestionBody<"multi">;
      const a = q.answer as QuestionAnswer<"multi">;
      has(b.options, a.optionIds, "option");
      if (new Set(a.optionIds).size !== b.choose || a.optionIds.length !== b.choose) issues.push(`answer must list exactly ${b.choose} distinct options`);
      break;
    }
    case "yesno_statements": {
      const b = q.body as QuestionBody<"yesno_statements">;
      const a = q.answer as QuestionAnswer<"yesno_statements">;
      has(b.statements, Object.keys(a.values), "statement");
      if (b.statements.some((s) => a.values[s.id] === undefined)) issues.push("every statement needs a value");
      break;
    }
    case "dropdown": {
      const b = q.body as QuestionBody<"dropdown">;
      const a = q.answer as QuestionAnswer<"dropdown">;
      for (const slot of b.slots) {
        const v = a.values[slot.id];
        if (v === undefined) issues.push(`slot "${slot.id}" has no answer`);
        else has(slot.options, [v], `option of slot ${slot.id}`);
      }
      has(b.slots, Object.keys(a.values), "slot");
      break;
    }
    case "dragdrop": {
      const b = q.body as QuestionBody<"dragdrop">;
      const a = q.answer as QuestionAnswer<"dragdrop">;
      has(b.targets, Object.keys(a.mapping), "target");
      has(b.items, Object.values(a.mapping), "item");
      if (b.targets.some((t) => a.mapping[t.id] === undefined)) issues.push("every target needs an item");
      const used = Object.values(a.mapping);
      if (!b.reuse && new Set(used).size !== used.length) issues.push("an item is used twice but reuse is false");
      break;
    }
    case "ordering": {
      const b = q.body as QuestionBody<"ordering">;
      const a = q.answer as QuestionAnswer<"ordering">;
      has(b.actions, a.sequence, "action");
      if (a.sequence.length !== b.count) issues.push(`sequence must contain exactly ${b.count} actions`);
      if (new Set(a.sequence).size !== a.sequence.length) issues.push("sequence contains duplicates");
      break;
    }
    case "hotarea": {
      const b = q.body as QuestionBody<"hotarea">;
      const a = q.answer as QuestionAnswer<"hotarea">;
      const areas = b.grid.rows.flat().flatMap((c) => (c.area ? [{ id: c.area }] : []));
      has(b.prompts, Object.keys(a.values), "prompt");
      has(areas, Object.values(a.values), "area");
      if (b.prompts.some((p) => a.values[p.id] === undefined)) issues.push("every prompt needs an area");
      break;
    }
  }
  return issues;
}

/** Maximum points of a question (spec §5 "Notation"). */
export function maxPoints(type: keyof Schemas, body: unknown): number {
  switch (type) {
    case "multi":
      return (body as QuestionBody<"multi">).choose;
    case "yesno_statements":
      return (body as QuestionBody<"yesno_statements">).statements.length;
    case "dropdown":
      return (body as QuestionBody<"dropdown">).slots.length;
    case "dragdrop":
      return (body as QuestionBody<"dragdrop">).targets.length;
    case "hotarea":
      return (body as QuestionBody<"hotarea">).prompts.length;
    default:
      return 1;
  }
}

/** Validates a candidate's response for a given question type (API input). */
export function parseResponse(type: keyof Schemas, value: unknown) {
  return typeSchemas[type].response.safeParse(value);
}

// ---------------------------------------------------------------- case studies & series

export const caseStudyFileSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,60}$/),
  status: statusSchema.default("draft"),
  version: z.number().int().min(1).default(1),
  title: localizedSchema,
  tabs: z.array(z.strictObject({ key: id, title: localizedSchema, body: localizedSchema })).min(1),
});
export type CaseStudyFile = z.infer<typeof caseStudyFileSchema>;

export const seriesFileSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,60}$/),
  status: statusSchema.default("draft"),
  version: z.number().int().min(1).default(1),
  stem: localizedSchema,
});
export type SeriesFile = z.infer<typeof seriesFileSchema>;
