/**
 * Validates individual content files (questions, case studies, series) and
 * reports EVERY problem, without needing the rest of the bank to be valid.
 *   npm run content:validate -- content/az-104/questions/storage/s1-*.yaml
 *   npm run content:validate -- --prefix s1-        (all files whose id starts with s1-)
 * Checks: YAML syntax, Zod schema, answer/body consistency, file name = id,
 * known objective in the right domain folder, existing case study / series.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { loadCertification } from "../lib/content/loader";
import { caseStudyFileSchema, questionFileSchema, seriesFileSchema } from "../lib/questions/schema";
import { compareCodeUnits } from "../lib/sort";

const root = path.resolve("content/az-104");

async function listYaml(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true, recursive: true });
    return entries.filter((e) => e.isFile() && e.name.endsWith(".yaml")).map((e) => path.join(e.parentPath, e.name));
  } catch {
    return [];
  }
}

function schemaFor(folder: string | undefined) {
  if (folder === "case-studies") return caseStudyFileSchema;
  if (folder === "series") return seriesFileSchema;
  return questionFileSchema;
}

type Context = { objectiveDomain: Map<string, string>; caseIds: Set<string>; seriesIds: Set<string> };
type FileData = { id: string; objective?: string; caseStudy?: string; series?: string; type?: string };

/** Problems of a question that passed its schema: objective, folder, case study, series. */
function questionProblems(data: FileData, folder: string | undefined, ctx: Context): string[] {
  const problems: string[] = [];
  const domain = ctx.objectiveDomain.get(data.objective!);
  if (!domain) problems.push(`unknown objective ${data.objective}`);
  else if (folder !== domain) problems.push(`objective ${data.objective} belongs to ${domain}/, file is in ${folder}/`);
  if (data.caseStudy && !ctx.caseIds.has(data.caseStudy)) problems.push(`unknown case study ${data.caseStudy}`);
  if (data.series && !ctx.seriesIds.has(data.series)) problems.push(`unknown series ${data.series}`);
  return problems;
}

/** Every problem of one file, and its question type (questions only). */
function validateFile(file: string, text: string, ctx: Context): { problems: string[]; type?: string } {
  let raw: unknown;
  try {
    raw = parse(text);
  } catch (e) {
    return { problems: [`YAML: ${(e as Error).message.split("\n")[0]}`] };
  }
  const rel = path.relative(root, file).split(path.sep);
  const r = schemaFor(rel[0]).safeParse(raw);
  if (!r.success) return { problems: r.error.issues.map((i) => `${i.path.map(String).join(".") || "(root)"}: ${i.message}`) };
  const data = r.data as FileData;
  const problems = path.basename(file, ".yaml") === data.id ? [] : [`file name must be ${data.id}.yaml`];
  if (rel[0] !== "questions") return { problems };
  return { problems: [...problems, ...questionProblems(data, rel[1], ctx)], type: data.type };
}

async function main() {
  const args = process.argv.slice(2);
  const prefixIdx = args.indexOf("--prefix");
  const [questions, caseStudies, series] = await Promise.all(["questions", "case-studies", "series"].map((d) => listYaml(path.join(root, d))));
  const all = [...questions!, ...caseStudies!, ...series!];
  let files: string[];
  if (prefixIdx >= 0) {
    const prefix = args[prefixIdx + 1] ?? "";
    files = all.filter((f) => path.basename(f).startsWith(prefix));
  } else {
    files = args.map((f) => path.resolve(f));
  }
  if (files.length === 0) throw new Error("no file to validate");

  const content = await loadCertification(root);
  const objectiveDomain = new Map<string, string>();
  for (const [domain, groups] of Object.entries(content.objectives)) for (const g of groups) for (const o of g.objectives) objectiveDomain.set(o.code, domain);
  const ctx: Context = {
    objectiveDomain,
    caseIds: new Set(caseStudies!.map((f) => path.basename(f, ".yaml"))),
    seriesIds: new Set(series!.map((f) => path.basename(f, ".yaml"))),
  };

  files.sort(compareCodeUnits);
  // Files are independent: read them all at once, then report in order.
  const texts = await Promise.all(files.map((file) => readFile(file, "utf8")));
  let errors = 0;
  const byType = new Map<string, number>();
  files.forEach((file, n) => {
    const { problems, type } = validateFile(file, texts[n]!, ctx);
    for (const msg of problems) console.log(`✘ ${path.relative(process.cwd(), file)}: ${msg}`);
    errors += problems.length;
    if (type) byType.set(type, (byType.get(type) ?? 0) + 1);
  });
  const types = [...byType].map(([k, v]) => k + "=" + v).join(" ");
  console.log(`${files.length} files, ${errors} problem(s). Types: ${types}`);
  process.exit(errors ? 1 : 0);
}

try {
  await main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
