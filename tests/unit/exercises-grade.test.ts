/**
 * Grading and scoring of the practical exercises (docs/SPECS-KUBERNETES-PRATIQUE.md
 * §3, §4): per check or all or nothing, a stored grading reused, the answer
 * key never in what the browser receives. Without kubectl (manifests and
 * invocations); mode `object` is tested in exercises-kubectl.test.ts.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_SCORING } from "@/lib/content/schema";
import { scoreItem } from "@/lib/exam/scoring";
import { checksPassed, gradeExercise, gradeWithoutKubectl, readGrading, type ExerciseQuestion } from "@/lib/exercises/grade";
import { presentQuestion } from "@/lib/questions/present";
import { maxPoints } from "@/lib/questions/schema";

const manifest = {
  type: "manifest" as const,
  body: { starter: "apiVersion: apps/v1\nkind: Deployment\n", files: [] },
  answer: {
    checks: [
      { id: "kind", label: { en: "A Deployment" }, path: "kind", op: "equals" as const, value: "Deployment" },
      { id: "replicas", label: { en: "3 replicas" }, path: "spec.replicas", op: "equals" as const, value: 3 },
    ],
    solution: [{ manifest: "kind: Deployment\nspec:\n  replicas: 3\n" }],
    negatives: [{ manifest: "kind: Deployment\nspec:\n  replicas: 2\n" }],
  },
};
const invocation = {
  type: "command" as const,
  body: { mode: "invocation" as const, tools: ["kubectl"], namespace: "default", files: [] },
  answer: {
    checks: [
      { id: "verb", label: { en: "rollout undo" }, path: "subverb", op: "equals" as const, value: "undo" },
      { id: "ns", label: { en: "in shop" }, path: "flags.namespace", op: "equals" as const, value: "shop" },
    ],
    solution: [{ command: "kubectl rollout undo deploy/web -n shop" }],
    negatives: [{ command: "kubectl rollout undo deploy/web" }],
  },
};

describe("gradeWithoutKubectl", () => {
  it("grades a manifest check by check, and reports a YAML error", () => {
    expect(gradeWithoutKubectl(manifest as ExerciseQuestion, { manifest: "kind: Deployment\nspec:\n  replicas: 3\n" })).toEqual({ results: [{ id: "kind", passed: true }, { id: "replicas", passed: true }] });
    expect(gradeWithoutKubectl(manifest as ExerciseQuestion, { manifest: "kind: Deployment\nspec:\n  replicas: 2\n" })!.results.map((r) => r.passed)).toEqual([true, false]);
    const bad = gradeWithoutKubectl(manifest as ExerciseQuestion, { manifest: "kind: [Deployment\n" })!;
    expect(bad.results.every((r) => !r.passed)).toBe(true);
    expect(bad.error).toMatch(/^YAML: /);
    expect(gradeWithoutKubectl(manifest as ExerciseQuestion, null)).toMatchObject({ error: "no answer" });
    expect(gradeWithoutKubectl(manifest as ExerciseQuestion, { manifest: "x".repeat(50_001) })!.error).toMatch(/larger than 50 KB/);
  });

  it("grades an invocation, refuses another tool, and leaves mode object to kubectl", () => {
    expect(gradeWithoutKubectl(invocation as ExerciseQuestion, { command: "k -n shop rollout undo deployment web" })!.results.every((r) => r.passed)).toBe(true);
    expect(gradeWithoutKubectl(invocation as ExerciseQuestion, { command: "kubectl rollout undo deploy/web" })!.results.map((r) => r.passed)).toEqual([true, false]);
    expect(gradeWithoutKubectl(invocation as ExerciseQuestion, { command: "rm -rf / ; kubectl get po" })!.error).toBeTruthy();
    const object = { ...invocation, body: { ...invocation.body, mode: "object" as const } };
    expect(gradeWithoutKubectl(object as ExerciseQuestion, { command: "kubectl create ns a" })).toBeNull();
  });

  it("never runs a command that does not parse", async () => {
    const object = { ...invocation, body: { ...invocation.body, mode: "object" as const } } as ExerciseQuestion;
    let ran = 0;
    const run = async () => {
      ran += 1;
      return { ok: true as const, docs: [{ subverb: "undo" }] };
    };
    expect((await gradeExercise(object, { command: "kubectl create ns a | sh" }, run)).error).toBeTruthy();
    expect(ran).toBe(0);
    await gradeExercise(object, { command: "kubectl create ns a" }, run);
    expect(ran).toBe(1);
    expect((await gradeExercise(object, { command: "kubectl create ns a" }, async () => ({ ok: false as const, error: "boom" }))).error).toBe("boom");
  });
});

describe("scoring an exercise", () => {
  const right = { manifest: "kind: Deployment\nspec:\n  replicas: 3\n" };
  const half = { manifest: "kind: Deployment\n" };

  it("counts the checks passed (per_check, the default) or all of them (all_or_nothing)", () => {
    expect(DEFAULT_SCORING).toMatchObject({ command: "per_check", manifest: "per_check" });
    expect(scoreItem(manifest, right)).toEqual({ earned: 2, max: 2 });
    expect(scoreItem(manifest, half)).toEqual({ earned: 1, max: 2 });
    const all = { ...DEFAULT_SCORING, manifest: "all_or_nothing" as const };
    expect(scoreItem(manifest, half, all)).toEqual({ earned: 0, max: 1 });
    expect(scoreItem(manifest, right, all)).toEqual({ earned: 1, max: 1 });
    expect(maxPoints("manifest", manifest.body, DEFAULT_SCORING, manifest.answer)).toBe(2);
  });

  it("uses the stored grading, counting only the checks still in the question", () => {
    const stored = { results: [{ id: "kind", passed: true }, { id: "replicas", passed: true }, { id: "gone", passed: true }] };
    // The response alone would score 1: the grading computed with kubectl wins.
    expect(scoreItem(manifest, half, DEFAULT_SCORING, stored)).toEqual({ earned: 2, max: 2 });
    expect(checksPassed(manifest.answer.checks, readGrading(stored))).toBe(2);
    expect(readGrading({ results: "x" })).toBeNull();
    expect(checksPassed(manifest.answer.checks, null)).toBe(0);
  });
});

describe("presenting an exercise", () => {
  it("sends the files, the starter, the prompt, never the checks nor the solutions", async () => {
    const files = [{ name: "deploy.yaml", content: "kind: Deployment\n" }];
    const q = { id: "q1", stem: { en: "Fix it", fr: "Fix it" }, exhibits: [] };
    const pm = await presentQuestion({ ...q, type: "manifest", body: { ...manifest.body, files }, answer: manifest.answer }, "fr");
    expect(pm.body).toEqual({ type: "manifest", starter: manifest.body.starter, files });
    const pc = await presentQuestion({ ...q, type: "command", body: { ...invocation.body, namespace: "shop" }, answer: invocation.answer }, "en");
    expect(pc.body).toEqual({ type: "command", mode: "invocation", tools: ["kubectl"], namespace: "shop", files: [] });
    for (const sent of [JSON.stringify(pm), JSON.stringify(pc)]) expect(sent).not.toMatch(/checks|solution|negatives|replicas: 3|rollout undo/);
  });
});
