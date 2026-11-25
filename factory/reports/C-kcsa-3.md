# C-kcsa-3 — report

Chapters written (English only): 210-client-security, 211-storage, 31-pod-security-standards, 32-pod-security-admission, 33-authentication, 34-authorization, 35-secrets, 36-isolation-segmentation. Check: 0 problems for these chapters (check-cert and content:validate).

Facts verified on kubernetes.io (fetched 2026-11-23, pages already showing v1.37): PSS control tables (incl. Host Probes v1.34+, `container_engine_t`, sysctls up to 1.37), PSA modes/labels/exemptions/exempt updates, AdmissionConfiguration for PodSecurity, PSP deprecation blog, authentication strategies (structured authn config and anonymous config stable v1.34, SelfSubjectReview v1.28), hardening guide on authentication mechanisms, ServiceAccount token admin (1 h default, legacy cleaner stable v1.30), authorization modes (`--authorization-config` stable v1.32), RBAC and RBAC good practices, Secrets, Secrets good practices, encrypt-data providers table, KMS (v1 deprecated 1.28 / disabled 1.29, v2 stable 1.29), multi-tenancy, ResourceQuota, LimitRange, RuntimeClass, PV reclaim/access modes (RWOP stable v1.29), volumes (recursiveReadOnly stable v1.33), hostPath warning, fsGroup, NodeRestriction label prefix, ValidatingAdmissionPolicy (stable v1.30).

Doubts / not verified on a fetched page (stated from general knowledge, low risk):
- 211-storage: "plain NFS or iSCSI traffic is not encrypted" and the illustrative StorageClass parameter `encrypted: "true"` (flagged in the text as illustrative; parameters are driver-specific).
- 35-secrets: environment variables from a Secret are not refreshed when the Secret changes (the Secret page fetched did not state it explicitly; the ConfigMap page does for ConfigMaps). `secretbox` described as XSalsa20 and Poly1305 (from memory of the providers table).
- 33-authentication: default `system:public-info-viewer` access for unauthenticated callers is summarised as "basic health and version information" without naming the role.
- 32-pod-security-admission: "PodSecurity plugin enabled by default" (true since v1.23, not re-fetched).
- 34-authorization: `pods/exec` listed without a verb on purpose (the required verb has changed with WebSocket streaming in recent releases).
- Cross-references to other chapters are written as "chapter 2.4", "chapter 3.2", "chapter 3.4", "chapter 3.5" (plain text, no links).
- No `references:` added to course.yaml (not my file to edit).
