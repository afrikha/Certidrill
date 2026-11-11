/**
 * `npm run content:check` — validates every file of content/ (schemas and
 * cross-references) without touching the database. Run in CI.
 */
import { listCertificationDirs, loadCertification } from "../lib/content/loader";
import { loadBank } from "../lib/content/bank";

/** "a=1 b=2" from the counts of `key` over the items. */
function countBy<T>(items: readonly T[], key: (item: T) => string): string {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return [...counts].map(([k, v]) => k + "=" + v).join(" ");
}

async function main() {
  // Each certification is independent: load them all at once, then report in
  // order and stop at the first failing one, as a sequential loop would.
  const loaded = await Promise.allSettled(
    (await listCertificationDirs()).map(async (dir) => {
      const content = await loadCertification(dir);
      return { content, bank: await loadBank(content) };
    }),
  );
  for (const result of loaded) {
    if (result.status === "rejected") throw result.reason;
    const { content, bank } = result.value;
    console.log(`✔ ${content.blueprint.certification.code}: ${bank.questions.length} questions, ${bank.caseStudies.length} case studies, ${bank.series.length} series`);
    console.log(`  by type:   ${countBy(bank.questions, (q) => q.type)}`);
    console.log(`  by status: ${countBy(bank.questions, (q) => q.status)}`);
  }
}

try {
  await main();
} catch (err) {
  console.error(`✘ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
