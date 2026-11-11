import type { ContentStatus, PrismaClient } from "@prisma/client";
import type { BlueprintStructure, QuestionTypeCode } from "@/lib/content/schema";
import type { AssemblyBank, AssemblyBlueprint, AssemblyHistory, CandidateQuestion } from "./assembler";

/**
 * Statuses that may enter an exam. Only `published` in production (spec §7);
 * EXAM_INCLUDE_UNPUBLISHED=true also admits draft and reviewed questions, to
 * try the engine locally before the bank has been reviewed.
 */
export function examStatuses(): ContentStatus[] {
  return process.env.EXAM_INCLUDE_UNPUBLISHED === "true" ? ["published", "reviewed", "draft", "needs_review"] : ["published"];
}

type Row = { id: string; type: QuestionTypeCode; difficulty: number; objective: { code: string; domain: { code: string } } };

function candidate(q: Row): CandidateQuestion {
  return { id: q.id, type: q.type, difficulty: q.difficulty as 1 | 2 | 3, objective: q.objective.code, domain: q.objective.domain.code };
}

/** Loads the current blueprint of a certification in the shape the assembler expects. */
export async function loadAssemblyBlueprint(db: PrismaClient, certificationId: string) {
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

export async function loadAssemblyBank(db: PrismaClient, certificationId: string): Promise<AssemblyBank> {
  const status = { in: examStatuses() };
  const select = { id: true, type: true, difficulty: true, caseStudyId: true, seriesId: true, seriesOrder: true, objective: { select: { code: true, domain: { select: { code: true } } } } } as const;
  const rows = await db.question.findMany({ where: { certificationId, status }, select, orderBy: { id: "asc" } });
  const caseStudies = await db.caseStudy.findMany({ where: { certificationId, status }, select: { id: true }, orderBy: { id: "asc" } });
  const series = await db.questionSeries.findMany({ where: { certificationId, status }, select: { id: true }, orderBy: { id: "asc" } });

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
