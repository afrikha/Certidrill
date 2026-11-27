Kubernetes keeps workloads running through controllers that replace Pods, probes that restart or isolate unhealthy containers, and budgets that limit voluntary evictions. It decides where Pods run through the scheduler, which reads labels, affinities, taints, priorities and resource requests. Exam tasks in this area are mostly manifest edits: add a probe, write a PodDisruptionBudget, pin a Pod to a node, taint a node and tolerate it, set requests that fit a LimitRange and a quota. This chapter gives the fields, the commands and the outcome to expect for each.

<!-- section: controllers-restart | objectives: 3.4.1 -->
## Controllers and restart policies

| Controller | Keeps running | Use when |
| --- | --- | --- |
| ReplicaSet | N identical Pods matching its selector | Almost never directly: a Deployment manages it |
| Deployment | N identical, interchangeable Pods, with rollouts and rollbacks | Stateless applications |
| StatefulSet | N Pods with stable names (`web-0`, `web-1`), stable DNS names and one claim each | Databases, quorum systems |
| DaemonSet | One Pod on every node, or on every node matching a `nodeSelector` or node affinity | Node agents: log collectors, CNI, monitoring |

A ReplicaSet adopts any Pod without an owner whose labels match its selector, so a bare Pod with the same labels counts as one of its replicas. A deleted or failed Pod is replaced by a new Pod with a new name; a Pod is never moved to another node.

The Pod's `restartPolicy` decides what the **kubelet** does when a container exits, on the same node:

| `restartPolicy` | Exit code 0 | Non-zero exit | Allowed in |
| --- | --- | --- | --- |
| `Always` (default) | Restart | Restart | Pods, and the only value for Deployments, StatefulSets, DaemonSets |
| `OnFailure` | No restart | Restart | Pods, Jobs |
| `Never` | No restart | No restart | Pods, Jobs |

Restarts use an exponential back-off (10 s, 20 s, 40 s...) capped at 300 seconds, reset after 10 minutes of running without problems: that is the `CrashLoopBackOff` status.

StatefulSet fields that tasks change:

| Field | Values | Default |
| --- | --- | --- |
| `serviceName` | Headless Service giving Pods DNS names; with `serviceName: web` in `shop`, `web-0.web.shop.svc.cluster.local` | none, create the Service yourself |
| `podManagementPolicy` | `OrderedReady` (one by one, in order) or `Parallel` | `OrderedReady` |
| `updateStrategy.type` | `RollingUpdate` (highest ordinal first) or `OnDelete` (update when you delete a Pod) | `RollingUpdate` |
| `updateStrategy.rollingUpdate.partition` | Only ordinals at or above the partition are updated | `0` |

DaemonSet Pods automatically tolerate the node-problem taints (`not-ready` and `unreachable` with `NoExecute`, disk, memory and PID pressure, `unschedulable`), so they keep running on failing and cordoned nodes. Their `updateStrategy` is `RollingUpdate` (default, `maxUnavailable: 1`, `maxSurge: 0`) or `OnDelete`.

```bash
k rollout status daemonset/log-agent -n kube-system
k rollout undo statefulset/db -n shop
k get ds -A -o wide                 # DESIRED, CURRENT, READY per DaemonSet
```

> **Exam trap.** A DaemonSet does not run on kubeadm control plane nodes unless its template tolerates the `node-role.kubernetes.io/control-plane:NoSchedule` taint. When the task says "on every node, including the control plane", add that toleration.

<!-- section: probes | objectives: 3.4.1 -->
## Liveness, readiness and startup probes

| Probe | On failure | Use it for |
| --- | --- | --- |
| `livenessProbe` | The kubelet kills the container, then applies `restartPolicy` | A process that hangs without exiting |
| `readinessProbe` | The Pod is not `Ready`: its IP is removed from the EndpointSlices of its Services; no restart | Warm-up, temporary overload |
| `startupProbe` | Like liveness; liveness and readiness wait until it has succeeded once | Slow-starting applications |

Each probe uses one mechanism: `httpGet` (`path`, `port`, success is 200 to 399), `tcpSocket` (`port`), `exec` (`command`, success is exit code 0) or `grpc` (`port`).

```yaml
spec:
  containers:
  - name: api
    image: registry.example.com/shop/api:2.4
    ports:
    - name: http
      containerPort: 8080
    startupProbe:
      httpGet:
        path: /healthz
        port: http
      failureThreshold: 30
      periodSeconds: 10
    livenessProbe:
      httpGet:
        path: /healthz
        port: http
      periodSeconds: 10
      failureThreshold: 3
    readinessProbe:
      tcpSocket:
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5
```

| Field | Default | Note |
| --- | --- | --- |
| `initialDelaySeconds` | `0` | Wait after the container starts |
| `periodSeconds` | `10` | Minimum 1 |
| `timeoutSeconds` | `1` | Minimum 1 |
| `successThreshold` | `1` | Must be 1 for liveness and startup |
| `failureThreshold` | `3` | Consecutive failures before acting |

The startup probe above gives the application up to 30 × 10 = 300 seconds to start before the kubelet restarts it.

```bash
k describe pod api-7d9c -n shop     # Events: Liveness probe failed, Readiness probe failed
k get pods -n shop                  # RESTARTS grows with liveness failures, READY 0/1 with readiness
```

> **Exam trap.** A liveness probe that checks a dependency (database, other Service) restarts every replica when that dependency fails. Readiness is for "do not send me traffic"; liveness only for "this process is stuck".

<!-- section: pdb-topology | objectives: 3.4.2 -->
## PodDisruptionBudgets and topology spread

A PodDisruptionBudget (`policy/v1`) limits **voluntary** disruptions that go through the Eviction API, such as `kubectl drain`. It does not protect against node failures, nor against deleting Pods or the Deployment directly.

```bash
k create pdb web-pdb -n shop --selector=app=web --min-available=2
k create pdb db-pdb -n shop --selector=app=db --max-unavailable=1
k get pdb -n shop                   # MIN AVAILABLE, MAX UNAVAILABLE, ALLOWED DISRUPTIONS
```

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-pdb
  namespace: shop
spec:
  minAvailable: 50%
  selector:
    matchLabels:
      app: web
  unhealthyPodEvictionPolicy: AlwaysAllow
```

| Rule | Detail |
| --- | --- |
| `minAvailable` or `maxUnavailable` | Exactly one of the two; a number or a percentage |
| Percentages | Rounded **up**: 7 Pods with `minAvailable: 50%` means 4 must stay |
| `selector` | Required; `{}` selects every Pod of the namespace |
| `maxUnavailable: 0`, or `minAvailable` equal to the replicas | No voluntary eviction: a drain of a node running those Pods never finishes |
| `unhealthyPodEvictionPolicy` | `IfHealthyBudget` (default: running but not ready Pods are evicted only if the budget holds) or `AlwaysAllow` |

> **Exam trap.** A drain that hangs on "Cannot evict pod as it would violate the pod's disruption budget" is the PDB working as designed. Do not delete the PDB unless the task says so; check `ALLOWED DISRUPTIONS` and whether the protected Pods are healthy.

**Topology spread constraints** spread matching Pods across failure domains:

```yaml
spec:
  topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: web
    matchLabelKeys:
    - pod-template-hash
  - maxSkew: 1
    topologyKey: kubernetes.io/hostname
    whenUnsatisfiable: ScheduleAnyway
    labelSelector:
      matchLabels:
        app: web
```

| Field | Meaning | Default |
| --- | --- | --- |
| `maxSkew` | Largest allowed difference in matching Pods between two domains; at least 1 | required |
| `topologyKey` | Node label defining the domains: nodes with the same value form one domain | required |
| `whenUnsatisfiable` | `DoNotSchedule` (Pod stays `Pending`) or `ScheduleAnyway` (preference) | `DoNotSchedule` |
| `labelSelector` | Pods counted in each domain | none: always set it |
| `matchLabelKeys` | Label keys whose values are added to the selector, such as `pod-template-hash` to count one revision only | none |
| `minDomains` | Minimum number of eligible domains; only with `DoNotSchedule` | `1` |
| `nodeAffinityPolicy` / `nodeTaintsPolicy` | `Honor` or `Ignore` the Pod's node affinity / the node taints when counting | `Honor` / `Ignore` |

> **Exam trap.** The `labelSelector` must match the Pod's own labels, or the Pods are not counted and nothing is spread. Copy the labels of the template.

<!-- section: node-selection | objectives: 3.5.1 -->
## nodeSelector, nodeName and affinity

```bash
k label nodes node2 disktype=ssd
k label nodes node2 disktype-                  # remove the label
k get nodes -L disktype,topology.kubernetes.io/zone
```

| Task asks for | Field | Behaviour |
| --- | --- | --- |
| Run only on nodes with a label | `nodeSelector: {disktype: ssd}` | Hard rule, equality only |
| A hard rule with `In`, `NotIn`, `Exists`, `DoesNotExist`, `Gt`, `Lt` | `affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution` | Pod `Pending` if no node matches |
| A preference | `nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution` with `weight` 1 to 100 | Pod runs elsewhere if needed |
| Run on one named node, without the scheduler | `nodeName: node2` | Skips affinity, selectors and `NoSchedule` taints (a `NoExecute` taint still ejects it); fails with `OutOfcpu` or `OutOfmemory` if the node is full |
| Next to Pods with given labels | `affinity.podAffinity` with `topologyKey` | Same node or same zone as those Pods |
| Away from Pods with given labels | `affinity.podAntiAffinity` with `topologyKey` | One replica per node or zone |

```yaml
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: disktype
            operator: In
            values: ["ssd", "nvme"]
          - key: node-role.kubernetes.io/control-plane
            operator: DoesNotExist
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 50
        preference:
          matchExpressions:
          - key: topology.kubernetes.io/zone
            operator: In
            values: ["zone-a"]
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchLabels:
            app: cache
        topologyKey: kubernetes.io/hostname
```

Several `nodeSelectorTerms` are **ORed**; several `matchExpressions` in one term are **ANDed**; `nodeSelector` and node affinity together must **both** match. `IgnoredDuringExecution` means that running Pods are not moved when labels change. Pod affinity terms look in the Pod's own namespace unless `namespaces` or `namespaceSelector` says otherwise, and `topologyKey` cannot be empty for them.

> **Exam trap.** A required anti-affinity on `kubernetes.io/hostname` with more replicas than nodes leaves the extra replicas `Pending`. If the task says "spread when possible", use `preferredDuringSchedulingIgnoredDuringExecution` (with `podAffinityTerm` and `weight`) or a topology spread constraint with `ScheduleAnyway`.

<!-- section: taints-priority | objectives: 3.5.2 -->
## Taints, tolerations and PriorityClasses

```bash
k taint nodes node3 dedicated=gpu:NoSchedule      # add, or replace the value
k taint nodes node3 dedicated=gpu:NoSchedule-     # remove this taint
k taint nodes node3 dedicated-                    # remove every taint with this key
k describe node node3 | grep -i taints
```

| Effect | New Pods without toleration | Running Pods without toleration |
| --- | --- | --- |
| `NoSchedule` | Not scheduled | Stay |
| `PreferNoSchedule` | Avoided if possible | Stay |
| `NoExecute` | Not scheduled | **Evicted** at once; with a toleration and `tolerationSeconds`, evicted after that delay |

```yaml
spec:
  tolerations:
  - key: dedicated
    operator: Equal
    value: gpu
    effect: NoSchedule
  - key: node.kubernetes.io/unreachable
    operator: Exists
    effect: NoExecute
    tolerationSeconds: 60
```

A toleration matches a taint with the same key and effect, and either `operator: Equal` (default) with the same value or `operator: Exists` with no value. An empty `effect` matches every effect of that key; an empty `key` with `Exists` matches every taint. Kubernetes adds tolerations for `node.kubernetes.io/not-ready` and `node.kubernetes.io/unreachable` with `tolerationSeconds: 300` to every Pod that does not set them: Pods leave a failed node after 5 minutes.

> **Exam trap.** A toleration **allows** a tainted node; it does not attract the Pod to it. To dedicate nodes to a workload, taint the nodes **and** give the workload a toleration plus a `nodeSelector` or node affinity.

A **PriorityClass** (`scheduling.k8s.io/v1`, cluster-scoped) maps a name to a priority; Pods reference it with `priorityClassName`.

```bash
k create priorityclass critical-apps --value=100000 --description="Payment services"
k create priorityclass batch-low --value=-10 --preemption-policy=Never
k get priorityclasses               # includes system-cluster-critical, system-node-critical
```

| Field | Meaning | Default |
| --- | --- | --- |
| `value` | Integer up to 1000000000; higher is more important | required |
| `globalDefault` | Priority given to Pods without `priorityClassName`; one class only | `false` (priority 0) |
| `preemptionPolicy` | `PreemptLowerPriority` or `Never` (waits in the queue, evicts nobody) | `PreemptLowerPriority` |

When a Pod cannot be scheduled, the scheduler can **preempt** (evict) lower-priority Pods from a node; it tries to respect PDBs but does not guarantee it. Adding a class, or setting `globalDefault`, does not change Pods that already exist.

<!-- section: resources-admission | objectives: 3.5.3 -->
## Requests, limits, LimitRanges and ResourceQuotas

```bash
k set resources deployment api -n shop -c api --requests=cpu=250m,memory=256Mi --limits=cpu=500m,memory=512Mi
k describe node node2 | grep -A8 "Allocated resources"
```

Requests are what the scheduler reserves against the node's allocatable capacity; limits are enforced at run time. A container over its **CPU** limit is throttled; over its **memory** limit it is OOM-killed (`OOMKilled`, exit code 137). Under node pressure, `BestEffort` Pods (no requests or limits) are evicted first, then `Burstable`, then `Guaranteed` (requests equal limits for CPU and memory in every container).

A **LimitRange** sets per-container (or per-Pod, per-claim) defaults and bounds in a namespace, at admission:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limits
  namespace: shop
spec:
  limits:
  - type: Container
    default:
      cpu: 500m
      memory: 512Mi
    defaultRequest:
      cpu: 200m
      memory: 256Mi
    min:
      cpu: 100m
    max:
      cpu: "1"
      memory: 1Gi
    maxLimitRequestRatio:
      cpu: "4"
```

A **ResourceQuota** caps the total of a namespace:

```bash
k create quota shop-quota -n shop --hard=requests.cpu=4,requests.memory=8Gi,limits.cpu=8,limits.memory=16Gi,pods=20
k describe quota shop-quota -n shop          # Used and Hard
```

Predict the result:

| Situation | Result |
| --- | --- |
| Container sets no resources, LimitRange has `default` and `defaultRequest` | Gets both defaults |
| Container sets only a limit | Request set equal to the limit, not to `defaultRequest` |
| Container sets only a request | Limit taken from `default` |
| Request or limit outside `min`/`max` | Pod rejected at creation, `403 Forbidden` |
| Quota on `requests.cpu` or `limits.cpu`, Pod without those values and no LimitRange defaults | Pod rejected |
| Pod would push the namespace above the quota | `403 Forbidden: exceeded quota` |
| Deployment whose Pods exceed the quota | The Deployment is created; its ReplicaSet shows `FailedCreate` events and too few Pods |
| Requests larger than any node's free allocatable capacity | Pod `Pending`, `FailedScheduling ... Insufficient cpu` |
| LimitRange or quota added or changed | Running Pods are not affected |

```bash
k describe rs -n shop -l app=api            # FailedCreate: exceeded quota / forbidden
k get events -n shop --field-selector reason=FailedScheduling
```

> **Exam trap.** A LimitRange `default` limit lower than a request the container sets makes the Pod invalid ("must be less than or equal to cpu limit"). When a task gives both objects, check that the defaults are consistent with the requests you write.

<!-- section: key-points -->
## Key points

- Deployments for stateless Pods, StatefulSets for stable names and claims (headless `serviceName`), DaemonSets for one Pod per node.
- `restartPolicy` defaults to `Always`, the only value for Deployments; back-off is capped at 300 seconds.
- Liveness restarts, readiness removes from endpoints, startup delays both; defaults period 10 s, timeout 1 s, failure threshold 3.
- PDB: one of `minAvailable` or `maxUnavailable`, percentages rounded up, only voluntary evictions; `maxUnavailable: 0` blocks drains.
- Topology spread: `maxSkew`, `topologyKey`, `whenUnsatisfiable` (default `DoNotSchedule`), a `labelSelector` matching the Pods.
- Node selector terms OR, expressions AND; `nodeName` bypasses the scheduler and its checks.
- `NoExecute` evicts running Pods; default `tolerationSeconds` 300 for `not-ready` and `unreachable`; remove a taint with a trailing `-`.
- PriorityClass: `value`, `globalDefault`, `preemptionPolicy: Never` to queue without preempting.
- LimitRange fills defaults and rejects out-of-range Pods; a cpu or memory quota rejects Pods without those values; neither touches running Pods.
