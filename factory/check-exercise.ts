/**
 * Checks the practical exercises (types `command` and `manifest`) of a
 * certification, or only those whose file or id contains a filter:
 *
 *   npx tsx factory/check-exercise.ts <cert> [file-or-id-substring ...]
 *
 * The checks are those of content:validate (lib/exercises/validate.ts): every
 * solution passes every check and every negative fails one, run on what the
 * real kubectl v1.37 prints in mode `object`. Without kubectl (KUBECTL_BIN or
 * /usr/local/bin/kubectl), mode `object` is checked on the written outputs.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { kubectlBinary } from "../lib/exercises/kubectl";
import { checkExercise, type Exercise } from "../lib/exercises/validate";
import { questionFileSchema } from "../lib/questions/schema";

async function yamlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(entries.map((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return yamlFiles(p);
    return Promise.resolve(/\.ya?ml$/.test(e.name) ? [p] : []);
  }));
  return nested.flat();
}

async function main() {
  const [cert, ...filters] = process.argv.slice(2);
  if (!cert) throw new Error("usage: check-exercise.ts <cert> [filter ...]");
  const root = path.resolve("content", cert);
  const kubectl = kubectlBinary() !== null;
  const files = [...(await yamlFiles(path.join(root, "questions"))), ...(await yamlFiles(path.join(root, "quizzes")))];
  let checked = 0;
  let failed = 0;
  for (const file of files) {
    const data = parse(await readFile(file, "utf8")) as unknown;
    // A quiz file holds a list of questions; a bank file holds one.
    const items = Array.isArray((data as { questions?: unknown })?.questions) ? (data as { questions: unknown[] }).questions : [data];
    for (const item of items) {
      const parsed = questionFileSchema.safeParse(item);
      if (!parsed.success || (parsed.data.type !== "command" && parsed.data.type !== "manifest")) continue;
      const q = parsed.data;
      if (filters.length && !filters.some((f) => file.includes(f) || q.id.includes(f))) continue;
      checked++;
      const report = await checkExercise(q as unknown as Exercise, { kubectl });
      const rel = path.relative(process.cwd(), file);
      for (const p of report.problems) console.log(`✗ ${rel} (${q.id}): ${p}`);
      for (const m of report.mismatches) console.log(`≠ ${rel} (${q.id}): ${m}`);
      if (report.problems.length) failed++;
    }
  }
  console.log(`${checked} exercise(s) checked${kubectl ? " with kubectl v1.37" : " without kubectl"}, ${failed} with problems.`);
  if (failed) process.exitCode = 1;
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
