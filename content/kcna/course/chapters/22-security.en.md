Kubernetes security is a set of layers: who can call the API and what they may do, what a Pod is allowed to do on its node, how sensitive data is protected and which images are allowed to run. The KCNA exam stays at the level of concepts: the path of an API request, RBAC objects, ServiceAccounts, the Pod Security Standards, Secrets, and supply chain controls. Hardening in depth is the subject of the KCSA certification.

<!-- section: security-layers | objectives: 2.2.1 -->
## Security layers and the path of an API request

The Kubernetes documentation follows the CNCF security whitepaper and organizes controls by **lifecycle phase**:

| Phase | Goal | Examples of controls |
| --- | --- | --- |
| **Develop** | Integrity of code and development environments | Code review, threat modeling |
| **Distribute** | A trusted supply chain for images | Vulnerability scanning, signing, private registries |
| **Deploy** | Restrict what is deployed, by whom and where | Admission policies, image verification, namespaces |
| **Runtime** | Protect the API, workloads, network and storage | RBAC, Pod Security Standards, NetworkPolicy, encryption at rest, audit logs |

Every request to the kube-apiserver goes through the same stages, over TLS (port 6443 by default):

| Stage | Question | On failure |
| --- | --- | --- |
| **Authentication** | Who is calling? Client certificates, bearer tokens, OIDC, ServiceAccount tokens | `401 Unauthorized` |
| **Authorization** | May this identity do this verb on this resource? Modes such as RBAC, Node and Webhook | `403 Forbidden` |
| **Admission control** | Should this object be changed or rejected? **Mutating** admission (sets defaults, injects sidecars) runs before **validating** admission (enforces policies); only for create, update and delete, not reads | Request rejected |

The object is then validated against its schema and stored in etcd.

> **Exam trap.** Authentication answers "who", authorization answers "may they", admission answers "is this object acceptable". Pod Security Admission, ResourceQuota and policy engines such as Kyverno act at the **admission** stage, not at authorization.

<!-- section: rbac | objectives: 2.2.2 -->
## RBAC

Role-based access control grants permissions; there are **no deny rules**, so anything not granted is refused.

| Object | Scope | Purpose |
| --- | --- | --- |
| **Role** | One namespace | A list of rules: API groups, resources, verbs (`get`, `list`, `watch`, `create`, `update`, `patch`, `delete`) |
| **ClusterRole** | Cluster | Same rules, for cluster-scoped resources (nodes, PersistentVolumes), for all namespaces, or as a reusable template |
| **RoleBinding** | One namespace | Grants a Role, or a ClusterRole, to subjects **in that namespace only** |
| **ClusterRoleBinding** | Cluster | Grants a ClusterRole in **every** namespace and on cluster-scoped resources |

Subjects are users, groups or ServiceAccounts.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: shop
rules:
- apiGroups: [""]          # "" is the core group
  resources: ["pods", "pods/log"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: shop
subjects:
- kind: User
  name: dana@example.com
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl auth can-i list pods -n shop --as dana@example.com
```

Least privilege: prefer namespaced Roles, grant only the verbs needed, avoid wildcards (`*`), and keep `cluster-admin` for a few administrators. Default user-facing ClusterRoles: `cluster-admin`, `admin`, `edit`, `view`.

> **Exam trap.** A RoleBinding that references a ClusterRole grants its permissions **only in the binding's namespace**. To grant access in all namespaces, you need a ClusterRoleBinding.

<!-- section: service-accounts | objectives: 2.2.3 -->
## ServiceAccounts

A **ServiceAccount** is the identity of a workload, a namespaced API object (unlike human users). Every namespace gets a ServiceAccount named `default`, which has no permissions beyond API discovery; a Pod that names no ServiceAccount (`spec.serviceAccountName`) uses it.

| Topic | Behavior in v1.37 |
| --- | --- |
| Token delivery | The kubelet requests a **short-lived, audience-bound token** through the TokenRequest API and mounts it as a projected volume at `/var/run/secrets/kubernetes.io/serviceaccount/`; it rotates the token before expiry |
| Token lifetime | Bound to the Pod: invalid once the Pod is deleted |
| Long-lived Secret tokens | No longer created automatically since v1.24; can still be created by hand but are discouraged |
| Opting out | `automountServiceAccountToken: false` on the Pod or the ServiceAccount, for Pods that never call the API |
| Token for a script | `kubectl create token build-bot -n ci` |

Permissions come from RBAC bindings whose subject is `kind: ServiceAccount`. Give each application its own ServiceAccount with only the rights it needs, rather than extending `default`.

<!-- section: pod-security | objectives: 2.2.4 -->
## Pod Security Standards and securityContext

The **Pod Security Standards** define three cumulative profiles:

| Profile | Meaning |
| --- | --- |
| **Privileged** | Unrestricted; for trusted system workloads such as network plugins |
| **Baseline** | Blocks known privilege escalations (privileged containers, host namespaces, `hostPath` volumes...) while allowing a default Pod |
| **Restricted** | Current hardening practice: run as non-root, `allowPrivilegeEscalation: false`, drop `ALL` capabilities, seccomp `RuntimeDefault`, limited volume types |

**Pod Security Admission**, the built-in admission controller stable since v1.25, applies a profile per namespace through labels, in three modes:

| Mode | Violation result |
| --- | --- |
| `enforce` | Pod rejected |
| `audit` | Allowed, annotation in the audit log |
| `warn` | Allowed, warning returned to the user |

```bash
kubectl label namespace payments \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/warn=restricted
```

The **securityContext** sets these properties on a Pod or a container:

```yaml
securityContext:
  runAsNonRoot: true
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop: ["ALL"]
  seccompProfile:
    type: RuntimeDefault
```

> **Exam trap.** PodSecurityPolicy was removed in v1.25. Its replacement is Pod Security Admission (or a policy engine such as Kyverno or OPA Gatekeeper for finer rules), never PodSecurityPolicy.

<!-- section: secrets-protection | objectives: 2.2.5 -->
## Protecting Secrets

| Fact | Consequence |
| --- | --- |
| Secret values are **base64-encoded**, not encrypted | Anyone who reads the object reads the value |
| By default Secrets are stored **unencrypted in etcd** | Whoever accesses etcd or its backups reads every Secret |
| `list` and `watch` on Secrets return their contents | Granting `list` is as good as granting read on all Secrets of the namespace |
| Anyone who can create a Pod in a namespace can mount its Secrets | Pod creation rights are Secret read rights |

Protections:

1. **Encryption at rest**: an `EncryptionConfiguration` file passed to the kube-apiserver; the KMS v2 provider keeps the key in an external key management service.
2. **RBAC least privilege** on Secrets: few subjects, no `list` or `watch` when `get` on named Secrets is enough.
3. Mount Secrets only into the containers that need them; prefer files to environment variables, which leak into logs and crash dumps more easily.
4. Optionally keep secrets in an **external store** (a vault) and inject them with the Secrets Store CSI Driver or a similar tool.

<!-- section: supply-chain | objectives: 2.2.6 -->
## Image and supply chain security

| Control | Purpose | Tools |
| --- | --- | --- |
| **Vulnerability scanning** | Find known CVEs in image packages, in CI and in registries | Trivy and other scanners |
| **SBOM** (software bill of materials) | Know which components and versions an image contains | SPDX and CycloneDX formats |
| **Image signing and verification** | Prove who built an image and that it wasn't modified | Sigstore cosign, Notary Project |
| **Trusted registries and digests** | Only pull from approved registries, pin images by digest | Private registries, admission policies |
| **Policy enforcement at admission** | Reject non-compliant objects before they are stored | OPA Gatekeeper, Kyverno, ValidatingAdmissionPolicy |

**OPA Gatekeeper** brings Open Policy Agent to Kubernetes as a validating (and mutating) admission webhook; policies are written in the **Rego** language as constraint templates. **Kyverno** is a Kubernetes-native policy engine whose policies are written as **YAML** resources; it can validate, mutate, generate resources and verify image signatures. Kubernetes also has a built-in **ValidatingAdmissionPolicy** that uses CEL expressions, without a webhook.

> **Exam tip.** "Reject any image that isn't signed" or "only allow images from `registry.example.com`" is an admission policy (Kyverno, Gatekeeper). "Find CVEs in the image" is a scanner. "Block privileged Pods in a namespace" is Pod Security Admission.

<!-- section: key-points -->
## Key points

- API request: authentication (401), authorization (403), admission (mutating then validating), then storage.
- Role and RoleBinding are namespaced; ClusterRole and ClusterRoleBinding are cluster-wide; RBAC only allows.
- Pods authenticate with ServiceAccount tokens: short-lived, bound, mounted by the kubelet.
- Pod Security Standards: Privileged, Baseline, Restricted, applied per namespace by Pod Security Admission (enforce, audit, warn). PodSecurityPolicy is gone.
- Secrets: base64 is not encryption; enable encryption at rest and restrict access.
- Supply chain: scan, sign, verify, and enforce with admission policies (Kyverno, OPA Gatekeeper).
