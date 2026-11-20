/**
 * The EN → FR terminology glossary used by the writers (questions and
 * course): one shared file, content/glossary.yaml, and optional additions per
 * certification, content/<code>/glossary.yaml. Nothing in the application
 * reads it; content:check validates it so that the certifications keep one
 * French form per English term.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { CONTENT_ROOT } from "./loader";

const text = z.string().trim().min(1);

export const glossaryTermSchema = z.strictObject({
  en: text,
  fr: text,
  area: text,
  /** true: the French form was seen verbatim on the fr-fr page in `source`. */
  confirmed: z.boolean(),
  source: z.url().optional(),
  also_seen: z.array(text).optional(),
  /** French variants not to use for this term (checked in the French texts, outside code: content:validate). */
  avoid: z.array(text).optional(),
  note: text.optional(),
});
export type GlossaryTerm = z.infer<typeof glossaryTermSchema>;

/** A term whose French form is not decided yet: the options seen, to settle and then move to `terms`. */
const undecidedSchema = z.strictObject({
  en: text,
  options: z.array(text).min(2),
  area: text.optional(),
  note: text.optional(),
});

export const sharedGlossarySchema = z.strictObject({
  source_note: text.optional(),
  typography: z.array(text),
  keep_in_english: z.array(text),
  translated_product_names: z.array(z.strictObject({ en: text, fr: text })),
  undecided: z.array(undecidedSchema).default([]),
  terms: z.array(glossaryTermSchema),
});

/** content/<code>/glossary.yaml: the certification's study guide titles and its own terms. */
export const certificationGlossarySchema = z
  .object({
    source_note: text.optional(),
    study_guide_fr: z.unknown().optional(),
    learning_paths_fr: z.unknown().optional(),
    terms: z.array(glossaryTermSchema).default([]),
  })
  .strict();

/**
 * The glossary of another vendor's documentation (content/_shared/glossary-<vendor>.yaml,
 * lib/vendors.ts): its French terms replace those of content/glossary.yaml,
 * which come from Microsoft Learn.
 */
export const vendorGlossarySchema = z.strictObject({
  source_note: text.optional(),
  keep_in_english: z.array(text).default([]),
  terms: z.array(glossaryTermSchema),
});

export type SharedGlossary = z.infer<typeof sharedGlossarySchema>;
export type VendorGlossary = z.infer<typeof vendorGlossarySchema>;
export type CertificationGlossary = z.infer<typeof certificationGlossarySchema>;

const key = (en: string) => en.trim().toLowerCase();
/** French forms are compared without case and with straight apostrophes. */
const sameFr = (a: string, b: string) => a.toLowerCase().replaceAll("’", "'") === b.toLowerCase().replaceAll("’", "'");

/** A certification may repeat a shared term with the same French form, never another one. */
function certificationConflicts(code: string, g: CertificationGlossary, decided: ReadonlyMap<string, { fr: string; where: string }>): string[] {
  const problems: string[] = [];
  const own = new Map<string, string>();
  for (const t of g.terms) {
    const k = key(t.en);
    const before = own.get(k);
    if (before !== undefined && !sameFr(before, t.fr)) problems.push(`"${t.en}": « ${before} » and « ${t.fr} » (${code}/glossary.yaml)`);
    own.set(k, t.fr);
    const known = decided.get(k);
    if (known?.where.startsWith("glossary.yaml") && !sameFr(known.fr, t.fr)) problems.push(`"${t.en}": « ${known.fr} » (${known.where}) and « ${t.fr} » (${code}/glossary.yaml)`);
  }
  return problems;
}

/**
 * The conflicts of the glossaries: one English term with two French forms
 * (inside a file, or between the shared file and a certification), a term
 * both kept in English and translated, or a term both decided and undecided.
 */
export function glossaryConflicts(shared: SharedGlossary, perCertification: ReadonlyMap<string, CertificationGlossary> = new Map()): string[] {
  const problems: string[] = [];
  const decided = new Map<string, { fr: string; where: string }>();
  const add = (en: string, fr: string, where: string) => {
    const known = decided.get(key(en));
    if (known && !sameFr(known.fr, fr)) problems.push(`"${en}": « ${known.fr} » (${known.where}) and « ${fr} » (${where})`);
    else if (!known) decided.set(key(en), { fr, where });
  };
  for (const p of shared.translated_product_names) add(p.en, p.fr, "glossary.yaml translated_product_names");
  for (const t of shared.terms) add(t.en, t.fr, "glossary.yaml");
  for (const [code, g] of perCertification) problems.push(...certificationConflicts(code, g, decided));
  const english = new Set(shared.keep_in_english.map(key));
  for (const p of shared.translated_product_names) if (english.has(key(p.en))) problems.push(`"${p.en}" is both kept in English and translated`);
  for (const u of shared.undecided) if (decided.has(key(u.en))) problems.push(`"${u.en}" is undecided but already has a French form (${decided.get(key(u.en))!.where})`);
  return problems;
}

const issues = (error: z.ZodError) => error.issues.map((i) => i.path.join(".") + ": " + i.message).join("; ");

async function readYaml(file: string): Promise<unknown> {
  try {
    return parse(await readFile(file, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw e;
  }
}

/** Loads and checks the shared glossary and those of the given certification folders; throws on any problem. */
export async function loadGlossaries(dirs: readonly string[], root = CONTENT_ROOT): Promise<{ shared: SharedGlossary; perCertification: Map<string, CertificationGlossary> }> {
  const sharedFile = path.join(root, "glossary.yaml");
  const raw = await readYaml(sharedFile);
  if (raw === undefined) throw new Error(`${sharedFile}: missing`);
  const r = sharedGlossarySchema.safeParse(raw);
  if (!r.success) throw new Error(`${sharedFile}: ${issues(r.error)}`);
  const perCertification = new Map<string, CertificationGlossary>();
  const files = await Promise.all(dirs.map(async (dir) => ({ dir, raw: await readYaml(path.join(dir, "glossary.yaml")) })));
  for (const { dir, raw: data } of files) {
    if (data === undefined) continue;
    const c = certificationGlossarySchema.safeParse(data);
    if (!c.success) throw new Error(`${path.join(dir, "glossary.yaml")}: ${issues(c.error)}`);
    perCertification.set(path.basename(dir), c.data);
  }
  const conflicts = glossaryConflicts(r.data, perCertification);
  if (conflicts.length > 0) throw new Error(`glossary conflicts:\n  ${conflicts.join("\n  ")}`);
  return { shared: r.data, perCertification };
}

/**
 * The conflicts of a vendor glossary: one English term with two French forms,
 * a term both kept in English and translated, or a variant to avoid that is
 * the term itself or a form the vendor also uses.
 */
export function vendorGlossaryConflicts(g: VendorGlossary, file: string): string[] {
  const problems: string[] = [];
  const seen = new Map<string, string>();
  for (const t of g.terms) {
    const before = seen.get(key(t.en));
    if (before !== undefined) problems.push(`"${t.en}": listed twice in ${file}${sameFr(before, t.fr) ? "" : ` (« ${before} » and « ${t.fr} »)`}`);
    seen.set(key(t.en), t.fr);
    for (const a of t.avoid ?? []) if ([t.fr, ...(t.also_seen ?? [])].some((f) => sameFr(f, a))) problems.push(`"${t.en}": « ${a} » is both used and to avoid (${file})`);
  }
  const english = new Set(g.keep_in_english.map(key));
  for (const t of g.terms) if (english.has(key(t.en)) && !sameFr(t.en, t.fr)) problems.push(`"${t.en}" is both kept in English and translated (${file})`);
  return problems;
}

/** Loads and checks a vendor glossary (path relative to the content root); null when the file does not exist. */
export async function loadVendorGlossary(file: string, root = CONTENT_ROOT): Promise<VendorGlossary | null> {
  const raw = await readYaml(path.join(root, file));
  if (raw === undefined) return null;
  const r = vendorGlossarySchema.safeParse(raw);
  if (!r.success) throw new Error(`${file}: ${issues(r.error)}`);
  const conflicts = vendorGlossaryConflicts(r.data, file);
  if (conflicts.length > 0) throw new Error(`glossary conflicts:\n  ${conflicts.join("\n  ")}`);
  return r.data;
}

/**
 * Code is not prose: fenced blocks, inline code and HTML comments (the section
 * markers, whose ids match the English chapter) are left out of the terminology check.
 */
function withoutCode(markdown: string): string {
  return markdown.replaceAll(/```[\s\S]*?```/g, " ").replaceAll(/`[^`\n]*`/g, " ").replaceAll(/<!--[\s\S]*?-->/g, " ");
}

const escape = (s: string) => s.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The variants to avoid (glossary `avoid`) found in a French text, outside
 * code and parentheses (an English gloss): one message per variant, with its
 * count. Case-sensitive, whole words.
 */
export function terminologyWarnings(fr: string, terms: readonly GlossaryTerm[]): string[] {
  // An English gloss in parentheses after the French term, « rubrique (topic) », « (system prompt) », is allowed,
  // and so is a quotation in guillemets: the exam's own English words, « find PII in S3 buckets ».
  const prose = withoutCode(fr).replaceAll(/\([^()\n]*\)/g, " ").replaceAll(/«[^«»\n]*»/g, " ");
  const warnings: string[] = [];
  for (const t of terms) {
    for (const a of t.avoid ?? []) {
      const n = prose.match(new RegExp(`(?<![\\p{L}\\p{N}_-])${escape(a)}(?![\\p{L}\\p{N}_-])`, "gu"))?.length ?? 0;
      if (n > 0) warnings.push(`French text uses « ${a} »${n > 1 ? ` (${n}×)` : ""}: the glossary says « ${t.fr} » for "${t.en}"`);
    }
  }
  return warnings;
}
