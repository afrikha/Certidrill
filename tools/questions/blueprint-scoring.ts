import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { scoringRulesSchema, type ScoringRules } from "../../lib/content/schema";

/**
 * blueprint.scoring of a certification directory (content/<code>/). A missing
 * or unparsable blueprint.yaml, or an invalid scoring block is an error naming the file: the
 * blind comparison must not silently fall back to the Microsoft rule.
 */
export async function blueprintScoring(certDir: string): Promise<ScoringRules> {
  const file = path.join(certDir, "blueprint.yaml");
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") throw new Error(`${file}: blueprint not found, the scoring rules are unknown`);
    throw new Error(`${file}: ${e instanceof Error ? e.message : String(e)}`);
  }
  let doc: { blueprint?: { scoring?: unknown } } | null;
  try {
    doc = parse(text) as typeof doc;
  } catch (e) {
    throw new Error(`${file}: invalid YAML: ${e instanceof Error ? e.message : String(e)}`);
  }
  const parsed = scoringRulesSchema.safeParse(doc?.blueprint?.scoring);
  if (!parsed.success) throw new Error(`${file}: invalid blueprint.scoring: ${parsed.error.issues.map((i) => `${i.path.join(".") || "scoring"} ${i.message}`).join("; ")}`);
  return parsed.data;
}
