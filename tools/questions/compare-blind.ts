/**
 * Compares blind answers with the answer keys.
 *   npx tsx tools/questions/compare-blind.ts <answers.json> [--map <export.md.map.json>] [--apply]
 * answers.json: { "<questionId>": { "answer": <response>, "ambiguous": "<reason>"? } }
 * Prints mismatches. With --apply: questions answered correctly and not flagged
 * ambiguous go from draft to reviewed; the others go to needs_review.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { scoreItem } from "../../lib/exam/scoring";

const root = path.resolve("content/az-104/questions");

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

/** Checks one answer; with `apply`, moves a draft question to reviewed or needs_review. */
async function check(id: string, a: BlindAnswer, file: string | undefined, letters: Record<string, string> | undefined, apply: boolean) {
  if (!file) return { pass: false, line: id + ": unknown question" };
  const text = await readFile(file, "utf8");
  const q = parse(text);
  const answer = mapLetters(a.answer, letters);
  const s = scoreItem(q, answer);
  const pass = s.earned === s.max && !a.ambiguous;
  const ambiguous = a.ambiguous ? " — ambiguous: " + a.ambiguous : "";
  if (apply && /^status: draft$/m.test(text)) {
    await writeFile(file, text.replace(/^status: draft$/m, `status: ${pass ? "reviewed" : "needs_review"}`));
  }
  return { pass, line: `${id}: ${s.earned}/${s.max}${ambiguous} — given ${JSON.stringify(answer)} expected ${JSON.stringify(q.answer)}` };
}

async function main() {
  const args = process.argv.slice(2);
  const file = args[0];
  const apply = args.includes("--apply");
  const mapFile = args.includes("--map") ? args[args.indexOf("--map") + 1] : undefined;
  // Letters shown by export-blind for single/multi options → real option ids.
  const labels = mapFile ? (JSON.parse(await readFile(mapFile, "utf8")) as Record<string, Record<string, string>>) : {};
  const answers = JSON.parse(await readFile(file!, "utf8")) as Record<string, BlindAnswer>;
  const entries = await readdir(root, { withFileTypes: true, recursive: true });
  const paths = new Map(entries.filter((e) => e.isFile()).map((e) => [path.basename(e.name, ".yaml"), path.join(e.parentPath, e.name)]));
  // One file per question: the checks are independent; results keep the input order.
  const results = await Promise.all(Object.entries(answers).map(([id, a]) => check(id, a, paths.get(id), labels[id], apply)));
  const ok = results.filter((r) => r.pass).length;
  console.log(`${ok}/${Object.keys(answers).length} confirmed`);
  for (const r of results) if (!r.pass) console.log(`✘ ${r.line}`);
}

try {
  await main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
