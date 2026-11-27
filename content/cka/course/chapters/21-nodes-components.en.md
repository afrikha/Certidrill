Troubleshooting is 30 % of the CKA, and the hardest tasks are the ones where `kubectl` itself is unreliable: a node is `NotReady`, or a control plane component has been broken and the API server no longer answers. This chapter gives the order of investigation on a kubeadm node (kubelet service, container runtime, configuration files, certificates, pressure conditions), the commands that work without the API server (`systemctl`, `journalctl`, `crictl`), and the files you edit to fix things: `/var/lib/kubelet/config.yaml`, the kubelet systemd drop-ins and the static Pod manifests in `/etc/kubernetes/manifests`.

<!-- section: notready-nodes | objectives: 2.1.1 -->
## Diagnosing a NotReady node

Start from the cluster, then move to the node named in the task with `ssh` and `sudo -i`.

```bash
kubectl get nodes -o wide
kubectl describe node node-2          # Conditions, Taints, Events
ssh node-2
sudo -i
systemctl status kubelet              # active (running)? enabled?
journalctl -u kubelet --no-pager -n 50
journalctl -u kubelet -f              # follow while you restart it
systemctl status containerd
crictl ps -a                          # containers seen by the runtime
```

`Ready` is `False` when the kubelet reports that it is unhealthy, and `Unknown` when the node controller has heard nothing for `node-monitor-grace-period` (50 seconds by default): typically the kubelet is stopped or cannot reach the API server.

| Symptom (status, `journalctl -u kubelet`) | Likely cause | Fix |
| --- | --- | --- |
| `inactive (dead)` or `disabled` | kubelet stopped or not enabled | `systemctl enable --now kubelet` |
| `activating (auto-restart)`, exits in a loop | Bad flag, bad config file, wrong binary path | Read the first error in the journal, fix the file, `systemctl daemon-reload`, restart |
| `failed to load Kubelet config file` | Wrong `--config` path or YAML error in `/var/lib/kubelet/config.yaml` | Fix the path or the YAML |
| Errors connecting to the runtime socket | containerd stopped, or wrong `containerRuntimeEndpoint` | `systemctl start containerd`; endpoint `unix:///var/run/containerd/containerd.sock` |
| Cgroup driver errors | Runtime on the wrong driver (the kubelet takes the driver from containerd 2.x or CRI-O; `cgroupDriver` is only a fallback) | `SystemdCgroup = true` in containerd, restart containerd and the kubelet; keep `cgroupDriver: systemd` |
| Kubelet refuses to start with swap on | `failSwapOn: true` (the default) | `swapoff -a` and remove the swap line from `/etc/fstab` |
| `x509: certificate has expired or is not yet valid` | kubelet client certificate not rotated | Check `/var/lib/kubelet/pki/kubelet-client-current.pem` and `/etc/kubernetes/kubelet.conf` |
| Network plugin not ready, CNI not initialized | No CNI configuration in `/etc/cni/net.d` or the CNI DaemonSet Pod is failing | Fix or reinstall the CNI plugin |
| `DiskPressure` or `MemoryPressure` is `True` | Eviction threshold reached | Free disk (images, logs) or memory |

```bash
openssl x509 -noout -enddate -in /var/lib/kubelet/pki/kubelet-client-current.pem
df -h /var/lib/kubelet /var/lib/containerd
free -m
```

> **Exam trap.** `kubectl describe node` on a `NotReady` node shows the symptom, never the cause. The cause is almost always in `journalctl -u kubelet` on the node itself: read the first error after the last start, not the repeated lines at the end.

<!-- section: kubelet-configuration | objectives: 2.1.2 -->
## Fixing the kubelet configuration

On a kubeadm node the kubelet takes its settings from four places:

| File | Content | Who writes it |
| --- | --- | --- |
| `/usr/lib/systemd/system/kubelet.service.d/10-kubeadm.conf` | systemd drop-in: `ExecStart` and the `--kubeconfig`, `--config` flags | The kubeadm package |
| `/var/lib/kubelet/config.yaml` | `KubeletConfiguration` (`staticPodPath`, `cgroupDriver`, `clusterDNS`, eviction...) | `kubeadm init` and `join` |
| `/var/lib/kubelet/kubeadm-flags.env` | `KUBELET_KUBEADM_ARGS`, instance flags | `kubeadm init` and `join` |
| `/etc/default/kubelet` (DEB) or `/etc/sysconfig/kubelet` (RPM) | `KUBELET_EXTRA_ARGS`, last in the chain, wins on conflicts | You |

The drop-in shipped by kubeadm (abridged):

```text
[Service]
Environment="KUBELET_KUBECONFIG_ARGS=--bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.conf --kubeconfig=/etc/kubernetes/kubelet.conf"
Environment="KUBELET_CONFIG_ARGS=--config=/var/lib/kubelet/config.yaml"
EnvironmentFile=-/var/lib/kubelet/kubeadm-flags.env
EnvironmentFile=-/etc/default/kubelet
ExecStart=
ExecStart=/usr/bin/kubelet $KUBELET_KUBECONFIG_ARGS $KUBELET_CONFIG_ARGS $KUBELET_KUBEADM_ARGS $KUBELET_EXTRA_ARGS
```

The fields that broken-kubelet tasks usually touch:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
cgroupDriver: systemd
containerRuntimeEndpoint: unix:///var/run/containerd/containerd.sock
staticPodPath: /etc/kubernetes/manifests
clusterDNS:
- 10.96.0.10
clusterDomain: cluster.local
authentication:
  anonymous:
    enabled: false
  webhook:
    enabled: true
  x509:
    clientCAFile: /etc/kubernetes/pki/ca.crt
authorization:
  mode: Webhook
rotateCertificates: true
```

kubeadm writes the `authentication` and `authorization` values above (anonymous access off, webhook authentication on, `Webhook` authorization): restore them if a broken file relaxes them.

The fix procedure is always the same:

```bash
vi /var/lib/kubelet/config.yaml              # or the drop-in, or /etc/default/kubelet
systemctl daemon-reload                      # required after editing a unit or drop-in
systemctl restart kubelet
systemctl status kubelet
kubectl get nodes                            # from the control plane: Ready again
```

> **Exam trap.** `systemctl restart` alone does not reread a modified unit file or drop-in: run `systemctl daemon-reload` first. Put your own overrides in `/etc/systemd/system/kubelet.service.d/`, never in the packaged file under `/usr/lib`. A changed `config.yaml` only needs a restart.

Cluster-wide kubelet settings live in the `kubelet-config` ConfigMap of `kube-system`; `kubeadm upgrade node phase kubelet-config` rewrites `/var/lib/kubelet/config.yaml` from it on a node.

<!-- section: cordon-drain | objectives: 2.1.2 -->
## Cordon, drain and uncordon

| Task asks for | Command |
| --- | --- |
| Stop new Pods on the node, keep the running ones | `kubectl cordon node-2` |
| Move all workloads off for maintenance | `kubectl drain node-2 --ignore-daemonsets --delete-emptydir-data` |
| Drain even with bare Pods (no controller) | Add `--force` (bare Pods are deleted, not recreated) |
| Limit the wait | `--timeout=120s`; `--grace-period=30` overrides each Pod's grace period |
| Put the node back in service | `kubectl uncordon node-2` |

`cordon` sets `spec.unschedulable: true` (shown as `SchedulingDisabled` in `kubectl get nodes`, with the `node.kubernetes.io/unschedulable:NoSchedule` taint). `drain` cordons, then **evicts** every Pod except mirror Pods, honouring PodDisruptionBudgets; it waits for termination. `--disable-eviction` deletes instead of evicting and bypasses PodDisruptionBudgets.

```bash
kubectl drain node-2 --ignore-daemonsets --delete-emptydir-data
kubectl get pods -A -o wide --field-selector spec.nodeName=node-2
kubectl uncordon node-2
```

> **Exam trap.** Without `--ignore-daemonsets`, drain refuses to proceed when DaemonSet Pods are on the node; with it, DaemonSet Pods stay (their controller ignores the unschedulable mark). Without `--delete-emptydir-data`, drain refuses Pods using `emptyDir`. A drain blocked by a PodDisruptionBudget keeps retrying: it is not stuck on a bug.

<!-- section: node-conditions-capacity | objectives: 2.1.3 -->
## Node conditions, capacity, allocatable and taints

| Condition | `True` means |
| --- | --- |
| `Ready` | Healthy and accepting Pods (`False`: unhealthy, `Unknown`: no heartbeat) |
| `MemoryPressure` | Node memory is low (`memory.available` threshold reached) |
| `DiskPressure` | Disk space or inodes low on the node or image filesystem |
| `PIDPressure` | Too many processes |
| `NetworkUnavailable` | Node network not correctly configured |

Default hard eviction thresholds on Linux: `memory.available<100Mi`, `nodefs.available<10%`, `imagefs.available<15%`, `nodefs.inodesFree<5%`. They are set in `evictionHard` of the kubelet configuration.

The control plane turns conditions into taints: `node.kubernetes.io/not-ready` (`Ready=False`) and `node.kubernetes.io/unreachable` (`Ready=Unknown`) with `NoExecute`, and `NoSchedule` taints such as `node.kubernetes.io/disk-pressure`, `memory-pressure`, `pid-pressure`, `network-unavailable`. The scheduler reads the taints, not the conditions.

**Capacity** is the node's total CPU, memory and Pod count; **allocatable** is what is left for normal Pods after system reservations and eviction thresholds. The scheduler compares Pod requests to allocatable.

```bash
kubectl describe node node-2                 # Conditions, Capacity, Allocatable, Allocated resources
kubectl get node node-2 -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
kubectl get node node-2 -o jsonpath='{.status.allocatable}'
kubectl get nodes -o custom-columns=NAME:.metadata.name,CPU:.status.allocatable.cpu,MEM:.status.allocatable.memory
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints[*].key
kubectl describe nodes | grep -i taints
kubectl taint nodes node-2 maintenance=true:NoSchedule-       # remove a taint (trailing dash)
```

> **Exam trap.** "How many nodes are Ready and schedulable?" excludes nodes with a `NoSchedule` taint (control plane nodes have `node-role.kubernetes.io/control-plane:NoSchedule`) and cordoned nodes. Check `Taints:` in `kubectl describe nodes`, not only the `STATUS` column.

<!-- section: static-pod-manifests | objectives: 2.2.1 -->
## Static Pod manifests of the control plane

On a kubeadm control plane node, kube-apiserver, etcd, kube-scheduler and kube-controller-manager are **static Pods**: the kubelet runs every manifest found in `staticPodPath` (`/etc/kubernetes/manifests`) and checks the directory every `fileCheckFrequency` (20 s). The API shows a read-only **mirror Pod** named after the node, such as `kube-apiserver-cp-1` in `kube-system`.

| File | Classic broken fields |
| --- | --- |
| `kube-apiserver.yaml` | `--etcd-servers=https://127.0.0.1:2379` (not 2380, the peer port), `--etcd-cafile`, `--etcd-certfile`, `--etcd-keyfile`, `--client-ca-file` (`ca.crt`), `--requestheader-client-ca-file` (`front-proxy-ca.crt`), `--advertise-address`, image tag |
| `etcd.yaml` | `--data-dir`, the `hostPath` of the data volume, `--cert-file`, `--key-file`, `--trusted-ca-file`, `--listen-client-urls` |
| `kube-scheduler.yaml` | `--kubeconfig=/etc/kubernetes/scheduler.conf`, command name typo, image |
| `kube-controller-manager.yaml` | `--kubeconfig=/etc/kubernetes/controller-manager.conf`, `--cluster-signing-cert-file`, `--service-account-private-key-file` |

```bash
ls /etc/kubernetes/manifests
grep -n "etcd" /etc/kubernetes/manifests/kube-apiserver.yaml
ls /etc/kubernetes/pki /etc/kubernetes/pki/etcd     # every path in a flag must exist
cp /etc/kubernetes/manifests/kube-apiserver.yaml /root/kube-apiserver.yaml.bak
vi /etc/kubernetes/manifests/kube-apiserver.yaml    # save: the kubelet recreates the Pod
watch crictl ps                                     # wait for the new container
```

To restart a static Pod, move its manifest out of the directory, wait about 20 seconds, then move it back.

> **Exam trap.** `kubectl delete pod kube-apiserver-cp-1` or `kubectl edit` does nothing useful: the kubelet recreates the mirror Pod from the file. Edit the file on the node. And never keep a backup inside `/etc/kubernetes/manifests`: the kubelet runs every non-hidden file there, whatever its extension.

<!-- section: component-logs | objectives: 2.2.2 -->
## Reading control plane logs

| Situation | Where to read | Command |
| --- | --- | --- |
| API server up, component Pod running or crashing | Mirror Pod logs | `kubectl -n kube-system logs kube-scheduler-cp-1` (add `--previous` after a crash) |
| API server down | Container runtime | `crictl ps -a`, then `crictl logs <container-id>` |
| Container never created (YAML error, bad volume) | kubelet journal | `journalctl -u kubelet` |
| Runtime problem | containerd journal | `journalctl -u containerd` |
| No runtime access | Log files | `/var/log/pods/kube-system_kube-apiserver-cp-1_<uid>/kube-apiserver/` |

```bash
kubectl -n kube-system get pods -l tier=control-plane
crictl ps -a --name kube-apiserver          # includes Exited containers
crictl logs --tail=20 3f2a9c1d7e8b
crictl inspect 3f2a9c1d7e8b                 # exit code, mounts, command line
crictl pods --name etcd
journalctl -u kubelet --since "10 min ago" | grep -i apiserver
```

`crictl` reads its endpoint from `/etc/crictl.yaml` (`runtime-endpoint: unix:///var/run/containerd/containerd.sock`), the `--runtime-endpoint` flag or `CONTAINER_RUNTIME_ENDPOINT`.

When kubectl answers `The connection to the server ... was refused`, the API server container is either crash-looping (`crictl ps -a` shows `Exited` attempts with a log explaining the failure, for example an etcd connection error) or was never created (no container at all: the kubelet could not parse the manifest, and `journalctl -u kubelet` says why).

> **Exam trap.** `kubectl logs` needs a working API server. When it is down, use `crictl` or the files under `/var/log/pods`; `docker` is not installed on containerd nodes.

<!-- section: health-endpoints | objectives: 2.2.3 -->
## Health endpoints and component kubeconfigs

The API server exposes `/livez` (should it be restarted?) and `/readyz` (can it serve traffic?); `/healthz` is deprecated since v1.16. `?verbose` lists every check and `exclude=` skips one.

```bash
kubectl get --raw='/readyz?verbose'
kubectl get --raw='/livez?verbose'
curl -k https://localhost:6443/livez?verbose
curl -k 'https://localhost:6443/readyz?verbose&exclude=etcd'
curl http://127.0.0.1:10248/healthz                    # kubelet, localhost only
ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key endpoint health
```

| Component | Port on the control plane node |
| --- | --- |
| kube-apiserver | 6443 |
| etcd client / peer | 2379 / 2380 |
| kubelet API / healthz | 10250 / 10248 (127.0.0.1) |
| kube-controller-manager | 10257 |
| kube-scheduler | 10259 |

The liveness probe of each static Pod (`livenessProbe.httpGet` in its manifest) shows the path and port the kubelet checks.

Components authenticate to the API server with kubeconfig files in `/etc/kubernetes`:

| File | Used by |
| --- | --- |
| `admin.conf` | kubectl, cluster administrator (`kubeadm:cluster-admins` group) |
| `super-admin.conf` | Break-glass access in `system:masters`, bypasses RBAC |
| `kubelet.conf` | kubelet (one per node) |
| `controller-manager.conf` | kube-controller-manager (`--kubeconfig` in its manifest) |
| `scheduler.conf` | kube-scheduler (`--kubeconfig` in its manifest) |

```bash
kubectl --kubeconfig /etc/kubernetes/admin.conf get nodes
grep server: /etc/kubernetes/scheduler.conf      # must point to the API server
kubeadm certs check-expiration                    # client certs embedded in these files
```

> **Exam trap.** A scheduler or controller manager that runs but does nothing often has a wrong `server:` address or an expired certificate in its kubeconfig: Pods stay `Pending` (no scheduler) or Deployments create no ReplicaSet (no controller manager). Check the Pod logs and the kubeconfig named in the manifest.

<!-- section: key-points -->
## Key points

- NotReady node: `systemctl status kubelet`, then `journalctl -u kubelet`; check containerd, the runtime endpoint, the cgroup driver, swap, certificates and pressure conditions.
- Kubelet settings: `/var/lib/kubelet/config.yaml`, `kubeadm-flags.env`, `/etc/default/kubelet`, the drop-in; `systemctl daemon-reload` after unit changes, then `systemctl restart kubelet`.
- `kubectl drain --ignore-daemonsets --delete-emptydir-data`, `--force` for bare Pods, then `uncordon`.
- Conditions become taints; allocatable, not capacity, is what Pods can request.
- Control plane static Pods are fixed by editing `/etc/kubernetes/manifests/*.yaml`; backups go outside that directory.
- API server down: `crictl ps -a`, `crictl logs`, `journalctl -u kubelet`, `/var/log/pods`.
- `/livez` and `/readyz` with `?verbose`; component kubeconfigs are in `/etc/kubernetes`.
