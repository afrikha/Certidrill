# C-cka-4 — doubts and deviations

Chapters: `41-rbac-extensions.en.md`, `42-kubeadm-install-ha.en.md` (English only). Both validators report 0 problem(s).

Sources fetched (kubernetes.io v1.37 docs unless noted): RBAC, kubectl auth can-i, kubectl create role / clusterrole / rolebinding, network-plugins, runtime-class, crictl debugging, volumes (CSI section), CSIDriver API reference, custom-resource-definitions, operator pattern, kubectl explain, container-runtimes, install-kubeadm, create-cluster-kubeadm, kubeadm init / join / token / reset references, kubeadm config v1beta4, configure-cgroup-driver, high-availability, ha-topology, kubeadm-upgrade (package version format), troubleshooting-kubeadm, ports-and-protocols; etcd.io v3.6 FAQ (quorum table); helm.sh CRD best practices.

Length: prose (outside code blocks) is 1,619 words (41) and 1,750 words (42). With code blocks counted, 42 is about 2,360 words, a little over 2,200. This is in line with 43 (about 2,300).

Doubts:

- **`overlay` / `br_netfilter` / `net.bridge.bridge-nf-call-iptables`**: the objective lists them, but the v1.37 container-runtimes page now requires only `net.ipv4.ip_forward`. It says other modules and sysctls depend on the network plugin. The chapter says this and shows the modules as what "many CNI plugins and lab guides still expect". The `/etc/modules-load.d/k8s.conf` file and the bridge sysctl come from the older version of the page, not from the current one.
- **Flannel does not enforce NetworkPolicy**: general knowledge, not quoted from a fetched page (the docs only say the plugin must support NetworkPolicy).
- **The CSIDriver page body was not reached** (the fetch was cut off). The chapter names only `kubectl get csidrivers` / `csinodes` and the StorageClass `provisioner`. It states no CSIDriver field defaults.
- **RuntimeClass containerd section**: the runtime-class page still shows `plugins."io.containerd.grpc.v1.cri"` (containerd 1.x). The containerd 2.x form `plugins.'io.containerd.cri.v1.runtime'` is inferred from the container-runtimes page, which shows the runc `SystemdCgroup` example.
- **Error strings**: "resource mapping not found ... ensure CRDs are installed first" and "could not find a JWS signature" come from general knowledge of kubectl and kubeadm output.
- **What `kubeadm reset` deletes**: the reset page documents what it does not clean. The positive list (kubeconfig files, manifests, certificates, stacked etcd data) comes from general knowledge of the `cleanup-node` phase.
- **Static Pod labels** `component=etcd` and `tier=control-plane` are standard kubeadm labels, but no fetched page quotes them (same doubt as C-cka-2).
- **Leader election** of kube-scheduler and kube-controller-manager in HA: general knowledge, not quoted.
- **Swap line edit**: `sed -i '/ swap / s/^/#/' /etc/fstab` is a common idiom, not a command from kubernetes.io. The docs only say to disable swap in `/etc/fstab`.
- **`kubectl auth whoami`** is used without checking its reference page.
