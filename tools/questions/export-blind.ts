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

const root = path.resolve("content/az-104");
type T = string | { en: string; fr: string };
const en = (t: T | undefined) => (t === undefined ? "" : typeof t === "string" ? t : t.en);

async function yamlFiles(dir: string) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries.filter((e) => e.isFile() && e.name.endsWith(".yaml")).map((e) => path.join(e.parentPath, e.name));
}

async function main() {
  const [prefix, out] = process.argv.slice(2);
  if (!prefix || !out) throw new Error("usage: export-blind <prefix> <out.md>");
  const files = (await yamlFiles(path.join(root, "questions"))).filter((f) => (prefix.startsWith("@") ? fs.readFileSync(prefix.slice(1), "utf8").split("\n").filter(Boolean).includes(path.basename(f, ".yaml")) : path.basename(f).startsWith(prefix))).sort();
  const parts: string[] = [];
  const shown = new Set<string>();
  // Lists are shown in a shuffled order (like in the exam) and single/multi
  // options get neutral letters, so that neither the file order nor the option
  // ids hint at the answer. The letter → option id map is written next to the
  // export (<out>.map.json) for compare-blind.
  const labelMap: Record<string, Record<string, string>> = {};
  for (const f of files) {
    const q = parse(await readFile(f, "utf8"));
    const b = q.body;
    const rnd = createRng(`blind:${q.id}`);
    const mix = <X,>(list: X[]): X[] => (q.shuffle === false && q.type !== "ordering" ? list : shuffleArray(list, rnd));
    const lines: string[] = [`## ${q.id} (type: ${q.type})`];
    if (q.caseStudy && !shown.has(q.caseStudy)) {
      const cs = parse(await readFile(path.join(root, "case-studies", `${q.caseStudy}.yaml`), "utf8"));
      parts.push(`# Case study ${q.caseStudy}\n\n${cs.tabs.map((t: { title: T; body: T }) => `### ${en(t.title)}\n\n${en(t.body)}`).join("\n\n")}`);
      shown.add(q.caseStudy);
    }
    if (q.caseStudy) lines.push(`(Case study: ${q.caseStudy})`);
    if (q.series) {
      const s = parse(await readFile(path.join(root, "series", `${q.series}.yaml`), "utf8"));
      lines.push(en(s.stem));
    } else {
      lines.push(en(q.stem));
    }
    for (const e of q.exhibits ?? []) lines.push(`Exhibit ${en(e.title)}:\n${en(e.body)}`);
    switch (q.type) {
      case "single":
      case "multi":
        if (q.type === "multi") lines.push(`Choose ${b.choose}.`);
        labelMap[q.id] = {};
        mix(b.options as { id: string; text: T }[]).forEach((o, i) => {
          const letter = String.fromCharCode(65 + i);
          labelMap[q.id]![letter] = o.id;
          lines.push(`- [${letter}] ${en(o.text)}`);
        });
        lines.push(q.type === "single" ? 'ANSWER FORMAT: {"optionId": "<letter>"}' : 'ANSWER FORMAT: {"optionIds": ["<letter>", ..]}');
        break;
      case "yesno_statements":
        for (const s of b.statements) lines.push(`- [${s.id}] ${en(s.text)}`);
        lines.push('ANSWER FORMAT: {"values": {"<statementId>": true|false}}');
        break;
      case "dropdown":
        lines.push("Template:\n```\n" + en(b.template) + "\n```");
        for (const s of b.slots) lines.push(`- slot [${s.id}]: ${mix(s.options as { id: string; text: T }[]).map((o) => `[${o.id}] ${en(o.text)}`).join(" | ")}`);
        lines.push('ANSWER FORMAT: {"values": {"<slotId>": "<optionId>"}}');
        break;
      case "dragdrop":
        lines.push(`Items (${b.reuse ? "may be reused" : "each used at most once"}): ${mix(b.items as { id: string; text: T }[]).map((i) => `[${i.id}] ${en(i.text)}`).join(" | ")}`);
        for (const t of b.targets) lines.push(`- target [${t.id}] ${en(t.text)}`);
        lines.push('ANSWER FORMAT: {"mapping": {"<targetId>": "<itemId>"}}');
        break;
      case "ordering":
        lines.push(`Select ${b.count} actions in order:`);
        for (const a of mix(b.actions as { id: string; text: T }[])) lines.push(`- [${a.id}] ${en(a.text)}`);
        lines.push('ANSWER FORMAT: {"sequence": ["..", ".."]}');
        break;
      case "hotarea":
        if (b.grid.header) lines.push("| " + b.grid.header.map(en).join(" | ") + " |");
        for (const row of b.grid.rows) lines.push("| " + row.map((c: { text?: T; area?: string }) => `${en(c.text)}${c.area ? ` {area:${c.area}}` : ""}`).join(" | ") + " |");
        for (const p of b.prompts) lines.push(`- prompt [${p.id}] ${en(p.text)}`);
        lines.push('ANSWER FORMAT: {"values": {"<promptId>": "<areaId>"}}');
        break;
      case "series_yesno":
        lines.push(`Solution: ${en(b.solution)}\nDoes the solution meet the goal?`);
        lines.push('ANSWER FORMAT: {"value": true|false}');
        break;
    }
    parts.push(lines.join("\n\n"));
  }
  await writeFile(out, parts.join("\n\n---\n\n") + "\n");
  await writeFile(`${out}.map.json`, JSON.stringify(labelMap, null, 1) + "\n");
  console.log(`${files.length} questions → ${out}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
