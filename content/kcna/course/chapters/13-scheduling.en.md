Scheduling is the choice of a node for each new Pod. kube-scheduler makes that choice from the Pod's resource requests and placement rules; the kubelet of the chosen node then runs it. The exam asks why a Pod stays `Pending`, what requests and limits do, which QoS class a Pod gets, and which mechanism attracts Pods to nodes or keeps them away.

<!-- section: scheduler | objectives: 1.3.1 -->
## How kube-scheduler places Pods

kube-scheduler watches for Pods whose `spec.nodeName` is empty. For each one it runs two steps:

| Step | What happens | Examples of checks |
| --- | --- | --- |
| **Filtering** | Keeps the **feasible** nodes, those that can run the Pod | Enough allocatable CPU and memory for the requests, `nodeSelector` and required node affinity match, taints tolerated, free host ports, volume constraints |
| **Scoring** | Ranks the feasible nodes | Spreading Pods, preferred affinities, balanced resource use, image already present |

The scheduler picks the node with the highest score (at random among equal scores) and tells the API server: this is **binding**. The kubelet of that node then starts the Pod.

If no node passes filtering, the Pod stays **`Pending`** and a `FailedScheduling` event explains why, for example `0/3 nodes are available: 3 Insufficient cpu`. The scheduler retries when the cluster changes.

```bash
kubectl get pods --field-selector=status.phase=Pending
kubectl describe pod web-7c9f8 | tail -5     # Events: FailedScheduling ...
```

Common causes of a `Pending` Pod: requests larger than any node's free capacity, a `nodeSelector` or affinity that no node matches, a taint not tolerated, a PersistentVolumeClaim that can't be bound.

> **Exam trap.** The scheduler counts **requests**, not actual usage. A node can be almost idle and still refuse a Pod because the requests of the Pods already placed fill its allocatable capacity.

<!-- section: requests-limits | objectives: 1.3.2 -->
## Requests, limits and QoS classes

| Setting | Used by | Effect |
| --- | --- | --- |
| **Request** | kube-scheduler | Capacity reserved for the container; the sum of requests on a node can't exceed its allocatable capacity |
| **CPU limit** | Kernel (cgroups) | The container is **throttled**: it runs slower, it is not killed |
| **Memory limit** | Kernel (cgroups) | A container that exceeds it can be killed: **OOMKilled** (exit code 137) |

CPU is counted in cores: `1` is one core, `500m` (millicores) is half a core. Memory uses bytes with suffixes: `256Mi` (mebibytes) or `256M` (megabytes). If you set a limit but no request, the request is set equal to the limit.

```yaml
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

Kubernetes derives a **QoS class** from these values:

| QoS class | Condition | Under node memory pressure |
| --- | --- | --- |
| **Guaranteed** | Every container has CPU and memory requests and limits, and request equals limit | Evicted last |
| **Burstable** | Not Guaranteed, but at least one container has a CPU or memory request or limit | Evicted after BestEffort |
| **BestEffort** | No container has any CPU or memory request or limit | Evicted first |

> **Exam trap.** Requests are for **placement**, limits for **enforcement**. A container using more CPU than its limit is throttled; using more memory than its limit gets it OOMKilled.

<!-- section: affinity | objectives: 1.3.3 -->
## nodeSelector, node affinity and Pod affinity

| Mechanism | Expresses | Example |
| --- | --- | --- |
| **nodeSelector** | The node must have all these labels (simple equality) | `disktype: ssd` |
| **Node affinity**, `requiredDuringSchedulingIgnoredDuringExecution` | A hard rule on node labels, with operators `In`, `NotIn`, `Exists`, `Gt`... | Only nodes in zones `a` or `b` |
| **Node affinity**, `preferredDuringSchedulingIgnoredDuringExecution` | A preference with a weight; the Pod still runs elsewhere if needed | Prefer GPU nodes |
| **Inter-Pod affinity** | Place near Pods with given labels, within a `topologyKey` (node, zone) | Put the cache in the same zone as the web app |
| **Inter-Pod anti-affinity** | Keep away from Pods with given labels | Never two replicas of `db` on the same node |

`IgnoredDuringExecution` means that the rule is checked only at scheduling: if node labels change later, running Pods are not moved.

```yaml
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
      - matchExpressions:
        - key: topology.kubernetes.io/zone
          operator: In
          values: ["zone-a", "zone-b"]
```

<!-- section: taints-tolerations | objectives: 1.3.4 -->
## Taints and tolerations

Affinity **attracts** Pods to nodes; a **taint repels** them. A taint on a node (`key=value:effect`) keeps away every Pod that doesn't have a matching **toleration**.

| Effect | Behavior |
| --- | --- |
| `NoSchedule` | No new Pod without a toleration; running Pods stay |
| `PreferNoSchedule` | The scheduler tries to avoid the node, without guarantee |
| `NoExecute` | New Pods are refused **and** running Pods without a toleration are evicted (after `tolerationSeconds` if set) |

```bash
kubectl taint nodes node-4 gpu=true:NoSchedule      # add
kubectl taint nodes node-4 gpu=true:NoSchedule-     # remove (trailing dash)
```

```yaml
tolerations:
- key: gpu
  operator: Equal
  value: "true"
  effect: NoSchedule
```

Kubernetes taints nodes itself: kubeadm taints control plane nodes with `node-role.kubernetes.io/control-plane:NoSchedule`, and the node controller adds `node.kubernetes.io/not-ready` or `node.kubernetes.io/unreachable` (`NoExecute`) to failing nodes. Pods tolerate the last two for 300 seconds by default, then they are evicted.

> **Exam trap.** A toleration **allows** a Pod on a tainted node; it doesn't **send** it there. To dedicate nodes to a team, combine a taint (keep others out) with node affinity or a nodeSelector (bring the team's Pods in).

<!-- section: priority-spread | objectives: 1.3.5 -->
## Priority, preemption and topology spread

A **PriorityClass** is a cluster-scoped object that maps a name to an integer; a Pod references it with `priorityClassName`. A higher value means more important. Without one, a Pod's priority is 0, unless a PriorityClass has `globalDefault: true`. The built-in classes `system-cluster-critical` and `system-node-critical` protect system components.

When a high-priority Pod can't be scheduled, **preemption** evicts lower-priority Pods from a node to make room. A class with `preemptionPolicy: Never` gets ahead of lower-priority Pods in the queue but never evicts anyone.

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: business-critical
value: 100000
description: "Payment services"
```

**Topology spread constraints** spread the replicas of an application evenly across failure domains (nodes, zones):

| Field | Meaning |
| --- | --- |
| `topologyKey` | The node label that defines the domain, such as `topology.kubernetes.io/zone` |
| `maxSkew` | Largest allowed difference in matching Pods between two domains |
| `whenUnsatisfiable` | `DoNotSchedule` (hard rule, the Pod stays Pending) or `ScheduleAnyway` (preference) |
| `labelSelector` | Which Pods are counted |

<!-- section: key-points -->
## Key points

- Filtering keeps feasible nodes, scoring ranks them, binding records the choice; no feasible node means `Pending` with a `FailedScheduling` event.
- Requests drive scheduling; CPU limits throttle; memory limits OOM-kill.
- Guaranteed (request equals limit everywhere), Burstable (some values), BestEffort (none, evicted first).
- nodeSelector and node affinity attract Pods to nodes; Pod anti-affinity separates replicas.
- Taints repel, tolerations permit; `NoExecute` also evicts running Pods.
- PriorityClass and preemption decide who runs when capacity is short; topology spread constraints balance replicas across zones and nodes.
