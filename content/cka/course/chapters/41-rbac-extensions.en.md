Access control and extensibility are the two halves of this chapter. RBAC tasks are among the fastest points of the CKA: create a Role or ClusterRole, bind it to a user, a group or a ServiceAccount, and prove the result with `kubectl auth can-i`. Extension tasks ask you to find how a node is wired (which CNI configuration, which CRI socket, which CSI drivers), to add a RuntimeClass, or to install CRDs and an operator and work with the custom resources it serves. Every object here can be created imperatively or from a manifest: learn both, because the imperative command is quicker and the manifest is needed when a field has no flag.

<!-- section: rbac-objects | objectives: 4.1.1 -->
## Roles, ClusterRoles and their bindings

All four objects use `apiVersion: rbac.authorization.k8s.io/v1`. RBAC is additive: there are no deny rules, so a subject can do exactly the union of what its bindings grant.

| Object | Scope | Grants |
| --- | --- | --- |
| `Role` | One namespace | Rules on namespaced resources of that namespace |
| `ClusterRole` | Cluster | Rules on any resource, including cluster-scoped ones (nodes, PersistentVolumes, namespaces) and non-resource URLs (`/healthz`) |
| `RoleBinding` | One namespace | A Role, or a ClusterRole, **inside that namespace only** |
| `ClusterRoleBinding` | Cluster | A ClusterRole in every namespace and on cluster-scoped resources |

Imperative creation (one flag per value or comma-separated lists):

```bash
kubectl -n shop create role pod-reader --verb=get,list,watch --resource=pods,pods/log
kubectl -n shop create role deploy-scaler --verb=get,update,patch --resource=deployments.apps,deployments.apps/scale
kubectl -n shop create role cm-one --verb=get --resource=configmaps --resource-name=app-config
kubectl create clusterrole node-reader --verb=get,list,watch --resource=nodes
kubectl create clusterrole health-reader --verb=get --non-resource-url=/healthz
kubectl -n shop create rolebinding pod-reader-jane --role=pod-reader --user=jane
kubectl -n shop create rolebinding ci-view --clusterrole=view --serviceaccount=shop:ci-bot
kubectl create clusterrolebinding ops-nodes --clusterrole=node-reader --group=ops
```

The equivalent manifests, with the three subject kinds:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: shop
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: pod-reader-binding
  namespace: shop
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: pod-reader
subjects:
- kind: User
  name: jane
  apiGroup: rbac.authorization.k8s.io
- kind: Group
  name: qa-team
  apiGroup: rbac.authorization.k8s.io
- kind: ServiceAccount
  name: ci-bot
  namespace: shop
```

| Task names | Subject or flag |
| --- | --- |
| A user | `kind: User`, `--user=jane` |
| A group | `kind: Group`, `--group=qa-team` |
| One ServiceAccount | `kind: ServiceAccount` with `namespace`, no `apiGroup`; `--serviceaccount=shop:ci-bot` |
| Every ServiceAccount of a namespace | `kind: Group`, `name: system:serviceaccounts:shop` |
| Every authenticated user | `kind: Group`, `name: system:authenticated` |

Core resources (`pods`, `services`, `configmaps`, `secrets`) have the empty API group `""`; Deployments are in `apps`, Jobs in `batch`, Ingresses and NetworkPolicies in `networking.k8s.io`. Subresources are written `pods/log`, `pods/exec`, `deployments/scale`. Find the group and the plural name with `kubectl api-resources`.

> **Exam trap.** `roleRef` is immutable. Pointing an existing binding at another role fails with a validation error: delete the binding and create it again. Editing the list of `subjects` is allowed.

Aggregation builds ClusterRoles from labels. A ClusterRole labelled `rbac.authorization.k8s.io/aggregate-to-view: "true"` (or `-edit`, `-admin`) adds its rules to the built-in `view` (or `edit`, `admin`) role. A custom aggregate is created with `kubectl create clusterrole monitoring --aggregation-rule="rbac.example.com/aggregate-to-monitoring=true"`; the control plane fills its `rules` and overwrites anything you write there.

<!-- section: rbac-testing | objectives: 4.1.2 -->
## Testing permissions and choosing the scope

`kubectl auth can-i VERB RESOURCE` answers `yes` or `no`. Impersonation (`--as`, `--as-group`) needs the `impersonate` permission, which the kubeadm admin has.

```bash
kubectl auth can-i list pods -n shop --as jane
kubectl auth can-i get pods --subresource=log -n shop --as jane
kubectl auth can-i create deployments.apps -n shop --as system:serviceaccount:shop:ci-bot
kubectl auth can-i list nodes --as jane                          # cluster-scoped: no -n
kubectl auth can-i delete pods -n shop --as bob --as-group qa-team
kubectl auth can-i --list -n shop --as system:serviceaccount:shop:ci-bot
kubectl auth can-i create pods --all-namespaces --as jane
kubectl auth can-i get /healthz --as jane                        # non-resource URL
kubectl auth whoami                                              # who am I for the API server?
```

A ServiceAccount's user name is `system:serviceaccount:NAMESPACE:NAME` (singular); its groups are `system:serviceaccounts` and `system:serviceaccounts:NAMESPACE` (plural).

| Task asks for | Object to create |
| --- | --- |
| Rights in one namespace, defined for that namespace | `Role` + `RoleBinding` |
| The same rule set reused in several namespaces, each granted separately | One `ClusterRole` + one `RoleBinding` per namespace |
| Rights in every namespace | `ClusterRole` + `ClusterRoleBinding` |
| Rights on nodes, PersistentVolumes, StorageClasses, namespaces, CRDs | `ClusterRole` + `ClusterRoleBinding` (a RoleBinding cannot grant cluster-scoped resources) |
| Read-only on most namespaced objects, no Secrets | Bind the built-in `view` ClusterRole |
| Read-write on most objects, no Roles or RoleBindings | Bind `edit` |
| Namespace administrator, may create Roles and RoleBindings | Bind `admin` with a RoleBinding |
| Everything | `cluster-admin` |

> **Exam trap.** A ClusterRole bound with a **RoleBinding** is namespaced: `--clusterrole=view` in a RoleBinding of `shop` gives `view` in `shop` only, and `kubectl auth can-i list pods -n dev --as jane` answers `no`. Always test with the exact namespace the task names, and forget `-n` only for cluster-scoped resources.

Escalation is blocked: you can create a Role only if you hold all its permissions (or have the `escalate` verb on roles), and a binding only if you hold the referenced permissions (or have the `bind` verb).

<!-- section: extension-interfaces | objectives: 4.7.1 -->
## Finding the CNI, CRI and CSI of a cluster

| Interface | What it plugs in | Where to look on a node |
| --- | --- | --- |
| **CRI** (Container Runtime Interface) | containerd, CRI-O | Socket `unix:///var/run/containerd/containerd.sock` or `unix:///var/run/crio/crio.sock`; kubelet `containerRuntimeEndpoint`; `/etc/crictl.yaml` |
| **CNI** (Container Network Interface) | Pod networking plugin | Configuration in `/etc/cni/net.d`, binaries in `/opt/cni/bin`; plugin Pods (often a DaemonSet in `kube-system` or its own namespace) |
| **CSI** (Container Storage Interface) | Storage drivers | `CSIDriver` and `CSINode` objects, the driver's controller and node Pods, StorageClass `provisioner` |

```bash
kubectl get nodes -o wide                              # CONTAINER-RUNTIME column: containerd://2.x
kubectl get node node-1 -o jsonpath='{.status.nodeInfo.containerRuntimeVersion}'
grep containerRuntimeEndpoint /var/lib/kubelet/config.yaml
cat /etc/crictl.yaml                                   # runtime-endpoint: unix:///var/run/containerd/containerd.sock
crictl info                                            # runtime status and configuration
crictl --runtime-endpoint unix:///var/run/crio/crio.sock ps
ls /etc/cni/net.d                                      # CNI configuration files
cat /etc/cni/net.d/10-*.conflist                       # "type": the plugin name
ls /opt/cni/bin                                        # bridge, loopback, portmap, host-local...
kubectl get pods -A -o wide | grep -Ei 'calico|cilium|flannel|weave'
kubectl get csidrivers
kubectl get csinodes
kubectl get storageclass -o custom-columns=NAME:.metadata.name,PROVISIONER:.provisioner
```

The container runtime, not the kubelet, loads the CNI plugins: the kubelet flags `--network-plugin` and `--cni-bin-dir` were removed in v1.24. The runtime must also provide the `lo` loopback interface in each sandbox, usually through the CNI `loopback` plugin. `hostPort` needs the `portmap` plugin with the `portMappings` capability in the CNI configuration. Kubernetes requires a plugin compatible with CNI spec v0.4.0 or later (v1.0.0 recommended).

> **Exam trap.** Nodes stay `NotReady` with "network plugin not ready" and CoreDNS stays `Pending` until a CNI plugin is installed and has written its file in `/etc/cni/net.d`. The fix is to install or repair the plugin, not to restart the kubelet.

<!-- section: install-runtimeclass | objectives: 4.7.2 -->
## Installing a CNI plugin, a CSI driver and RuntimeClasses

| Need | Choice |
| --- | --- |
| NetworkPolicy enforcement | A plugin that implements it (Calico, Cilium); a plain bridge or `flanneld` alone does not enforce policies (Flannel needs an added policy controller) |
| Simple overlay network, no policies | Flannel |
| Dynamic volumes on a storage system | That system's CSI driver + a StorageClass with `provisioner:` set to the driver name |
| Stronger isolation for some Pods | A second runtime handler (gVisor, Kata) + a RuntimeClass |

Install one Pod network per cluster, with a Pod CIDR that matches `--pod-network-cidr` of `kubeadm init` and does not overlap node networks. CNI plugins and CSI drivers are installed like any application, from the vendor's manifests or Helm chart:

```bash
kubectl apply -f /root/cni/plugin.yaml                 # manifest given by the task
helm repo add example https://charts.example.com
helm install csi-example example/csi-driver -n storage --create-namespace
kubectl -n storage get pods                            # controller Deployment + node DaemonSet
kubectl get csidrivers                                 # the driver registered itself
```

A **RuntimeClass** (`node.k8s.io/v1`, cluster-scoped) maps a name to a CRI handler configured on the nodes. In containerd the handler is a section `[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.HANDLER]` of `/etc/containerd/config.toml` (containerd 2.x uses `plugins.'io.containerd.cri.v1.runtime'`); in CRI-O it is `[crio.runtime.runtimes.HANDLER]`.

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: sandboxed
handler: runsc
scheduling:
  nodeSelector:
    runtime: gvisor
---
apiVersion: v1
kind: Pod
metadata:
  name: untrusted-app
  namespace: shop
spec:
  runtimeClassName: sandboxed
  containers:
  - name: app
    image: nginx:1.27
```

`handler` must be a DNS label and is the name of the runtime configuration, not of the RuntimeClass. `scheduling.nodeSelector` is merged with the Pod's own selector so Pods land only on nodes that have the handler; `scheduling.tolerations` are added to the Pod's tolerations. `overhead.podFixed` adds resources to the Pod's requests for scheduling. Without `runtimeClassName` the runtime's default handler is used.

> **Exam trap.** The Pod field is `spec.runtimeClassName` and its value is the **RuntimeClass name** (`sandboxed`), never the handler (`runsc`). If the RuntimeClass does not exist or the node cannot run the handler, the Pod fails: read its events.

<!-- section: crds-operators | objectives: 4.8.1 -->
## Installing CRDs and operators

An **operator** is a controller that watches custom resources and acts on them: it is a CRD (the API) plus a controller, usually a Deployment with a ServiceAccount and RBAC. Install the CRDs first, then the controller, then create custom resources.

```bash
kubectl apply -f /root/operator/crds.yaml
kubectl get crd | grep example.com
kubectl wait --for=condition=Established crd/backups.ops.example.com --timeout=60s
kubectl apply -f /root/operator/operator.yaml          # namespace, ServiceAccount, RBAC, Deployment
kubectl -n ops-system get deploy,pods
helm install backup-operator example/backup-operator -n ops-system --create-namespace --version 1.4.0
helm install backup-operator example/backup-operator -n ops-system --skip-crds   # CRDs already installed
```

A custom resource uses the CRD's `group/version` as `apiVersion` and its `kind`:

```yaml
apiVersion: ops.example.com/v1
kind: Backup
metadata:
  name: nightly
  namespace: shop
spec:
  schedule: "0 2 * * *"
  target: orders-db
```

```bash
kubectl apply -f nightly.yaml
kubectl -n shop get backups
kubectl -n shop get backup nightly -o yaml             # status written by the operator
kubectl -n shop describe backup nightly
kubectl -n ops-system logs deploy/backup-operator      # why nothing happens
```

A Helm chart installs the files of its `crds/` directory on `helm install` (skipped if the CRD exists), never templated, and Helm does not upgrade or delete them: update CRDs with `kubectl apply` when the task asks.

> **Exam trap.** `error: resource mapping not found ... ensure CRDs are installed first` means the custom resource was applied before its CRD (or with the wrong `apiVersion`). And deleting a CRD deletes **every custom resource** of that type: never delete a CRD to "reinstall" an operator.

<!-- section: read-crd | objectives: 4.8.2 -->
## Reading a CRD

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: backups.ops.example.com          # must be PLURAL.GROUP
spec:
  group: ops.example.com
  scope: Namespaced                      # or Cluster
  names:
    plural: backups
    singular: backup
    kind: Backup
    shortNames: ["bk"]
  versions:
  - name: v1
    served: true
    storage: true                        # exactly one storage version
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              schedule:
                type: string
              target:
                type: string
    subresources:
      status: {}
```

| Question | Command |
| --- | --- |
| Which CRDs exist? | `kubectl get crd` |
| Group, versions, scope, names | `kubectl get crd backups.ops.example.com -o yaml`, or `-o jsonpath='{.spec.scope}'` |
| Short names, namespaced or not, kind | `kubectl api-resources --api-group=ops.example.com` |
| Fields of the custom resource | `kubectl explain backup.spec`, `kubectl explain backups --recursive` |
| A specific version | `kubectl explain backups --api-version=ops.example.com/v1` |
| Served and storage versions, Established condition | `kubectl describe crd backups.ops.example.com` |

```bash
kubectl get crd backups.ops.example.com -o jsonpath='{.spec.versions[*].name}'
kubectl get crd backups.ops.example.com -o jsonpath='{.spec.names.shortNames}'
kubectl api-resources --namespaced=false | grep example.com
kubectl explain backup.spec.schedule
kubectl get bk -A
```

With `apiextensions.k8s.io/v1` a structural schema is mandatory, and unknown fields are pruned unless the schema sets `x-kubernetes-preserve-unknown-fields: true`. `additionalPrinterColumns` choose the columns of `kubectl get`; `subresources.status` and `subresources.scale` enable `/status` and `kubectl scale`.

> **Exam trap.** The CRD object is named `PLURAL.GROUP` (`backups.ops.example.com`), but custom resources are queried by plural, singular, kind or short name (`kubectl get backups`, `kubectl get bk`). A `Cluster`-scoped CRD rejects `metadata.namespace` and is listed without `-n`.

<!-- section: key-points -->
## Key points

- Role + RoleBinding for one namespace; ClusterRole + ClusterRoleBinding for everything; a ClusterRole in a RoleBinding stays in that namespace.
- ServiceAccount subject: `--serviceaccount=NS:NAME`; user name `system:serviceaccount:NS:NAME`; `roleRef` is immutable.
- Prove every RBAC task with `kubectl auth can-i ... -n NS --as ...`, and `--list` for the full picture.
- CRI socket in `containerRuntimeEndpoint` and `/etc/crictl.yaml`; CNI configuration in `/etc/cni/net.d`, binaries in `/opt/cni/bin`; CSI drivers with `kubectl get csidrivers`.
- RuntimeClass: `handler` names the runtime configuration; Pods use `spec.runtimeClassName` with the RuntimeClass name.
- CRDs before custom resources; deleting a CRD deletes its objects; Helm installs CRDs from `crds/` but never upgrades them.
- Read a CRD with `kubectl get crd -o yaml`, `kubectl api-resources --api-group`, and `kubectl explain`.
