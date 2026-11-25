Kubernetes components authenticate one another with X.509 certificates, so the cluster's public key infrastructure (PKI) is a security boundary: whoever holds a CA private key can mint any identity, including cluster-admin. The KCSA exam expects you to know which CAs exist, which certificates they sign, how the CertificateSigningRequest API issues new certificates, and how cert-manager handles certificates for workloads and ingress.

<!-- section: cluster-pki | objectives: 5.5.1 -->
## The Kubernetes PKI

A cluster built with kubeadm stores its PKI in `/etc/kubernetes/pki` on control plane nodes. It uses three separate certificate authorities:

| CA (files) | Signs | Used for |
| --- | --- | --- |
| **Cluster CA** `kubernetes-ca` (`ca.crt`, `ca.key`) | API server serving certificate (`apiserver`), API server client certificate for kubelets (`apiserver-kubelet-client`), kubelet client certificates, admin and component kubeconfig certificates | Everything that talks to or is called by the API server |
| **etcd CA** `etcd-ca` (`etcd/ca.crt`, `etcd/ca.key`) | etcd server and peer certificates, `healthcheck-client`, and the API server's etcd client certificate (`apiserver-etcd-client`) | Only etcd and its clients; a certificate from the cluster CA cannot talk to etcd |
| **Front-proxy CA** `kubernetes-front-proxy-ca` (`front-proxy-ca.crt`) | `front-proxy-client` | The API server authenticates to **extension API servers** of the aggregation layer (for example metrics-server) |

The **ServiceAccount key pair** (`sa.key`, `sa.pub`) is not a certificate: the private key signs ServiceAccount tokens and the public key lets the API server verify them.

Identity is carried in the certificate subject: the Common Name (CN) is the user name, the Organization (O) values are groups. A kubelet client certificate has `CN=system:node:<nodeName>` and `O=system:nodes`, which the Node authorizer and NodeRestriction rely on. A certificate with `O=system:masters` is a superuser that RBAC cannot restrict, and **certificates cannot be revoked** by Kubernetes: it has no certificate revocation list check, so a leaked admin certificate stays valid until it expires or the CA is replaced.

| Protect | Why |
| --- | --- |
| `ca.key` and `etcd/ca.key` | Anyone with them can sign any identity; keep them only on control plane nodes, or offline with an external CA |
| `admin.conf` and `super-admin.conf` | They embed client certificates with administrative groups |
| `/var/lib/kubelet/pki` on each node | The kubelet's client credential |

> **Exam trap.** Separate CAs exist for a reason: etcd trusts only its own CA, so a compromised kubelet certificate (signed by the cluster CA) cannot connect to etcd. The front-proxy CA is only needed for the API aggregation layer.

<!-- section: csr-rotation | objectives: 5.5.2 -->
## CertificateSigningRequest, signers, expiry and rotation

The **CertificateSigningRequest** (CSR) API (`certificates.k8s.io/v1`) lets a client obtain a certificate from a signer in the cluster:

1. The client creates a CSR object with a PKCS#10 request (`spec.request`), a required `spec.signerName` and optionally `spec.expirationSeconds` (minimum 600 seconds).
2. The CSR is **approved** or **denied**, by an administrator or by an automatic approver.
3. The **signer** issues the certificate into `status.certificate`.
4. The client downloads it. CSR objects are garbage-collected (approved or denied after 1 hour, pending after 24 hours).

```bash
kubectl get csr
kubectl certificate approve alice-csr
kubectl get csr alice-csr -o jsonpath='{.status.certificate}' | base64 -d
```

Built-in signers, implemented by kube-controller-manager:

| signerName | Issues | Auto-approved |
| --- | --- | --- |
| `kubernetes.io/kube-apiserver-client` | Client certificates accepted by the API server | No |
| `kubernetes.io/kube-apiserver-client-kubelet` | Kubelet client certificates (`system:node:` names, `system:nodes` group) | Yes, by the built-in approver |
| `kubernetes.io/kubelet-serving` | Kubelet serving certificates (needs a DNS or IP subject alternative name) | No |

Approving is a privileged act: it needs `update` on `certificatesigningrequests/approval` and the `approve` verb on the `signers` resource for that signer name. A user who can create and approve CSRs for `kubernetes.io/kube-apiserver-client` can issue a certificate for any user name, which is an escalation path.

**Expiry and rotation**:

| Certificate | Default lifetime | Rotation |
| --- | --- | --- |
| Certificates signed through the CSR API | `--cluster-signing-duration` of kube-controller-manager, **1 year** by default; the shorter of that and `expirationSeconds` | New CSR |
| kubeadm leaf certificates (API server, etcd, front proxy, kubeconfig certificates) | **1 year** | `kubeadm certs renew`, and automatically on every `kubeadm upgrade` |
| kubeadm CA certificates | **10 years** | Manual CA rotation |
| Kubelet client certificate | 1 year | **Automatic**: the kubelet requests a new one before expiry (`rotateCertificates`) |
| Kubelet serving certificate | Self-signed by default | With `serverTLSBootstrap: true`, requested through the CSR API; these CSRs must be approved |

```bash
kubeadm certs check-expiration
kubeadm certs renew all
```

After renewing, the control plane components must be restarted to load the new certificates. Expired certificates are a classic outage: the API server rejects kubelets and components whose certificates have expired.

Recent versions also add **ClusterTrustBundle** objects, to distribute CA certificates to Pods through projected volumes, and **PodCertificateRequest**, with which the kubelet obtains short-lived certificates for a Pod through a `podCertificate` projected volume; both are stable in v1.37.

> **Exam tip.** Kubelet client certificates rotate automatically; kubelet serving certificate CSRs are not auto-approved. The minimum `expirationSeconds` is 600 seconds, and the signer never issues a certificate longer than its configured duration.

<!-- section: cert-manager | objectives: 5.5.3 -->
## cert-manager for workloads and ingress

**cert-manager** (a CNCF project) automates X.509 certificates inside the cluster: it requests them from an issuer, stores them in Secrets and renews them before expiry.

| Resource | Role |
| --- | --- |
| `Issuer` | A certificate source usable from **one namespace** |
| `ClusterIssuer` | The same, usable from **every namespace** |
| `Certificate` | The desired certificate: DNS names, duration, issuer, and the `secretName` where the signed certificate and key are stored |
| `CertificateRequest` | Created by cert-manager for each issuance |

Issuer types include **ACME** (for example Let's Encrypt, with HTTP-01 or DNS-01 challenges), **CA** (a CA key pair stored in a Secret), **Vault**, and **SelfSigned**.

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: shop-tls
  namespace: shop
spec:
  secretName: shop-tls
  dnsNames:
  - shop.example.com
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
```

The default `duration` is **90 days**; without `renewBefore`, cert-manager renews at **two thirds** of the lifetime. For ingress, the **ingress-shim** watches Ingress objects annotated with `cert-manager.io/cluster-issuer` (or `cert-manager.io/issuer`) and creates a `Certificate` for the hosts and `secretName` listed under `spec.tls`; Gateway resources can be annotated the same way.

cert-manager also issues internal certificates: mesh CAs (Linkerd's issuer, Istio through istio-csr), webhook serving certificates, and mTLS between applications. Protect what it produces: the Secrets hold private keys, so restrict `get` on Secrets, and restrict who can create `Certificate` objects referencing a powerful `ClusterIssuer`.

> **Exam trap.** cert-manager does not replace the cluster's own PKI (kubeadm certificates, kubelet rotation); it manages certificates for applications, ingress and meshes. A namespaced `Issuer` cannot be referenced from another namespace; a `ClusterIssuer` can.

<!-- section: key-points -->
## Key points

- Three CAs: cluster CA (API server, kubelets, users), etcd CA (etcd and its clients), front-proxy CA (aggregation layer); the ServiceAccount key pair signs tokens.
- CN = user, O = groups; `system:masters` bypasses RBAC; Kubernetes cannot revoke certificates.
- CSR flow: create, approve, sign; built-in signers for API server clients, kubelet clients (auto-approved) and kubelet serving certificates.
- Signed lifetime: 1 year by default, minimum `expirationSeconds` 600; kubeadm leaf certificates 1 year, CAs 10 years; `kubeadm certs check-expiration` and `renew`.
- Kubelet client certificates rotate automatically; serving certificates need `serverTLSBootstrap` and CSR approval.
- cert-manager: Issuer (namespace) or ClusterIssuer (cluster), Certificate stored in a Secret, 90-day default, renewal at two thirds; ingress-shim annotations.
