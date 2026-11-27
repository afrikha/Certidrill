/**
 * Practical exercises for the performance-based Kubernetes exams (CKAD, CKA):
 * reference implementation of the two question types of
 * docs/SPECS-KUBERNETES-PRATIQUE.md, used by the content factory to check the
 * exercises before the application supports them.
 *
 * - `command`: the candidate types one shell command (kubectl, helm, kubeadm…).
 *   mode `object`: the command creates or changes objects; the application runs
 *   it with the real kubectl in client dry-run or --local mode and checks the
 *   printed objects. Here, each solution variant carries the `output` kubectl
 *   prints, and the checks run on that output.
 *   mode `invocation`: the command reads or operates (logs, rollout undo,
 *   kubeadm upgrade, etcdctl snapshot…); the checks run on the parsed command.
 * - `manifest`: the candidate writes YAML (one or more documents); the checks
 *   run on the parsed documents.
 *
 * Every exercise carries solution variants (all must pass) and negatives
 * (plausible wrong answers, each must fail at least one check).
 */
import { z } from "zod";
import { parseAllDocuments } from "yaml";
import { localizedSchema } from "../lib/content/schema";

// ---------------------------------------------------------------- schemas

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/);
const text = z.union([z.string().min(1), localizedSchema]);

export const checkOps = ["equals", "notEquals", "quantity", "exists", "absent", "contains", "subset", "matches", "length", "oneOf"] as const;

export const checkSchema = z
  .strictObject({
    id,
    /** What the check verifies, shown to the candidate after submission ("Image is nginx:1.27"). */
    label: text,
    /** Object mode / manifest: which document (by kind and name) when there are several. */
    select: z.strictObject({ kind: z.string().optional(), name: z.string().optional() }).optional(),
    /** Path in the document, or in the parsed command (tool, verb, args, flags.<name>). */
    path: z.string().min(1),
    op: z.enum(checkOps),
    value: z.unknown().optional(),
  })
  .superRefine((c, ctx) => {
    const needsValue = !["exists", "absent"].includes(c.op);
    if (needsValue && c.value === undefined) ctx.addIssue({ code: "custom", message: `op ${c.op} needs a value`, path: ["value"] });
    if (c.op === "oneOf" && !Array.isArray(c.value)) ctx.addIssue({ code: "custom", message: "oneOf needs an array", path: ["value"] });
    if (c.op === "length" && typeof c.value !== "number") ctx.addIssue({ code: "custom", message: "length needs a number", path: ["value"] });
    if (c.op === "matches" && typeof c.value !== "string") ctx.addIssue({ code: "custom", message: "matches needs a regex string", path: ["value"] });
  });
export type Check = z.infer<typeof checkSchema>;

const fileSchema = z.strictObject({ name: z.string().regex(/^[a-zA-Z0-9._/-]{1,80}$/), content: z.string().min(1) });

export const tools = ["kubectl", "helm", "kubeadm", "etcdctl", "etcdutl", "crictl", "systemctl", "journalctl", "docker", "podman"] as const;

export const commandBody = z.strictObject({
  mode: z.enum(["object", "invocation"]),
  /** Tools the command may start with (default kubectl). */
  tools: z.array(z.enum(tools)).min(1).default(["kubectl"]),
  /** Current namespace of the context (shown to the candidate). */
  namespace: z.string().default("default"),
  /** Files present in the working directory (manifests used with -f / --local). */
  files: z.array(fileSchema).max(4).default([]),
});
export const commandAnswer = z.strictObject({
  checks: z.array(checkSchema).min(1).max(12),
  solution: z
    .array(z.strictObject({ command: z.string().min(1), output: z.string().optional() }))
    .min(1)
    .max(6),
  negatives: z
    .array(z.strictObject({ command: z.string().min(1), output: z.string().optional(), why: z.string().min(1) }))
    .min(1)
    .max(6),
});
export const commandResponse = z.object({ command: z.string().min(1).max(2000) });

export const manifestBody = z.strictObject({
  /** YAML pre-filled in the editor (may be empty). */
  starter: z.string().default(""),
  files: z.array(fileSchema).max(4).default([]),
});
export const manifestAnswer = z.strictObject({
  checks: z.array(checkSchema).min(1).max(15),
  solution: z.array(z.strictObject({ manifest: z.string().min(1) })).min(1).max(4),
  negatives: z.array(z.strictObject({ manifest: z.string().min(1), why: z.string().min(1) })).min(1).max(6),
});
export const manifestResponse = z.object({ manifest: z.string().min(1).max(50000) });

// ---------------------------------------------------------------- command parsing

export interface Invocation {
  tool: string;
  verb: string | null;
  args: string[];
  flags: Record<string, string | boolean | string[]>;
  /** For kubectl run/exec/debug: what follows `--`. */
  rest: string[];
  /** kubectl: sub-verb of create, set, rollout, config, auth, top, certificate (`rollout undo` → "undo"). */
  subverb: string | null;
  /** kubectl: resource type, normalized to the singular kind in lower case ("po", "pods" → "pod"). */
  resource: string | null;
  /** kubectl: object names (from `type/name` or the following arguments). */
  names: string[];
}

export class CommandError extends Error {}

/** Splits a command line like a POSIX shell, without expansion; refuses shell operators. */
export function splitWords(line: string): string[] {
  const words: string[] = [];
  let cur = "";
  let has = false;
  let i = 0;
  const s = line.trim();
  while (i < s.length) {
    const ch = s[i];
    if (ch === "'") {
      const end = s.indexOf("'", i + 1);
      if (end < 0) throw new CommandError("unterminated single quote");
      cur += s.slice(i + 1, end);
      has = true;
      i = end + 1;
    } else if (ch === '"') {
      i++;
      while (i < s.length && s[i] !== '"') {
        if (s[i] === "\\" && i + 1 < s.length && '"\\$`'.includes(s[i + 1])) i++;
        if (s[i] === "$" || s[i] === "`") throw new CommandError("no shell expansion");
        cur += s[i++];
      }
      if (i >= s.length) throw new CommandError("unterminated double quote");
      i++;
      has = true;
    } else if (ch === "\\") {
      if (i + 1 < s.length && s[i + 1] === "\n") i += 2;
      else {
        cur += s[i + 1] ?? "";
        has = true;
        i += 2;
      }
    } else if (/\s/.test(ch)) {
      if (has) words.push(cur);
      cur = "";
      has = false;
      i++;
    } else if ("|;&<>`$()".includes(ch)) {
      throw new CommandError(`shell operator "${ch}" is not allowed: type a single command`);
    } else {
      cur += ch;
      has = true;
      i++;
    }
  }
  if (has) words.push(cur);
  return words;
}

/**
 * Short and long flag names, per tool, then per kubectl verb. A flag absent
 * from these tables keeps its own name; a flag listed in `bool` takes no value.
 */
const KUBECTL_SHORT: Record<string, string> = {
  n: "namespace", o: "output", f: "filename", l: "selector", A: "all-namespaces", c: "container", i: "stdin", t: "tty",
  k: "kustomize", R: "recursive", r: "replicas", w: "watch", L: "label-columns", h: "help", s: "server", v: "v", q: "quiet",
};
const KUBECTL_VERB_SHORT: Record<string, Record<string, string>> = {
  logs: { f: "follow", p: "previous" },
  expose: { l: "labels" },
  patch: { p: "patch" },
  run: { l: "labels" },
  exec: { c: "container" },
  debug: { c: "container" },
  "port-forward": {},
  top: {},
};
const KUBECTL_BOOL = new Set([
  "all-namespaces", "stdin", "tty", "recursive", "watch", "follow", "previous", "timestamps", "all-containers", "force",
  "ignore-daemonsets", "delete-emptydir-data", "disable-eviction", "record", "overwrite", "all", "local", "help", "quiet",
  "show-labels", "no-headers", "wait", "insecure-skip-tls-verify", "rm", "privileged", "allow-missing-template-keys",
  "save-config", "server-side", "force-conflicts", "prune", "list", "containers", "sort-by-cpu", "use-protocol-buffers",
  "ignore-not-found", "now", "cascade-bool", "keep-annotations", "share-processes", "profile-bool", "raw-bool",
]);
const HELM_SHORT: Record<string, string> = { n: "namespace", f: "values", o: "output", a: "all", A: "all-namespaces", g: "generate-name", l: "selector", i: "install", q: "quiet" };
/** Short flags of the node tools (crictl, journalctl, etcdctl…). */
const TOOL_SHORT: Record<string, Record<string, string>> = {
  crictl: { a: "all", q: "quiet", o: "output", f: "follow", r: "runtime-endpoint", v: "verbose" },
  journalctl: { u: "unit", f: "follow", n: "lines", x: "catalog", e: "pager-end", b: "boot", p: "priority", r: "reverse", k: "dmesg", S: "since", U: "until", o: "output" },
  systemctl: { l: "full", a: "all", t: "type", q: "quiet", n: "lines" },
  etcdctl: { w: "write-out" },
  docker: { t: "tag", f: "file", o: "output", i: "input", d: "detach", p: "publish", e: "env", v: "volume", a: "all", q: "quiet" },
  podman: { t: "tag", f: "file", o: "output", i: "input", d: "detach", p: "publish", e: "env", v: "volume", a: "all", q: "quiet" },
};
const TOOL_BOOL: Record<string, Set<string>> = {
  crictl: new Set(["all", "quiet", "follow", "verbose", "latest", "no-trunc", "timestamps", "pods", "help"]),
  journalctl: new Set(["follow", "catalog", "pager-end", "boot", "reverse", "dmesg", "no-pager", "full", "all", "help", "list-boots"]),
  systemctl: new Set(["full", "all", "quiet", "now", "no-pager", "help", "force"]),
  etcdctl: new Set(["help", "debug", "insecure-skip-tls-verify", "insecure-transport", "hex", "keys-only", "prefix"]),
  etcdutl: new Set(["help", "skip-hash-check", "mark-compacted", "bump-revision"]),
  kubeadm: new Set(["help", "dry-run", "yes", "force", "print-join-command", "upload-certs", "control-plane", "skip-token-print", "skip-certificate-key-print", "allow-experimental-upgrades", "allow-release-candidate-upgrades", "etcd-upgrade", "certificate-renewal", "ignore-preflight-errors-bool"]),
  docker: new Set(["detach", "all", "quiet", "rm", "interactive", "tty", "no-cache", "pull", "help", "privileged", "init"]),
  podman: new Set(["detach", "all", "quiet", "rm", "interactive", "tty", "no-cache", "pull", "help", "privileged", "init"]),
};
const HELM_BOOL = new Set(["versions", "create-namespace", "install", "atomic", "wait", "dry-run", "all-namespaces", "devel", "reuse-values", "reset-values", "force", "keep-history", "all", "deployed", "failed", "pending", "uninstalled", "debug", "generate-name", "skip-crds", "rollback-on-failure", "take-ownership", "include-crds", "wait-for-jobs"]);
const GENERIC_BOOL = new Set(["help", "now", "follow", "all", "force", "dry-run", "yes", "y"]);

/** Parses one command line into tool, verb, positional arguments and normalized flags. */
export function parseCommand(line: string, allowed: readonly string[] = ["kubectl"]): Invocation {
  let words = splitWords(line.replace(/^\$\s*/, ""));
  if (words[0] === "sudo") words = words.slice(1);
  if (!words.length) throw new CommandError("empty command");
  const tool = words[0];
  if (tool === "k") words[0] = "kubectl";
  const t = words[0];
  if (!allowed.includes(t)) throw new CommandError(`the command must start with ${allowed.join(" or ")}`);
  const flags: Record<string, string | boolean | string[]> = {};
  const positional: string[] = [];
  let rest: string[] = [];
  const setFlag = (name: string, value: string | boolean) => {
    const prev = flags[name];
    if (prev === undefined) flags[name] = value;
    else if (typeof value === "string") flags[name] = Array.isArray(prev) ? [...prev, value] : typeof prev === "string" ? [prev, value] : value;
  };
  // kubectl verbs with a sub-verb: create deployment, set image, rollout undo, config use-context, auth can-i…
  const verbOf = () => positional[0] ?? null;
  const shortTable = () => {
    if (t === "kubectl") return { ...KUBECTL_SHORT, ...(KUBECTL_VERB_SHORT[verbOf() ?? ""] ?? {}) };
    if (t === "helm") return verbOf() === "search" ? { ...HELM_SHORT, l: "versions" } : HELM_SHORT;
    return TOOL_SHORT[t] ?? ({} as Record<string, string>);
  };
  const isBool = (name: string) => {
    if (t === "kubectl") return KUBECTL_BOOL.has(name);
    if (t === "helm") return HELM_BOOL.has(name);
    return TOOL_BOOL[t]?.has(name) ?? GENERIC_BOOL.has(name);
  };
  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    if (w === "--") {
      rest = words.slice(i + 1);
      break;
    }
    if (w.startsWith("--") && w.length > 2) {
      const eq = w.indexOf("=");
      const name = eq > 0 ? w.slice(2, eq) : w.slice(2);
      if (eq > 0) setFlag(name, w.slice(eq + 1));
      else if (isBool(name) || i + 1 >= words.length || (words[i + 1].startsWith("-") && words[i + 1] !== "-")) setFlag(name, true);
      else setFlag(name, words[++i]);
    } else if (w.startsWith("-") && w.length > 1 && !/^-\d/.test(w)) {
      const table = shortTable();
      const body = w.slice(1);
      const eq = body.indexOf("=");
      const letters = eq > 0 ? body.slice(0, eq) : body;
      // -it, -nfoo, -n foo, -n=foo
      for (let k = 0; k < letters.length; k++) {
        const name = table[letters[k]] ?? letters[k];
        if (isBool(name)) {
          setFlag(name, true);
          continue;
        }
        const inline = body.slice(k + 1).replace(/^=/, "");
        if (inline) setFlag(name, inline);
        else if (i + 1 < words.length) setFlag(name, words[++i]);
        else setFlag(name, true);
        break;
      }
    } else positional.push(w);
  }
  if (typeof flags["dry-run"] === "boolean") flags["dry-run"] = "client";
  const inv: Invocation = { tool: t, verb: positional[0] ?? null, args: positional.slice(1), flags, rest, subverb: null, resource: null, names: [] };
  return t === "kubectl" ? describeKubectl(inv) : inv;
}

const RESOURCE_ALIASES: Record<string, string[]> = {
  pod: ["po", "pods"], deployment: ["deploy", "deployments"], service: ["svc", "services"], namespace: ["ns", "namespaces"],
  node: ["no", "nodes"], configmap: ["cm", "configmaps"], secret: ["secrets"], serviceaccount: ["sa", "serviceaccounts"],
  replicaset: ["rs", "replicasets"], statefulset: ["sts", "statefulsets"], daemonset: ["ds", "daemonsets"], job: ["jobs"],
  cronjob: ["cj", "cronjobs"], ingress: ["ing", "ingresses"], networkpolicy: ["netpol", "networkpolicies"],
  persistentvolume: ["pv", "persistentvolumes"], persistentvolumeclaim: ["pvc", "persistentvolumeclaims"],
  storageclass: ["sc", "storageclasses"], horizontalpodautoscaler: ["hpa", "horizontalpodautoscalers"],
  resourcequota: ["quota", "resourcequotas"], limitrange: ["limits", "limitranges"], endpoints: ["ep"], endpointslice: ["endpointslices"],
  event: ["ev", "events"], role: ["roles"], rolebinding: ["rolebindings"], clusterrole: ["clusterroles"],
  clusterrolebinding: ["clusterrolebindings"], customresourcedefinition: ["crd", "crds", "customresourcedefinitions"],
  poddisruptionbudget: ["pdb", "poddisruptionbudgets"], priorityclass: ["pc", "priorityclasses"],
  certificatesigningrequest: ["csr", "certificatesigningrequests"], ingressclass: ["ingressclasses"], gateway: ["gtw", "gateways"],
  gatewayclass: ["gc", "gatewayclasses"], httproute: ["httproutes"], volumeattachment: ["volumeattachments"],
  "secret generic": [], "secret tls": [], "secret docker-registry": [],
};
const RESOURCE_OF = new Map<string, string>();
for (const [kind, aliases] of Object.entries(RESOURCE_ALIASES)) for (const a of [kind, ...aliases]) RESOURCE_OF.set(a, kind);
/** Normalizes a kubectl resource type (keeps an unknown one, such as a CRD plural, in lower case). */
export function normalizeResource(r: string): string {
  const lower = r.toLowerCase();
  const base = lower.split(".")[0];
  return RESOURCE_OF.get(lower) ?? RESOURCE_OF.get(base) ?? lower;
}
const KUBECTL_SUBVERB = new Set(["create", "set", "rollout", "config", "auth", "top", "certificate", "cluster-info", "apply"]);
const KUBECTL_POD_VERBS = new Set(["logs", "exec", "attach", "port-forward", "debug"]);

function describeKubectl(inv: Invocation): Invocation {
  let rem = inv.args;
  if (inv.verb && KUBECTL_SUBVERB.has(inv.verb) && rem.length && !(inv.verb === "apply" && !["view-last-applied", "set-last-applied", "edit-last-applied"].includes(rem[0]))) {
    inv.subverb = rem[0];
    rem = rem.slice(1);
  }
  if (inv.verb === "create" && inv.subverb) {
    inv.resource = normalizeResource(inv.subverb);
    if ((inv.subverb === "secret" || inv.subverb === "service" || inv.subverb === "svc") && rem.length) {
      inv.resource = `${normalizeResource(inv.subverb)} ${rem[0]}`;
      rem = rem.slice(1);
      inv.names = rem.slice(0, 1);
      return inv;
    }
    if (inv.subverb === "secret" && rem.length) {
      inv.resource = `secret ${rem[0]}`;
      rem = rem.slice(1);
    }
    inv.names = rem.slice(0, 1);
    return inv;
  }
  if (inv.verb === "top" && inv.subverb) {
    inv.resource = normalizeResource(inv.subverb);
    inv.names = rem.slice(0, 1);
    return inv;
  }
  if (inv.verb === "auth") return inv;
  const first = rem[0];
  if (!first) return inv;
  if (first.includes("/")) {
    const [type, ...name] = first.split("/");
    inv.resource = normalizeResource(type);
    inv.names = [name.join("/"), ...rem.slice(1).filter((x) => !x.includes("/") && !x.includes("="))];
  } else if (inv.verb && KUBECTL_POD_VERBS.has(inv.verb)) {
    inv.resource = "pod";
    inv.names = [first];
  } else {
    inv.resource = first.split(",").map(normalizeResource).join(",");
    inv.names = rem.slice(1);
  }
  return inv;
}

// ---------------------------------------------------------------- paths and checks

type Seg = { key: string } | { index: number } | { filter: [string, string] };

export function parsePath(path: string): Seg[] {
  const segs: Seg[] = [];
  let i = 0;
  while (i < path.length) {
    if (path[i] === ".") {
      i++;
      continue;
    }
    if (path[i] === "[") {
      const end = path.indexOf("]", i);
      if (end < 0) throw new Error(`bad path ${path}`);
      const inner = path.slice(i + 1, end).trim();
      i = end + 1;
      if (/^\d+$/.test(inner)) segs.push({ index: Number(inner) });
      else if (/^["'].*["']$/.test(inner)) segs.push({ key: inner.slice(1, -1) });
      else {
        const eq = inner.indexOf("=");
        if (eq < 0) throw new Error(`bad filter in ${path}`);
        segs.push({ filter: [inner.slice(0, eq).trim(), inner.slice(eq + 1).trim().replace(/^["']|["']$/g, "")] });
      }
      continue;
    }
    let j = i;
    while (j < path.length && path[j] !== "." && path[j] !== "[") j++;
    segs.push({ key: path.slice(i, j) });
    i = j;
  }
  return segs;
}

const MISSING = Symbol("missing");

export function getPath(doc: unknown, path: string): unknown {
  let cur: unknown = doc;
  for (const s of parsePath(path)) {
    if (cur === MISSING || cur === null || cur === undefined) return MISSING;
    if ("key" in s) {
      if (typeof cur !== "object" || Array.isArray(cur) || !(s.key in (cur as object))) return MISSING;
      cur = (cur as Record<string, unknown>)[s.key];
    } else if ("index" in s) {
      if (!Array.isArray(cur) || s.index >= cur.length) return MISSING;
      cur = cur[s.index];
    } else {
      if (!Array.isArray(cur)) return MISSING;
      const [k, v] = s.filter;
      const found = cur.find((x) => x && typeof x === "object" && String((x as Record<string, unknown>)[k]) === v);
      if (found === undefined) return MISSING;
      cur = found;
    }
  }
  return cur;
}

const QUANTITY = /^([+-]?\d+(?:\.\d+)?)(?:([eE][+-]?\d+)|(Ki|Mi|Gi|Ti|Pi|Ei|n|u|m|k|M|G|T|P|E))?$/;
const FACTORS: Record<string, number> = {
  n: 1e-9, u: 1e-6, m: 1e-3, k: 1e3, M: 1e6, G: 1e9, T: 1e12, P: 1e15, E: 1e18,
  Ki: 1024, Mi: 1024 ** 2, Gi: 1024 ** 3, Ti: 1024 ** 4, Pi: 1024 ** 5, Ei: 1024 ** 6,
};
export function quantity(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return null;
  const m = QUANTITY.exec(v.trim());
  if (!m) return null;
  const base = Number(m[1]);
  if (m[2]) return base * 10 ** Number(m[2].slice(1));
  return base * (m[3] ? FACTORS[m[3]] : 1);
}

function scalarEq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if ((typeof a === "number" && typeof b === "string") || (typeof a === "string" && typeof b === "number")) return String(a) === String(b);
  if ((typeof a === "boolean" && typeof b === "string") || (typeof a === "string" && typeof b === "boolean")) return String(a) === String(b);
  return false;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const ka = Object.keys(a as object), kb = Object.keys(b as object);
    return ka.length === kb.length && ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return scalarEq(a, b);
}

/** `expected` is contained in `actual`: objects by key, arrays element by element in any order. */
export function isSubset(expected: unknown, actual: unknown): boolean {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return false;
    return expected.every((e) => actual.some((a) => isSubset(e, a)));
  }
  if (expected && typeof expected === "object") {
    if (!actual || typeof actual !== "object" || Array.isArray(actual)) return false;
    return Object.entries(expected as object).every(([k, v]) => k in (actual as object) && isSubset(v, (actual as Record<string, unknown>)[k]));
  }
  return scalarEq(expected, actual);
}

export function evalCheck(c: Check, target: unknown): boolean {
  const v = getPath(target, c.path);
  switch (c.op) {
    case "exists":
      return v !== MISSING && v !== null;
    case "absent":
      return v === MISSING || v === null;
    case "equals":
      return v !== MISSING && deepEqual(v, c.value);
    case "notEquals":
      return v !== MISSING && !deepEqual(v, c.value);
    case "quantity": {
      const a = quantity(v), b = quantity(c.value);
      return a !== null && b !== null && Math.abs(a - b) <= Math.abs(b) * 1e-9;
    }
    case "contains":
      if (v === MISSING) return false;
      if (typeof v === "string") return typeof c.value === "string" && v.includes(c.value);
      if (Array.isArray(v)) return v.some((x) => isSubset(c.value, x));
      return isSubset(c.value, v);
    case "subset":
      return v !== MISSING && isSubset(c.value, v);
    case "matches":
      return v !== MISSING && v !== null && new RegExp(String(c.value)).test(typeof v === "string" ? v : JSON.stringify(v));
    case "length":
      return Array.isArray(v) ? v.length === c.value : v && typeof v === "object" ? Object.keys(v).length === c.value : false;
    case "oneOf":
      return v !== MISSING && (c.value as unknown[]).some((x) => deepEqual(v, x));
  }
}

/** Parses YAML documents (skips empty ones and unwraps `kind: List`). Throws on a YAML error. */
export function parseDocs(source: string): Record<string, unknown>[] {
  const docs: Record<string, unknown>[] = [];
  for (const d of parseAllDocuments(source)) {
    if (d.errors.length) throw new Error(d.errors[0].message);
    const v = d.toJSON();
    if (v === null || v === undefined) continue;
    if (typeof v !== "object" || Array.isArray(v)) throw new Error("each YAML document must be a mapping");
    const o = v as Record<string, unknown>;
    if (o.kind === "List" && Array.isArray(o.items)) docs.push(...(o.items as Record<string, unknown>[]));
    else docs.push(o);
  }
  return docs;
}

export function selectDoc(docs: Record<string, unknown>[], select?: { kind?: string; name?: string }): Record<string, unknown> | null {
  const match = docs.filter((d) => {
    if (select?.kind && d.kind !== select.kind) return false;
    if (select?.name && (d.metadata as Record<string, unknown> | undefined)?.name !== select.name) return false;
    return true;
  });
  return match[0] ?? null;
}

export interface CheckResult {
  id: string;
  passed: boolean;
}

/** Runs the checks on YAML documents (object mode, manifest). */
export function checkDocs(checks: Check[], docs: Record<string, unknown>[]): CheckResult[] {
  return checks.map((c) => {
    const doc = selectDoc(docs, c.select);
    return { id: c.id, passed: doc !== null && evalCheck(c, doc) };
  });
}

/** Runs the checks on a parsed command (invocation mode). */
export function checkInvocation(checks: Check[], inv: Invocation): CheckResult[] {
  return checks.map((c) => ({ id: c.id, passed: evalCheck(c, inv) }));
}
