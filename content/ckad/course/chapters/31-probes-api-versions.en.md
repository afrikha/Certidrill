This chapter covers two maintenance skills. The first is reading what the API server actually serves, so a manifest written for an older cluster can be brought to the current `apiVersion` before it is applied. The second is health checking: liveness, readiness and startup probes tell the kubelet when to restart a container and when to send it traffic. Exam tasks give a manifest that fails with `no matches for kind`, or ask for a probe with an exact handler, port and timing. No `kubectl` flag adds a probe: generate the manifest with `--dry-run=client -o yaml`, then edit it. Facts follow the kubernetes.io documentation for v1.37.

<!-- section: api-discovery | objectives: 3.1.1 -->
## Discovering served APIs and fields

Every object is addressed by an API **group**, a **version** and a **kind**: `apps/v1` `Deployment`, `networking.k8s.io/v1` `Ingress`. The core group has no name, so its `apiVersion` is just `v1` (Pod, Service, ConfigMap, Secret).

```bash
kubectl api-versions                              # every served group/version
kubectl api-versions | grep autoscaling           # autoscaling/v1, autoscaling/v2
kubectl api-resources                             # NAME SHORTNAMES APIVERSION NAMESPACED KIND
kubectl api-resources --api-group=networking.k8s.io
kubectl api-resources --namespaced=false          # cluster-scoped kinds
kubectl api-resources -o wide                     # adds VERBS and CATEGORIES
kubectl api-resources --verbs=list --sort-by=name
kubectl explain cronjob                           # GROUP, KIND, VERSION, then fields
kubectl explain deployment.spec.strategy.rollingUpdate
kubectl explain pod.spec.containers.livenessProbe --recursive
kubectl explain hpa --api-version=autoscaling/v2
```

```text
GROUP:      batch
KIND:       CronJob
VERSION:    v1
```

| Task asks for | Command |
| --- | --- |
| Which versions of a group the cluster serves | `kubectl api-versions` (filter with `grep`) |
| The `apiVersion` and kind to write for a resource | `kubectl api-resources` (APIVERSION and KIND columns), or the header of `kubectl explain` |
| Short names (`deploy`, `hpa`, `netpol`, `cj`) | `kubectl api-resources` (SHORTNAMES) |
| Is a kind namespaced | `kubectl api-resources` (NAMESPACED), `--namespaced=true` or `false` |
| The exact spelling and type of a field | `kubectl explain <kind>.<field>.<field>` |
| Every nested field at once | `kubectl explain <kind>.<field> --recursive` (cap with `--max-depth`) |
| The schema of one specific version | `kubectl explain <kind> --api-version=<group>/<version>` |
| Read an object through a specific version | `kubectl get deployments.v1.apps web -o yaml` |

`kubectl explain` reads the OpenAPI schema from the server, so it shows the fields of the cluster's own version, with their types and descriptions. Offline, kubernetes.io's API reference has the same content.

> **Exam tip.** `kubectl explain` is the fastest way to check a field name during the exam: `kubectl explain pod.spec.containers.startupProbe.grpc` answers "is it `service` or `serviceName`?" in one second, without leaving the terminal.

> **Exam trap.** `kubectl api-versions` lists **group/version** pairs only, not kinds. A served group/version does not mean every kind exists in it: `policy/v1` serves PodDisruptionBudget, but there is no PodSecurityPolicy in any version since v1.25.

<!-- section: api-deprecations | objectives: 3.1.2 -->
## Deprecated and removed API versions

The deprecation policy differs by stability level: **GA** versions (`v1`) may be deprecated but are not removed within a major version; **beta** versions are no longer served 9 months or 3 minor releases after their deprecation (whichever is longer); **alpha** versions can disappear in any release without notice. Since v1.19 a request to a deprecated API returns a `Warning` header, which kubectl prints:

```text
Warning: <group>/<version> <Kind> is deprecated in v1.X+, unavailable in v1.Y+; use <group>/<version> <Kind>
```

Once the version is removed, `kubectl apply` refuses the manifest:

```text
error: resource mapping not found for name: "web" namespace: "shop" from "web.yaml": no matches for kind "Ingress" in version "networking.k8s.io/v1beta1"
ensure CRDs are installed first
```

| Old `apiVersion` (removed) | Kind | Current `apiVersion` |
| --- | --- | --- |
| `extensions/v1beta1`, `apps/v1beta1`, `apps/v1beta2` (v1.16) | Deployment, ReplicaSet, DaemonSet, StatefulSet | `apps/v1` |
| `extensions/v1beta1` (v1.16) | NetworkPolicy | `networking.k8s.io/v1` |
| `extensions/v1beta1`, `networking.k8s.io/v1beta1` (v1.22) | Ingress | `networking.k8s.io/v1` |
| `rbac.authorization.k8s.io/v1beta1` (v1.22) | Role, RoleBinding, ClusterRole, ClusterRoleBinding | `rbac.authorization.k8s.io/v1` |
| `apiextensions.k8s.io/v1beta1` (v1.22) | CustomResourceDefinition | `apiextensions.k8s.io/v1` |
| `scheduling.k8s.io/v1beta1` (v1.22) | PriorityClass | `scheduling.k8s.io/v1` |
| `batch/v1beta1` (v1.25) | CronJob | `batch/v1` |
| `policy/v1beta1` (v1.25) | PodDisruptionBudget | `policy/v1` |
| `policy/v1beta1` (v1.25) | PodSecurityPolicy | None: Pod Security Admission |
| `autoscaling/v2beta1` (v1.25), `autoscaling/v2beta2` (v1.26) | HorizontalPodAutoscaler | `autoscaling/v2` |
| `discovery.k8s.io/v1beta1` (v1.25) | EndpointSlice | `discovery.k8s.io/v1` |

Changing the `apiVersion` line is not always enough, because some fields changed with the version:

| Kind | Field changes when moving to the current version |
| --- | --- |
| Deployment to `apps/v1` | `spec.selector` is required and must match the template labels |
| Ingress to `networking.k8s.io/v1` | `serviceName` becomes `service.name`, `servicePort` becomes `service.port.number` (or `.name`), `pathType` is required, `spec.backend` becomes `spec.defaultBackend` |
| HPA from `autoscaling/v2beta1` to `autoscaling/v2` | `targetAverageUtilization` becomes `target.type: Utilization` with `target.averageUtilization` |

```yaml
# networking.k8s.io/v1beta1 backend          # networking.k8s.io/v1 backend
#   backend:                                  #   pathType: Prefix
#     serviceName: web                        #   backend:
#     servicePort: 80                         #     service:
#                                             #       name: web
#                                             #       port:
#                                             #         number: 80
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
  namespace: shop
spec:
  rules:
  - host: web.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 80
```

The `kubectl convert` plugin rewrites a file to another version (`kubectl convert -f ./web.yaml --output-version apps/v1`), but it is not installed with kubectl: on the exam, edit the file by hand, then check it with `kubectl apply --dry-run=server -f web.yaml`.

> **Exam trap.** Objects already stored in the cluster are not broken by a removal: the API server converts them and serves them in the current version. What fails is **your manifest** (or a chart or a script) that still names the removed version.

> **Exam trap.** After you change the `apiVersion`, apply again and read the next error: a `Required value` error on `spec.selector` (Deployment) or `pathType` (Ingress) means the fields of the new version are still missing.

<!-- section: probe-handlers | objectives: 3.2.1 -->
## Liveness, readiness and startup probes

The kubelet runs probes against each container. The three kinds use the same fields but trigger different actions:

| Probe | Question it answers | On failure |
| --- | --- | --- |
| `livenessProbe` | Is the process still working? | The kubelet kills the container; it restarts according to `restartPolicy` |
| `readinessProbe` | Can it serve traffic now? | Container marked not ready; the Pod IP is removed from the EndpointSlices of matching Services; **no restart** |
| `startupProbe` | Has the application finished starting? | Kills and restarts the container like liveness; until it succeeds, liveness and readiness probes do not run |

Readiness probes run during the whole life of the container, not only at start. Liveness and readiness do not wait for each other. A container with no probe of a kind is treated as passing it.

Each probe has exactly one handler:

| Handler | Fields | Success |
| --- | --- | --- |
| `httpGet` | `port` (number or name), `path` (default `/`), `scheme` (`HTTP` default, or `HTTPS`), `host` (default Pod IP; for a virtual host set a `Host` entry in `httpHeaders` instead), `httpHeaders` | Status code from 200 to 399 |
| `tcpSocket` | `port` (number or name) | The TCP connection opens |
| `grpc` | `port` (number only), `service` (optional) | The gRPC health check returns `SERVING`; stable since v1.27 |
| `exec` | `command` (a list, run in the container, no shell unless you call one) | Exit code 0 |

Generate the skeleton, then add the probes under the container:

```bash
kubectl run api --image=registry.example.com/shop/api:2.1 --port=8080 -n shop \
  --dry-run=client -o yaml > api-pod.yaml
```

```yaml
spec:
  containers:
  - name: api
    image: registry.example.com/shop/api:2.1
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
        httpHeaders:
        - name: X-Probe
          value: kubelet
    readinessProbe:
      tcpSocket:
        port: 8080
  - name: worker
    image: registry.example.com/shop/worker:2.1
    livenessProbe:
      exec:
        command: ["cat", "/tmp/healthy"]
    readinessProbe:
      grpc:
        port: 9090
```

| Task asks for | Field |
| --- | --- |
| Restart the container when `/healthz` fails | `livenessProbe.httpGet` with `path` and `port` |
| Stop traffic, but do not restart, while a dependency is down | `readinessProbe` |
| Give a slow application up to 5 minutes to start | `startupProbe` with `failureThreshold × periodSeconds` of 300 s |
| Check a port that speaks TCP but not HTTP | `tcpSocket.port` |
| Check a file or run a command | `exec.command` as a list |
| Use the gRPC health protocol | `grpc.port` (a number) |
| The endpoint serves HTTPS | `httpGet.scheme: HTTPS` (certificate not verified) |

> **Exam trap.** Probes are fields of a **container**, at the same level as `image` and `ports`, not of the Pod `spec`. In a Deployment they sit under `spec.template.spec.containers[]`.

> **Exam trap.** `exec.command` is not run in a shell: `command: ["cat /tmp/healthy"]` looks for a binary named `cat /tmp/healthy`. Split the arguments, or use `["sh", "-c", "test -f /tmp/healthy"]` when you need shell syntax. Named ports work for `httpGet` and `tcpSocket`, not for `grpc`.

<!-- section: probe-timing | objectives: 3.2.2 -->
## Probe timing and the effect of a failing probe

| Field | Default | Minimum | Meaning |
| --- | --- | --- | --- |
| `initialDelaySeconds` | 0 | 0 | Wait after the container starts before the first probe; with a startup probe, liveness and readiness delays start after it succeeds |
| `periodSeconds` | 10 | 1 | Interval between probes |
| `timeoutSeconds` | 1 | 1 | A probe that takes longer counts as a failure |
| `failureThreshold` | 3 | 1 | Consecutive failures before the probe is considered failed |
| `successThreshold` | 1 | 1 | Consecutive successes to pass again after failing; **must be 1** for liveness and startup |
| `terminationGracePeriodSeconds` | Pod value (30) | 1 | Liveness and startup only: grace period before the failed container is force-stopped |

Approximate time before the action, for a probe that starts failing:

- Liveness restart after about `failureThreshold × periodSeconds` (defaults: 3 × 10 = 30 s).
- Maximum startup time with a startup probe: `failureThreshold × periodSeconds` (30 × 10 = 300 s), after any `initialDelaySeconds`; then the container is killed.
- A not-ready Pod becomes ready again after `successThreshold` consecutive successes.

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 2
  failureThreshold: 2
  successThreshold: 2
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 15
  failureThreshold: 4          # about 60 s of failures before a restart
```

How the failure shows up:

| Observation | Likely cause |
| --- | --- |
| `READY 0/1`, `STATUS Running`, RESTARTS stays 0, Service has no endpoints for the Pod | Readiness probe failing |
| RESTARTS keeps increasing, then `CrashLoopBackOff`; events `Unhealthy` with `Liveness probe failed` | Liveness probe failing, or too strict for the application |
| Restarts only during start, never once the app is up | Liveness or startup budget shorter than the start time: add or enlarge a `startupProbe` |
| Deployment rollout stuck, new Pods never ready, old Pods still serving | Readiness of the new version fails; the rollout waits, then reports `ProgressDeadlineExceeded` |

```bash
kubectl get pods -n shop                       # READY and RESTARTS columns
kubectl describe pod api -n shop               # probe config and Unhealthy events
kubectl get events -n shop --field-selector reason=Unhealthy
kubectl get endpointslices -n shop -l kubernetes.io/service-name=api
```

> **Exam trap.** A liveness probe that checks a dependency (a database, another Service) restarts healthy containers whenever the dependency is down, which can restart every replica at once. Dependencies belong in the **readiness** probe; liveness checks only the process itself.

> **Exam trap.** `timeoutSeconds` defaults to **1 second**. An endpoint that answers in 1.5 s fails every probe even though it works: raise `timeoutSeconds` rather than `periodSeconds`.

> **Exam trap.** The API server rejects `successThreshold` other than 1 on a liveness or startup probe, and `terminationGracePeriodSeconds` on a readiness probe.

<!-- section: key-points -->
## Key points

- `kubectl api-versions` lists group/versions, `kubectl api-resources` lists kinds with their APIVERSION, short names and scope, `kubectl explain kind.field` shows exact field names.
- Beta versions disappear 9 months or 3 releases after deprecation; GA versions stay. A removed version gives `no matches for kind ... in version ...`.
- Current versions: workloads `apps/v1`, Ingress and NetworkPolicy `networking.k8s.io/v1`, CronJob `batch/v1`, PDB `policy/v1`, HPA `autoscaling/v2`, RBAC `rbac.authorization.k8s.io/v1`; PodSecurityPolicy is gone.
- Liveness failure restarts the container, readiness failure removes it from Service endpoints without restart, startup holds the other two until the application has started.
- Handlers: `httpGet` (200–399), `tcpSocket`, `grpc` (numeric port), `exec` (exit 0).
- Defaults: delay 0, period 10 s, timeout 1 s, failure threshold 3, success threshold 1 (always 1 for liveness and startup).
- Restart time is about `failureThreshold × periodSeconds`; use a startup probe for slow starts instead of a long liveness `initialDelaySeconds`.
