# Q-kcsa-5b — report (KCSA platform questions 5.4.2–5.7.4, English only)

48 `single` questions in `content/kcsa/questions/platform/`, prefix `kcsa-5b-`, 4 per objective. Difficulty 19 easy / 22 medium / 7 hard. Correct answers are spread evenly (12 a, 12 b, 12 c, 12 d).
Check: `CERT=kcsa npx tsx factory/validate.ts --prefix kcsa-5b-` returns 0 problems, and `npm run content:validate -- --cert kcsa --prefix kcsa-5b-` returns 0 problems and 0 warnings.

## Overlap with other batches
I read the KCSA stems of the other batches before and during writing, and dropped or replaced the questions of mine that tested the same decision:
- dedicated etcd CA (2c)
- `sa.key` (2a)
- `--kubelet-certificate-authority` (2a, 4b)
- mesh vs encrypted CNI (4b, 2c)
- private API endpoint (1a, 2a)
- Konnectivity (2c)
- ClusterIP exposure (2b, 4b)
- egress unchanged by ingress policies (4b)
- reads bypass admission (2a)
- mutating before validating (2a)
- AlwaysPullImages (5a, 1b)
- DenyServiceExternalIPs (2b)
- Gatekeeper `dryrun` (6b)
- VAP `[Warn, Audit]` (6b, 1a)
- VAP without webhook (3a)
- webhook `caBundle` (4a)
- registry allowlist (1b)
- `insecure-skip-tls-verify` (2c)
- Linkerd trust anchor expiry (5a)
- Pod-to-API-server `ca.crt` (4a)

Some batches were still being written while I worked. Review again once every batch is finished.

## Verified (WebFetch, 2026-11-23)
- **kubernetes.io**:
  - PKI certificates: CAs, signed certificates, `sa.key`/`sa.pub`, front-proxy only for aggregation, `system:masters` bypass, admin.conf vs super-admin.conf
  - CSR page: signers and auto-approval, 600 s minimum, 1-year `ClusterSigningDuration`, garbage collection, approval RBAC; ClusterTrustBundle and PodCertificateRequest are stable in v1.37
  - kubeadm certs: 1-year leaf certificates, 10-year CA, check-expiration, renew + restart, upgrade renewal, external CA disables kubelet client rotation
  - TLS bootstrapping
  - Authenticating: CN/O; "1.37 does not support certificate revocation"
  - Ingress: TLS Secret, port 443, termination, frozen API
  - Service: externalIPs deprecated since v1.36
  - Network Policies: default-deny egress, DNS note, ipBlock, limitations
  - Control plane–node communication: kubelet HTTPS not verified by default, API server proxy plain HTTP, Konnectivity beta with agents initiating connections, root CA injected into Pods
  - Admission controllers: v1.37 default list, reads bypass, connect verbs, `--enable-admission-plugins`, ImagePolicyWebhook, EventRateLimit (alpha, disabled)
  - Dynamic admission: failurePolicy default Fail, timeout 10 s (1–30), objectSelector opt-in warning, matchConditions, reinvocationPolicy, sideEffects
  - Admission webhook good practices
  - VAP: stable v1.30, binding required, validationActions
  - MutatingAdmissionPolicy: stable v1.36, enabled by default
  - Images: KubeletEnsureSecretPulledImages beta and on by default since v1.35
  - kubeconfig v1: `tls-server-name`, `insecure-skip-tls-verify`
- **Project docs**:
  - Istio: ambient overview, ambient data plane (ztunnel per node, CA rejects identities not on the node), add-workloads (label, no restart), security (PeerAuthentication modes, policy order), egress gateways (bypass needs NetworkPolicy)
  - Linkerd: automatic mTLS, architecture
  - Cilium: service mesh, L7 per-node Envoy, mutual authentication (beta), egress gateway, transparent encryption, Layer 3 `toFQDNs`
  - SPIFFE and SPIRE concepts
  - cert-manager: Issuer, Certificate (90-day duration, renewal at 2/3), ingress-shim, ACME
  - Gateway API TLS guide: Terminate default, Passthrough, ReferenceGrant, BackendTLSPolicy
  - Kyverno introduction
  - Gatekeeper howto.md on GitHub

## Doubts and choices
- **Gatekeeper reference**: `open-policy-agent.github.io` is not an allowed CNCF host. I used the same page on github.com, titled like the 6b batch's GitHub references.
- **SPIRE selectors**: the SPIRE concepts page doesn't show the literal `k8s:ns`/`k8s:sa` syntax, so the questions avoid it.
- **`kcsa-5b-pki-external-ca`**: kubeadm states that external CA mode disables automatic kubelet client certificate rotation. The explanation adds that the kube-controller-manager signers cannot sign without `ca.key`. That is an inference from the signers needing the CA key; the page doesn't say it in those words.
- **`kcsa-5b-linkerd`**: dropped (duplicate of 5a). The Linkerd trust-anchor fact is verified if anyone needs it.
- **`kcsa-5b-port-forward-admin`**: the page lists port-forwarding among the API server → kubelet HTTPS connections. The RBAC subresource name (`pods/portforward`) is not stated in the question.
- **`kcsa-5b-eventratelimit`**: this plugin is alpha (since v1.13) and disabled by default. The explanation says so; drop the question if alpha features should stay out of the bank.
- **Cilium**: questions name Cilium features (egress gateway, `toFQDNs`, per-node Envoy) as CNI-specific extensions, never as core Kubernetes.
- **Kyverno**: no question depends on the deprecation status of ClusterPolicy. It appears only as a distractor name in `kcsa-5b-gatekeeper-template-rego`.
- **`kcsa-5b-kubeconfig-tls-server-name`**: the hard question assumes the API server certificate has no SAN for 127.0.0.1, and the stem says so.
