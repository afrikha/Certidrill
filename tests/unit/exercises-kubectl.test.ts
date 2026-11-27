/**
 * The mode `object` with the real kubectl (docs/SPECS-KUBERNETES-PRATIQUE.md
 * §3.4, §3.5): one test per sub-command of OBJECT_COMMANDS, run offline, and
 * the security rules (no shell, no server, no credentials).
 *
 * Needs kubectl v1.37 (KUBECTL_BIN or /usr/local/bin/kubectl): installed in
 * CI, where a missing binary fails these tests instead of skipping them.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { KUBECTL_LIMITS, kubectlBinary, OBJECT_COMMANDS, planKubectl, runObjectCommand, safeRelativePath } from "@/lib/exercises/kubectl";

const bin = kubectlBinary();
if (!bin && process.env.CI && process.platform === "linux") throw new Error("kubectl v1.37 must be installed in CI (KUBECTL_BIN or /usr/local/bin/kubectl)");
const withKubectl = bin ? describe : describe.skip;

const deployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: shop
  labels: {app: web}
spec:
  replicas: 2
  selector: {matchLabels: {app: web}}
  template:
    metadata: {labels: {app: web}}
    spec:
      serviceAccountName: default
      containers:
      - name: nginx
        image: nginx:1.26
`;
const service = `apiVersion: v1
kind: Service
metadata: {name: web, namespace: shop}
spec:
  selector: {app: old}
  ports: [{port: 80}]
`;
const rolebinding = `apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata: {name: readers, namespace: shop}
roleRef: {apiGroup: rbac.authorization.k8s.io, kind: Role, name: reader}
subjects: []
`;
const files = [
  { name: "deploy.yaml", content: deployment + "---\n" + service + "---\n" + rolebinding },
  { name: "app.properties", content: "color=blue\nsize=10\n" },
  { name: "app.env", content: "MODE=prod\n" },
];

// A throwaway certificate for `create secret tls` (kubectl checks the key pair).
const tlsDir = mkdtempSync(path.join(tmpdir(), "certidrill-tls-"));
let tls: { crt: string; key: string } | null = null;
try {
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", path.join(tlsDir, "k"), "-out", path.join(tlsDir, "c"), "-subj", "/CN=example.com", "-days", "1"], { stdio: "ignore" });
  tls = { crt: readFileSync(path.join(tlsDir, "c"), "utf8"), key: readFileSync(path.join(tlsDir, "k"), "utf8") };
} catch {
  tls = null;
}
afterAll(() => rmSync(tlsDir, { recursive: true, force: true }));

const run = (command: string, extra: { name: string; content: string }[] = []) => runObjectCommand(command, { namespace: "default", files: [...files, ...extra] });
async function objects(command: string, extra?: { name: string; content: string }[]) {
  const r = await run(command, extra);
  if (!r.ok) throw new Error(`${command}: ${r.error}`);
  return r.docs;
}

/** One case per sub-command of OBJECT_COMMANDS: a command and what kubectl must print. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the cases read deep fields of the printed objects
const CASES: Record<string, { command: string; expect: (docs: Record<string, any>[]) => void }> = {
  run: {
    command: "kubectl run probe --image=busybox:1.36 --restart=Never -n shop --labels=app=probe -- sleep 3600",
    expect: ([pod]) => {
      expect(pod).toMatchObject({ kind: "Pod", metadata: { name: "probe", namespace: "shop", labels: { app: "probe" } }, spec: { restartPolicy: "Never" } });
      expect(pod!.spec.containers[0]).toMatchObject({ image: "busybox:1.36", args: ["sleep", "3600"] });
    },
  },
  expose: {
    command: "kubectl expose deployment web -n shop --port=80 --target-port=8080 --name=web-svc",
    expect: ([svc]) => expect(svc).toMatchObject({ kind: "Service", metadata: { name: "web-svc" }, spec: { selector: { app: "web" }, ports: [{ port: 80, targetPort: 8080 }] } }),
  },
  label: {
    command: "kubectl label deploy web tier=frontend -n shop",
    expect: ([d]) => expect(d).toMatchObject({ kind: "Deployment", metadata: { name: "web", labels: { app: "web", tier: "frontend" } } }),
  },
  annotate: {
    command: "kubectl annotate deployment/web owner=team-a -n shop",
    expect: ([d]) => expect(d).toMatchObject({ kind: "Deployment", metadata: { annotations: { owner: "team-a" } } }),
  },
  "create deployment": {
    command: "kubectl create deployment web --image=nginx:1.27 --replicas=3 -n shop",
    expect: ([d]) => expect(d).toMatchObject({ kind: "Deployment", metadata: { name: "web", namespace: "shop" }, spec: { replicas: 3 } }),
  },
  "create deploy": { command: "k create deploy api --image=registry.example.com/team/api:1.0", expect: ([d]) => expect(d!.spec.template.spec.containers[0].name).toBe("api") },
  "create job": { command: "kubectl create job once --image=busybox -- date", expect: ([j]) => expect(j).toMatchObject({ kind: "Job", apiVersion: "batch/v1" }) },
  "create cronjob": {
    command: `kubectl create cronjob nightly --image=busybox --schedule="0 2 * * *" -- date`,
    expect: ([c]) => expect(c).toMatchObject({ kind: "CronJob", spec: { schedule: "0 2 * * *" } }),
  },
  "create cj": { command: `kubectl create cj c --image=busybox --schedule="*/5 * * * *"`, expect: ([c]) => expect(c!.kind).toBe("CronJob") },
  "create configmap": {
    command: "kubectl create configmap app --from-file=app.properties --from-literal=a=b",
    expect: ([c]) => expect(c).toMatchObject({ kind: "ConfigMap", data: { "app.properties": "color=blue\nsize=10\n", a: "b" } }),
  },
  "create configmap --from-env-file": { command: "kubectl create configmap env --from-env-file=app.env", expect: ([c]) => expect(c!.data).toEqual({ MODE: "prod" }) },
  "create cm": { command: "kubectl create cm settings --from-file=props=app.properties", expect: ([c]) => expect(Object.keys(c!.data)).toEqual(["props"]) },
  "create secret": {
    command: "kubectl create secret generic db --from-literal=password=s3cret",
    expect: ([s]) => expect(s).toMatchObject({ kind: "Secret", data: { password: Buffer.from("s3cret").toString("base64") } }),
  },
  "create secret docker-registry": {
    command: "kubectl create secret docker-registry regcred --docker-server=registry.example.com --docker-username=u --docker-password=p",
    expect: ([s]) => expect(s).toMatchObject({ type: "kubernetes.io/dockerconfigjson" }),
  },
  "create service": { command: "kubectl create service nodeport web --tcp=80:8080 --node-port=30080", expect: ([s]) => expect(s).toMatchObject({ spec: { type: "NodePort", ports: [{ nodePort: 30080 }] } }) },
  "create svc": { command: "kubectl create svc clusterip api --tcp=443:8443", expect: ([s]) => expect(s).toMatchObject({ spec: { type: "ClusterIP" } }) },
  "create ingress": {
    command: `kubectl create ingress web --class=nginx --rule="shop.example.com/api*=api:8080" -n shop`,
    expect: ([i]) => expect(i).toMatchObject({ kind: "Ingress", spec: { ingressClassName: "nginx", rules: [{ host: "shop.example.com", http: { paths: [{ path: "/api", pathType: "Prefix" }] } }] } }),
  },
  "create ing": { command: `kubectl create ing w --rule="a.example.com/=svc:80"`, expect: ([i]) => expect(i!.kind).toBe("Ingress") },
  "create role": {
    command: "kubectl create role reader --verb=get,list --resource=pods,deployments.apps,deployments/scale -n shop",
    expect: ([r]) => expect(r!.rules).toEqual(expect.arrayContaining([expect.objectContaining({ apiGroups: ["apps"], resources: expect.arrayContaining(["deployments"]) })])),
  },
  "create rolebinding": { command: "kubectl create rolebinding rb --role=reader --user=alice -n shop", expect: ([b]) => expect(b).toMatchObject({ kind: "RoleBinding", subjects: [{ kind: "User", name: "alice" }] }) },
  "create clusterrole": { command: "kubectl create clusterrole pv-reader --verb=get --resource=pv,sc", expect: ([r]) => expect(r!.rules.map((x: { apiGroups: string[] }) => x.apiGroups[0]).sort()).toEqual(["", "storage.k8s.io"]) },
  "create clusterrolebinding": { command: "kubectl create clusterrolebinding crb --clusterrole=view --group=ops", expect: ([b]) => expect(b).toMatchObject({ subjects: [{ kind: "Group", name: "ops" }] }) },
  "create serviceaccount": { command: "kubectl create serviceaccount builder -n ci", expect: ([s]) => expect(s).toMatchObject({ kind: "ServiceAccount", metadata: { namespace: "ci" } }) },
  "create sa": { command: "kubectl create sa deployer", expect: ([s]) => expect(s!.kind).toBe("ServiceAccount") },
  "create namespace": { command: "kubectl create namespace staging", expect: ([n]) => expect(n).toMatchObject({ kind: "Namespace", metadata: { name: "staging" } }) },
  "create ns": { command: "kubectl create ns qa", expect: ([n]) => expect(n!.kind).toBe("Namespace") },
  "create quota": { command: "kubectl create quota q --hard=pods=10,requests.cpu=2 -n shop", expect: ([q]) => expect(q).toMatchObject({ kind: "ResourceQuota", spec: { hard: { pods: "10", "requests.cpu": "2" } } }) },
  "create resourcequota": { command: "kubectl create resourcequota q2 --hard=pods=1", expect: ([q]) => expect(q!.kind).toBe("ResourceQuota") },
  "create priorityclass": { command: `kubectl create priorityclass high --value=1000 --description="critical"`, expect: ([p]) => expect(p).toMatchObject({ kind: "PriorityClass", value: 1000 }) },
  "create pc": { command: "kubectl create pc low --value=10 --preemption-policy=Never", expect: ([p]) => expect(p).toMatchObject({ preemptionPolicy: "Never" }) },
  "create poddisruptionbudget": {
    command: "kubectl create poddisruptionbudget web --selector=app=web --min-available=1",
    expect: ([p]) => expect(p).toMatchObject({ kind: "PodDisruptionBudget", spec: { minAvailable: 1 } }),
  },
  "create pdb": { command: "kubectl create pdb api --selector=app=api --max-unavailable=25%", expect: ([p]) => expect(p).toMatchObject({ spec: { maxUnavailable: "25%" } }) },
  "set image": {
    command: "kubectl set image deployment/web nginx=nginx:1.27 -n shop",
    expect: ([d]) => expect(d!.spec.template.spec.containers[0].image).toBe("nginx:1.27"),
  },
  "set env": { command: "kubectl set env deployment web MODE=debug -n shop", expect: ([d]) => expect(d!.spec.template.spec.containers[0].env).toEqual([{ name: "MODE", value: "debug" }]) },
  "set resources": {
    command: "kubectl -n shop set resources deploy web --limits=cpu=200m,memory=256Mi --requests=cpu=100m",
    expect: ([d]) => expect(d!.spec.template.spec.containers[0].resources).toEqual({ limits: { cpu: "200m", memory: "256Mi" }, requests: { cpu: "100m" } }),
  },
  "set serviceaccount": { command: "kubectl set serviceaccount deployment web builder -n shop", expect: ([d]) => expect(d!.spec.template.spec.serviceAccountName).toBe("builder") },
  "set sa": { command: "kubectl --namespace=shop set sa deploy/web runner", expect: ([d]) => expect(d!.spec.template.spec.serviceAccountName).toBe("runner") },
  "set selector": { command: "kubectl set selector service web app=web -n shop", expect: ([s]) => expect(s!.spec.selector).toEqual({ app: "web" }) },
  "set subject": { command: "kubectl set subject rolebinding readers -n shop --serviceaccount=shop:builder", expect: ([b]) => expect(b!.subjects).toEqual([{ kind: "ServiceAccount", name: "builder", namespace: "shop" }]) },
};

describe("the allowlist", () => {
  it("has a test case for every sub-command", () => {
    const listed = Object.entries(OBJECT_COMMANDS).flatMap(([verb, sub]) => (sub === true ? [verb] : sub.map((s) => `${verb} ${s}`)));
    const covered = new Set(Object.keys(CASES).map((k) => k.split(" ").slice(0, 2).join(" ")));
    expect(listed.filter((c) => !covered.has(c))).toEqual([]);
  });
});

withKubectl("kubectl v1.37 offline: one sub-command per test", () => {
  it("is kubectl v1.37", () => {
    expect(execFileSync(bin!, ["version", "--client"], { encoding: "utf8" })).toMatch(/Client Version: v1\.37\./);
  });

  it.each(Object.entries(CASES))("%s", async (_, c) => {
    c.expect(await objects(c.command));
  });

  it("create secret tls", async () => {
    if (!tls) return expect.fail("openssl is needed to make a test certificate");
    const [s] = await objects("kubectl create secret tls web-tls --cert=tls.crt --key=tls.key", [
      { name: "tls.crt", content: tls.crt },
      { name: "tls.key", content: tls.key },
    ]);
    expect(s).toMatchObject({ kind: "Secret", type: "kubernetes.io/tls" });
  });

  it("replaces --dry-run=server or none and any output format", async () => {
    const [d] = await objects("kubectl create deployment web --image=nginx --dry-run=server -o name");
    expect(d!.kind).toBe("Deployment");
    expect((await objects("kubectl create ns a --dry-run=none -ojson"))[0]!.kind).toBe("Namespace");
  });

  it("reads an object of the files given with -f, the candidate's way", async () => {
    const [d] = await objects("kubectl label -f deploy-only.yaml tier=fe", [{ name: "deploy-only.yaml", content: deployment }]);
    expect((d as { metadata: { labels: unknown } }).metadata.labels).toEqual({ app: "web", tier: "fe" });
  });

  it("refuses an object that is only in the cluster", async () => {
    expect(await run("kubectl label pod other a=b")).toMatchObject({ ok: false, error: expect.stringMatching(/not in the files/) });
  });

  it("looks for an object in the namespace of -n or of the context, as kubectl on a cluster", async () => {
    expect(await run("kubectl label deploy web tier=fe")).toMatchObject({ ok: false, error: expect.stringMatching(/not found in namespace "default"/) });
    expect(await run("kubectl label deploy web tier=fe -n kube-system")).toMatchObject({ ok: false, error: expect.stringMatching(/not found in namespace "kube-system"/) });
    expect((await objects("kubectl -n shop label deploy web tier=fe"))[0]!.kind).toBe("Deployment");
    const inShop = await runObjectCommand("kubectl label deploy web tier=fe", { files, namespace: "shop" }, { bin: bin! });
    expect(inShop.ok).toBe(true);
  });

  it("returns kubectl's error, without the paths of the run", async () => {
    const r = await run("kubectl create deployment web --image=nginx --bogus-flag");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/unknown flag: --bogus-flag/);
      expect(r.error).not.toMatch(/certidrill-kubectl/);
    }
  });

  it("never reaches a server: --server refused, kubeconfig and token dropped", async () => {
    expect(await run("kubectl create ns a --server=https://evil.example.com")).toMatchObject({ ok: false, error: "--server is not allowed" });
    expect(await run("kubectl create ns a -s https://evil.example.com")).toMatchObject({ ok: false, error: "--server is not allowed" });
    const r = await run("kubectl create ns a --kubeconfig=/root/.kube/config --token=abc --context=prod --as=admin");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.argv.join(" ")).not.toMatch(/\/root\/.kube|--token|--context|--as=/);
      expect(r.argv.filter((a) => a.startsWith("--kubeconfig="))).toHaveLength(1);
    }
  });

  it("only reads files of the working directory", async () => {
    for (const cmd of [
      "kubectl create configmap x --from-file=/etc/passwd",
      "kubectl create configmap x --from-file=k=/etc/hostname",
      "kubectl create configmap x --from-file=../../etc/passwd",
      "kubectl create secret generic x --from-env-file=~/.bashrc",
      "kubectl label -f https://example.com/x.yaml a=b",
    ]) {
      expect(await run(cmd)).toMatchObject({ ok: false, error: expect.stringMatching(/working directory/) });
    }
    expect(safeRelativePath("a/b.yaml")).toBe(true);
    expect(safeRelativePath("a/../../b")).toBe(false);
  });

  it("refuses the other commands, which would need a cluster or run something", async () => {
    for (const cmd of ["kubectl apply -f deploy.yaml", "kubectl delete pod web", "kubectl get pods", "kubectl create -f deploy.yaml", "kubectl create token builder", "kubectl exec web -- id", "kubectl plugin-name", "kubectl set image-x deploy/web a=b"]) {
      expect((await run(cmd)).ok, cmd).toBe(false);
    }
  });

  it("is not a shell: operators are refused, a quoted operator is a plain argument", async () => {
    expect(await run("kubectl create ns a; touch /tmp/pwned")).toMatchObject({ ok: false, error: expect.stringMatching(/shell operator/) });
    const [c] = await objects(`kubectl create configmap x --from-literal="cmd=echo hi; rm -rf / | cat"`);
    expect(c!.data).toEqual({ cmd: "echo hi; rm -rf / | cat" });
  });

  it("runs with an empty environment and no credentials of the application", async () => {
    process.env.KUBECONFIG = "/root/.kube/config";
    process.env.SECRET_FOR_TEST = "leak";
    try {
      const plan = planKubectl("kubectl create ns a", { files: [] }, { kubeconfig: "/k", cacheDir: "/c" });
      expect(plan).toMatchObject({ ok: true, plan: { argv: ["create", "ns", "a", "--validate=false", "--dry-run=client", "--output=yaml", "--kubeconfig=/k", "--cache-dir=/c", "--request-timeout=1s"] } });
      // The secret is not visible to kubectl: `run --env` from the environment is not possible, and the
      // printed object only holds what the command says.
      const [p] = await objects("kubectl run x --image=busybox --env=A=$B".replace("$B", "b"));
      expect(JSON.stringify(p)).not.toMatch(/leak/);
    } finally {
      delete process.env.KUBECONFIG;
      delete process.env.SECRET_FOR_TEST;
    }
  });

  it("queues runs beyond the limit and gives up after the wait", async () => {
    expect(KUBECTL_LIMITS).toMatchObject({ timeoutMs: 5000, maxOutputBytes: 1048576, maxConcurrent: 4, queueWaitMs: 10000 });
    const many = await Promise.all(Array.from({ length: 10 }, (_, i) => run(`kubectl create ns n${i}`)));
    expect(many.every((r) => r.ok)).toBe(true);
    const slow = Array.from({ length: 4 }, () => runObjectCommand("kubectl create ns a", { namespace: "default", files: [] }));
    await expect(runObjectCommand("kubectl create ns b", { namespace: "default", files: [] }, { queueWaitMs: 1 })).rejects.toThrow(/retry/);
    await Promise.all(slow);
  });
});
