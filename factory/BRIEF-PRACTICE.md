# Certidrill content factory — practical exercises (CKAD, CKA)

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` first (English only, CNCF sources). This brief adds the role **EXERCISES**: practice tasks for the performance-based exams, checked without a cluster (`docs/SPECS-KUBERNETES-PRATIQUE.md`).

## What an exercise is

A question file of type `command` or `manifest` in `content/<cert>/questions/<domain>/<id>.yaml`. The schemas and the checking engine are in `factory/exercise.ts`; read it fully. Three models, one per kind, to copy:

- `content/ckad/questions/design/ckad-1b-create-deployment-replicas.yaml`: `command`, mode `object`;
- `content/ckad/questions/deployment/ckad-2b-rollout-undo-revision.yaml`: `command`, mode `invocation`;
- `content/ckad/questions/observability/ckad-3b-readiness-liveness-pod.yaml`: `manifest`.

Envelope as for every question (`id` = file name with your prefix, quoted `objective`, `difficulty`, `status: draft`, `stem.en`, `explanation.correct.en`, 1–2 `references` you fetched). No `explanation.options`. No `fr`.

## The two types

- **`command`**: the candidate types **one** command line (no pipe, redirection, `;`, `&&`, `$()`; the engine refuses them). `kubectl` or its alias `k`; `body.tools` lists other tools when the task needs them (`helm`, `kubeadm`, `etcdctl`…).
  - **mode `object`**: the command creates or changes objects. The application runs it with the real kubectl v1.37 in client dry-run (`--dry-run=client -o yaml` is added when missing; on an existing object given in `body.files`, the command is run on that file with `--local -o yaml`). The checks run on the printed objects. Use it for: `kubectl run`, `kubectl create <deployment|job|cronjob|configmap|secret generic|secret tls|secret docker-registry|service clusterip|nodeport|loadbalancer|ingress|role|rolebinding|clusterrole|clusterrolebinding|serviceaccount|namespace|quota|priorityclass|poddisruptionbudget>`, `kubectl expose` and `kubectl set image|env|resources|serviceaccount`, `kubectl label`, `kubectl annotate` on an object given in `body.files`. Every `solution` and `negatives` entry carries `output`: **exactly what `kubectl … --dry-run=client -o yaml` v1.37 prints** for that command (generator defaults included: `app: <name>` labels and selector for `create deployment`, `run: <name>` for `run`, container name taken from the image name for `create deployment` (`nginx:1.27` → `nginx`, `registry.example.com/team/api:1.0` → `api`), `resources: {}`, `strategy: {}`, `status: {}`; leave out `creationTimestamp`). When you are not sure of a default kubectl prints, do not check that field. The application will run every solution through real kubectl in CI: a wrong `output` will be caught later, so be exact.
  - **mode `invocation`**: the command reads or operates (`logs`, `exec`, `top`, `get … -o jsonpath`, `describe`, `rollout undo|restart|status|history|pause|resume`, `scale`, `autoscale`, `auth can-i`, `config use-context|set-context`, `create token`, `debug`, `port-forward`, `api-resources`, `explain`, `helm …`, `kubeadm …`, `etcdctl …`). No `output`. The checks run on the parsed command: `tool`, `verb`, `subverb` (create/set/rollout/config/auth/top/certificate/apply sub-verb), `resource` (normalized singular kind in lower case: `po`, `pods` → `pod`; `deploy` → `deployment`), `names` (from `type/name` or the following arguments), `args` (raw positional arguments after the verb), `flags.<long-name>` (short flags are normalized: `-n` → `namespace`, `-o` → `output`, `-l` → `selector`, `-c` → `container`, `-A` → `all-namespaces`, `-r` → `replicas`, for `logs` `-p` → `previous` and `-f` → `follow`; boolean flags are `true`, others are strings), `rest` (what follows `--`). Run `npx tsx -e 'import("./factory/exercise").then(m=>console.log(m.parseCommand("<your command>", ["kubectl"])))'` to see how a command parses.
- **`manifest`**: the candidate writes YAML in an editor, possibly pre-filled with `body.starter`. Checks run on the parsed documents. Use it when the real task needs a file (probes, volumes, securityContext, NetworkPolicy, Ingress with several rules, multi-container Pods, PVC + Pod…). Several documents are allowed; then every check has `select: {kind, name}`.

## Checks

`{id, label, select?, path, op, value?}`; `label` says in plain English what is verified ("Readiness probe uses port 8080"); it is shown after submission. Paths: dotted keys, `[0]` indexes, `[name=app]` filters on lists, `["app.kubernetes.io/name"]` for keys with dots. Ops: `equals` (numbers and numeric strings compare equal), `notEquals`, `quantity` (Kubernetes quantities: `500m` = `0.5`, `1Gi` = `1073741824`), `exists`, `absent`, `contains` (substring, list element, or sub-object), `subset` (the value is contained in the target), `matches` (regex), `length`, `oneOf`.

**Checks verify the outcome, not one spelling.** Every correct way of doing the task must pass: use `[name=x]` filters rather than indexes when order is free, `quantity` for resources, `oneOf` for equivalent values, `contains` for list elements, and never check a field the task does not ask for. Give at least two `solution` variants when several correct commands or manifests exist (short and long flags, `type/name` and `type name`, `k`, flag order, a different but valid field layout).

**Negatives** (1–4): plausible mistakes a candidate really makes, each of which must **really** be wrong for the task (missing namespace, wrong field, probe types swapped, `port` vs `targetPort`, `Exact` vs `Prefix`, deprecated apiVersion…), with `why`. A negative that would produce the right result is a bug in the task, not a negative: rewrite the stem so the difference matters (for example a non-default value).

## Stems

Like real exam tasks: short, operational, every name given (namespace, object names, image with tag, ports, labels, file names). End a `command` stem with "Type the single command you would run." (or a task-specific variant) and a `manifest` stem with what the file must contain. Facts in the stem that decide the answer are explicit. No trick wording. Invented names (`shop`, `payments`, `registry.example.com`, `example.com`).

## Volume and mix (per task file)

Your task file gives your objectives and counts. Mix across your batch: about 45 % `command` (both modes) and 55 % `manifest`; difficulty 20 % 1, 50 % 2, 30 % 3. Vary what is tested inside an objective: never two exercises on the same fields with the same answer.

## Checks before you finish

- `npx tsx factory/check-exercise.ts <cert> <your prefix>` → `0 problem(s)`;
- `npm run -s content:validate -- --cert <cert> --prefix <your prefix>` → `0 problem(s)` (needs the local schema patch, already applied in this working copy);
- reread every exercise as a candidate: is every name given? would a correct alternative fail a check? is each negative really wrong?

Facts and field names must match kubernetes.io for v1.37: fetch the pages (task pages and the kubectl reference; long kubectl reference pages need WebFetch with `offset` to reach the flag tables). Report doubts in `factory/reports/<task id>.md`.
