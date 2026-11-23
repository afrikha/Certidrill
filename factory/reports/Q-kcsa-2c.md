# Q-kcsa-2c — KCSA questions, components 2.8.2–2.11.3 (2026-11-23)

44 `single` questions in `content/kcsa/questions/components/`, prefix `kcsa-2c-`, 4 per objective. Difficulty 18 / 20 / 6. Correct options: a 12, b 11, c 11, d 10. `factory/validate.ts --prefix kcsa-2c-`: 0 problems. `content:validate --cert kcsa --prefix kcsa-2c-`: 0 problems, 0 warnings.

## Sources fetched (WebFetch, 2026-11-23)
kubernetes.io (v1.37 pages): Operating etcd clusters for Kubernetes; Encrypting Confidential Data at Rest; Services, Load Balancing, and Networking; Network Policies; Network Plugins; DNS for Services and Pods; Customizing DNS Service; Security Checklist; Communication between Nodes and the Control Plane; Ports and Protocols; Multi-tenancy; Organizing Cluster Access Using kubeconfig Files; kubeconfig (v1); Authenticating; Authorization; Hardening Guide - Authentication Mechanisms; Role Based Access Control Good Practices; Persistent Volumes; Volumes; Volume Types; Storage Classes; Configure a Security Context for a Pod or Container.
Other hosts: etcd.io Transport security model (v3.5); docs.cilium.io Transparent Encryption, Deny Policies, Using Kubernetes Constructs In Policy, policy overview; linkerd.io Automatic mTLS.

## Deduplication with batches written at the same time
I wrote a first version, then compared it with the KCSA stems that other agents added meanwhile (2a, 2b, 1a, 1b, 3a, 3b, 3c, 4a, 4b, 5b, 6a). I replaced 10 of my questions that tested the same decision as an existing one:
- only the API server reaches etcd (2b-etcd-only-apiserver, 1a-infra-etcd-clients)
- a leaked etcd snapshot exposes Secrets (4b-etcd-backup-leak)
- OIDC for many users (3a-authn-oidc-many-users)
- no certificate revocation (3a-authn-cert-no-revocation, 4a-cp-client-cert-revoke)
- `system:masters` bypasses RBAC (3a, 4a, 5b)
- CNI transparent encryption (4b-cni-transparent-encryption)
- cross-namespace reachability (4b-flat-network-reach, 1b-boundary-namespace-network)
- default deny against lateral movement (1a-principle-default-allow-network)
- Konnectivity (4a-df-konnectivity)
- plain-HTTP API server proxy (5b-apiserver-proxy-plaintext, 4a-df-apiserver-proxy)

Overlaps that remain, with a different decision tested:
- `2c-encryption-apiserver-vs-disk` (API-level encryption vs disk encryption) next to `2a-encryption-flag` (flag recall).
- `2c-hostpath-readonly` (an admission rule that limits directories needs read-only mounts) next to `3a-baseline-hostpath-readonly` (Baseline forbids hostPath).
- `2c-lowpriv-impersonation` (the RBAC guidance of a low-privilege account with impersonation rights) next to `4b-impersonate-verb` and `3b-cani-*`.
Other batches still running may add new overlaps.

## Stated from general knowledge (not on a fetched page)
- `--cipher-suites` is an etcd TLS flag (used as a distractor in `encryption-apiserver-vs-disk`).
- `cluster-admin` is bound by default to the `system:masters` group. This is no longer stated: that question was removed.
- In kubeadm, etcd runs as a static Pod on the host network (explanation of `etcd-dedicated-ca`, option d).
- Cilium supports egress deny rules (`egressDeny`). The fetched page showed only an `ingressDeny` cluster-wide example. The question says "a deny rule" without naming the field.
- Static token files can assign groups (`static-token-file`, explanation d).
- `AlwaysPullImages` purpose (one line in a distractor explanation of `periodic-access-review`).
- `kubectl auth whoami`, ExecCredential and the TokenRequest guidance were checked on fetched pages. The name of the ExecCredential expiry field is not used.

## Choices
- No question depends on the MITRE tactic names or on the 4Cs. PodSecurityPolicy and dockershim are not used. The kubelet `--network-plugin` flag (removed in v1.24) appears only as a wrong option.
- `encryption-key-backup` and `encryption-existing-secrets` use `secretbox`, not `aescbc`, so that the scenarios don't use a provider that the docs advise against.
- Course chapter `29-container-networking` has a DNS egress example with the label `k8s-app: kube-dns` (flagged in C-kcsa-2). No question depends on that label.
