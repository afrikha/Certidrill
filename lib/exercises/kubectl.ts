/**
 * Runs a candidate's `command` exercise in mode `object` with the real
 * kubectl v1.37 (docs/SPECS-KUBERNETES-PRATIQUE.md §3.4, §3.5):
 *
 * - never through a shell: `execFile` with the words of the parsed command;
 * - no server and no credentials: a throwaway kubeconfig pointing to a closed
 *   loopback port, with a placeholder token (kubectl otherwise prompts for a
 *   user name), and a discovery cache written next to the run so that kubectl
 *   never asks the server for the API; `--server` is refused, `--kubeconfig`,
 *   `--token` and the other credential flags are dropped;
 * - always printing objects: `--dry-run=client -o yaml` replaces what the
 *   candidate wrote (`server`, `none`, `-o name`…);
 * - an object given in `body.files` (`set image deployment/web`, `label`,
 *   `annotate`, `expose`) is read from that file (`-f <file> --local`): kubectl
 *   would otherwise fetch it from the cluster;
 * - only the sub-commands of `OBJECT_COMMANDS`;
 * - in a temporary directory holding `body.files`, removed afterwards, with an
 *   empty environment, a 5 s time limit, 1 MB of output and at most
 *   `MAX_CONCURRENT` runs at a time (the others wait, up to `QUEUE_WAIT_MS`).
 */
// Not "server-only": the content checks (tools/validate-questions.ts) run it too. It never reaches the browser
// (node:child_process); the application calls it through lib/exercises/server.ts.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { stringify } from "yaml";
import { CommandError, parseCommandWords, parseDocs, type FlagSpan, type ParsedCommand } from "./engine";
import { CLUSTER_KINDS, discoveryCache, kindOfResource } from "./kubernetes-api";
import { ExerciseBusyError } from "./grade";

export { ExerciseBusyError } from "./grade";

/** The kubectl version the exercises are written for (blueprint.version of CKAD and CKA). */
export const KUBECTL_VERSION = "v1.37";

/** Limits of one run (spec §3.4, §3.5). */
export const KUBECTL_LIMITS = { timeoutMs: 5_000, maxOutputBytes: 1024 * 1024, maxConcurrent: 4, queueWaitMs: 10_000 } as const;

/**
 * The sub-commands run in mode `object` (factory/BRIEF-PRACTICE.md, "mode
 * object"), each tested offline in tests/unit/exercises-kubectl.test.ts.
 * `create` and `set` list their sub-verbs, aliases included.
 */
export const OBJECT_COMMANDS = {
  run: true,
  expose: true,
  label: true,
  annotate: true,
  create: [
    "deployment", "deploy", "job", "cronjob", "cj", "configmap", "cm", "secret", "service", "svc", "ingress", "ing",
    "role", "rolebinding", "clusterrole", "clusterrolebinding", "serviceaccount", "sa", "namespace", "ns", "quota",
    "resourcequota", "priorityclass", "pc", "poddisruptionbudget", "pdb",
  ],
  set: ["image", "env", "resources", "serviceaccount", "sa", "selector", "subject"],
} as const;

/** Verbs that change an existing object: read from `body.files` (`-f <file>`). */
const ON_EXISTING = new Set(["set", "label", "annotate", "expose"]);
/** Verbs with `--local` (expose has none: with `-f` it reads the file and maps the kind with the discovery cache). */
const HAS_LOCAL = new Set(["set", "label", "annotate"]);
/** Verbs that accept `--validate` (not run, expose, set, label, annotate). */
const HAS_VALIDATE = new Set(["create"]);

/** Flags refused: they would reach a server or write files. */
const REFUSED_FLAGS = new Set(["server", "profile", "profile-output", "log-file", "log-dir", "log_file", "log_dir"]);
/** Flags dropped: credentials and settings that this runner sets itself. */
const DROPPED_FLAGS = new Set([
  "kubeconfig", "token", "cache-dir", "certificate-authority", "client-certificate", "client-key", "username", "password",
  "as", "as-group", "as-uid", "context", "cluster", "tls-server-name", "insecure-skip-tls-verify", "request-timeout",
  "output", "dry-run", "validate", "local",
]);
/** Flags whose value is a file: only files of the working directory. */
const FILE_FLAGS = new Set(["filename", "from-file", "from-env-file", "cert", "key", "kustomize"]);

/** Host of the fake server, as kubectl names its discovery cache folder. */
const FAKE_SERVER = "https://127.0.0.1:9";
const CACHE_HOST = "127.0.0.1_9";

export class KubectlUnavailableError extends Error {
  constructor() {
    super("kubectl is not installed");
    this.name = "KubectlUnavailableError";
  }
}

/** The kubectl binary: KUBECTL_BIN, else /usr/local/bin/kubectl; null when absent. */
export function kubectlBinary(): string | null {
  const bin = process.env.KUBECTL_BIN || "/usr/local/bin/kubectl";
  // turbopackIgnore: a binary of the image, not a file of the project to trace into the build.
  return path.isAbsolute(bin) && existsSync(/*turbopackIgnore: true*/ bin) ? bin : null;
}

export interface CommandFiles {
  files: { name: string; content: string }[];
  /** The namespace of the context (body.namespace), where kubectl looks without -n. */
  namespace?: string;
}

export type ObjectRun = { ok: true; output: string; docs: Record<string, unknown>[]; argv: string[] } | { ok: false; error: string; argv?: string[] };

// ------------------------------------------------------------------ concurrency

let running = 0;
const waiting: (() => void)[] = [];

async function acquire(waitMs: number): Promise<void> {
  if (running < KUBECTL_LIMITS.maxConcurrent) {
    running++;
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const go = () => {
      clearTimeout(timer);
      running++;
      resolve();
    };
    const timer = setTimeout(() => {
      const i = waiting.indexOf(go);
      if (i >= 0) waiting.splice(i, 1);
      reject(new ExerciseBusyError());
    }, waitMs);
    waiting.push(go);
  });
}

function release() {
  running--;
  waiting.shift()?.();
}

// ------------------------------------------------------------------ arguments

/** A file name of body.files or of a flag: relative, inside the working directory. */
export function safeRelativePath(p: string): boolean {
  if (!p || p.includes("\0") || p.includes("://") || p.startsWith("~") || path.isAbsolute(p) || /^[a-zA-Z]:/.test(p)) return false;
  return !p.split(/[\\/]/).includes("..");
}

const flagValues = (cmd: ParsedCommand, span: FlagSpan): string[] => {
  const words = cmd.words.slice(span.start, span.end + 1);
  const first = words[0]!;
  const eq = first.indexOf("=");
  if (first.startsWith("--")) return eq > 0 ? [first.slice(eq + 1)] : words.slice(1);
  // -fvalue, -f=value, -f value
  const inline = first.slice(2).replace(/^=/, "");
  return inline ? [inline] : words.slice(1);
};

/** The checks a run must pass before kubectl starts; returns the error shown to the candidate. */
function refusal(cmd: ParsedCommand): string | null {
  const inv = cmd.invocation;
  if (inv.tool !== "kubectl") return "this exercise expects a kubectl command";
  const verb = inv.verb ?? "";
  const allowed = OBJECT_COMMANDS[verb as keyof typeof OBJECT_COMMANDS];
  if (!allowed) return `kubectl ${verb || "(no command)"} is not checked here: this exercise expects a command that creates or changes objects`;
  if (Array.isArray(allowed) && !allowed.includes(inv.subverb ?? "")) return `kubectl ${verb} ${inv.subverb ?? ""} is not checked here`.trim();
  for (const span of cmd.spans) {
    const refused = span.names.find((n) => REFUSED_FLAGS.has(n));
    if (refused) return `--${refused} is not allowed`;
    if (span.names.some((n) => FILE_FLAGS.has(n))) {
      for (const v of flagValues(cmd, span)) {
        // --from-file=key=path
        const file = v.includes("=") ? v.slice(v.indexOf("=") + 1) : v;
        if (file !== "-" && !safeRelativePath(file)) return `files must be in the working directory: ${v}`;
      }
    }
  }
  return null;
}

/** The positional words naming the object of a set/label/annotate/expose command (resource then names). */
function targetWords(cmd: ParsedCommand): { indexes: number[]; resource: string; names: string[] } | null {
  const inv = cmd.invocation;
  const skip = inv.verb === "set" ? 2 : 1; // verb (and sub-verb)
  const pos = cmd.positions.slice(skip);
  const first = pos[0] === undefined ? undefined : cmd.words[pos[0]];
  if (first === undefined) return null;
  if (first.includes("/")) {
    const [type, ...name] = first.split("/");
    return { indexes: [pos[0]!], resource: type!, names: [name.join("/")] };
  }
  let candidates = pos.slice(1);
  // set serviceaccount deployment web <service-account>: the last word is the account.
  if (inv.verb === "set" && (inv.subverb === "serviceaccount" || inv.subverb === "sa")) candidates = candidates.slice(0, -1);
  const names: number[] = [];
  for (const i of candidates) {
    const w = cmd.words[i]!;
    if (w.includes("=") || w.endsWith("-") || w.includes("/")) break;
    names.push(i);
  }
  return { indexes: [pos[0]!, ...names], resource: first, names: names.map((i) => cmd.words[i]!) };
}

/** The documents of body.files (YAML files only), with their file name. */
function fileDocs(files: CommandFiles["files"]): { file: string; doc: Record<string, unknown> }[] {
  return files
    .filter((f) => /\.ya?ml$/i.test(f.name))
    .flatMap((f) => {
      try {
        return parseDocs(f.content).map((doc) => ({ file: f.name, doc }));
      } catch {
        return [];
      }
    });
}

export interface KubectlPlan {
  argv: string[];
  /** Extra files to write in the working directory (the object read with -f). */
  extraFiles: Record<string, string>;
}

/**
 * The kubectl arguments for a candidate's command, or the reason it is not
 * run. Pure (exported for the tests): `kubeconfig` and `cacheDir` are the paths
 * of the run.
 */
export function planKubectl(command: string, body: CommandFiles, paths: { kubeconfig: string; cacheDir: string }): { ok: true; plan: KubectlPlan } | { ok: false; error: string } {
  let cmd: ParsedCommand;
  try {
    cmd = parseCommandWords(command, ["kubectl"]);
  } catch (e) {
    return { ok: false, error: e instanceof CommandError ? e.message : "the command could not be read" };
  }
  const refused = refusal(cmd);
  if (refused) return { ok: false, error: refused };
  const inv = cmd.invocation;
  const verb = inv.verb!;

  const drop = new Set<number>();
  for (const span of cmd.spans) {
    if (span.names.some((n) => DROPPED_FLAGS.has(n))) for (let i = span.start; i <= span.end; i++) drop.add(i);
  }
  const extraFiles: Record<string, string> = {};
  const added: string[] = [];
  const hasFile = cmd.spans.some((s) => s.names.includes("filename") || s.names.includes("kustomize"));
  if (ON_EXISTING.has(verb) && !hasFile) {
    const target = targetWords(cmd);
    const kind = target && kindOfResource(target.resource);
    if (target && kind && target.names.length) {
      // As on a cluster, kubectl looks in the namespace of -n, or of the context: an object of another namespace is not found.
      const flagNs = cmd.invocation.flags.namespace;
      const contextNs = body.namespace || "default";
      const ns = typeof flagNs === "string" ? flagNs : contextNs;
      const named = fileDocs(body.files).filter(({ doc }) => doc.kind === kind && target.names.includes(String((doc.metadata as { name?: unknown } | undefined)?.name)));
      const docs = CLUSTER_KINDS.has(kind)
        ? named
        : named.filter(({ doc }) => String((doc.metadata as { namespace?: unknown } | undefined)?.namespace ?? contextNs) === ns);
      if (named.length && !docs.length) {
        return { ok: false, error: `Error from server (NotFound): ${target.resource} "${target.names.join(",")}" not found in namespace "${ns}"` };
      }
      if (docs.length === target.names.length) {
        const name = ".certidrill-target.yaml";
        extraFiles[name] = docs.map(({ doc }) => stringify(doc)).join("---\n");
        for (const i of target.indexes) drop.add(i);
        added.push("-f", name);
      } else if (!docs.length) {
        return { ok: false, error: `${target.resource}/${target.names.join(",")} is not in the files of this exercise: kubectl would need the cluster` };
      }
    }
  }
  if (HAS_LOCAL.has(verb)) added.push("--local");
  if (HAS_VALIDATE.has(verb)) added.push("--validate=false");
  added.push("--dry-run=client", "--output=yaml", `--kubeconfig=${paths.kubeconfig}`, `--cache-dir=${paths.cacheDir}`, "--request-timeout=1s");

  const before = cmd.words.slice(1, cmd.restIndex).filter((_, k) => !drop.has(k + 1));
  const rest = cmd.restIndex < cmd.words.length ? cmd.words.slice(cmd.restIndex) : [];
  return { ok: true, plan: { argv: [...before, ...added, ...rest], extraFiles } };
}

// ------------------------------------------------------------------ run

const KUBECONFIG = (token: string) => `apiVersion: v1
kind: Config
clusters:
- name: offline
  cluster:
    server: ${FAKE_SERVER}
contexts:
- name: offline
  context:
    cluster: offline
    user: offline
    namespace: NAMESPACE
current-context: offline
users:
- name: offline
  user:
    token: ${token}
`;

/** The message of a failed run: kubectl's own error, without the paths of the run. */
function errorMessage(stderr: string, dir: string): string {
  const lines = stderr
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^[EIW]\d{4} /.test(l));
  const line = lines.find((l) => l.startsWith("error:")) ?? lines[0] ?? "kubectl failed";
  return line.split(dir + path.sep).join("").split(dir).join(".").slice(0, 300);
}

/**
 * Runs a command of mode `object` and returns the objects kubectl prints.
 * Throws ExerciseBusyError when no slot frees up in time and
 * KubectlUnavailableError when kubectl is not installed.
 */
export async function runObjectCommand(
  command: string,
  body: CommandFiles & { namespace: string },
  options: { bin?: string; queueWaitMs?: number } = {},
): Promise<ObjectRun> {
  const bin = options.bin ?? kubectlBinary();
  if (!bin) throw new KubectlUnavailableError();
  await acquire(options.queueWaitMs ?? KUBECTL_LIMITS.queueWaitMs);
  const dir = await mkdtemp(path.join(tmpdir(), "certidrill-kubectl-"));
  try {
    const work = path.join(dir, "work");
    const home = path.join(dir, "home");
    const cacheDir = path.join(dir, "cache");
    const kubeconfig = path.join(dir, "kubeconfig");
    const planned = planKubectl(command, body, { kubeconfig, cacheDir });
    if (!planned.ok) return planned;
    const { argv, extraFiles } = planned.plan;
    await mkdir(work, { recursive: true });
    await mkdir(home, { recursive: true });
    const namespace = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(body.namespace) ? body.namespace : "default";
    await writeFile(kubeconfig, KUBECONFIG("offline-placeholder").replace("NAMESPACE", namespace), { mode: 0o600 });
    for (const [rel, content] of Object.entries(discoveryCache())) {
      const file = path.join(cacheDir, "discovery", CACHE_HOST, rel);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, content);
    }
    for (const f of body.files) {
      if (!safeRelativePath(f.name)) return { ok: false, error: `bad file name ${f.name}` };
      const file = path.join(work, f.name);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, f.content);
    }
    for (const [name, content] of Object.entries(extraFiles)) await writeFile(path.join(work, name), content);

    const result = await new Promise<{ code: number | null; stdout: string; stderr: string; error?: string }>((resolve) => {
      const child = execFile(
        /*turbopackIgnore: true*/ bin,
        argv,
        {
          cwd: work,
          encoding: "utf8",
          // An empty environment: no KUBECONFIG, proxy or credentials of the application.
          env: { HOME: home, KUBECONFIG: kubeconfig, PATH: "/nonexistent", LANG: "C", NO_PROXY: "*" } as unknown as NodeJS.ProcessEnv,
          timeout: KUBECTL_LIMITS.timeoutMs,
          maxBuffer: KUBECTL_LIMITS.maxOutputBytes,
          killSignal: "SIGKILL",
          shell: false,
          windowsHide: true,
        },
        (error, stdout, stderr) => {
          if (!error) return resolve({ code: 0, stdout, stderr });
          const e = error as NodeJS.ErrnoException & { killed?: boolean; code?: number | string };
          if (e.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") return resolve({ code: null, stdout: "", stderr: "", error: "kubectl printed too much output" });
          if (e.killed) return resolve({ code: null, stdout: "", stderr: "", error: "kubectl took too long" });
          resolve({ code: typeof e.code === "number" ? e.code : 1, stdout, stderr });
        },
      );
      // Nothing to read: kubectl must never wait for an answer.
      child.stdin?.end();
    });
    if (result.error) return { ok: false, error: result.error, argv };
    if (result.code !== 0) return { ok: false, error: errorMessage(result.stderr, dir), argv };
    try {
      return { ok: true, output: result.stdout, docs: parseDocs(result.stdout), argv };
    } catch {
      return { ok: false, error: "kubectl printed no object", argv };
    }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    release();
  }
}
