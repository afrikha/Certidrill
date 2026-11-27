# QZ-cka-31-deployments-config-autoscaling — report

File: `content/cka/quizzes/31-deployments-config-autoscaling.yaml` (10 questions, `cka-qz-31-01` to `-10`).

- Positions 1–5 (`single`): 3.1.1 (what creates a revision), 3.1.2 (`revisionHistoryLimit: 0`), 3.2.1 (`--from-env-file` and quotation marks), 3.2.2 (`set env --from` versus `envFrom`), 3.3.1 (calculation with two metrics, capped at `maxReplicas`).
- Positions 6–10 (difficulty 3): 06 `command`/object, 3.2.1 (`create secret generic --type=kubernetes.io/basic-auth`, single-quoted `$$`); 07 `command`/object on a file, 3.1.1 (`set image` with two pairs, one of them on an init container, no `*`); 08 `manifest`, 3.1.2 (Recreate to RollingUpdate with a full quota: `maxSurge: 0`, `maxUnavailable: 2`); 09 `manifest`, 3.2.2 (`subPath` file over an image directory + `optional: true` secretKeyRef); 10 `manifest`, 3.3.2 (scale-up stabilization window 120 s + one Pods policy, scale-down two policies over 120 s with `selectPolicy: Min`).
- I compared these with the bank exercises for the six objectives (`content/cka/questions/workloads/cka-3a-*`, `3b-*`, `3c-*`). None repeats a bank task, field set or trap.
- Checks: `check-quiz` 0 problem(s) and 0 warning(s); `check-exercise cka cka-qz-31-` 0 problem(s).

## Facts checked against kubernetes.io or the kubectl source

- Deployments page: only `.spec.template` changes trigger a rollout; `revisionHistoryLimit` 0 removes all history and blocks rollbacks; the rounding of maxSurge and maxUnavailable; the two cannot both be 0; Recreate.
- Configure a Pod to Use a ConfigMap: the env-file rules (quotation marks are kept); `subPath` mounts get no updates; `optional`.
- Secrets page: `kubernetes.io/basic-auth` expects the keys `username` and `password`. The kubectl create secret generic page has the `--type` flag.
- HPA page: the formula; with several metrics the largest proposal wins, but never above the maximum; the default behavior; `selectPolicy` Max, Min and Disabled; `periodSeconds` ≤ 1800.
- kubectl source, `set_image.go`: names are matched in both `InitContainers` and `Containers`, and `*` matches all of them. The kubectl set image page does not say this, so I took it from the source on GitHub.
- kubectl source, `set_env.go`: `--from=configmap/x` writes one `configMapKeyRef` entry per key that exists at run time.

## Doubts and unverified points

- **Object-mode outputs (Q6, Q7) were written by hand**, not produced by kubectl v1.37. Q6 assumes the field order apiVersion, data, kind, metadata, type, with no `type` line when `--type` is absent (as in the bank Secret outputs). Q7 assumes `strategy: {}`, `status: {}` and `resources: {}` on every container and init container, copying the bank's `set resources --local` model. CI will confirm.
- Q6 asks for the key names `username` and `password` because the basic-auth convention expects them. The Secrets page is unclear on this point: its text says `data` "must contain one of" the two keys, while the comments in its example mark both as required. The API server does not reject the `user` key used in negative 2. That negative is wrong for the task as stated, not invalid for the API.
- Q8 negative 2 (`maxSurge: 1`): the rollout would not deadlock. It would progress with FailedCreate events. The `why` says the setting breaks the task's "no Pod above replicas" limit; it does not claim the rollout stalls. Terminating Pods count against the `pods` quota until their grace period ends. This slows the `maxSurge: 0` rollout but does not change the answer.
- Q9 negative 2 (no `subPath`, ConfigMap directory mounted over the image file `/etc/nginx/nginx.conf`): the failure is a runtime mount error, "directory onto a file". I know this from runc behaviour, not from a kubernetes.io page.
- Q9's `subPath` check requires the value `nginx.conf`. A candidate who remaps the key with `items` to another file name and uses that name as `subPath` would be correct but would fail the check. That layout is rare.

## Chapter or bank errors found

- None blocking. A small mismatch on kubernetes.io: the ConfigMap task page names the invalid-key event `InvalidVariableNames` in its prose, but its sample event shows `InvalidEnvironmentVariableNames`. The chapter uses the second name.
