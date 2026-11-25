# Q-kcna-1c — KCNA questions, fundamentals 1.2.4–1.3.2 (2026-11-23)

## Result
60 `single` questions, prefix `kcna-1c-`, in `content/kcna/questions/fundamentals/`: 12 each for 1.2.4, 1.2.5, 1.2.6, 1.3.1, 1.3.2. Difficulty 24 easy / 27 medium / 9 hard. Correct options a 14, b 16, c 16, d 14. `CERT=kcna npx tsx factory/validate.ts --prefix kcna-1c-`: 0 problems. `npm run content:validate -- --cert kcna --prefix kcna-1c-`: 0 problems, 0 warnings.

## Sources fetched (all used as references)
kubernetes.io: releases, version-skew-policy, patch-releases, releases/release; setup (Getting started), production-environment, create-cluster-kubeadm, kubeadm reference, kubeadm-upgrade, tasks/tools; safely-drain-node, kubectl drain, kubectl cordon, nodes, disruptions; resource-quotas, limit-range; kube-scheduler, scheduling-framework, scheduler config, configure-multiple-schedulers, assign-pod-node, pod-lifecycle; manage-resources-containers, pod-qos, quality-service-pod. CNCF: software-conformance page.

## Overlap with other batches (checked against the 500+ KCNA files present)
Four of my first drafts duplicated decisions already tested elsewhere, so I replaced them: `nodeName` bypasses the scheduler (kcna-1d-nodename-bypass), the kubeadm control-plane taint (kcna-1d-control-plane-taint / taint-remove), CPU limit → throttling (kcna-3b-cfg-cpu-throttle), and memory limit → OOMKilled (kcna-2c-oomkilled-exit-137). The replacements are Pod network CIDR overlap, ImageLocality scoring, a single-container Burstable Pod, and eviction above the request. Close but different decisions that I kept: `kcna-1c-requests-not-usage` (requests, not actual usage) vs `kcna-2c-pending-insufficient-memory` (request larger than the free allocatable memory); `kcna-1c-quota-pods-exceeded` (rejected with 403, not Pending) vs `kcna-2b-quota-rejected-admission` (which stage rejects it).

## Doubts / points to watch
- Patch support: kubernetes.io/releases says "approximately 1 year"; the patch-releases page says about 14 months (12 months standard support plus 2 months of maintenance mode). The question uses "about one year", and its distractors are far from both figures (3 months, 6 months, 3 years).
- The releases page says that three minor releases are maintained (1.37/1.36/1.35), but its history table still lists 1.34 (EOL 2026-10-27, already past). The question uses "three most recent".
- The quota rejection showing in the ReplicaSet events (`kcna-1c-quota-replicaset-events`) comes from the fact-checked course chapter and standard controller behavior. The fetched quota page does not spell it out.
- The `Ready,SchedulingDisabled` status shown for a cordoned node is standard kubectl output. The fetched pages only say "marked unschedulable" (and NodeUnschedulable filters `.spec.unschedulable`).
- I avoided exact FailedScheduling message strings because their wording varies between versions.
- I did not use kind or minikube project sites (kind.sigs.k8s.io and minikube.sigs.k8s.io are not in the CNCF docsHosts). Their descriptions come from kubernetes.io/docs/tasks/tools.
