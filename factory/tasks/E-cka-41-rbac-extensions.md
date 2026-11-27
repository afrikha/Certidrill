# Task E-cka-41-rbac-extensions — role EXERCISES, certification CKA, chapter `41-rbac-extensions`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md`, `factory/BRIEF-EN-ONLY.md`, then `factory/BRIEF-PRACTICE.md` **fully** (it defines the exercise types), `factory/exercise.ts`, the three model exercises it names (CKAD models: same format), `factory/profiles/cka.md` and `content/cka/objectives.yaml`. The chapter `content/cka/course/chapters/41-rbac-extensions.en.md` may still be in progress: rely on the official docs, not on it.

Write **4 exercises per objective** in `content/cka/questions/cluster/`: objectives 4.1.1, 4.1.2, 4.7.1, 4.7.2, 4.8.1, 4.8.2 (24 exercises). Ids start with the prefix of the objective's competency: `cka-4a-` for 4.1.x, `cka-4g-` for 4.7.x, `cka-4h-` for 4.8.x, then a short slug (`cka-4d-etcd-snapshot-save`).

Node and cluster work: use `command` exercises in mode `invocation` with `body.tools` (`kubeadm`, `etcdctl`, `etcdutl`, `crictl`, `systemctl`, `journalctl`, `helm`, `kubectl`), and `manifest` exercises for configuration files (static Pod manifests of control plane components, `KubeletConfiguration`, kubeadm `ClusterConfiguration`/`JoinConfiguration`, the CoreDNS ConfigMap) given broken or incomplete in `body.starter` or `body.files`. Troubleshooting tasks state the symptoms (node conditions, events, log lines, `crictl ps` output) in the stem or `body.files` and ask for the fixing command or corrected file. Check with `npx tsx -e 'import("./factory/exercise").then(m=>console.log(m.parseCommand("<command>", ["etcdctl"])))'` how non-kubectl commands parse (their short flags are kept as written; prefer long flags in checks and accept short ones with `oneOf` paths only if needed).

Mix: about 45 % `command` (both modes) and 55 % `manifest`; difficulty about 15 % 1, 50 % 2, 35 % 3. Cover different tasks inside each objective.

Checks: `npx tsx factory/check-exercise.ts cka cka-4a- cka-4g- cka-4h-` → `0 problem(s)`; `npm run -s content:validate -- --cert cka --prefix cka-4a-` and `--prefix cka-4g-` and `--prefix cka-4h-` → `0 problem(s)`. Report doubts in `factory/reports/E-cka-41-rbac-extensions.md`.
