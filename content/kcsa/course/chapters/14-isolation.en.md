A container is a set of ordinary processes on a shared kernel, isolated by Linux features. This chapter lists those features, ranks the isolation options from a plain container to a virtual machine, and maps the boundaries Kubernetes itself offers: namespaces, nodes and clusters.

<!-- section: kernel-features | objectives: 1.4.1 -->
## Linux isolation features

| Feature | What it does | Set in Kubernetes with |
| --- | --- | --- |
| **Namespaces** (Linux) | Give a process its own view of a resource: process IDs (`pid`), network stack (`net`), mounts (`mnt`), hostname (`uts`), inter-process communication (`ipc`), user and group IDs (`user`), cgroup hierarchy | Created by the runtime for each Pod; `hostPID`, `hostNetwork`, `hostIPC: true` remove the isolation, `hostUsers: false` adds a user namespace |
| **cgroups** | Limit and account for CPU, memory, process count and I/O of a group of processes | `resources.requests` and `resources.limits` |
| **Capabilities** | Split root's power into units (`NET_ADMIN`, `SYS_ADMIN`, `NET_BIND_SERVICE`...) that can be granted or dropped one by one | `securityContext.capabilities.drop` and `add` |
| **seccomp** | Filters the system calls a process may make | `securityContext.seccompProfile`: `RuntimeDefault`, `Localhost`, `Unconfined` |
| **AppArmor** | Linux security module that confines a program to the files and resources listed in a profile, identified by path; profiles run in enforce or complain mode | `securityContext.appArmorProfile` (stable since v1.31; annotations before v1.30 are deprecated) |
| **SELinux** | Linux security module that labels processes and files and enforces a policy between labels, identified by inode | `securityContext.seLinuxOptions` |

Profiles for seccomp and AppArmor must be loaded on the node before a Pod can reference them with `Localhost`; SELinux policies must be configured on the host. Without any setting, a Pod runs with seccomp `Unconfined`, unless the kubelet's `seccompDefault` option makes `RuntimeDefault` the default.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api
  namespace: shop
spec:
  securityContext:
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
    appArmorProfile:
      type: RuntimeDefault
  containers:
  - name: api
    image: registry.example.com/shop/api:1.4.2
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop: ["ALL"]
```

A **privileged container** (`privileged: true`) undoes most of this: it runs `Unconfined` for seccomp, ignores AppArmor profiles, runs as `unconfined_t` under SELinux and gets access to host devices. Grant the specific capability needed instead.

> **Exam trap.** seccomp restricts **system calls**; AppArmor and SELinux restrict **access to files and resources**; capabilities split **root privileges**; cgroups limit **resource consumption**. A question about blocking the `unshare` system call expects seccomp.

<!-- section: isolation-strength | objectives: 1.4.2 -->
## Comparing isolation strengths

All ordinary containers on a node share the host kernel. A kernel vulnerability or a dangerous setting can let a process escape to the node. The options, from weakest to strongest isolation:

| Option | How it isolates | Trade-off |
| --- | --- | --- |
| **Standard container** (runc) | Linux namespaces, cgroups, capabilities, seccomp, LSMs on the shared kernel | Fastest, densest; a kernel exploit reaches the host |
| **User namespaces** (`hostUsers: false`) | Root in the container maps to an unprivileged user on the host; capabilities are valid only inside the namespace | Stable since v1.36; needs Linux 6.3 or later and a recent runtime; incompatible with `hostNetwork`, `hostPID`, `hostIPC` |
| **gVisor** | A user-space application kernel intercepts the container's system calls, so the workload talks to gVisor rather than to the host kernel | Some performance cost and system call compatibility limits |
| **Kata Containers** | Each Pod runs in a lightweight virtual machine with its own kernel, using hardware virtualization | Stronger boundary, higher startup time and memory overhead |
| **Separate virtual machines or nodes** | Dedicated kernel and hardware boundary per workload or tenant | Highest cost, lowest density |

With user namespaces, a process that escapes still has no root privileges on the node, which mitigates several high and critical vulnerabilities.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: userns-demo
spec:
  hostUsers: false
  containers:
  - name: app
    image: registry.example.com/tools/app:2.0
```

Sandboxed runtimes are selected with a **RuntimeClass** (`node.k8s.io/v1`, stable since v1.20). The cluster administrator configures a handler in containerd or CRI-O on the nodes, creates a cluster-scoped RuntimeClass that names the handler, and Pods request it with `runtimeClassName`. Its `scheduling` field can add a node selector and tolerations so that those Pods land only on nodes that have the runtime; its `overhead` field declares the extra resources the sandbox consumes.

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc
---
apiVersion: v1
kind: Pod
metadata:
  name: untrusted-job
  namespace: build
spec:
  runtimeClassName: gvisor
  containers:
  - name: job
    image: registry.example.com/build/runner:5.1
```

If the named RuntimeClass doesn't exist or the node can't run the handler, the Pod fails; if `runtimeClassName` is omitted, the default runtime is used.

> **Exam tip.** "Run untrusted or multi-tenant code with a stronger boundary than the shared kernel" points to gVisor or Kata Containers through a RuntimeClass. "Root inside the container must not be root on the node" points to user namespaces.

<!-- section: kubernetes-boundaries | objectives: 1.4.3 -->
## Isolation boundaries in Kubernetes

| Boundary | Isolates | Doesn't isolate |
| --- | --- | --- |
| **Namespace** | Names of namespaced objects, and the scope of Roles, RoleBindings, ResourceQuotas, LimitRanges, NetworkPolicies and Pod Security labels | Network traffic by itself (Pods reach each other across namespaces without NetworkPolicy); cluster-scoped resources (nodes, PersistentVolumes, CustomResourceDefinitions, StorageClasses, webhooks); the shared kernel of a node |
| **Dedicated nodes** | Workloads of different trust levels: an escape lands on a node that holds only workloads of the same tenant or sensitivity | The control plane and API server, still shared; a kubelet's permissions can be used to move laterally |
| **Separate clusters** | Everything: control plane, nodes, cluster-scoped resources, network | Nothing shared, at the cost of operating more clusters |

Dedicated nodes are built with scheduling features:

- **Taints** on the nodes (`kubectl taint nodes node-7 tenant=payments:NoSchedule`) repel every Pod that doesn't have a matching **toleration**.
- A toleration only **allows** a Pod onto tainted nodes; to **attract** it there, add a **nodeSelector** or **node affinity** on the node's label.
- Combine both for a dedicated pool: the taint keeps others out, the affinity keeps the tenant in.

A mutating admission webhook or policy engine can add these tolerations and affinities automatically to every Pod of a tenant's namespace, so tenants can't choose their own placement.

> **Exam trap.** A namespace is not a security boundary on its own. Isolating two teams in two namespaces needs RBAC, NetworkPolicy, ResourceQuota and Pod Security labels in each namespace; isolating tenants who don't trust each other may need dedicated nodes, sandboxed runtimes or separate clusters.

<!-- section: key-points -->
## Key points

- Linux namespaces separate views, cgroups limit resources, capabilities split root, seccomp filters system calls, AppArmor and SELinux restrict access to resources. `privileged: true` disables most of them.
- Isolation, weakest to strongest: standard container, user namespaces (`hostUsers: false`, stable since v1.36), gVisor (user-space kernel), Kata Containers (lightweight VM), dedicated VMs or nodes.
- A RuntimeClass maps `runtimeClassName` to a runtime handler on the nodes and can constrain scheduling.
- Kubernetes boundaries: namespace (API scope only), dedicated nodes (taints, tolerations, affinity), separate clusters.
