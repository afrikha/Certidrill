import { describe, expect, it } from "vitest";
import {
  CommandError,
  checkDocs,
  checkInvocation,
  checkSchema,
  evalCheck,
  getPath,
  isSubset,
  MAX_COMMAND_LENGTH,
  normalizeResource,
  parseCommand,
  parseCommandWords,
  parseDocs,
  quantity,
  selectDoc,
  splitWords,
  type Check,
} from "@/lib/exercises/engine";
import { checksPassed, gradeExercise, gradeWithoutKubectl, readGrading, type ExerciseQuestion } from "@/lib/exercises/grade";
import { CLUSTER_KINDS, discoveryCache, kindOfResource, SERVED } from "@/lib/exercises/kubernetes-api";

const check = (c: Partial<Check> & Pick<Check, "path" | "op">): Check => ({ id: "c", label: "l", ...c }) as Check;

describe("splitWords", () => {
  it("splits like a shell, with quotes and escapes", () => {
    expect(splitWords(`kubectl run a --image=nginx --labels='app=web,tier=fe' -- sh -c "echo hi"`)).toEqual([
      "kubectl", "run", "a", "--image=nginx", "--labels=app=web,tier=fe", "--", "sh", "-c", "echo hi",
    ]);
    expect(splitWords(String.raw`kubectl label pod a x=a\ b`)).toEqual(["kubectl", "label", "pod", "a", "x=a b"]);
    expect(splitWords(`kubectl get pod -o jsonpath='{.items[*].metadata.name}'`)).toContain("jsonpath={.items[*].metadata.name}");
    expect(splitWords(`kubectl get pod -o jsonpath={.status.phase}`)).toContain("jsonpath={.status.phase}");
    expect(splitWords("kubectl \\\n get pods")).toEqual(["kubectl", "get", "pods"]);
  });

  it.each(["kubectl get pods | grep web", "kubectl get pods; rm -rf /", "kubectl get pods && echo", "kubectl get pods > out", "kubectl get pods < in", "kubectl get $(whoami)", "kubectl get `id`", "kubectl get $HOME", `kubectl get "$HOME"`, `kubectl get "\`id\`"`, "kubectl get pods &"])(
    "refuses shell operators: %s",
    (line) => {
      expect(() => splitWords(line)).toThrow(CommandError);
    },
  );

  it("refuses several lines and unterminated quotes", () => {
    expect(() => splitWords("kubectl get pods\nkubectl delete pods --all")).toThrow(/one line/);
    expect(() => splitWords("kubectl get 'pods")).toThrow(/quote/);
    expect(() => splitWords('kubectl get "pods')).toThrow(/quote/);
  });
});

describe("parseCommand", () => {
  it("normalizes the tool, short flags, resources and names", () => {
    const inv = parseCommand("sudo k -n shop rollout undo deploy/api --to-revision 2");
    expect(inv).toMatchObject({ tool: "kubectl", verb: "rollout", subverb: "undo", resource: "deployment", names: ["api"], flags: { namespace: "shop", "to-revision": "2" } });
    expect(parseCommand("$ kubectl logs web -c app -p --tail=20")).toMatchObject({ verb: "logs", resource: "pod", names: ["web"], flags: { container: "app", previous: true, tail: "20" } });
    expect(parseCommand("kubectl create secret generic s --from-literal=a=b")).toMatchObject({ subverb: "secret", resource: "secret generic", names: ["s"] });
    expect(parseCommand("kubectl get po,svc -A")).toMatchObject({ resource: "pod,service", flags: { "all-namespaces": true } });
    expect(parseCommand("kubectl run t --image=busybox -it --rm -- sh")).toMatchObject({ flags: { stdin: true, tty: true, rm: true }, rest: ["sh"] });
    expect(parseCommand("kubectl apply -k ./overlays/prod")).toMatchObject({ verb: "apply", flags: { kustomize: "./overlays/prod" } });
    expect(parseCommand("kubectl create deploy a --image=x --dry-run -o yaml").flags["dry-run"]).toBe("client");
    expect(parseCommand("kubectl run a --image=x --env A=1 --env B=2").flags.env).toEqual(["A=1", "B=2"]);
    expect(parseCommand("helm upgrade --install web ./chart -n shop -f values.yaml", ["helm"])).toMatchObject({ tool: "helm", verb: "upgrade", args: ["web", "./chart"], flags: { install: true, namespace: "shop", values: "values.yaml" } });
    expect(parseCommand("etcdctl snapshot save /backup/etcd.db --cacert=/a", ["etcdctl"])).toMatchObject({ verb: "snapshot", args: ["save", "/backup/etcd.db"] });
  });

  it("refuses another tool, an empty command and a too long one", () => {
    expect(() => parseCommand("helm list")).toThrow(/must start with kubectl/);
    expect(() => parseCommand("   ")).toThrow(/empty/);
    expect(() => parseCommand("kubectl get " + "x".repeat(MAX_COMMAND_LENGTH))).toThrow(/longer/);
  });

  it("keeps the words, the positions and the flag spans", () => {
    const p = parseCommandWords("k label -n shop pod web tier=fe -- x");
    expect(p.words[0]).toBe("kubectl");
    expect(p.positions.map((i) => p.words[i])).toEqual(["label", "pod", "web", "tier=fe"]);
    expect(p.spans).toEqual([{ names: ["namespace"], start: 2, end: 3 }]);
    expect(p.words[p.restIndex]).toBe("--");
  });

  it("normalizes resource names", () => {
    expect(normalizeResource("PODS")).toBe("pod");
    expect(normalizeResource("deployments.apps")).toBe("deployment");
    expect(normalizeResource("widgets.example.com")).toBe("widgets.example.com");
  });
});

describe("paths and checks", () => {
  const pod = parseDocs(`apiVersion: v1
kind: Pod
metadata:
  name: web
  labels: {"app.kubernetes.io/name": web}
spec:
  containers:
  - name: app
    image: nginx:1.27
    ports: [{containerPort: 8080}]
    resources: {limits: {cpu: 500m, memory: 1Gi}}
  - name: side
    image: busybox
`)[0]!;

  it("follows keys, indexes, filters and quoted keys", () => {
    expect(getPath(pod, "spec.containers[0].image")).toBe("nginx:1.27");
    expect(getPath(pod, "spec.containers[name=side].image")).toBe("busybox");
    expect(getPath(pod, 'metadata.labels["app.kubernetes.io/name"]')).toBe("web");
    expect(typeof getPath(pod, "spec.containers[5]")).toBe("symbol");
  });

  it("evaluates every operator", () => {
    expect(evalCheck(check({ path: "kind", op: "equals", value: "Pod" }), pod)).toBe(true);
    expect(evalCheck(check({ path: "spec.containers[0].ports[0].containerPort", op: "equals", value: "8080" }), pod)).toBe(true);
    expect(evalCheck(check({ path: "kind", op: "notEquals", value: "Deployment" }), pod)).toBe(true);
    expect(evalCheck(check({ path: "spec.containers[0].resources.limits.cpu", op: "quantity", value: "0.5" }), pod)).toBe(true);
    expect(evalCheck(check({ path: "spec.containers[0].resources.limits.memory", op: "quantity", value: 1073741824 }), pod)).toBe(true);
    expect(evalCheck(check({ path: "spec.nodeName", op: "absent" }), pod)).toBe(true);
    expect(evalCheck(check({ path: "spec.containers", op: "exists" }), pod)).toBe(true);
    expect(evalCheck(check({ path: "spec.containers", op: "contains", value: { name: "side" } }), pod)).toBe(true);
    expect(evalCheck(check({ path: "spec.containers[0].image", op: "contains", value: "nginx" }), pod)).toBe(true);
    expect(evalCheck(check({ path: "spec", op: "subset", value: { containers: [{ name: "side" }, { name: "app" }] } }), pod)).toBe(true);
    expect(evalCheck(check({ path: "spec.containers[0].image", op: "matches", value: "^nginx:1\\.2[0-9]$" }), pod)).toBe(true);
    expect(evalCheck(check({ path: "spec.containers", op: "length", value: 2 }), pod)).toBe(true);
    expect(evalCheck(check({ path: "metadata.labels", op: "length", value: 1 }), pod)).toBe(true);
    expect(evalCheck(check({ path: "spec.containers[1].image", op: "oneOf", value: ["busybox", "busybox:1.36"] }), pod)).toBe(true);
    expect(evalCheck(check({ path: "spec.missing", op: "equals", value: 1 }), pod)).toBe(false);
  });

  it("validates the shape of a check", () => {
    expect(checkSchema.safeParse({ id: "a", label: "l", path: "kind", op: "equals" }).success).toBe(false);
    expect(checkSchema.safeParse({ id: "a", label: "l", path: "kind", op: "oneOf", value: "x" }).success).toBe(false);
    expect(checkSchema.safeParse({ id: "a", label: "l", path: "kind", op: "exists" }).success).toBe(true);
  });

  it("compares quantities and subsets", () => {
    expect(quantity("250m")).toBeCloseTo(0.25);
    expect(quantity("2Gi")).toBe(2 * 1024 ** 3);
    expect(quantity("1e3")).toBe(1000);
    expect(quantity("abc")).toBeNull();
    expect(isSubset({ a: [1] }, { a: [2, 1], b: 3 })).toBe(true);
    expect(isSubset({ a: 1 }, [1])).toBe(false);
  });

  it("selects a document and unwraps lists", () => {
    const docs = parseDocs("kind: List\nitems:\n- {kind: Service, metadata: {name: a}}\n- {kind: Pod, metadata: {name: b}}\n---\n");
    expect(docs).toHaveLength(2);
    expect(selectDoc(docs, { kind: "Pod" })?.metadata).toEqual({ name: "b" });
    expect(selectDoc(docs, { kind: "Pod", name: "x" })).toBeNull();
    expect(() => parseDocs("a: [")).toThrow();
    expect(() => parseDocs("- a")).toThrow(/mapping/);
    expect(checkDocs([check({ path: "kind", op: "equals", value: "Pod", select: { name: "zzz" } })], docs)).toEqual([{ id: "c", passed: false }]);
  });

  it("checks an invocation", () => {
    const inv = parseCommand("kubectl scale deploy web --replicas=3 -n shop");
    expect(checkInvocation([check({ path: "flags.replicas", op: "equals", value: 3 }), check({ id: "d", path: "names", op: "contains", value: "api" })], inv)).toEqual([
      { id: "c", passed: true },
      { id: "d", passed: false },
    ]);
  });
});

describe("grading", () => {
  const checks: Check[] = [check({ id: "kind", path: "kind", op: "equals", value: "Pod" }), check({ id: "img", path: "spec.containers[0].image", op: "equals", value: "nginx:1.27" })];
  const manifest: ExerciseQuestion = { type: "manifest", body: { starter: "", files: [] }, answer: { checks } };
  const invocation: ExerciseQuestion = {
    type: "command",
    body: { mode: "invocation", tools: ["kubectl"], namespace: "default", files: [] },
    answer: { checks: [check({ id: "verb", path: "verb", op: "equals", value: "logs" })] },
  };
  const object: ExerciseQuestion = { type: "command", body: { mode: "object", tools: ["kubectl"], namespace: "default", files: [] }, answer: { checks } };

  it("grades a manifest per check, and an invalid one with its error", () => {
    expect(gradeWithoutKubectl(manifest, { manifest: "apiVersion: v1\nkind: Pod\nmetadata: {name: a}\nspec: {containers: [{name: a, image: nginx}]}" })).toEqual({
      results: [{ id: "kind", passed: true }, { id: "img", passed: false }],
    });
    const bad = gradeWithoutKubectl(manifest, { manifest: "kind: Pod\n  bad: [" })!;
    expect(bad.results.every((r) => !r.passed)).toBe(true);
    expect(bad.error).toMatch(/^YAML: .*line/);
    expect(gradeWithoutKubectl(manifest, { manifest: "x".repeat(50_001) })!.error).toMatch(/larger/);
    expect(gradeWithoutKubectl(manifest, null)!.error).toBe("no answer");
  });

  it("grades an invocation, and a refused command with its message", () => {
    expect(gradeWithoutKubectl(invocation, { command: "k logs web" })).toEqual({ results: [{ id: "verb", passed: true }] });
    expect(gradeWithoutKubectl(invocation, { command: "kubectl logs web | head" })!.error).toMatch(/shell operator/);
  });

  it("runs the object mode only for a readable command", async () => {
    expect(gradeWithoutKubectl(object, { command: "kubectl run a --image=nginx:1.27" })).toBeNull();
    let ran = 0;
    const run = async () => {
      ran++;
      return { ok: true as const, docs: [{ kind: "Pod", spec: { containers: [{ image: "nginx:1.27" }] } }] };
    };
    expect(await gradeExercise(object, { command: "kubectl run a --image=nginx:1.27" }, run)).toEqual({ results: [{ id: "kind", passed: true }, { id: "img", passed: true }] });
    expect((await gradeExercise(object, { command: "kubectl run a; id" }, run)).error).toMatch(/shell operator/);
    expect(ran).toBe(1);
    expect((await gradeExercise(object, { command: "kubectl run a" }, async () => ({ ok: false as const, error: "error: x" }))).error).toBe("error: x");
  });

  it("counts the checks passed of a stored grading", () => {
    const g = readGrading({ results: [{ id: "kind", passed: true }, { id: "gone", passed: true }, { id: "img", passed: false }] });
    expect(checksPassed(checks, g)).toBe(1);
    expect(readGrading({ results: "x" })).toBeNull();
    expect(checksPassed(checks, null)).toBe(0);
  });
});

describe("Kubernetes v1.37 API", () => {
  it("serves the kinds of the resources and the configuration files", () => {
    expect(SERVED["apps/v1"]).toContain("Deployment");
    expect(SERVED["kubeadm.k8s.io/v1beta4"]).toContain("ClusterConfiguration");
    expect(SERVED["extensions/v1beta1"]).toBeUndefined();
    expect(CLUSTER_KINDS.has("ClusterRole")).toBe(true);
    expect(CLUSTER_KINDS.has("Role")).toBe(false);
  });

  it("maps resource names to kinds", () => {
    expect(kindOfResource("deploy")).toBe("Deployment");
    expect(kindOfResource("ingressclasses")).toBe("IngressClass");
    expect(kindOfResource("deployments.apps")).toBe("Deployment");
    expect(kindOfResource("deployments.batch")).toBeNull();
    expect(kindOfResource("widget")).toBeNull();
  });

  it("writes a discovery cache with every group", () => {
    const cache = discoveryCache();
    const groups = JSON.parse(cache["servergroups.json"]!) as { groups: { name: string; preferredVersion: { version: string } }[] };
    expect(groups.groups.find((g) => g.name === "")).toBeDefined();
    expect(groups.groups.find((g) => g.name === "autoscaling")?.preferredVersion.version).toBe("v2");
    const apps = JSON.parse(cache["apps/v1/serverresources.json"]!) as { resources: { name: string }[] };
    expect(apps.resources.map((r) => r.name)).toContain("deployments/scale");
  });
});
