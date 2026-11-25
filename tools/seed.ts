/**
 * `npm run seed` — loads every certification of content/ into the database.
 * The repository is the source of truth; running it again is harmless.
 */
import { PrismaClient } from "@prisma/client";
import { listCertificationDirs, loadCertification } from "../lib/content/loader";
import { seedBank, seedCourse, seedQuizzes, seedReferential } from "../lib/content/seed";
import { loadBank } from "../lib/content/bank";
import { loadCourse } from "../lib/content/course";
import { loadQuizzes } from "../lib/content/quiz";

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
        const bank = await loadBank(content);
        const course = await loadCourse(content);
        return { content, bank, course, quizzes: await loadQuizzes(content, course, bank) };
      }),
    );
    // One id space for the whole repository (the question table): a quiz or bank id used twice would overwrite the other.
    const seen = new Map<string, string>();
    for (const { content, bank, quizzes } of loaded) {
      const code = content.blueprint.certification.code;
      for (const id of [...bank.questions.map((q) => q.id), ...quizzes.flatMap((q) => q.questions.map((x) => x.id))]) {
        if (seen.has(id)) throw new Error(`question id ${id} is used by ${seen.get(id)} and ${code}`);
        seen.set(id, code);
      }
    }
    for (const { content, bank, course, quizzes } of loaded) {
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
      const z = await seedQuizzes(db, content, quizzes); // NOSONAR: database writes, in order
      if (z.quizzes || z.retired) console.log(`  quizzes: ${z.quizzes} chapters, ${z.questions} questions (${z.written} new or changed${z.retired ? ", " + z.retired + " retired" : ""})`);
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
