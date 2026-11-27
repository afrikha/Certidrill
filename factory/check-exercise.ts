/**
 * Checks the practical exercises (types `command` and `manifest`) of a
 * certification: content/<cert>/questions/** and content/<cert>/quizzes/*.
 *
 *   npx tsx factory/check-exercise.ts <cert> [file-or-id-substring ...]
 *
 * For each exercise: schema, every solution variant passes every check, every
 * negative fails at least one check, commands parse with the allowed tools,
 * object-mode outputs agree with their command (name, namespace, image,
 * replicas), manifests use apiVersion/kind pairs served by Kubernetes v1.37.
 * Needs the local schema patch factory/k8s-practice-local.diff (types
 * `command` and `manifest` in lib/).
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { questionFileSchema } from "../lib/questions/schema";
import { CommandError, checkDocs, checkInvocation, parseCommand, parseDocs, selectDoc, type Check } from "./exercise";

const ROOT = path.resolve("content");

/** apiVersion → kinds served by a Kubernetes v1.37 cluster (plus Gateway API v1). */
const SERVED: Record<string, string[]> = {
  v1: ["Pod", "Service", "ConfigMap", "Secret", "ServiceAccount", "Namespace", "PersistentVolume", "PersistentVolumeClaim", "ResourceQuota", "LimitRange", "Node", "Endpoints", "Event", "ReplicationController", "PodTemplate", "Binding"],
  "apps/v1": ["Deployment", "StatefulSet", "DaemonSet", "ReplicaSet", "ControllerRevision"],
  "batch/v1": ["Job", "CronJob"],
  "networking.k8s.io/v1": ["Ingress", "IngressClass", "NetworkPolicy", "IPAddress", "ServiceCIDR"],
  "rbac.authorization.k8s.io/v1": ["Role", "RoleBinding", "ClusterRole", "ClusterRoleBinding"],
  "storage.k8s.io/v1": ["StorageClass", "VolumeAttachment", "CSIDriver", "CSINode", "CSIStorageCapacity", "VolumeAttributesClass"],
  "autoscaling/v2": ["HorizontalPodAutoscaler"],
  "autoscaling/v1": ["HorizontalPodAutoscaler"],
  "policy/v1": ["PodDisruptionBudget", "Eviction"],
  "scheduling.k8s.io/v1": ["PriorityClass"],
  "apiextensions.k8s.io/v1": ["CustomResourceDefinition"],
  "admissionregistration.k8s.io/v1": ["ValidatingWebhookConfiguration", "MutatingWebhookConfiguration", "ValidatingAdmissionPolicy", "ValidatingAdmissionPolicyBinding", "MutatingAdmissionPolicy", "MutatingAdmissionPolicyBinding"],
  "certificates.k8s.io/v1": ["CertificateSigningRequest"],
  "coordination.k8s.io/v1": ["Lease"],
  "discovery.k8s.io/v1": ["EndpointSlice"],
  "node.k8s.io/v1": ["RuntimeClass"],
  "flowcontrol.apiserver.k8s.io/v1": ["FlowSchema", "PriorityLevelConfiguration"],
  "resource.k8s.io/v1": ["DeviceClass", "ResourceClaim", "ResourceClaimTemplate", "ResourceSlice"],
  "gateway.networking.k8s.io/v1": ["Gateway", "GatewayClass", "HTTPRoute", "GRPCRoute", "ReferenceGrant", "BackendTLSPolicy", "ListenerSet", "TLSRoute"],
  "kubeadm.k8s.io/v1beta4": ["InitConfiguration", "ClusterConfiguration", "JoinConfiguration", "ResetConfiguration", "UpgradeConfiguration"],
  "kubelet.config.k8s.io/v1beta1": ["KubeletConfiguration", "CredentialProviderConfig"],
  "apiserver.config.k8s.io/v1": ["EncryptionConfiguration", "AdmissionConfiguration", "AuthenticationConfiguration", "AuthorizationConfiguration"],
  "audit.k8s.io/v1": ["Policy"],
  "kustomize.config.k8s.io/v1beta1": ["Kustomization"],
  "kustomize.config.k8s.io/v1alpha1": ["Component"],
};
const REMOVED = new Set(["extensions/v1beta1", "apps/v1beta1", "apps/v1beta2", "batch/v1beta1", "policy/v1beta1", "networking.k8s.io/v1beta1", "rbac.authorization.k8s.io/v1beta1", "autoscaling/v2beta1", "autoscaling/v2beta2", "storage.k8s.io/v1beta1", "flowcontrol.apiserver.k8s.io/v1beta3"]);

let problems = 0;
let count = 0;
function report(file: string, msg: string) {
  problems++;
  console.log(`✖ ${file}: ${msg}`);
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true }).catch(() => []);
  return entries.filter((e) => e.isFile() && e.name.endsWith(".yaml")).map((e) => path.join(e.parentPath, e.name));
}

/** Kinds declared by CRDs in the same files (custom resources are then allowed). */
function crdKinds(docs: Record<string, unknown>[]): Set<string> {
  const kinds = new Set<string>();
  for (const d of docs) {
    if (d.kind === "CustomResourceDefinition") {
      const names = (d.spec as { names?: { kind?: string } } | undefined)?.names;
      if (names?.kind) kinds.add(names.kind);
    }
  }
  return kinds;
}

function apiProblems(docs: Record<string, unknown>[], extraKinds: Set<string>, allowRemoved = false): string[] {
  const out: string[] = [];
  for (const d of docs) {
    const api = String(d.apiVersion ?? "");
    const kind = String(d.kind ?? "");
    const name = (d.metadata as { name?: string } | undefined)?.name;
    if (!api || !kind) out.push("a document has no apiVersion or kind");
    else if (REMOVED.has(api)) {
      if (!allowRemoved) out.push(`${kind} uses removed apiVersion ${api}`);
    } else if (!(SERVED[api]?.includes(kind) || extraKinds.has(kind))) out.push(`${api} ${kind} is not served by Kubernetes v1.37 (or not declared by a CRD here)`);
    const nameless = ["Kustomization", "Component", "KubeletConfiguration", "InitConfiguration", "ClusterConfiguration", "JoinConfiguration", "ResetConfiguration", "UpgradeConfiguration", "EncryptionConfiguration", "AdmissionConfiguration", "AuthenticationConfiguration", "AuthorizationConfiguration", "Policy", "CredentialProviderConfig"];
    if (!name && !nameless.includes(kind) && !(d.metadata as { generateName?: string } | undefined)?.generateName) out.push(`${kind} has no metadata.name`);
  }
  return out;
}

function selectProblems(checks: Check[], docs: Record<string, unknown>[]): string[] {
  const out: string[] = [];
  for (const c of checks) {
    if (docs.length > 1 && !c.select) out.push(`check ${c.id}: several documents, the check needs \`select\``);
    else if (!selectDoc(docs, c.select)) out.push(`check ${c.id}: select ${JSON.stringify(c.select)} matches no document of the solution`);
  }
  return out;
}

/** Object mode: the printed objects must agree with the command (name, namespace, image, replicas). */
function consistency(command: string, docs: Record<string, unknown>[], defaultNs: string): string[] {
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
    if (["Namespace", "ClusterRole", "ClusterRoleBinding", "PriorityClass", "StorageClass", "PersistentVolume", "Node", "IngressClass", "CustomResourceDefinition"].includes(kind)) continue;
    const docNs = (d.metadata as { namespace?: string } | undefined)?.namespace;
    if (ns && docNs !== ns) out.push(`command uses -n ${ns} but ${kind} has namespace ${docNs ?? "(none)"}`);
    if (!ns && docNs && docNs !== defaultNs) out.push(`${kind} has namespace ${docNs} but the command sets none (context namespace ${defaultNs})`);
  }
  const image = typeof inv.flags.image === "string" ? inv.flags.image : null;
  if (image && !JSON.stringify(docs).includes(JSON.stringify(image))) out.push(`--image=${image} does not appear in the output`);
  const replicas = typeof inv.flags.replicas === "string" ? Number(inv.flags.replicas) : null;
  if (replicas !== null && inv.verb !== "scale" && !docs.some((d) => (d.spec as { replicas?: number } | undefined)?.replicas === replicas)) out.push(`--replicas=${replicas} does not appear in the output`);
  if (/(^|\s)(-o|--output)[ =]?(yaml|json)/.test(command) === false && inv.verb !== "set" && inv.verb !== "label" && inv.verb !== "annotate" && /--dry-run/.test(command)) out.push("a dry-run solution should print the object (-o yaml)");
  return out;
}

async function main() {
  const [cert, ...only] = process.argv.slice(2);
  if (!cert) throw new Error("usage: check-exercise.ts <cert> [filter ...]");
  const files = [...(await walk(path.join(ROOT, cert, "questions"))), ...(await walk(path.join(ROOT, cert, "quizzes")))];
  const types: Record<string, number> = {};
  for (const file of files.sort()) {
    const rel = path.relative(process.cwd(), file);
    const raw = parse(await readFile(file, "utf8"));
    const items: unknown[] = raw && Array.isArray(raw.questions) ? raw.questions : [raw];
    for (const item of items) {
      const it = item as { type?: string; id?: string };
      if (it.type !== "command" && it.type !== "manifest") continue;
      if (only.length && !only.some((o) => rel.includes(o) || (it.id ?? "").includes(o))) continue;
      count++;
      const where = `${rel} (${it.id})`;
      const r = questionFileSchema.safeParse(item);
      if (!r.success) {
        for (const i of r.error.issues.slice(0, 5)) report(where, `${i.path.join(".")}: ${i.message}`);
        continue;
      }
      const q = r.data;
      types[`${q.type}${q.type === "command" ? `/${q.body.mode}` : ""}`] = (types[`${q.type}${q.type === "command" ? `/${q.body.mode}` : ""}`] ?? 0) + 1;
      const ids = q.answer.checks.map((c) => c.id);
      if (new Set(ids).size !== ids.length) report(where, "duplicate check ids");
      if (typeof q.stem !== "object" || q.stem.fr) report(where, "English only: no fr text");
      if (q.type === "command") {
        const allowed = q.body.tools;
        const fileDocs = q.body.files.filter((f) => /\.ya?ml$/.test(f.name)).flatMap((f) => {
          try {
            return parseDocs(f.content);
          } catch (e) {
            report(where, `file ${f.name}: ${(e as Error).message}`);
            return [];
          }
        });
        for (const [k, sol] of q.answer.solution.entries()) {
          let inv;
          try {
            inv = parseCommand(sol.command, allowed);
          } catch (e) {
            report(where, `solution ${k + 1}: ${(e as CommandError).message}`);
            continue;
          }
          if (q.body.mode === "object") {
            if (inv.tool !== "kubectl") report(where, `solution ${k + 1}: object mode is for kubectl commands`);
            if (!sol.output) {
              report(where, `solution ${k + 1}: object mode needs the output kubectl prints`);
              continue;
            }
            let docs;
            try {
              docs = parseDocs(sol.output);
            } catch (e) {
              report(where, `solution ${k + 1} output: ${(e as Error).message}`);
              continue;
            }
            for (const p of apiProblems(docs, crdKinds(fileDocs))) report(where, `solution ${k + 1} output: ${p}`);
            if (k === 0) for (const p of selectProblems(q.answer.checks, docs)) report(where, p);
            for (const p of consistency(sol.command, docs, q.body.namespace)) report(where, `solution ${k + 1}: ${p}`);
            const failed = checkDocs(q.answer.checks, docs).filter((x) => !x.passed);
            if (failed.length) report(where, `solution ${k + 1} fails ${failed.map((f) => f.id).join(", ")}`);
          } else {
            if (sol.output) report(where, `solution ${k + 1}: invocation mode has no output`);
            const failed = checkInvocation(q.answer.checks, inv).filter((x) => !x.passed);
            if (failed.length) report(where, `solution ${k + 1} (${sol.command}) fails ${failed.map((f) => f.id).join(", ")}: parsed ${JSON.stringify({ verb: inv.verb, subverb: inv.subverb, resource: inv.resource, names: inv.names, args: inv.args, flags: inv.flags })}`);
          }
        }
        for (const [k, neg] of q.answer.negatives.entries()) {
          let inv;
          try {
            inv = parseCommand(neg.command, allowed);
          } catch (e) {
            report(where, `negative ${k + 1}: must be a valid command (${(e as Error).message})`);
            continue;
          }
          let results;
          if (q.body.mode === "object") {
            if (!neg.output) {
              report(where, `negative ${k + 1}: object mode needs the output kubectl prints`);
              continue;
            }
            try {
              results = checkDocs(q.answer.checks, parseDocs(neg.output));
            } catch (e) {
              report(where, `negative ${k + 1} output: ${(e as Error).message}`);
              continue;
            }
          } else results = checkInvocation(q.answer.checks, inv);
          if (results.every((x) => x.passed)) report(where, `negative ${k + 1} (${neg.command}) passes every check`);
          if (q.answer.solution.some((s) => s.command.trim() === neg.command.trim())) report(where, `negative ${k + 1} is also a solution`);
        }
      } else {
        const ctxDocs = q.body.files.filter((f) => /\.ya?ml$/.test(f.name)).flatMap((f) => {
          try {
            return parseDocs(f.content);
          } catch (e) {
            report(where, `file ${f.name}: ${(e as Error).message}`);
            return [];
          }
        });
        if (q.body.starter.trim()) {
          try {
            parseDocs(q.body.starter);
          } catch (e) {
            report(where, `starter: ${(e as Error).message}`);
          }
        }
        for (const [k, sol] of q.answer.solution.entries()) {
          let docs;
          try {
            docs = parseDocs(sol.manifest);
          } catch (e) {
            report(where, `solution ${k + 1}: ${(e as Error).message}`);
            continue;
          }
          if (!docs.length) report(where, `solution ${k + 1}: no document`);
          for (const p of apiProblems(docs, new Set([...crdKinds(docs), ...crdKinds(ctxDocs)]))) report(where, `solution ${k + 1}: ${p}`);
          if (k === 0) for (const p of selectProblems(q.answer.checks, docs)) report(where, p);
          const failed = checkDocs(q.answer.checks, docs).filter((x) => !x.passed);
          if (failed.length) report(where, `solution ${k + 1} fails ${failed.map((f) => f.id).join(", ")}`);
        }
        for (const [k, neg] of q.answer.negatives.entries()) {
          let docs;
          try {
            docs = parseDocs(neg.manifest);
          } catch (e) {
            report(where, `negative ${k + 1}: must be valid YAML (${(e as Error).message})`);
            continue;
          }
          if (checkDocs(q.answer.checks, docs).every((x) => x.passed)) report(where, `negative ${k + 1} passes every check`);
        }
      }
    }
  }
  console.log(`${cert}: ${count} exercise(s) ${JSON.stringify(types)}, ${problems} problem(s)`);
  process.exitCode = problems ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
