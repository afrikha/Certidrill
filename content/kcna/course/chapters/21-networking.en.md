Kubernetes networking answers four questions: how Pods reach each other, how clients find a changing set of Pods, how traffic from outside gets in, and how to restrict who talks to whom. The exam asks you to pick the right Service type, to know what CoreDNS resolves, to tell Ingress from the Gateway API, to read a NetworkPolicy and to recognize what a service mesh adds.

<!-- section: network-model | objectives: 2.1.1 -->
## The Kubernetes network model

| Rule | Consequence |
| --- | --- |
| Every Pod gets its **own IP address**, cluster-wide | Containers of one Pod share it and talk over `localhost` |
| Pods on any node reach every other Pod **directly, without NAT** | No port mapping between Pods; an app sees the real source IP |
| Agents on a node (kubelet, system daemons) reach all Pods of that node | Probes work |

Kubernetes defines these rules but doesn't implement them. A **network plugin** that follows the **Container Network Interface** (CNI) specification does: when the runtime creates a Pod sandbox, the CNI plugin attaches it to the network and assigns its IP. Examples: Cilium (eBPF-based, also enforces network policies and can replace kube-proxy), Calico, Flannel. Until a CNI plugin is installed, nodes stay `NotReady` and Pods can't get an IP.

> **Exam trap.** CNI is for **networking**, CRI for **runtimes**, CSI for **storage**. A question about Pod IP addresses or connectivity between nodes points to CNI.

<!-- section: services | objectives: 2.1.2 -->
## Services and kube-proxy

Pods come and go with new IPs. A **Service** gives a set of Pods, chosen by a **label selector**, one stable virtual IP and DNS name, and load-balances connections across the ready Pods.

| Type | Reachable from | How |
| --- | --- | --- |
| **ClusterIP** (default) | Inside the cluster only | A virtual IP from the Service range |
| **NodePort** | Outside, on every node's IP at a static port (default range 30000-32767) | Builds on a ClusterIP |
| **LoadBalancer** | Outside, through an external load balancer | Provisioned by the cloud-controller-manager or another load balancer implementation; builds on a NodePort |
| **ExternalName** | Inside | DNS returns a **CNAME** to `spec.externalName`; no proxying, no selector |
| **Headless** (`clusterIP: None`) | Inside | No virtual IP, no load balancing: DNS returns the IPs of the individual Pods; used with StatefulSets |

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: shop
spec:
  type: ClusterIP
  selector:
    app: web
  ports:
  - port: 80          # port of the Service
    targetPort: 8080  # port of the container
```

The control plane lists the IPs and ports of the matching ready Pods in **EndpointSlice** objects (the older Endpoints API is deprecated since v1.33). On each node, **kube-proxy** watches Services and EndpointSlices and programs rules that send traffic for the virtual IP to a backend Pod. Its default mode on Linux is `iptables`; `nftables` is the newer mode, and `ipvs` is deprecated since v1.35.

<!-- section: dns | objectives: 2.1.3 -->
## Service discovery with CoreDNS

**CoreDNS**, a CNCF graduated project, is the cluster DNS server. It runs as a Deployment in `kube-system` behind a Service usually named `kube-dns`, and the kubelet writes that Service's IP into each Pod's `/etc/resolv.conf`.

| Name | Resolves to |
| --- | --- |
| `web.shop.svc.cluster.local` | The ClusterIP of Service `web` in namespace `shop` (A/AAAA record) |
| `web` | Same, from a Pod in `shop`: the search list adds `shop.svc.cluster.local` |
| `web.shop` | Same, from a Pod in any other namespace |
| Headless Service name | The IPs of all its ready Pods |
| `db-0.db.shop.svc.cluster.local` | One StatefulSet Pod behind the headless Service `db` |
| `_http._tcp.web.shop.svc.cluster.local` | SRV record of the named port `http` |

The default Pod `dnsPolicy` is `ClusterFirst`: cluster names go to CoreDNS, other names are forwarded upstream.

> **Exam trap.** A short name such as `web` only resolves within the client's own namespace. From another namespace, use `web.shop` or the full name.

<!-- section: ingress-gateway | objectives: 2.1.4 -->
## Ingress and the Gateway API

For HTTP and HTTPS, one entry point can route to many Services by host name and path, and terminate TLS.

| | Ingress | Gateway API |
| --- | --- | --- |
| Status | Stable but **frozen**: no new features | The **successor** of Ingress, recommended by the Kubernetes project |
| Installed | Built into the API; needs an **Ingress controller** | An add-on: its CRDs and an implementation must be installed |
| Resources | `Ingress`, `IngressClass` | `GatewayClass` (infrastructure provider), `Gateway` (cluster operator), `HTTPRoute`, `GRPCRoute` (application developers) |
| Protocols | HTTP and HTTPS; TLS on port 443 | HTTP, gRPC and more; header matching, traffic weighting |

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop
spec:
  ingressClassName: example
  rules:
  - host: shop.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api
            port:
              number: 80
```

> **Exam trap.** An Ingress object without an Ingress controller does nothing. And an Ingress only handles HTTP and HTTPS: to expose another TCP or UDP protocol, use a NodePort or LoadBalancer Service.

<!-- section: network-policies | objectives: 2.1.5 -->
## NetworkPolicy

By default every Pod accepts traffic from everywhere and can send traffic anywhere. A **NetworkPolicy** restricts traffic at layers 3 and 4 (IP addresses and ports) for the Pods it selects:

- A Pod is **isolated** for ingress (or egress) as soon as one policy selects it with that type in `policyTypes`; then only what some policy allows gets through.
- Policies only **allow**; they are additive (the union applies) and have no order.
- Sources and destinations: `podSelector` (Pods of the same namespace), `namespaceSelector`, `ipBlock` (CIDR ranges outside the cluster), plus ports.
- The CNI plugin enforces them. With a plugin that doesn't support NetworkPolicy, the objects are accepted and ignored.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: payments
spec:
  podSelector: {}        # every Pod of the namespace
  policyTypes:
  - Ingress              # no ingress rule: all inbound traffic denied
```

A common pattern: a default-deny policy per namespace, then small policies that allow each needed flow, such as from `app: web` to `app: api` on port 8080.

> **Exam trap.** NetworkPolicy works on IPs and ports, not on HTTP paths or methods, and doesn't encrypt anything. Layer 7 rules and mutual TLS are service mesh features.

<!-- section: service-mesh | objectives: 2.1.6 -->
## Service meshes

A **service mesh** moves service-to-service concerns out of the application code into a **data plane** of proxies, configured by a **control plane**.

| Capability | Examples |
| --- | --- |
| Security | **Mutual TLS** (mTLS) between services: encryption and workload identity, with certificates rotated automatically; authorization policies |
| Traffic management | Retries, timeouts, circuit breaking, traffic splitting for canary releases, mirroring |
| Observability | Request rates, errors and latency for each service, and distributed traces, without changing the app |

| Data plane | How it works |
| --- | --- |
| **Sidecar** | A proxy container in every Pod intercepts its traffic; full features, but CPU and memory per Pod |
| **Sidecarless** (ambient) | A shared per-node proxy handles layer 4 and mTLS; optional per-namespace proxies (waypoints) add layer 7 features |

| Project | Notes |
| --- | --- |
| **Istio** | Envoy-based; sidecar mode and ambient (sidecarless) mode |
| **Linkerd** | Sidecar mode with a lightweight Rust micro-proxy; focused on simplicity |
| **Cilium** | CNI plugin with eBPF that also offers service mesh features |

<!-- section: key-points -->
## Key points

- One IP per Pod, no NAT between Pods; a CNI plugin implements the model.
- ClusterIP (internal, default), NodePort (port on every node, 30000-32767), LoadBalancer (external load balancer), ExternalName (CNAME), headless (Pod IPs).
- EndpointSlices list the ready backends; kube-proxy turns them into node rules.
- CoreDNS: `service.namespace.svc.cluster.local`; short names only within the namespace.
- Ingress needs a controller and is frozen; the Gateway API is its successor.
- NetworkPolicy: allow-only, additive, L3/L4, enforced by the CNI plugin; start with default deny.
- Service mesh: mTLS, traffic management and observability; Istio, Linkerd.
