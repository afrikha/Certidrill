# Task E-cka-43-lifecycle-helm-kustomize — role EXERCISES, certification CKA, chapter `43-lifecycle-helm-kustomize`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md`, `factory/BRIEF-EN-ONLY.md`, then `factory/BRIEF-PRACTICE.md` **fully** (it defines the exercise types), `factory/exercise.ts`, the three model exercises it names (CKAD models: same format), `factory/profiles/cka.md` and `content/cka/objectives.yaml`. The chapter `content/cka/course/chapters/43-lifecycle-helm-kustomize.en.md` may still be in progress: rely on the official docs, not on it.

Write **4 exercises per objective** in `content/cka/questions/cluster/`: objectives 4.4.1, 4.4.2, 4.4.3, 4.6.1, 4.6.2 (20 exercises). Ids start with the prefix of the objective's competency: `cka-4d-` for 4.4.x, `cka-4f-` for 4.6.x, then a short slug (`cka-4d-etcd-snapshot-save`).

Node and cluster work: use `command` exercises in mode `invocation` with `body.tools` (`kubeadm`, `etcdctl`, `etcdutl`, `crictl`, `systemctl`, `journalctl`, `helm`, `kubectl`), and `manifest` exercises for configuration files (static Pod manifests of control plane components, `KubeletConfiguration`, kubeadm `ClusterConfiguration`/`JoinConfiguration`, the CoreDNS ConfigMap) given broken or incomplete in `body.starter` or `body.files`. Troubleshooting tasks state the symptoms (node conditions, events, log lines, `crictl ps` output) in the stem or `body.files` and ask for the fixing command or corrected file. Check with `npx tsx -e 'import("./factory/exercise").then(m=>console.log(m.parseCommand("<command>", ["etcdctl"])))'` how non-kubectl commands parse (their short flags are kept as written; prefer long flags in checks and accept short ones with `oneOf` paths only if needed).

Mix: about 45 % `command` (both modes) and 55 % `manifest`; difficulty about 15 % 1, 50 % 2, 35 % 3. Cover different tasks inside each objective.

Checks: `npx tsx factory/check-exercise.ts cka cka-4d- cka-4f-` → `0 problem(s)`; `npm run -s content:validate -- --cert cka --prefix cka-4d-` and `--prefix cka-4f-` → `0 problem(s)`. Report doubts in `factory/reports/E-cka-43-lifecycle-helm-kustomize.md`.
