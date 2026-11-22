/**
 * Compares blind answers with the answer keys.
 *   npx tsx tools/questions/compare-blind.ts [--cert <code|all>] <answers.json> [--map <export.md.map.json>] [--out <gaps.json>] [--apply]
 * answers.json: { "<questionId>": { "answer": <response>, "ambiguous": "<reason>"? } }
 * Question ids are looked up in the certifications given by --cert (every
 * certification without it: ids are unique across content/).
 * Prints mismatches; --out also writes them as JSON (id, file, earned, max,
 * ambiguous, given, expected) for the classification of the gaps. Points are
 * on the exam's scale: the certification's blueprint.scoring applies.
 * With --apply: questions answered correctly and not flagged ambiguous go
 * from draft to reviewed; the others go to needs_review.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { scoreItem } from "../../lib/exam/scoring";
import type { ScoringRules } from "../../lib/content/schema";
import { blueprintScoring } from "./blueprint-scoring";
import { listCertificationDirs } from "../../lib/content/loader";
import { parseCertArgs } from "../cert-args";

type BlindAnswer = { answer: unknown; ambiguous?: string };
type OptionAnswer = { optionId?: string; optionIds?: string[] };

/** Replaces the neutral letters of export-blind by the real option ids. */
function mapLetters(answer: unknown, letters: Record<string, string> | undefined): unknown {
  const r = answer as OptionAnswer | undefined;
  if (!letters || !r) return answer;
  return {
    ...r,
    ...(r.optionId ? { optionId: letters[r.optionId] ?? r.optionId } : {}),
    ...(r.optionIds ? { optionIds: r.optionIds.map((x) => letters[x] ?? x) } : {}),
  };
}

/** blueprint.scoring of the certification a question file belongs to (content/<code>/questions/<domain>/<id>.yaml). */
const rulesByCert = new Map<string, Promise<ScoringRules>>();
function rulesOf(file: string): Promise<ScoringRules> {
  const certDir = path.resolve(file, "../../..");
  let rules = rulesByCert.get(certDir);
  if (!rules) {
    rules = blueprintScoring(certDir);
    rulesByCert.set(certDir, rules);
  }
  return rules;
}

/** Checks one answer; with `apply`, moves a draft question to reviewed or needs_review. */
async function check(id: string, a: BlindAnswer, file: string | undefined, letters: Record<string, string> | undefined, apply: boolean) {
  if (!file) return { pass: false, line: id + ": unknown question", gap: { id, unknown: true } };
  const text = await readFile(file, "utf8");
  const q = parse(text);
  const answer = mapLetters(a.answer, letters);
  const s = scoreItem(q, answer, await rulesOf(file));
  const pass = s.earned === s.max && !a.ambiguous;
  const ambiguous = a.ambiguous ? " — ambiguous: " + a.ambiguous : "";
  if (apply && /^status: draft$/m.test(text)) {
    await writeFile(file, text.replace(/^status: draft$/m, `status: ${pass ? "reviewed" : "needs_review"}`));
  }
  return {
    pass,
    line: `${id}: ${s.earned}/${s.max}${ambiguous} — given ${JSON.stringify(answer)} expected ${JSON.stringify(q.answer)}`,
    gap: { id, file: path.relative(process.cwd(), file), earned: s.earned, max: s.max, ambiguous: a.ambiguous, given: answer, expected: q.answer },
  };
}

function option(args: string[], name: string): string | undefined {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
}

async function main() {
  const { dirs, rest: args } = await parseCertArgs(process.argv.slice(2));
  const apply = args.includes("--apply");
  const mapFile = option(args, "--map");
  const outFile = option(args, "--out");
  const file = args.find((a, i) => !a.startsWith("--") && !["--map", "--out"].includes(args[i - 1] ?? ""));
  if (!file) throw new Error("usage: compare-blind [--cert <code|all>] <answers.json> [--map <map.json>] [--out <gaps.json>] [--apply]");
  // Letters shown by export-blind for single/multi options → real option ids.
  const labels = mapFile ? (JSON.parse(await readFile(mapFile, "utf8")) as Record<string, Record<string, string>>) : {};
  const answers = JSON.parse(await readFile(file, "utf8")) as Record<string, BlindAnswer>;
  const roots = (dirs ?? (await listCertificationDirs())).map((d) => path.join(d, "questions"));
  const entries = (await Promise.all(roots.map((r) => readdir(r, { withFileTypes: true, recursive: true }).catch(() => [])))).flat();
  const paths = new Map(entries.filter((e) => e.isFile() && e.name.endsWith(".yaml")).map((e) => [path.basename(e.name, ".yaml"), path.join(e.parentPath, e.name)]));
  // One file per question: the checks are independent; results keep the input order.
  const results = await Promise.all(Object.entries(answers).map(([id, a]) => check(id, a, paths.get(id), labels[id], apply)));
  const ok = results.filter((r) => r.pass).length;
  console.log(`${ok}/${Object.keys(answers).length} confirmed`);
  for (const r of results) if (!r.pass) console.log(`✘ ${r.line}`);
  if (outFile) await writeFile(outFile, JSON.stringify(results.filter((r) => !r.pass).map((r) => r.gap), null, 1) + "\n");
}

try {
  await main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
