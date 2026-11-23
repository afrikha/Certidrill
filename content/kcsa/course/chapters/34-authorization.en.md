Once the API server knows who is calling, authorization decides whether that identity may perform the requested action: a verb on a resource, in a namespace or across the cluster. Kubernetes denies by default, so every permission must be granted, and in most clusters it is granted with RBAC. The exam checks the authorization modes, the four RBAC objects, the permissions that amount to privilege escalation, and how to verify what an identity can do.

<!-- section: authorization-modes | objectives: 3.4.1 -->
## Authorization modes of the API server

The API server is started with one or more modes, for example `--authorization-mode=Node,RBAC` (or a structured `--authorization-config` file, stable since v1.32). Modes are checked in the order listed: the first mode that **allows** or **denies** ends the evaluation; if every mode has no opinion, the request is denied with HTTP 403.

| Mode | What it does | Use |
| --- | --- | --- |
| **Node** | Grants each kubelet only what it needs for the Pods scheduled on its own node (their Secrets, ConfigMaps, volumes, its own Node object) | Always, with the **NodeRestriction** admission plugin, which stops a kubelet from modifying other nodes or Pods |
| **RBAC** | Permissions defined as Kubernetes objects (Roles and bindings) in the `rbac.authorization.k8s.io` API group, changed dynamically through the API | The standard mode for users and ServiceAccounts |
| **Webhook** | Synchronous HTTP callout to an external service, which answers a `SubjectAccessReview` | Central policy outside the cluster |
| **ABAC** | Attribute-based policies in a local file read by the API server | Legacy; changes need file edits on control plane nodes and a restart |
| **AlwaysAllow** | Allows every request | Testing only: with it, RBAC is irrelevant because RBAC has no deny rules |
| **AlwaysDeny** | Denies every request | Testing only |

> **Exam trap.** `--authorization-mode=AlwaysAllow,RBAC` behaves exactly like `AlwaysAllow`: RBAC never denies, it only allows or abstains. A cluster where every authenticated (or anonymous) caller can do anything usually has `AlwaysAllow` somewhere in its authorization configuration.

<!-- section: rbac-objects | objectives: 3.4.2 -->
## RBAC objects

RBAC has four objects: two define permissions, two grant them.

| Object | Scope | Purpose |
| --- | --- | --- |
| **Role** | One namespace | Set of rules valid inside that namespace |
| **ClusterRole** | Cluster | Rules for cluster-scoped resources (nodes, PersistentVolumes, namespaces), non-resource URLs (`/healthz`), or namespaced resources in all namespaces; also reusable in many namespaces |
| **RoleBinding** | One namespace | Grants a Role, **or a ClusterRole**, to subjects inside that namespace only |
| **ClusterRoleBinding** | Cluster | Grants a ClusterRole to subjects in every namespace and for cluster-scoped resources |

A **rule** lists `apiGroups` (`""` is the core group), `resources` (and subresources such as `pods/exec` or `pods/log`), optional `resourceNames`, and `verbs`: `get`, `list`, `watch`, `create`, `update`, `patch`, `delete`, `deletecollection`, plus special verbs such as `escalate`, `bind` and `impersonate`. **Subjects** are `User`, `Group` or `ServiceAccount`.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-operator
  namespace: shop
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "update", "patch"]
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: shop-operators
  namespace: shop
subjects:
- kind: Group
  name: shop-team
  apiGroup: rbac.authorization.k8s.io
- kind: ServiceAccount
  name: deployer
  namespace: ci
roleRef:
  kind: Role
  name: deployment-operator
  apiGroup: rbac.authorization.k8s.io
```

Rules to remember:

- RBAC is **purely additive**: there are no deny rules. Effective permissions are the union of every binding of the user and of all their groups.
- The `roleRef` of a binding is **immutable**: to point a binding at another role, delete and recreate it.
- A RoleBinding to a ClusterRole grants that ClusterRole's rules **only in the binding's namespace**: the usual way to reuse a standard role (such as `edit`) per namespace.
- Aggregated ClusterRoles (`aggregationRule`) are filled automatically from labelled ClusterRoles; that is how custom resources add rules to `admin`, `edit` and `view`.

> **Exam tip.** "Team A needs the same permissions in ten namespaces": one ClusterRole plus one RoleBinding per namespace. A ClusterRoleBinding would grant them in **all** namespaces.

<!-- section: rbac-least-privilege | objectives: 3.4.3 -->
## Least privilege with RBAC

The default user-facing ClusterRoles:

| ClusterRole | Grants | Watch out |
| --- | --- | --- |
| `cluster-admin` | Any action on any resource | Bound to the group `system:masters` by default |
| `admin` | Read/write on most namespaced resources, including Roles and RoleBindings in the namespace (when used in a RoleBinding) | Can grant access to others in the namespace |
| `edit` | Read/write on most namespaced objects, but not Roles or RoleBindings | Can read Secrets and run Pods as any ServiceAccount of the namespace, so it can gain any ServiceAccount's API access |
| `view` | Read-only on most namespaced objects | Excludes Secrets, Roles and RoleBindings |

Good practices from the Kubernetes RBAC guidance:

- Grant at namespace level with RoleBindings rather than ClusterRoleBindings.
- Avoid **wildcards** (`"*"`) in resources and verbs: they also grant every resource type and verb added later, including custom resources.
- Do not use `cluster-admin` for daily work, and never add users to `system:masters`: members bypass RBAC and cannot be revoked by removing bindings.
- Review bindings to broad groups (`system:authenticated`, `system:unauthenticated`).

Permissions that look harmless but allow escalation:

| Permission | Why it is sensitive |
| --- | --- |
| `get`, `list` or `watch` on `secrets` | `list` and `watch` return the full contents of every Secret in scope, not just names |
| `create` on `pods` (or Deployments, Jobs, CronJobs…) | The Pod can mount any Secret, use any ServiceAccount, and mount volumes of the namespace; with weak Pod security it can run privileged on the node |
| Access to the `pods/exec` subresource | Shell inside running containers, with their credentials and data |
| `escalate` on roles or clusterroles | Lets the user write roles with more permissions than they hold |
| `bind` on roles or clusterroles | Lets the user bind roles with permissions they do not hold |
| `impersonate` on users, groups or ServiceAccounts | Act as another identity, possibly a more privileged one |
| `create` on `serviceaccounts/token` | Issue tokens for existing ServiceAccounts |
| `create` on PersistentVolumes | Create hostPath volumes that expose the node filesystem |
| `get` on `nodes/proxy` | Direct access to the kubelet API, bypassing audit logging and admission |
| `update` on `certificatesigningrequests/approval` | Approve client certificates for arbitrary names |
| Control of validating or mutating webhook configurations | Read or change every admitted object |
| `patch` on namespaces | Change Pod Security Admission labels |

> **Exam trap.** RBAC normally prevents privilege escalation: you cannot create a Role or a binding that grants more than you already have. The exceptions are exactly the `escalate` and `bind` verbs, plus indirect paths such as `create pods` and `impersonate`. When an exam option grants one of these, it is the risky one.

<!-- section: checking-permissions | objectives: 3.4.4 -->
## Checking effective permissions

`kubectl auth can-i` sends a `SelfSubjectAccessReview` to the API server and works whatever the authorization mode:

```bash
kubectl auth can-i create deployments --namespace shop
kubectl auth can-i list secrets --namespace payments
kubectl auth can-i --list --namespace shop
kubectl auth can-i get pods --namespace shop --as alice
kubectl auth can-i get secrets --namespace shop --as bob --as-group shop-team
kubectl auth can-i create pods --namespace shop \
  --as system:serviceaccount:ci:deployer
```

```text
yes
no
```

- `--list` shows every action allowed in a namespace (through a `SelfSubjectRulesReview`).
- `--as` and `--as-group` use **impersonation**: the request is evaluated as that user or group. Your own identity needs the `impersonate` verb on users, groups or ServiceAccounts, which is why only administrators should hold it.
- A ServiceAccount is checked with its full username `system:serviceaccount:NAMESPACE:NAME`.
- Other components check a third party's access with a `SubjectAccessReview` (any user) or a `LocalSubjectAccessReview` (one namespace).
- `kubectl auth whoami` shows the username and groups the API server sees for your credentials.

> **Exam tip.** To prove a ServiceAccount has only what it needs, run `kubectl auth can-i --list --as system:serviceaccount:NAMESPACE:NAME -n NAMESPACE` and look for wildcards, `secrets`, `pods/exec`, `escalate`, `bind` and `impersonate`.

<!-- section: key-points -->
## Key points

- Modes: Node, RBAC, Webhook, ABAC, AlwaysAllow, AlwaysDeny; checked in order, first allow or deny wins, deny by default; `AlwaysAllow` cancels every other mode.
- Role and RoleBinding are namespaced; ClusterRole and ClusterRoleBinding are cluster-wide; a RoleBinding to a ClusterRole is limited to its namespace; `roleRef` is immutable; RBAC has no deny.
- Least privilege: namespace bindings, no wildcards, no `system:masters`, `view` excludes Secrets but `edit` does not.
- Escalation paths: reading Secrets, creating Pods or workloads, `pods/exec`, `escalate`, `bind`, `impersonate`, `serviceaccounts/token`, PV creation, `nodes/proxy`, CSR approval, webhook configurations, namespace labels.
- `kubectl auth can-i` (with `--list`, `--as`, `--as-group`) and `kubectl auth whoami` verify effective access.
