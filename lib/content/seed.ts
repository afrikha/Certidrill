import type { PrismaClient } from "@prisma/client";
import type { CertificationContent } from "./loader";

export interface SeedReport {
  certification: string;
  blueprintVersion: string;
  domains: number;
  objectives: number;
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
      const domain = await tx.domain.upsert({
        where: { blueprintId_code: { blueprintId: blueprint.id, code: d.code } },
        create: { blueprintId: blueprint.id, code: d.code, order: d.order, title: d.title, weightMin: d.weight.min, weightMax: d.weight.max },
        update: { order: d.order, title: d.title, weightMin: d.weight.min, weightMax: d.weight.max },
      });
      let order = 0;
      for (const group of objectives[d.code] ?? []) {
        for (const o of group.objectives) {
          order += 1;
          const values = { order, group: group.group, title: { en: o.en, fr: o.fr }, learnUrl: o.learnUrl ?? null };
          await tx.objective.upsert({
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
