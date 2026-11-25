**Persistence** is the attacker's goal of keeping access to a cluster after the first foothold is closed: the vulnerable Pod is patched, the stolen password is changed, the node is rebooted. Kubernetes offers many ways to make something come back automatically, and attackers reuse exactly those mechanisms. The exam asks you to recognise workload-based and credential-based persistence, and the controls that prevent or detect them.

<!-- section: workload-persistence | objectives: 4.2.1 -->
## Persistence through workloads and cluster objects

Each technique below abuses a legitimate feature that keeps something running or re-creates it:

| Technique | How it persists | Why it is hard to remove |
| --- | --- | --- |
| **Backdoored image** | The attacker pushes a modified image to the organisation's registry, under an existing tag (MITRE ATT&CK: Implant Internal Image, T1525) | Every new Pod that pulls the tag runs the backdoor, even after the original intrusion is cleaned up |
| **Static Pod** | A manifest dropped in the kubelet's `staticPodPath` (often `/etc/kubernetes/manifests`) on a compromised node | The kubelet runs it without the API server; deleting its mirror Pod with `kubectl` does not stop it, and the kubelet recreates the mirror |
| **DaemonSet** | A malicious DaemonSet, often named like a system add-on in `kube-system` | One Pod on every node, including nodes added later |
| **CronJob** | A scheduled Job (ATT&CK: Container Orchestration Job, T1053.007) | Runs again on schedule, even if each Pod is killed |
| **Deployment or controller** | A workload with replicas | The controller recreates deleted Pods |
| **Malicious admission webhook** | A `MutatingWebhookConfiguration` pointing to the attacker's service | Injects a container, an environment variable or a privileged setting into **every new Pod**, and sees every object admitted |
| **Modified node services** | Changed kubelet configuration or runtime service on the host (ATT&CK: Container Service, T1543.005) | Survives Pod deletion; only node rebuild removes it |

Static Pods deserve attention. The kubelet watches every file not starting with a dot in its static Pod directory and runs the Pods they describe, bound to that node. The API server shows a **mirror Pod**, named with the node's hostname as a suffix, but cannot control it. A static Pod spec cannot reference ServiceAccounts, ConfigMaps or Secrets, so attackers typically use `hostPath` or host namespaces instead.

> **Exam trap.** Deleting a suspicious Pod is not remediation when something re-creates it. Find the owner first: a ReplicaSet, DaemonSet or Job (check `ownerReferences`), a static Pod manifest on the node, or a mutating webhook that injects the payload into every Pod.

> **Exam tip.** "A container appears in every new Pod of the cluster although nobody changed the Deployments" points to a **mutating admission webhook**. Write access to `mutatingwebhookconfigurations` is as sensitive as `cluster-admin`.

<!-- section: credential-persistence | objectives: 4.2.2 -->
## Credential-based persistence

The quieter way to persist is to keep **valid credentials** (ATT&CK: Valid Accounts, Account Manipulation). The attacker does not need a running Pod: they come back through the API server like any user.

| Credential | Why it persists | Remediation |
| --- | --- | --- |
| **Long-lived ServiceAccount token Secret** (type `kubernetes.io/service-account-token`) | These tokens do not expire and do not rotate. Since v1.24 Kubernetes no longer creates them automatically, but anyone allowed to create Secrets for a ServiceAccount can still create one | Delete the Secret; prefer bound tokens from the TokenRequest API, which expire and are tied to a Pod |
| **Token from `serviceaccounts/token`** | Anyone with `create` on this subresource can issue tokens for existing ServiceAccounts | Restrict the permission; short expiry limits the window |
| **Client certificate** | Kubernetes v1.37 does **not support certificate revocation**: an issued certificate stays valid until it expires. Anyone who can create and approve CertificateSigningRequests with the `kubernetes.io/kube-apiserver-client` signer can mint certificates with any name | Remove the RBAC bindings of that identity (unless it is in `system:masters`), restrict CSR approval, rotate the CA in the worst case |
| **Added RoleBinding or ClusterRoleBinding** | Grants a role, often `cluster-admin`, to an attacker-controlled user, group or ServiceAccount (ATT&CK: Additional Container Cluster Roles, T1098.006) | Review bindings; audit their creation |
| **Static token file** | Tokens in `--token-auth-file` last indefinitely and the list cannot change without restarting the API server | Do not use static token authentication |

```bash
# Find bindings that grant cluster-admin
kubectl get clusterrolebindings -o wide | grep cluster-admin
# Find long-lived ServiceAccount token Secrets
kubectl get secrets -A --field-selector type=kubernetes.io/service-account-token
```

The group `system:masters` is special: its members bypass all RBAC checks, and the access cannot be revoked by removing RoleBindings or ClusterRoleBindings. A client certificate whose organization is `system:masters` is therefore a persistent superuser credential until it expires.

> **Exam trap.** Rotating a user's password in the identity provider does not invalidate a **client certificate** or a **long-lived token Secret** they created. Look for credentials that do not depend on the original login: certificates, token Secrets and new bindings.

<!-- section: persistence-controls | objectives: 4.2.3 -->
## Preventing and detecting persistence

| Control | Type | What it stops or reveals |
| --- | --- | --- |
| **Audit log review** | Detective | Creation of ClusterRoleBindings, webhook configurations, DaemonSets in `kube-system`, CronJobs, token Secrets, approved CSRs, `serviceaccounts/token` requests |
| **Least-privilege RBAC** | Preventive | Removes the rights that persistence needs: `create` on webhook configurations, `bind`, `escalate`, CSR approval, Secret creation in sensitive namespaces |
| **Trusted images** | Preventive | Pin images by **digest**, verify **signatures** (Sigstore cosign) and allow only approved registries with an admission policy (Kyverno, OPA Gatekeeper, ValidatingAdmissionPolicy) |
| **Immutable containers** | Preventive | `readOnlyRootFilesystem: true` stops an attacker from writing tools into the container; changes are made by rebuilding and redeploying images, never by patching running containers |
| **Runtime detection** | Detective | Falco alerts on unexpected shells, writes to binary directories, new processes, or file changes in the static Pod directory |
| **Node hardening** | Preventive | Restricted node access, immutable node images, file integrity monitoring of kubelet configuration and `staticPodPath` |
| **Short-lived credentials** | Preventive | Bound ServiceAccount tokens, short certificate lifetimes, OIDC instead of static tokens |
| **Rebuild rather than clean** | Corrective | Replacing a compromised node from a known-good image removes host-level persistence that cleaning might miss |

Detection works best with a baseline: knowing which DaemonSets, webhooks and cluster-wide bindings should exist makes a new one stand out. GitOps tools that reconcile the cluster with a reviewed repository also expose objects that exist in the cluster but not in Git.

> **Exam trap.** Admission policies check objects sent to the **API server**. A static Pod started by a kubelet from a local file is not created through the API, so node access controls and runtime detection are what catch it.

<!-- section: key-points -->
## Key points

- Workload persistence: backdoored images, static Pods, DaemonSets, CronJobs, controllers that recreate Pods, mutating admission webhooks, modified node services.
- Static Pods run from the kubelet's manifest directory; deleting the mirror Pod with `kubectl` does not stop them.
- Credential persistence: long-lived ServiceAccount token Secrets, tokens issued through `serviceaccounts/token`, client certificates (no revocation in Kubernetes), new RoleBindings, `system:masters`.
- Prevent with least-privilege RBAC, short-lived credentials, signed and digest-pinned images from approved registries, read-only root filesystems.
- Detect with audit log review against a known baseline and runtime detection such as Falco; rebuild compromised nodes.
