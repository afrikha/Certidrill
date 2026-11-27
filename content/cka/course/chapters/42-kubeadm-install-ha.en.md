Building a cluster with kubeadm is a sequence where order matters: prepare every node (runtime, cgroup driver, swap, kernel settings), install the three packages at the right version and hold them, run `kubeadm init` on the first control plane node, install a CNI plugin, then join workers and extra control plane nodes. The exam gives you pre-built machines and asks for one step of that chain, or for the repair of a step that was done wrong. This chapter follows the chain in order, with the commands of kubernetes.io for v1.37, and ends with the highly available control plane: stacked or external etcd, quorum, the load-balanced endpoint and `--control-plane` joins.

<!-- section: prepare-nodes | objectives: 4.2.1 -->
## Preparing the nodes

Each machine needs 2 GB of RAM or more, 2 CPUs or more for control plane nodes, full network connectivity, and a unique hostname, MAC address and `product_uuid` (`ip link`, `cat /sys/class/dmi/id/product_uuid`).

```bash
# IPv4 forwarding, persistent
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.ipv4.ip_forward = 1
EOF
sudo sysctl --system
sysctl net.ipv4.ip_forward                 # net.ipv4.ip_forward = 1

# Kernel modules many CNI plugins and lab guides still expect
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
sudo modprobe overlay
sudo modprobe br_netfilter
lsmod | grep -E 'overlay|br_netfilter'

# Swap: the kubelet refuses to start when swap is on (failSwapOn: true)
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab
```

kubernetes.io now lists only `net.ipv4.ip_forward = 1` as required and says other modules and sysctls depend on the network plugin; with `br_netfilter` loaded, plugins that rely on iptables for bridged traffic also need `net.bridge.bridge-nf-call-iptables = 1` in the same sysctl file.

**Container runtime.** Install containerd (or CRI-O) on every node and set its cgroup driver to `systemd` (recommended on systemd hosts and required in practice with cgroup v2). Since v1.34 the kubelet detects the driver from the runtime through the `RuntimeConfig` CRI call (containerd 2.x, CRI-O) and then ignores its own `cgroupDriver`; that setting (built-in default `cgroupfs`, written as `systemd` by kubeadm) is only a fallback for runtimes without the call, such as containerd 1.x.

```bash
containerd config default | sudo tee /etc/containerd/config.toml
sudo vi /etc/containerd/config.toml        # set SystemdCgroup = true
sudo systemctl restart containerd
sudo systemctl enable containerd
```

```text
# containerd 2.x (config version 3)
[plugins.'io.containerd.cri.v1.runtime'.containerd.runtimes.runc.options]
  SystemdCgroup = true
# containerd 1.x
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
  SystemdCgroup = true
```

Check that `cri` is not in `disabled_plugins` of `config.toml`. Default CRI sockets on Linux: containerd `/run/containerd/containerd.sock`, CRI-O `/var/run/crio/crio.sock`, cri-dockerd `/run/cri-dockerd.sock` (`/var/run` is a link to `/run`; kubeadm and the kubelet take them as `unix://` URLs).

**Ports** to open (defaults):

| Node | Port (TCP) | Used by |
| --- | --- | --- |
| Control plane | 6443 | Kubernetes API server, everyone |
| Control plane | 2379-2380 | etcd client and peer API |
| Control plane | 10250, 10259, 10257 | kubelet, kube-scheduler, kube-controller-manager |
| Worker | 10250, 10256 | kubelet, kube-proxy |
| Worker | 30000-32767 (TCP and UDP) | NodePort Services |

```bash
nc 127.0.0.1 6443 -zv -w 2
```

> **Exam trap.** The cgroup driver is fixed on the runtime side: with `SystemdCgroup = false`, containerd 2.x makes the kubelet use `cgroupfs` too, whatever `cgroupDriver` says, and a systemd host ends up with two cgroup managers (node or Pods unstable). Fix `config.toml`, then `systemctl restart containerd` **and** `systemctl restart kubelet`. `swapoff -a` alone does not survive a reboot: comment the swap line of `/etc/fstab` too.

<!-- section: install-packages | objectives: 4.2.2 -->
## Installing and holding kubeadm, kubelet and kubectl

The packages come from `pkgs.k8s.io`, one repository per minor version. On Debian and Ubuntu:

```bash
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl gpg
sudo mkdir -p -m 755 /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.37/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.37/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update
apt-cache madison kubeadm                  # available versions: 1.37.x-*
sudo apt-get install -y kubelet='1.37.1-*' kubeadm='1.37.1-*' kubectl='1.37.1-*'
sudo apt-mark hold kubelet kubeadm kubectl
apt-mark showhold
sudo systemctl enable --now kubelet
```

On RHEL-family systems the repository file `/etc/yum.repos.d/kubernetes.repo` points to `https://pkgs.k8s.io/core:/stable:/v1.37/rpm/` with `exclude=kubelet kubeadm kubectl cri-tools kubernetes-cni`, so a plain `dnf update` never moves them:

```bash
sudo dnf install -y kubelet-'1.37.1-*' kubeadm-'1.37.1-*' kubectl-'1.37.1-*' --disableexcludes=kubernetes
sudo systemctl enable --now kubelet
```

(`--disableexcludes=kubernetes` is DNF4; DNF5 uses `--setopt=disable_excludes=kubernetes`.)

```bash
kubeadm version -o short                   # v1.37.1
kubelet --version
kubectl version --client
```

After installation the kubelet restarts every few seconds: it is waiting in a crash loop for `kubeadm init` or `join` to give it a configuration. That is expected.

| Version rule (kubeadm v1.37) | Allowed |
| --- | --- |
| Control plane components | v1.37 or v1.36 |
| kubelet | Same as kubeadm or up to three minors older (v1.34 to v1.37) |
| kubeadm used for `join` | The version that last ran `init` or `upgrade` |

> **Exam trap.** The repository URL contains the **minor** version. A node configured with `.../v1.36/deb/` cannot see 1.37 packages, whatever version string you pass to `apt-get`: change the URL in `kubernetes.list` first. And without `apt-mark hold`, a routine `apt-get upgrade` moves the packages outside the kubeadm upgrade procedure.

<!-- section: kubeadm-init | objectives: 4.3.1 -->
## Initializing the control plane

```bash
sudo kubeadm init \
  --control-plane-endpoint=k8s-api.example.com:6443 \
  --pod-network-cidr=10.244.0.0/16 \
  --apiserver-advertise-address=192.168.10.11 \
  --kubernetes-version=v1.37.1 \
  --cri-socket=unix:///var/run/containerd/containerd.sock
```

| Flag | Default | Purpose |
| --- | --- | --- |
| `--pod-network-cidr` | none | Pod range; the control plane then allocates a CIDR per node. Must match the CNI plugin and not overlap node networks |
| `--service-cidr` | `10.96.0.0/12` | ClusterIP range |
| `--service-dns-domain` | `cluster.local` | Cluster DNS domain |
| `--control-plane-endpoint` | none | Shared DNS name or load balancer address of all control plane nodes; required to add control plane nodes later |
| `--apiserver-advertise-address` | Default interface | Address of this API server instance |
| `--apiserver-bind-port` | `6443` | API server port |
| `--kubernetes-version` | `stable-1` | Version of the control plane images |
| `--cri-socket` | Auto-detected | Only when several runtimes are installed |
| `--upload-certs` | off | Store control plane certificates in the `kubeadm-certs` Secret (HA) |
| `--ignore-preflight-errors` | none | Turn named checks (`Swap`, `NumCPU`) or `all` into warnings |
| `--dry-run` | off | Show what would be done |

The same settings in a configuration file, the usual form for anything beyond flags:

```yaml
apiVersion: kubeadm.k8s.io/v1beta4
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 192.168.10.11
  bindPort: 6443
nodeRegistration:
  criSocket: unix:///var/run/containerd/containerd.sock
---
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
kubernetesVersion: v1.37.1
controlPlaneEndpoint: k8s-api.example.com:6443
networking:
  podSubnet: 10.244.0.0/16
  serviceSubnet: 10.96.0.0/12
  dnsDomain: cluster.local
apiServer:
  certSANs:
  - k8s-api.example.com
  extraArgs:
  - name: authorization-mode
    value: Node,RBAC
---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
cgroupDriver: systemd
```

```bash
kubeadm config print init-defaults > kubeadm-config.yaml   # starting point
sudo kubeadm config images pull --config kubeadm-config.yaml
sudo kubeadm init --config kubeadm-config.yaml
```

The main `init` phases, in order: `preflight`, `certs` (into `/etc/kubernetes/pki`), `kubeconfig` (`admin.conf`, `super-admin.conf`, `kubelet.conf`, `controller-manager.conf`, `scheduler.conf`), `etcd`, `control-plane` (static Pod manifests in `/etc/kubernetes/manifests`), `kubelet-start`, `wait-control-plane`, `upload-config`, `upload-certs`, `mark-control-plane`, `bootstrap-token`, `addon` (CoreDNS, kube-proxy), `show-join-command`.

Then give kubectl its credentials and install the network:

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
export KUBECONFIG=/etc/kubernetes/admin.conf            # as root, instead
kubectl apply -f /root/cni/plugin.yaml                  # the CNI manifest the task gives
kubectl get pods -n kube-system -w                      # CoreDNS goes from Pending to Running
kubectl get nodes                                       # Ready once the CNI is up
kubectl taint nodes --all node-role.kubernetes.io/control-plane-   # single-node lab only
```

`admin.conf` belongs to the `kubeadm:cluster-admins` group (bound to `cluster-admin`); `super-admin.conf` is in `system:masters`, which bypasses RBAC: keep it out of daily use.

> **Exam trap.** In v1beta4, `extraArgs` is a **list** of `name`/`value` pairs, not a map (`authorization-mode: Node,RBAC` is the old v1beta3 form). And kubeadm cannot turn a cluster created without `--control-plane-endpoint` into an HA cluster: set it at `init` time when the task mentions future control plane nodes.

<!-- section: join-reset | objectives: 4.3.2 -->
## Joining nodes and resetting a node

The join command printed by `init` contains a bootstrap token valid 24 hours (`--token-ttl`, default `24h0m0s`). When it is lost or expired, create a new one on a control plane node:

```bash
kubeadm token create --print-join-command
kubeadm token create --ttl 2h --print-join-command
kubeadm token list
kubeadm token delete abcdef
openssl x509 -pubkey -in /etc/kubernetes/pki/ca.crt | openssl rsa -pubin -outform der 2>/dev/null | openssl dgst -sha256 -hex | sed 's/^.* //'
```

On the worker, as root:

```bash
kubeadm join k8s-api.example.com:6443 --token abcdef.0123456789abcdef \
  --discovery-token-ca-cert-hash sha256:7c2e69131a36ae2a042a339b33381c6d0d43887e2de83720eff5359e26aec866
kubectl get nodes                                       # from the control plane
```

| Join flag | Meaning |
| --- | --- |
| `--token` | Bootstrap token, form `[a-z0-9]{6}.[a-z0-9]{16}` |
| `--discovery-token-ca-cert-hash` | `sha256:` pin of the cluster CA public key |
| `--discovery-token-unsafe-skip-ca-verification` | Join without the pin (insecure) |
| `--control-plane` | Make this node a control plane instance |
| `--certificate-key` | Decrypt the certificates of the `kubeadm-certs` Secret |
| `--cri-socket`, `--node-name`, `--config` | Runtime socket, node name, `JoinConfiguration` file |

**Removing a node** follows a fixed order:

```bash
kubectl drain node-3 --delete-emptydir-data --force --ignore-daemonsets   # control plane
ssh node-3
sudo kubeadm reset -f                                                     # on the node
sudo rm -rf /etc/cni/net.d                                                # not cleaned by reset
rm -rf $HOME/.kube                                                        # not cleaned by reset
exit
kubectl delete node node-3                                                # control plane
```

`kubeadm reset` runs the phases `preflight`, `remove-etcd-member` (on a stacked control plane node) and `cleanup-node`; it removes what kubeadm wrote (kubeconfig files, static Pod manifests, certificates, the stacked etcd data), but not the CNI configuration, the iptables, nftables or IPVS rules of kube-proxy, nor `$HOME/.kube`, and never the data of an external etcd.

> **Exam trap.** A join that fails on "token not found" or "could not find a JWS signature" means an expired token: generate a new command with `kubeadm token create --print-join-command`, do not reinstall. A node that was joined before must be `kubeadm reset` before it can join again.

<!-- section: ha-topologies | objectives: 4.5.1 -->
## HA topologies, quorum and the control plane endpoint

| Topology | etcd runs | Minimum hosts | Trade-off |
| --- | --- | --- | --- |
| **Stacked** (kubeadm default) | On each control plane node; each member serves only its local API server | 3 control plane nodes | Simpler; losing a node loses an API server **and** an etcd member |
| **External** | On dedicated hosts; every API server talks to every member | 3 control plane + 3 etcd hosts | More hosts; failures of control plane and etcd are decoupled |

etcd needs a **quorum** of `(n/2)+1` members (integer division) to accept writes:

| etcd members | Quorum | Failures tolerated |
| --- | --- | --- |
| 1 | 1 | 0 |
| 2 | 2 | 0 |
| 3 | 2 | 1 |
| 4 | 3 | 1 |
| 5 | 3 | 2 |
| 7 | 4 | 3 |

Use an odd number of members; etcd recommends no more than seven. kube-scheduler and kube-controller-manager run on every control plane node but use leader election, so only one instance of each is active.

Workers and clients reach the API servers through `controlPlaneEndpoint`: a DNS name or a TCP load balancer (`k8s-api.example.com:6443`) forwarding to port 6443 of every control plane node, with a TCP health check on that port. Its address must always match kubeadm's `controlPlaneEndpoint`.

```bash
nc -zv -w 2 k8s-api.example.com 6443     # "connection refused" before init is fine; a timeout is not
kubectl -n kube-system get pods -l component=etcd -o wide
kubectl get nodes -l node-role.kubernetes.io/control-plane
```

For external etcd, the `ClusterConfiguration` lists the members and the client certificates:

```yaml
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
kubernetesVersion: v1.37.1
controlPlaneEndpoint: k8s-api.example.com:6443
etcd:
  external:
    endpoints:
    - https://10.0.0.21:2379
    - https://10.0.0.22:2379
    - https://10.0.0.23:2379
    caFile: /etc/kubernetes/pki/etcd/ca.crt
    certFile: /etc/kubernetes/pki/apiserver-etcd-client.crt
    keyFile: /etc/kubernetes/pki/apiserver-etcd-client.key
```

> **Exam trap.** Two etcd members are **less** available than one: quorum is 2, so losing either member stops writes. Going from 3 to 4 members raises the quorum to 3 and adds no fault tolerance. With 3 members and 2 down, the API server cannot write anything, even though one etcd Pod is still running.

<!-- section: control-plane-join | objectives: 4.5.2 -->
## Adding control plane nodes

1. Initialize the first node with the endpoint and the certificate upload:

```bash
sudo kubeadm init --control-plane-endpoint "k8s-api.example.com:6443" --upload-certs --pod-network-cidr=10.244.0.0/16
```

2. Install the CNI plugin.
3. On each new control plane node (prepared and with packages installed), run the control plane join command from the output:

```bash
sudo kubeadm join k8s-api.example.com:6443 --token abcdef.0123456789abcdef \
  --discovery-token-ca-cert-hash sha256:7c2e69131a36ae2a042a339b33381c6d0d43887e2de83720eff5359e26aec866 \
  --control-plane --certificate-key f8902e114ef118304e561c3ecd4d0b543adc226b7a07f675f56564185ffe0c07
```

4. Join the workers with the command without `--control-plane`.

The `kubeadm-certs` Secret and its decryption key **expire after two hours**. Later, upload the certificates again from an existing control plane node and build a fresh command:

```bash
sudo kubeadm init phase upload-certs --upload-certs        # prints a new certificate key
kubeadm token create --print-join-command --certificate-key 2a6c4e1f0b9d8a7c6e5f4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a
kubeadm certs certificate-key                               # generate a key yourself (32-byte AES, hex)
```

Without `--upload-certs`, copy the shared files by hand to each new control plane node before joining: `ca.crt`, `ca.key`, `sa.key`, `sa.pub`, `front-proxy-ca.crt`, `front-proxy-ca.key`, `etcd/ca.crt` and `etcd/ca.key` (not with external etcd); kubeadm generates the other certificates with the right SANs.

```bash
kubectl get nodes -l node-role.kubernetes.io/control-plane
kubectl -n kube-system get pods -l tier=control-plane -o wide
```

> **Exam trap.** A control plane join needs **both** `--control-plane` and `--certificate-key` (when certificates were uploaded). Without `--control-plane` the machine joins as a worker; with an expired key the join fails to download `kubeadm-certs`. `--certificate-key` is a cluster secret: never write it into a file left on a worker.

<!-- section: key-points -->
## Key points

- Every node: `net.ipv4.ip_forward = 1` in `/etc/sysctl.d/k8s.conf`, swap off (and out of `/etc/fstab`), containerd with `SystemdCgroup = true` (the kubelet takes the driver from the runtime; `cgroupDriver: systemd` is the fallback).
- Packages from `pkgs.k8s.io/core:/stable:/v1.37/`, pinned (`'1.37.1-*'`), then `apt-mark hold kubelet kubeadm kubectl`.
- `kubeadm init` with `--pod-network-cidr`, `--control-plane-endpoint` or a v1beta4 `--config` file; copy `admin.conf` to `$HOME/.kube/config`; install one CNI plugin.
- Lost join command: `kubeadm token create --print-join-command`; tokens last 24 h by default.
- Remove a node: drain, `kubeadm reset`, clean `/etc/cni/net.d`, `kubectl delete node`.
- Stacked etcd is the default, 3 control plane nodes minimum; external needs 3 + 3; quorum `(n/2)+1`, odd member counts.
- HA join: `--upload-certs` at init, `join --control-plane --certificate-key`, key valid 2 hours, refreshed with `kubeadm init phase upload-certs --upload-certs`.
