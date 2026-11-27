# C-ckad-4 — CKAD course, chapters 32 and 41 (2026-11-27)

## Result
2 English chapters: `content/ckad/course/chapters/32-monitoring-logs-debugging.en.md` (2,191 words by `wc -w`, code included; objectives 3.3.1–3.5.3) and `41-extensions-access.en.md` (1,765 words; objectives 4.1.1–4.2.3). `check-cert.ts`: 0 problems for these chapters; `content:validate --course --chapters ...`: 0 problems.

## Sources fetched (kubernetes.io, v1.37 docs)
kubectl reference: top pod, top node, logs, debug, events, get, port-forward, api-resources, explain, create role, create rolebinding, auth can-i, config set-context; field-selectors; jsonpath; quick-reference; pod-lifecycle; debug-pods; debug-running-pod; determine-reason-pod-failure; custom-resource-definitions; operator; rbac; pod-security-admission; enforce-standards-namespace-labels; resource-quotas; limit-range; organize-cluster-access-kubeconfig.

## Doubts / not re-verified
- `kubectl debug --profile` default: the v1.37 kubectl reference says `general`; the "Debug Running Pods" task page still says `legacy` is the default if omitted. The chapter does not state the default.
- From knowledge, not re-fetched: event TTL "about one hour" (kube-apiserver `--event-ttl`); `kubectl logs` without `-c` printing `Defaulted container ... out of: ...` and using the `kubectl.kubernetes.io/default-container` annotation; `--rm` valid only when attached; `kubectl edit` saving a rejected edit under `/tmp`; ephemeral containers cannot be changed or removed (concept page); exact wording of quota / LimitRange / PodSecurity error messages (shown as "similar to" patterns); `kubectl config get-contexts -o name`; `kubectl create role` deriving `apiGroups` from `--resource`; Pod Security `restricted` field list.
- `StartError`/`RunContainerError` row was dropped to stay under the word limit; the restart backoff figures (10 s doubling to 300 s, reset after 10 min) are from pod-lifecycle; the alpha `ReduceDefaultCrashLoopBackOffDecay` and beta `KubeletCrashLoopBackOffMax` (per-node cap) are not mentioned.
- Exam context: the profile says each task names an `ssh` host; chapter 41 teaches contexts generically without claiming the exam uses `use-context` per task.
