# C-kcsa-5 — report (KCSA chapters 47, 51–57, English only)

Check: `npx tsx factory/check-cert.ts kcsa 47-… 57-…` → 0 problems in my chapters; `npm run content:validate -- --cert kcsa --course --chapters …` → 0 problem(s).
Prose length: 1,210–1,480 words per chapter.

## Verified on official pages (2026-11-23)
- kubernetes.io: RBAC good practices (escalation paths, nodes/proxy bypasses audit and admission, system:masters), Pod Security Standards (v1.37 page), user namespaces (stable v1.36, PSA relaxations, incompatible with host namespaces), security context (allowPrivilegeEscalation default true, invalid with privileged/CAP_SYS_ADMIN), Linux kernel security constraints (privileged mode), admission controllers (v1.37 default plugin list, NodeRestriction, AlwaysPullImages, reads bypass admission), dynamic admission webhooks (failurePolicy default Fail, timeout 10 s, range 1–30), ValidatingAdmissionPolicy (stable v1.30), MutatingAdmissionPolicy (stable v1.36), images (pull policy defaults, KubeletEnsureSecretPulledImages beta since v1.35), PKI certificates, CSR API (signers, 600 s minimum, 1-year default, ClusterTrustBundle and PodCertificateRequest stable in v1.37), kubeadm certs (1 year / CA 10 years), control plane–node communication, Ingress (frozen API, TLS 443), NetworkPolicy (default deny egress, DNS note, limitations).
- Project docs: Sigstore overview and cosign verify, SLSA v1.0 levels and v1.2 tracks, in-toto (CNCF graduated), Falco (modern eBPF default, detects only, graduated), Istio security and feature stages (ztunnel/waypoints stable), SPIFFE and SPIRE concepts, Linkerd automatic mTLS (24 h certificates), Cilium encryption and egress gateway, cert-manager Certificate and ingress-shim, Gateway API TLS guide, Kyverno intro, Gatekeeper how-to, Harbor project configuration.

## Stated from knowledge, not fetched (low risk, flag for review)
- SPDX as ISO/IEC 5962:2021; CycloneDX maintained by OWASP.
- Harbor: CNCF graduated, Trivy default scanner, tag immutability rules, proxy cache, replication (the fetched page only confirmed scan on push, prevent vulnerable images, robot accounts, content trust).
- SPIFFE/SPIRE CNCF graduated; Prometheus and Fluentd/Fluent Bit CNCF graduated; OPA graduated.
- Tetragon (Cilium sub-project) can enforce by killing processes.
- Cilium mutual authentication based on SPIFFE; Calico WireGuard encryption; Cilium `toFQDNs`.
- cert-manager gateway-shim ("Gateway resources can be annotated the same way") — the ingress page only links to the Gateway usage page.
- "Kubernetes cannot revoke certificates (no CRL check)" — widely documented, not re-fetched.
- Istio `security.istio.io/v1` API version for PeerAuthentication/AuthorizationPolicy.
- Kyverno: whether `ClusterPolicy` is deprecated in favour of the CEL-based kinds was not confirmed; the chapter names both without stating a deprecation.

## Choices
- The Falco alert in 53 is an illustrative `text` block (format close to the default "shell in container" rule output), not copied from the docs.
- `NodeRestriction` is described as "not in the default list; enabled by kubeadm and most distributions" (it is absent from the v1.37 default list).
