import type { Prisma, PrismaClient } from "@prisma/client";
import type { CertificationContent } from "./loader";
import type { QuestionBank } from "./bank";

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
