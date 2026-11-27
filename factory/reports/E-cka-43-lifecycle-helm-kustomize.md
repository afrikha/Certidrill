# E-cka-43-lifecycle-helm-kustomize — report

20 exercises in `content/cka/questions/cluster/`, 4 per objective (4.4.1, 4.4.2, 4.4.3, 4.6.1, 4.6.2): 10 `command` (all mode `invocation`) and 10 `manifest`; difficulty 3 × 1, 10 × 2, 7 × 3. `check-exercise.ts cka cka-4d- cka-4f-`: 20 exercises, 0 problems. `content:validate` with `--prefix cka-4d-` and with `--prefix cka-4f-`: 0 problems, 0 warnings.

## Deviations

- Mix: the split is 50 % `command` / 50 % `manifest`, not 45/55. Helm (4.6.1) has few YAML tasks the checker accepts, because a values file has no `apiVersion`/`kind`. I dropped a Kustomize `helmCharts` exercise on purpose: it needs `kubectl kustomize --enable-helm`, `kubectl apply -k` cannot build it, and it is not how the exam installs charts.
- No `body.mode: object`. The lifecycle and Helm tasks are all operations (kubeadm, etcdctl, etcdutl, helm, drain, apply -k).

## Doubts to confirm

- **cka-4d-upgrade-apply-plan-output**: the version check also accepts `1.37.2` without the `v`. I assumed that kubeadm parses both forms; not verified. The plan output is my own layout, based on kubeadm's format.
- **cka-4d-upgrade-config-no-renewal**: the explanation says that `upgrade node` follows the version that `upgrade apply` stored in the cluster (kubeadm-config). It is inferred from `UpgradeNodeConfiguration`, which has no `kubernetesVersion`; the page does not state it.
- **cka-4d-pdb-unblock-drain**: the drain error lines ("Cannot evict pod as it would violate the pod's disruption budget", "will retry after 5s") are from memory of kubectl's output, not from kubernetes.io.
- **cka-4d-etcd-snapshot-save**:
  - The endpoint check accepts `192.168.10.11:2379` without `https://`. I assumed that etcdctl uses TLS when certificate flags are given.
  - `ETCDCTL_API=3 etcdctl …` is refused by the engine (env assignment). The stem says that v3 is the default, so a candidate has no reason to type it, but the profile cites it as a habit. Consider accepting a leading `VAR=value` in `parseCommand`.
- **cka-4d-etcd-snapshot-restore**: etcd 3.7.0 has been released (kubernetes.io blog, 2026-07-08), and I could not confirm which etcd version kubeadm v1.37 deploys. The stems therefore say "etcd 3.6 or later". The v3.7 recovery page uses the same commands (`etcdctl snapshot save`, `etcdutl snapshot restore --data-dir`).
- **cka-4d-etcd-manifest-hostpath**, **cka-4d-apiserver-etcd-cafile**: the `image` lines are left out of the starters on purpose (the etcd and kube-apiserver image tags for v1.37 are not verified). The stem says they are left out.
- **cka-4d-apiserver-etcd-cafile**: the grpc log line is a typical kube-apiserver message, written from memory, not quoted from a page.
- **cka-4d-certs-renew-apiserver**: the dates in `expiration.txt` are invented; the layout follows the sample on kubeadm-certs.
- **cka-4f-helm-install-cert-manager**:
  - The version is cert-manager v1.21.3, the latest on cert-manager.io on 2026-11-27.
  - The version check also accepts `1.21.3` (a semver constraint without `v`). This may not resolve for the OCI chart.
  - "crds.enabled is off by default" is not stated on the page. The negative's `why` only says that the CRDs are not installed without it.
- **cka-4f-helm-upgrade-reuse-values**: chart version 3.13.0 of metrics-server is assumed to exist (not verified on the chart repository). The value keys `replicas`, `args` and `hostNetwork.enabled` were verified in the chart README.
- **cka-4f-helm-adopt-existing**:
  - The Helm docs (Troubleshooting page) list the ownership label and annotations.
  - Neither the adoption behavior (an object with this metadata is imported by `helm install`) nor the exact error text is on helm.sh. Both come from Helm's behavior since 3.2.
  - The ClusterRole name `system:metrics-server` and its rules follow the upstream manifests, from memory.
- **cka-4f-apply-k-server-side**: the error text "metadata.annotations: Too long: must have at most 262144 bytes" and the reason (the last-applied annotation) are not stated on the Server-Side Apply page. That page only describes field management versus the last-applied annotation.
- **cka-4f-kustomize-image-mirror**, **cka-4f-kustomize-append-arg**: metrics-server `v0.8.0` and its five default args are taken from memory of the upstream `components.yaml`. Only the scenario depends on them; no check does.
- A reference to kubectl.docs.kubernetes.io (patches with a target, `name: not-used`) was used for facts but not cited, because that host is not in the CNCF reference list. The citations point to kubernetes.io pages instead.
