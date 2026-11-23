The kubelet is the agent on every node: it receives Pod specs from the API server, asks the container runtime to start the containers, mounts their volumes and Secrets, and reports status. It also exposes an HTTPS API that can run commands inside any container on the node. The exam asks you to recognize the risk of an open kubelet API, the settings that close it, the controls that limit what a kubelet may do in the cluster, and how kubelet certificates are obtained and renewed.

<!-- section: kubelet-api | objectives: 2.4.1 -->
## The kubelet API and the risk of anonymous access

The kubelet serves an HTTPS API on **port 10250**. The API server calls it for `kubectl exec`, `kubectl attach`, `kubectl port-forward` and `kubectl logs`; monitoring agents call it for metrics.

| Endpoint (examples) | Gives |
| --- | --- |
| `/pods`, `/runningPods/` | The specs of every Pod on the node, including environment variables |
| `/exec`, `/run`, `/attach`, `/portForward` | Command execution and streaming into any container on the node |
| `/logs/` | Node log files |
| `/stats/`, `/metrics/` | Resource usage and metrics |
| `/configz` | The kubelet's running configuration |

Two historical weaknesses make this API a classic target:

- **Anonymous authentication.** Requests not rejected by another authenticator are treated as anonymous (user `system:anonymous`, group `system:unauthenticated`). The command-line flag `--anonymous-auth` defaults to `true`.
- **AlwaysAllow authorization.** The command-line default for `--authorization-mode` is `AlwaysAllow`: every authenticated (or anonymous) request is accepted.

Together these defaults mean that anyone who can reach port 10250 can list Pods and **execute commands in every container on the node**, without credentials, and from there read mounted Secrets and ServiceAccount tokens. The **read-only port 10255** is worse in design: it has no authentication or authorization at all and exposes Pod specs and metrics.

> **Exam trap.** The overly permissive values are the **command-line flag** defaults, used when the kubelet is started without a configuration file. The **KubeletConfiguration file** defaults are the safe ones: anonymous disabled, Webhook authentication and authorization, read-only port `0`. A question that says "kubelet started without `--config`" points at the dangerous defaults.

<!-- section: kubelet-hardening | objectives: 2.4.2 -->
## Hardening the kubelet

Set these values in the kubelet configuration file (`--config`); the equivalent flags are deprecated:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
authentication:
  anonymous:
    enabled: false
  webhook:
    enabled: true
  x509:
    clientCAFile: /etc/kubernetes/pki/ca.crt
authorization:
  mode: Webhook
readOnlyPort: 0
rotateCertificates: true
serverTLSBootstrap: true
```

| Setting | Effect |
| --- | --- |
| `authentication.anonymous.enabled: false` (flag `--anonymous-auth=false`) | Unauthenticated requests get `401 Unauthorized` |
| `authentication.x509.clientCAFile` (flag `--client-ca-file`) | Clients presenting a certificate signed by this CA are authenticated; the API server presents its client certificate (`--kubelet-client-certificate`, `--kubelet-client-key`) |
| `authentication.webhook.enabled: true` | Bearer tokens are validated by the API server through the **TokenReview** API |
| `authorization.mode: Webhook` | Every request is checked by the API server through the **SubjectAccessReview** API, so RBAC decides |
| `readOnlyPort: 0` (flag `--read-only-port=0`) | Disables the unauthenticated port 10255 |

With Webhook authorization, kubelet paths map to the `nodes` resource and a subresource: `/stats/*` to `nodes/stats`, `/metrics/*` to `nodes/metrics`, `/logs/*` to `nodes/log`, and everything else, including `/exec`, to **`nodes/proxy`**. Fine-grained authorization (stable since v1.36) adds subresources such as `nodes/pods`, `nodes/healthz` and `nodes/configz`, so a monitoring agent no longer needs `nodes/proxy` to read them.

> **Exam trap.** `get` on `nodes/proxy` is **not** read-only: it authorizes executing commands in any container on the node, because the streaming endpoints use HTTP GET. Grant monitoring tools `nodes/stats` or `nodes/metrics`, never `nodes/proxy`.

Network controls complete the picture: the kubelet API and the read-only port must never be reachable from the internet, and node firewalls should allow port 10250 only from the control plane and trusted agents.

<!-- section: node-authorizer | objectives: 2.4.3 -->
## Node authorizer and NodeRestriction

The kubelet is itself a client of the API server, with a credential stored on the node. If a node is compromised, that credential must not open the rest of the cluster. Two built-in controls limit it, and they only work for kubelets whose credential is in the group **`system:nodes`** with the user name **`system:node:<nodeName>`**:

| Control | Type | Limits |
| --- | --- | --- |
| **Node authorizer** (`--authorization-mode=Node,RBAC` on the API server) | Authorization mode | **Reads**: Secrets, ConfigMaps, PersistentVolumeClaims and PersistentVolumes only when they are referenced by Pods bound to this node; its own Node object; Pods bound to it. **Writes**: nodes and node status, pods and pod status, events |
| **NodeRestriction** (`--enable-admission-plugins=...,NodeRestriction`) | Validating admission plugin | A kubelet may modify only **its own** Node object and Pods bound to **its** node; it cannot delete its Node object, cannot update or remove its taints, and cannot set labels with the `node-restriction.kubernetes.io/` or `node-role.kubernetes.io/` prefixes |

The Node authorizer decides **which kind of request** is allowed; NodeRestriction checks **which object** a write targets. Use both. With the `ServiceAccountNodeAudienceRestriction` feature gate (beta), NodeRestriction also limits the audiences for which a kubelet can request ServiceAccount tokens to those used by Pods on its node.

> **Exam tip.** The legacy `system:node` ClusterRole gives read access to **all** Secrets. It exists only for compatibility; the documentation recommends the Node authorizer and NodeRestriction instead. "Limit a kubelet to the Secrets of Pods on its own node" means **Node authorizer**; "stop a kubelet from labeling itself or modifying other nodes" means **NodeRestriction**.

<!-- section: tls-bootstrapping | objectives: 2.4.4 -->
## TLS bootstrapping and certificate rotation

A new node needs a client certificate to talk to the API server. **TLS bootstrapping** gets one without copying a long-lived credential to every node:

1. The kubelet starts with a **bootstrap kubeconfig** (`--bootstrap-kubeconfig`) holding a low-privilege **bootstrap token**. Bootstrap tokens are stored as Secrets in `kube-system`; the API server (with `--enable-bootstrap-token-auth=true`) treats their holder as a member of the group `system:bootstrappers`.
2. The kubelet creates a **CertificateSigningRequest** with the signer `kubernetes.io/kube-apiserver-client-kubelet`.
3. The CSR is approved, automatically by the kube-controller-manager when `system:bootstrappers` is bound to the ClusterRole `system:certificates.k8s.io:certificatesigningrequests:nodeclient`, or by an administrator.
4. The controller manager signs it with the cluster CA; the kubelet writes a real kubeconfig (`--kubeconfig`) with the certificate, stored in `--cert-dir`.

The bootstrap token should be short-lived (bootstrap tokens carry an expiration): it only allows requesting a node certificate.

**Rotation** keeps certificates short-lived:

| Certificate | Setting | Approval |
| --- | --- | --- |
| Kubelet **client** certificate (kubelet to API server) | `rotateCertificates: true` (default `false`) | Renewals are auto-approved when `system:nodes` is bound to `system:certificates.k8s.io:certificatesigningrequests:selfnodeclient` |
| Kubelet **serving** certificate (port 10250) | `serverTLSBootstrap: true` (default `false`) | **Not** auto-approved by the built-in controllers, for security reasons: an administrator or a custom approver must approve it |

Without `serverTLSBootstrap`, the kubelet generates a **self-signed** serving certificate, so the API server cannot verify that it talks to the real kubelet. A custom approver should accept serving CSRs only from `system:node:<nodeName>` users in `system:nodes`, for `server auth` usage, and with IP and DNS names that belong to that node.

> **Exam trap.** Kubelet **client** certificate CSRs can be auto-approved; kubelet **serving** certificate CSRs (signer `kubernetes.io/kubelet-serving`) are never auto-approved by Kubernetes itself, because a node could otherwise claim another node's name or IP address.

<!-- section: key-points -->
## Key points

- The kubelet API (10250) can list Pods and exec into any container; the read-only port (10255) has no authentication at all.
- Flag defaults are unsafe (`--anonymous-auth=true`, `--authorization-mode=AlwaysAllow`, read-only port 10255); configuration file defaults are safe.
- Harden: anonymous off, x509 client CA and webhook authentication, `authorization.mode: Webhook`, `readOnlyPort: 0`, no public exposure.
- `nodes/proxy` equals exec on the node: never grant it to monitoring tools.
- Node authorizer limits what a kubelet reads; NodeRestriction limits which Node and Pod objects it writes and its labels.
- TLS bootstrapping: bootstrap token, CSR, approval, signed client certificate.
- `rotateCertificates` renews client certificates (auto-approved); `serverTLSBootstrap` requests serving certificates that need manual or custom approval.
