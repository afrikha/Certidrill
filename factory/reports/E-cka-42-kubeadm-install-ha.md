# E-cka-42-kubeadm-install-ha — EXERCISES CKA, chapter 42-kubeadm-install-ha (2026-11-27)

## Output
24 exercises in `content/cka/questions/cluster/`.

| Id | Obj. | Type | Diff. |
| --- | --- | --- | --- |
| cka-4b-restart-containerd-config | 4.2.1 | command (systemctl) | 1 |
| cka-4b-preflight-with-config | 4.2.1 | command (kubeadm) | 2 |
| cka-4b-cri-socket-multiple-runtimes | 4.2.1 | manifest (Init/ClusterConfiguration) | 2 |
| cka-4b-kubelet-tolerate-swap | 4.2.1 | manifest (KubeletConfiguration) | 3 |
| cka-4b-enable-kubelet-now | 4.2.2 | command (systemctl) | 1 |
| cka-4b-prepull-images-version | 4.2.2 | command (kubeadm) | 2 |
| cka-4b-kubeadm-version-short | 4.2.2 | command (kubeadm) | 1 |
| cka-4b-cluster-config-version-mirror | 4.2.2 | manifest (ClusterConfiguration) | 2 |
| cka-4c-init-advertise-cidrs | 4.3.1 | command (kubeadm) | 2 |
| cka-4c-init-config-file | 4.3.1 | manifest (Init + ClusterConfiguration) | 3 |
| cka-4c-flannel-pod-network | 4.3.1 | manifest (Flannel ConfigMap) | 2 |
| cka-4c-kcm-allocate-node-cidrs | 4.3.1 | manifest (kube-controller-manager static Pod) | 3 |
| cka-4c-token-print-join-command | 4.3.2 | command (kubeadm) | 1 |
| cka-4c-join-worker-ca-pinning | 4.3.2 | command (kubeadm) | 2 |
| cka-4c-join-config-worker-taint | 4.3.2 | manifest (JoinConfiguration) | 3 |
| cka-4c-reset-removed-node | 4.3.2 | command (kubeadm) | 2 |
| cka-4e-external-etcd-config | 4.5.1 | manifest (ClusterConfiguration) | 3 |
| cka-4e-lb-endpoint-cert-sans | 4.5.1 | manifest (ClusterConfiguration) | 2 |
| cka-4e-apiserver-all-etcd-members | 4.5.1 | manifest (kube-apiserver static Pod) | 3 |
| cka-4e-etcd-member-list | 4.5.1 | command (etcdctl) | 2 |
| cka-4e-reupload-control-plane-certs | 4.5.2 | command (kubeadm) | 2 |
| cka-4e-join-control-plane | 4.5.2 | command (kubeadm) | 3 |
| cka-4e-join-config-control-plane | 4.5.2 | manifest (JoinConfiguration) | 3 |
| cka-4e-init-predefined-cert-key | 4.5.2 | manifest (Init + ClusterConfiguration) | 2 |

Mix: 12 command (50 %, all `invocation`) / 12 manifest (50 %), slightly off the 45/55 target: 4.2.2 and 4.3.2 are mostly command tasks (see below). Difficulty 4 / 12 / 8 (17 / 50 / 33 %).

Checks: `check-exercise.ts cka cka-4b- cka-4c- cka-4e-` 0 problem(s); `content:validate --cert cka --prefix cka-4b-` / `cka-4c-` / `cka-4e-` 0 problem(s) each.

## Scope gaps (engine limits)
- **4.2.1 kernel modules and sysctl** (`overlay`, `br_netfilter`, `net.ipv4.ip_forward`) are not practised: `modprobe`/`sysctl` are not in the `tools` enum and `/etc/modules-load.d/*.conf`, `/etc/sysctl.d/k8s.conf` are not YAML. Note also that the current Container Runtimes page only documents `net.ipv4.ip_forward = 1`; it no longer mentions `overlay` or `br_netfilter`. The objective wording in `objectives.yaml` may need updating.
- **4.2.2 "install and hold"**: `apt-get`, `apt-mark`, `dnf` are not in the `tools` enum, and the yum repo file is not YAML. Holding is covered only in stems and explanations; the exercises cover `systemctl enable --now kubelet`, `kubeadm config images pull --kubernetes-version`, `kubeadm version -o short` and pinning `kubernetesVersion`/`imageRepository`.
- **Cgroup driver**: since v1.34 (GA) the kubelet takes the cgroup driver from the CRI (`RuntimeConfig` RPC); containerd 1.x support ended in v1.36 (blog "Kubernetes v1.34: … cgroup driver lookup now GA"). In v1.37 the KubeletConfiguration `cgroupDriver` is only a fallback, so no exercise asks to set it; the systemd driver is practised on the containerd side (restart after `SystemdCgroup = true`). The page "Configuring a cgroup driver" still says kubeadm defaults `cgroupDriver` to systemd and calls detection alpha (stale): to report to the course author.

## Parser limitations (accepted correct answers that fail)
- `kubeadm join --control-plane k8s-api.example.com:6443 …` (endpoint right after `--control-plane`, as in the kubeadm join reference examples): `--control-plane` is not a known boolean for kubeadm, so it swallows the endpoint and `cka-4e-join-control-plane` fails the endpoint check. Solutions put the endpoint first, like the `kubeadm init` output. Suggest adding `control-plane`, `upload-certs`, `print-join-command`, `discovery-token-unsafe-skip-ca-verification`, `cluster` to the generic boolean set.
- Generic short flags always take the next word: `kubeadm reset -f --cri-socket …` mis-parses; `cka-4c-reset-removed-node` only needs `-f`/`--force`.
- `cka-4c-join-worker-ca-pinning` requires `--token`; the equivalent `--discovery-token X --tls-bootstrap-token X` fails.
- `cka-4e-apiserver-all-etcd-members` requires one comma-separated `--etcd-servers=`; repeating the flag three times (valid for a string-slice flag) fails the regex.
- `cka-4e-etcd-member-list` requires the `server.crt`/`server.key` pair named in the stem; `healthcheck-client.crt` would also work in reality.

## Facts not read on a fetched page (from knowledge, kept because standard)
- Image list in `cka-4b-prepull-images-version` (kube-apiserver, controller manager, scheduler, kube-proxy, CoreDNS, pause, etcd).
- `kubeadm init phase upload-certs` without `--upload-certs` skips the upload (negative in `cka-4e-reupload-control-plane-certs`).
- Error wording paraphrased in stems: kubeadm "multiple CRI endpoints" error, kubelet swap startup failure, Flannel "pod cidr not assigned".
- `cka-4c-kcm-allocate-node-cidrs`: the explanation says `kubeadm upgrade` regenerates the static Pod from `kubeadm-config`; an unknown flag (`--pod-network-cidr`) stops the controller manager. Both standard behaviors, not quoted from a page.
- Flannel ConfigMap copied from `flannel-io/flannel` master `Documentation/kube-flannel.yml` (image v0.28.11, namespace `kube-flannel`); the `192.168.0.0/16` Calico CIDR is only given as a stem fact.

## Other notes
- kubernetes.io could be read only through WebFetch (curl got a proxy 403). Reference titles were taken from the pages and from titles already used in the repo; "Options for Highly Available Topology", "Creating Highly Available Clusters with kubeadm", "Swap memory management", "kubeadm init phase", "kubeadm token", "kubeadm reset", "kubeadm version" and "kubeadm config" were not checked against the HTML `<title>`.
- The chapter `42-kubeadm-install-ha.en.md` did not exist yet; facts come from kubernetes.io (Installing kubeadm, Container Runtimes, kubeadm init/init phase/join/token/reset/config/version, kubeadm Configuration v1beta4, Kubelet Configuration v1beta1, Swap memory management, HA topology and HA cluster pages, Creating a cluster with kubeadm, kube-apiserver and kube-controller-manager references, Operating etcd clusters), the etcd FAQ and the etcdctl README.
