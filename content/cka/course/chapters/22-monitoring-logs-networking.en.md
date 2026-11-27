The second half of the Troubleshooting domain works through the API: measure what nodes and Pods consume, read what containers print, and find why a Service does not answer. Exam tasks are short and precise ("write the name of the Pod using the most CPU in namespace `shop` to `/opt/top-pod.txt`", "the `web` Service has no endpoints, fix it"), so you need the exact flags of `kubectl top` and `kubectl logs`, the node paths of log files, and a fixed order of checks for Services: selector, endpoints, ports, DNS, kube-proxy and the CNI plugin.

<!-- section: kubectl-top | objectives: 2.3.1 -->
## kubectl top and metrics-server

`kubectl top` reads the **Metrics API** (`metrics.k8s.io`), served by the **metrics-server** add-on, which collects CPU and memory from each kubelet. Without it, `kubectl top` fails with a Metrics API error and HorizontalPodAutoscalers get no CPU or memory metrics.

```bash
kubectl -n kube-system get deployment metrics-server
kubectl get apiservices | grep metrics          # Available must be True
kubectl top node
kubectl top node --sort-by=cpu
kubectl top node --show-capacity                # percentages of capacity instead of allocatable
kubectl top pod -n shop --sort-by=memory
kubectl top pod -A --sort-by=cpu
kubectl top pod web-6d4cf56db6-x2x7k -n shop --containers
kubectl top pod -n shop -l app=web --sum
kubectl top pod -n shop --sort-by=cpu --no-headers | head -1
```

| Task asks for | Flag |
| --- | --- |
| Per-container usage inside Pods | `--containers` |
| Sort by usage | `--sort-by=cpu` or `--sort-by=memory` (only these two values) |
| Only Pods with a label | `-l app=web` (`--selector`) |
| Every namespace | `-A` (`--all-namespaces`) |
| Output for a script or file | `--no-headers` |
| Total of the listed Pods | `--sum` |

CPU is shown in millicores (`250m`) and memory as the **working set** in `Mi`. The values are averages over a short window (tens of seconds), not live readings, and a Pod created a moment ago may not appear yet.

> **Exam trap.** `kubectl top pod` without `-n` or `-A` lists only the current namespace, and `--sort-by` sorts in descending order. To write a Pod name, not the whole line, combine `--no-headers` with a cut: `kubectl top pod -n shop --sort-by=cpu --no-headers | head -1 | awk '{print $1}' > /opt/top-pod.txt`.

<!-- section: usage-requests-quotas | objectives: 2.3.2 -->
## Comparing usage with requests, limits and quotas

`kubectl top` shows **usage**; scheduling and quotas use **requests** and **limits**. A task may ask which Pod exceeds its request, which node is overcommitted, or why a new Pod is refused although the cluster is idle.

```bash
kubectl describe node node-1 | grep -A 8 "Allocated resources"
kubectl get pods -n shop -o custom-columns=NAME:.metadata.name,CPU_REQ:.spec.containers[*].resources.requests.cpu,MEM_LIM:.spec.containers[*].resources.limits.memory
kubectl describe quota -n shop                  # Used versus Hard
kubectl get resourcequota -n shop -o yaml
kubectl describe limitrange -n shop
kubectl get events -n shop --field-selector reason=FailedCreate
```

| Observation | Meaning |
| --- | --- |
| `Allocated resources` near 100 % of CPU requests, `kubectl top node` low | Node full by **requests**: new Pods stay `Pending` (`Insufficient cpu`) |
| Container memory in `top` close to its memory limit | Risk of `OOMKilled` (exit code 137, `Last State` in `describe pod`) |
| CPU usage at the CPU limit | Container is throttled, not killed |
| `exceeded quota` in a ReplicaSet `FailedCreate` event | ResourceQuota `Used` reached `Hard`; Pods are not even created |
| `must specify` requests or limits error | A quota on `requests.cpu` or `limits.memory` exists and the Pod has no value (add one or a LimitRange default) |

> **Exam trap.** A quota-refused Pod never appears in `kubectl get pods`: the admission error is on the ReplicaSet or Job (`kubectl describe rs`), not on a Pod. A `Pending` Pod, by contrast, exists and was admitted, but no node has enough **allocatable** capacity for its requests.

<!-- section: container-logs | objectives: 2.4.1 -->
## Reading container logs with kubectl

`kubectl logs` returns what the containers wrote to stdout and stderr.

```bash
kubectl logs web-6d4cf56db6-x2x7k -n shop
kubectl logs web-6d4cf56db6-x2x7k -n shop -c proxy          # one container of a multi-container Pod
kubectl logs web-6d4cf56db6-x2x7k -n shop --all-containers
kubectl logs web-6d4cf56db6-x2x7k -n shop -c app --previous # the crashed instance
kubectl logs deployment/web -n shop                         # one Pod chosen by kubectl
kubectl logs -n shop -l app=web --all-containers --prefix --tail=50
kubectl logs web-6d4cf56db6-x2x7k -n shop --since=1h --timestamps
kubectl logs web-6d4cf56db6-x2x7k -n shop --tail=20 -f
kubectl logs web-6d4cf56db6-x2x7k -n shop | grep -i error > /opt/web-errors.log
```

| Flag | Meaning, default |
| --- | --- |
| `-c`, `--container` | Container to read; without it kubectl uses the `kubectl.kubernetes.io/default-container` annotation, else the first container (`Defaulted container ...` notice) |
| `-p`, `--previous` | Logs of the previous, terminated instance of the container |
| `--since=1h`, `--since-time=2026-11-27T06:00:00Z` | Only newer lines (one of the two) |
| `--tail=N` | Last N lines; default `-1` (all) for one Pod, **10** per Pod with a selector |
| `-l`, `--selector` | Several Pods; at most `--max-log-requests` (default 5) when following |
| `--prefix`, `--timestamps` | Prefix each line with Pod and container name, or a timestamp |
| `-f`, `--follow` | Stream |

> **Exam trap.** A Pod in `CrashLoopBackOff` often prints nothing in the current instance: the error is in `--previous`. And `kubectl logs -l app=web` shows only 10 lines per Pod: add `--tail=-1` when the task asks for the full logs.

The kubelet rotates container log files (`containerLogMaxSize` 10Mi, `containerLogMaxFiles` 5 by default) and `kubectl logs` only reads the latest file. When a container restarts, the kubelet keeps one terminated instance; an evicted Pod loses its logs.

<!-- section: node-logs-sidecar | objectives: 2.4.2 -->
## Container logs on the node and logging sidecars

On the node, the kubelet tells the runtime to write logs under `/var/log/pods` (`podLogsDir` in the kubelet configuration):

| Path | Content |
| --- | --- |
| `/var/log/pods/<namespace>_<pod>_<pod-uid>/<container>/0.log` | Log file of a container; `1.log`, `2.log` after restarts |
| `/var/log/containers/<pod>_<namespace>_<container>-<container-id>.log` | Symbolic links to those files, read by node logging agents |
| `journalctl -u kubelet`, `journalctl -u containerd` | Logs of the node services (systemd), not of containers |

```bash
ssh node-1
sudo -i
ls /var/log/pods | grep shop_web
tail -n 50 /var/log/pods/shop_web-6d4cf56db6-x2x7k_*/app/0.log
ls -l /var/log/containers | grep web-6d4cf56db6-x2x7k
crictl ps -a --name app
crictl logs --tail=50 7b1e0c4f9a2d
```

An application that writes to a **file** instead of stdout is invisible to `kubectl logs`. The fix is a **streaming sidecar** that shares the file through an `emptyDir` volume and prints it to its own stdout. Since v1.33 native sidecars (an init container with `restartPolicy: Always`) are stable: they start before the app and run for the Pod's lifetime.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: legacy-app
  namespace: shop
spec:
  initContainers:
  - name: log-streamer
    image: busybox:1.36
    restartPolicy: Always
    args: [/bin/sh, -c, 'tail -n+1 -F /var/log/app/app.log']
    volumeMounts:
    - name: logs
      mountPath: /var/log/app
  containers:
  - name: app
    image: busybox:1.36
    args: [/bin/sh, -c, 'while true; do date >> /var/log/app/app.log; sleep 5; done']
    volumeMounts:
    - name: logs
      mountPath: /var/log/app
  volumes:
  - name: logs
    emptyDir: {}
```

```bash
kubectl logs legacy-app -n shop -c log-streamer
```

> **Exam trap.** If the task says "add a sidecar container" to a running Pod, you cannot add containers with `kubectl edit`: export it (`kubectl get pod legacy-app -o yaml > pod.yaml`), add the container and the shared volume, then `kubectl replace --force -f pod.yaml`. Both containers must mount the **same volume** at the path where the file is written.

<!-- section: service-endpoints | objectives: 2.5.1 -->
## Services without endpoints or with the wrong port

A Service sends traffic only to **ready** Pods matching its `spec.selector`. The EndpointSlice controller writes them into EndpointSlices labelled `kubernetes.io/service-name`; the `v1` Endpoints API is deprecated since v1.33.

```bash
kubectl get svc web -n shop -o wide                       # SELECTOR column
kubectl get endpointslices -n shop -l kubernetes.io/service-name=web
kubectl describe svc web -n shop                          # Endpoints:, TargetPort:
kubectl get pods -n shop --show-labels
kubectl get pods -n shop -l app=web                       # does the selector match anything?
kubectl get pod web-6d4cf56db6-x2x7k -n shop -o jsonpath='{.spec.containers[*].ports}'
```

| Symptom | Cause | Fix |
| --- | --- | --- |
| No endpoints, Pods running | Selector does not match the Pod labels (typo, extra label) | Fix `spec.selector` (`kubectl edit svc`) or the Pod template labels |
| No endpoints, Pods `0/1 READY` | Readiness probe failing: endpoint is not `ready` | Fix the probe or the app; check `describe pod` events |
| Endpoints present, `connection refused` | `targetPort` is not the port the container listens on | Set `targetPort` to the container port or its name |
| Named `targetPort` fails | No container port with that `name` | Match `ports[].name` in the Pod template |
| Works by Pod IP, not by Service IP | kube-proxy not running or wrong mode or rules | Check the kube-proxy DaemonSet |
| Selectorless Service has no endpoints | Expected: you must create the EndpointSlice yourself | Create an EndpointSlice with the label `kubernetes.io/service-name` |

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: shop
spec:
  selector:
    app: web               # must equal the Pod labels
  ports:
  - name: http
    port: 80               # port clients call on the Service
    targetPort: 8080       # port the container listens on
```

> **Exam trap.** `port` is what clients use; `targetPort` is the container port. The Service selector must match the **Pod** labels, not the Deployment's labels nor its `spec.selector` field. Each EndpointSlice endpoint shows `conditions.ready`: a not-ready endpoint receives no traffic.

<!-- section: dns-connectivity | objectives: 2.5.2 -->
## DNS and connectivity from a temporary Pod

Test from inside the cluster with a throw-away Pod: `--rm` deletes it on exit, `--restart=Never` makes it a plain Pod.

```bash
kubectl run tmp --rm -it --restart=Never --image=busybox:1.36 -n shop -- nslookup web
kubectl run tmp --rm -it --restart=Never --image=busybox:1.36 -n shop -- wget -qO- -T 3 http://web:80
kubectl run tmp --rm -it --restart=Never --image=busybox:1.36 -- nslookup web.shop.svc.cluster.local
kubectl run tmp --rm -it --restart=Never --image=busybox:1.36 -- wget -qO- -T 3 http://10.244.1.12:8080
kubectl exec -n shop web-6d4cf56db6-x2x7k -- cat /etc/resolv.conf
```

Order of checks: Service DNS name, then Service IP, then Pod IP. The step that fails tells you the layer.

| Fails | Look at |
| --- | --- |
| Name does not resolve, IP works | CoreDNS: Pods, logs, the `kube-dns` Service and its endpoints, the Pod's `/etc/resolv.conf` |
| Service IP fails, Pod IP works | kube-proxy |
| Pod IP fails from another node | CNI plugin, or a NetworkPolicy denying the traffic |

```bash
kubectl -n kube-system get pods -l k8s-app=kube-dns
kubectl -n kube-system logs -l k8s-app=kube-dns
kubectl -n kube-system get svc kube-dns
kubectl -n kube-system get endpointslices -l kubernetes.io/service-name=kube-dns
kubectl -n kube-system get ds kube-proxy
kubectl -n kube-system logs -l k8s-app=kube-proxy
kubectl -n kube-system get cm kube-proxy -o yaml | grep mode
kubectl -n kube-system get pods -o wide              # CNI DaemonSet Pods running on every node?
ls /etc/cni/net.d /opt/cni/bin                       # on the node: CNI config and binaries
kubectl get networkpolicy -n shop
```

A healthy Pod `/etc/resolv.conf` has `nameserver` set to the `kube-dns` Service IP, a `search` line starting with `shop.svc.cluster.local svc.cluster.local cluster.local`, and `options ndots:5`. A short name like `web` resolves only in the Pod's own namespace; from elsewhere use `web.shop`.

kube-proxy runs in `iptables` mode by default in v1.37; `nftables` is the recommended replacement and `ipvs` is deprecated since v1.35. A `KUBE-SVC-` chain per Service port in `iptables-save` shows kube-proxy programmed the Service.

> **Exam trap.** `nslookup` in some busybox images reports errors on search domains even when resolution works; read the `Address` lines, or use the fully qualified name. A NetworkPolicy that allows only certain egress traffic also blocks DNS unless UDP and TCP port 53 to CoreDNS is allowed.

<!-- section: key-points -->
## Key points

- `kubectl top` needs metrics-server; `--sort-by=cpu|memory`, `--containers`, `-l`, `-A`, `--no-headers`, `--sum`.
- Usage is not requests: compare with `describe node` (`Allocated resources`), `describe quota` and LimitRanges; quota refusals appear on the ReplicaSet.
- `kubectl logs -c`, `--previous` for crashes, `--all-containers`, `-l` shows 10 lines per Pod, `--since`, `--tail`; redirect to a file when asked.
- Node log files: `/var/log/pods/<namespace>_<pod>_<uid>/<container>/N.log`, symlinks in `/var/log/containers`, `crictl logs`.
- Logs written to a file need a streaming sidecar sharing an `emptyDir`.
- Service without endpoints: selector versus Pod labels, readiness; wrong port: `targetPort`.
- Test DNS name, Service IP, Pod IP from a temporary Pod; then CoreDNS (`k8s-app=kube-dns`), kube-proxy, CNI, NetworkPolicies.
