/**
 * Activation of a certification and publication by batch, in the back-office.
 * The files stay the source of the content; these changes live in the
 * database and a re-seed keeps them while the file does not change the same
 * value (see `bankStatusAfterSeed` and `fileActive` in seed.ts). Every change
 * is recorded in the audit log, in the same transaction. For administrators
 * only: the pages and the actions check the role, these functions do not.
 */
import type { ContentStatus, Prisma, PrismaClient, QuestionType } from "@prisma/client";
import { audit } from "@/lib/audit";
import { assembleExam } from "@/lib/exam/assembler";
import { loadAssemblyBank, loadAssemblyBlueprint } from "@/lib/exam/bank-query";
import type { BatchStatus } from "./batch-status";


/** Seeds of the trial exams: a few draws, as candidates would get them. */
const TRIAL_SEEDS = ["publish-check-1", "publish-check-2", "publish-check-3", "publish-check-4", "publish-check-5"];

export interface ExamCheck {
  /** true when every trial exam is complete. */
  ok: boolean;
  /** Questions in the bank that may enter an exam. */
  available: number;
  /** The largest number of questions missing from a trial exam. */
  shortfall: number;
}

/**
 * Whether the questions that may enter an exam (published in production) are
 * enough to build complete exams: a few trial exams are assembled, as for a
 * candidate who has seen nothing yet.
 */
export async function checkExamBank(db: PrismaClient, certificationId: string): Promise<ExamCheck> {
  const current = await db.blueprint.findFirst({ where: { certificationId, current: true }, select: { id: true } });
  if (!current) return { ok: false, available: 0, shortfall: 0 };
  const [{ blueprint }, bank] = await Promise.all([loadAssemblyBlueprint(db, certificationId), loadAssemblyBank(db, certificationId)]);
  const available = bank.questions.length + [...bank.caseStudies, ...bank.series].reduce((n, g) => n + g.questions.length, 0);
  const history = { seenAt: new Map<string, number>(), missed: new Set<string>() };
  let shortfall = 0;
  let empty = false;
  for (const seed of TRIAL_SEEDS) {
    const exam = assembleExam({ blueprint, bank, history, seed });
    shortfall = Math.max(shortfall, exam.shortfall);
    if (exam.sections.every((s) => s.questionIds.length === 0)) empty = true;
  }
  return { ok: !empty && shortfall === 0, available, shortfall };
}

export interface CertificationRow {
  code: string;
  title: string;
  active: boolean;
  /** The value of blueprint.yaml (a re-seed keeps `active` while it stays the same). */
  fileActive: boolean;
  questions: Partial<Record<ContentStatus, number>>;
  chapters: { published: number; total: number };
  exam: ExamCheck;
}

/** Every certification with its question and chapter counts by status, and whether its bank builds complete exams. */
export async function certificationRows(db: PrismaClient): Promise<CertificationRow[]> {
  const [certifications, questions, chapters] = await Promise.all([
    db.certification.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, title: true, active: true, fileActive: true } }),
    db.question.groupBy({ by: ["certificationId", "status"], _count: { _all: true } }),
    db.courseChapter.groupBy({ by: ["certificationId", "status"], _count: { _all: true } }),
  ]);
  return Promise.all(
    certifications.map(async (c) => {
      const own = questions.filter((q) => q.certificationId === c.id);
      const ownChapters = chapters.filter((x) => x.certificationId === c.id);
      return {
        code: c.code,
        title: c.title,
        active: c.active,
        fileActive: c.fileActive,
        questions: Object.fromEntries(own.map((q) => [q.status, q._count._all])),
        chapters: {
          published: ownChapters.filter((x) => x.status === "published").reduce((n, x) => n + x._count._all, 0),
          total: ownChapters.reduce((n, x) => n + x._count._all, 0),
        },
        exam: await checkExamBank(db, c.id),
      };
    }),
  );
}

export class PublishError extends Error {
  constructor(readonly code: "not_found" | "incomplete_bank") {
    super(code);
  }
}

/**
 * Activates or deactivates a certification. An activation is refused while
 * its bank cannot build complete exams (published questions in production):
 * otherwise visitors would see a certification whose exam cannot start.
 * False when nothing changed.
 */
export async function setCertificationActive(db: PrismaClient, actorId: string, code: string, active: boolean): Promise<boolean> {
  const certification = await db.certification.findUnique({ where: { code }, select: { id: true, active: true } });
  if (!certification) throw new PublishError("not_found");
  if (certification.active === active) return false;
  if (active && !(await checkExamBank(db, certification.id)).ok) throw new PublishError("incomplete_bank");
  return db.$transaction(async (tx) => {
    // Compare and set: of two submissions at the same time, one changes the value (and is recorded), the other nothing.
    const { count } = await tx.certification.updateMany({ where: { id: certification.id, active: !active }, data: { active } });
    if (count === 0) return false;
    await audit(tx, { actorId, action: "certification.active", details: { certification: code, active } });
    return true;
  });
}

export interface QuestionBatch {
  certification: string;
  /** The filters of the questions page; undefined: every value. */
  type?: QuestionType;
  status?: ContentStatus;
  domain?: string;
  to: BatchStatus;
}

/**
 * Statuses a batch never changes: retired (the file was removed) and
 * needs_review (reported by users as wrong: it comes back only with a new
 * `version` of its file, the fix after review, see bankStatusAfterSeed).
 */
export const OUT_OF_BATCH: readonly ContentStatus[] = ["retired", "needs_review"];

/** The questions a batch applies to: the filters of the questions page, never retired or reported ones. */
export function batchWhere(certificationId: string, b: Omit<QuestionBatch, "certification" | "to">): Prisma.QuestionWhereInput {
  return {
    certificationId,
    ...(b.type && { type: b.type }),
    status: b.status && OUT_OF_BATCH.includes(b.status) ? { in: [] } : { ...(b.status ? { equals: b.status } : {}), notIn: [...OUT_OF_BATCH] },
    ...(b.domain && { objective: { domain: { code: b.domain, blueprint: { current: true } } } }),
  };
}

/**
 * The case studies and series of the changed questions whose every question
 * (retired ones aside) now has status `to`. A group partly changed keeps its
 * status: otherwise its other questions would leave the exams, or an exam
 * would draw it incomplete.
 */
async function groupsAllAt(
  tx: Prisma.TransactionClient,
  changed: readonly { caseStudyId: string | null; seriesId: string | null }[],
  to: ContentStatus,
): Promise<{ caseStudies: string[]; series: string[] }> {
  const caseStudies = [...new Set(changed.flatMap((q) => (q.caseStudyId ? [q.caseStudyId] : [])))];
  const series = [...new Set(changed.flatMap((q) => (q.seriesId ? [q.seriesId] : [])))];
  if (caseStudies.length === 0 && series.length === 0) return { caseStudies, series };
  const others = await tx.question.findMany({
    where: { OR: [{ caseStudyId: { in: caseStudies } }, { seriesId: { in: series } }], status: { notIn: [to, "retired"] } },
    select: { caseStudyId: true, seriesId: true },
  });
  const mixed = new Set(others.flatMap((q) => [q.caseStudyId, q.seriesId]).filter((id): id is string => id !== null));
  return { caseStudies: caseStudies.filter((id) => !mixed.has(id)), series: series.filter((id) => !mixed.has(id)) };
}

/**
 * Sets the status of every question the filters select, and of the case
 * studies and series they belong to when all their questions now have that
 * status (an exam only draws a case study or a series whose own status
 * allows it). One entry in the audit log for the
 * batch, with the ids changed. Returns the number of questions changed.
 */
export async function setQuestionStatuses(db: PrismaClient, actorId: string, batch: QuestionBatch): Promise<number> {
  const certification = await db.certification.findUnique({ where: { code: batch.certification }, select: { id: true } });
  if (!certification) throw new PublishError("not_found");
  return db.$transaction(
    async (tx) => {
      const where = { AND: [batchWhere(certification.id, batch), { status: { not: batch.to } }] };
      const rows = await tx.question.findMany({ where, select: { id: true, caseStudyId: true, seriesId: true }, orderBy: { id: "asc" } });
      if (rows.length === 0) return 0;
      const ids = rows.map((q) => q.id);
      // Only rows still as read: a batch at the same time does not count them twice.
      const { count } = await tx.question.updateMany({ where: { id: { in: ids }, status: { not: batch.to }, NOT: { status: { in: [...OUT_OF_BATCH] } } }, data: { status: batch.to } });
      const { caseStudies, series } = await groupsAllAt(tx, rows, batch.to);
      const groups = { status: { notIn: [batch.to, "retired"] as ContentStatus[] } };
      if (caseStudies.length > 0) await tx.caseStudy.updateMany({ where: { id: { in: caseStudies }, ...groups }, data: { status: batch.to } });
      if (series.length > 0) await tx.questionSeries.updateMany({ where: { id: { in: series }, ...groups }, data: { status: batch.to } });
      await audit(tx, {
        actorId,
        action: "question.status",
        details: {
          certification: batch.certification,
          filters: { type: batch.type ?? null, status: batch.status ?? null, domain: batch.domain ?? null },
          to: batch.to,
          count,
          ids,
        },
      });
      return count;
    },
    { timeout: 30_000 },
  );
}

/**
 * Sets the status of every chapter of a certification's course (only those
 * with `from` when given; never retired ones). One entry in the audit log.
 * Returns the number of chapters changed.
 */
export async function setCourseStatuses(db: PrismaClient, actorId: string, input: { certification: string; to: BatchStatus; from?: ContentStatus }): Promise<number> {
  const certification = await db.certification.findUnique({ where: { code: input.certification }, select: { id: true } });
  if (!certification) throw new PublishError("not_found");
  return db.$transaction(async (tx) => {
    const status = { notIn: [input.to, "retired"] as ContentStatus[], ...(input.from && { equals: input.from }) };
    const chapters = await tx.courseChapter.findMany({ where: { certificationId: certification.id, status }, select: { code: true }, orderBy: { code: "asc" } });
    if (chapters.length === 0) return 0;
    const { count } = await tx.courseChapter.updateMany({ where: { certificationId: certification.id, status }, data: { status: input.to } });
    await audit(tx, {
      actorId,
      action: "course.status",
      details: { certification: input.certification, chapters: chapters.map((c) => c.code), from: input.from ?? null, to: input.to, count },
    });
    return count;
  });
}
