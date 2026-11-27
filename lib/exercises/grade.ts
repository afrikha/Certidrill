/**
 * Grading of the practical exercises (`command`, `manifest`): the result of
 * each check, computed once on the server and stored with the response
 * (AttemptItem.grading, QuizAttempt.results). Scoring then counts the checks
 * passed (lib/exam/scoring.ts), without running anything.
 *
 * - `command` in mode `object`: run with kubectl (lib/exercises/kubectl.ts),
 *   the checks run on the printed objects;
 * - `command` in mode `invocation`: the checks run on the parsed command;
 * - `manifest`: the checks run on the parsed YAML documents.
 *
 * A command or a manifest that cannot be read passes no check; the reason is
 * kept (`error`) and shown in the correction.
 */
import { z } from "zod";
import { CommandError, checkDocs, checkInvocation, parseCommand, parseDocs, type Check, type CheckResult } from "./engine";

/** kubectl stayed busy longer than the queue wait (spec §3.5): the candidate retries. */
export class ExerciseBusyError extends Error {
  constructor() {
    super("too many exercises are being checked: retry in a moment");
    this.name = "ExerciseBusyError";
  }
}

export const exerciseTypes = ["command", "manifest"] as const;
export type ExerciseType = (typeof exerciseTypes)[number];
export const isExerciseType = (type: string): type is ExerciseType => (exerciseTypes as readonly string[]).includes(type);

export const gradingSchema = z.object({
  results: z.array(z.object({ id: z.string(), passed: z.boolean() })),
  error: z.string().max(400).optional(),
});
export type Grading = z.infer<typeof gradingSchema>;

/** The largest manifest accepted (spec §3.5). */
export const MAX_MANIFEST_BYTES = 50_000;

interface CommandQuestion {
  type: "command";
  body: { mode: "object" | "invocation"; tools: string[]; namespace: string; files: { name: string; content: string }[] };
  answer: { checks: Check[] };
}
interface ManifestQuestion {
  type: "manifest";
  body: unknown;
  answer: { checks: Check[] };
}
export type ExerciseQuestion = CommandQuestion | ManifestQuestion;

const failAll = (checks: Check[], error: string): Grading => ({ results: checks.map((c) => ({ id: c.id, passed: false })), error: error.slice(0, 400) });
const graded = (results: CheckResult[]): Grading => ({ results });

/** The text the candidate submitted (null when absent or not a string). */
function submitted(type: ExerciseType, response: unknown): string | null {
  if (!response || typeof response !== "object") return null;
  const v = (response as Record<string, unknown>)[type === "command" ? "command" : "manifest"];
  return typeof v === "string" && v.trim() ? v : null;
}

/** Grading without running anything: manifests and invocations. Null for mode `object` (kubectl is needed). */
export function gradeWithoutKubectl(q: ExerciseQuestion, response: unknown): Grading | null {
  const checks = q.answer.checks;
  const text = submitted(q.type, response);
  if (text === null) return failAll(checks, "no answer");
  if (q.type === "manifest") {
    if (Buffer.byteLength(text) > MAX_MANIFEST_BYTES) return failAll(checks, `the manifest is larger than ${MAX_MANIFEST_BYTES / 1000} KB`);
    try {
      return graded(checkDocs(checks, parseDocs(text)));
    } catch (e) {
      return failAll(checks, `YAML: ${(e as Error).message}`);
    }
  }
  if (q.body.mode === "object") return null;
  try {
    return graded(checkInvocation(checks, parseCommand(text, q.body.tools)));
  } catch (e) {
    return failAll(checks, e instanceof CommandError ? e.message : "the command could not be read");
  }
}

/**
 * Grades a response. Mode `object` runs kubectl through `runObject` (injected:
 * lib/exercises/kubectl.ts on the server), which may throw ExerciseBusyError.
 */
export async function gradeExercise(
  q: ExerciseQuestion,
  response: unknown,
  runObject: (command: string, body: CommandQuestion["body"]) => Promise<{ ok: true; docs: Record<string, unknown>[] } | { ok: false; error: string }>,
): Promise<Grading> {
  const quick = gradeWithoutKubectl(q, response);
  if (quick) return quick;
  const cq = q as CommandQuestion;
  const text = submitted("command", response)!;
  // Parse first: a refused command never reaches kubectl.
  try {
    parseCommand(text, cq.body.tools);
  } catch (e) {
    return failAll(q.answer.checks, e instanceof CommandError ? e.message : "the command could not be read");
  }
  const run = await runObject(text, cq.body);
  if (!run.ok) return failAll(q.answer.checks, run.error);
  return graded(checkDocs(q.answer.checks, run.docs));
}

/** Reads a stored grading (null when absent or unreadable). */
export function readGrading(stored: unknown): Grading | null {
  const parsed = gradingSchema.safeParse(stored);
  return parsed.success ? parsed.data : null;
}

/** Number of checks passed, by the ids of the question's checks (a stale grading counts only the checks still there). */
export function checksPassed(checks: { id: string }[], grading: Grading | null): number {
  if (!grading) return 0;
  const passed = new Set(grading.results.filter((r) => r.passed).map((r) => r.id));
  return checks.filter((c) => passed.has(c.id)).length;
}
