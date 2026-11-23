Kubernetes networking is designed for connectivity first: out of the box, every Pod can talk to every other Pod. Security comes from what you add on top: NetworkPolicy enforced by the network plugin, encryption between nodes, and separation of the control plane, node and Pod networks. The exam asks you to explain the open-by-default model, the role of CNI plugins, and how the different networks and cluster DNS are protected.

<!-- section: network-model | objectives: 2.9.1 -->
## The Kubernetes network model and its security implications

The Kubernetes network model has three rules:

1. Each Pod gets its own **cluster-wide unique IP address**.
2. **All Pods can communicate with all other Pods**, on the same node or on different nodes, directly, without proxies or NAT.
3. Agents on a node (system daemons, the kubelet) can communicate with all Pods on that node.

This flat network is simple for applications and convenient for attackers:

| Implication | Example |
| --- | --- |
| **No isolation by default** | A Pod is non-isolated for ingress and egress until a NetworkPolicy selects it: all connections are allowed |
| **Namespaces are not network boundaries** | A Pod in `dev` can reach a database Pod in `payments` by its IP or Service name |
| **Lateral movement** | One compromised web Pod can scan the Pod network and attack every internal service, including ones that have no authentication |
| **Egress to sensitive endpoints** | Pods can reach the cloud instance metadata endpoint (`169.254.169.254`), node ports and the internet unless egress is restricted |

The standard response is an **allow-list**: a default deny policy in every namespace, then explicit policies for the flows each application needs.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: payments
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

An empty `podSelector` selects every Pod in the namespace; with both policy types listed and no rules, nothing is allowed in or out. Policies are **additive**: further policies can only allow more traffic, and there is no "deny" rule in the NetworkPolicy API.

> **Exam trap.** "By default, Pods in different namespaces cannot communicate" is false. Kubernetes allows all Pod-to-Pod traffic until a NetworkPolicy, enforced by the network plugin, says otherwise.

<!-- section: cni-plugins | objectives: 2.9.2 -->
## CNI plugins: enforcing NetworkPolicy and encrypting traffic

The Pod network is not built by Kubernetes itself. On Linux, the container runtime calls a **CNI (Container Network Interface) plugin** that creates the Pod's network interface, assigns its IP and sets up routes. Examples: **Calico**, **Cilium**, Flannel, and the plugins of managed Kubernetes services.

**NetworkPolicy enforcement belongs to the plugin.** The API server stores NetworkPolicy objects whatever plugin is installed, but creating a NetworkPolicy without a controller that implements it has **no effect**, and no error is shown. A plugin that only provides connectivity (Flannel on its own, for example) silently ignores every policy.

| Need | Where it comes from |
| --- | --- |
| Pod IPs and routing | Any CNI plugin |
| Standard NetworkPolicy (L3/L4, by labels, namespaces, IP blocks, ports) | A plugin that supports NetworkPolicy, such as Calico or Cilium |
| Cluster-wide or richer rules (global policies, explicit deny, DNS names, HTTP-aware rules) | Plugin-specific custom resources, for example Calico or Cilium policy CRDs |
| Encryption of Pod-to-Pod traffic between nodes | Plugin **transparent encryption** (Cilium with IPsec or WireGuard; Calico with WireGuard), or a service mesh |
| Workload identity and mutual authentication | A **service mesh** (Istio, Linkerd) with mTLS between workloads |

Kubernetes does **not** encrypt Pod-to-Pod traffic by default. Traffic between nodes crosses the node network in cleartext unless the CNI plugin encrypts it (node-to-node tunnels, transparent to the applications) or the workloads use TLS, often provided by a service mesh. CNI encryption protects against an attacker on the network between nodes; mesh mTLS additionally proves **which workload** is talking.

Because CNI agents program the node's network, they run as privileged DaemonSets in a system namespace: restrict who can modify them, like kube-proxy.

> **Exam tip.** "The team created NetworkPolicies but traffic is still allowed" points to a CNI plugin that does not enforce NetworkPolicy. "Encrypt traffic between Pods on different nodes without changing applications" points to CNI transparent encryption or a service mesh, never to NetworkPolicy, which has no TLS feature.

<!-- section: network-separation-dns | objectives: 2.9.3 -->
## Separating control plane, node and Pod networks, and protecting DNS

A cluster uses several address ranges with different trust levels:

| Network | Contains | Who should reach it |
| --- | --- | --- |
| **Control plane** | kube-apiserver endpoint (443 or 6443), etcd (2379, 2380), controller manager and scheduler ports (10257, 10259) | API server: administrators, nodes and Pods that need the API, ideally over a private endpoint. etcd: API servers only |
| **Node network** | Node IPs: kubelet API (10250), node ports (30000-32767), SSH | The control plane for the kubelet; administrators through a bastion or VPN for SSH; load balancers for node ports |
| **Pod network** (Pod CIDR) | Pod IPs assigned by the CNI plugin | Other Pods, as allowed by NetworkPolicy |
| **Service network** (Service CIDR) | Virtual ClusterIPs, implemented by kube-proxy or the CNI plugin | Pods inside the cluster |

Separation controls:

- Use **infrastructure firewalls** (security groups, node firewalls) for the control plane and node networks: NetworkPolicy applies to Pods, not to nodes, and it cannot block traffic from a node to its own Pods.
- Use **egress NetworkPolicies** with `ipBlock` and `except` to stop Pods from reaching node management ports, the control plane hosts and the metadata endpoint, keeping access to the API server only for workloads that need it.
- Do not run ordinary workloads with `hostNetwork: true`: they sit on the node network and usually escape NetworkPolicy.

**Cluster DNS.** CoreDNS (the usual cluster DNS add-on, in `kube-system`) answers names such as `db.payments.svc.cluster.local`. The kubelet writes each Pod's `/etc/resolv.conf` to point at it (`dnsPolicy: ClusterFirst`, the default). DNS is both a dependency and a target:

| Threat | Control |
| --- | --- |
| Tampering: whoever edits the CoreDNS ConfigMap or Deployment can redirect Service names to attacker endpoints | RBAC: only administrators may modify CoreDNS objects in `kube-system` |
| Denial of service: flooding CoreDNS breaks name resolution for the whole cluster | Several replicas, resource requests and limits, monitoring |
| Reconnaissance: any Pod can query Service names to map the cluster | Accept it as low-risk, never rely on obscure names, and protect the services themselves |
| Breaking DNS with default deny egress | Add an egress rule that allows UDP and TCP port 53 to the CoreDNS Pods in `kube-system` |

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: payments
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

> **Exam trap.** After a default deny egress policy, applications usually fail first on **DNS**, not on their real destination. The fix is an egress rule to the cluster DNS on port 53 (UDP and TCP), not removing the default deny.

<!-- section: key-points -->
## Key points

- Network model: unique IP per Pod; every Pod reaches every Pod without NAT; node agents reach local Pods.
- Default: no isolation, even across namespaces; apply default deny ingress and egress, then allow-list.
- CNI plugins build the Pod network; NetworkPolicy works only with a plugin that enforces it (Calico, Cilium).
- Pod-to-Pod traffic is not encrypted by default: CNI transparent encryption (WireGuard, IPsec) or service mesh mTLS.
- Firewalls protect control plane and node networks; NetworkPolicy protects Pods; egress rules block metadata and node ports.
- CoreDNS: protect its configuration with RBAC, keep it available, and allow port 53 egress after default deny.
