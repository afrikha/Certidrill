Resource requests and limits tell Kubernetes how much CPU and memory each container needs and may use; ResourceQuotas cap what a whole namespace consumes; LimitRanges set defaults and bounds for each container. Exam tasks ask you to set the values with the right units, to create a quota or a limit range in a namespace, and to explain why a Pod is `Pending`, `OOMKilled` or rejected at creation.

<!-- section: requests-limits | objectives: 4.5.1 -->
## Set requests and limits

Requests and limits are set **per container**, under `resources`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: worker
  namespace: batch
spec:
  containers:
  - name: worker
    image: registry.example.com/batch/worker:3.2
    resources:
      requests:
        cpu: 250m
        memory: 128Mi
      limits:
        cpu: "1"
        memory: 256Mi
```

The imperative way changes an object that has a Pod template (Deployment, StatefulSet, DaemonSet, CronJob, ReplicaSet):

```bash
kubectl set resources deployment/web -n shop \
  --requests=cpu=100m,memory=128Mi --limits=cpu=500m,memory=256Mi

kubectl set resources deployment/web -n shop -c=nginx --limits=memory=512Mi   # one container only

kubectl set resources -f pod.yaml --limits=cpu=200m,memory=256Mi --local -o yaml   # edit a file offline
```

Without `-c`, `kubectl set resources` changes **all** containers of the template. `kubectl run` has no `--requests` or `--limits` flag: generate the Pod with `kubectl run worker --image=... --dry-run=client -o yaml > pod.yaml`, then add `resources` in the editor.

Units:

| Value | Meaning |
| --- | --- |
| `cpu: 1` | One CPU: one physical core or one virtual core, depending on the node |
| `cpu: 500m` = `cpu: 0.5` | Half a CPU (millicpu); `0.1` = `100m`; the smallest unit is `1m` |
| `memory: 256Mi` | 256 mebibytes = 256 × 1024 × 1024 bytes (power-of-two suffixes `Ki`, `Mi`, `Gi`, `Ti`) |
| `memory: 256M` | 256 megabytes = 256 × 1000 × 1000 bytes (decimal suffixes `k`, `M`, `G`, `T`) |
| `memory: 400m` | 0.4 **bytes**: `m` means milli, almost always a typo for `400Mi` |

> **Exam trap.** If a container sets a limit but no request (and no LimitRange supplies a default request), Kubernetes copies the limit as the request. `limits.memory: 1Gi` alone means the scheduler reserves 1 GiB.

> **Exam trap.** The task says "256 MiB": write `256Mi`, not `256M` (about 4.6 % smaller) and never `256m`. Quote whole-CPU values in YAML if you like (`"1"`), both forms are valid quantities.

Two newer options exist in v1.37 but are not needed to solve classic tasks: **Pod-level resources** (`spec.resources`, beta and enabled by default since v1.34) set a budget for the whole Pod, and **in-place resize** (stable since v1.35) changes the resources of a running Pod through its `resize` subresource. When a task says "update the Deployment so its containers request...", change the Pod template: the Deployment rolls out new Pods.

<!-- section: effects-qos | objectives: 4.5.2 -->
## Predict the effects: scheduling, throttling, OOMKilled and QoS

| Setting | Used by | Effect |
| --- | --- | --- |
| Request | kube-scheduler | The Pod goes only to a node whose allocatable capacity minus the requests already placed covers it |
| CPU limit | Kernel (cgroups) | The container is **throttled** when it reaches the limit; it is never killed for CPU |
| Memory limit | Kernel (cgroups) | A container that goes over can be killed by the OOM killer: **`OOMKilled`**, exit code 137, then restarted according to `restartPolicy` |
| Memory request exceeded | kubelet | Under node memory pressure, Pods using more than their requests are eviction candidates |

Symptom to cause:

| You see | Cause | Check with |
| --- | --- | --- |
| `Pending`, event `FailedScheduling ... Insufficient cpu` (or `memory`) | Requests larger than any node's free allocatable capacity | `kubectl describe pod`, `kubectl describe node` (Allocated resources) |
| `CrashLoopBackOff`, `Last State: Terminated, Reason: OOMKilled` | Memory limit too low for the process | `kubectl describe pod`, raise `limits.memory` |
| Slow responses, no restart | CPU limit reached: throttling | `kubectl top pod --containers` |
| Pod never created, `Forbidden` error | ResourceQuota or LimitRange rejection at admission | The error message, `kubectl describe quota` or `kubectl describe limitrange` |

```bash
kubectl describe pod worker -n batch | grep -A5 "Last State"
kubectl get pod worker -n batch -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}'
kubectl get pod worker -n batch -o jsonpath='{.status.qosClass}'
```

Kubernetes assigns every Pod a **QoS class** (`status.qosClass`) from its containers' CPU and memory values:

| QoS class | Condition | Eviction under node pressure |
| --- | --- | --- |
| `Guaranteed` | Every container has CPU and memory requests **and** limits, and each request equals its limit | Last |
| `Burstable` | Not Guaranteed, and at least one container has a CPU or memory request or limit | After BestEffort |
| `BestEffort` | No container has any CPU or memory request or limit | First |

> **Exam trap.** A container with only `limits` (CPU and memory) is `Guaranteed`: the requests are copied from the limits, so they are equal. One container in the Pod without values is enough to drop the Pod from Guaranteed to Burstable.

> **Exam trap.** The scheduler counts **requests**, not real usage. A node can be nearly idle and still refuse a Pod because the requests already placed on it fill its allocatable capacity.

<!-- section: resource-quotas | objectives: 4.3.1 -->
## Create a ResourceQuota and read its usage

A ResourceQuota caps the **total** of a namespace: the sum of requests and limits of its non-terminal Pods, and the number of objects of each kind. When a request would exceed it, the API server rejects it with `403 Forbidden`.

```bash
kubectl create quota team-quota -n shop \
  --hard=requests.cpu=2,requests.memory=4Gi,limits.cpu=4,limits.memory=8Gi,pods=10

kubectl create quota objects -n shop \
  --hard=configmaps=20,secrets=20,services=5,count/deployments.apps=5

kubectl create quota be-pods -n shop --hard=pods=5 --scopes=BestEffort

kubectl create quota team-quota -n shop --hard=pods=10 --dry-run=client -o yaml > quota.yaml
```

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: shop
spec:
  hard:
    requests.cpu: "2"
    requests.memory: 4Gi
    limits.cpu: "4"
    limits.memory: 8Gi
    pods: "10"
    persistentvolumeclaims: "4"
    requests.storage: 50Gi
```

| Task asks to limit | Key in `spec.hard` |
| --- | --- |
| Total CPU or memory requested | `requests.cpu`, `requests.memory` (`cpu` and `memory` are synonyms) |
| Total CPU or memory limits | `limits.cpu`, `limits.memory` |
| Number of Pods (non-terminal) | `pods` |
| Number of Services, LoadBalancers, NodePorts | `services`, `services.loadbalancers`, `services.nodeports` |
| Number of ConfigMaps, Secrets, PVCs | `configmaps`, `secrets`, `persistentvolumeclaims` |
| Total storage requested by PVCs | `requests.storage`, or `<class>.storageclass.storage.k8s.io/requests.storage` |
| Number of any namespaced kind | `count/<resource>.<group>`: `count/deployments.apps`, `count/jobs.batch`, `count/pods` (core group: no suffix) |

`--scopes` (or `spec.scopeSelector`) limits what the quota counts: `BestEffort`, `NotBestEffort`, `Terminating` (Pods with `activeDeadlineSeconds`), `NotTerminating`, `PriorityClass`, `CrossNamespacePodAffinity`, `VolumeAttributesClass`.

Read usage:

```bash
kubectl get resourcequota -n shop            # short name: quota
kubectl describe quota team-quota -n shop    # Resource / Used / Hard table
kubectl get quota team-quota -n shop -o jsonpath='{.status.used}'
```

A rejected creation reads like `pods "web-2" is forbidden: exceeded quota: team-quota, requested: requests.memory=700Mi, used: requests.memory=3600Mi, limited: requests.memory=4Gi`.

> **Exam trap.** Once a quota sets `cpu` or `memory` (requests or limits), every new Pod in the namespace must specify that resource, or it is rejected. Fix it with values in the Pod spec or with a LimitRange that supplies defaults.

> **Exam trap.** With a Deployment, the quota rejects the **Pods**, not the Deployment: `kubectl create deployment` succeeds, `READY` stays at `0/3`, and the reason is in the ReplicaSet's events (`kubectl describe rs -n shop`, event `FailedCreate`). Quotas are also not retroactive: Pods that already run are not removed.

<!-- section: limit-ranges | objectives: 4.3.2 -->
## Create a LimitRange and predict its effect on new Pods

A LimitRange applies **per container** (or per Pod or per PVC) in its namespace: it injects default requests and limits at admission, then rejects values outside `min` and `max`. There is no `kubectl create limitrange`: write the manifest.

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limits
  namespace: shop
spec:
  limits:
  - type: Container
    defaultRequest:        # request when the container sets none
      cpu: 100m
      memory: 128Mi
    default:               # limit when the container sets none
      cpu: 500m
      memory: 256Mi
    min:
      cpu: 50m
      memory: 64Mi
    max:
      cpu: "1"
      memory: 1Gi
    maxLimitRequestRatio:
      memory: "4"          # limit at most 4 times the request
  - type: PersistentVolumeClaim
    min:
      storage: 1Gi
    max:
      storage: 20Gi
```

| Field | Meaning |
| --- | --- |
| `type` | `Container`, `Pod` (sum of the containers) or `PersistentVolumeClaim` |
| `default` | Default **limit** (the name says "default", not "defaultLimit") |
| `defaultRequest` | Default **request** |
| `min` / `max` | Smallest request and largest limit allowed |
| `maxLimitRequestRatio` | Largest limit divided by request; both must then be non-zero |

If `default` is omitted it takes the value of `max`, and if `defaultRequest` is omitted it takes the value of `default`: a LimitRange with only `min` and `max` still injects defaults equal to `max`.

With the LimitRange above, a new container in `shop` gets:

| Container spec | Result at admission |
| --- | --- |
| No `resources` | Requests `100m`/`128Mi`, limits `500m`/`256Mi` |
| Only `limits.memory: 512Mi` | Memory request = `512Mi` (copied from its own limit, **not** `defaultRequest`); CPU gets the defaults |
| Only `requests.cpu: 300m` | CPU limit = `500m` (the default limit) |
| `requests.cpu: 700m`, no CPU limit | Invalid: the default limit `500m` is below the request (`must be less than or equal to cpu limit`) |
| `limits.memory: 2Gi` | Rejected `403 Forbidden`: `maximum memory usage per Container is 1Gi, but limit is 2Gi` |
| `requests.cpu: 10m` | Rejected: below `min` |

```bash
kubectl apply -f limitrange.yaml
kubectl get limitrange -n shop                 # short name: limits
kubectl describe limitrange container-limits -n shop
kubectl get pod api -n shop -o jsonpath='{.spec.containers[0].resources}'   # injected values
```

> **Exam trap.** A LimitRange acts only at admission. Adding or changing one doesn't touch running Pods; delete or roll out the Pods (`kubectl rollout restart deployment/web -n shop`) to see the new defaults.

> **Exam tip.** ResourceQuota answers "how much may the **namespace** use in total", LimitRange answers "what may **one container** ask for, and what does it get by default". A namespace with a CPU quota usually needs a LimitRange too, so that Pods without values are still admitted.

<!-- section: key-points -->
## Key points

- `resources.requests` drive scheduling, `resources.limits` are enforced by the kernel: CPU throttled, memory OOMKilled (exit code 137).
- `kubectl set resources` with `--requests`, `--limits` and `-c`; `kubectl run` has no resource flags.
- `500m` CPU = half a CPU; `Mi` is binary, `M` decimal, `m` is milli. A limit without a request copies the limit.
- Guaranteed = request equals limit for CPU and memory in every container; BestEffort = no values at all; everything else is Burstable.
- `kubectl create quota NAME --hard=...` caps namespace totals and object counts (`count/deployments.apps`); read usage with `kubectl describe quota`.
- LimitRange (manifest only): `defaultRequest`, `default` (limit), `min`, `max`, `maxLimitRequestRatio`; applied at admission, never to running Pods.
