import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { CertificationContent } from "./loader";
import type { QuestionBank } from "./bank";
import type { Course } from "./course";

export interface SeedReport {
  certification: string;
  blueprintVersion: string;
  domains: number;
  objectives: number;
  questions?: number;
  caseStudies?: number;
  series?: number;
}

/**
 * Upserts a certification's referential (certification, blueprint, domains,
 * objectives). Idempotent: the repository is the source of truth and the
 * database can be rebuilt from it at any time.
 */
export async function seedReferential(db: PrismaClient, content: CertificationContent): Promise<SeedReport> {
  const { blueprint: file, objectives } = content;
  const c = file.certification;
  const b = file.blueprint;

  return db.$transaction(async (tx) => {
    const certification = await tx.certification.upsert({
      where: { code: c.code },
      create: { code: c.code, title: c.title, vendor: c.vendor, active: c.active },
      update: { title: c.title, vendor: c.vendor, active: c.active },
    });

    const data = {
      durationMin: b.durationMin,
      minQuestions: b.questionCount.min,
      maxQuestions: b.questionCount.max,
      passScore: b.passScore,
      maxScore: b.maxScore,
      typeMix: b.typeMix,
      difficultyMix: b.difficultyMix,
      structure: b.structure,
      current: true,
    };
    await tx.blueprint.updateMany({
      where: { certificationId: certification.id, NOT: { version: b.version } },
      data: { current: false },
    });
    const blueprint = await tx.blueprint.upsert({
      where: { certificationId_version: { certificationId: certification.id, version: b.version } },
      create: { certificationId: certification.id, version: b.version, ...data },
      update: data,
    });

    let objectiveCount = 0;
    for (const d of file.domains) {
      const domain = await tx.domain.upsert({ // NOSONAR: sequential upserts in one interactive transaction (single connection; FK order)
        where: { blueprintId_code: { blueprintId: blueprint.id, code: d.code } },
        create: { blueprintId: blueprint.id, code: d.code, order: d.order, title: d.title, weightMin: d.weight.min, weightMax: d.weight.max },
        update: { order: d.order, title: d.title, weightMin: d.weight.min, weightMax: d.weight.max },
      });
      let order = 0;
      for (const group of objectives[d.code] ?? []) {
        for (const o of group.objectives) {
          order += 1;
          const values = { order, group: group.group, title: { en: o.en, fr: o.fr }, learnUrl: o.learnUrl ?? null };
          await tx.objective.upsert({ // NOSONAR: sequential upserts in one interactive transaction (single connection; FK order)
            where: { domainId_code: { domainId: domain.id, code: o.code } },
            create: { domainId: domain.id, code: o.code, ...values },
            update: values,
          });
          objectiveCount += 1;
        }
      }
    }

    return { certification: c.code, blueprintVersion: b.version, domains: file.domains.length, objectives: objectiveCount };
  }, { timeout: 60_000 });
}

/**
 * Upserts the question bank (case studies, series, questions). Questions keep
 * their id across versions; a question removed from the repository is retired,
 * never deleted, because past attempts reference it.
 */
export async function seedBank(db: PrismaClient, content: CertificationContent, bank: QuestionBank) {
  const code = content.blueprint.certification.code;
  const version = content.blueprint.blueprint.version;
  return db.$transaction(async (tx) => {
    const certification = await tx.certification.findUniqueOrThrow({ where: { code } });
    const blueprint = await tx.blueprint.findUniqueOrThrow({
      where: { certificationId_version: { certificationId: certification.id, version } },
      include: { domains: { include: { objectives: true } } },
    });
    const objectiveIds = new Map(blueprint.domains.flatMap((d) => d.objectives.map((o) => [o.code, o.id] as const)));

    for (const cs of bank.caseStudies) {
      const data = { title: cs.title, tabs: cs.tabs as Prisma.InputJsonValue, status: cs.status, version: cs.version };
      await tx.caseStudy.upsert({ where: { id: cs.id }, create: { id: cs.id, certificationId: certification.id, ...data }, update: data }); // NOSONAR: sequential upserts in one interactive transaction (single connection; FK order)
    }
    for (const s of bank.series) {
      const data = { stem: s.stem, status: s.status, version: s.version };
      await tx.questionSeries.upsert({ where: { id: s.id }, create: { id: s.id, certificationId: certification.id, ...data }, update: data }); // NOSONAR: sequential upserts in one interactive transaction (single connection; FK order)
    }
    // A question sent back to review by user reports (needs_review) keeps that
    // status at re-seed while its file is unchanged: it goes back to published
    // only with a new `version` (the fix after review) or an explicit YAML status
    // other than published.
    const existing = new Map(
      (await tx.question.findMany({ where: { certificationId: certification.id }, select: { id: true, status: true, version: true } })).map((q) => [q.id, q]),
    );
    for (const q of bank.questions) {
      const before = existing.get(q.id);
      const keepNeedsReview = before?.status === "needs_review" && q.status === "published" && q.version <= before.version;
      const data = {
        objectiveId: objectiveIds.get(q.objective)!,
        type: q.type,
        difficulty: q.difficulty,
        stem: q.stem,
        exhibits: q.exhibits as Prisma.InputJsonValue,
        body: q.body as Prisma.InputJsonValue,
        answer: q.answer as Prisma.InputJsonValue,
        explanation: q.explanation as Prisma.InputJsonValue,
        references: q.references as Prisma.InputJsonValue,
        caseStudyId: q.caseStudy ?? null,
        seriesId: q.series ?? null,
        seriesOrder: q.seriesOrder ?? null,
        shuffle: q.shuffle,
        status: keepNeedsReview ? ("needs_review" as const) : q.status,
        version: q.version,
        blueprintVersion: version,
      };
      await tx.question.upsert({ where: { id: q.id }, create: { id: q.id, certificationId: certification.id, ...data }, update: data }); // NOSONAR: sequential upserts in one interactive transaction (single connection; FK order)
    }
    const keep = bank.questions.map((q) => q.id);
    const retired = await tx.question.updateMany({
      where: { certificationId: certification.id, id: { notIn: keep }, status: { not: "retired" } },
      data: { status: "retired" },
    });
    // Case studies and series removed from the repository are retired too.
    await tx.caseStudy.updateMany({
      where: { certificationId: certification.id, id: { notIn: bank.caseStudies.map((c) => c.id) }, status: { not: "retired" } },
      data: { status: "retired" },
    });
    await tx.questionSeries.updateMany({
      where: { certificationId: certification.id, id: { notIn: bank.series.map((x) => x.id) }, status: { not: "retired" } },
      data: { status: "retired" },
    });
    return { questions: bank.questions.length, caseStudies: bank.caseStudies.length, series: bank.series.length, retired: retired.count };
  }, { timeout: 120_000 });
}

export interface CourseSeedReport {
  modules: number;
  chapters: number;
  sections: number;
  /** Chapters and sections created or whose content changed. */
  changed: { chapters: number; sections: number };
  /** Removed from the files, hence deleted, with the reading progress on them (`progress`: sections read, all readers). */
  removed: { modules: number; chapters: number; sections: number; progress: number };
  /** Chapters whose status, set in the back-office, differs from course.yaml (kept). */
  statusKept: number;
}

/** No course: a certification whose course/ folder is gone. */
const NO_COURSE: Course = { dir: "", modules: [], chapters: [] };

const hashOf = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

/**
 * Loads a certification's course (modules, chapters, sections). Idempotent: the
 * repository is the source of truth. A chapter or a section keeps its id while
 * its code stays the same, so the reading progress on it is kept; one removed
 * from the files is deleted, with that progress. `contentUpdatedAt` only moves
 * when the content hash changes. A chapter's status comes from course.yaml
 * when the file changes it, else stays as set in the back-office (lot D).
 * Run after seedReferential (it needs the
 * blueprint's objectives). With `null` (no course/ folder), the certification's
 * course is deleted.
 */
export async function seedCourse(db: PrismaClient, content: CertificationContent, loaded: Course | null): Promise<CourseSeedReport> {
  // Without course/ folder, whatever was loaded before is deleted: the repository is the source of truth.
  const course = loaded ?? NO_COURSE;
  const code = content.blueprint.certification.code;
  const version = content.blueprint.blueprint.version;
  return db.$transaction(async (tx) => {
    const certification = await tx.certification.findUniqueOrThrow({ where: { code } });
    const blueprint = await tx.blueprint.findUniqueOrThrow({
      where: { certificationId_version: { certificationId: certification.id, version } },
      include: { domains: { include: { objectives: true } } },
    });
    const objectiveIds = new Map(blueprint.domains.flatMap((d) => d.objectives.map((o) => [o.code, o.id] as const)));
    const certificationId = certification.id;
    const changed = { chapters: 0, sections: 0 };
    let statusKept = 0;

    const moduleIds = new Map<string, string>();
    for (const [i, m] of course.modules.entries()) {
      const data = { order: i + 1, title: m.title };
      const row = await tx.courseModule.upsert({ // NOSONAR: sequential upserts in one interactive transaction (single connection; FK order)
        where: { certificationId_code: { certificationId, code: m.code } },
        create: { certificationId, code: m.code, ...data },
        update: data,
      });
      moduleIds.set(m.code, row.id);
    }

    const chapters = new Map(
      (await tx.courseChapter.findMany({ where: { certificationId }, select: { id: true, code: true, contentHash: true, status: true, fileStatus: true } })).map((c) => [c.code, c]),
    );
    for (const [i, c] of course.chapters.entries()) {
      // What the reader reads: not its status, its module nor whether it is free.
      const own = { title: c.title, summary: c.summary, minutes: c.minutes, references: c.references };
      const contentHash = hashOf(own);
      const before = chapters.get(c.id);
      const edited = before?.contentHash !== contentHash;
      if (edited) changed.chapters += 1;
      // The file's status applies when the file changes it; otherwise the status set in the back-office stays.
      const status = before && before.fileStatus === c.status ? before.status : c.status;
      if (status !== c.status) statusKept += 1;
      const data = { moduleId: moduleIds.get(c.module)!, order: i + 1, status, fileStatus: c.status, free: c.free, contentHash, ...own, ...(edited && { contentUpdatedAt: new Date() }) };
      const chapter = await tx.courseChapter.upsert({ // NOSONAR: sequential upserts in one interactive transaction (single connection; FK order)
        where: { certificationId_code: { certificationId, code: c.id } },
        create: { certificationId, code: c.id, ...data },
        update: data,
      });

      const sections = new Map(
        (await tx.courseSection.findMany({ where: { chapterId: chapter.id }, select: { code: true, contentHash: true } })).map((s) => [s.code, s.contentHash]), // NOSONAR: per chapter, in the same transaction
      );
      for (const [j, s] of c.sections.entries()) {
        const sectionHash = hashOf({ title: s.title, body: s.body, objectives: s.objectives });
        const sectionEdited = sections.get(s.id) !== sectionHash;
        if (sectionEdited) changed.sections += 1;
        const objectives = s.objectives.map((o) => ({ id: objectiveIds.get(o)! }));
        const values = { order: j + 1, title: s.title, body: s.body, contentHash: sectionHash, ...(sectionEdited && { contentUpdatedAt: new Date() }) };
        await tx.courseSection.upsert({ // NOSONAR: sequential upserts in one interactive transaction (single connection; FK order)
          where: { chapterId_code: { chapterId: chapter.id, code: s.id } },
          create: { chapterId: chapter.id, code: s.id, ...values, objectives: { connect: objectives } },
          update: { ...values, objectives: { set: objectives } },
        });
      }
    }

    // What the files no longer have is deleted; progress on it goes by cascade.
    const keptChapters = course.chapters.map((c) => c.id);
    const gone: Prisma.CourseSectionWhereInput = {
      chapter: { certificationId },
      OR: [
        { chapter: { code: { notIn: keptChapters } } },
        ...course.chapters.map((c) => ({ chapter: { code: c.id }, code: { notIn: c.sections.map((s) => s.id) } })),
      ],
    };
    // Counted first, so that the log says how much reading progress a removal (or a renamed id) costs.
    const goneProgress = await tx.courseProgress.count({ where: { section: gone } });
    const goneSections = await tx.courseSection.deleteMany({ where: gone });
    const goneChapters = await tx.courseChapter.deleteMany({ where: { certificationId, code: { notIn: keptChapters } } });
    const goneModules = await tx.courseModule.deleteMany({ where: { certificationId, code: { notIn: course.modules.map((m) => m.code) } } });

    return {
      modules: course.modules.length,
      chapters: course.chapters.length,
      sections: course.chapters.reduce((n, c) => n + c.sections.length, 0),
      changed,
      removed: { modules: goneModules.count, chapters: goneChapters.count, sections: goneSections.count, progress: goneProgress },
      statusKept,
    };
  }, { timeout: 120_000 });
}
