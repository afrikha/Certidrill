# C-cka-5 — CKA course, chapters 43-lifecycle-helm-kustomize and 51-services-connectivity-dns

Files (English only, no `.fr.md`): `content/cka/course/chapters/43-lifecycle-helm-kustomize.en.md` (about 2,150 words incl. code, about 1,800 prose), `content/cka/course/chapters/51-services-connectivity-dns.en.md` (about 2,170 incl. code, about 1,700 prose).
Checks: `check-cert.ts cka 43-lifecycle-helm-kustomize 51-services-connectivity-dns` gives 0 problems. `content:validate --cert cka --course --chapters ...` gives 0 problem(s), 59/59 objectives covered.

## Sources (fetched 2026-11-27)
- kubernetes/website `main` (v1.37 docs; `data/releases/schedule.yaml` lists 1.37.2 as the latest patch), read through raw.githubusercontent.com: kubeadm-upgrade, upgrading-linux-nodes, change-package-repository, configure-upgrade-etcd, kubeadm-certs (task + reference), the generated `kubeadm upgrade apply/plan` and `kubeadm certs check-expiration` flag tables, the PKI certificates best practices, kubeadm implementation-details, kustomization task, service, endpoint-slices, the networking overview, cluster-ip-allocation, extend-service-ip-ranges, the MultiCIDRServiceAllocator feature gate, dns-pod-service, dns-custom-nameservers, dns-debugging-resolution, the kubectl run/expose/create service (clusterip, nodeport, externalname) references, and the kube-apiserver/kube-controller-manager/kubeadm init flag references.
- etcd.io v3.6 disaster recovery page (etcd-io/website source). kubeadm `constants.go` (release-1.37) gives `DefaultEtcdVersion = "3.7.0-0"`. `phases/etcd/local.go` gives the volume names `etcd-data`/`etcd-certs` and `DirectoryOrCreate`.
- helm.sh: Helm 4 docs (banner "Version: 4.3.1"). Flag tables were read from helm-www `docs/helm/helm_*.md`.
- kubectl.docs.kubernetes.io (Kustomize reference): `patchesStrategicMerge` and `commonLabels` deprecated in v5.0.0. coredns.io reload plugin: 30 s interval, 15 s jitter, old config kept on error.

## Doubts / deviations
- **Helm 4**: helm.sh now documents Helm 4. `--atomic` is gone and `--rollback-on-failure` replaces it. If the exam environment still ships Helm 3, `--atomic` would exist. The chapter only names the new flag. The flags it uses (`--create-namespace`, `--version`, `-f`, `--set`, `--reuse-values`, `--install`, `--keep-history`) exist in both versions.
- **Helm release storage as Secrets** in the release namespace: this is the default storage driver, but I did not read it on a fetched helm.sh page.
- **Upgrade with `--set` and no `--reuse-values`** goes back to the chart defaults. This follows from the documented `--reuse-values` / `--reset-values` behaviour. The exact rule (when no override is given, Helm reuses the last values) is Helm source behaviour, not a quoted sentence.
- **Drain flags**: kubernetes.io's upgrade page uses only `--ignore-daemonsets`. The chapter adds `--delete-emptydir-data` (as in the CKA profile and chapter 21).
- **etcdctl `snapshot restore`/`status`**: kubernetes.io says they are deprecated and "slated for removal from etcd v3.6", and the etcd v3.6 page says to restore with etcdutl only. The chapter says "deprecated and slated for removal in v3.6". It does not claim that they are absent from the etcd 3.7 binary.
- **Restore procedure**: the chapter stops the API server by moving its manifest out, as the kubernetes.io caution says, and changes only the `etcd-data` hostPath. Many exam guides skip the API server stop. Both work on a single control plane node.
- **The trap on changing `--data-dir` alone** (the path is not mounted in the container) is deduced from the kubeadm manifest layout (`mountPath` = `dataDir`). It is not quoted on kubernetes.io.
- **The etcdctl errors without certificates** ("context deadline exceeded", the plain HTTP default endpoint) come from general etcdctl behaviour, not from a fetched page.
- **The `apt-cache madison` version string `1.37.2-1.1`** is the usual pkgs.k8s.io format. kubernetes.io writes `1.37.x-*`.
- **Kustomize**: patches run before `namePrefix`, so they name the base resource. This is Kustomize's transformer order, not stated on kubernetes.io. Also not on kubernetes.io: "`kubectl apply -f` on a kustomization directory fails on `kustomization.yaml`", and "`commonLabels` breaks apply on an existing Deployment (immutable selector)".
- **`kubectl create service ...` sets the selector `app=<name>`**: this is standard kubectl generator behaviour. The reference pages don't state it.
- **The ClusterIP not answering ping in iptables mode** is general knowledge (in ipvs mode it can answer). The chapter qualifies it with "in the default iptables mode".
- **The busybox `wget` error strings** (`bad address`, `connection refused`) come from general knowledge.
