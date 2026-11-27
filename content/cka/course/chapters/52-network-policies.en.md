NetworkPolicies are the firewall of the Pod network: they allow TCP, UDP and SCTP connections to and from selected Pods, by Pod label, namespace label, IP block and port. The CKA asks for them as manifests (there is no `kubectl create networkpolicy`): "allow only the `frontend` Pods to reach the `api` Pods on port 8080", "deny all ingress in namespace `payments`", "the Pods can no longer resolve names after your policy, fix it". You need the exact field layout, the defaults of `policyTypes`, the AND versus OR indentation of selectors, and a quick way to test the result from a temporary Pod.

<!-- section: policy-model | objectives: 5.2.1, 5.2.2 -->
## How NetworkPolicies are enforced

A NetworkPolicy (`networking.k8s.io/v1`, namespaced, short name `netpol`) is only an API object: the **CNI plugin** enforces it. On a cluster whose plugin does not support NetworkPolicy, creating one has no effect and no error.

| Rule (kubernetes.io) | Consequence for a task |
| --- | --- |
| A Pod with no policy selecting it is **non-isolated**: all traffic allowed in both directions | Creating the first policy that selects a Pod changes its behavior |
| A Pod is isolated for ingress (or egress) when at least one policy selects it **and** has `Ingress` (or `Egress`) in `policyTypes` | Isolation is per direction |
| Policies are **additive**: the allowed traffic is the union of all policies that apply | There is no deny rule and no order; you can only add allows |
| A connection needs the **egress** side of the source Pod and the **ingress** side of the destination Pod to allow it | A default-deny egress in the client namespace blocks a call that the server allows |
| Reply traffic of an allowed connection is allowed implicitly | Never write a rule for the return path |
| Traffic from the Pod's own node is always allowed for ingress | kubelet probes keep working under a default deny |

```bash
kubectl get networkpolicy -A
kubectl get netpol -n shop
kubectl describe netpol api-allow-frontend -n shop     # how the API read your selectors
kubectl explain networkpolicy.spec.ingress.from
kubectl get pods -n shop --show-labels
kubectl get ns --show-labels
kubectl -n kube-system get pods -o wide                 # which CNI runs (calico, cilium...)
```

`spec.podSelector` chooses the Pods the policy **applies to**, in the policy's namespace only; `podSelector: {}` selects every Pod of the namespace. The selectors inside `from` and `to` choose the **peers**.

> **Exam trap.** `policyTypes` has a default: `Ingress` is always set, and `Egress` is added only if the policy has an `egress` section. A policy meant to block all egress (no `egress` section) must list `Egress` explicitly, otherwise it only isolates ingress.

<!-- section: ingress-rules | objectives: 5.2.1 -->
## Ingress rules with Pod and namespace selectors

Each entry of `ingress` is a rule; a rule allows traffic that matches **one** of its `from` peers **and** one of its `ports`. A missing or empty `from` matches all sources; a missing or empty `ports` matches all ports.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-allow-frontend
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
    ports:
    - protocol: TCP
      port: 8080
```

This allows TCP 8080 to the `app=api` Pods of `shop` from the `app=frontend` Pods of `shop` **or** from any Pod of namespace `monitoring`. Everything else to `app=api` is denied, because the policy isolates those Pods for ingress.

| Peer in `from` or `to` | Selects |
| --- | --- |
| `podSelector` alone | Pods with these labels in the **policy's namespace** |
| `namespaceSelector` alone | **All** Pods of the namespaces with these labels |
| `namespaceSelector` and `podSelector` in the **same** entry | Pods with these labels in the namespaces with these labels |
| `namespaceSelector: {}` | All Pods of all namespaces |
| `ipBlock` | IP ranges, meant for addresses outside the cluster |

A NetworkPolicy has no field for a namespace name. Use the label `kubernetes.io/metadata.name`, which the API server sets on every namespace with the namespace name as value, or add your own label with `kubectl label namespace monitoring team=ops`.

| `ports` entry | Meaning, default |
| --- | --- |
| `port: 8080` | Port on the **destination Pod** (the container port, the Service `targetPort`), not the Service `port` |
| `port: http` | A named container port |
| `protocol` | `TCP`, `UDP` or `SCTP`; default `TCP` |
| `port: 32000` with `endPort: 32768` | A numeric range, inclusive; `endPort` needs a numeric `port` |
| No `port` | All ports of that protocol |

> **Exam trap.** When a Service maps `port: 80` to `targetPort: 8080`, the policy must allow **8080**. Policies filter Pod-to-Pod traffic after the Service address is translated, so the Service port never appears in them.

<!-- section: egress-ipblock | objectives: 5.2.1 -->
## Egress rules and IP blocks

Egress rules have the same shape with `to` instead of `from`. The policy below lets the `app=api` Pods talk only to the `app=db` Pods on 5432, to an external range on 443, and to the cluster DNS.

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
    - ipBlock:
        cidr: 203.0.113.0/24
        except:
        - 203.0.113.128/25
    ports:
    - protocol: TCP
      port: 443
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

| Task asks for | Field |
| --- | --- |
| Reach an external network | `ipBlock.cidr` |
| All of a range but one subnet | `ipBlock.except` (each entry must be inside `cidr`) |
| Any destination on one port | A rule with `ports` and no `to` |
| A range of ports | `port` plus `endPort` |
| Name resolution | UDP **and** TCP 53 to the CoreDNS Pods (label `k8s-app=kube-dns`, namespace `kube-system`) |

`ipBlock` should target addresses outside the cluster: Pod IPs change, and whether NAT happens before or after policy processing (node IP, load balancer IP) depends on the plugin. To reach Pods, select them by label.

> **Exam trap.** As soon as a Pod is isolated for egress, DNS is blocked too and every call by name fails, although connections by IP to allowed peers still work. Add the port 53 rule (both protocols) whenever you write an egress policy.

<!-- section: default-policies | objectives: 5.2.2 -->
## Default deny and allow-all policies

Default policies select every Pod of the namespace with `podSelector: {}`. They belong to one namespace: there is no cluster-wide NetworkPolicy, so repeat them per namespace.

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

| Goal | `spec` |
| --- | --- |
| Deny all ingress | `podSelector: {}`, `policyTypes: [Ingress]`, no `ingress` |
| Deny all egress | `podSelector: {}`, `policyTypes: [Egress]`, no `egress` |
| Deny both | `podSelector: {}`, `policyTypes: [Ingress, Egress]` |
| Allow all ingress | `podSelector: {}`, `ingress: [{}]`, `policyTypes: [Ingress]` |
| Allow all egress | `podSelector: {}`, `egress: [{}]`, `policyTypes: [Egress]` |

The difference between deny and allow is a single empty rule: no rule allows nothing, an empty rule `{}` allows everything. Since policies are additive, an allow-all policy overrides every deny in that direction for the Pods it selects.

A typical task: deny everything in `payments`, then open only what is needed. Keep the deny policy and add allow policies next to it, plus the DNS egress policy:

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
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

> **Exam trap.** `ingress: []` (an empty list) and no `ingress` field both allow nothing; `ingress: [{}]` (a list with one empty rule) allows everything. Read the brackets in a broken policy carefully before you change it.

<!-- section: predict-traffic | objectives: 5.2.2 -->
## Predicting the allowed traffic: AND versus OR

YAML indentation decides the meaning of the peers. One list item (one dash) with two selectors is an **AND**; two list items are an **OR**.

```yaml
ingress:
- from:
  - namespaceSelector:
      matchLabels:
        team: ops
    podSelector:
      matchLabels:
        role: scraper
```

```yaml
ingress:
- from:
  - namespaceSelector:
      matchLabels:
        team: ops
  - podSelector:
      matchLabels:
        role: scraper
```

| Construct | Allowed sources |
| --- | --- |
| First block: one entry, both selectors | `role=scraper` Pods **in** namespaces labeled `team=ops` |
| Second block: two entries | **Every** Pod of namespaces labeled `team=ops`, **or** `role=scraper` Pods of the policy's own namespace |
| Two rules (two dashes under `ingress`), each with its own `from` and `ports` | Each source only on its own ports |
| One rule with two `from` entries and two `ports` | Each source on both ports |

A procedure to predict whether connection A to B on port P works:

1. List the policies that select B (`kubectl get netpol -n <ns-of-B>` and compare `podSelector` with B's labels). None with `Ingress`: B accepts everything.
2. Otherwise, at least one ingress rule of those policies must match A (Pod labels, namespace labels, IP) **and** port P.
3. Repeat for A in the egress direction: no policy with `Egress` selects A, or one egress rule matches B and P.
4. Allowed only if both sides allow it.

Test from a temporary Pod with the labels of the client, in the client namespace:

```bash
kubectl run np-test -n shop --rm -it --restart=Never --image=busybox:1.36 \
  --labels=app=frontend -- wget -qO- -T 2 http://api:8080
kubectl run np-test -n shop --rm -it --restart=Never --image=busybox:1.36 \
  -- wget -qO- -T 2 http://api:8080          # no label: must time out
kubectl run np-test -n shop --rm -it --restart=Never --image=busybox:1.36 \
  -- nslookup api.shop.svc.cluster.local      # DNS still resolves?
```

A blocked connection usually **times out** (most plugins drop the packets); a `connection refused` usually means the packet got through but nothing listens on that port.

> **Exam trap.** A `podSelector` in `from` never crosses namespaces on its own. To allow `app=frontend` Pods of namespace `web` into `shop`, put a `namespaceSelector` for `web` and the `podSelector` in the **same** entry; a separate `podSelector` entry would look for `app=frontend` Pods in `shop`.

<!-- section: key-points -->
## Key points

- The CNI plugin enforces NetworkPolicies; without support they do nothing.
- A Pod is isolated per direction as soon as one policy selects it with that type in `policyTypes`; policies only add allows, and both egress of the source and ingress of the destination must allow a connection.
- `policyTypes` defaults to `Ingress`, plus `Egress` only when an `egress` section exists: list `Egress` for a deny-all egress.
- Ports are the destination Pod's ports (`targetPort`), protocol defaults to `TCP`, `endPort` gives a range.
- Select a namespace by label, for example `kubernetes.io/metadata.name: <name>`.
- One entry with `namespaceSelector` and `podSelector` is AND; two entries are OR.
- `podSelector: {}` with no rules denies; an empty rule `{}` allows all.
- Egress isolation blocks DNS: allow UDP and TCP 53 to `k8s-app=kube-dns` in `kube-system`.
- Test with `kubectl run --rm -it --labels=... -- wget -T 2`: a timeout means blocked.
