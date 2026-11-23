kube-proxy turns Service objects into packet-forwarding rules on every node. It needs deep access to the node's network stack, and the Service types it implements decide whether a workload is reachable only inside the cluster or from outside it. The exam asks you to describe what kube-proxy does and the privileges it needs, how its files and endpoints are protected, and the exposure created by NodePort and LoadBalancer Services.

<!-- section: kube-proxy-role | objectives: 2.6.1 -->
## Role of kube-proxy and the privileges it needs

Every node runs a kube-proxy, usually as a **DaemonSet** in `kube-system` (unless a network plugin replaces it, as some eBPF-based CNI plugins such as Cilium can). Each instance watches the API server for **Service** and **EndpointSlice** objects and programs the node so that traffic sent to a Service's virtual IP (ClusterIP) or node port reaches one of the backing Pods.

| Proxy mode (Linux) | Status in v1.37 |
| --- | --- |
| `iptables` | **Default** when no mode is set |
| `nftables` | Successor to iptables and the recommended replacement for ipvs; a future version will make it the default |
| `ipvs` | **Deprecated** since v1.35 (disabled by default from v1.40, removed in v1.43) |

kube-proxy does not carry traffic itself in these modes: the kernel's netfilter rules do the forwarding. To write those rules it needs:

- the **host network namespace** (`hostNetwork: true`), because the rules belong to the node, not to a Pod;
- the **`NET_ADMIN`** capability or a privileged container, and access to kernel modules and `/run/xtables.lock` on the host;
- read access to the Kubernetes API: the built-in ClusterRole **`system:node-proxier`** allows reading Services, EndpointSlices and Nodes and writing events. It needs no access to Secrets.

Because it runs privileged on every node, a compromised kube-proxy (or a modified kube-proxy DaemonSet or image) can redirect any Service's traffic to an attacker's endpoint. Restrict who can edit the kube-proxy DaemonSet and its ConfigMap in `kube-system`.

> **Exam trap.** kube-proxy implements **Services** (virtual IPs and node ports). It does not enforce NetworkPolicy (the CNI plugin does), does not assign Pod IPs (the CNI plugin does) and does not create cloud load balancers (the cloud-controller-manager does).

<!-- section: securing-kube-proxy | objectives: 2.6.2 -->
## Securing kube-proxy files and endpoints

**Configuration and credentials.** kube-proxy reads a **KubeProxyConfiguration** file (`--config`) and a **kubeconfig** that holds its API credential. When it runs as a DaemonSet, the configuration usually comes from a ConfigMap and the credential from its ServiceAccount; when it runs as a host service, both are files on the node.

- Files on the node: owned by root, mode `600` or stricter, never mounted into other Pods.
- In the cluster: only administrators may modify the kube-proxy ConfigMap, DaemonSet and ServiceAccount bindings.
- When `--config` is set, most command-line flags (bind addresses, proxy mode, node port addresses) are ignored: the configuration file is the source of truth.

**Endpoints.** kube-proxy serves two HTTP endpoints:

| Endpoint | Default address | Purpose | Guidance |
| --- | --- | --- | --- |
| Metrics (`metricsBindAddress`, flag `--metrics-bind-address`) | `127.0.0.1:10249` | Prometheus metrics | Keep it on localhost; if it must be scraped remotely, bind to the node's internal address and allow only the monitoring system with node firewall rules |
| Health check (`healthzBindAddress`, flag `--healthz-bind-address`) | `0.0.0.0:10256` | Health of kube-proxy, used by external load balancers to check nodes | Reachable on the node network only; never exposed to the internet |

```yaml
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
mode: nftables
metricsBindAddress: 127.0.0.1:10249
healthzBindAddress: 0.0.0.0:10256
nodePortAddresses:
- primary
```

Setting `metricsBindAddress` to `0.0.0.0:10249` exposes internal information about Services and endpoints on every interface of the node: treat that as a misconfiguration unless firewalls limit it.

> **Exam tip.** The same pattern applies to every component: an exposed metrics or debug endpoint is information disclosure. kube-proxy metrics default to `127.0.0.1:10249`; changing that to all interfaces is the risky setting.

<!-- section: service-exposure | objectives: 2.6.3 -->
## Security implications of NodePort and LoadBalancer Services

| Service type | Reachable from | Security implications |
| --- | --- | --- |
| `ClusterIP` (default) | Inside the cluster only | Smallest exposure; still reachable by **every** Pod unless NetworkPolicy restricts it |
| `NodePort` | Every node, on a port from `--service-node-port-range` (default `30000-32767`) | Opens the same port on **all** nodes, including nodes that run none of the Pods; anyone who can reach a node IP reaches the Service; bypasses an ingress layer and its TLS and authentication |
| `LoadBalancer` | A load balancer created by the cloud provider, usually with a public IP | Public exposure by default; also allocates node ports by default (`allocateLoadBalancerNodePorts: true`), so the node ports are reachable too |
| `ExternalName` | Not proxied: a DNS CNAME | No exposure, but it can redirect clients to an external host |

Which node addresses serve a NodePort depends on the proxy mode: in `iptables` mode, **all** local IP addresses of the node by default; in `nftables` mode, only the node's **primary** addresses by default. The kube-proxy setting `--nodeport-addresses` (`nodePortAddresses`) restricts it to given CIDR ranges or keywords (`primary`, `localhost`, `all`).

Controls for exposed Services:

- **Prefer ClusterIP** plus a single, hardened entry point (an Ingress controller or a Gateway API implementation) that terminates TLS and applies authentication, instead of many NodePort or LoadBalancer Services.
- **Keep nodes private.** Node firewalls or cloud security groups should block the node port range from untrusted networks.
- **Restrict load balancers.** Use the provider's annotation for an **internal** load balancer when only private clients need access, and `spec.loadBalancerSourceRanges` to limit client source ranges where the provider supports it.
- **Restrict who can create them.** The Kubernetes security checklist asks that the use of LoadBalancer and `externalIPs` be restricted: use RBAC and admission policies to allow `type: LoadBalancer` or `NodePort` only in approved namespaces.
- **Block `externalIPs`.** The `spec.externalIPs` field allowed a user to intercept traffic for any IP address (CVE-2020-8554, man-in-the-middle). It is deprecated since v1.36; the **DenyServiceExternalIPs** admission plugin rejects new uses.
- **Source IP and policies.** With `externalTrafficPolicy: Cluster` (default), external traffic can be forwarded to another node and source-NATed, so NetworkPolicy `ipBlock` rules see a node address; `externalTrafficPolicy: Local` preserves the client source IP.

> **Exam trap.** A `LoadBalancer` Service is not "more private" than a `NodePort` Service: by default it **also** opens node ports on every node and adds a public address. And NetworkPolicy is enforced by the CNI plugin on Pods, not by kube-proxy on Services.

<!-- section: key-points -->
## Key points

- kube-proxy runs on every node, watches Services and EndpointSlices, and programs iptables or nftables rules; ipvs is deprecated since v1.35.
- It needs host networking and `NET_ADMIN` (often privileged); RBAC role `system:node-proxier`, no Secrets.
- Protect its kubeconfig and KubeProxyConfiguration; restrict edits to its DaemonSet and ConfigMap.
- Metrics on `127.0.0.1:10249` by default; health on `0.0.0.0:10256`; never expose them publicly.
- NodePort opens a port (30000-32767) on every node; LoadBalancer adds an external address and node ports.
- Prefer ClusterIP behind an Ingress or Gateway; restrict NodePort and LoadBalancer creation; use internal load balancers and source ranges.
- `externalIPs` is deprecated (CVE-2020-8554); DenyServiceExternalIPs blocks it.
