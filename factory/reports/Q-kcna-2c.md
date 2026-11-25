# Q-kcna-2c — KCNA questions, orchestration (2.3.1–2.3.5, 2.4.1) — 2026-11-23

## Result
48 `single` questions in `content/kcna/questions/orchestration/kcna-2c-*.yaml`, 8 per objective. Difficulty 19 easy / 22 medium / 7 hard. Correct options: a 12, b 14, c 12, d 10. English only. `CERT=kcna npx tsx factory/validate.ts --prefix kcna-2c-`: 0 problems; `npm run content:validate -- --cert kcna --prefix kcna-2c-`: 0 problems, 0 warnings.

## Sources fetched (kubernetes.io, 2026-11-23)
Pod Lifecycle; Configure Liveness, Readiness and Startup Probes; Liveness, Readiness, and Startup Probes; Debug Pods; Debug Running Pods; Debug Services; Debugging DNS Resolution; Debug Init Containers; Determine the Reason for Pod Failure; Troubleshooting Clusters; Node Status; Node-pressure Eviction; Taints and Tolerations; Kubernetes API health endpoints; Create static Pods; Debugging Kubernetes nodes with crictl; Troubleshooting kubeadm; kubectl events / describe / get; kube-apiserver (`--event-ttl` default 1h0m0s); Field Selectors; Images (ImagePullBackOff, 300 s cap); Resource Management for Pods and Containers (OOMKilled, exit 137); Volumes; Volume Types; Ephemeral Volumes; Projected Volumes.

## Facts worth flagging
- Volume Types (v1.37): `gitRepo` is not included in 1.37 (last usable in v1.35, deprecated since v1.11); documented alternative = init container cloning into an `emptyDir`. Used as a wrong option only.
- Pod Lifecycle now says that when a node dies or is disconnected, Kubernetes sets the phase of its Pods to `Failed`, while the phase table still defines `Unknown` as "state could not be obtained, typically a communication error with the node". The course (23-troubleshooting) table says Unknown is "usually because the node is unreachable", which is consistent with the table. My question `kcna-2c-phase-unknown` uses the table's definition only.
- CrashLoopBackOff back-off reset after 10 minutes of successful running (Pod Lifecycle). Alpha/beta gates change the back-off (ReduceDefaultCrashLoopBackOffDecay, KubeletCrashLoopBackOffMax); questions use the default 10 s → 300 s only.
- Individual health-check endpoints (`/livez/<check>`) are listed as alpha in v1.37 on the health-checks page; not tested.

## Doubts / not fully verified
1. Probe field defaults (periodSeconds 10, failureThreshold 3, timeoutSeconds 1) could not be read on the fetched part of the pages (only `timeoutSeconds` 1 s was confirmed). No question depends on them: the startup-window question states its values.
2. `journalctl -u kubelet` is not printed verbatim on the fetched pages (Troubleshooting Clusters says only that systemd systems use journalctl for the kubelet logs). Standard command, used as the answer of `kcna-2c-kubelet-journalctl`.
3. `kcna-2c-init-crashloopbackoff` shows RESTARTS 5 for a Pod whose init container crash-loops; kubectl counts init container restarts in that column (from knowledge, not re-fetched). The explanation does not rely on the number.
4. Near-overlaps with other batches, kept because the decision differs: `kcna-2c-svc-wrong-targetport` (fix a refused connection) vs `kcna-2a-svc-targetport` (what targetPort defines); `kcna-2c-svc-check-endpointslices` (command to inspect endpoints) vs `kcna-2a-svc-endpointslice` (which object lists them); `kcna-2c-pending-insufficient-memory` (read a FailedScheduling event vs OOMKilled/eviction) vs `kcna-1c-requests-not-usage` (requests, not usage).
