A cluster has to be kept alive after `kubeadm init`: upgraded one minor version at a time, its etcd data backed up and restored, its certificates renewed before they expire after one year. Add-ons and cluster components are then installed with Helm charts or Kustomize overlays. In these tasks the **order of the steps** and **one forgotten flag** decide the result: each procedure below is given in order, with its files and classic mistakes.

<!-- section: kubeadm-upgrade | objectives: 4.4.1 -->
## Upgrading a kubeadm cluster

kubeadm upgrades go **one minor version at a time** (v1.36.x to v1.37.y, or a patch within v1.37); skipping a minor version is unsupported. The order is fixed: the first control plane node, then the other control plane nodes, then the workers, one node (or a few) at a time.

| Step | First control plane node | Other control plane nodes | Worker nodes |
| --- | --- | --- | --- |
| 1. Package repository on the new minor | Yes | Yes | Yes |
| 2. Upgrade the `kubeadm` package | Yes | Yes | Yes (with `kubectl`) |
| 3. `kubeadm upgrade plan` | Yes | No | No |
| 4. kubeadm upgrade | `kubeadm upgrade apply v1.37.2` | `kubeadm upgrade node` | `kubeadm upgrade node` |
| 5. Drain (from a machine with kubectl) | Yes | Yes | Yes |
| 6. Upgrade `kubelet` and `kubectl`, restart kubelet | Yes | Yes | Yes (kubelet) |
| 7. Uncordon | Yes | Yes | Yes |

The community packages at `pkgs.k8s.io` have **one repository per minor version**: before a minor upgrade, change `v1.36` to `v1.37` in the repository URL, or the new versions are not found.

```bash
ssh cp-1
sudo -i
sed -i 's#/v1.36/#/v1.37/#' /etc/apt/sources.list.d/kubernetes.list
apt-get update
apt-cache madison kubeadm                     # pick the patch: 1.37.2-1.1
apt-mark unhold kubeadm
apt-get install -y kubeadm='1.37.2-*'
apt-mark hold kubeadm
kubeadm version
kubeadm upgrade plan                          # checks the cluster, lists target versions
kubeadm upgrade apply v1.37.2                 # -y skips the confirmation prompt
```

Then, on every node, drain, upgrade the kubelet and put the node back:

```bash
kubectl drain cp-1 --ignore-daemonsets --delete-emptydir-data
apt-mark unhold kubelet kubectl
apt-get install -y kubelet='1.37.2-*' kubectl='1.37.2-*'
apt-mark hold kubelet kubectl
systemctl daemon-reload
systemctl restart kubelet
kubectl uncordon cp-1
kubectl get nodes                             # VERSION column shows v1.37.2
```

On a worker: kubeadm and kubectl packages, `kubeadm upgrade node` (it only updates the local kubelet configuration), `kubectl drain node-1 ...` from the control plane, kubelet package, `daemon-reload` and restart, `kubectl uncordon node-1`.

`kubeadm upgrade apply` refuses to run unless the API server is reachable, every node is `Ready` and the control plane is healthy. It upgrades the static Pod manifests (backups in `/etc/kubernetes/tmp/kubeadm-backup-manifests-<date>-<time>`, etcd data in `kubeadm-backup-etcd-<date>-<time>`), CoreDNS and kube-proxy, and **renews the kubeadm certificates** unless `--certificate-renewal=false`. It is idempotent: after a failure, run it again. The CNI plugin is not upgraded by kubeadm.

> **Exam trap.** `kubeadm upgrade apply` upgrades the control plane Pods, not the kubelet: `kubectl get nodes` still shows the old version until you install the new kubelet package and restart it. And `upgrade apply` runs on **one** node only; every other node, control plane or worker, uses `kubeadm upgrade node`.

> **Exam trap.** `apt-get install` fails or does nothing while the packages are on hold: `apt-mark unhold` first, `hold` again after. Forgetting `systemctl daemon-reload` before the restart can leave the old unit settings in place.

<!-- section: etcd-backup-restore | objectives: 4.4.2 -->
## Backing up and restoring etcd

On a kubeadm cluster, etcd is a static Pod (`/etc/kubernetes/manifests/etcd.yaml`) listening on `https://127.0.0.1:2379` with TLS. `etcdctl` needs the endpoint and three certificate files, which you read from the manifest.

```bash
grep -E 'listen-client-urls|cert-file|key-file|trusted-ca-file|data-dir' /etc/kubernetes/manifests/etcd.yaml
ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  snapshot save /opt/backup/etcd-snapshot.db
etcdutl --write-out=table snapshot status /opt/backup/etcd-snapshot.db
```

| etcdctl flag | etcd manifest flag | kubeadm file |
| --- | --- | --- |
| `--cacert` | `--trusted-ca-file` | `/etc/kubernetes/pki/etcd/ca.crt` |
| `--cert` | `--cert-file` | `/etc/kubernetes/pki/etcd/server.crt` (or `healthcheck-client.crt`) |
| `--key` | `--key-file` | `/etc/kubernetes/pki/etcd/server.key` (or `healthcheck-client.key`) |
| `--endpoints` | `--listen-client-urls` | `https://127.0.0.1:2379` (client port, not 2380) |

`ETCDCTL_API=3` is the default since etcd v3.4. Restoring is done with **`etcdutl`**, which works on files and needs no endpoint or certificate: `etcdctl snapshot restore` and `etcdctl snapshot status`, deprecated in etcd v3.5, were removed in v3.6 (kubeadm v1.37 deploys etcd 3.7). The restore **creates** a new data directory, which must not exist yet.

Restore procedure on a kubeadm control plane node:

```bash
mv /etc/kubernetes/manifests/kube-apiserver.yaml /root/          # stop the API server
etcdutl snapshot restore /opt/backup/etcd-snapshot.db --data-dir /var/lib/etcd-restore
vi /etc/kubernetes/manifests/etcd.yaml                           # hostPath of etcd-data
mv /root/kube-apiserver.yaml /etc/kubernetes/manifests/
systemctl restart kubelet
crictl ps --name etcd                                            # new container running
kubectl get pods -A                                              # the restored state
```

The only field to change in `etcd.yaml` is the host side of the data volume:

```yaml
  volumes:
  - hostPath:
      path: /var/lib/etcd-restore      # was /var/lib/etcd
      type: DirectoryOrCreate
    name: etcd-data
```

The container keeps `--data-dir=/var/lib/etcd` and its `volumeMounts` entry `mountPath: /var/lib/etcd`: they are paths inside the container, and the hostPath now feeds them the restored files. kubernetes.io also recommends setting `etcd.local.dataDir` in the `kubeadm-config` ConfigMap, otherwise the next `kubeadm upgrade` writes a manifest for the old directory, and restarting kube-scheduler, kube-controller-manager and the kubelet so that they don't keep stale data.

> **Exam trap.** Changing only `--data-dir` to `/var/lib/etcd-restore` breaks etcd: that path does not exist in the container (it is not mounted), so etcd starts on an empty directory or fails. Change the `hostPath`, or change `--data-dir`, the `mountPath` and the `hostPath` together. And restoring into the existing `/var/lib/etcd` fails while it holds data.

> **Exam trap.** `snapshot save` without `--cacert`, `--cert` and `--key` hangs then fails with a TLS or `context deadline exceeded` error, and without `--endpoints` it tries `127.0.0.1:2379` over plain HTTP. Save the file at the exact path the task gives.

<!-- section: certificates | objectives: 4.4.3 -->
## Checking and renewing certificates with kubeadm

kubeadm client and serving certificates are valid **one year** (`certificateValidityPeriod: 8760h` by default) and the CAs **ten years** (`caCertificateValidityPeriod: 87600h`). Each `kubeadm upgrade` renews them, so a cluster upgraded at least once a year never expires.

```bash
kubeadm certs check-expiration
openssl x509 -noout -enddate -in /etc/kubernetes/pki/apiserver.crt
kubeadm certs renew apiserver                 # one certificate
kubeadm certs renew all                       # every kubeadm-managed certificate
```

`check-expiration` lists the certificates in `/etc/kubernetes/pki` and the client certificates embedded in the kubeconfig files kubeadm writes (`admin.conf`, `controller-manager.conf`, `scheduler.conf`...), with a `RESIDUAL TIME` column and a second table for the CAs. `kubelet.conf` is absent: the kubelet rotates its own client certificate under `/var/lib/kubelet/pki`.

| Task asks for | Command |
| --- | --- |
| Which certificate expires first | `kubeadm certs check-expiration` |
| Exact expiry of one file | `openssl x509 -noout -enddate -in <file>` |
| Renew only the API server serving certificate | `kubeadm certs renew apiserver` |
| Renew everything | `kubeadm certs renew all` |
| Renew the kubeconfig of the scheduler | `kubeadm certs renew scheduler.conf` |
| Upgrade without renewing | `kubeadm upgrade apply v1.37.2 --certificate-renewal=false` |

`renew` writes new files but running components keep the old ones in memory: restart the control plane static Pods. They are not managed by the API server, so move each manifest out of `/etc/kubernetes/manifests`, wait about 20 seconds (`fileCheckFrequency`), and move it back. If `~/.kube/config` is a copy of `admin.conf`, copy it again.

```bash
mkdir -p /root/manifests-tmp
mv /etc/kubernetes/manifests/*.yaml /root/manifests-tmp/
sleep 20
mv /root/manifests-tmp/*.yaml /etc/kubernetes/manifests/
cp /etc/kubernetes/admin.conf /root/.kube/config
kubeadm certs check-expiration                # RESIDUAL TIME about 364d
```

> **Exam trap.** `kubeadm certs renew` signs with the CA in `/etc/kubernetes/pki`: it never renews the CA itself, and it cannot renew certificates of an external CA (`EXTERNALLY MANAGED yes`). On a cluster with several control plane nodes, run it on **each** of them.

<!-- section: helm | objectives: 4.6.1 -->
## Installing and upgrading components with Helm

The exam uses Helm to install components (an ingress or Gateway controller, a CNI, a metrics stack) from a chart repository, with a given release name, namespace, chart version and values. helm.sh documents Helm 4, where `--atomic` became `--rollback-on-failure`.

```bash
helm repo add example https://charts.example.com
helm repo update
helm search repo example/web-gateway --versions          # every chart version
helm show values example/web-gateway --version 2.4.0 > /root/values.yaml
helm install edge example/web-gateway --version 2.4.0 \
  -n gateway-system --create-namespace \
  -f /root/values.yaml --set replicaCount=2
helm list -n gateway-system                              # -A for every namespace
helm status edge -n gateway-system
helm get values edge -n gateway-system                   # values you supplied (--all for computed)
```

| Task asks for | Command or flag |
| --- | --- |
| Install in a namespace that doesn't exist | `-n ns --create-namespace` |
| A specific chart version | `--version 2.4.0` (chart version, not the app version) |
| Values from a file / one value | `-f values.yaml` (last file wins) / `--set key=value` |
| Upgrade, keeping the values of the last release | `helm upgrade edge example/web-gateway --version 2.5.0 -n gateway-system --reuse-values` |
| Install if absent, upgrade if present | `helm upgrade --install edge example/web-gateway -n gateway-system` |
| Revisions of a release | `helm history edge -n gateway-system` |
| Go back to revision 1 | `helm rollback edge 1 -n gateway-system` |
| Remove the release | `helm uninstall edge -n gateway-system` (`--keep-history` keeps it in `helm list --uninstalled`) |
| Render the manifests without installing | `helm template edge example/web-gateway --version 2.4.0 -n gateway-system -f values.yaml` |

A chart can also come from an OCI registry: `helm install edge oci://registry.example.com/charts/web-gateway --version 2.4.0`. Release records are stored as Secrets in the release namespace, which is why every `helm` command for that release needs the same `-n`.

> **Exam trap.** A release lives in a namespace: `helm list` without `-n` shows only the current namespace, and `helm upgrade` or `uninstall` without `-n` answers "release not found". An upgrade with `--set` but without `--reuse-values` starts again from the chart defaults, so earlier `--set` values are lost.

> **Exam tip.** `helm rollback` creates a **new** revision ("Rolled back to 1") instead of deleting later ones.

<!-- section: kustomize | objectives: 4.6.2 -->
## Installing components with Kustomize

Kustomize is built into kubectl: a directory with a `kustomization.yaml` lists resources and the changes to make to them, without templates.

```bash
kubectl kustomize overlays/prod               # print the result, change nothing
kubectl apply -k overlays/prod
kubectl diff -k overlays/prod
kubectl delete -k overlays/prod
```

A base and an overlay that sets the namespace, a name prefix, the image tag, a label and two patches:

```yaml
# base/kustomization.yaml
resources:
- deployment.yaml
- service.yaml
---
# overlays/prod/kustomization.yaml
resources:
- ../../base
namespace: monitoring
namePrefix: prod-
labels:
- pairs:
    env: prod
images:
- name: registry.example.com/agent
  newTag: "2.1.0"
patches:
- path: memory-limit.yaml
- target:
    group: apps
    version: v1
    kind: Deployment
    name: agent
  patch: |-
    - op: replace
      path: /spec/replicas
      value: 3
```

| Field | Effect |
| --- | --- |
| `resources` | Files, directories (bases) or remote bases to include |
| `namespace` | Sets `metadata.namespace` on every resource (the namespace must exist or be listed as a resource) |
| `namePrefix` / `nameSuffix` | Renames every resource and updates references to them |
| `labels` | Adds labels; `includeSelectors: true` also adds them to selectors |
| `images` | Changes `newName`, `newTag` or `digest` of a container image matched by `name` |
| `patches` with `path` | Strategic merge patch file: a partial object with `apiVersion`, `kind`, `metadata.name` |
| `patches` with `target` | JSON 6902 patch (`op`, `path`, `value`) on the selected resources, file or inline `patch` |
| `configMapGenerator` / `secretGenerator` | Generates a ConfigMap or Secret with a hash suffix; references are rewritten |

The strategic merge patch file `memory-limit.yaml` names the object and container to change:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent
spec:
  template:
    spec:
      containers:
      - name: agent
        resources:
          limits:
            memory: 512Mi
```

> **Exam trap.** `-k` takes a **directory** containing `kustomization.yaml`, not the file. `kubectl apply -f overlays/prod/` does not run Kustomize: it tries to apply `kustomization.yaml` as an object and ignores the patches. A patch names its target by the name in the base (`agent`), not the prefixed name (`prod-agent`); `images` matches the image name, not the container name.

> **Exam tip.** `bases`, `patchesStrategicMerge`, `patchesJson6902` and `commonLabels` still appear in older files but are deprecated since Kustomize v5.0.0: write `resources`, `patches` and `labels`. `commonLabels` also changes selectors, which breaks `kubectl apply` on an existing Deployment because its selector is immutable.

<!-- section: key-points -->
## Key points

- Upgrade, one minor at a time: repository, kubeadm package, `upgrade plan`, `upgrade apply v1.37.x` (first control plane) or `upgrade node` (others), drain, kubelet and kubectl packages, `daemon-reload`, restart kubelet, uncordon.
- etcd backup: `etcdctl --endpoints --cacert --cert --key snapshot save`; restore: `etcdutl snapshot restore --data-dir` to a new directory, then the `etcd-data` hostPath in `etcd.yaml`.
- Certificates (one year, CAs ten): `kubeadm certs check-expiration`, `renew all|<name>`, restart the static Pods, recopy `admin.conf`.
- Helm: `install -n --create-namespace --version -f --set`, `upgrade --reuse-values`, `history`, `rollback`, always with `-n`.
- Kustomize: `kubectl apply -k <dir>`, overlays with `resources: [../base]`, `namespace`, `namePrefix`, `images`, `patches`.
