Admission control is the last gate before an object is stored in etcd. After a request is **authenticated** and **authorized**, admission controllers can modify it or reject it based on its content: a Pod that runs privileged, an image from an unknown registry, a Deployment without an owner label. The KCSA exam expects you to know the two phases, the important built-in plugins, webhooks and ValidatingAdmissionPolicy, the policy engines, and the risks of webhooks themselves.

<!-- section: admission-phases | objectives: 5.7.1 -->
## Admission controllers and built-in plugins

The API server handles a write request in this order:

```text
authentication -> authorization -> mutating admission -> schema validation -> validating admission -> persisted to etcd
```

- **Mutating** controllers run first and may change the object (add defaults, inject a sidecar, set a field).
- **Validating** controllers run after all mutations and may only accept or reject. A policy that must see the final object belongs here.
- If any controller rejects the request, it fails immediately with an error.
- Admission applies to **create, update, delete** and some connect operations (such as `pods/exec`). It **cannot block** `get`, `list` or `watch`: read access is controlled by RBAC alone.

Admission plugins are compiled into the API server and enabled with `--enable-admission-plugins`. In v1.37 the default set includes `NamespaceLifecycle`, `LimitRanger`, `ServiceAccount`, `PodSecurity`, `ResourceQuota`, `Priority`, `RuntimeClass`, `DefaultStorageClass`, `CertificateApproval`, `CertificateSigning`, `CertificateSubjectRestriction`, `MutatingAdmissionWebhook`, `ValidatingAdmissionWebhook`, `ValidatingAdmissionPolicy` and `MutatingAdmissionPolicy`, among others. Security-relevant plugins:

| Plugin | Phase | Security role | Default |
| --- | --- | --- | --- |
| `PodSecurity` | Validating | Enforces the Pod Security Standards per namespace (enforce, audit, warn labels) | Enabled |
| `NodeRestriction` | Validating | Limits each kubelet to its own Node object and the Pods bound to it | Not in the default list; enabled by kubeadm and most distributions |
| `AlwaysPullImages` | Mutating and validating | Forces `imagePullPolicy: Always` so cached private images cannot be used without credentials | Disabled |
| `ServiceAccount` | Mutating and validating | Assigns the default ServiceAccount and mounts its projected token | Enabled |
| `LimitRanger`, `ResourceQuota` | Mutating / validating | Apply LimitRange defaults and enforce quotas, limiting resource exhaustion | Enabled |
| `CertificateSubjectRestriction` | Validating | Rejects CSRs for `kubernetes.io/kube-apiserver-client` that request the `system:masters` group | Enabled |
| `EventRateLimit` | Validating | Limits event floods against the API server | Disabled |
| `ImagePolicyWebhook` | Validating | Sends `ImageReview` requests to an external back end that allows or denies images | Disabled |
| `MutatingAdmissionWebhook`, `ValidatingAdmissionWebhook` | Mutating / validating | Call external webhooks | Enabled |

> **Exam trap.** PodSecurityPolicy was removed in v1.25; its replacement is the `PodSecurity` admission plugin (Pod Security Admission), stable since v1.25 and enabled by default. And admission never runs on reads: blocking `kubectl get secrets` is an RBAC job.

<!-- section: dynamic-admission | objectives: 5.7.2 -->
## Webhooks and ValidatingAdmissionPolicy

**Dynamic admission control** adds policies without recompiling the API server:

| Mechanism | How it works | Runs |
| --- | --- | --- |
| `MutatingWebhookConfiguration` | The API server sends an `AdmissionReview` over HTTPS to a webhook service, which returns allowed or denied plus an optional JSON patch | In the mutating phase |
| `ValidatingWebhookConfiguration` | Same, but the webhook can only allow or deny | In the validating phase, in parallel |
| `ValidatingAdmissionPolicy` (stable since v1.30) | **CEL** expressions evaluated **inside the API server**; no external service | In the validating phase |
| `MutatingAdmissionPolicy` (stable since v1.36) | CEL-based mutations inside the API server | In the mutating phase |

Webhook configurations select requests with `rules` (API groups, resources, operations), `namespaceSelector`, `objectSelector` and CEL `matchConditions`. The `clientConfig` points to a Service or an `https://` URL, and `caBundle` holds the CA used to verify the webhook's serving certificate.

A ValidatingAdmissionPolicy needs two objects: the **policy** (match constraints and CEL `validations`) and a **ValidatingAdmissionPolicyBinding** that scopes it and sets `validationActions`: `Deny`, `Warn` or `Audit` (`Deny` and `Warn` cannot be combined). An optional parameter resource supplies values.

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: approved-registry
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["pods"]
  validations:
  - expression: "object.spec.containers.all(c, c.image.startsWith('registry.example.com/'))"
    message: "Images must come from registry.example.com"
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: approved-registry-prod
spec:
  policyName: approved-registry
  validationActions: [Deny]
  matchResources:
    namespaceSelector:
      matchLabels:
        environment: prod
```

> **Exam tip.** "Validate objects with CEL without running an external webhook service" → ValidatingAdmissionPolicy. It removes the network hop, the webhook's TLS certificate and the availability risk of an external service.

<!-- section: policy-engines | objectives: 5.7.3 -->
## Policy engines: OPA Gatekeeper and Kyverno

Policy engines run as admission webhooks and let teams manage policies as code, versioned in Git, tested, and applied the same way in every cluster.

| | OPA Gatekeeper | Kyverno |
| --- | --- | --- |
| Policy language | **Rego** (Open Policy Agent, CNCF graduated) | **YAML** and **CEL**, as Kubernetes resources |
| Building blocks | `ConstraintTemplate` (Rego logic and parameter schema, which creates a constraint kind) + **Constraint** (where it applies and with which parameters) | Policies with validate, mutate, generate and image verification rules; newer CEL-based kinds such as `ValidatingPolicy` and `ImageValidatingPolicy` |
| Enforcement modes | `enforcementAction`: `deny` (default), `dryrun`, `warn` | Enforce or audit |
| Existing resources | **Audit** reports violations by objects already in the cluster | Background scans and policy reports |
| Extras | Mutation, external data | Generate resources (for example a default NetworkPolicy per new namespace), verify image signatures and attestations, clean up resources |

Typical policies the exam mentions:

| Policy | Purpose |
| --- | --- |
| Allowed registries | Images must come from `registry.example.com/` |
| Required labels | Every Namespace or Deployment has an `owner` or `cost-center` label |
| securityContext rules | `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, no `privileged`, no `hostPath` |
| No `:latest` tag, digest required | Reproducible deployments |
| Signed images only | cosign signature from the CI identity (Kyverno image verification) |
| Resource limits required | Protection against resource exhaustion |

Built-in Pod Security Admission covers only the three Pod Security Standards. Use a policy engine or ValidatingAdmissionPolicy for organization-specific rules (registries, labels, signatures) or for objects other than Pods.

> **Exam trap.** Gatekeeper and Kyverno are **preventive** controls at admission time; they do not watch running processes. Detecting a shell inside a running container is Falco's job. Rego is Gatekeeper's language; Kyverno policies need no Rego.

<!-- section: webhook-risks | objectives: 5.7.4 -->
## Availability and security risks of admission webhooks

A webhook sits in the API server's write path, so it is both a **single point of failure** and a **high-value target**.

| Setting | Effect when the webhook fails or times out |
| --- | --- |
| `failurePolicy: Fail` (the **default** in `admissionregistration.k8s.io/v1`) | The request is **rejected**: fail closed. Secure, but an unavailable webhook blocks matching changes, possibly including the webhook's own Pods |
| `failurePolicy: Ignore` | The request is **allowed** without the check: fail open. The cluster keeps working, but an attacker who makes the webhook unavailable (for example by deleting its Pods or flooding it) bypasses the policy |
| `timeoutSeconds` | Default **10 seconds**, allowed 1 to 30; when exceeded, `failurePolicy` decides. Keep it short |

Good practices:

- Use `Fail` for security policies, and make the webhook highly available: several replicas, a PodDisruptionBudget, resource requests.
- Exclude critical namespaces such as `kube-system` and the webhook's own namespace with `namespaceSelector`, to avoid a deadlock where the webhook cannot start because its own Pods are blocked.
- Do not rely on `objectSelector` for security: users who control the object's labels can opt out.
- Serve the webhook over TLS with a certificate trusted through `caBundle`; restrict its network exposure to the API server.
- **Protect the configuration objects**: anyone who can edit a `ValidatingWebhookConfiguration` or `MutatingWebhookConfiguration` can disable the policy, and a webhook receives every object it matches (including Secrets if selected), while a mutating webhook can modify them. Grant write access to these objects only to cluster administrators, and audit changes.
- Protect the webhook workload itself: its namespace, ServiceAccount and image are part of the trusted computing base.

> **Exam trap.** `failurePolicy: Ignore` is not a safe default for a security webhook: it fails open. The default is `Fail`, which favors security over availability, so the webhook needs high availability and namespace exclusions.

<!-- section: key-points -->
## Key points

- Order: authentication, authorization, mutating admission, schema validation, validating admission, etcd; admission never sees reads.
- Key plugins: `PodSecurity`, `NodeRestriction`, `AlwaysPullImages`, `ServiceAccount`, `LimitRanger`, `ResourceQuota`, `CertificateSubjectRestriction`; PodSecurityPolicy is removed.
- Dynamic admission: mutating and validating webhooks (HTTPS, `caBundle`), ValidatingAdmissionPolicy with CEL (stable v1.30) and its binding with `Deny`, `Warn`, `Audit`; MutatingAdmissionPolicy stable since v1.36.
- Gatekeeper: Rego, ConstraintTemplate plus Constraint, audit; Kyverno: YAML and CEL, validate, mutate, generate, verify images.
- `failurePolicy`: `Fail` (default, fail closed) or `Ignore` (fail open); `timeoutSeconds` default 10, range 1 to 30.
- Protect webhooks: high availability, exclude `kube-system`, TLS, and restrict who can edit webhook configurations.
