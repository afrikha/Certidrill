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

async function main() {
  const args = process.argv.slice(2);
  const file = args[0];
  const flag = args.includes("--apply") ? "--apply" : undefined;
  const mapFile = args.includes("--map") ? args[args.indexOf("--map") + 1] : undefined;
  // Letters shown by export-blind for single/multi options → real option ids.
  const labels = mapFile ? (JSON.parse(await readFile(mapFile, "utf8")) as Record<string, Record<string, string>>) : {};
  const answers = JSON.parse(await readFile(file!, "utf8")) as Record<string, { answer: unknown; ambiguous?: string }>;
  const entries = await readdir(root, { withFileTypes: true, recursive: true });
  const paths = new Map(entries.filter((e) => e.isFile()).map((e) => [path.basename(e.name, ".yaml"), path.join(e.parentPath, e.name)]));
  let ok = 0;
  const bad: string[] = [];
  for (const [id, a] of Object.entries(answers)) {
    const p = paths.get(id);
    if (!p) { bad.push(`${id}: unknown question`); continue; }
    const text = await readFile(p, "utf8");
    const q = parse(text);
    const m = labels[id];
    const r = a.answer as { optionId?: string; optionIds?: string[] };
    const answer = m && r ? { ...r, ...(r.optionId ? { optionId: m[r.optionId] ?? r.optionId } : {}), ...(r.optionIds ? { optionIds: r.optionIds.map((x) => m[x] ?? x) } : {}) } : a.answer;
    const s = scoreItem(q, answer);
    const pass = s.earned === s.max && !a.ambiguous;
    if (pass) ok += 1;
    else bad.push(`${id}: ${s.earned}/${s.max}${a.ambiguous ? ` — ambiguous: ${a.ambiguous}` : ""} — given ${JSON.stringify(answer)} expected ${JSON.stringify(q.answer)}`);
    if (flag === "--apply" && /^status: draft$/m.test(text)) {
      await writeFile(p, text.replace(/^status: draft$/m, `status: ${pass ? "reviewed" : "needs_review"}`));
    }
  }
  console.log(`${ok}/${Object.keys(answers).length} confirmed`);
  for (const b of bad) console.log(`✘ ${b}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
