/**
 * Exports questions WITHOUT answers or explanations, as Markdown, for an
 * independent blind check (spec §7, step 4): a reviewer (human or model)
 * answers them, then `compare-blind.ts` compares with the answer keys.
 *   npx tsx tools/questions/export-blind.ts <id-prefix | @ids-file> <out.md>
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import fs from "node:fs";
import { parse } from "yaml";
import { createRng } from "../../lib/exam/random";
import { shuffleArray } from "../../lib/questions/order";
import { compareCodeUnits } from "../../lib/sort";

const root = path.resolve("content/az-104");
type T = string | { en: string; fr: string };
type Item = { id: string; text: T };
function en(t: T | undefined): string {
  if (t === undefined) return "";
  return typeof t === "string" ? t : t.en;
}
/** "[id] text | [id] text" */
const listInline = (items: Item[]) => items.map((o) => "[" + o.id + "] " + en(o.text)).join(" | ");

async function yamlFiles(dir: string) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries.filter((e) => e.isFile() && e.name.endsWith(".yaml")).map((e) => path.join(e.parentPath, e.name));
}

/** A parsed YAML document (untyped, as in the rest of these review tools). */
type Doc = ReturnType<typeof parse>;
const readYaml = async (file: string): Promise<Doc> => parse(await readFile(file, "utf8"));

/** Parsed YAML of each file, read in parallel (keyed by path). */
async function readAll(files: string[]): Promise<Map<string, Doc>> {
  return new Map(await Promise.all(files.map(async (f) => [f, await readYaml(f)] as const)));
}

function selectFiles(all: string[], prefix: string): string[] {
  if (!prefix.startsWith("@")) return all.filter((f) => path.basename(f).startsWith(prefix));
  const ids = new Set(fs.readFileSync(prefix.slice(1), "utf8").split("\n").filter(Boolean));
  return all.filter((f) => ids.has(path.basename(f, ".yaml")));
}

type Mix = <X>(list: X[]) => X[];
type Render = (b: Doc, mix: Mix, labels: Record<string, string>) => string[];

function optionLines(b: Doc, mix: Mix, labels: Record<string, string>): string[] {
  return mix(b.options as Item[]).map((o, i) => {
    const letter = String.fromCodePoint(65 + i);
    labels[letter] = o.id;
    return `- [${letter}] ${en(o.text)}`;
  });
}

function hotareaLines(b: Doc): string[] {
  const cell = (c: { text?: T; area?: string }) => en(c.text) + (c.area ? " {area:" + c.area + "}" : "");
  const lines = b.grid.header ? ["| " + b.grid.header.map(en).join(" | ") + " |"] : [];
  for (const row of b.grid.rows) lines.push("| " + row.map(cell).join(" | ") + " |");
  for (const pr of b.prompts) lines.push(`- prompt [${pr.id}] ${en(pr.text)}`);
  return lines;
}

/** Answer area of a question, by type. `mix` shuffles a list like the exam does. */
const RENDER: Record<string, Render> = {
  single: (b, mix, labels) => [...optionLines(b, mix, labels), 'ANSWER FORMAT: {"optionId": "<letter>"}'],
  multi: (b, mix, labels) => [`Choose ${b.choose}.`, ...optionLines(b, mix, labels), 'ANSWER FORMAT: {"optionIds": ["<letter>", ..]}'],
  yesno_statements: (b) => [
    ...b.statements.map((st: Item) => `- [${st.id}] ${en(st.text)}`),
    'ANSWER FORMAT: {"values": {"<statementId>": true|false}}',
  ],
  dropdown: (b, mix) => [
    "Template:\n```\n" + en(b.template) + "\n```",
    ...b.slots.map((slot: { id: string; options: Item[] }) => `- slot [${slot.id}]: ${listInline(mix(slot.options))}`),
    'ANSWER FORMAT: {"values": {"<slotId>": "<optionId>"}}',
  ],
  dragdrop: (b, mix) => [
    `Items (${b.reuse ? "may be reused" : "each used at most once"}): ${listInline(mix(b.items as Item[]))}`,
    ...b.targets.map((t: Item) => `- target [${t.id}] ${en(t.text)}`),
    'ANSWER FORMAT: {"mapping": {"<targetId>": "<itemId>"}}',
  ],
  ordering: (b, mix) => [
    `Select ${b.count} actions in order:`,
    ...mix(b.actions as Item[]).map((a) => `- [${a.id}] ${en(a.text)}`),
    'ANSWER FORMAT: {"sequence": ["..", ".."]}',
  ],
  hotarea: (b) => [...hotareaLines(b), 'ANSWER FORMAT: {"values": {"<promptId>": "<areaId>"}}'],
  series_yesno: (b) => [`Solution: ${en(b.solution)}\nDoes the solution meet the goal?`, 'ANSWER FORMAT: {"value": true|false}'],
};

async function main() {
  const [prefix, out] = process.argv.slice(2);
  if (!prefix || !out) throw new Error("usage: export-blind <prefix> <out.md>");
  const files = selectFiles(await yamlFiles(path.join(root, "questions")), prefix).sort(compareCodeUnits);
  // Every file is read up front, in parallel; the export is then built in order.
  const questions = await readAll(files);
  const qs = files.map((f) => questions.get(f));
  const refs = (key: "caseStudy" | "series", dir: string) =>
    [...new Set(qs.map((q) => q[key]).filter(Boolean))].map((id) => path.join(root, dir, `${id}.yaml`));
  const caseStudies = await readAll(refs("caseStudy", "case-studies"));
  const series = await readAll(refs("series", "series"));
  const parts: string[] = [];
  const shown = new Set<string>();
  // Lists are shown in a shuffled order (like in the exam) and single/multi
  // options get neutral letters, so that neither the file order nor the option
  // ids hint at the answer. The letter → option id map is written next to the
  // export (<out>.map.json) for compare-blind.
  const labelMap: Record<string, Record<string, string>> = {};
  for (const q of qs) {
    const rnd = createRng(`blind:${q.id}`);
    const mix = <X,>(list: X[]): X[] => (q.shuffle === false && q.type !== "ordering" ? list : shuffleArray(list, rnd));
    const lines: string[] = [`## ${q.id} (type: ${q.type})`];
    if (q.caseStudy && !shown.has(q.caseStudy)) {
      const cs = caseStudies.get(path.join(root, "case-studies", `${q.caseStudy}.yaml`));
      const tabs = cs.tabs.map((t: { title: T; body: T }) => "### " + en(t.title) + "\n\n" + en(t.body));
      parts.push(`# Case study ${q.caseStudy}\n\n${tabs.join("\n\n")}`);
      shown.add(q.caseStudy);
    }
    if (q.caseStudy) lines.push(`(Case study: ${q.caseStudy})`);
    lines.push(en(q.series ? series.get(path.join(root, "series", `${q.series}.yaml`)).stem : q.stem));
    for (const e of q.exhibits ?? []) lines.push(`Exhibit ${en(e.title)}:\n${en(e.body)}`);
    if (q.type === "single" || q.type === "multi") labelMap[q.id] = {};
    lines.push(...(RENDER[q.type]?.(q.body, mix, labelMap[q.id] ?? {}) ?? []));
    parts.push(lines.join("\n\n"));
  }
  await writeFile(out, parts.join("\n\n---\n\n") + "\n");
  await writeFile(`${out}.map.json`, JSON.stringify(labelMap, null, 1) + "\n");
  console.log(`${files.length} questions → ${out}`);
}

try {
  await main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
