# Q-kcna-3b — KCNA questions, domain delivery, objectives 3.2.1–3.2.5 (2026-11-23)

## Result
50 `single` questions in `content/kcna/questions/delivery/kcna-3b-*.yaml`, 10 per objective. Difficulty 20 easy / 22 medium / 8 hard. Correct answers: a 12, b 13, c 11, d 14. `CERT=kcna npx tsx factory/validate.ts --prefix kcna-3b-`: 0 problems. `content:validate`: 0 problems, 0 warnings.

## Sources fetched (kubernetes.io, v1.37 docs)
kubectl logs / exec / debug / port-forward / proxy / events / rollout status / rollout history reference pages. Logging Architecture, Debug Running Pods, Debug Pods, Ephemeral Containers, Use Port Forwarding to Access Applications in a Cluster, Images, Configure a Pod to Use a ConfigMap, Secrets, Define a Command and Arguments for a Container, Resource Management for Pods and Containers, Pod Lifecycle, Deployments. Every reference points to one of these pages.

## Avoiding duplicates
Before finishing, I compared my questions with the stems of the other prefixes. I replaced 12 drafts because they tested the same decision, with the same answer, as an existing question:
- `kcna-3a-rollout-status`, `kcna-3a-rollout-undo`, `kcna-3a-undo-to-revision`
- `kcna-1b-optional-configmap-ref`, `kcna-1e-pod-args-only`
- `kcna-4a-log-rotation-latest-file`, `kcna-4a-log-stdout`
- `kcna-1d-image-pull-secrets`
- `kcna-2c-oomkilled-exit-137` and the 1c memory limit and CPU throttling questions
- `kcna-2c-pending-insufficient-memory`, `kcna-1c-memory-400m-pitfall`

Overlaps that remain, each testing a different decision:
- `cfg-pull-secret-namespace` (the namespace rule) and `kcna-1d-image-pull-secrets` (which field to use).
- `ro-history-revision-detail` (the `--revision=N` detail) and `kcna-3a-rollout-history` (listing revisions).
- `cfg-allocatable-cpu` (allocatable vs capacity, with low node usage) and `kcna-2c-pending-insufficient-memory`.
- `ro-quota-failedcreate` (Deployment conditions during a rollout) and `kcna-1c-quota-replicaset-events` (where to find the reason).
- `cfg-deployment-exit-zero` (why a Deployment restarts a container that exits 0) and the 1a Job questions (which workload to choose).

Questions written later by other agents were not rechecked.

## Doubts / not fully verified
1. `CreateContainerConfigError` does not appear on any kubernetes.io page I fetched, and kubelet's `sync_result.go` did not show it either. No question uses this status. The missing Secret and ConfigMap questions describe the documented behavior instead: the Pod does not start, the kubelet retries and records an event.
2. Default `kubectl debug` profile: the reference page says `general`, while the "Debug Running Pods" task says `legacy`. No question tests profiles.
3. `logs-max-requests` says kubectl "refuses to follow" more than 5 streams. The reference gives only the flag and its default of 5, not the refusal message, so the stem paraphrases the behavior.
4. `pf-service-one-pod` and `pf-session-ends` say the forwarded traffic does not go through the Service's virtual IP or kube-proxy. This follows from "a pod will be selected automatically" and "the session ends when the selected pod terminates" in the port-forward reference; no page says it in so many words.
5. On the Debug Pods page, the "misspelled `command` is silently ignored" advice conflicts with strict field validation as kubectl's default (`kcna-1b-unknown-field-strict`). It was not used.
6. The ConfigMap task page names the event for invalid `envFrom` keys inconsistently (`InvalidVariableNames` vs `InvalidEnvironmentVariableNames`). Recent releases also relaxed env var name validation. Not used.
7. `cfg-shell-command` paraphrases the runtime error ("no executable has that whole string as its name") and does not quote an exact message.
8. A few explanations use standard behavior that the fetched pages state only indirectly:
   - A failing readiness probe never restarts a container.
   - `--since-time` expects RFC3339 (stated in the flag text).
   - `MB` is not a Kubernetes quantity suffix.
   - `terminationGracePeriodSeconds` is used in a distractor.
