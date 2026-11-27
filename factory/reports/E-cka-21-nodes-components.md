# E-cka-21-nodes-components — report

24 exercises in `content/cka/questions/troubleshooting/`, 4 per objective 2.1.1, 2.1.2, 2.1.3, 2.2.1, 2.2.2, 2.2.3.
Mix: 11 command (all invocation: journalctl, systemctl, kubectl, crictl, etcdctl) / 13 manifest (KubeletConfiguration, static Pod manifests, one Pod); difficulty 4 × 1, 12 × 2, 8 × 3.
Checks: `check-exercise.ts cka cka-2a- cka-2b-` → 0 problem(s); `content:validate --prefix cka-2a-` and `cka-2b-` → 0 problem(s).

## Sources

- Static Pod manifests follow the kubeadm source of `release-1.37` (`cmd/kubeadm/app/phases/controlplane/manifests.go`, `volumes.go`, `phases/etcd/local.go`, `util/staticpod/utils.go`, `constants/constants.go`): flags, named probe port `probe-port`, probe values (liveness 10/15/8/10, readiness 0/15/3/1, startup failureThreshold 24), scheduler 10259, controller manager 10257, `kubeconfig` hostPath volume `FileOrCreate`, etcd image `3.7.0-0`, etcd `--listen-client-urls=https://127.0.0.1:2379,https://<ip>:2379`. Not cited as references (GitHub); kubernetes.io pages are cited instead.
- Eviction: the omitted `evictionHard` signals are set to 0 unless `mergeDefaultEvictionSettings: true` (Node-pressure Eviction page and kubelet config reference). Stems require all signals written explicitly, so a `mergeDefaultEvictionSettings` answer would fail the checks.
- Allocatable formula and field names (`kubeReserved`, `systemReserved`, `evictionHard`) from "Reserve Compute Resources for System Daemons".
- The health endpoints page marks individual checks (`/livez/etcd`) as alpha in v1.37: not used.

## Doubts to verify

- Log and event lines in stems and files (kubelet CRI dial error, API server grpc/x509 warning, controller manager "error reading key…", `Startup probe failed: Get …`, `systemctl status` output, `crictl ps -a` columns) are illustrative, written from the usual formats, not copied from a real run.
- `cka-2a-kubelet-runtime-endpoint`: the negative `containerd.sock.ttrpc` is wrong because that socket is containerd's ttrpc shim socket, not the CRI gRPC one (from containerd knowledge, not checked on containerd.io).
- `cka-2b-scheduler-image-tag`: the negative `kube-scheduler:latest` relies on the stem ("same version as the other components"); whether registry.k8s.io publishes a `latest` tag was not checked.
- `cka-2b-controller-manager-sa-key`: negative 3 removes `--service-account-private-key-file`; that it only disables the legacy token Secret controller (the process then starts) is from memory of the controller manager, not checked on kubernetes.io.
- `cka-2a-control-plane-taints-pod`: a single catch-all toleration `operator: Exists` (no key) is also valid but fails the per-taint checks; the stem asks for one toleration per taint.

## Parser limits found (factory/exercise.ts, not changed)

- Short flags of non-kubectl tools always take the next word as value: `crictl ps -a --name kube-apiserver` parses as `a="--name"`; `journalctl -f -u kubelet` as `f="-u"`; `journalctl -xeu kubelet` as `x="eu"`. Exercises avoid these forms (`crictl ps -a` alone, long flags), but a candidate typing them would fail the checks.
- A leading `ETCDCTL_API=3` makes the command invalid (must start with the tool); the etcdctl stem says not to prefix environment variables.
- `kubectl drain node-3` / `uncordon` put the node name in `resource`; checks use `args` instead.
