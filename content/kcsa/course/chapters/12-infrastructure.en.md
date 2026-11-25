The infrastructure under a cluster is its outermost layer of defense: the network that reaches the control plane and the nodes, the cloud identities the nodes carry, and the operating system of each node. This chapter covers who secures what, how the cluster is shielded from the network, why the instance metadata service is a classic target, and how nodes are hardened.

<!-- section: shared-responsibility | objectives: 1.2.1 -->
## Shared responsibility

Security is shared between the provider of the infrastructure and the cluster operator. Where the line falls depends on what you run yourself:

| Element | Self-managed cluster on your own hardware | Self-managed cluster on cloud virtual machines | Managed Kubernetes service |
| --- | --- | --- | --- |
| Physical datacenter, hardware, hypervisor | Operator | Provider | Provider |
| Network around the cluster (firewalls, private networks) | Operator | Operator, with the provider's tools | Shared: the provider secures the control plane network, the operator configures endpoint access and node networks |
| Control plane (API server, etcd, controller manager, scheduler): hardening, patching, backups | Operator | Operator | Provider |
| Worker nodes: operating system patching, kubelet configuration | Operator | Operator | Usually the operator, often with provider tooling for upgrades |
| Cluster configuration: RBAC, admission, NetworkPolicy, audit settings exposed to you | Operator | Operator | Operator |
| Workloads: images, Secrets, securityContext, application code | Operator | Operator | Operator |

Two rules hold in every model:

- The provider can never secure your **workloads, identities and configuration** for you: RBAC bindings, Pod settings, images and application code are always your responsibility.
- With a managed service you lose direct access to the control plane: you can't read the API server flags or etcd files, so you rely on the provider's settings and documentation, and on what the service exposes (audit logs, endpoint access options, encryption options).

> **Exam trap.** "Managed" doesn't mean "secured by the provider". A question where a managed cluster leaks data because of a ClusterRoleBinding, a privileged Pod or a public Service blames the cluster operator, not the provider.

<!-- section: network-and-identity | objectives: 1.2.2 -->
## Network access and cloud identities

The Kubernetes security checklist asks that the Kubernetes API, the kubelet API and etcd are **not exposed publicly on the internet**. In practice:

| Target | Recommended exposure |
| --- | --- |
| API server (TCP 6443, often 443 behind a load balancer) | Private endpoint, or a public endpoint restricted by network access lists to the addresses that administer the cluster; reached through a VPN or a bastion host |
| etcd (TCP 2379 for clients, 2380 for peers) | Reachable only from the API servers, behind a firewall, with mutual TLS |
| Kubelet API (TCP 10250) | Reachable only from the control plane |
| kube-scheduler (10259), kube-controller-manager (10257) | Local to the control plane node only |
| NodePort range (30000-32767) | Opened only where NodePort or LoadBalancer Services require it |

Nodes should accept connections only from the control plane on the specified ports, plus the traffic of NodePort and LoadBalancer Services, and should not have public addresses when it can be avoided.

The cluster also has a **cloud identity**: nodes and some controllers call the provider's API to attach disks, create load balancers or pull images. Give that identity only the permissions it needs. A node identity with broad rights becomes the attacker's identity as soon as one Pod on that node is compromised. When a workload needs cloud access, prefer a **per-workload identity** (most managed services map a Kubernetes ServiceAccount to a cloud identity) rather than reusing the node's credentials.

> **Exam tip.** "Least privilege" in this competency means the cloud permissions of the nodes and of the cluster's controllers, not RBAC. RBAC is a cluster-layer control.

<!-- section: metadata-service | objectives: 1.2.3 -->
## Instance metadata services

Cloud virtual machines expose a **metadata service** on the link-local address `169.254.169.254`. By default, Pods running on the instance can reach it. It can return the cloud credentials of the node, or provisioning data such as kubelet credentials and bootstrap scripts. With those credentials an attacker escalates inside the cluster or moves to other cloud services of the same account. This is a classic step after a server-side request forgery in a web application.

Mitigations, from the Kubernetes documentation:

1. **Limit the permissions** of the instance credentials, so that a leak gives little.
2. **Filter access from Pods** to the metadata API with NetworkPolicy, or with the network plugin's own policies, when workloads don't need it.
3. **Don't deliver secrets through provisioning data** (user data), which the metadata service returns to anyone who asks.
4. Use the provider's protections when they exist (for example requiring a session token or limiting the number of network hops) and per-workload identities instead of the node's.

An egress policy that lets the Pods of a namespace reach everything except the metadata address:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: block-metadata
  namespace: shop
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 169.254.169.254/32
```

The policy works only if the network plugin enforces NetworkPolicy, and Pods with `hostNetwork: true` share the node's network identity, which is one more reason to forbid them (the Baseline Pod Security Standard does).

> **Exam trap.** The metadata service is not part of the Kubernetes API, so RBAC can't block it. The answer is a network control (NetworkPolicy or the provider's protections) combined with least-privilege instance credentials.

<!-- section: host-hardening | objectives: 1.2.4 -->
## Hardening the nodes

All containers on a node share its kernel: a container escape lands on the host, and from there on everything the node can reach. Node hardening reduces both the chance and the impact of that escape.

| Practice | Why |
| --- | --- |
| **Minimal or immutable, container-focused operating system** | Fewer packages and services means a smaller attack surface after an escape; a read-only, image-based system resists persistent changes and is replaced rather than patched in place |
| **Regular patching** of the kernel, the container runtime and the kubelet | Container escapes often exploit kernel or runtime vulnerabilities; replace nodes with patched images on a schedule |
| **Restricted administrative access** | No routine SSH: access through a bastion or a provider's session service, with personal identities, short-lived credentials and logging; no shared keys |
| **Disable unused kernel modules** | Blocking modules that workloads don't need (the documentation cites `dccp` and `sctp`) removes kernel code an attacker could exploit |
| **Kernel security modules enabled** | AppArmor or SELinux on the host, so that Pods can use profiles |
| **Benchmark the configuration** | Check the operating system and the kubelet against the CIS benchmarks |
| **Protect node files** | Kubelet credentials, kubeconfig files and certificates readable only by root |

Nodes are also an isolation boundary: run sensitive workloads on dedicated nodes so that an escape from a less trusted Pod can't reach them.

> **Exam tip.** When a question asks how to reduce "the impact of a container escape on the node", look for an immutable, minimal node operating system or a sandboxed runtime, not for a Pod-level setting.

<!-- section: key-points -->
## Key points

- The provider secures what it operates (hardware, and the control plane of a managed service); the operator always secures workloads, RBAC and cluster configuration.
- Don't expose the API server, the kubelet API or etcd publicly; etcd only from the API servers; nodes only from the control plane and for NodePort or LoadBalancer traffic.
- Give nodes and controllers least-privilege cloud identities; prefer per-workload identities.
- The metadata service at `169.254.169.254` can leak node credentials: limit instance permissions, filter Pod access, keep secrets out of provisioning data.
- Harden nodes with a minimal, immutable OS, patching, restricted administrative access and disabled unused kernel modules.
