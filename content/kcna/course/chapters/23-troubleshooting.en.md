Troubleshooting in Kubernetes follows the objects: look at the status that controllers write, read the events, then narrow down to the Pod, the Service or the node. The exam shows a status such as `CrashLoopBackOff` or a symptom such as "the Service has no endpoints" and asks for the cause or the next command.

<!-- section: inspect-state | objectives: 2.3.1 -->
## Inspecting resources and events

| Command | Shows |
| --- | --- |
| `kubectl get pods -o wide` | Status, restarts, age, Pod IP and node |
| `kubectl get pod web-1 -o yaml` | The full object, including `status`, conditions and container states |
| `kubectl describe pod web-1` | A readable summary plus the **events** of the object: scheduling, image pulls, probe failures, kills |
| `kubectl events --for pod/web-1` | Events of one object; `--types=Warning` keeps the warnings; `-A` all namespaces; `--watch` streams them |
| `kubectl get events --sort-by=.metadata.creationTimestamp` | Events of the namespace in time order |

**Events** are API objects that record what happened to an object, with a type (`Normal` or `Warning`), a reason (`Scheduled`, `Pulled`, `FailedScheduling`, `BackOff`, `Unhealthy`) and a message. They are kept only for a short time (one hour by default), so look at them soon after the problem.

> **Exam tip.** `kubectl describe` is the first command for a Pod that doesn't start: its Events section usually names the cause. `kubectl logs` helps only once a container has actually run.

<!-- section: pod-failures | objectives: 2.3.2 -->
## Pod phases, container states and failure reasons

| Pod phase | Meaning |
| --- | --- |
| `Pending` | Accepted, but not all containers are running yet: not scheduled, or images still being pulled |
| `Running` | Bound to a node; at least one container is running, starting or restarting |
| `Succeeded` | All containers ended with success and won't restart (Jobs) |
| `Failed` | All containers ended and at least one failed |
| `Unknown` | The Pod's state can't be obtained, usually because the node is unreachable |

Each container is `Waiting`, `Running` or `Terminated`; the `STATUS` column of `kubectl get pods` shows the reason of a waiting or terminated container.

| Status | Cause | Where to look |
| --- | --- | --- |
| `Pending` with `FailedScheduling` | Not enough CPU or memory for the requests, no node matches selectors or tolerations, unbound PVC | `kubectl describe pod` events |
| `ErrImagePull`, then **`ImagePullBackOff`** | Wrong image name or tag, missing registry credentials (`imagePullSecrets`), registry unreachable; retries back off up to 5 minutes | Events: `Failed to pull image` |
| `CreateContainerConfigError` | A referenced ConfigMap, Secret or key doesn't exist | Events |
| **`CrashLoopBackOff`** | The container starts then exits again and again: app error, bad command or arguments, missing configuration, failing liveness probe. Restarts back off 10 s, 20 s, 40 s... up to 5 minutes | `kubectl logs web-1 --previous` |
| **`OOMKilled`** | The container exceeded its memory limit (exit code 137) | `kubectl describe pod`: `Last State: Terminated, Reason: OOMKilled` |
| `Completed` | The main process exited with code 0; normal for a Job, a crash loop for a Deployment if it keeps happening | Logs |

> **Exam trap.** `CrashLoopBackOff` is not a cause but a symptom: Kubernetes is waiting before the next restart. The cause is in the logs of the **previous** container instance or in the last terminated state.

<!-- section: probes | objectives: 2.3.3 -->
## Liveness, readiness and startup probes

The kubelet runs probes on each container with one of four mechanisms: `httpGet` (a 200-399 status passes), `tcpSocket`, `exec` (exit code 0 passes) or `grpc`.

| Probe | Question | When it fails |
| --- | --- | --- |
| **Liveness** | Is the app still working, or stuck? | The kubelet **restarts** the container |
| **Readiness** | Can it receive traffic now? | The Pod is **removed from the Service's EndpointSlices**; no restart; checked during the whole life of the container |
| **Startup** | Has a slow app finished starting? | The other probes wait until it succeeds; if it fails too long, the container is killed and restarted |

```yaml
startupProbe:
  httpGet:
    path: /healthz
    port: 8080
  failureThreshold: 30
  periodSeconds: 10      # up to 300 s to start
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
```

Main settings: `initialDelaySeconds`, `periodSeconds`, `timeoutSeconds`, `failureThreshold`, `successThreshold`.

> **Exam trap.** A liveness probe that fails because the app is slow to start causes an endless restart loop. Use a startup probe for slow starters. And a liveness probe that checks a database turns a database outage into restarts of every app: dependencies belong in readiness, if anywhere.

<!-- section: service-connectivity | objectives: 2.3.4 -->
## Troubleshooting Service connectivity

Work from the Service to the Pods:

1. **Does the Service select Pods?** Compare `spec.selector` with the Pod labels. A typo (`app: web` vs `app: webapp`) leaves the Service with **no endpoints**.
2. **Are the endpoints there and ready?** Only Pods that pass their readiness probe are listed as ready.
3. **Are the ports right?** `targetPort` must be the port the container listens on; `port` is what clients use.
4. **Does the name resolve?** From a test Pod, resolve the Service name; use `web.shop` from another namespace.
5. **Is traffic allowed?** A NetworkPolicy may block it.

```bash
kubectl get svc web -n shop -o wide
kubectl get pods -n shop -l app=web --show-labels
kubectl get endpointslices -n shop -l kubernetes.io/service-name=web
kubectl run dnstest -n shop --rm -it --image=busybox:1.36 --restart=Never -- nslookup web
```

| Symptom | Likely cause |
| --- | --- |
| No endpoints | Selector doesn't match the Pod labels, or no Pod is ready |
| Endpoints exist, connection refused | Wrong `targetPort`, or the app listens only on `127.0.0.1` |
| Name doesn't resolve | Wrong namespace in the name, or CoreDNS Pods not running |
| Works from the same namespace only | A NetworkPolicy restricts the sources |

<!-- section: nodes-components | objectives: 2.3.5 -->
## Troubleshooting nodes and cluster components

`kubectl get nodes` shows each node's `STATUS`; `kubectl describe node` shows its **conditions**, capacity, allocatable resources and taints.

| Condition | `True` means |
| --- | --- |
| `Ready` | The kubelet is healthy and the node accepts Pods. `False`: unhealthy; `Unknown`: no heartbeat for the grace period (50 seconds by default) |
| `MemoryPressure`, `DiskPressure`, `PIDPressure` | The node is short of memory, disk or process IDs; the kubelet may evict Pods |
| `NetworkUnavailable` | The node's network isn't configured, for example no CNI plugin |

The kubelet sends heartbeats by renewing a **Lease** object in the `kube-node-lease` namespace (every 10 seconds by default). When a node stays `NotReady` or `Unknown`, the node controller taints it (`not-ready` or `unreachable`, `NoExecute`), and its Pods are evicted after 300 seconds by default and recreated elsewhere by their controllers.

Common causes of a `NotReady` node: the kubelet stopped or can't reach the API server, the container runtime is down, no CNI plugin, disk or memory exhausted, expired kubelet certificates. On the node itself:

```bash
systemctl status kubelet
journalctl -u kubelet --since "10 min ago"
crictl ps                       # containers seen by the CRI runtime
```

For the control plane, the kube-apiserver exposes health endpoints, and on kubeadm clusters the control plane components run as **static Pods** in `kube-system`, defined by manifests in `/etc/kubernetes/manifests` on the control plane nodes:

```bash
kubectl get --raw='/readyz?verbose'
kubectl get pods -n kube-system
```

> **Exam trap.** If the kube-apiserver is down, `kubectl` can't tell you anything: you must look on the control plane node (container runtime, static Pod manifests, kubelet logs). If only kube-scheduler is down, existing Pods keep running but new Pods stay `Pending`.

<!-- section: key-points -->
## Key points

- `get` for status, `describe` and `kubectl events` for causes; events expire quickly.
- `Pending`: scheduling. `ImagePullBackOff`: image name, tag or credentials. `CrashLoopBackOff`: read `logs --previous`. `OOMKilled`: memory limit.
- Liveness failure restarts; readiness failure removes from endpoints; startup protects slow starters.
- No endpoints: selector and labels don't match or no Pod is ready. Check `targetPort`, DNS name and NetworkPolicies.
- Node conditions and Leases tell node health; `systemctl` and `journalctl` for the kubelet; static Pods for kubeadm control planes.
