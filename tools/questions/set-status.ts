/**
 * Changes the status of content files in bulk (after a human review, spec §7).
 *   npm run content:status -- <status> <id-prefix|all> [--from <status>]
 *   e.g. npm run content:status -- published i1-        (questions i1-*)
 *        npm run content:status -- published all --from reviewed
 * Applies to questions, case studies and series; then run `npm run seed`.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const STATUSES = new Set(["draft", "needs_review", "reviewed", "published", "retired"]);

async function main() {
  const [status, prefix, flag, from] = process.argv.slice(2);
  if (!status || !STATUSES.has(status) || !prefix) throw new Error("usage: content:status <status> <id-prefix|all> [--from <status>]");
  if (flag && (flag !== "--from" || !from || !STATUSES.has(from))) throw new Error("--from expects a status");
  const root = path.resolve("content");
  const entries = await readdir(root, { withFileTypes: true, recursive: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith(".yaml") && /(questions|case-studies|series)/.test(e.parentPath))
    .filter((e) => prefix === "all" || e.name.startsWith(prefix))
    .map((e) => path.join(e.parentPath, e.name));
  // Each file is read and rewritten on its own: no ordering between them.
  const results = await Promise.all(
    files.map(async (file) => {
      const text = await readFile(file, "utf8");
      const current = /^status: (\w+)$/m.exec(text)?.[1];
      if (!current || current === status || (from && current !== from)) return false;
      await writeFile(file, text.replace(/^status: \w+$/m, `status: ${status}`));
      return true;
    }),
  );
  const changed = results.filter(Boolean).length;
  console.log(`${changed} file(s) set to ${status}. Run \`npm run seed\` to load them.`);
}
try {
  await main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
