# C-cka-2 — doubts and deviations

Chapters: `21-nodes-components.en.md`, `22-monitoring-logs-networking.en.md` (English only). Validators: 0 problem(s) for both chapters.

Sources fetched (kubernetes.io, v1.37 docs): node-status, kubeadm kubelet-integration, troubleshooting clusters, crictl debugging, health-checks, static-pod, kubectl drain / top pod / top node / logs references, logging architecture, resource-metrics-pipeline, debug-service, dns-debugging-resolution, kubectl-node-debug, ports-and-protocols, virtual-ips, kubeadm implementation-details, node-pressure-eviction, taint-and-toleration, PKI certificates, troubleshooting-kubeadm, kubeadm-certs, kubelet-config v1beta1, endpoint-slices, sidecar-containers.

Doubts:

- `node-monitor-grace-period`: the node-status page says 50 s in two places and 40 s in the heartbeat section. The chapter uses 50 s.
- `/var/log/pods/<namespace>_<pod>_<uid>/<container>/N.log` and `/var/log/containers/<pod>_<namespace>_<container>-<id>.log`: kubernetes.io names only `/var/log/pods`. The layout was checked in the kubelet source (`pkg/kubelet/kuberuntime/helpers.go`, `legacy.go`), not on a docs page. The `N.log` restart-count file name comes from general knowledge.
- kubeadm static Pod labels `tier=control-plane` / `component=...`, the `kube-proxy` ConfigMap name and `k8s-app=kube-proxy` label: standard kubeadm behaviour, but not quoted on a fetched page.
- `--etcd-servers=https://127.0.0.1:2379`, `/var/lib/etcd`, `--trusted-ca-file` in etcd.yaml: standard kubeadm values, not quoted on a fetched page. The ports (2379 client, 2380 peer) were verified.
- The Metrics API is `metrics.k8s.io/v1` (stable in v1.37, per the resource-metrics-pipeline page). The chapter names only the group, because installed metrics-server releases may still serve `v1beta1`.
- Health endpoints of kube-scheduler and kube-controller-manager: the chapter gives ports 10259 and 10257 and tells the reader to take the probe path from the manifest. It does not state `/livez` or `/healthz` for those components (not verified).
- Busybox `nslookup` quirk in the DNS trap: general knowledge (the docs use a dnsutils/agnhost Pod).
- The kubectl `top` descending sort order and the wording of the quota "must specify" error are general knowledge.
