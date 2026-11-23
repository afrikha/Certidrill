The kube-scheduler decides on which node each new Pod runs. It never starts containers itself, but where a Pod lands decides which other workloads share its kernel, which node credentials can reach its Secrets, and which network it sits on. The exam asks you to recognize the impact of a compromised or misconfigured scheduler, the settings that harden it, and the placement controls that keep workloads of different trust levels apart.

<!-- section: scheduler-role | objectives: 2.3.1 -->
## Role of kube-scheduler and the impact of a compromise

The scheduler watches the API server for Pods that have no node yet (`spec.nodeName` empty). For each one it:

1. **Filters** the nodes that can run the Pod: enough resources, matching `nodeSelector` and node affinity, tolerated taints, free host ports, volume constraints.
2. **Scores** the remaining nodes and picks the best one.
3. **Binds** the Pod to that node by creating a Binding (the `pods/binding` subresource). The kubelet on that node then sees the Pod and starts it.

Like the controller manager, the scheduler talks only to the API server, with its own identity (`system:kube-scheduler`, authorized by the ClusterRole of the same name). It reads Pods, Nodes and volume objects, binds Pods and, for preemption, can evict lower-priority Pods.

| If the scheduler is... | Possible impact |
| --- | --- |
| **Compromised** (stolen credential or code) | Sensitive Pods bound to a node the attacker controls, which then receives their Secrets and ServiceAccount tokens; an attacker's Pod co-located with a target Pod to attack it through the shared kernel; Pods never scheduled or preempted (denial of service) |
| **Misconfigured** (wrong profile, plugin disabled, wrong weights) | Isolation rules ignored, for example untrusted Pods landing on nodes reserved for sensitive workloads; uneven placement that overloads nodes |
| **Bypassed** | A Pod created with `spec.nodeName` already set is never seen by the scheduler: node affinity and `nodeSelector` rules are not evaluated for it |

A second scheduler can also run in the cluster: a Pod chooses it with `spec.schedulerName`. Any component that can bind Pods effectively controls placement, so `create` on `pods/binding` and the right to deploy extra schedulers must be restricted like the scheduler itself.

> **Exam trap.** The scheduler only **assigns** Pods to nodes. It does not create Pods (controllers do), does not start containers (the kubelet does) and does not route traffic (kube-proxy does). A compromised scheduler is a placement threat, not a code-execution threat on its own.

<!-- section: scheduler-hardening | objectives: 2.3.2 -->
## Hardening kube-scheduler

The scheduler serves HTTPS on its **secure port 10259** for health checks and metrics. Its hardening mirrors the controller manager's:

| Control | Setting | Why |
| --- | --- | --- |
| Local-only endpoint | `--bind-address=127.0.0.1` (the default is `0.0.0.0`, every interface) | Only local health probes and agents can reach the port; recommended by hardening guides such as the CIS Kubernetes Benchmark |
| Authenticated callers | `--authentication-kubeconfig` | Callers are checked with TokenReview; if empty, every token request is treated as anonymous |
| Authorized callers | `--authorization-kubeconfig` | Requests are checked with SubjectAccessReview; only `/healthz`, `/readyz` and `/livez` skip authorization by default |
| No profiling endpoint | Profiling disabled (it is on by default) | `/debug/pprof` exposes internal state and costs resources |
| Own, limited identity | A dedicated kubeconfig (`scheduler.conf` in kubeadm) mapped to `system:kube-scheduler` | Least privilege; never an admin credential |
| Protected configuration | Root-only permissions on the configuration file and kubeconfig | Whoever edits them changes placement or steals the scheduler's identity |

The scheduler's behaviour comes from a **KubeSchedulerConfiguration** file passed with `--config`. It defines the scheduling profiles, enabled plugins and their weights, and the client connection (the kubeconfig the scheduler uses).

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
clientConnection:
  kubeconfig: /etc/kubernetes/scheduler.conf
leaderElection:
  leaderElect: true
profiles:
- schedulerName: default-scheduler
```

```bash
kube-scheduler --config=/etc/kubernetes/scheduler-config.yaml \
  --bind-address=127.0.0.1
```

When `--config` is used, deprecated flags such as `--kubeconfig` and `--profiling` are ignored: the configuration file is the source of truth, which is why it must be protected and kept under change control.

> **Exam tip.** Controller manager and scheduler share the same hardening pattern: secure port only (10257 and 10259), bound to localhost, authentication and authorization kubeconfigs set, profiling off, root-only key and config files, a dedicated least-privileged identity.

<!-- section: workload-placement | objectives: 2.3.3 -->
## Keeping trust levels apart with placement rules

Containers on one node share the kernel and the kubelet. To keep untrusted or multi-tenant workloads away from sensitive ones, dedicate node pools to each trust level with four scheduling tools:

| Tool | Set on | Effect |
| --- | --- | --- |
| `nodeSelector` | Pod | The Pod runs only on nodes that have **all** the listed labels |
| Node affinity, `requiredDuringSchedulingIgnoredDuringExecution` | Pod | Hard rule with richer operators (`In`, `NotIn`, `Exists`...) |
| Node affinity, `preferredDuringSchedulingIgnoredDuringExecution` | Pod | Soft preference: the Pod may still land elsewhere, so it is not an isolation control |
| Taint (`NoSchedule`, `PreferNoSchedule`, `NoExecute`) | Node | **Repels** Pods that do not tolerate it; `NoExecute` also evicts running Pods |
| Toleration | Pod | **Allows** (does not require) scheduling on a tainted node |

The classic pattern for **dedicated nodes** uses both sides:

1. Taint the nodes so that other Pods stay off: `kubectl taint nodes node-pay-1 dedicated=payments:NoSchedule`.
2. Label the nodes and give the payments Pods a toleration **plus** a required node affinity (or `nodeSelector`) on that label, so that they cannot land anywhere else.

```yaml
spec:
  tolerations:
  - key: dedicated
    operator: Equal
    value: payments
    effect: NoSchedule
  nodeSelector:
    example.com.node-restriction.kubernetes.io/pci-dss: "true"
```

**Use labels the kubelet cannot set.** If isolation depends on a node label, a compromised node could add that label to itself and attract sensitive Pods. With the Node authorizer and the **NodeRestriction** admission plugin enabled, kubelets cannot set or modify labels with the `node-restriction.kubernetes.io/` prefix, so use that prefix for isolation labels (as in the example above).

**Enforce the rules at admission.** Placement fields are written by whoever creates the Pod. A tenant can omit the `nodeSelector`, add any toleration, or set `spec.nodeName` directly. Enforce the required selector and tolerations per namespace with an admission policy (ValidatingAdmissionPolicy, OPA Gatekeeper or Kyverno), and keep the strongest separation, a separate cluster, for workloads that must never share a control plane.

> **Exam trap.** A taint alone does not keep the tolerating Pods on the dedicated nodes, and a toleration alone does not attract a Pod to them. Dedicated nodes need the taint (keep others off) **and** a node selector or required affinity (keep these Pods on).

<!-- section: key-points -->
## Key points

- kube-scheduler filters, scores and binds Pods to nodes; it talks only to the API server as `system:kube-scheduler`.
- A compromised scheduler can place sensitive Pods on an attacker's node, co-locate attackers with targets, or stop scheduling.
- `spec.nodeName` bypasses the scheduler; `spec.schedulerName` selects another scheduler: restrict who can bind Pods.
- Harden: secure port 10259 bound to `127.0.0.1`, authentication and authorization kubeconfigs, profiling off, protected KubeSchedulerConfiguration file.
- Dedicated nodes: taint plus toleration plus required affinity or `nodeSelector`; preferred affinity is not isolation.
- Isolation labels use the `node-restriction.kubernetes.io/` prefix, protected by NodeRestriction.
- Enforce placement rules with admission policies; separate clusters give the strongest isolation.
