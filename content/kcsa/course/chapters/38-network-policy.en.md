By default, every Pod in a Kubernetes cluster can talk to every other Pod, in every namespace, and to anything outside the cluster. A **NetworkPolicy** restricts this traffic at the IP address and port level (layers 3 and 4). The exam tests how a policy selects Pods, how its rules combine, how to write a default deny, and what NetworkPolicy cannot do.

<!-- section: networkpolicy-objects | objectives: 3.8.1 -->
## NetworkPolicy objects

A NetworkPolicy (`networking.k8s.io/v1`) is a **namespaced** object with four main parts:

| Field | Role |
| --- | --- |
| `podSelector` | Selects the Pods **the policy applies to**, in the policy's namespace. An empty selector `{}` selects every Pod of the namespace |
| `policyTypes` | `Ingress`, `Egress` or both: the directions the policy isolates |
| `ingress` | List of rules, each with `from` peers and `ports`: the incoming traffic allowed |
| `egress` | List of rules, each with `to` peers and `ports`: the outgoing traffic allowed |

If `policyTypes` is omitted, `Ingress` is always set, and `Egress` is set only if the policy has egress rules.

**Isolation.** A Pod is non-isolated for a direction until at least one NetworkPolicy that selects it includes that direction. From then on, only the traffic that some policy allows in that direction is accepted. Reply traffic of an allowed connection is allowed implicitly (enforcement is stateful).

**Peers.** A `from` or `to` entry is one of:

| Peer | Selects |
| --- | --- |
| `podSelector` | Pods with these labels in the **policy's own namespace** |
| `namespaceSelector` | **All** Pods in the namespaces with these labels |
| `namespaceSelector` and `podSelector` in the **same** entry | Pods with these labels **in** namespaces with these labels (AND) |
| `ipBlock` | A CIDR range, with optional `except` ranges. Meant for cluster-external IPs, because Pod IPs are ephemeral |

Every namespace carries the immutable label `kubernetes.io/metadata.name` set to its name, which lets a `namespaceSelector` target one namespace by name.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-from-frontend
  namespace: shop
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: web
      podSelector:
        matchLabels:
          role: frontend
    ports:
    - protocol: TCP
      port: 8080
```

This policy lets only Pods labelled `role: frontend` in the `web` namespace reach the `app: api` Pods of `shop` on TCP 8080. Ports accept a number or a named container port; `endPort` defines a numeric range.

**How policies combine.** Policies are **additive** and never conflict: the traffic allowed for a Pod in a direction is the **union** of what all policies selecting it allow, so evaluation order does not matter. There is no "deny" rule. For a connection between two Pods, **both** the egress side of the source and the ingress side of the destination must allow it.

> **Exam trap.** One dash makes the difference. `namespaceSelector` and `podSelector` in the **same** list item mean AND (frontend Pods in the `web` namespace). Written as **two** list items (`- namespaceSelector:` then `- podSelector:`), they mean OR: any Pod of the `web` namespace, or any frontend Pod of the policy's own namespace. `kubectl describe networkpolicy` shows how Kubernetes interpreted the YAML.

<!-- section: default-deny | objectives: 3.8.2 -->
## Default deny and allowing required flows

The recommended pattern is **default deny, then allow**: isolate every Pod of a namespace with an empty `podSelector` and no rules, then add narrow policies for each required flow.

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

| Requirement | Policy |
| --- | --- |
| Deny all incoming traffic to every Pod of the namespace | `podSelector: {}`, `policyTypes: [Ingress]`, no `ingress` rules |
| Deny all outgoing traffic | `podSelector: {}`, `policyTypes: [Egress]`, no `egress` rules |
| Deny both | `policyTypes: [Ingress, Egress]` as above |
| Explicitly allow all incoming traffic | `podSelector: {}`, `ingress: [{}]` (one empty rule matches everything) |

A default deny on egress also **blocks DNS**: Pods can no longer resolve Service names. Add a policy that allows egress to the cluster DNS Pods on port 53, UDP and TCP:

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

Then allow each application flow (frontend to API, API to database) with a policy that selects the destination Pods for ingress and, because egress is denied too, a policy that lets the source Pods send.

> **Exam trap.** `podSelector: {}` (empty) selects **all** Pods of the namespace; it does not select "no Pods". A policy with `ingress: [{}]` allows **everything**, while a policy with `policyTypes: [Ingress]` and no `ingress` field denies everything. NetworkPolicy has no cluster-wide default: a default deny must be created **in each namespace**.

> **Exam tip.** "Pods cannot resolve names after a default deny was applied" points to a missing DNS egress rule, not to a broken CoreDNS.

<!-- section: networkpolicy-limits | objectives: 3.8.3 -->
## Limits of NetworkPolicy

**Enforcement depends on the network plugin.** The API server accepts NetworkPolicy objects in any cluster, but only a network plugin (CNI) that supports NetworkPolicy enforces them, such as Calico or Cilium. With a plugin that does not, the policies are stored and **silently have no effect**. If a plugin does not support `endPort`, a policy using it is applied to the single `port` only.

**Layers 3 and 4 only.** Rules match IP addresses, namespaces, Pod labels, protocols and ports. As of Kubernetes v1.37, the NetworkPolicy API cannot:

- Match layer 7 attributes (HTTP methods, paths, headers) or do anything TLS-related: use a service mesh, an ingress controller, or a CNI's own extended policies.
- Target a Service by name (select its Pods by label instead) or target nodes by their Kubernetes identity (only by CIDR).
- Explicitly deny traffic (rules only allow), or apply a default policy to all namespaces.
- Log allowed or blocked connections.
- Block loopback traffic or traffic from the Pod's own node.
- Force traffic through a common gateway.

Other points: `hostNetwork` Pods share the node's IP, so most plugins treat their traffic as node traffic; source NAT can change the IP seen by an `ipBlock` rule; and whether a policy change affects already established connections is implementation-defined.

| Need | Answer |
| --- | --- |
| Allow only `GET /orders` between two services | Service mesh authorization policy or CNI layer 7 policy, not NetworkPolicy |
| Encrypt Pod-to-Pod traffic | Service mesh mTLS or CNI encryption, not NetworkPolicy |
| Cluster-wide baseline or explicit deny rules | CNI-specific policy resources, not the core API |
| Restrict which Pods can reach the database Pods on port 5432 | NetworkPolicy |

> **Exam trap.** "The NetworkPolicy was created but traffic is still allowed" most often means the CNI plugin does not enforce NetworkPolicy. The object is valid; nothing in the data path applies it.

<!-- section: key-points -->
## Key points

- Pods are non-isolated by default. A NetworkPolicy isolates the Pods its `podSelector` selects, for the directions in `policyTypes`.
- Policies are additive allow lists: the union of all matching policies; no deny rule, no order. Both source egress and destination ingress must allow a connection.
- `namespaceSelector` + `podSelector` in one entry is AND; in two entries it is OR. `ipBlock` is for external CIDRs.
- Default deny: `podSelector: {}` with no rules, per namespace. After an egress default deny, allow DNS on port 53 UDP and TCP.
- Enforcement requires a CNI plugin that supports NetworkPolicy. Rules work at layers 3 and 4 only: no layer 7, no TLS, no logging.
