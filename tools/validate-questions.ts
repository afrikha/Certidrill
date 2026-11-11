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

const root = path.resolve("content/az-104");

async function listYaml(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true, recursive: true });
    return entries.filter((e) => e.isFile() && e.name.endsWith(".yaml")).map((e) => path.join(e.parentPath, e.name));
  } catch {
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const prefixIdx = args.indexOf("--prefix");
  const all = [...(await listYaml(path.join(root, "questions"))), ...(await listYaml(path.join(root, "case-studies"))), ...(await listYaml(path.join(root, "series")))];
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
  const caseIds = new Set((await listYaml(path.join(root, "case-studies"))).map((f) => path.basename(f, ".yaml")));
  const seriesIds = new Set((await listYaml(path.join(root, "series"))).map((f) => path.basename(f, ".yaml")));

  let errors = 0;
  const report = (file: string, msg: string) => {
    errors += 1;
    console.log(`✘ ${path.relative(process.cwd(), file)}: ${msg}`);
  };
  const byType = new Map<string, number>();
  for (const file of files.sort()) {
    let raw: unknown;
    try {
      raw = parse(await readFile(file, "utf8"));
    } catch (e) {
      report(file, `YAML: ${(e as Error).message.split("\n")[0]}`);
      continue;
    }
    const rel = path.relative(root, file).split(path.sep);
    const schema = rel[0] === "case-studies" ? caseStudyFileSchema : rel[0] === "series" ? seriesFileSchema : questionFileSchema;
    const r = schema.safeParse(raw);
    if (!r.success) {
      for (const i of r.error.issues) report(file, `${i.path.map(String).join(".") || "(root)"}: ${i.message}`);
      continue;
    }
    const data = r.data as { id: string; objective?: string; caseStudy?: string; series?: string; type?: string };
    if (path.basename(file, ".yaml") !== data.id) report(file, `file name must be ${data.id}.yaml`);
    if (rel[0] === "questions") {
      byType.set(data.type!, (byType.get(data.type!) ?? 0) + 1);
      const domain = objectiveDomain.get(data.objective!);
      if (!domain) report(file, `unknown objective ${data.objective}`);
      else if (rel[1] !== domain) report(file, `objective ${data.objective} belongs to ${domain}/, file is in ${rel[1]}/`);
      if (data.caseStudy && !caseIds.has(data.caseStudy)) report(file, `unknown case study ${data.caseStudy}`);
      if (data.series && !seriesIds.has(data.series)) report(file, `unknown series ${data.series}`);
    }
  }
  console.log(`${files.length} files, ${errors} problem(s). Types: ${[...byType].map(([k, v]) => `${k}=${v}`).join(" ")}`);
  process.exit(errors ? 1 : 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
