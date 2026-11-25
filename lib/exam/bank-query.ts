import type { ContentStatus, Prisma, PrismaClient } from "@prisma/client";
import type { BlueprintStructure, QuestionTypeCode } from "@/lib/content/schema";
import type { AssemblyBank, AssemblyBlueprint, AssemblyHistory, CandidateQuestion } from "./assembler";
import { examBank } from "@/lib/questions/usage";

/**
 * Statuses that may enter an exam. Only `published` in production (spec §7);
 * EXAM_INCLUDE_UNPUBLISHED=true also admits draft and reviewed questions, to
 * try the engine locally before the bank has been reviewed.
 */
export function examStatuses(): ContentStatus[] {
  // Local trials may use questions not yet reviewed, never the ones users
  // reported as wrong (needs_review) or removed (retired).
  return process.env.EXAM_INCLUDE_UNPUBLISHED === "true" ? ["published", "reviewed", "draft"] : ["published"];
}

type Row = { id: string; type: QuestionTypeCode; difficulty: number; objective: { code: string; domain: { code: string } } };

function candidate(q: Row): CandidateQuestion {
  return { id: q.id, type: q.type, difficulty: q.difficulty as 1 | 2 | 3, objective: q.objective.code, domain: q.objective.domain.code };
}

/** Reads also run inside a transaction (the back-office checks a bank before committing a change). */
type ReadDb = PrismaClient | Prisma.TransactionClient;

/** Loads the current blueprint of a certification in the shape the assembler expects. */
export async function loadAssemblyBlueprint(db: ReadDb, certificationId: string) {
  const bp = await db.blueprint.findFirstOrThrow({
    where: { certificationId, current: true },
    include: { domains: { orderBy: { order: "asc" } } },
  });
  const blueprint: AssemblyBlueprint = {
    minQuestions: bp.minQuestions,
    maxQuestions: bp.maxQuestions,
    typeMix: bp.typeMix as AssemblyBlueprint["typeMix"],
    difficultyMix: bp.difficultyMix as AssemblyBlueprint["difficultyMix"],
    structure: bp.structure as BlueprintStructure,
    domains: bp.domains.map((d) => ({ code: d.code, weightMin: d.weightMin, weightMax: d.weightMax })),
  };
  return { row: bp, blueprint };
}

export async function loadAssemblyBank(db: ReadDb, certificationId: string): Promise<AssemblyBank> {
  const status = { in: examStatuses() };
  const select = { id: true, type: true, difficulty: true, caseStudyId: true, seriesId: true, seriesOrder: true, objective: { select: { code: true, domain: { select: { code: true } } } } } as const;
  const rows = await db.question.findMany({ where: examBank({ certificationId, status }), select, orderBy: { id: "asc" } });
  // A case study or a series is drawn whole or not at all: never while one of
  // its questions (retired ones aside) may not enter an exam, e.g. reported by
  // a user (needs_review) or back to draft with a new version of its file.
  const outside = await db.question.findMany({
    where: examBank({ certificationId, status: { notIn: [...examStatuses(), "retired"] }, OR: [{ caseStudyId: { not: null } }, { seriesId: { not: null } }] }),
    select: { caseStudyId: true, seriesId: true },
  });
  const incomplete = [...new Set(outside.flatMap((q) => [q.caseStudyId, q.seriesId]).filter((id): id is string => id !== null))];
  const group = { certificationId, status, id: { notIn: incomplete } };
  const caseStudies = await db.caseStudy.findMany({ where: group, select: { id: true }, orderBy: { id: "asc" } });
  const series = await db.questionSeries.findMany({ where: group, select: { id: true }, orderBy: { id: "asc" } });

  return {
    questions: rows.filter((q) => !q.caseStudyId && !q.seriesId).map(candidate),
    caseStudies: caseStudies.map((cs) => ({ id: cs.id, questions: rows.filter((q) => q.caseStudyId === cs.id).map(candidate) })),
    series: series.map((s) => ({
      id: s.id,
      questions: rows
        .filter((q) => q.seriesId === s.id)
        .sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0))
        .map(candidate),
    })),
  };
}

/** What the candidate has already seen, and what they missed the last time they saw it. */
export async function loadHistory(db: PrismaClient, userId: string, certificationId: string): Promise<AssemblyHistory> {
  const items = await db.attemptItem.findMany({
    where: { attempt: { userId, certificationId, status: { in: ["submitted", "expired"] } } },
    select: { questionId: true, pointsEarned: true, pointsMax: true, attempt: { select: { startedAt: true, createdAt: true } } },
  });
  const seenAt = new Map<string, number>();
  const missed = new Set<string>();
  const latest = new Map<string, number>();
  for (const it of items) {
    const at = (it.attempt.startedAt ?? it.attempt.createdAt).getTime();
    if ((latest.get(it.questionId) ?? -Infinity) > at) continue;
    latest.set(it.questionId, at);
    seenAt.set(it.questionId, at);
    if ((it.pointsEarned ?? 0) < (it.pointsMax ?? 0)) missed.add(it.questionId);
    else missed.delete(it.questionId);
  }
  return { seenAt, missed };
}
