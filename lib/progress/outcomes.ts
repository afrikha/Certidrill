/**
 * Real exam results reported by candidates ("I took the real exam"), with a
 * snapshot of what the readiness index said the day before. They calibrate the
 * index (admin page); they are never shown to other candidates.
 */
import "server-only";
import type { PrismaClient } from "@prisma/client";
import { certificationSettings, loadHistory } from "@/lib/exam/results";
import { compareCodeUnits } from "@/lib/sort";
import { calibrate, type Calibration } from "./calibration";
import { computeReadiness } from "./readiness";

export type OutcomeErrorCode = "invalid_date" | "future_date" | "invalid_score" | "inconsistent_score" | "not_found";

export class OutcomeError extends Error {
  constructor(readonly code: OutcomeErrorCode) {
    super(code);
    this.name = "OutcomeError";
  }
}

/** Earliest date accepted for a real exam. */
const EARLIEST = Date.UTC(2015, 0, 1);
const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" → that day at 00:00 UTC; anything else is invalid. */
function parseDay(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) throw new OutcomeError("invalid_date");
  const day = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  // Rejects 2026-02-31 and the like, which Date would roll over.
  if (day.toISOString().slice(0, 10) !== value || day.getTime() < EARLIEST) throw new OutcomeError("invalid_date");
  return day;
}

/** Latest day accepted for a real exam ("YYYY-MM-DD"): today, with one day of margin for time zones ahead of UTC. */
export function latestOutcomeDay(now: Date = new Date()): string {
  return new Date(now.getTime() + DAY_MS).toISOString().slice(0, 10);
}

export interface OutcomeInput {
  userId: string;
  certificationCode: string;
  /** Day of the real exam, "YYYY-MM-DD". */
  takenOn: string;
  passed: boolean;
  score?: number | null;
  now?: Date;
}

/**
 * Records (or replaces, for the same day) a real exam result, with the
 * readiness index computed from the mock exams finished before that day.
 */
export async function recordOutcome(db: PrismaClient, { userId, certificationCode, takenOn, passed, score = null, now = new Date() }: OutcomeInput) {
  const day = parseDay(takenOn);
  if (takenOn > latestOutcomeDay(now)) throw new OutcomeError("future_date");
  const certification = await db.certification.findUnique({ where: { code: certificationCode }, include: { blueprints: { where: { current: true } } } });
  // The current blueprint gives the score scale: without it, nothing to check a score against.
  const blueprint = certification?.blueprints[0];
  if (!certification || !blueprint) throw new OutcomeError("not_found");
  if (score !== null) {
    if (!Number.isInteger(score) || score < 0 || score > blueprint.maxScore) throw new OutcomeError("invalid_score");
    // A contradictory report would skew the calibration.
    if ((score >= blueprint.passScore) !== passed) throw new OutcomeError("inconsistent_score");
  }

  const before = (await loadHistory(db, userId, certification.id)).filter((a) => a.submittedAt < day);
  const config = before.length ? (await certificationSettings(db, before)).get(certificationCode)?.readiness : null;
  const readiness = config ? computeReadiness(before, config, day) : null;
  const data = { passed, score, readinessIndex: readiness?.index ?? null, readinessVerdict: readiness?.verdict ?? null, mockExams: before.length };
  return db.examOutcome.upsert({
    where: { userId_certificationId_takenOn: { userId, certificationId: certification.id, takenOn: day } },
    create: { userId, certificationId: certification.id, takenOn: day, ...data },
    update: data,
  });
}

/** The user's own reports, latest first. */
export async function listOutcomes(db: PrismaClient, userId: string) {
  const rows = await db.examOutcome.findMany({ where: { userId }, include: { certification: { select: { code: true } } }, orderBy: [{ takenOn: "desc" }, { createdAt: "desc" }] });
  return rows.map((o) => ({ id: o.id, certification: o.certification.code, takenOn: o.takenOn.toISOString().slice(0, 10), passed: o.passed, score: o.score }));
}

/** Deletes one of the user's own reports. */
export async function deleteOutcome(db: PrismaClient, { id, userId }: { id: string; userId: string }): Promise<void> {
  const { count } = await db.examOutcome.deleteMany({ where: { id, userId } });
  if (count === 0) throw new OutcomeError("not_found");
}

/** Per certification with at least one report: pass rate by verdict before the real exam. */
export async function getCalibration(db: PrismaClient): Promise<{ certification: string; calibration: Calibration }[]> {
  const rows = await db.examOutcome.findMany({ select: { passed: true, readinessIndex: true, readinessVerdict: true, certification: { select: { code: true } } } });
  const codes = [...new Set(rows.map((r) => r.certification.code))].sort(compareCodeUnits);
  return codes.map((certification) => ({ certification, calibration: calibrate(rows.filter((r) => r.certification.code === certification)) }));
}
