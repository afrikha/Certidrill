A **denial of service** (DoS) attack makes a system unavailable to its legitimate users. In Kubernetes it can come from inside, a Pod that consumes all the memory of a node or a client that floods the API server, or from outside, traffic aimed at an exposed Service. It can be malicious or accidental: a buggy workload with no limits has the same effect as an attacker. The exam asks you to match each kind of exhaustion to the control that contains it.

<!-- section: resource-exhaustion | objectives: 4.3.1 -->
## Resource exhaustion on nodes and workloads

Containers on a node share its CPU, memory, process IDs and disk. Without limits, one container can starve every other Pod on the node, and the node itself.

| Control | Scope | What it does |
| --- | --- | --- |
| **Requests** | Container | The amount the scheduler reserves on a node. Prevents overcommitting a node at scheduling time |
| **Limits** | Container | The maximum the container can use. A container above its **memory** limit is killed (OOM); above its **CPU** limit it is **throttled** |
| **LimitRange** | Namespace | Sets **default** requests and limits for containers that do not declare them, and **minimum and maximum** values per container or Pod |
| **ResourceQuota** | Namespace | Caps the **total** consumption of a namespace (`requests.cpu`, `limits.memory`, storage) and the **number of objects** (`pods`, `count/secrets`, `services.loadbalancers`) |
| **PID limits** | Pod, node | The kubelet can cap the number of processes per Pod, so a fork bomb cannot exhaust the node's process IDs |
| **Node-pressure eviction** | Node | The kubelet evicts Pods when memory, disk or PIDs run low, starting with those that exceed their requests |

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: shop
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.cpu: "16"
    limits.memory: 32Gi
    pods: "50"
    count/secrets: "100"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: container-defaults
  namespace: shop
spec:
  limits:
  - type: Container
    default:
      cpu: 500m
      memory: 512Mi
    defaultRequest:
      cpu: 100m
      memory: 128Mi
    max:
      cpu: "2"
      memory: 2Gi
```

A creation or update that would exceed a quota is rejected with **403 Forbidden**. When a quota covers `cpu` or `memory`, every new Pod must declare requests or limits for that resource, otherwise it is rejected: a LimitRange that sets defaults avoids this. A quota change never affects objects that already exist.

Quotas on object counts also matter: the RBAC good practices note that users who can create objects can create enough large or numerous objects to exhaust etcd, and recommend object count quotas. Individual Secrets are limited to 1 MiB for the same reason.

> **Exam trap.** **LimitRange** works per container or Pod (defaults, min, max); **ResourceQuota** works per namespace (totals and counts). "Stop one team from consuming the whole cluster" is ResourceQuota; "give every container a memory limit even when the developer forgot it" is LimitRange.

> **Exam tip.** A CPU limit cannot kill a container: CPU is compressible, so the container is throttled. Memory is not compressible, so exceeding the memory limit ends in an OOM kill.

<!-- section: control-plane-dos | objectives: 4.3.2 -->
## Denial of service against the control plane

Every component and workload depends on the **API server** and **etcd**. If either is overloaded, nothing can be scheduled, scaled or repaired, even if the running Pods are healthy.

Threats to the control plane:

- A client, controller or operator in a loop that sends a flood of requests (`list` across all namespaces is especially expensive).
- Many or very large objects stored in etcd, which exhaust its memory or storage.
- Admission webhooks that are slow or unavailable, which delay or block API requests.
- Direct network access to the API server or etcd from untrusted networks.

**API Priority and Fairness** (APF), stable since v1.29 and enabled by default, protects the API server. It improves on the blunt limits `--max-requests-inflight` and `--max-mutating-requests-inflight`, which cap the total work but do not guarantee that the most important requests get through.

| APF concept | Role |
| --- | --- |
| **FlowSchema** | Classifies each request (by user, group, ServiceAccount, verb, resource) into a priority level |
| **PriorityLevelConfiguration** | Gives each level a share of the API server's concurrency, and either queues excess requests or rejects them with **HTTP 429** |
| **Flow** | Requests of one FlowSchema with the same distinguisher (the user or the namespace) |
| **Fair queuing and shuffle sharding** | Within a level, a noisy flow cannot crowd out quieter flows |

Both objects are in the `flowcontrol.apiserver.k8s.io/v1` API group. The mandatory `exempt` level, used by the `system:masters` group, is never throttled, and the mandatory `catch-all` level has a very small share. Suggested levels such as `system`, `leader-election`, `workload-high`, `workload-low` and `global-default` keep node heartbeats and controller leader election alive while user traffic is limited. Long-running requests such as `exec` and log tailing are not subject to APF; `watch` requests are, for their initial burst.

Other protections: ResourceQuota object counts, the 1 MiB Secret size limit, a dedicated and monitored etcd with enough disk, `failurePolicy` and `timeoutSeconds` tuned on admission webhooks, and keeping the API server and etcd off public networks.

> **Exam trap.** APF protects the **API server**, not workloads, and rejects with **429 Too Many Requests**. A ResourceQuota rejection is **403 Forbidden**. Do not mix them up.

<!-- section: network-dos | objectives: 4.3.3 -->
## Network-level denial of service at the edge

Services exposed with `type: LoadBalancer`, `NodePort` or an ingress are reachable from outside, and so are their floods: volumetric traffic, SYN floods, or many expensive HTTP requests (layer 7 DoS).

| Mitigation | Where | Effect |
| --- | --- | --- |
| **Minimal exposure** | Services | Expose only what must be public; keep internal Services as `ClusterIP`; restrict `NodePort` and `LoadBalancer` creation with a quota (`services.nodeports: "0"`) |
| **Provider DDoS protection and firewall** | Cloud or data center edge | Absorbs volumetric attacks before they reach the nodes; source IP allow lists for admin endpoints |
| **Web application firewall** | In front of the ingress | Filters malicious and abusive layer 7 requests |
| **Rate limiting and connection limits** | Ingress controller, Gateway implementation, or service mesh | Caps requests per client so one source cannot consume the backend |
| **Autoscaling** | HorizontalPodAutoscaler, cluster autoscaler | Absorbs legitimate spikes; combine with quotas and budget alerts, because an attacker can also drive costs up |
| **Requests and limits on edge Pods** | Ingress controller Pods | A flood on one entry point does not take down other workloads on the node |

NetworkPolicy does not help here: it filters by source and port and cannot rate-limit. The kube-proxy and the node network stack can only drop or forward; rate limiting needs a component that understands connections or requests.

> **Exam tip.** Match the layer: volumetric floods are absorbed at the **provider or network edge**; HTTP floods are filtered by a **WAF** or **rate limiting** at the ingress; resource exhaustion inside the cluster is contained by **requests, limits and quotas**.

<!-- section: key-points -->
## Key points

- Requests reserve, limits cap: memory over the limit means an OOM kill, CPU over the limit means throttling.
- LimitRange sets per-container defaults and bounds; ResourceQuota caps namespace totals and object counts (403 when exceeded). PID limits stop fork bombs.
- API Priority and Fairness (FlowSchema, PriorityLevelConfiguration, stable since v1.29) shares API server capacity fairly and rejects excess with 429.
- Protect etcd from object floods with object count quotas and size limits; keep the control plane off untrusted networks.
- At the edge: minimal exposure, provider DDoS protection, WAF, rate limiting at the ingress or gateway, autoscaling.
