The Pod Security Standards (PSS) are three policy levels, defined by the Kubernetes project, that describe how much a Pod may weaken its isolation from the node. They are only definitions: the built-in Pod Security Admission controller (chapter 3.2) or a third-party policy engine enforces them. The exam asks you to name the three profiles, to recognise which fields each one restricts, and to pick the right profile for a workload.

<!-- section: pss-profiles | objectives: 3.1.1 -->
## The three profiles

The profiles are cumulative, from most permissive to most restrictive:

| Profile | Purpose | Typical users |
| --- | --- | --- |
| **Privileged** | Entirely unrestricted, purposely open; allows known privilege escalations | System and infrastructure workloads managed by trusted administrators: CNI agents, storage drivers, node monitoring |
| **Baseline** | Minimally restrictive; prevents **known privilege escalations** while accepting a default Pod configuration | Ordinary, non-critical application workloads; the easy first step |
| **Restricted** | Heavily restricted; follows current Pod hardening best practices, at the cost of some compatibility | Security-critical applications and workloads of lower-trust users |

Restricted includes every Baseline control, and Baseline is a subset of what Privileged allows. The Restricted profile is versioned with Kubernetes: new controls (for example new safe sysctls or new host fields) can appear in a new minor version, which is why the admission controller lets you pin a version.

> **Exam trap.** The three profile names are exactly **Privileged**, **Baseline** and **Restricted**. "Default", "Hardened", "Strict" or "Unrestricted" are not profiles. Privileged is not "the default for application Pods": it is the absence of restrictions.

<!-- section: pss-baseline | objectives: 3.1.2 -->
## Controls of the Baseline profile

Baseline blocks the Pod settings that give a container direct access to the node. Each control lists the fields checked and the only values allowed:

| Control | Fields checked | Allowed |
| --- | --- | --- |
| Host namespaces | `hostNetwork`, `hostPID`, `hostIPC` | Unset or `false` |
| Privileged containers | `securityContext.privileged` | Unset or `false` |
| Capabilities | `capabilities.add` | Only `AUDIT_WRITE`, `CHOWN`, `DAC_OVERRIDE`, `FOWNER`, `FSETID`, `KILL`, `MKNOD`, `NET_BIND_SERVICE`, `SETFCAP`, `SETGID`, `SETPCAP`, `SETUID`, `SYS_CHROOT` (so no `SYS_ADMIN`, `NET_ADMIN`, `NET_RAW`) |
| HostPath volumes | `volumes[*].hostPath` | Forbidden |
| Host ports | `ports[*].hostPort` | Unset or `0` (the built-in controller does not support an allowlist) |
| Host probes and lifecycle hooks (v1.34+) | `host` field of `httpGet`/`tcpSocket` probes and hooks | Unset or empty |
| AppArmor | `appArmorProfile.type` | Unset, `RuntimeDefault`, `Localhost` (not `Unconfined`) |
| SELinux | `seLinuxOptions.type`, `user`, `role` | Type unset or a container type (`container_t`, `container_init_t`, `container_kvm_t`, `container_engine_t`); no custom user or role |
| `/proc` mount | `procMount` | `Default` (masked `/proc`) |
| Seccomp | `seccompProfile.type` | Unset, `RuntimeDefault`, `Localhost` (not `Unconfined`) |
| Sysctls | `securityContext.sysctls` | Only a "safe" namespaced subset, such as `net.ipv4.ip_unprivileged_port_start` |
| HostProcess (Windows) | `windowsOptions.hostProcess` | Unset or `false` |

Note what Baseline does **not** require: a Pod running as root, with privilege escalation allowed, with no seccomp profile set and with the runtime's default capabilities is still Baseline-compliant. That is why Baseline is described as preventing *known escalations* rather than enforcing hardening.

> **Exam tip.** If a manifest shows `hostNetwork: true`, `hostPID: true`, `privileged: true`, a `hostPath` volume, a `hostPort` or an added `SYS_ADMIN` capability, the Pod violates **Baseline** (and therefore Restricted too) and is allowed only by **Privileged**.

<!-- section: pss-restricted | objectives: 3.1.3 -->
## Additional controls of the Restricted profile

Restricted adds hardening requirements on top of Baseline. Unlike Baseline, several of them must be **explicitly set**: leaving the field empty fails.

| Control | Requirement |
| --- | --- |
| Volume types | Only `configMap`, `csi`, `downwardAPI`, `emptyDir`, `ephemeral`, `persistentVolumeClaim`, `projected`, `secret` |
| Privilege escalation | `allowPrivilegeEscalation: false` on every container |
| Running as non-root | `runAsNonRoot: true` (at Pod level or on every container) |
| Non-root user | `runAsUser` must not be `0` (unset is allowed) |
| Seccomp | Must be `RuntimeDefault` or `Localhost`; unset is **not** allowed (Pod level, or every container) |
| Capabilities | `drop` must include `ALL`; `add` may only contain `NET_BIND_SERVICE` |

The privilege escalation, seccomp and capabilities controls are Linux-only: they are not checked for Pods with `spec.os.name: windows`. A Pod that passes Restricted:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api
  namespace: payments
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: api
    image: registry.example.com/payments/api:2.3.0
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop: ["ALL"]
```

`readOnlyRootFilesystem: true` is a good practice, but it is **not** part of the Restricted profile.

> **Exam trap.** A Pod that sets nothing at all passes Baseline but fails Restricted, because Restricted requires `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, `drop: ["ALL"]` and a seccomp profile to be present. Also, a `hostPath`, `nfs` or other volume type outside the list fails Restricted even when Baseline would accept it (Baseline forbids only hostPath).

<!-- section: pss-choosing | objectives: 3.1.4 -->
## Choosing a profile

| Requirement | Profile |
| --- | --- |
| A CNI plugin, CSI node driver, log collector or node agent that needs host network, hostPath or privileged mode | **Privileged**, in a dedicated namespace (for example `kube-system` or `monitoring-agents`) with tight RBAC |
| A general application namespace, legacy images that run as root | **Baseline** |
| A namespace for payment, identity or other sensitive services | **Restricted** |
| A namespace where developers or tenants of limited trust deploy their own Pods | **Restricted** (Baseline at minimum) |
| An existing cluster with unknown workloads | Start with `audit` and `warn` at Baseline or Restricted, fix violations, then `enforce` |

Guidelines from the Kubernetes documentation:

- There is deliberately no standard profile between Privileged and Baseline: privileges needed above Baseline are application-specific, so such policies are defined case by case (often with a policy engine) rather than by granting Privileged to a whole namespace.
- Workloads in **sandboxed runtimes** (gVisor, Kata Containers) are better isolated from the host kernel, so some restrictions matter less; but there is no standard definition of "sandboxed" and no single recommended profile for them.
- Profiles apply per **namespace** with the built-in controller, so separate workloads that need Privileged from those that do not.

> **Exam trap.** Granting Privileged to an application namespace because one Pod needs one extra capability is the wrong answer. Move that workload to its own namespace, or use a policy engine for a targeted exception, and keep Baseline or Restricted everywhere else.

<!-- section: key-points -->
## Key points

- Three cumulative profiles: Privileged (unrestricted), Baseline (blocks known escalations), Restricted (hardening best practices).
- Baseline forbids host namespaces, privileged containers, extra capabilities beyond a default list, hostPath, host ports, unconfined AppArmor or seccomp, custom SELinux user or role, unmasked `/proc` and unsafe sysctls.
- Restricted adds: limited volume types, `allowPrivilegeEscalation: false`, `runAsNonRoot: true`, non-zero `runAsUser`, seccomp `RuntimeDefault` or `Localhost`, drop `ALL` with only `NET_BIND_SERVICE` added back.
- Restricted fields must be set explicitly; an empty Pod spec fails Restricted.
- Use Privileged only for trusted system workloads in their own namespace; Baseline for ordinary apps; Restricted for sensitive or low-trust workloads.
