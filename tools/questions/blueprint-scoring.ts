import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { scoringRulesSchema, type ScoringRules } from "../../lib/content/schema";

/**
 * blueprint.scoring of a certification directory (content/<code>/). A missing
 * blueprint.yaml or an invalid scoring block is an error naming the file: the
 * blind comparison must not silently fall back to the Microsoft rule.
 */
export async function blueprintScoring(certDir: string): Promise<ScoringRules> {
  const file = path.join(certDir, "blueprint.yaml");
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    throw new Error(`${file}: blueprint not found, the scoring rules are unknown`);
  }
  const parsed = scoringRulesSchema.safeParse((parse(text) as { blueprint?: { scoring?: unknown } } | null)?.blueprint?.scoring);
  if (!parsed.success) throw new Error(`${file}: invalid blueprint.scoring: ${parsed.error.issues.map((i) => `${i.path.join(".") || "scoring"} ${i.message}`).join("; ")}`);
  return parsed.data;
}
