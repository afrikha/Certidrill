/**
 * `npm run content:check` — validates every file of content/ (schemas and
 * cross-references) without touching the database. Run in CI.
 */
import { listCertificationDirs, loadCertification } from "../lib/content/loader";
import { loadBank } from "../lib/content/bank";

async function main() {
  for (const dir of await listCertificationDirs()) {
    const content = await loadCertification(dir);
    const bank = await loadBank(content);
    const byType = new Map<string, number>();
    for (const q of bank.questions) byType.set(q.type, (byType.get(q.type) ?? 0) + 1);
    const byStatus = new Map<string, number>();
    for (const q of bank.questions) byStatus.set(q.status, (byStatus.get(q.status) ?? 0) + 1);
    console.log(`✔ ${content.blueprint.certification.code}: ${bank.questions.length} questions, ${bank.caseStudies.length} case studies, ${bank.series.length} series`);
    console.log(`  by type:   ${[...byType].map(([k, v]) => `${k}=${v}`).join(" ")}`);
    console.log(`  by status: ${[...byStatus].map(([k, v]) => `${k}=${v}`).join(" ")}`);
  }
}

main().catch((err) => {
  console.error(`✘ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
