/**
 * `npm run seed` — loads every certification of content/ into the database.
 * The repository is the source of truth; running it again is harmless.
 */
import { PrismaClient } from "@prisma/client";
import { listCertificationDirs, loadCertification } from "../lib/content/loader";
import { seedBank, seedCourse, seedReferential } from "../lib/content/seed";
import { loadBank } from "../lib/content/bank";
import { loadCourse } from "../lib/content/course";

async function main() {
  const db = new PrismaClient();
  try {
    const dirs = await listCertificationDirs();
    if (dirs.length === 0) throw new Error("No certification found in content/");
    // Every certification is read and validated first, all at once (the files
    // are independent): nothing is written unless the whole of content/ is
    // valid. Then the writes, one certification after the other, in order.
    const loaded = await Promise.all(
      dirs.map(async (dir) => {
        const content = await loadCertification(dir);
        return { content, bank: await loadBank(content), course: await loadCourse(content) };
      }),
    );
    for (const { content, bank, course } of loaded) {
      const report = await seedReferential(db, content); // NOSONAR: database writes, in order
      console.log(
        `✔ ${report.certification} — blueprint ${report.blueprintVersion}: ${report.domains} domains, ${report.objectives} objectives`,
      );
      const b = await seedBank(db, content, bank); // NOSONAR: database writes, in order
      const retired = b.retired ? ", " + b.retired + " retired" : "";
      console.log(`  ${b.questions} questions, ${b.caseStudies} case studies, ${b.series} series${retired} (${b.written} new or changed)`);
      const r = await seedCourse(db, content, course); // NOSONAR: database writes, in order
      const { removed } = r;
      const gone = removed.chapters + removed.sections
        ? `, removed ${removed.chapters} chapters and ${removed.sections} sections with ${removed.progress} sections read by users`
        : "";
      const kept = r.statusKept ? `; ${r.statusKept} chapters keep the status set in the back-office` : "";
      if (course || gone) console.log(`  course: ${r.chapters} chapters, ${r.sections} sections (${r.changed.chapters} chapters and ${r.changed.sections} sections new or changed${gone})${kept}`);
    }
  } finally {
    await db.$disconnect();
  }
}

try {
  await main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
