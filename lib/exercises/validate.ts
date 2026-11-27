/**
 * Content checks of a practical exercise (docs/SPECS-KUBERNETES-PRATIQUE.md §6),
 * run by `content:validate` (tools/validate-questions.ts) on the bank and the
 * quizzes:
 *
 * - every solution passes every check; in mode `object`, against what the
 *   real kubectl v1.37 prints when it is installed (CI), else against the
 *   `output` written in the file;
 * - every negative fails at least one check (same rule) and is not a solution;
 * - commands parse with the tools of the exercise, a check with several
 *   documents has `select`, and `select` matches a document;
 * - the apiVersion/kind of every document is served by Kubernetes v1.37;
 * - mode `object`: the printed objects agree with the command (name,
 *   namespace, image, replicas).
 *
 * With kubectl, a written `output` that differs from what kubectl prints is a
 * mismatch: listed (a content fault to report), not a problem.
 */
import { CommandError, checkDocs, checkInvocation, parseCommand, parseDocs, selectDoc, type Check } from "./engine";
import { CLUSTER_KINDS, NAMELESS_KINDS, REMOVED_API_VERSIONS, SERVED } from "./kubernetes-api";
import { runObjectCommand, type ObjectRun } from "./kubectl";

interface File {
  name: string;
  content: string;
}
interface CommandExercise {
  id: string;
  type: "command";
  body: { mode: "object" | "invocation"; tools: string[]; namespace: string; files: File[] };
  answer: { checks: Check[]; solution: { command: string; output?: string }[]; negatives: { command: string; output?: string; why: string }[] };
}
interface ManifestExercise {
  id: string;
  type: "manifest";
  body: { starter: string; files: File[] };
  answer: { checks: Check[]; solution: { manifest: string }[]; negatives: { manifest: string; why: string }[] };
}
export type Exercise = CommandExercise | ManifestExercise;

export interface ExerciseReport {
  problems: string[];
  /** Mode object with kubectl: where the written `output` differs from what kubectl prints. */
  mismatches: string[];
}

type Docs = Record<string, unknown>[];
type Runner = (command: string, body: CommandExercise["body"]) => Promise<ObjectRun>;

/** Kinds declared by CRDs in these documents (their custom resources are then allowed). */
function crdKinds(docs: Docs): Set<string> {
  const kinds = new Set<string>();
  for (const d of docs) {
    if (d.kind !== "CustomResourceDefinition") continue;
    const kind = (d.spec as { names?: { kind?: string } } | undefined)?.names?.kind;
    if (kind) kinds.add(kind);
  }
  return kinds;
}

/** Documents whose apiVersion/kind a Kubernetes v1.37 cluster does not serve. */
export function apiProblems(docs: Docs, extraKinds: Set<string>): string[] {
  const out: string[] = [];
  for (const d of docs) {
    const api = String(d.apiVersion ?? "");
    const kind = String(d.kind ?? "");
    const meta = d.metadata as { name?: string; generateName?: string } | undefined;
    if (!api || !kind) out.push("a document has no apiVersion or kind");
    else if (REMOVED_API_VERSIONS.has(api)) out.push(`${kind} uses removed apiVersion ${api}`);
    else if (!(SERVED[api]?.includes(kind) || extraKinds.has(kind))) out.push(`${api} ${kind} is not served by Kubernetes v1.37 (or not declared by a CRD here)`);
    if (kind && !meta?.name && !meta?.generateName && !NAMELESS_KINDS.has(kind)) out.push(`${kind} has no metadata.name`);
  }
  return out;
}

function selectProblems(checks: Check[], docs: Docs): string[] {
  const out: string[] = [];
  for (const c of checks) {
    if (docs.length > 1 && !c.select) out.push(`check ${c.id}: several documents, the check needs \`select\``);
    else if (!selectDoc(docs, c.select)) out.push(`check ${c.id}: select ${JSON.stringify(c.select)} matches no document of the solution`);
  }
  return out;
}

/** Mode object: the printed objects must agree with the command (name, namespace, image, replicas). */
function consistency(command: string, docs: Docs, contextNs: string): string[] {
  const out: string[] = [];
  let inv;
  try {
    inv = parseCommand(command, ["kubectl"]);
  } catch {
    return out;
  }
  const names = docs.map((d) => (d.metadata as { name?: string } | undefined)?.name);
  if (["create", "run", "expose"].includes(inv.verb ?? "") && inv.names[0] && !names.includes(inv.names[0]) && !inv.flags.name) out.push(`output has no object named ${inv.names[0]}`);
  const ns = typeof inv.flags.namespace === "string" ? inv.flags.namespace : null;
  for (const d of docs) {
    const kind = String(d.kind);
    if (CLUSTER_KINDS.has(kind)) continue;
    const docNs = (d.metadata as { namespace?: string } | undefined)?.namespace;
    if (ns && docNs !== ns) out.push(`command uses -n ${ns} but ${kind} has namespace ${docNs ?? "(none)"}`);
    if (!ns && docNs && docNs !== contextNs) out.push(`${kind} has namespace ${docNs} but the command sets none (context namespace ${contextNs})`);
  }
  const image = typeof inv.flags.image === "string" ? inv.flags.image : null;
  if (image && !JSON.stringify(docs).includes(JSON.stringify(image))) out.push(`--image=${image} does not appear in the output`);
  const replicas = typeof inv.flags.replicas === "string" ? Number(inv.flags.replicas) : null;
  if (replicas !== null && inv.verb !== "scale" && !docs.some((d) => (d.spec as { replicas?: number } | undefined)?.replicas === replicas)) out.push(`--replicas=${replicas} does not appear in the output`);
  return out;
}

/** Paths where two values differ (at most `limit`), ignoring metadata.creationTimestamp. */
export function differences(expected: unknown, actual: unknown, limit = 6, at = ""): string[] {
  const out: string[] = [];
  const walk = (a: unknown, b: unknown, p: string) => {
    if (out.length >= limit) return;
    if (p.endsWith("metadata.creationTimestamp")) return;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) out.push(`${p || "(root)"}: ${a.length} item(s) written, kubectl prints ${b.length}`);
      for (let i = 0; i < Math.min(a.length, b.length); i++) walk(a[i], b[i], `${p}[${i}]`);
      return;
    }
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of keys) {
        const ka = k in a;
        const kb = k in b;
        const sub = p ? `${p}.${k}` : k;
        if (sub.endsWith("metadata.creationTimestamp")) continue;
        if (ka && !kb) out.push(`${sub}: written, kubectl does not print it`);
        else if (!ka && kb) out.push(`${sub}: printed by kubectl (${short((b as Record<string, unknown>)[k])}), missing from output`);
        else walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], sub);
        if (out.length >= limit) return;
      }
      return;
    }
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`${p || "(root)"}: written ${short(a)}, kubectl prints ${short(b)}`);
  };
  walk(expected, actual, at);
  return out;
}

const short = (v: unknown) => {
  const s = JSON.stringify(v) ?? String(v);
  return s.length > 60 ? `${s.slice(0, 57)}...` : s;
};

function yamlFileDocs(files: File[], problems: string[]): Docs {
  return files
    .filter((f) => /\.ya?ml$/i.test(f.name))
    .flatMap((f) => {
      try {
        return parseDocs(f.content);
      } catch (e) {
        problems.push(`file ${f.name}: ${(e as Error).message}`);
        return [];
      }
    });
}

/**
 * The documents of a command of mode object: printed by kubectl when `run` is
 * given (and the written `output` compared with them), else the written output.
 */
async function objectDocs(
  label: string,
  entry: { command: string; output?: string },
  q: CommandExercise,
  run: Runner | null,
  report: ExerciseReport,
): Promise<{ docs: Docs; error?: string } | null> {
  let written: Docs | null = null;
  if (entry.output) {
    try {
      written = parseDocs(entry.output);
    } catch (e) {
      report.problems.push(`${label} output: ${(e as Error).message}`);
    }
  } else report.problems.push(`${label}: object mode needs the output kubectl prints`);
  if (!run) return written ? { docs: written } : null;
  const r = await run(entry.command, q.body);
  if (!r.ok) {
    if (written) report.mismatches.push(`${label} (${entry.command}): kubectl v1.37 fails: ${r.error}`);
    return { docs: [], error: r.error };
  }
  if (written) {
    const diff = differences(written, r.docs);
    if (diff.length) report.mismatches.push(`${label} (${entry.command}): ${diff.join("; ")}`);
  }
  return { docs: r.docs };
}

async function commandProblems(q: CommandExercise, run: Runner | null, report: ExerciseReport) {
  const { checks } = q.answer;
  const fileDocs = yamlFileDocs(q.body.files, report.problems);
  for (const [k, sol] of q.answer.solution.entries()) {
    const label = `solution ${k + 1}`;
    let inv;
    try {
      inv = parseCommand(sol.command, q.body.tools);
    } catch (e) {
      report.problems.push(`${label}: ${(e as CommandError).message}`);
      continue;
    }
    if (q.body.mode === "invocation") {
      if (sol.output) report.problems.push(`${label}: invocation mode has no output`);
      const failed = checkInvocation(checks, inv).filter((x) => !x.passed);
      if (failed.length) report.problems.push(`${label} (${sol.command}) fails ${failed.map((f) => f.id).join(", ")}`);
      continue;
    }
    if (inv.tool !== "kubectl") report.problems.push(`${label}: object mode is for kubectl commands`);
    const got = await objectDocs(label, sol, q, run, report);
    if (!got) continue;
    if (got.error) {
      report.problems.push(`${label} (${sol.command}): kubectl v1.37 fails: ${got.error}`);
      continue;
    }
    for (const p of apiProblems(got.docs, crdKinds(fileDocs))) report.problems.push(`${label} output: ${p}`);
    if (k === 0) report.problems.push(...selectProblems(checks, got.docs));
    for (const p of consistency(sol.command, got.docs, q.body.namespace)) report.problems.push(`${label}: ${p}`);
    const failed = checkDocs(checks, got.docs).filter((x) => !x.passed);
    if (failed.length) report.problems.push(`${label} (${sol.command}) fails ${failed.map((f) => f.id).join(", ")}${run ? " with kubectl v1.37" : ""}`);
  }
  for (const [k, neg] of q.answer.negatives.entries()) {
    const label = `negative ${k + 1}`;
    let inv;
    try {
      inv = parseCommand(neg.command, q.body.tools);
    } catch (e) {
      report.problems.push(`${label}: must be a valid command (${(e as Error).message})`);
      continue;
    }
    if (q.answer.solution.some((s) => s.command.trim() === neg.command.trim())) report.problems.push(`${label} is also a solution`);
    let passesAll: boolean;
    if (q.body.mode === "object") {
      const got = await objectDocs(label, neg, q, run, report);
      if (!got) continue;
      // A command kubectl refuses scores 0: it fails every check.
      passesAll = !got.error && checkDocs(checks, got.docs).every((x) => x.passed);
    } else passesAll = checkInvocation(checks, inv).every((x) => x.passed);
    if (passesAll) report.problems.push(`${label} (${neg.command}) passes every check${run && q.body.mode === "object" ? " with kubectl v1.37" : ""}`);
  }
}

function manifestProblems(q: ManifestExercise, report: ExerciseReport) {
  const { checks } = q.answer;
  const ctxDocs = yamlFileDocs(q.body.files, report.problems);
  if (q.body.starter.trim()) {
    try {
      parseDocs(q.body.starter);
    } catch (e) {
      report.problems.push(`starter: ${(e as Error).message}`);
    }
  }
  for (const [k, sol] of q.answer.solution.entries()) {
    let docs;
    try {
      docs = parseDocs(sol.manifest);
    } catch (e) {
      report.problems.push(`solution ${k + 1}: ${(e as Error).message}`);
      continue;
    }
    if (!docs.length) report.problems.push(`solution ${k + 1}: no document`);
    for (const p of apiProblems(docs, new Set([...crdKinds(docs), ...crdKinds(ctxDocs)]))) report.problems.push(`solution ${k + 1}: ${p}`);
    if (k === 0) report.problems.push(...selectProblems(checks, docs));
    const failed = checkDocs(checks, docs).filter((x) => !x.passed);
    if (failed.length) report.problems.push(`solution ${k + 1} fails ${failed.map((f) => f.id).join(", ")}`);
  }
  for (const [k, neg] of q.answer.negatives.entries()) {
    let docs;
    try {
      docs = parseDocs(neg.manifest);
    } catch (e) {
      report.problems.push(`negative ${k + 1}: must be valid YAML (${(e as Error).message})`);
      continue;
    }
    if (checkDocs(checks, docs).every((x) => x.passed)) report.problems.push(`negative ${k + 1} passes every check`);
  }
}

/**
 * Checks one exercise (already valid against its schema). `kubectl`: run the
 * commands of mode object with the real kubectl (true when it is installed).
 */
export async function checkExercise(q: Exercise, { kubectl }: { kubectl: boolean }): Promise<ExerciseReport> {
  const report: ExerciseReport = { problems: [], mismatches: [] };
  if (q.type === "command") await commandProblems(q, kubectl ? (command, body) => runObjectCommand(command, body, { queueWaitMs: 600_000 }) : null, report);
  else manifestProblems(q, report);
  return report;
}
