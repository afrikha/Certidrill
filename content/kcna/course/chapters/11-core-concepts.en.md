A Kubernetes cluster is a set of machines that run containers for you. The **control plane** stores the desired state and makes decisions; the **nodes** run the Pods. You never tell Kubernetes what to do step by step: you declare objects in the API, and controllers keep the cluster in line with them. The exam asks you to name the component that does a job, to pick the workload resource that fits a need, and to tell labels, annotations, ConfigMaps and Secrets apart.

<!-- section: control-plane | objectives: 1.1.1 -->
## Cluster architecture and the control plane

| Component | Role |
| --- | --- |
| **kube-apiserver** | Exposes the Kubernetes HTTP API. The only component that talks to etcd; every other component, `kubectl` and every tool go through it |
| **etcd** | Consistent, highly available key-value store for all API data: the cluster state |
| **kube-scheduler** | Watches for Pods with no node assigned and chooses a suitable node for each one |
| **kube-controller-manager** | Runs the built-in controllers (Deployment, ReplicaSet, Job, node, namespace, ServiceAccount controllers...) as one process |
| **cloud-controller-manager** | Optional. Integrates with a cloud provider: node lifecycle, routes, load balancers for `LoadBalancer` Services |

In production the control plane runs on several machines for high availability, with an odd number of etcd members (3 or 5) so that a majority (quorum) survives a failure. Managed Kubernetes services run the control plane for you; you only see the API endpoint and your nodes.

> **Exam trap.** The scheduler only **chooses** a node and records the decision through the API (binding). It doesn't start containers: the kubelet of the chosen node does.

<!-- section: node-components | objectives: 1.1.2 -->
## Node components

| Component | Role |
| --- | --- |
| **kubelet** | Agent on every node. Registers the node, watches the API for Pods assigned to it, asks the container runtime to start their containers, runs the probes and reports Pod and node status |
| **kube-proxy** | Optional. Maintains network rules on the node (iptables by default on Linux, or nftables) so that traffic to a Service reaches its Pods. Some network plugins replace it |
| **Container runtime** | Pulls images and runs containers, for example containerd or CRI-O, through the Container Runtime Interface (CRI) |

The flow when you create a Deployment: `kubectl` sends it to the kube-apiserver, which stores it in etcd; the Deployment controller creates a ReplicaSet, the ReplicaSet controller creates Pods; the scheduler binds each Pod to a node; that node's kubelet asks the runtime to start the containers and reports back. Each component watches the API: none of them calls another directly.

<!-- section: api-model | objectives: 1.1.3 -->
## The Kubernetes API and the declarative model

Everything in Kubernetes is an **object** stored through the API. Each object has a `spec`, the **desired state** you write, and a `status`, the **current state** that Kubernetes writes. A **controller** runs a reconciliation loop: observe the current state, compare it with the desired state, act to close the gap, repeat. If a node dies, the ReplicaSet controller sees fewer Pods than `replicas` and creates new ones; nobody has to run a command.

The API is organized in **groups** and **versions**, visible in the `apiVersion` field:

| apiVersion | Group | Examples |
| --- | --- | --- |
| `v1` | Core group (no name) | Pod, Service, ConfigMap, Secret, Namespace, Node |
| `apps/v1` | `apps` | Deployment, ReplicaSet, StatefulSet, DaemonSet |
| `batch/v1` | `batch` | Job, CronJob |
| `networking.k8s.io/v1` | `networking.k8s.io` | Ingress, NetworkPolicy |
| `rbac.authorization.k8s.io/v1` | `rbac.authorization.k8s.io` | Role, RoleBinding |

Versions show maturity: `v1alpha1` (experimental, disabled by default), `v1beta1` (well tested; new beta APIs are disabled by default), `v1` (stable, GA).

<!-- section: workloads | objectives: 1.1.4 -->
## Pods and workload resources

A **Pod** is the smallest deployable unit: one or more containers that share a network namespace (one IP address, `localhost` between them) and can share volumes. Pods are disposable; you rarely create them directly but through a workload resource that recreates them.

| Need | Resource | Behavior |
| --- | --- | --- |
| Stateless app, rolling updates, rollback | **Deployment** | Manages ReplicaSets; the default choice for web apps and APIs |
| Keep N identical Pods running | **ReplicaSet** | Created by a Deployment; rarely used alone |
| Stable name, ordered start, one volume per Pod | **StatefulSet** | Pods named `db-0`, `db-1`...; for databases and clustered apps |
| One Pod on every node (or a subset) | **DaemonSet** | Log collectors, monitoring agents, network plugins |
| Run to completion | **Job** | Retries failed Pods (`backoffLimit`, 6 by default); `completions` and `parallelism` |
| Run a Job on a schedule | **CronJob** | Cron syntax in `schedule`, for example `"0 2 * * *"` |

Inside a Pod, **init containers** run one after the other to completion before the app containers start. A **sidecar** container (an init container with `restartPolicy: Always`, stable since v1.33) starts before the app containers and keeps running beside them, for example to ship logs or proxy traffic.

> **Exam trap.** Scaling a Deployment changes `replicas`; the ReplicaSet does the work. Deleting a Pod managed by a Deployment doesn't reduce the count: the ReplicaSet creates a replacement.

<!-- section: organize-objects | objectives: 1.1.5 -->
## Namespaces, labels, selectors and annotations

**Namespaces** divide one cluster into virtual groups for teams or environments. Names are unique within a namespace. Initial namespaces: `default`, `kube-system` (system components), `kube-public` and `kube-node-lease` (node heartbeats). Most objects are **namespaced** (Pod, Service, Deployment, ConfigMap, Secret, Role); some are **cluster-scoped** (Node, Namespace, PersistentVolume, StorageClass, ClusterRole).

| Metadata | Purpose | Used by |
| --- | --- | --- |
| **Labels** | Identifying key-value pairs, such as `app: web`, `tier: frontend` | **Selectors**: a Service finds its Pods, a ReplicaSet counts its Pods, `kubectl get pods -l app=web` |
| **Annotations** | Non-identifying metadata: build number, contact, tool settings | Tools and controllers; **never** used to select objects |

Selectors are **equality-based** (`app=web`, `tier!=db`) or **set-based** (`env in (prod, staging)`). A Deployment's `spec.selector` must match the labels of its Pod template.

```bash
kubectl get pods -n shop -l 'app=web,env in (prod,staging)'
kubectl label pod web-1 tier=frontend
kubectl annotate deployment web owner=team-a@example.com
```

<!-- section: configuration | objectives: 1.1.6 -->
## ConfigMaps and Secrets

Both keep configuration out of the image, so that one image runs in every environment.

| Object | Holds | Notes |
| --- | --- | --- |
| **ConfigMap** | Non-sensitive key-value data or whole configuration files | Plain text |
| **Secret** | Passwords, tokens, keys, TLS certificates | Values are **base64-encoded**, not encrypted; limited to 1 MiB; types such as `Opaque` (default), `kubernetes.io/tls`, `kubernetes.io/dockerconfigjson` |

A container consumes them as **environment variables** (`env.valueFrom.configMapKeyRef`, `secretKeyRef`, or all keys with `envFrom`) or as **files** in a volume. Mounted files are updated when the object changes; environment variables are read only when the container starts.

```yaml
env:
- name: DB_HOST
  valueFrom:
    configMapKeyRef:
      name: app-config
      key: db-host
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: db-secret
      key: password
```

Both can be marked `immutable: true`: their data can then no longer change; you delete and recreate them.

> **Exam trap.** base64 is an encoding, not encryption: anyone who can read the Secret can decode it. Protecting Secrets takes encryption at rest and RBAC (see the Security chapter).

<!-- section: extending | objectives: 1.1.7 -->
## Extending Kubernetes

A **CustomResourceDefinition** (CRD) adds a new kind to the API, such as `Certificate` or `Database`, without changing Kubernetes code. Once created, the new objects are stored in etcd and managed with `kubectl` like built-in ones. A CRD alone only stores data: a **custom controller** watches the custom objects and acts on them.

The **operator pattern** combines a custom resource with a controller that encodes a human operator's knowledge of an application: deploy it on demand, back it up and restore it, upgrade it with its schema changes. Tools to write operators include the Operator Framework (Operator SDK), kubebuilder and Kopf.

| Extension point | What it extends |
| --- | --- |
| CRD plus controller (operator) | The API: new resource kinds and their automation |
| Admission webhooks and policies | Checks or changes on objects before they are stored |
| CRI, CNI and CSI plugins | Runtime, network and storage on the nodes |
| kubectl plugins | The command line |

<!-- section: key-points -->
## Key points

- Control plane: kube-apiserver (front door), etcd (state), kube-scheduler (placement), kube-controller-manager (built-in controllers), cloud-controller-manager (cloud integration).
- Nodes: kubelet (runs Pods), kube-proxy (Service rules), container runtime (CRI).
- `spec` is desired, `status` is current; controllers reconcile them in a loop.
- Deployment: stateless. StatefulSet: stable identity. DaemonSet: one per node. Job: run to completion. CronJob: scheduled.
- Labels select, annotations describe. Namespaced vs cluster-scoped objects.
- ConfigMap: plain configuration. Secret: base64, not encrypted by default.
- CRD adds a kind; an operator adds the controller that manages it.
