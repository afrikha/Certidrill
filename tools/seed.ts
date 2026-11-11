/**
 * `npm run seed` — loads every certification of content/ into the database.
 * The repository is the source of truth; running it again is harmless.
 */
import { PrismaClient } from "@prisma/client";
import { listCertificationDirs, loadCertification } from "../lib/content/loader";
import { seedBank, seedReferential } from "../lib/content/seed";
import { loadBank } from "../lib/content/bank";

async function main() {
  const db = new PrismaClient();
  try {
    const dirs = await listCertificationDirs();
    if (dirs.length === 0) throw new Error("No certification found in content/");
    // One certification after the other: each one is validated before anything
    // of it is written, and the log stays in order.
    for (const dir of dirs) {
      const content = await loadCertification(dir); // NOSONAR: sequential on purpose (see above)
      const bank = await loadBank(content); // NOSONAR: validate everything before writing
      const report = await seedReferential(db, content); // NOSONAR: database writes, in order
      console.log(
        `✔ ${report.certification} — blueprint ${report.blueprintVersion}: ${report.domains} domains, ${report.objectives} objectives`,
      );
      const b = await seedBank(db, content, bank); // NOSONAR: database writes, in order
      const retired = b.retired ? ", " + b.retired + " retired" : "";
      console.log(`  ${b.questions} questions, ${b.caseStudies} case studies, ${b.series} series${retired}`);
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
