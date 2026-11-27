# QZ-cka-42-kubeadm-install-ha — report

File: `content/cka/quizzes/42-kubeadm-install-ha.yaml` (10 questions, `cka-qz-42-01` to `-10`).

| # | Objective | Diff. | Type | Tests |
| --- | --- | --- | --- | --- |
| 1 | 4.2.1 | 1 | single | Only required sysctl: `net.ipv4.ip_forward = 1` |
| 2 | 4.3.2 | 1 | single | Default bootstrap token TTL 24 h (vs 2 h certificate key, `0`, single use) |
| 3 | 4.2.2 | 2 | single | pkgs.k8s.io repository URL holds the minor version |
| 4 | 4.5.1 | 2 | multi (2 of 5) | Quorum (4 members, 2 of 3 down, 2 members), stacked vs external communication |
| 5 | 4.5.2 | 2 | single | Manual certificate copy: `apiserver.crt` is generated on the joining node |
| 6 | 4.3.2 | 3 | command/invocation | Worker join with `--cri-socket` (two runtimes) and `--node-name` |
| 7 | 4.5.2 | 3 | command/invocation | `kubeadm token create --print-join-command --certificate-key` |
| 8 | 4.5.1 | 3 | command/invocation | HA `kubeadm init`: LB endpoint, `--upload-certs`, advertise address on a two-NIC node, Pod CIDR |
| 9 | 4.2.1 | 3 | manifest | KubeletConfiguration after CRI-O to containerd: `containerRuntimeEndpoint` + `cgroupDriver: systemd` |
| 10 | 4.3.1 | 3 | manifest | v1beta4 `extraArgs` list for controllerManager/scheduler, `node-cidr-mask-size` on the controller manager |

Bank exercises of the six objectives (24 files in `content/cka/questions/cluster/`) were read; none of these tasks, fields or traps is repeated (the bank's worker join has no `--cri-socket`/`--node-name`; its token task requires `--certificate-key` absent; its init command has no endpoint/upload-certs; its kubelet task is about swap; its v1beta4 file tests `apiServer.extraArgs`).

## Verified on (fetched 2026-11-27)

kubeadm token (`--certificate-key` with `--print-join-command`, `--ttl` default 24h0m0s, optional `[token]` argument), kubeadm join (`--cri-socket`, `--node-name`), kubeadm init (flag defaults, `--upload-certs` Secret 2 h), Creating Highly Available Clusters with kubeadm (file list for manual copy, "copy only these files", LB), Options for Highly Available Topology, etcd FAQ v3.6 (quorum table), Container Runtimes (ip_forward only, sockets, SystemdCgroup paths), Configuring a cgroup driver, Kubelet Configuration (v1beta1) (cgroupDriver default cgroupfs, containerRuntimeEndpoint), kubeadm Configuration (v1beta4) (extraArgs `[]Arg` for apiServer/controllerManager/scheduler/etcd.local, example with `node-cidr-mask-size`), Installing kubeadm, Creating a cluster with kubeadm (no conversion to HA without `--control-plane-endpoint`).

## Doubts and limits

- Q6 and Q9 accept the CRI socket without the `unix://` scheme (`/run/containerd/containerd.sock`). kubeadm and the kubelet historically prepend `unix://` with a deprecation warning; not re-verified for v1.37. If the scheme-less form was removed, drop those two `oneOf` values.
- Q9: on some kubeadm nodes the runtime endpoint may also appear in `/var/lib/kubelet/kubeadm-flags.env` (`--container-runtime-endpoint`); the task only covers `config.yaml`, as the bank does.
- Q10: kubeadm needs `value` as a string (`"25"`); an unquoted `25` would probably be rejected by kubeadm's decoder, but the check engine cannot distinguish `25` from `"25"` (both pass). The explanation says to quote it.
- Q6: a candidate who replaces `--token` by `--discovery-token` + `--tls-bootstrap-token` would fail the `token` check although the join would work (rare spelling).
- Q3: the exact apt error text is paraphrased in the stem ("version `1.37.1-*` was not found"), not quoted.
- Q4 needs a multi (Choose two): allowed by the task file, although BRIEF-K8S restricts `multi` for CNCF exams; no scoring NOTE (CNCF scores multi all or nothing).
- Chapter: no error found. Its claim that kube-scheduler and kube-controller-manager use leader election was not used (not on the pages fetched).
