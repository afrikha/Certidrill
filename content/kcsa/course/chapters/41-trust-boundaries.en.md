A **trust boundary** is a line where data or control passes between parts of a system that have different levels of trust: an anonymous client and the API server, a tenant's Pod and the node it runs on. Attacks cross these lines, so they are where authentication, authorization, encryption and validation must happen. The exam asks you to place the boundaries of a cluster, describe how each data flow between components is protected, and explain how these elements become a threat model.

<!-- section: cluster-trust-boundaries | objectives: 4.1.1 -->
## Trust boundaries of a cluster

| Boundary | Less trusted side | More trusted side | Controls at the boundary |
| --- | --- | --- | --- |
| **External clients and the API server** | Users, CI pipelines, the internet | kube-apiserver | TLS, authentication (client certificates, OIDC, ServiceAccount tokens), RBAC authorization, admission control, private endpoint or firewall rules |
| **Control plane and nodes** | Kubelets and everything running on worker nodes | API server, etcd, controller manager, scheduler | Kubelet client certificates, Node authorizer and NodeRestriction admission plugin, etcd reachable only from the API server |
| **Node and container** | A container process | The host kernel, the kubelet, the container runtime | Linux namespaces, cgroups, capabilities, seccomp, AppArmor or SELinux, non-root users, Pod Security Admission, sandboxed runtimes |
| **Namespace and tenant** | One team's or customer's workloads | Another tenant's workloads and data | RBAC scoped per namespace, NetworkPolicy, ResourceQuota, Pod Security Admission per namespace, dedicated nodes or clusters for strong isolation |
| **Cluster and external services** | Pods | Cloud metadata endpoint, databases, the cloud provider's APIs | Egress NetworkPolicy, least-privilege workload identities, firewall rules |

The **API server is the central boundary**: it is the only component that talks to etcd, and every other component, including the kubelets and the controllers, goes through it. A namespace is a **soft** boundary: it scopes names, RBAC and policies, but Pods of different namespaces share nodes, the kernel and, by default, the network. The RBAC good practices state that boundaries within a namespace should be considered weak, and that anyone who can create Pods in a namespace effectively reaches its Secrets and ServiceAccounts.

> **Exam trap.** Namespaces alone do not isolate workloads at the network or kernel level. A question asking for strong isolation between untrusted tenants expects more than "put them in different namespaces": NetworkPolicy, Pod Security Admission, dedicated nodes, sandboxed runtimes, or separate clusters.

<!-- section: component-data-flows | objectives: 4.1.2 -->
## Data flows between components

Kubernetes follows a **hub-and-spoke** pattern: all API usage from nodes and Pods terminates at the API server, and no other control plane component is designed to expose remote services.

| Data flow | Authentication | Encryption and notes |
| --- | --- | --- |
| Client (`kubectl`, CI) → API server | Client certificate, OIDC token, ServiceAccount token | TLS on the secure port (6443, or 443 behind a load balancer) |
| API server → etcd | API server client certificate (mutual TLS) | TLS on 2379. Only the API server should reach etcd |
| etcd member ↔ etcd member | Peer certificates | TLS on 2380 |
| Kubelet → API server | Kubelet client certificate (group `system:nodes`), often provisioned by TLS bootstrapping | TLS. The Node authorizer and the NodeRestriction admission plugin limit a kubelet to its own Node and Pods |
| Scheduler, controller manager → API server | Client certificates in their kubeconfig | TLS |
| Pod → API server | Bound ServiceAccount token, mounted with the cluster CA certificate | TLS through the `kubernetes` Service |
| API server → kubelet (logs, `exec`, `attach`, port-forward) | API server client certificate; the kubelet authorizes with the `Webhook` mode | TLS on 10250, but by default the API server **does not verify** the kubelet's serving certificate: set `--kubelet-certificate-authority` |
| API server → nodes, Pods, Services (API server proxy) | None | **Plain HTTP by default**, neither authenticated nor encrypted; not safe on untrusted networks |
| API server → admission webhooks | Webhook serving certificate checked against its `caBundle` | TLS |
| Pod → Pod | None at the network layer | Plain text unless a service mesh (mTLS) or CNI encryption (WireGuard, IPsec) is used |

The flows from nodes and Pods **to** the control plane are secure by default and can run over untrusted networks. The flows **from** the control plane to nodes are the weak ones: the kubelet connection needs certificate verification to resist man-in-the-middle attacks, and proxy connections are not safe on public networks. SSH tunnels are deprecated; the **Konnectivity** service provides a TCP proxy for control plane to node traffic.

```bash
kube-apiserver \
  --kubelet-certificate-authority=/etc/kubernetes/pki/ca.crt \
  --etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt \
  --etcd-certfile=/etc/kubernetes/pki/apiserver-etcd-client.crt \
  --etcd-keyfile=/etc/kubernetes/pki/apiserver-etcd-client.key
```

> **Exam trap.** "TLS everywhere" is not the default for Pod-to-Pod traffic. Kubernetes encrypts the control plane flows, but application traffic between Pods is unencrypted until you add mTLS or an encrypting network plugin.

> **Exam tip.** A question about a component that should never be reachable from Pods or users points to **etcd**: whoever reaches it bypasses authentication, authorization, admission and audit.

<!-- section: building-threat-model | objectives: 4.1.3 -->
## Building a threat model of a deployment

A threat model answers four questions: what are we working on, what can go wrong, what are we going to do about it, and did we do a good enough job? For a Kubernetes deployment the steps are:

1. **Inventory the components**: control plane (API server, etcd, scheduler, controller manager), nodes (kubelet, container runtime, kube-proxy, CNI), add-ons (DNS, ingress, admission webhooks, operators), workloads, registries, CI/CD, external services.
2. **Draw the data flow diagram**: processes, data stores (etcd, registries, volumes, backups), external entities (users, cloud APIs) and the flows between them, with their protocols and credentials.
3. **Place the trust boundaries** on the diagram: every flow that crosses one is an attack point.
4. **Enumerate threats** per element and per crossing flow, for example with **STRIDE** (spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege), and map attacker behaviour with **MITRE ATT&CK** for containers.
5. **Choose and rank controls**: preventive, detective and corrective, by likelihood and impact.
6. **Review** the model when the architecture changes: a new ingress, a new tenant, a new webhook.

| Element on the diagram | Typical threats to examine |
| --- | --- |
| API server endpoint | Stolen credentials, anonymous access, overly broad RBAC, flooding |
| etcd and its backups | Direct reads of Secrets, tampering with objects |
| Kubelet | Unauthenticated API, `exec` into any Pod of the node |
| A container | Remote code execution, escape to the node, cryptomining |
| Pod-to-Pod flows | Eavesdropping, lateral movement, spoofing |
| Registry and pipeline | Backdoored images, stolen push credentials |

> **Exam tip.** The three inputs of a threat model are the **components**, the **data flows** and the **trust boundaries**. A framework such as STRIDE helps find threats; it does not replace drawing the system.

<!-- section: key-points -->
## Key points

- Boundaries: external clients and API server, control plane and nodes, node and container, namespace and tenant, cluster and external services.
- The API server is the hub: only it talks to etcd. Namespaces are soft boundaries.
- Node and Pod flows to the API server are TLS-protected and authenticated by default. API server to kubelet needs `--kubelet-certificate-authority`; API server proxy connections are plain HTTP.
- Pod-to-Pod traffic is unencrypted unless a service mesh or CNI encryption is added.
- Threat model = components + data flow diagram + trust boundaries, then threats (STRIDE, ATT&CK), then ranked controls, reviewed as the system changes.
