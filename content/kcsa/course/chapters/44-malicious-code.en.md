Most cluster compromises start with an application: a vulnerable web framework, a deserialization bug, a malicious dependency or image. The attacker then runs code with the identity and privileges of that container. What they can do next, stay inside the container, steal its credentials, or escape to the node, depends almost entirely on how the Pod was configured. The exam asks you to recognise how a compromised container is used, the configurations that open an escape path, and the controls that close them.

<!-- section: compromised-container | objectives: 4.4.1 -->
## How attackers use a compromised container

**Getting code execution.** The usual entry points are a remote code execution (RCE) vulnerability in the application or one of its dependencies, an exposed debug or admin endpoint, or a malicious image (MITRE ATT&CK: Malicious Image, T1204.003). An attacker with Kubernetes credentials can also run code directly with `kubectl exec` (Container Administration Command, T1609) or by creating a Pod (Deploy Container, T1610).

**What happens next:**

| Activity | Example | What makes it possible |
| --- | --- | --- |
| **Running tools** | Downloading `curl`, a scanner or a reverse shell into the container | A writable filesystem, a shell and package manager in the image, unrestricted egress |
| **Discovery** | Listing Pods and Secrets with the mounted token, scanning the Pod network (Container and Resource Discovery, T1613) | An automounted ServiceAccount token with broad RBAC, no NetworkPolicy |
| **Credential theft** | Reading the ServiceAccount token, environment variables, cloud credentials from the instance metadata service | Token automount, secrets in environment variables, metadata endpoint reachable |
| **Resource abuse** | **Cryptomining** (Resource Hijacking, T1496), sending spam or joining a botnet | No CPU limits, unrestricted egress |
| **Lateral movement and escape** | Attacking other Pods, the kubelet, or the node kernel | Flat network, privileged settings (next section) |

Cryptomining is the most common payload after a container compromise: it needs nothing but CPU and outbound network access. Signs are sustained CPU at the limit, connections to mining pools, and unknown processes.

> **Exam tip.** The container's **ServiceAccount token** is the bridge from "code execution in one Pod" to "access to the cluster API". If the workload does not call the API, set `automountServiceAccountToken: false`, and give the ServiceAccount no more RBAC than it needs.

<!-- section: container-escape | objectives: 4.4.2 -->
## Container escape paths

A container is a set of processes isolated by Linux namespaces, cgroups and security profiles, sharing the **host kernel**. An escape (ATT&CK: Escape to Host, T1611) breaks out of that isolation to act on the node, where the attacker can read the Secrets of every Pod on it, use the kubelet's credentials, and reach other nodes.

| Escape path | Why it works | Pod Security Standards level that blocks it |
| --- | --- | --- |
| `privileged: true` | The container gets access to all host devices and almost no isolation: mounting the host disk is enough to escape | Baseline |
| `hostPath` mount of a sensitive path (`/`, `/etc`, `/var/lib/kubelet`, `/root`) | Direct read and write access to the node's filesystem: SSH keys, kubelet credentials, static Pod manifests | Baseline (no `hostPath` at all) |
| **Container runtime socket** mounted (for example `/run/containerd/containerd.sock`) | Whoever talks to the runtime can start a new privileged container on the node | Baseline (it is a `hostPath`) |
| **Host namespaces**: `hostPID`, `hostNetwork`, `hostIPC` | See and signal host processes, sniff or reach node-local services, share host IPC | Baseline |
| **Excessive capabilities**, such as `SYS_ADMIN`, `SYS_PTRACE`, `SYS_MODULE`, `NET_ADMIN` | Root-equivalent powers on parts of the kernel: mounting filesystems, loading kernel modules, tracing processes | Baseline (only a short allow list may be added); Restricted requires dropping `ALL` |
| **Kernel vulnerabilities** | All containers share the host kernel, so a kernel exploit from inside a container compromises the node | Not blocked by a level: reduce the attack surface with seccomp, patch nodes, or use a sandboxed runtime |
| Running as **root** with privilege escalation allowed | Root in the container is root on the host if isolation fails, and `setuid` binaries can raise privileges | Restricted (`runAsNonRoot`, `allowPrivilegeEscalation: false`) |

```yaml
# A Pod spec an attacker hopes to be allowed to create
spec:
  hostPID: true
  containers:
  - name: tools
    image: registry.example.com/tools:1.0
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

> **Exam trap.** A container is **not** a security boundary equal to a virtual machine. Running as root inside a container is dangerous because the kernel is shared: user namespaces (`hostUsers: false`) map container root to an unprivileged host user, and sandboxed runtimes give each Pod its own kernel layer.

> **Exam tip.** Anyone allowed to **create Pods** in a namespace without Pod Security enforcement can create the Pod above. That is why `create pods` is treated as a potential path to node access.

<!-- section: container-mitigations | objectives: 4.4.3 -->
## Mitigations

Defense in depth combines settings that make code execution less useful, and settings that make escape harder:

| Control | Field or tool | Effect |
| --- | --- | --- |
| **Read-only root filesystem** | `securityContext.readOnlyRootFilesystem: true` | The attacker cannot drop tools or modify binaries; use `emptyDir` for the few paths that need writes |
| **Non-root user** | `runAsNonRoot: true`, `runAsUser` non-zero | Exploits run without root inside the container |
| **No privilege escalation** | `allowPrivilegeEscalation: false` | Blocks `setuid` binaries and similar from raising privileges |
| **Dropped capabilities** | `capabilities.drop: ["ALL"]`, add back only what is needed (often only `NET_BIND_SERVICE`) | Removes kernel powers the application never uses |
| **seccomp** | `seccompProfile.type: RuntimeDefault` (or `Localhost`) | Filters system calls, shrinking the kernel attack surface |
| **AppArmor or SELinux** | `appArmorProfile`, `seLinuxOptions` | Mandatory access control: limits files, mounts and operations even for root |
| **User namespaces** | `hostUsers: false` | Container root is not root on the node |
| **Sandboxed runtime** | gVisor or Kata Containers selected with a `RuntimeClass` (`runtimeClassName`) | An extra kernel boundary between the workload and the host kernel, for untrusted code |
| **Enforcement** | Pod Security Admission with `enforce: restricted` (or `baseline`) | Rejects Pods that do not meet the level |
| **Detection** | Falco, minimal images without shells | Alerts on shells, unexpected processes, writes and outbound connections; less tooling for the attacker |

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api
  namespace: payments
spec:
  automountServiceAccountToken: false
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: api
    image: registry.example.com/payments/api@sha256:4f2a9c0e8b7d6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f
    securityContext:
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
      capabilities:
        drop: ["ALL"]
    resources:
      limits:
        cpu: 500m
        memory: 256Mi
```

> **Exam trap.** Admission controls (Pod Security Admission, Kyverno, OPA Gatekeeper) act **before** the Pod runs; they cannot see an exploit happening inside a running container. Runtime detection (Falco) acts **while** it runs. A question about alerting when a shell starts in a production container expects runtime detection.

<!-- section: key-points -->
## Key points

- A compromised container gives the attacker its filesystem, network, ServiceAccount token and CPU: expect tools, discovery, credential theft and cryptomining.
- Escape paths: `privileged: true`, sensitive `hostPath` mounts, the runtime socket, host namespaces, extra capabilities, root with privilege escalation, and kernel vulnerabilities.
- The Baseline level blocks privileged containers, `hostPath`, host namespaces and most added capabilities; Restricted also requires non-root, no privilege escalation, dropping `ALL` and a seccomp profile.
- Harden with a read-only root filesystem, non-root users, dropped capabilities, seccomp, AppArmor or SELinux, user namespaces, and sandboxed runtimes through RuntimeClass.
- Prevent at admission, detect at runtime with Falco.
