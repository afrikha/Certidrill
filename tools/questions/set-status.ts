/**
 * Changes the status of content files in bulk (after a human review, spec §7).
 *   npm run content:status -- --cert <code|all> <status> <id-prefix|all> [--from <status>]
 *   e.g. npm run content:status -- --cert az-104 published i1-        (questions i1-*)
 *        npm run content:status -- --cert az-104 published all --from reviewed
 * --cert is required: with 23 certifications, "all" must say where it applies.
 * Applies to questions, case studies and series; then run `npm run seed`.
 * With --course, applies to the chapters of the courses instead (course.yaml):
 *   npm run content:status -- --cert az-104 published 12-rbac --course
 *   npm run content:status -- --cert az-104 reviewed all --from draft --course
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { contentStatuses, courseFileSchema } from "../../lib/content/schema";
import { setChapterStatuses, type ContentStatus } from "../../lib/content/course-status";
import { requireCertDirs } from "../cert-args";

const STATUSES = new Set<string>(contentStatuses);
const USAGE = "usage: content:status --cert <code|all> <status> <id-prefix|all> [--from <status>] [--course]";

async function main() {
  const { dirs, rest: args } = await requireCertDirs(process.argv.slice(2), USAGE);
  const course = args.includes("--course");
  const [status, prefix, flag, from, ...rest] = args.filter((a) => a !== "--course");
  if (!status || !STATUSES.has(status) || !prefix || rest.length > 0) throw new Error(USAGE);
  if (flag && (flag !== "--from" || !from || !STATUSES.has(from))) throw new Error("--from expects a status");
  if (course) return setChapters(dirs, { status: status as ContentStatus, prefix, from: from as ContentStatus | undefined });
  const entries = (await Promise.all(dirs.map((d) => readdir(d, { withFileTypes: true, recursive: true })))).flat();
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

/** --course: the chapter statuses of the course.yaml of each certification asked for. */
async function setChapters(dirs: string[], change: Parameters<typeof setChapterStatuses>[1]) {
  let total = 0;
  for (const dir of dirs) {
    const file = path.join(dir, "course", "course.yaml");
    const text = await readFile(file, "utf8").catch(() => null); // NOSONAR: one manifest after the other, logged in order
    if (text === null) continue;
    const { text: next, changed } = setChapterStatuses(text, change);
    // The edited manifest must still be valid, and every chapter asked for must
    // now be in the new status, unless --from excluded it.
    const before = new Map(courseFileSchema.parse(parse(text)).chapters.map((ch) => [ch.id, ch.status]));
    const missed = courseFileSchema.parse(parse(next)).chapters.filter((ch) => {
      const asked = (change.prefix === "all" || ch.id.startsWith(change.prefix)) && (!change.from || before.get(ch.id) === change.from);
      return asked ? ch.status !== change.status : ch.status !== before.get(ch.id);
    });
    if (missed.length > 0) throw new Error(`${file}: status not set as asked for ${missed.map((ch) => ch.id).join(", ")}`);
    if (changed.length === 0) continue;
    await writeFile(file, next); // NOSONAR: see above
    console.log(`${path.basename(dir)}: ${changed.join(", ")}`);
    total += changed.length;
  }
  console.log(`${total} chapter(s) set to ${change.status}. Run \`npm run seed\` to load them.`);
}
try {
  await main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
