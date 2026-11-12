import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadCertification } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";
import { seedBank, seedReferential } from "@/lib/content/seed";
import { createUser } from "@/lib/users";
import { createAttempt, getAttemptView, lockSection, saveItem, startAttempt, submitAttempt } from "@/lib/exam/session";
import { deleteOutcome, getCalibration, latestOutcomeDay, listOutcomes, OutcomeError, recordOutcome } from "@/lib/progress/outcomes";
import { publishSampleBank } from "./sample-bank";

const db = new PrismaClient();
let userId: string;
const T0 = new Date("2026-11-02T09:00:00Z");
const NOW = new Date("2026-11-12T10:00:00Z");

beforeAll(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "exam_outcome","attempt_item","attempt_section","attempt","question_report","question","case_study","question_series","objective","domain","blueprint","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
  );
  const content = await loadCertification(path.resolve(__dirname, "../../content/az-104"));
  await seedReferential(db, content);
  await seedBank(db, content, await loadBank(content));
  await publishSampleBank(db);
  userId = (await createUser(db, { email: "outcome@example.com" })).id;
  // Two perfect mock exams before the real one (November 2 and 3), one after it (November 10).
  for (const [seed, day] of [["o-1", 0], ["o-2", 1], ["o-3", 8]] as const) await play(seed, new Date(T0.getTime() + day * 86_400_000)); // NOSONAR: attempts are created one after the other (one in progress at a time)
});
afterAll(() => db.$disconnect());

/** Plays and submits a perfect attempt. */
async function play(seed: string, start: Date) {
  const { attemptId } = await createAttempt(db, { userId, certificationCode: "az-104", locale: "en", now: start, seed });
  await startAttempt(db, { attemptId, userId, now: start });
  const view = await getAttemptView(db, { attemptId, userId, now: start });
  const keys = new Map((await db.question.findMany()).map((q) => [q.id, q.answer]));
  for (const section of view.sections) {
    for (const item of view.items.filter((i) => i.sectionId === section.id)) {
      await saveItem(db, { attemptId, itemId: item.id, userId, response: keys.get(item.question.id), now: start }); // NOSONAR: answers are saved in order, as the client does
    }
    if (section.id !== view.sections.at(-1)!.id) await lockSection(db, { attemptId, sectionId: section.id, userId, now: start }); // NOSONAR: sections are locked in order
  }
  await submitAttempt(db, { attemptId, userId, now: new Date(start.getTime() + 60 * 60_000) });
}

const code = (p: Promise<unknown>) => p.then(() => "ok", (e: unknown) => (e instanceof OutcomeError ? e.code : String(e)));

describe("real exam outcomes", () => {
  it("records the result with the readiness index of the day before", async () => {
    const o = await recordOutcome(db, { userId, certificationCode: "az-104", takenOn: "2026-11-05", passed: true, score: 812, now: NOW });
    // Only the two mock exams finished before November 5 count.
    expect(o).toMatchObject({ passed: true, score: 812, mockExams: 2, readinessVerdict: "almost" });
    expect(o.readinessIndex).toBeGreaterThan(0);
    expect(o.takenOn.toISOString()).toBe("2026-11-05T00:00:00.000Z");
  });

  it("replaces the report of the same day, and keeps the others", async () => {
    await recordOutcome(db, { userId, certificationCode: "az-104", takenOn: "2026-11-05", passed: false, now: NOW });
    const before = await recordOutcome(db, { userId, certificationCode: "az-104", takenOn: "2026-11-01", passed: false, now: NOW });
    expect(before).toMatchObject({ mockExams: 0, readinessIndex: null, readinessVerdict: null, score: null });
    expect(await listOutcomes(db, userId)).toEqual([
      { id: expect.any(String), certification: "az-104", takenOn: "2026-11-05", passed: false, score: null },
      { id: before.id, certification: "az-104", takenOn: "2026-11-01", passed: false, score: null },
    ]);
  });

  it("rejects invalid dates and scores, future dates and unknown certifications", async () => {
    const input = { userId, certificationCode: "az-104", passed: true, now: NOW };
    expect(await code(recordOutcome(db, { ...input, takenOn: "05/11/2026" }))).toBe("invalid_date");
    expect(await code(recordOutcome(db, { ...input, takenOn: "2026-02-31" }))).toBe("invalid_date");
    expect(await code(recordOutcome(db, { ...input, takenOn: "2014-12-31" }))).toBe("invalid_date");
    expect(latestOutcomeDay(NOW)).toBe("2026-11-13");
    expect(await code(recordOutcome(db, { ...input, takenOn: "2026-11-14" }))).toBe("future_date");
    expect(await code(recordOutcome(db, { ...input, takenOn: "2026-11-13", score: 1001 }))).toBe("invalid_score");
    expect(await code(recordOutcome(db, { ...input, takenOn: "2026-11-13", score: -1 }))).toBe("invalid_score");
    expect(await code(recordOutcome(db, { ...input, takenOn: "2026-11-13", score: Number.NaN }))).toBe("invalid_score");
    expect(await code(recordOutcome(db, { ...input, takenOn: "2026-11-13", certificationCode: "nope" }))).toBe("not_found");
    // Tomorrow (time zones ahead of UTC) is still accepted.
    expect(await code(recordOutcome(db, { ...input, takenOn: "2026-11-13", score: 1000 }))).toBe("ok");
  });

  it("lets a user delete only their own reports", async () => {
    const other = await createUser(db, { email: "other-outcome@example.com" });
    const [mine] = await listOutcomes(db, userId);
    expect(await code(deleteOutcome(db, { id: mine!.id, userId: other.id }))).toBe("not_found");
    await deleteOutcome(db, { id: mine!.id, userId });
    expect((await listOutcomes(db, userId)).map((o) => o.id)).not.toContain(mine!.id);
    expect(await code(deleteOutcome(db, { id: mine!.id, userId }))).toBe("not_found");
  });

  it("calibrates the index by verdict, and deleting the user deletes their reports", async () => {
    const [cal] = await getCalibration(db);
    expect(cal!.certification).toBe("az-104");
    expect(cal!.calibration.reports).toBe((await listOutcomes(db, userId)).length);
    expect(cal!.calibration.bands.find((b) => b.band === "none")).toMatchObject({ reports: 1, passed: 0 });
    await db.user.delete({ where: { id: userId } });
    expect(await getCalibration(db)).toEqual([]);
  });
});
