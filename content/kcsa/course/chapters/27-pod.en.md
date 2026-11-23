The Pod is where Kubernetes security settings meet the Linux kernel. A few fields in its spec decide whether a container runs as root, whether it can gain privileges, whether it shares the node's namespaces, and whether it carries a credential for the API server. The exam shows short Pod manifests and asks you to spot the risky field or to pick the setting that closes a gap.

<!-- section: security-context | objectives: 2.7.1 -->
## Pod and container securityContext

`securityContext` exists at two levels. Settings in `spec.securityContext` (Pod level) apply to every container; settings in `spec.containers[*].securityContext` (container level) apply to one container and **override** the Pod level where both are set. Some fields exist only at one level: `fsGroup` is Pod level; `privileged`, `capabilities`, `readOnlyRootFilesystem` and `allowPrivilegeEscalation` are container level.

| Field | Level | What it does | Secure value |
| --- | --- | --- | --- |
| `runAsUser`, `runAsGroup` | Pod or container | UID and primary GID of the container processes; `runAsGroup` defaults to root (0) when omitted | A non-zero UID and GID |
| `runAsNonRoot` | Pod or container | The kubelet refuses to start a container whose effective user is UID 0 | `true` |
| `readOnlyRootFilesystem` | Container | Mounts the container's root filesystem read-only, so an attacker cannot drop tools or modify binaries | `true`, with `emptyDir` volumes for paths that must be writable |
| `allowPrivilegeEscalation` | Container | Controls the `no_new_privs` flag: whether a process can gain more privileges than its parent (setuid binaries) | `false` |
| `capabilities.drop`, `capabilities.add` | Container | Removes or adds Linux capabilities (written without the `CAP_` prefix) | Drop `ALL`, add back only what is needed, typically `NET_BIND_SERVICE` |
| `seccompProfile.type` | Pod or container | System-call filter: `RuntimeDefault`, `Localhost` (a profile file on the node) or `Unconfined` | `RuntimeDefault` or `Localhost` |
| `appArmorProfile`, `seLinuxOptions` | Pod or container | Linux security module profiles (AppArmor stable since v1.31) | The runtime default profile or a custom one |

A hardened container:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api
  namespace: shop
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    runAsGroup: 10001
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: api
    image: registry.example.com/shop/api:3.2
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop: ["ALL"]
    volumeMounts:
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: tmp
    emptyDir: {}
```

Points the exam likes:

- `allowPrivilegeEscalation` defaults to `true`. It cannot be set to `false` together with `privileged: true` or the `SYS_ADMIN` capability, which always allow escalation.
- `runAsNonRoot: true` is a check, not a user switch: if the image runs as root and no `runAsUser` is set, the container fails to start.
- A container without a `seccompProfile` runs `Unconfined` unless the kubelet's `seccompDefault` option is enabled on the node.
- `spec.hostUsers: false` (user namespaces, stable since v1.36) runs the Pod in a **user namespace**: root inside the container maps to an unprivileged user on the host.

> **Exam trap.** `readOnlyRootFilesystem` does not make volumes read-only, and `runAsNonRoot` does not choose a UID. To "prevent a process from gaining root through a setuid binary", the answer is `allowPrivilegeEscalation: false`, not `runAsNonRoot`.

<!-- section: risky-settings | objectives: 2.7.2 -->
## Risky Pod settings

These settings weaken or remove the container boundary. The Pod Security Standards **Baseline** profile forbids all of them:

| Setting | Risk |
| --- | --- |
| `securityContext.privileged: true` | The container gets all capabilities and access to the host's devices, with most confinement (seccomp, AppArmor) lifted: effectively root on the node |
| `hostNetwork: true` | The Pod uses the node's network namespace: it can bind to node ports, see node interfaces and traffic, reach services listening on the node's localhost, and is usually not selected by NetworkPolicy rules |
| `hostPID: true` | The Pod sees every process on the node and, with enough privileges, can signal or trace them and read their environment |
| `hostIPC: true` | The Pod shares the node's System V IPC and shared memory, so it can read or tamper with other processes' shared memory |
| `hostPath` volume | Mounts a node file or directory: can expose kubelet credentials, the container runtime socket or `/etc`; a writable mount allows tampering with the node |
| `ports[*].hostPort` | Binds a port on the node's IP, bypassing Services; limits scheduling and can intercept or expose traffic on the node address |
| Added capabilities such as `SYS_ADMIN`, `NET_ADMIN`, `SYS_PTRACE` | Kernel-level powers that enable container escape or network tampering |

```yaml
spec:
  hostPID: true
  containers:
  - name: debug
    image: registry.example.com/tools/debug:1.0
    securityContext:
      privileged: true
    volumeMounts:
    - name: host-root
      mountPath: /host
  volumes:
  - name: host-root
    hostPath:
      path: /
```

This Pod is a node takeover kit: privileged, sharing the host PID namespace, with the host's root filesystem mounted. Anyone who can create it in a namespace without Pod Security Admission or an equivalent policy owns the node. That is why the right to **create Pods** is a privilege escalation path, and why namespaces running ordinary workloads should enforce **Baseline** at least, or **Restricted**.

Legitimate exceptions exist (CNI agents, kube-proxy, log collectors, node monitoring): run them in dedicated namespaces labeled with the **Privileged** profile and restricted with RBAC.

> **Exam tip.** Match the field to the shared namespace: `hostNetwork` = network, `hostPID` = processes, `hostIPC` = inter-process communication and shared memory. `hostPath` is a volume, not a namespace setting.

<!-- section: pod-service-account | objectives: 2.7.3 -->
## The Pod's ServiceAccount and its token

Every Pod runs as a **ServiceAccount**: the one named in `spec.serviceAccountName`, or the namespace's `default` ServiceAccount. By default the kubelet mounts an API credential into the Pod as a **projected volume** at `/var/run/secrets/kubernetes.io/serviceaccount/` (`token`, `ca.crt`, `namespace`).

Since v1.22 that token is obtained through the **TokenRequest** API:

| Property | Projected (bound) token | Legacy Secret-based token |
| --- | --- | --- |
| Lifetime | Time-limited (`expirationSeconds` defaults to 1 hour, minimum 10 minutes) | Never expires |
| Rotation | The kubelet requests a new token when the current one is older than 80 % of its lifetime or older than 24 hours | None |
| Binding | Bound to the Pod: deleting the Pod invalidates it | Valid until the Secret is deleted |
| Audience | Set per projection (`audience`), defaults to the API server | No audience claim |
| Created | Automatically for each Pod | No longer generated automatically since v1.24; only if someone creates the Secret |

Reduce the credential to what the workload needs:

- **No API access needed** (most applications): set `automountServiceAccountToken: false`, on the ServiceAccount (all its Pods) or on the Pod. If both are set, the **Pod spec wins**.
- **API access needed**: a dedicated ServiceAccount per workload, bound to a minimal Role. The `default` ServiceAccount gets no permissions beyond API discovery, and should stay that way.
- **Token for an external system** (a secret store, a registry): a `serviceAccountToken` projection with that system's `audience` and a short `expirationSeconds`.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: web
  namespace: shop
automountServiceAccountToken: false
```

> **Exam trap.** Disabling automount does not remove the ServiceAccount: the Pod still runs as it, and RBAC on it still matters if a token is created another way. And a bound token stolen from a running Pod remains usable until it expires or the Pod is deleted, which is why short lifetimes and least-privilege roles matter.

<!-- section: key-points -->
## Key points

- Container-level `securityContext` overrides Pod level; `fsGroup` is Pod level, `privileged` and `capabilities` container level.
- Hardened container: `runAsNonRoot: true`, non-zero `runAsUser`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, drop `ALL`, seccomp `RuntimeDefault`.
- `allowPrivilegeEscalation` defaults to `true` and cannot be `false` with `privileged` or `SYS_ADMIN`.
- Risky: `privileged`, `hostNetwork`, `hostPID`, `hostIPC`, `hostPath`, `hostPort`, added capabilities; Baseline forbids them.
- Creating Pods is an escalation path when no Pod security policy is enforced.
- ServiceAccount tokens are projected, time-limited (1 hour default), rotated by the kubelet and bound to the Pod.
- `automountServiceAccountToken: false` on ServiceAccount or Pod; the Pod value wins.
