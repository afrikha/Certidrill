Administering Kubernetes at KCNA level means knowing the tools rather than typing long commands: `kubectl` and its two styles of work, the structure of a manifest, the kubeconfig file that says which cluster you talk to, the ways to get a cluster, how versions and upgrades work, and how to cap what a namespace can consume.

<!-- section: kubectl | objectives: 1.2.1 -->
## kubectl, imperative and declarative

`kubectl` is the command-line client of the Kubernetes API. Its syntax is `kubectl <verb> <type> [<name>] [flags]`.

| Verb | Use |
| --- | --- |
| `get` | List objects (`-o wide`, `-o yaml`, `-l` for a label selector, `-n` or `-A` for namespaces) |
| `describe` | Show an object in detail, with its recent events |
| `create`, `run`, `expose` | Create objects imperatively (`run` creates a single Pod) |
| `apply -f` | Create or update objects from manifests |
| `edit` | Open the live object in an editor |
| `delete` | Delete objects, by name, by file or by label |
| `scale`, `set image`, `rollout` | Change the replica count, the image, follow and undo rollouts |

There are two ways to manage objects:

| Style | Example | Fits |
| --- | --- | --- |
| **Imperative commands** | `kubectl create deployment web --image=nginx:1.27 --replicas=3` | Quick tests, one-off tasks |
| **Declarative configuration** | `kubectl apply -f manifests/` | Production: files in Git, reviewed, reapplied; `apply` computes the changes and is idempotent |

```bash
kubectl create deployment web --image=nginx:1.27 --dry-run=client -o yaml > web.yaml
kubectl apply -f web.yaml
kubectl diff -f web.yaml
kubectl delete -f web.yaml
```

`--dry-run=client -o yaml` turns an imperative command into a manifest skeleton. `kubectl diff` shows what `apply` would change. `kubectl apply --server-side` lets the API server track which manager owns each field.

> **Exam trap.** `kubectl create` fails if the object already exists; `kubectl apply` creates it or updates it. GitOps tools and CI pipelines rely on the declarative, idempotent style.

<!-- section: manifests | objectives: 1.2.2 -->
## YAML manifests and field discovery

Every manifest has four top-level fields:

```yaml
apiVersion: apps/v1        # API group and version
kind: Deployment           # object type
metadata:                  # name, namespace, labels, annotations
  name: web
  namespace: shop
  labels:
    app: web
spec:                      # desired state, specific to the kind
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: nginx:1.27
```

YAML uses indentation with spaces (never tabs), `key: value` maps and `-` for list items. Several objects can share one file, separated by `---`. You don't write `status`: Kubernetes does.

| Command | Answers |
| --- | --- |
| `kubectl api-resources` | Which kinds exist, their short names (`po`, `svc`, `deploy`), API group and whether they are namespaced |
| `kubectl api-versions` | Which group/version pairs the server offers |
| `kubectl explain deployment.spec.strategy` | What a field means and its type, from the server's schema; `--recursive` lists all subfields |

<!-- section: kubeconfig | objectives: 1.2.3 -->
## kubeconfig, clusters, users and contexts

A **kubeconfig** file tells `kubectl` (and other clients) how to reach clusters. By default it is `$HOME/.kube/config`; the `KUBECONFIG` environment variable can list several files, which are merged; the `--kubeconfig` flag uses one file only.

| Section | Contains |
| --- | --- |
| `clusters` | API server address and the CA certificate to trust |
| `users` | Credentials: client certificate, token, or an exec plugin that fetches a token |
| `contexts` | A named triple **cluster + user + namespace** |
| `current-context` | The context used when none is given |

```bash
kubectl config get-contexts
kubectl config use-context staging
kubectl config set-context --current --namespace=shop
kubectl config view --minify
```

> **Exam trap.** Kubernetes has no User object: "users" in kubeconfig are credentials checked by an authenticator (certificates, OIDC tokens). Workloads inside the cluster use ServiceAccounts instead.

<!-- section: deploy-cluster | objectives: 1.2.4 -->
## Ways to deploy a cluster

| Option | What it is | Typical use |
| --- | --- | --- |
| **kubeadm** | Official tool that bootstraps a conformant cluster: `kubeadm init` on the first control plane node, `kubeadm join` on the others. Installs no network plugin: you add one | Self-managed clusters on your own machines |
| **Managed Kubernetes service** | A provider runs and upgrades the control plane; you manage nodes or node pools and workloads | Production with less operational work |
| **kind** | Kubernetes IN Docker: each node is a container | Local tests, CI pipelines |
| **minikube** | A local cluster, usually one node, in a VM or a container, with add-ons | Learning and local development |

Other installers exist (Cluster API, k3s, kubespray...). A cluster that passes the CNCF conformance tests is a **Certified Kubernetes** distribution: workloads behave the same on any of them.

<!-- section: releases-maintenance | objectives: 1.2.5 -->
## Releases, upgrades and node maintenance

Kubernetes versions are `major.minor.patch`, for example `1.37.1`. About **three minor releases per year** ship; the project maintains the **three most recent minor releases** (1.37, 1.36 and 1.35 at the time of writing), and each minor version gets about **one year** of patch support.

Upgrade rules from the version skew policy:

- Upgrade **one minor version at a time**; never skip one.
- Upgrade the **control plane first** (kube-apiserver, then controller manager and scheduler), then the nodes.
- The kubelet must never be newer than the kube-apiserver; it may be up to **three** minor versions older.
- `kubectl` is supported within **one** minor version of the kube-apiserver, older or newer.

To work on a node (patching, kubelet upgrade), empty it first:

```bash
kubectl cordon node-2                         # mark unschedulable, existing Pods stay
kubectl drain node-2 --ignore-daemonsets      # cordon and evict Pods, respecting PodDisruptionBudgets
kubectl uncordon node-2                       # allow scheduling again
```

A **PodDisruptionBudget** (`minAvailable` or `maxUnavailable`) limits how many Pods of an application voluntary evictions such as a drain may remove at once.

> **Exam trap.** `cordon` doesn't move anything: it only stops new Pods from landing on the node. `drain` also evicts the running Pods, except DaemonSet Pods.

<!-- section: quotas-limits | objectives: 1.2.6 -->
## ResourceQuota and LimitRange

| Object | Scope of the rule | Example |
| --- | --- | --- |
| **ResourceQuota** | The **total** of a namespace: sum of CPU and memory requests and limits, number of objects (`pods`, `services`, `count/deployments.apps`) | The `team-a` namespace may request 10 CPUs and run 50 Pods in total |
| **LimitRange** | **Each** Pod, container or PersistentVolumeClaim: default requests and limits, minimum and maximum | Every container gets 100m CPU by default and may not exceed 1 CPU |

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute
  namespace: team-a
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    pods: "50"
```

Both are enforced at admission: a request that violates them is rejected with `403 Forbidden`; Pods that already run are not affected. When a quota covers `cpu` or `memory`, every new Pod must declare requests or limits for it, which is why a LimitRange that sets defaults is often added beside the quota.

> **Exam trap.** A Deployment that exceeds the quota is created successfully, but its ReplicaSet can't create the Pods: the quota error appears in the ReplicaSet's events, not on the Deployment command.

<!-- section: key-points -->
## Key points

- Imperative commands for quick tasks; `kubectl apply -f` and files in Git for production.
- A manifest is `apiVersion`, `kind`, `metadata`, `spec`; `kubectl explain` and `kubectl api-resources` discover fields and kinds.
- A kubeconfig context is cluster + user + namespace; default file `$HOME/.kube/config`.
- kubeadm bootstraps; managed services run the control plane; kind and minikube are for local learning.
- About three minor releases a year, three maintained, about one year of patches; upgrade one minor at a time, control plane first.
- Cordon blocks scheduling; drain evicts; uncordon reopens.
- ResourceQuota caps the namespace total; LimitRange sets per-container defaults and bounds.
