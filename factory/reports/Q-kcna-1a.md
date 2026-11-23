# Q-kcna-1a — KCNA questions, domain fundamentals, prefix `kcna-1a-` (2026-11-23)

## Result
61 `single` questions in `content/kcna/questions/fundamentals/`: 1.1.1 = 13, 1.1.2 = 12, 1.1.3 = 12, 1.1.4 = 12, 1.1.5 = 12. Difficulty 24 / 28 / 9 (39 / 46 / 15 %). Correct positions a 15, b 17, c 16, d 13. Two numeric questions use `shuffle: false` (ascending options). English only.
Checks: `CERT=kcna npx tsx factory/validate.ts --prefix kcna-1a-` 0 problems; `npm run content:validate -- --cert kcna --prefix kcna-1a-` 0 problems, 0 warnings.

## Sources fetched (2026-11-23), used as references
kubernetes.io (v1.37): Kubernetes Components, Cluster Architecture, Cloud Controller Manager, Controllers, Nodes, Communication between Nodes and the Control Plane, Leases, Operating etcd clusters for Kubernetes, Kubernetes Scheduler, The Kubernetes API, API Overview, Kubernetes API Concepts, Objects In Kubernetes, Pods, Init Containers, Static Pods, Create static Pods, Deployments, ReplicaSet, StatefulSets, DaemonSet, Jobs, CronJob, Namespaces, Labels and Selectors, Annotations, Recommended Labels, kubelet (CLI reference), Virtual IPs and Service Proxies, Container Runtime Interface (CRI). etcd.io: FAQ (v3.6, failure-tolerance table).
Also read (not referenced): Kubernetes Object Management, Field Selectors, Garbage Collection, Self-Healing.

## Duplicates avoided (sibling batches written in parallel)
Dropped from my plan because a sibling already tests the same decision: managed service runs the control plane (`kcna-1c-managed-control-plane`), LoadBalancer provisioned by cloud-controller-manager (`kcna-2a-svc-loadbalancer-ccm`), Pods stay Pending when the scheduler is down (`kcna-2c-scheduler-down-pending`), localhost between containers of a Pod (`kcna-2a-net-localhost-same-pod`), kube-proxy role (`kcna-2a-svc-kube-proxy-role`), field selector on `status.phase` (`kcna-2c-field-selector-pending`), log agent as DaemonSet (`kcna-4a-log-agent-daemonset`), kubelet restarts on liveness failure (`kcna-2c-liveness-failure-restart`).
Close but kept (different decision): `kcna-1a-mirror-pod-delete` (deleting a mirror Pod) vs `kcna-2c-static-pod-control-plane` (what runs static Pods); `kcna-1a-deployment-no-replicaset` (controller manager down) vs `kcna-2c-scheduler-down-pending`; `kcna-1a-node-controller-unreachable` (Unknown then eviction after 5 min) vs `kcna-2c-node-status-unknown` (cause) and `kcna-1d-daemonset-tolerations`.

## Doubts / points to review
1. etcd fault tolerance (5 members tolerate 2) comes from the etcd FAQ; the Kubernetes page only says odd number and five members recommended in production.
2. "Self-Healing" page title: the fetch rendered "Kubernetes Self-Healing" as heading while the sidebar shows "Self-Healing"; not used as a reference.
3. `kcna-1a-core-group-apiversion`: the distractor explanation "custom resources are served under a named group" relies on CRD knowledge (spec.group); not re-fetched here (1.1.7 is another batch).
4. `kcna-1a-job-restartpolicy`: "with `Never` the Job creates a new Pod, with `OnFailure` the container restarts in its Pod" is standard Job behaviour; the fetched excerpt confirmed only the allowed values and that the Pod default `Always` is invalid.
5. `kcna-1a-kubelet-watches-bound-pods`: the kubelet reference says Pod specs come "primarily through the apiserver"; the watch mechanism itself is from the API Concepts page, not a kubelet-specific sentence.
6. iptables mode is the default kube-proxy mode in v1.37 (Virtual IPs page); a future release may switch to nftables, so `kcna-1a-iptables-mode-data-path` states the version.
