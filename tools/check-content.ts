/**
 * `npm run content:check` — validates every file of content/ (schemas and
 * cross-references) without touching the database. Run in CI.
 */
import { listCertificationDirs, loadCertification } from "../lib/content/loader";
import { loadBank } from "../lib/content/bank";
import { loadCourse } from "../lib/content/course";
import { loadGlossaries, loadVendorGlossary } from "../lib/content/glossary";
import { VENDORS } from "../lib/vendors";

/** "a=1 b=2" from the counts of `key` over the items. */
function countBy<T>(items: readonly T[], key: (item: T) => string): string {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return [...counts].map(([k, v]) => k + "=" + v).join(" ");
}

async function main() {
  // Each certification is independent: load them all at once, then report in
  // order and stop at the first failing one, as a sequential loop would.
  const dirs = await listCertificationDirs();
  const loaded = await Promise.allSettled(
    dirs.map(async (dir) => {
      const content = await loadCertification(dir);
      return { content, bank: await loadBank(content), course: await loadCourse(content) };
    }),
  );
  for (const result of loaded) {
    if (result.status === "rejected") throw result.reason;
    const { content, bank, course } = result.value;
    console.log(`✔ ${content.blueprint.certification.code}: ${bank.questions.length} questions, ${bank.caseStudies.length} case studies, ${bank.series.length} series`);
    console.log(`  by type:   ${countBy(bank.questions, (q) => q.type)}`);
    console.log(`  by status: ${countBy(bank.questions, (q) => q.status)}`);
    if (course) {
      const sections = course.chapters.reduce((n, c) => n + c.sections.length, 0);
      console.log(`  course:    ${course.chapters.length} chapters, ${sections} sections; by status: ${countBy(course.chapters, (c) => c.status)}`);
    }
  }
  // The shared terminology glossary and the additions of each certification.
  const glossary = await loadGlossaries(dirs);
  const additions = [...glossary.perCertification].map(([c, g]) => c + " +" + g.terms.length).join(", ") || "no certification glossary";
  console.log(`✔ glossary: ${glossary.shared.terms.length} shared terms, ${glossary.shared.undecided.length} undecided; ${additions}`);
  // The glossaries of the other vendors' documentation (lib/vendors.ts).
  for (const v of Object.values(VENDORS)) {
    if (!v.glossary) continue;
    const g = await loadVendorGlossary(v.glossary);
    if (!g) {
      console.log(`⚠ glossary ${v.name}: ${v.glossary} missing (lib/vendors.ts)`);
      continue;
    }
    console.log(`✔ glossary ${v.name}: ${g.terms.length} terms, ${g.terms.filter((t) => t.confirmed).length} confirmed`);
  }
}

try {
  await main();
} catch (err) {
  console.error(`✘ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
