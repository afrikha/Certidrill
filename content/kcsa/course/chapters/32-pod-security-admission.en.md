Pod Security Admission (PSA) is the admission controller built into the Kubernetes API server that enforces the Pod Security Standards. You switch it on per namespace with labels, choose what happens on a violation (reject, audit or warn), and set cluster-wide defaults and exemptions in the API server's admission configuration. The exam tests the label syntax, the three modes, what replaced PodSecurityPolicy, and when a third-party policy engine is needed instead.

<!-- section: psa-controller | objectives: 3.2.1 -->
## The built-in Pod Security Admission controller

Every API request goes through **authentication**, then **authorization**, then **admission**. Pod Security Admission is a validating admission plugin named `PodSecurity`: it inspects Pods (and the Pod templates of workload resources) after RBAC has allowed the request, and accepts, rejects or annotates it according to the Pod Security Standards level set for the namespace. It is stable since Kubernetes v1.25 and enabled by default.

**Why it replaced PodSecurityPolicy.** PodSecurityPolicy (PSP) was deprecated in v1.21 and **removed in v1.25**. The Kubernetes project gave these reasons:

| PodSecurityPolicy problem | Pod Security Admission answer |
| --- | --- |
| Which policy applied to a Pod depended on the RBAC permissions of the user **or** of the Pod's ServiceAccount: confusing, easy to grant broader permissions than intended, hard to inspect | One level per namespace, visible in the namespace labels |
| Policies could mutate Pods (set defaults) for some fields only, in non-obvious ways | Validation only, never mutation |
| No dry-run or audit mode, so it could not be enabled safely on an existing cluster | `audit` and `warn` modes, and server-side dry-run of label changes |
| Custom policy language | The three predefined Pod Security Standards profiles |

> **Exam trap.** PodSecurityPolicy no longer exists in current Kubernetes: a `kind: PodSecurityPolicy` manifest is rejected because the API is gone. When a question asks for the built-in way to enforce Pod security in a current cluster, the answer is Pod Security Admission with namespace labels.

<!-- section: psa-labels | objectives: 3.2.2 -->
## Namespace labels: modes, levels and versions

A namespace opts in with labels of the form `pod-security.kubernetes.io/MODE: LEVEL`, where the level is `privileged`, `baseline` or `restricted`:

| Mode | On a violation | Applied to |
| --- | --- | --- |
| `enforce` | The Pod is **rejected** | Pods only |
| `audit` | Allowed; an audit annotation is added to the event in the **audit log** | Pods and workload resources |
| `warn` | Allowed; a **warning** is returned to the user (shown by `kubectl`) | Pods and workload resources |

A namespace can set any or all modes, with a different level for each. A common pattern enforces Baseline while auditing and warning at Restricted, to prepare the next step:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: payments
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/enforce-version: v1.37
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
```

**Version pinning.** The optional `pod-security.kubernetes.io/MODE-version` label takes a Kubernetes minor version (`v1.37`) or `latest` (the default). Pinning `enforce-version` keeps the rules of that release, so an upgrade that adds a control to a profile does not suddenly reject Pods; `latest` always applies the current definition.

**Workload resources.** `enforce` checks only the Pod objects. For a Deployment, Job or DaemonSet, `audit` and `warn` already check the Pod template when the workload is created, but `enforce` acts later, when the controller creates the Pods. A non-compliant Deployment is therefore accepted (with a warning), and its ReplicaSet then fails to create Pods.

Useful commands:

```bash
# Preview which existing Pods would violate a level, without changing anything
kubectl label --dry-run=server --overwrite ns --all \
  pod-security.kubernetes.io/enforce=baseline

# Start by auditing and warning everywhere
kubectl label --overwrite ns --all \
  pod-security.kubernetes.io/audit=baseline \
  pod-security.kubernetes.io/warn=baseline

# Enforce Restricted on one namespace, pinned to v1.37
kubectl label --overwrite ns payments \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=v1.37
```

Adding or changing an `enforce` label does not evict running Pods: it applies to new Pods (the server-side dry run lists existing violations).

> **Exam trap.** "The Deployment was created but no Pods appear" in a namespace with `enforce: restricted` is the classic PSA symptom: the Deployment is not rejected, its Pods are. Also, the user who can **patch the namespace** can change these labels and lower the level, so restrict `patch` and `update` on namespaces.

<!-- section: psa-configuration | objectives: 3.2.3 -->
## Defaults, exemptions and third-party policy engines

Cluster-wide behaviour is set in an `AdmissionConfiguration` file passed to the API server with `--admission-control-config-file`:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
- name: PodSecurity
  configuration:
    apiVersion: pod-security.admission.config.k8s.io/v1
    kind: PodSecurityConfiguration
    defaults:
      enforce: "baseline"
      enforce-version: "latest"
      audit: "restricted"
      audit-version: "latest"
      warn: "restricted"
      warn-version: "latest"
    exemptions:
      usernames: []
      runtimeClasses: []
      namespaces: ["kube-system"]
```

- **Defaults** apply to every namespace that has no label for that mode. Out of the box, all three defaults are `privileged`: a namespace without labels is not restricted at all.
- **Exemptions** skip all three modes for matching requests. The dimensions are `usernames` (the authenticated or impersonated requester), `runtimeClasses` (Pods using a given RuntimeClass) and `namespaces`.
- Exempting a **user** only helps when that user creates Pods directly: Pods from a Deployment are created by a controller's ServiceAccount. Do not exempt controller ServiceAccounts such as `system:serviceaccount:kube-system:replicaset-controller`: that would exempt everyone who can create a ReplicaSet or Deployment.
- Updates that change only metadata (except seccomp or AppArmor annotations), `activeDeadlineSeconds` or `tolerations` are not checked, so labelling a non-compliant running Pod still works.

**When PSA is not enough.** PSA is deliberately simple. Use a policy engine such as **Kyverno**, **OPA Gatekeeper** or Kubewarden, or the built-in **ValidatingAdmissionPolicy** (CEL expressions, stable since v1.30), when you need:

| Requirement | Why PSA cannot do it |
| --- | --- |
| A rule other than the three profiles (only images from `registry.example.com`, required labels, no `latest` tag) | PSA only knows the Pod Security Standards |
| A per-workload exception inside a namespace (one Pod may add `NET_ADMIN`) | PSA works per namespace, with exemptions only by user, RuntimeClass or namespace |
| Mutation, such as adding `runAsNonRoot` or a seccomp profile automatically | PSA never mutates (Kyverno and Gatekeeper can) |
| Policies on objects other than Pods (Services, Ingresses, RBAC) | PSA only evaluates Pods and Pod templates |
| An allowlist of host ports | Not supported by the built-in controller |

> **Exam tip.** Match the tool to the need: namespace-wide Privileged/Baseline/Restricted is PSA; custom or mutating rules are Kyverno or OPA Gatekeeper; detecting suspicious behaviour of running containers is Falco, which is runtime detection, not admission.

<!-- section: key-points -->
## Key points

- Pod Security Admission is the built-in validating admission controller (stable since v1.25) that replaced PodSecurityPolicy, removed in v1.25.
- Labels: `pod-security.kubernetes.io/MODE: LEVEL` with modes `enforce` (reject), `audit` (audit log annotation) and `warn` (user warning); levels `privileged`, `baseline`, `restricted`.
- `MODE-version` pins a Kubernetes minor version or `latest`; `enforce` applies to Pods only, `audit` and `warn` also to workload templates.
- The `AdmissionConfiguration` sets defaults (all `privileged` out of the box) and exemptions by username, RuntimeClass and namespace; never exempt controller ServiceAccounts.
- Use Kyverno, OPA Gatekeeper or ValidatingAdmissionPolicy for custom, per-workload, mutating or non-Pod policies.
