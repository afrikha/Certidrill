Connectivity security covers every path traffic takes into, out of and across the cluster: users reaching applications, Pods calling external services, components talking to the API server, and administrators reaching the cluster itself. The KCSA exam asks you to pick the right control for each path: TLS termination on Ingress or Gateway, egress NetworkPolicies and gateways, encryption in transit, and private administrative access.

<!-- section: inbound-traffic | objectives: 5.6.1 -->
## Securing inbound traffic

The first rule is to **expose only what must be exposed**:

| Service type | Reachable from | Use |
| --- | --- | --- |
| `ClusterIP` (default) | Inside the cluster only | Internal services, databases, back ends |
| `NodePort` | A port on **every node's** IP | Rarely needed; opens a port on all nodes |
| `LoadBalancer` | An external load balancer | One external entry point per Service; restrict source ranges where supported |
| Ingress or Gateway | A shared, TLS-terminating entry point routing by host and path | The usual way to publish HTTP(S) applications |

Prefer one controlled entry point (an Ingress controller or a Gateway) in front of `ClusterIP` Services over many `NodePort` and `LoadBalancer` Services, and review regularly which Services are of type `NodePort` or `LoadBalancer`.

**TLS on Ingress.** An Ingress references a Secret of type `kubernetes.io/tls` (keys `tls.crt` and `tls.key`) in its namespace. The Ingress API supports a single TLS port, 443, and uses SNI to serve several hosts on it. TLS is **terminated at the ingress point**: traffic from the Ingress controller to the Service and its Pods is plaintext unless a mesh or backend TLS encrypts it.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop
  namespace: shop
spec:
  ingressClassName: example
  tls:
  - hosts:
    - shop.example.com
    secretName: shop-tls
  rules:
  - host: shop.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 8080
```

**TLS on Gateway API.** The Kubernetes project now recommends **Gateway API** over Ingress; the Ingress API is frozen (still GA and supported, but no new features). In Gateway API:

| Element | Security role |
| --- | --- |
| `Gateway` listener with `protocol: HTTPS` and `tls.certificateRefs` | Terminates client (downstream) TLS; `mode: Terminate` is the default |
| `tls.mode: Passthrough` (protocol `TLS`, with `TLSRoute`) | The Gateway forwards encrypted traffic without decrypting it; the backend terminates TLS |
| `ReferenceGrant` | Required in the Secret's namespace before a Gateway in another namespace can use that certificate |
| `BackendTLSPolicy` | Configures TLS from the Gateway to the backend Service (upstream TLS) |

Gateway API also separates roles: the platform team owns the `GatewayClass` and `Gateway` (ports, certificates, allowed routes), while application teams attach `HTTPRoute` objects, so an application team cannot open a new port or replace the certificate.

> **Exam trap.** "Encrypt traffic all the way to the Pod" is not satisfied by Ingress TLS alone, because TLS ends at the Ingress controller. Use TLS passthrough, backend TLS (`BackendTLSPolicy`) or a service mesh with mTLS.

<!-- section: outbound-traffic | objectives: 5.6.2 -->
## Controlling outbound traffic

By default a Pod can connect to any destination, including the internet and the cloud metadata service. Unrestricted egress lets a compromised Pod download tools, exfiltrate data and reach command-and-control servers.

**Egress NetworkPolicies** apply default deny, then allow what is needed:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: payments
spec:
  podSelector: {}
  policyTypes:
  - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-and-payment-api
  namespace: payments
spec:
  podSelector:
    matchLabels:
      app: payments-api
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
  - to:
    - ipBlock:
        cidr: 203.0.113.0/24
    ports:
    - protocol: TCP
      port: 443
```

Rules to remember:

- A default-deny egress policy also **blocks DNS**: allow egress to the cluster DNS service explicitly.
- `ipBlock` is meant for cluster-external CIDRs; Pod IPs change.
- The standard NetworkPolicy API has **no domain-name (FQDN) rules**, no explicit deny rules, no logging, and no way to force traffic through a gateway. CNI plugins extend it: Cilium offers DNS-based egress rules (`toFQDNs`), and Cilium and Calico both offer cluster-wide policies.
- NetworkPolicies are enforced only by a CNI plugin that supports them.

**Egress gateways** route outbound traffic through a dedicated, controlled exit point:

| Option | What it does |
| --- | --- |
| Cilium Egress Gateway (`CiliumEgressGatewayPolicy`) | Sends traffic from selected Pods to external CIDRs through chosen gateway nodes with a **predictable source IP**, so external firewalls can allow that IP only |
| Istio egress gateway | Forces mesh traffic to external services through a dedicated proxy where it can be logged, authorized and originate TLS |
| Corporate proxy or firewall | Filters by domain and inspects traffic leaving the cluster network |

> **Exam tip.** "External firewall must allow traffic only from a known IP, but Pod IPs change" → egress gateway. "Pods in `payments` may call only one external API" → default-deny egress NetworkPolicy plus an allow rule (and DNS), or an FQDN policy from the CNI.

<!-- section: encryption-admin-access | objectives: 5.6.3 -->
## Encryption in transit and administrative access

| Path | Encryption | Watch out for |
| --- | --- | --- |
| Clients and nodes to the API server | TLS on the API server's secure port (443 or 6443); kubelets use client certificates | Never use `insecure-skip-tls-verify` |
| API server to etcd, etcd peer traffic | TLS with certificates from the etcd CA | etcd must not be reachable from Pods or users |
| API server to kubelet (logs, exec, port-forward) | TLS, but the API server **does not verify the kubelet serving certificate by default** | Set `--kubelet-certificate-authority` and use signed kubelet serving certificates |
| API server to nodes, Pods and Services through the API proxy | Plain HTTP by default; not safe over untrusted networks | Avoid relying on it across untrusted networks |
| Pod to Pod | **Plaintext** by default | Service mesh mTLS, or an encrypted CNI: Cilium transparent encryption (IPsec or WireGuard), Calico WireGuard |
| Client to application | TLS at the Ingress or Gateway | Plus backend TLS or mesh for the rest of the path |

Mesh mTLS also authenticates workloads; an encrypted CNI encrypts traffic between nodes but does not give workload identities. Use both when needed.

**Secure administrative access** keeps the API server and nodes off the open internet:

| Control | Effect |
| --- | --- |
| **Private API endpoint** | The API server has no public address, or the public endpoint is restricted to authorized IP ranges |
| **VPN** | Administrators join the private network before using `kubectl` |
| **Bastion (jump) host** | A hardened, audited host is the only way to reach the private network or the nodes |
| No SSH to nodes by default | Node access is an exception, audited and time-limited |
| Strong authentication | OIDC with MFA for `kubectl`, short-lived credentials, no shared admin kubeconfig |

The Konnectivity service (beta) can carry control-plane-to-node traffic through agents that connect outward from the node network, so nodes do not need to accept inbound connections from the control plane network.

> **Exam trap.** Kubernetes encrypts control plane connections with TLS but not Pod-to-Pod traffic. "Encrypt all east-west traffic between workloads" needs a service mesh or an encrypted CNI; a NetworkPolicy does not encrypt anything.

<!-- section: key-points -->
## Key points

- Expose only what is needed: `ClusterIP` by default, one Ingress or Gateway entry point, review `NodePort` and `LoadBalancer` Services.
- Ingress TLS uses a `kubernetes.io/tls` Secret, port 443 only, and terminates at the controller; Gateway API (recommended; Ingress is frozen) supports Terminate, Passthrough, `ReferenceGrant` and `BackendTLSPolicy`.
- Egress: default-deny egress NetworkPolicy, allow DNS explicitly, `ipBlock` for external CIDRs; no FQDN rules in the core API.
- Egress gateways (Cilium, Istio) give a controlled exit point and a stable source IP.
- Pod-to-Pod traffic is plaintext by default: mesh mTLS or an encrypted CNI (IPsec, WireGuard).
- API server to kubelet needs `--kubelet-certificate-authority` to verify the kubelet; admin access through private endpoints, VPN or bastion hosts.
