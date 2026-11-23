A shared cluster runs workloads that do not trust each other equally: several teams, several customers, production next to test, a payment service next to a public website. Isolation keeps a problem in one of them (a compromise, a runaway process, a mistake) from spreading. This chapter covers namespaces and their limits, multi-tenancy models, resource isolation with ResourceQuota and LimitRange, and node isolation.

<!-- section: namespaces-boundary | objectives: 3.6.1 -->
## Namespaces as a unit of isolation

A namespace groups API resources inside one cluster. It is the scope that most security controls attach to:

| Control | Attached per namespace |
| --- | --- |
| RBAC | Roles and RoleBindings grant rights inside one namespace |
| Pod Security Admission | Labels set the Pod Security Standards level of the namespace |
| NetworkPolicy | Policies select Pods of their namespace and can allow or deny traffic from other namespaces |
| ResourceQuota and LimitRange | Limits on consumption and objects per namespace |
| Secrets, ConfigMaps, ServiceAccounts, PVCs | A Pod can only use those of its own namespace |

But a namespace on its own is a **weak boundary**:

- **No network isolation by default**: any Pod can reach any Pod in any namespace until NetworkPolicies (enforced by the CNI plugin) say otherwise.
- **Cluster-scoped resources** are shared: Nodes, PersistentVolumes, StorageClasses, CustomResourceDefinitions, admission webhooks, ClusterRoles.
- **Nodes and kernels are shared**: Pods from different namespaces run side by side on the same node and kernel; a container escape reaches every Pod on that node.
- **The control plane is shared**: the API server, etcd and the kubelets serve every namespace, and a ClusterRoleBinding crosses all namespaces.

> **Exam trap.** Creating one namespace per team does not, by itself, stop team A's Pods from talking to team B's database or from landing on the same node. Namespaces become a security boundary only together with RBAC, NetworkPolicy, Pod Security Admission and quotas.

<!-- section: multi-tenancy | objectives: 3.6.2 -->
## Multi-tenancy models

Kubernetes describes two common situations: **multi-team** tenancy (teams of one organization share a cluster) and **multi-customer** tenancy (a SaaS provider runs workloads for customers, who usually have no access to the cluster). The isolation required is described on a spectrum:

| Term | Meaning | Typical case |
| --- | --- | --- |
| **Soft multi-tenancy** | Weaker isolation; tenants are trusted to some degree, and the goal is mainly to prevent accidents and resource conflicts | Teams of the same company |
| **Hard multi-tenancy** | Strong isolation; tenants do not trust each other and must be protected from each other | Different customers, untrusted code |

Implementation models, from cheapest to strongest:

| Model | What is isolated | Trade-offs |
| --- | --- | --- |
| **Namespace per tenant** | Namespaced resources, through RBAC, NetworkPolicy, quotas and Pod security per namespace | Negligible cost, well supported; cluster-scoped resources, nodes and the control plane remain shared; difficult to configure correctly |
| **Control plane per tenant** (virtual control plane) | Each tenant gets its own API server, controller manager and data store on top of shared nodes; isolates cluster-scoped resources such as CRDs | Higher resource use and harder sharing; does **not** isolate the data plane (nodes) |
| **Cluster per tenant** | Everything: control plane, nodes, network | Strongest isolation; highest cost and operational complexity |

Whatever the model, data plane isolation can be added: dedicated nodes per tenant and sandboxed runtimes (next sections).

> **Exam tip.** Match the wording: "tenants must be able to install their own CRDs" points to a control plane per tenant or a cluster per tenant; "untrusted customers, strongest isolation, regulatory separation" points to a cluster per tenant; "internal teams, low cost" points to namespace per tenant.

<!-- section: resource-isolation | objectives: 3.6.3 -->
## Resource isolation with ResourceQuota and LimitRange

Without limits, one tenant can exhaust the cluster (a denial of service against all the others) by creating huge Pods or thousands of objects.

| Object | Scope of the limit | Examples |
| --- | --- | --- |
| **ResourceQuota** | **Total** for the namespace | Sum of CPU and memory requests and limits, total storage requested, number of Pods, Services, Secrets, PVCs (`count/secrets`) |
| **LimitRange** | **Each** Pod, container or PVC in the namespace | Minimum and maximum CPU and memory per container, default requests and limits, maximum request-to-limit ratio, minimum and maximum storage per PVC |

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-a-quota
  namespace: tenant-a
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.cpu: "16"
    limits.memory: 32Gi
    pods: "50"
    count/secrets: "100"
    persistentvolumeclaims: "20"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: tenant-a-defaults
  namespace: tenant-a
spec:
  limits:
  - type: Container
    default:
      cpu: 500m
      memory: 512Mi
    defaultRequest:
      cpu: 100m
      memory: 128Mi
    max:
      cpu: "2"
      memory: 2Gi
```

How they behave:

- Both are enforced at **admission**: a create or update that violates them is rejected with HTTP 403 Forbidden. Objects that already exist are not affected by a new or changed quota or LimitRange.
- When a quota covers CPU or memory, new Pods must declare requests or limits for them, or they may be rejected. A LimitRange with `default` and `defaultRequest` fills them in automatically.
- Quotas do not cover everything: network bandwidth, for example, is shared regardless. API Priority and Fairness protects the API server from request floods.

> **Exam trap.** ResourceQuota caps the namespace **total**; LimitRange caps or defaults **each** container or Pod. "No single container may request more than 2 CPUs" is a LimitRange; "the team may not use more than 8 CPUs in total" is a ResourceQuota.

<!-- section: node-isolation | objectives: 3.6.4 -->
## Node isolation and RuntimeClass

All Pods on a node share its kernel, kubelet and container runtime. Workloads of different sensitivity should therefore not share nodes: an escape from a public-facing Pod should not land next to the payment service or a privileged DaemonSet.

| Tool | What it does | Limit |
| --- | --- | --- |
| **Dedicated node pool** | Separate nodes (and often separate cloud identities and network segments) for a tenant or a sensitivity level | More nodes to run |
| **Taint** on nodes (`NoSchedule`, `NoExecute`) | **Repels** every Pod that lacks a matching toleration | Does not attract: a tolerating Pod may still land elsewhere |
| **Toleration** in the Pod | Allows the Pod onto tainted nodes | Anyone who can write a Pod spec can add a toleration, unless policy prevents it |
| **nodeSelector or node affinity** | **Attracts** the Pod to nodes with given labels | Does not keep other Pods away |
| **RuntimeClass** | Selects a container runtime handler, for example a sandbox (gVisor) or a lightweight VM (Kata Containers), for stronger isolation from the host kernel | Extra overhead; `scheduling` in the RuntimeClass steers Pods to nodes that have the handler |

To dedicate nodes, combine both directions: taint the nodes so other Pods stay away, and give the tenant's Pods a toleration **plus** a node selector or affinity so they go there. A mutating admission webhook (or a policy engine such as Kyverno) can add these automatically in the tenant's namespace.

```bash
kubectl taint nodes pay-node-1 tenant=payments:NoSchedule
kubectl label nodes pay-node-1 example.com.node-restriction.kubernetes.io/tenant=payments
```

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc
scheduling:
  nodeSelector:
    example.com.node-restriction.kubernetes.io/sandbox: "gvisor"
---
apiVersion: v1
kind: Pod
metadata:
  name: untrusted-job
  namespace: tenant-b
spec:
  runtimeClassName: gvisor
  containers:
  - name: job
    image: registry.example.com/tenant-b/job:3.1
```

Label keys used for isolation should be ones a kubelet cannot set on its own node: with the Node authorizer and the **NodeRestriction** admission plugin, kubelets cannot set or modify labels with the `node-restriction.kubernetes.io/` prefix, so a compromised node cannot label itself to attract sensitive Pods. RuntimeClass is cluster-scoped; a Pod that names a RuntimeClass that does not exist, or whose handler the node cannot run, fails.

> **Exam trap.** A taint alone does not place Pods on the dedicated nodes, and a node selector alone does not keep other Pods off them: dedicated nodes need a taint **and** a toleration plus node affinity or a node selector. For stronger kernel isolation of untrusted code, the answer is a sandboxed runtime selected with RuntimeClass, not a namespace.

<!-- section: key-points -->
## Key points

- Namespaces scope RBAC, Pod Security Admission, NetworkPolicy, quotas and Secrets, but do not isolate network traffic, nodes, kernels, cluster-scoped resources or the control plane by themselves.
- Soft multi-tenancy trusts tenants somewhat; hard multi-tenancy does not. Models: namespace per tenant (cheap), control plane per tenant (isolates cluster-scoped resources, not nodes), cluster per tenant (strongest, costliest).
- ResourceQuota limits namespace totals and object counts; LimitRange sets per-container or per-Pod minimums, maximums and defaults; both act at admission and return 403.
- Dedicated nodes need taints (repel) plus tolerations and node selectors or affinity (attract); use `node-restriction.kubernetes.io/` labels with NodeRestriction.
- RuntimeClass selects a sandboxed runtime such as gVisor or Kata Containers for workloads that need stronger isolation from the host kernel.
