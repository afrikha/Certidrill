/**
 * Server-side grading of an exercise response, with the real kubectl for the
 * mode `object` (lib/exercises/kubectl.ts).
 */
import "server-only";
import { logError } from "@/lib/log";
import { gradeExercise, type ExerciseQuestion, type Grading } from "./grade";
import { KubectlUnavailableError, runObjectCommand } from "./kubectl";

/**
 * Grades a response. Throws ExerciseBusyError when kubectl stays busy (the
 * caller asks the candidate to retry). Without kubectl (a deployment fault),
 * logs the fault and grades the command as failed, saying why.
 */
export async function gradeOnServer(q: ExerciseQuestion, response: unknown): Promise<Grading> {
  return gradeExercise(q, response, async (command, body) => {
    try {
      return await runObjectCommand(command, body);
    } catch (e) {
      if (!(e instanceof KubectlUnavailableError)) throw e;
      logError("exercise.kubectl_unavailable", e);
      return { ok: false, error: "the command could not be checked (kubectl is not available on the server)" };
    }
  });
}
