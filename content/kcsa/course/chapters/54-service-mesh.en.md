By default, traffic between Pods is plaintext, and a NetworkPolicy can only allow or deny it by IP, label and port: it cannot prove which workload is calling or encrypt the connection. A **service mesh** adds that layer: every workload gets a cryptographic identity, connections are encrypted and mutually authenticated, and policies decide which service may call which. The KCSA exam expects you to know these functions, the data plane models of Istio, Linkerd and Cilium, and the SPIFFE identity standard behind them.

<!-- section: mesh-security-functions | objectives: 5.4.1 -->
## Security functions of a service mesh

| Function | What it provides | Example |
| --- | --- | --- |
| **Mutual TLS (mTLS)** | Encryption in transit **and** authentication of both ends: client and server each present a certificate | Istio `PeerAuthentication` in `STRICT` mode; Linkerd, which enables mTLS automatically for meshed TCP traffic |
| **Workload identity** | Each workload gets an X.509 certificate tied to its **Kubernetes ServiceAccount**, issued and rotated automatically by the mesh's certificate authority | Istio's `istiod` CA; Linkerd's `identity` component (certificates valid 24 hours, renewed automatically) |
| **Service-to-service authorization** | Rules based on the caller's identity, not its IP: "only the `frontend` ServiceAccount may call `GET /orders`" | Istio `AuthorizationPolicy`; Linkerd authorization policies |
| **Observability** | Per-request metrics and access logs for every call | Golden metrics and logs from the proxies |

Istio mTLS modes, set with `PeerAuthentication` at mesh, namespace or workload level (the most specific wins):

| Mode | Behavior |
| --- | --- |
| `STRICT` | Accept only mTLS traffic |
| `PERMISSIVE` | Accept both mTLS and plaintext; used during migration, and the effective default when no mode is set |
| `DISABLE` | No mTLS |

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: payments
spec:
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: payments
spec:
  selector:
    matchLabels:
      app: payments-api
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/shop/sa/frontend"]
```

Istio evaluates `CUSTOM` policies first, then `DENY`, then `ALLOW`. A workload with no authorization policy allows everything; as soon as one `ALLOW` policy selects it, requests that match no `ALLOW` rule are denied.

> **Exam trap.** NetworkPolicy and a service mesh are complementary. NetworkPolicy works at layers 3 and 4 and is enforced by the CNI plugin; it does not encrypt and cannot express HTTP methods or cryptographic identity. The mesh adds mTLS, identity-based and layer 7 authorization. Traffic from Pods that are not in the mesh is not encrypted, and `PERMISSIVE` mode still accepts plaintext.

<!-- section: data-plane-models | objectives: 5.4.2 -->
## Data plane models: sidecar and sidecarless

The **control plane** of a mesh distributes configuration and certificates; the **data plane** is the set of proxies that carry the traffic.

| Model | How it works | Projects |
| --- | --- | --- |
| **Sidecar proxy** | A proxy container is injected into every Pod and intercepts its inbound and outbound traffic | Istio sidecar mode (Envoy); Linkerd (its own lightweight proxy) |
| **Sidecarless, node-level proxy** | A shared proxy on each node handles layer 4 (mTLS, identity, L4 authorization); optional separate proxies handle layer 7 | Istio **ambient mode**: a per-node **ztunnel** for L4 plus optional **waypoint** proxies (Envoy) for L7 policy; Cilium service mesh, with eBPF in the kernel and a per-node Envoy for L7 |

Security trade-offs:

| Aspect | Sidecar | Node-level (sidecarless) |
| --- | --- | --- |
| Blast radius of a compromised proxy | One Pod | Every Pod on the node using that node proxy (ztunnel holds the identities of the node's workloads) |
| Resource overhead | One proxy per Pod | One proxy per node, plus optional waypoints |
| Onboarding | Pods must be restarted to inject the sidecar | Workloads join without restart (Istio ambient: label the namespace) |
| Layer 7 features | In every sidecar | Only where a waypoint (or node Envoy) is deployed |

In Istio, ztunnel and core waypoint features are stable; ambient and sidecar workloads can coexist in the same mesh. **Cilium** also offers transparent encryption between nodes (IPsec or WireGuard) and a mutual authentication feature based on SPIFFE identities.

> **Exam tip.** "No proxy container in each Pod, mTLS handled per node" → Istio ambient mode (ztunnel) or Cilium. "Layer 7 authorization in ambient mode" → a waypoint proxy. Sidecar mesh with mTLS on by default and a minimal proxy → Linkerd.

<!-- section: spiffe-spire | objectives: 5.4.3 -->
## Workload identity with SPIFFE and SPIRE

**SPIFFE** (Secure Production Identity Framework For Everyone) is a set of open standards for identifying workloads across platforms. **SPIRE** is its production-ready reference implementation. Both are CNCF graduated projects.

| SPIFFE concept | Meaning |
| --- | --- |
| **SPIFFE ID** | A URI naming a workload: `spiffe://` + trust domain + path, for example `spiffe://example.com/ns/payments/sa/api` |
| **Trust domain** | The root of trust of a system (an organization, an environment); keep production and staging in separate trust domains |
| **SVID** (SPIFFE Verifiable Identity Document) | The document a workload presents: an **X.509-SVID** (a certificate, recommended) or a **JWT-SVID** (a token, exposed to replay, used when a layer 7 proxy sits between workloads) |
| **Trust bundle** | The public keys or CA certificates used to verify SVIDs of a trust domain |
| **Workload API** | A local API that gives a workload its SPIFFE ID, private key, short-lived SVID and trust bundles, **without any pre-existing secret**; keys are rotated automatically |

SPIRE architecture:

| Component | Role |
| --- | --- |
| **SPIRE Server** | Signing authority of the trust domain; stores **registration entries** that map a SPIFFE ID to selectors |
| **SPIRE Agent** | Runs on every node, exposes the Workload API, caches SVIDs |
| **Node attestation** | The agent proves its node's identity to the server (cloud instance identity document, join token, Kubernetes ServiceAccount token) |
| **Workload attestation** | The agent identifies the calling process (by its PID) and asks the kernel and the local kubelet for its properties: namespace, ServiceAccount, labels, image |

Selectors such as `k8s:ns:payments` and `k8s:sa:api` are matched against registration entries; if they match, the agent returns the SVID. No secret is copied into the Pod: identity comes from what the platform can attest about the workload.

Istio identities follow the SPIFFE format (`spiffe://cluster.local/ns/shop/sa/frontend`), which is why the principal in the `AuthorizationPolicy` above is `cluster.local/ns/shop/sa/frontend`. SPIFFE identities also work outside Kubernetes (virtual machines, other clouds) and across trust domains through federation.

> **Exam trap.** A SPIFFE ID is a name, an SVID is the signed document that proves it, and SPIRE is the software that attests workloads and issues SVIDs. A Kubernetes ServiceAccount token is a Kubernetes API credential; an SVID is a workload identity for service-to-service authentication.

<!-- section: key-points -->
## Key points

- A mesh provides mTLS (encryption plus mutual authentication), workload identity tied to the ServiceAccount, identity-based and L7 authorization, and telemetry.
- Istio `PeerAuthentication`: `STRICT`, `PERMISSIVE` (accepts plaintext; effective default), `DISABLE`; `AuthorizationPolicy` order CUSTOM, DENY, ALLOW.
- Sidecar model (Istio sidecar mode, Linkerd) versus node-level model (Istio ambient with ztunnel and waypoints, Cilium).
- NetworkPolicy is L3/L4 without encryption; the mesh adds mTLS and identity.
- SPIFFE ID = `spiffe://trust-domain/path`; SVID = X.509 or JWT proof; the Workload API delivers short-lived SVIDs without secrets.
- SPIRE Server signs and holds registration entries; SPIRE Agent on each node attests nodes and workloads.
