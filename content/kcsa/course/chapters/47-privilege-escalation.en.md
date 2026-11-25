Privilege escalation is the step where an attacker who holds a small foothold (a ServiceAccount token, a namespaced Role, a shell in one container) turns it into more power: cluster-admin rights, another workload's identity, or root on the node. The KCSA exam asks you to spot the RBAC permissions and Pod settings that open these paths, and to name the control that closes each one.

<!-- section: rbac-escalation | objectives: 4.7.1 -->
## Escalation through RBAC

RBAC itself prevents the obvious path: you **cannot create or update a Role or ClusterRole that grants permissions you do not already hold**, and you cannot create a RoleBinding or ClusterRoleBinding to a role whose permissions you do not hold. Escalation happens when a permission bypasses that rule, or grants power indirectly.

| Permission | Why it escalates |
| --- | --- |
| `escalate` on `roles` / `clusterroles` | Lifts the built-in check: the user can edit a role to add permissions they do not have |
| `bind` on `roles` / `clusterroles` | Lets the user bind a role with more rights than they hold, for example `cluster-admin`, to themselves |
| `impersonate` on `users`, `groups` or `serviceaccounts` | The user acts as another identity, with all its rights (`kubectl --as=...`) |
| `create` on `pods` or on workload resources (Deployments, Jobs, CronJobs...) | The Pod can run as **any ServiceAccount of the namespace** and mount any Secret, ConfigMap or PersistentVolumeClaim there; with a privileged Pod spec it can take over the node |
| `create` on `serviceaccounts/token` | Issues a TokenRequest for an existing, possibly more privileged, ServiceAccount |
| `create` on `certificatesigningrequests` + `update` on `certificatesigningrequests/approval` for the `kubernetes.io/kube-apiserver-client` signer | Issues a client certificate with any name, including names of system components |
| `get` on `nodes/proxy` | Not read-only: reaches the kubelet API, which can run commands in Pods, and **bypasses audit logging and admission control** |
| `create` on `persistentvolumes` | A `hostPath` PersistentVolume exposes the node file system; ordinary users should only create PersistentVolumeClaims |
| Write access to `mutatingwebhookconfigurations` / `validatingwebhookconfigurations` | The webhook receives (and a mutating webhook can modify) every admitted object |
| `patch` on `namespaces` | Changing namespace labels can weaken Pod Security Admission enforcement or open NetworkPolicy rules that select namespaces by label |
| `get`, `list` or `watch` on `secrets` | All three reveal Secret contents, including ServiceAccount tokens stored in Secrets |

Two more identity traps: membership in the **`system:masters`** group bypasses every RBAC check (and authorization webhooks) and cannot be revoked by deleting bindings, so no everyday user or certificate should carry it; and wildcard rules (`resources: ["*"]`, `verbs: ["*"]`) silently include `escalate`, `bind`, `impersonate` and any resource added later.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployer
  namespace: shop
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["create", "update", "patch"]
```

This Role looks narrow, but a user holding it can create a Deployment whose Pods use the most privileged ServiceAccount of `shop` and read its token from inside the container.

> **Exam trap.** "Can create Pods" is not a harmless permission. It implies access to every Secret and ServiceAccount of the namespace and, without Pod Security Admission, to the node. Questions describing a "read-only" or "deploy-only" user who reaches cluster-admin usually rely on Pod creation, `bind`, `escalate`, `impersonate` or `nodes/proxy`.

<!-- section: container-to-node | objectives: 4.7.2 -->
## Escalation from a container to its node

Containers share the node's kernel. Each of these Pod settings removes part of the isolation between the container and the host:

| Setting | Effect | Escalation path |
| --- | --- | --- |
| `securityContext.privileged: true` | The container gets **all Linux capabilities**, access to host devices, and runs `Unconfined` for seccomp, ignoring AppArmor and SELinux confinement | Mount the host disk, load kernel modules, escape to the node |
| `allowPrivilegeEscalation: true` (the **default** when unset) | `no_new_privs` is not set on the process | A process can gain more privileges than its parent, for example by executing a **setuid** binary such as `su` or a planted root-owned binary |
| `capabilities.add` with `SYS_ADMIN`, `NET_ADMIN`, `SYS_PTRACE`, `SYS_MODULE` | Grants root-level kernel powers | `SYS_ADMIN` is close to privileged mode; `SYS_PTRACE` with `hostPID` reads other processes' memory |
| `hostPID: true` | Shares the node's process namespace | See and signal every process on the node, read their environment and `/proc` entries |
| `hostIPC: true` | Shares the node's IPC namespace | Read shared memory of host processes |
| `hostNetwork: true` | Uses the node's network stack | Bind node ports, sniff node traffic, reach services listening on `localhost` of the node, bypass NetworkPolicies |
| `hostPath` volume, especially `/`, `/etc`, `/var/run` or the container runtime socket | Mounts a node path inside the container | Write to host files (cron, SSH keys), or control the runtime through its socket and start new privileged containers |
| `runAsUser: 0` / no `runAsNonRoot` | Root inside the container | Root is the same UID as root on the host when no user namespace is used, so any escape lands as host root |

Note that `allowPrivilegeEscalation: false` cannot be combined with `privileged: true` or with the `CAP_SYS_ADMIN` capability: the API rejects the combination as inconsistent.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug
  namespace: shop
spec:
  hostPID: true
  containers:
  - name: shell
    image: registry.example.com/tools/shell:1.4
    securityContext:
      privileged: true
```

A shell in this Pod can enter the node's namespaces (for example with `nsenter` against process 1) and act as root on the node, then read every Pod's Secrets and the kubelet's credentials stored there.

> **Exam trap.** `allowPrivilegeEscalation` does not control whether the container is privileged. It only sets `no_new_privs`, which blocks gaining privileges through setuid binaries and file capabilities. Privileged mode is the separate `privileged` field.

<!-- section: blocking-escalation | objectives: 4.7.3 -->
## Controls that block escalation

| Escalation path | Control |
| --- | --- |
| Privileged containers, host namespaces, `hostPath`, added capabilities | **Baseline** Pod Security Standard, enforced by Pod Security Admission (`pod-security.kubernetes.io/enforce: baseline`) |
| Root user, setuid binaries, broad capabilities, unconfined seccomp | **Restricted** Pod Security Standard: `allowPrivilegeEscalation: false`, `runAsNonRoot: true`, non-zero `runAsUser`, `capabilities.drop: ["ALL"]` (only `NET_BIND_SERVICE` may be added), `seccompProfile.type` `RuntimeDefault` or `Localhost`, a limited list of volume types |
| `escalate`, `bind`, `impersonate`, wildcards, Pod creation, Secret reading | **RBAC least privilege**: namespaced Roles, no wildcards, no `system:masters`, separate ServiceAccounts per workload, `automountServiceAccountToken: false` where the API is not needed, regular review of who can create Pods |
| A compromised node using its kubelet credentials to modify other nodes or Pods | **NodeRestriction** admission plugin (with the Node authorizer): a kubelet, authenticated as `system:node:<nodeName>` in `system:nodes`, can modify only its own Node object and Pods bound to it, and cannot set `node-restriction.kubernetes.io/` labels used to steer sensitive workloads to nodes |
| Container root becoming host root after an escape | **User namespaces** (`hostUsers: false`, stable since v1.36): root in the container maps to an unprivileged UID on the host, and capabilities are valid only inside the namespace |

A Pod that satisfies the Restricted standard:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web
  namespace: shop
spec:
  securityContext:
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: web
    image: registry.example.com/shop/web:2.3.1
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop: ["ALL"]
```

User namespaces cannot be combined with `hostNetwork`, `hostPID` or `hostIPC`. For Pods with `hostUsers: false`, Pod Security Admission does not check `runAsNonRoot` and `runAsUser` under Baseline and Restricted, because container root is never mapped to a privileged host user.

Detective controls complete these preventive ones: audit logs record RoleBinding changes, `impersonate` use and `pods/exec`, and a runtime tool such as Falco alerts on a shell spawned in a container or a setuid execution.

> **Exam tip.** Match the layer to the control: RBAC stops API-level escalation, Pod Security Admission stops dangerous Pod specs at admission, NodeRestriction limits a stolen kubelet credential, user namespaces limit the damage of a container escape. PodSecurityPolicy, which once played the admission role, was removed in v1.25.

<!-- section: key-points -->
## Key points

- RBAC blocks creating roles or bindings beyond your own rights, except through the `escalate` and `bind` verbs; `impersonate` borrows another identity.
- Creating Pods implies using any ServiceAccount and Secret of the namespace; `nodes/proxy`, `serviceaccounts/token`, CSR approval and `hostPath` PersistentVolumes are indirect escalation paths.
- `system:masters` bypasses RBAC entirely and cannot be revoked with bindings.
- Container to node: `privileged`, dangerous capabilities, `hostPID`/`hostIPC`/`hostNetwork`, `hostPath`, root user; `allowPrivilegeEscalation` defaults to true and governs setuid escalation through `no_new_privs`.
- Baseline blocks known escalations; Restricted adds non-root, no privilege escalation, drop ALL capabilities and seccomp.
- NodeRestriction confines each kubelet to its own Node and Pods; `hostUsers: false` maps container root to an unprivileged host user.
