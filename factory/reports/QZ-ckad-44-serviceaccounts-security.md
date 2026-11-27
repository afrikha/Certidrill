# QZ-ckad-44-serviceaccounts-security — report

File: `content/ckad/quizzes/44-serviceaccounts-security.yaml` (10 questions, English only).

- Objectives: 4.7.1 (q1, q7), 4.7.2 (q3, q6, q9), 4.8.1 (q2, q5, q8), 4.8.2 (q4, q10).
- Positions 6-10: 1 `command` (invocation), 4 `manifest`.
- Checks: `check-quiz.ts ckad 44-serviceaccounts-security` → 0 problem(s), 0 warning(s); `check-exercise.ts ckad ckad-qz-44-` → 0 problem(s).

## Pages fetched (kubernetes.io)

kubectl create token, Configure Service Accounts for Pods, Service Accounts, Configure a Security Context for a Pod or Container, Pod (API reference: runAsNonRoot, runAsUser, fsGroup, allowPrivilegeEscalation, seccompProfile), Pod Security Standards, Projected Volumes, CronJob (title only; body truncated).

## Doubts / unverified facts

- q4 multi: the blueprint scores `multi` all or nothing, so the stem has "(Choose two.)" and no scoring NOTE. The K8S brief allows `multi` only if the handbook says such questions exist; the task file allows it explicitly.
- q5 and q10 (negative 4): the `CreateContainerConfigError` status for a root image with `runAsNonRoot: true` comes from the chapter and kubelet behavior; the API reference only says the kubelet "fail[s] to start the container". The status name itself is not on a fetched page.
- q6: `--audience` is of type `strings` (the reference says it may be repeated). A comma-separated `--audience=a,b` is probably valid too (pflag string slice) and passes the checks; not verified on kubernetes.io, so it is not listed as a solution. The audience of the API server (`https://kubernetes.default.svc.cluster.local`) is given in the stem, since it depends on the cluster's issuer configuration.
- q7: the CronJob page body could not be read (truncated); the `spec.jobTemplate.spec.template.spec` nesting and the removal of `batch/v1beta1` in v1.25 are standard and match the chapter.
- q8: "unknown fields" rejection relies on kubectl's default strict field validation (chapter statement), not re-verified for v1.37.
- q10: "a non-root process needs NET_BIND_SERVICE to bind port 443" is stated as the task's requirement; some runtimes lower `net.ipv4.ip_unprivileged_port_start`, so this is the classic assumption, not a universal fact. The `metrics-no-add` check uses a regex on the JSON of `capabilities` so that both an absent `add` and `add: []` pass.

## Chapter / bank remarks

- Chapter, section token-mounting: the table says the kubelet rotates projected tokens "older than 80 % of its lifetime or older than 24 hours" — matches the task page. No error found.
- Chapter, last trap of section capabilities-seccomp: "`allowPrivilegeEscalation` is always true for a container that is privileged or has `SYS_ADMIN`" matches the API reference wording (CAP_SYS_ADMIN). Note that the security-context task page phrases it as "cannot be set in combination", i.e. `false` is inconsistent with those settings; no change needed.
- No bank exercise found wrong.
