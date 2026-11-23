An attacker who controls one Pod, one node, or a machine on the same network as the cluster is an **attacker on the network**. Kubernetes networking is flat by default: every Pod can reach every other Pod, and much internal traffic is unencrypted. The exam asks you to recognise the network threats inside a cluster, the components that must never be reachable, and the controls that reduce what a network attacker can do.

<!-- section: in-cluster-network-threats | objectives: 4.5.1 -->
## Network threats inside a cluster

| Threat | What the attacker does | Why it works by default |
| --- | --- | --- |
| **Lateral movement** | From a compromised Pod, scans the Pod and Service networks and attacks databases, internal APIs and admin interfaces of other applications (ATT&CK: Network Service Discovery, T1046) | Without NetworkPolicy, all Pods can reach all Pods in all namespaces; internal services often trust any caller on the network |
| **Eavesdropping** | Captures traffic between Pods or between nodes to read credentials, tokens and personal data | Pod-to-Pod traffic is plain text unless the application, a service mesh or the CNI encrypts it |
| **Spoofing** | Impersonates another workload: forged source addresses, ARP or DNS spoofing on the node network, or simply calling a service that authenticates callers by IP | IP addresses of Pods are ephemeral and are not an identity; the `NET_RAW` capability, granted by default by many runtimes, lets a process craft raw packets |
| **Man-in-the-middle** | Intercepts a connection between components that do not verify each other's certificate | API server to kubelet connections are not verified by default; API server proxy connections are plain HTTP |

Services trusting the network is the core problem: "the request comes from inside the cluster" proves nothing once one Pod is compromised. Zero trust means every connection is authenticated and authorized on its own merits.

> **Exam trap.** Namespaces do **not** create network boundaries. A Pod in `dev` can reach a Pod in `payments` unless a NetworkPolicy (enforced by the CNI) says otherwise.

<!-- section: exposed-components | objectives: 4.5.2 -->
## Cluster components reachable from the network

Some endpoints give an attacker much more than one application. The table lists the classic ones and their default ports:

| Endpoint | Port | Risk if reachable and weakly protected |
| --- | --- | --- |
| **kube-apiserver** | 6443 | Anonymous access, brute force of credentials, exploitation of API server vulnerabilities; keep it private or behind allow lists |
| **etcd** | 2379 (clients), 2380 (peers) | Direct read and write of every object, including all Secrets, bypassing authentication, RBAC, admission and audit |
| **Kubelet API** | 10250 | `exec`, `run`, logs and Pod listing on that node. Anonymous access with `AlwaysAllow` authorization means remote code execution in every Pod of the node |
| **Kubelet read-only port** | 10255 | Pod and node information without any authentication |
| **Dashboards and admin UIs** (cluster web UIs, monitoring consoles) | Varies | An exposed UI running with a powerful ServiceAccount gives its users, or anyone who reaches it, cluster-wide rights |
| **Cloud instance metadata service** | `169.254.169.254` | Node credentials and cloud API tokens, often with rights to the provider's resources |
| **NodePort Services** | 30000–32767 | Every NodePort Service is reachable on every node's IP, often unintentionally from outside |

The kubelet deserves care because its defaults differ by how it is configured. The **command-line flags** default to anonymous authentication enabled and `AlwaysAllow` authorization. The **KubeletConfiguration** file defaults to anonymous disabled, `Webhook` authorization, and the read-only port disabled (`readOnlyPort: 0`). Installers such as kubeadm use the configuration file, but a hand-built node may not.

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
authentication:
  anonymous:
    enabled: false
  webhook:
    enabled: true
authorization:
  mode: Webhook
readOnlyPort: 0
```

With `Webhook` authorization the kubelet asks the API server (`SubjectAccessReview`) whether each caller may perform the action, so RBAC governs kubelet access too. Remember that `get` on the `nodes/proxy` subresource is not a read-only permission: it reaches the kubelet API, including `exec`, and bypasses the API server's audit and admission.

> **Exam trap.** The fix for an exposed kubelet is **authentication and authorization on the kubelet** (`anonymous.enabled: false`, `authorization.mode: Webhook`) plus network restriction. RBAC on the API server alone does nothing if the kubelet accepts anonymous requests with `AlwaysAllow`.

<!-- section: network-mitigations | objectives: 4.5.3 -->
## Mitigations

| Mitigation | Threat addressed | Notes |
| --- | --- | --- |
| **NetworkPolicy** | Lateral movement, access to metadata and node services | Default deny per namespace, then allow required flows; egress rules can block `169.254.169.254/32`. Requires an enforcing CNI |
| **Mutual TLS** (service mesh such as Istio or Linkerd) | Eavesdropping, spoofing, man-in-the-middle | Each workload gets a cryptographic identity (SPIFFE-style), traffic is encrypted, and authorization policies can allow callers by identity rather than by IP |
| **Encrypted Pod networking** (CNI encryption with WireGuard or IPsec, as in Cilium or Calico) | Eavesdropping between nodes | Transparent to applications; encrypts node-to-node traffic but does not give per-workload identities |
| **Minimal exposure of Services** | Unintended external access | `ClusterIP` by default; few `LoadBalancer` and `NodePort` Services; a single ingress or gateway with TLS; quotas on `services.nodeports` and `services.loadbalancers` |
| **Private control plane** | Attacks on the API server and etcd | Private endpoint or source IP allow lists for the API server; etcd reachable only from the API server, with mutual TLS |
| **Kubelet hardening** | Remote code execution through the kubelet | Anonymous auth off, `Webhook` authorization, read-only port off, `--kubelet-certificate-authority` on the API server, firewall rules on 10250 |
| **Drop `NET_RAW`** | Packet crafting and spoofing | `capabilities.drop: ["ALL"]`, as the Restricted Pod Security Standard requires |

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: egress-no-metadata
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

| Requirement | Best answer |
| --- | --- |
| Stop a compromised frontend Pod from reaching the database Pods | NetworkPolicy on the database Pods |
| Encrypt and authenticate service-to-service calls with workload identities | Service mesh mTLS |
| Encrypt all node-to-node Pod traffic without changing applications | CNI transparent encryption |
| Prevent anyone on the node network from running commands through the kubelet | Kubelet authentication and `Webhook` authorization |

> **Exam trap.** NetworkPolicy controls **who can connect**; it does not **encrypt** anything. mTLS encrypts and authenticates, but without NetworkPolicy or mesh authorization policies every workload can still try to connect. The strongest answers combine both.

<!-- section: key-points -->
## Key points

- The Pod network is flat and largely unencrypted by default: lateral movement, eavesdropping and spoofing are the in-cluster network threats. Pod IPs are not identities.
- Never expose etcd (2379/2380). Protect the kubelet (10250): anonymous auth off, `Webhook` authorization, read-only port 10255 off.
- Restrict dashboards, the metadata endpoint (`169.254.169.254`) and NodePort Services.
- Mitigate with default deny NetworkPolicy, mTLS through a service mesh, CNI encryption with WireGuard or IPsec, minimal Service exposure and a private control plane.
- NetworkPolicy decides who can connect; mTLS protects what is sent and proves who is sending it.
