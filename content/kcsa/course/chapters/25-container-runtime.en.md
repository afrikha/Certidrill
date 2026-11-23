The container runtime is the software on each node that pulls images and turns a Pod spec into running, isolated processes. It sits directly on the host kernel, so whoever controls it controls the node. The exam asks you to place the runtimes in their layers (CRI, high-level runtime, OCI runtime), to recognize the danger of exposing the runtime socket to a container, and to know how sandboxed runtimes are selected with a RuntimeClass.

<!-- section: runtime-layers | objectives: 2.5.1 -->
## CRI, high-level runtimes and OCI runtimes

Running a container on a Kubernetes node involves three layers:

| Layer | What it is | Examples |
| --- | --- | --- |
| **Container Runtime Interface (CRI)** | The gRPC API between the kubelet and the runtime; the kubelet is the **client**. Kubernetes v1.26 and later require the `v1` CRI API, otherwise the node does not register | The kubelet setting `--container-runtime-endpoint` (or `containerRuntimeEndpoint` in the configuration file) points to the runtime's socket |
| **High-level runtime** (CRI implementation) | Implements the CRI: pulls and stores images, manages Pod sandboxes, networking setup through CNI, and container lifecycle | **containerd**, **CRI-O** (both CNCF projects; CRI-O is built specifically for Kubernetes) |
| **Low-level OCI runtime** | Implements the Open Container Initiative runtime specification: actually creates the container process with Linux namespaces, cgroups, capabilities, seccomp and LSM profiles | **runc** (the reference implementation), crun; sandboxed alternatives **runsc** (gVisor) and the Kata Containers runtime |

Default CRI sockets on Linux:

| Runtime | Socket |
| --- | --- |
| containerd | `/run/containerd/containerd.sock` |
| CRI-O | `/var/run/crio/crio.sock` |
| Docker Engine through cri-dockerd | `/run/cri-dockerd.sock` |

**Dockershim**, the built-in adapter that let the kubelet drive Docker Engine directly, was **removed in Kubernetes v1.24**. Docker Engine can still be used only through the external `cri-dockerd` adapter. Images built with Docker are OCI images and run unchanged on containerd or CRI-O.

Security responsibilities of the runtime layer:

- Keep containerd or CRI-O and runc **patched**: runtime vulnerabilities (for example in runc) can lead to container escape onto the host.
- The kubelet and the runtime must use the **same cgroup driver** (`systemd` is recommended with cgroup v2), so that resource limits, a defense against denial of service, are enforced.
- The runtime applies the default seccomp profile (`RuntimeDefault`) and AppArmor or SELinux profiles that the Pod requests: its configuration is part of the node's security baseline.

> **Exam trap.** "Which component does the kubelet talk to over the CRI?" is containerd or CRI-O, not runc. runc is called **by** the high-level runtime and does not implement the CRI. And dockershim is not a supported option in v1.37: it was removed in v1.24.

<!-- section: runtime-socket | objectives: 2.5.2 -->
## The risk of mounting the runtime socket

The runtime socket is a privileged API: anything that can write to it can ask the runtime to create, start, stop and exec into containers on that node. Mounting it into a container with a `hostPath` volume hands that power to the container:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: build-agent
  namespace: ci
spec:
  containers:
  - name: agent
    image: registry.example.com/ci/agent:1.4
    volumeMounts:
    - name: runtime-sock
      mountPath: /run/containerd/containerd.sock
  volumes:
  - name: runtime-sock
    hostPath:
      path: /run/containerd/containerd.sock
      type: Socket
```

With this mount, a compromised `agent` container can:

- start a new **privileged** container that mounts the host's root filesystem, and so take full control of the node (container escape);
- exec into, stop or read the filesystem of every other container on the node, including their mounted Secrets and ServiceAccount tokens;
- read the kubelet's credentials on the host and attack the rest of the cluster.

Containers created directly through the socket **bypass the Kubernetes API**: no authentication, no RBAC, no admission control, no Pod Security Admission and no API audit log record. That makes the attack both powerful and hard to see.

The Kubernetes documentation warns that a `hostPath` volume can expose privileged APIs "such as the container runtime socket" that can be used for container escape. Controls:

| Control | How it helps |
| --- | --- |
| Pod Security Standards **Baseline** or **Restricted** | Forbid `hostPath` volumes, so the socket cannot be mounted |
| Admission policy (ValidatingAdmissionPolicy, OPA Gatekeeper, Kyverno) | Deny specific host paths such as runtime sockets where `hostPath` must stay allowed |
| Image builds without the runtime | Use daemonless or rootless image builders in CI instead of "Docker-in-Docker" through the host socket |
| Runtime detection (Falco) | Alert when a container opens a runtime socket or a new privileged container appears |
| Node file permissions | The socket is owned by root; never relax its permissions |

> **Exam tip.** "A CI Pod mounts `/var/run/docker.sock` or `/run/containerd/containerd.sock`: what is the risk?" The answer is root access to the node (container escape) that bypasses the API server's controls, not just "information disclosure".

<!-- section: sandboxed-runtimes | objectives: 2.5.3 -->
## Sandboxed runtimes and RuntimeClass

Standard containers share the **host kernel**: one kernel vulnerability can break every container on the node. Sandboxed runtimes add a boundary between the workload and the host kernel:

| Runtime | How it isolates | Trade-off |
| --- | --- | --- |
| **runc** (default) | Linux namespaces, cgroups, capabilities, seccomp, AppArmor or SELinux on the shared host kernel | Fastest, full compatibility, weakest isolation |
| **gVisor** (`runsc`) | An application kernel running in user space (the Sentry) intercepts and answers the container's system calls, so few calls reach the host kernel | Smaller host kernel attack surface; overhead on system-call-heavy workloads; not every system call is supported |
| **Kata Containers** | Each Pod runs inside a lightweight virtual machine with its own guest kernel, using hardware virtualization | VM-level isolation; more memory and start-up overhead; needs virtualization support on the node |

A **RuntimeClass** (`node.k8s.io/v1`, cluster-scoped, stable since v1.20) maps a name to a runtime **handler** configured in containerd or CRI-O on the nodes. A Pod selects it with `spec.runtimeClassName`:

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc
scheduling:
  nodeSelector:
    sandbox.example.com/gvisor: "true"
---
apiVersion: v1
kind: Pod
metadata:
  name: untrusted-job
  namespace: tenants
spec:
  runtimeClassName: gvisor
  containers:
  - name: job
    image: registry.example.com/tenants/job:2.0
```

- `handler` must match a runtime configured on the node (for containerd, a `runtimes` entry in `/etc/containerd/config.toml`; for CRI-O, a `crio.runtime.runtimes` entry).
- `scheduling.nodeSelector` and `scheduling.tolerations` send the Pods only to nodes where that handler is installed.
- `overhead` declares the extra CPU and memory each Pod costs (useful for VM-based runtimes), so scheduling and quotas count it.
- A Pod with no `runtimeClassName` uses the node's default handler (normally runc). If the named RuntimeClass does not exist or the runtime cannot run the handler, the Pod ends in the `Failed` phase.

Restrict create, update and delete on RuntimeClass objects to cluster administrators, and enforce `runtimeClassName` for untrusted namespaces with an admission policy: the field is set by whoever writes the Pod.

> **Exam trap.** A RuntimeClass selects **how** containers are run (the runtime handler), not where images come from and not which seccomp profile is used. "Run untrusted tenant code with a stronger kernel boundary without a separate cluster" points to gVisor or Kata Containers through a RuntimeClass.

<!-- section: key-points -->
## Key points

- kubelet → CRI (gRPC, v1) → containerd or CRI-O → OCI runtime (runc) → container process.
- Dockershim was removed in v1.24; Docker Engine needs cri-dockerd.
- Patch the runtime and runc; align the cgroup driver with the kubelet.
- Mounting the runtime socket gives root on the node and bypasses RBAC, admission and API audit.
- Baseline and Restricted forbid `hostPath`; admission policies and Falco add defense.
- gVisor: user-space application kernel intercepting system calls. Kata Containers: lightweight VM per Pod.
- RuntimeClass: cluster-scoped, `handler`, optional `scheduling` and `overhead`; Pods use `spec.runtimeClassName`.
