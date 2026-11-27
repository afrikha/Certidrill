A NetworkPolicy is a namespaced allow-list for Pod traffic at layer 3 and 4 (IP addresses, protocols and ports). CKAD tasks give you a namespace, a target Pod label, the allowed sources or destinations and a port, and you write the YAML: there is no `kubectl create` generator for NetworkPolicies. This chapter covers the isolation model, ingress rules from Pods, namespaces and IP blocks, default-deny and egress policies with the DNS exception, and how to predict and test what a set of policies lets through.

<!-- section: isolation-model | objectives: 5.1.1, 5.1.2 -->
## How NetworkPolicies select and isolate Pods

A NetworkPolicy (`networking.k8s.io/v1`, short name `netpol`) is only enforced if the cluster's network plugin supports it; without such a plugin the object is accepted and does nothing. The exam clusters enforce them.

| Rule | Consequence |
| --- | --- |
| No policy selects a Pod for a direction | The Pod is **non-isolated** in that direction: all traffic allowed |
| At least one policy selects the Pod and lists that direction in `policyTypes` | The Pod is **isolated** in that direction: only what some policy allows gets through |
| Several policies select the same Pod | Their rules are **added** (union); order does not matter, there is no deny rule |
| Pod A to Pod B | Needs A's egress **and** B's ingress to allow the connection |
| Reply traffic of an allowed connection | Allowed implicitly (no rule needed for the return path) |
| Traffic from the Pod's own node | Always allowed into an isolated Pod (this is why kubelet probes keep working) |

The spec has four fields:

| Field | Meaning | Default |
| --- | --- | --- |
| `spec.podSelector` | The Pods of **the policy's namespace** the policy applies to; `{}` selects all of them | Optional; omitted means `{}` |
| `spec.policyTypes` | `Ingress`, `Egress` or both | `Ingress` always, plus `Egress` only if the policy has an `egress` section |
| `spec.ingress` | List of rules, each with `from` and `ports` | Missing or empty: no ingress allowed |
| `spec.egress` | List of rules, each with `to` and `ports` | Missing or empty: no egress allowed (only if `Egress` is in `policyTypes`) |

No imperative command exists, so you start from the documentation example or from an existing policy, and you inspect the labels the policy will match:

```bash
kubectl get pods -n shop --show-labels
kubectl get ns --show-labels                     # every namespace has kubernetes.io/metadata.name
kubectl explain networkpolicy.spec.ingress.from  # field names without leaving the terminal
kubectl get netpol -n shop
kubectl describe netpol api-allow -n shop        # how the API server understood your selectors
kubectl apply -f api-allow.yaml
```

> **Exam trap.** `spec.podSelector` and a `podSelector` peer without `namespaceSelector` only see Pods in the policy's own namespace. Put `metadata.namespace: shop` in the file (or apply with `-n shop`): a policy created in `default` protects nothing in `shop`.

<!-- section: allow-ingress | objectives: 5.1.1 -->
## Allow ingress from Pods, namespaces and IP blocks

Each element of `from` (and of `to` in egress) is a **peer**:

| Task asks for | Peer |
| --- | --- |
| Pods with label `app=frontend` in the same namespace | `podSelector: {matchLabels: {app: frontend}}` |
| Every Pod of the same namespace | `podSelector: {}` |
| Every Pod of namespace `monitoring` | `namespaceSelector: {matchLabels: {kubernetes.io/metadata.name: monitoring}}` |
| Every Pod of namespaces labeled `team=ops` | `namespaceSelector: {matchLabels: {team: ops}}` |
| Pods `app=prometheus` **in** namespace `monitoring` | `namespaceSelector` and `podSelector` in the **same** element |
| Every Pod of every namespace | `namespaceSelector: {}` |
| Addresses `10.20.0.0/16` except `10.20.5.0/24` | `ipBlock: {cidr: 10.20.0.0/16, except: [10.20.5.0/24]}` |

Selectors are standard label selectors: `matchLabels`, `matchExpressions` (`In`, `NotIn`, `Exists`, `DoesNotExist`) or both. The control plane sets the immutable label `kubernetes.io/metadata.name` on every namespace, with the namespace name as value: it is the way to select a namespace by name.

A full ingress policy: Pods `app=api` in `shop` accept TCP 8080 from the frontend Pods of `shop`, from the Prometheus Pods of `monitoring`, and from the office network.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-allow
  namespace: shop
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: monitoring
      podSelector:
        matchLabels:
          app: prometheus
    - ipBlock:
        cidr: 192.168.10.0/24
    ports:
    - protocol: TCP
      port: 8080
```

Inside one rule, a connection must match **one** `from` peer **and one** `ports` entry. Missing `from` means any source; missing `ports` means any port. Several rules in `ingress` are ORed: use two rules when different sources get different ports.

| `ports` entry | Meaning |
| --- | --- |
| `port: 8080` | TCP 8080 (`protocol` defaults to `TCP`) |
| `protocol: UDP` + `port: 53` | UDP 53 only |
| `port: http` | The container port **named** `http` on the selected Pods |
| `port: 30000` + `endPort: 30100` | TCP 30000 to 30100 inclusive; `endPort` needs a numeric `port` greater or equal |
| no `port`, only `protocol: UDP` | Every UDP port |

The port is the port **on the Pod**. When the traffic goes through a Service, write the Service's `targetPort` (the container port), not its `port`.

> **Exam trap.** `ipBlock` cannot share an element with `podSelector` or `namespaceSelector`, and it should hold cluster-external addresses: Pod IPs change, select Pods by label. Every `except` CIDR must lie inside `cidr`, or the policy is rejected.

> **Exam trap.** Label values are strings. `matchLabels: {access: true}` is rejected; write `access: "true"`.

<!-- section: and-or | objectives: 5.1.1, 5.1.2 -->
## AND or OR: one peer or two

The most tested detail is one dash. Same selectors, different meaning:

```yaml
# ONE peer: Pods role=client that are IN namespaces team=ops (AND)
ingress:
- from:
  - namespaceSelector:
      matchLabels:
        team: ops
    podSelector:
      matchLabels:
        role: client
```

```yaml
# TWO peers: Pods role=client of the policy's namespace,
# OR any Pod of any namespace labeled team=ops (OR)
ingress:
- from:
  - namespaceSelector:
      matchLabels:
        team: ops
  - podSelector:
      matchLabels:
        role: client
```

| Structure | Combination |
| --- | --- |
| Fields inside one peer (`namespaceSelector` + `podSelector`) | AND |
| Elements of `from` / `to` | OR |
| Elements of `ports` | OR |
| `from` and `ports` of the same rule | AND |
| Rules of `ingress` / `egress` | OR |
| Policies selecting the same Pod | OR (union) |

When in doubt, `kubectl describe netpol` prints each peer on its own line: a peer that shows both a NamespaceSelector and a PodSelector is an AND.

> **Exam tip.** The task wording gives the structure away. "Pods labeled X **in** namespace Y" is one peer with both selectors. "Pods labeled X **and** all Pods of namespace Y" (two kinds of clients) is two peers.

<!-- section: default-deny | objectives: 5.1.2 -->
## Default deny and allow all

Without any policy, everything is allowed. These four policies, applied per namespace, change that baseline:

| Task asks for | `podSelector` | `policyTypes` | Rules |
| --- | --- | --- | --- |
| Deny all incoming traffic | `{}` | `[Ingress]` | none |
| Deny all outgoing traffic | `{}` | `[Egress]` | none |
| Deny both | `{}` | `[Ingress, Egress]` | none |
| Allow all incoming, even if other policies isolate | `{}` | `[Ingress]` | `ingress: [{}]` |
| Allow all outgoing | `{}` | `[Egress]` | `egress: [{}]` |

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

A deny policy for a few Pods only uses a label selector instead of `{}`. Because policies only add allows, a default deny never blocks what another policy allows: deny everything, then add one small policy per allowed flow.

> **Exam trap.** `ingress: []` (or no `ingress` field) allows nothing; `ingress: [{}]`, a rule with no `from` and no `ports`, allows everything. One pair of braces turns deny into allow.

> **Exam trap.** A deny-egress policy must list `Egress` in `policyTypes`. Without `policyTypes`, a policy with no `egress` section defaults to `[Ingress]` only, and egress stays open.

<!-- section: egress-dns | objectives: 5.1.2 -->
## Egress policies and DNS

Egress rules use `to` instead of `from`, with the same peers and `ports`. As soon as a Pod is isolated for egress, it can no longer resolve names: DNS is outgoing traffic to the cluster DNS Pods (CoreDNS, label `k8s-app=kube-dns` in `kube-system`) on port 53, **UDP and TCP**. The usual egress task therefore needs two rules:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-egress
  namespace: shop
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: db
    ports:
    - protocol: TCP
      port: 5432
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

| Task asks for | Egress rule |
| --- | --- |
| Reach Pods `app=db` on 5432 only | `to: [podSelector app=db]`, `ports: [{port: 5432}]` |
| DNS only | `to` the DNS Pods, ports 53 UDP and 53 TCP |
| DNS to any destination (simplest accepted form) | No `to`, `ports` 53 UDP and 53 TCP |
| An external API range | `to: [ipBlock: {cidr: 203.0.113.0/24}]` with its port |
| Everything except one subnet | `ipBlock` with `cidr: 0.0.0.0/0` and `except` |

The Pod-to-Pod rule cuts both ways: if `db` in `shop` is also isolated for ingress, it needs an ingress rule from `app=api`. An egress allow on `api` alone is not enough.

> **Exam trap.** Port 53 with the default protocol is **TCP only**. Most lookups use UDP: forget `protocol: UDP` and name resolution times out while the `db` rule looks correct.

> **Exam trap.** A NetworkPolicy cannot target a Service by name or a domain name. Select the backend Pods by label, or an external address with `ipBlock`.

<!-- section: predict-test | objectives: 5.1.2 -->
## Predict and test which traffic is allowed

For each connection, check the two ends separately:

1. Is the **source** Pod selected by a policy with `Egress`? If yes, at least one egress rule must match the destination and port.
2. Is the **destination** Pod selected by a policy with `Ingress`? If yes, at least one ingress rule must match the source and port.
3. Allowed only if both checks pass (a non-isolated end passes automatically).

Example, namespace `shop` with `default-deny-all` plus `api-allow` and `api-egress` from above:

| Connection | Result | Why |
| --- | --- | --- |
| `frontend` to `api` TCP 8080 | Blocked | `api` ingress allows it, but `frontend` is isolated for egress by the default deny and has no egress rule |
| `api` to `db` TCP 5432 | Blocked | `api` egress allows it, but `db` is isolated for ingress with no rule allowing `api` |
| `api` to CoreDNS UDP 53 | Allowed | `api` egress allows it; `kube-system` Pods are not isolated by `shop` policies |
| `api` to `db` TCP 5433 | Blocked | No egress rule matches the port |
| kubelet probe on `api` | Allowed | Traffic from the Pod's node is always allowed |

Test with a temporary Pod that carries the source labels, then remove it:

```bash
kubectl run tmp -n shop --rm -it --restart=Never --image=busybox:1.36 \
  --labels=app=frontend -- wget --spider --timeout=2 http://api:8080
kubectl run tmp -n shop --rm -it --restart=Never --image=busybox:1.36 \
  -- nslookup kubernetes.default
kubectl label pod tmp-client -n shop app=frontend --overwrite   # make an existing Pod match
kubectl label ns monitoring team=ops                           # make a namespace match
```

`download timed out` means a policy drops the packets; `connection refused` usually means the packet arrived and nothing listens on that port (wrong `targetPort`, not a policy problem); `bad address` means DNS is blocked or the name is wrong.

> **Exam trap.** Policies take effect from labels, not names: relabeling a Pod or a namespace moves it in or out of every matching policy at once. Check `--show-labels` before blaming the YAML.

<!-- section: key-points -->
## Key points

- Pods are open until a policy selects them for a direction; then only the union of allow rules passes. Node traffic and replies are always allowed.
- `podSelector: {}` selects every Pod of the policy's namespace; `metadata.namespace` decides which namespace that is.
- No generator: write the YAML, check labels with `--show-labels`, read the result with `kubectl describe netpol`.
- One peer with `namespaceSelector` and `podSelector` is AND; two peers are OR. Select a namespace by name with `kubernetes.io/metadata.name`.
- `ports` default to TCP and are Pod ports; named ports and `endPort` ranges are allowed.
- Default deny: `podSelector: {}` and `policyTypes` without rules; `[{}]` is allow all.
- Egress isolation needs DNS: port 53 UDP and TCP to `k8s-app=kube-dns` in `kube-system`.
- A connection needs both the source's egress and the destination's ingress to allow it.
