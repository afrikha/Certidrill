The kube-controller-manager runs the control loops that keep the cluster in its desired state. Because those loops create, update and delete objects in almost every namespace, and because the process holds the keys that sign ServiceAccount tokens and certificates, its credentials are among the most valuable in the cluster. The exam asks you to recognize what it does, why it is sensitive, how it is hardened, and how the cloud-controller-manager differs from it.

<!-- section: role-and-sensitivity | objectives: 2.2.1 -->
## Role of kube-controller-manager and why it is sensitive

A **controller** is a loop that watches the API server, compares the current state with the desired state, and acts to close the gap. The kube-controller-manager is a single control plane binary that runs dozens of built-in controllers, for example:

| Controller | What it does |
| --- | --- |
| Deployment, ReplicaSet, StatefulSet, DaemonSet, Job | Creates and deletes Pods to match the workload spec |
| Node lifecycle | Watches node heartbeats, marks nodes unreachable, triggers evictions |
| Namespace | Deletes everything inside a namespace being deleted |
| ServiceAccount, token cleaner | Creates the `default` ServiceAccount in each namespace, cleans up expired bootstrap tokens |
| EndpointSlice | Keeps Service endpoints in sync with ready Pods |
| CSR signing and approving | Signs approved CertificateSigningRequests (for example kubelet client certificates) |
| Garbage collector | Deletes objects whose owners are gone |

The controller manager talks only to the API server, never directly to etcd or to kubelets. Like any client it goes through authentication, authorization and admission.

Why its credentials are sensitive:

- **Broad write access.** Taken together, the controllers can create Pods, delete objects in any namespace, update node status and read Secrets. A stolen controller-manager credential gives an attacker most of the powers of a cluster administrator.
- **Signing keys.** The process reads private keys from the control plane host:

| Flag | Key | What an attacker can do with it |
| --- | --- | --- |
| `--cluster-signing-cert-file`, `--cluster-signing-key-file` | The CA used to sign cluster-scoped certificates (in kubeadm, the cluster CA `ca.key`) | Issue client certificates for any identity, including `system:masters` members |
| `--service-account-private-key-file` | ServiceAccount signing key (`sa.key` in kubeadm), used for legacy Secret-based tokens | Forge ServiceAccount tokens |
| `--root-ca-file` | Public CA bundle placed into ServiceAccount token Secrets | Nothing secret, but it must be the right CA |

> **Exam trap.** Bound, time-limited ServiceAccount tokens are issued by the **kube-apiserver** through the TokenRequest API, not by the controller manager. The controller manager's `--service-account-private-key-file` is used for legacy Secret-based tokens. Both keys must still be protected.

<!-- section: hardening | objectives: 2.2.2 -->
## Hardening kube-controller-manager

**1. One identity per controller.** Start the controller manager with `--use-service-account-credentials=true`. Each controller then runs under its own ServiceAccount in `kube-system` and is authorized by its own ClusterRole, named `system:controller:<controller>` (for example `system:controller:deployment-controller`). Without the flag, every control loop uses the controller manager's own credential, which must then be granted all the controller roles: one broad identity instead of many narrow ones.

```text
--use-service-account-credentials=true
--kubeconfig=/etc/kubernetes/controller-manager.conf
--authentication-kubeconfig=/etc/kubernetes/controller-manager.conf
--authorization-kubeconfig=/etc/kubernetes/controller-manager.conf
--bind-address=127.0.0.1
--profiling=false
```

The Kubernetes security checklist lists both "`--use-service-account-credentials` enabled" and "do not run the controller manager as `system:masters`" among its controls.

**2. A secure bind address.** The controller manager serves HTTPS on its **secure port 10257** (health, metrics, debugging). By default `--bind-address` is `0.0.0.0`, so the port listens on every interface of the control plane node. Hardening guides such as the CIS Kubernetes Benchmark recommend `--bind-address=127.0.0.1` so that only local clients (health probes, a local metrics agent) can reach it.

**3. Authenticated, authorized endpoints.** `--authentication-kubeconfig` and `--authorization-kubeconfig` let the controller manager check callers with TokenReview and SubjectAccessReview against the API server. Only `/healthz`, `/readyz` and `/livez` skip authorization by default (`--authorization-always-allow-paths`). Profiling (`/debug/pprof`) is on by default (`--profiling=true`); turn it off in production.

**4. Protected files.** The kubeconfig (`controller-manager.conf` in kubeadm), the CA private key and the ServiceAccount signing key live on the control plane host. Restrict them to root (file mode `600`), keep them off shared storage and out of backups that leave the control plane unencrypted, and never mount them into Pods.

**5. Leader election.** In a highly available control plane several replicas run, but `--leader-elect` (on by default) ensures that only one is active. This is an availability feature, not a security control.

> **Exam tip.** "Which kube-controller-manager setting gives each controller its own least-privileged identity?" The answer is `--use-service-account-credentials`. Distractors are usually `--leader-elect`, `--controllers` (which only enables or disables controllers) or the `--root-ca-file` flag.

<!-- section: cloud-controller-manager | objectives: 2.2.3 -->
## The cloud-controller-manager and its cloud credentials

The **cloud-controller-manager** (CCM) is a separate control plane component that embeds the cloud-specific control logic and links the cluster to the cloud provider's API. It keeps cloud code out of the core components. Each provider ships its own CCM, which runs one process with several controllers:

| CCM controller | Cloud action | Kubernetes access |
| --- | --- | --- |
| Node controller | Labels nodes with cloud data (region, zone, instance type), sets addresses, deletes Node objects whose server no longer exists | Full access to `Node` objects |
| Route controller | Configures cloud routes so Pods on different nodes can reach each other | `get` on Nodes |
| Service controller | Creates, updates and deletes cloud load balancers for `type: LoadBalancer` Services | `get`, `list`, `watch`, `patch`, `update` on Services and their status |

Security points:

- **Two sets of credentials.** The CCM needs Kubernetes RBAC permissions to talk to the API server **and** cloud credentials (an API token, or IAM rules attached to the control plane machine identity) to call the cloud API. Those cloud credentials can create load balancers, change routes and delete instances: scope them to exactly those actions, for this cluster only.
- **Fewer cloud credentials on nodes.** With an external CCM, the kubelet no longer calls the cloud API, so nodes can run with a more restricted cloud identity. The kubelet and kube-controller-manager are started with `--cloud-provider=external`.
- **Node initialization.** With an external cloud provider, new nodes get the taint `node.cloudprovider.kubernetes.io/uninitialized` (effect `NoSchedule`) until the CCM initializes them. If the CCM is down, new nodes stay unschedulable.
- **Least privilege.** The documentation's example manifest binds the CCM ServiceAccount to `cluster-admin` only as a starting point; production deployments should use the narrower roles in the table above.
- On a managed Kubernetes service, the provider runs the CCM and holds its cloud credentials; you still control what your Services request (for example an internal load balancer instead of a public one).

> **Exam trap.** Creating a cloud load balancer for a `LoadBalancer` Service is the job of the **service controller of the cloud-controller-manager**, not of kube-proxy and not of the kube-controller-manager. In-tree cloud providers inside kube-controller-manager are removed; cloud integration is external.

<!-- section: key-points -->
## Key points

- kube-controller-manager runs the built-in control loops; it talks only to the API server.
- Its credential is broad, and it holds the cluster signing CA key and the ServiceAccount signing key: protect them like cluster-admin.
- `--use-service-account-credentials=true` gives each controller its own `system:controller:*` role.
- Secure port 10257; bind it to `127.0.0.1`, keep authentication and authorization kubeconfigs set, disable profiling.
- Key files and kubeconfigs: root-only permissions on the control plane host, never in Pods.
- cloud-controller-manager: node, route and service controllers; needs RBAC plus cloud credentials, which must be scoped to the cluster's needs.
- Nodes wait with the `node.cloudprovider.kubernetes.io/uninitialized` taint until the CCM initializes them.
