A container is a process isolated by the Linux kernel and started from an image. Kubernetes doesn't run containers itself: it asks a container runtime to do it through a standard interface. The exam asks what separates a container from a virtual machine, how images are named, built and pulled, which runtime does what, and how a Pod can ask for a more isolated runtime.

<!-- section: containers-vms | objectives: 1.4.1 -->
## Containers and virtual machines

| | Virtual machine | Container |
| --- | --- | --- |
| Isolation | A hypervisor emulates hardware; each VM runs its own kernel | Processes share the **host kernel**, isolated by kernel features |
| Contents | A full operating system plus the app | The app and its dependencies only |
| Size and start time | Gigabytes, tens of seconds or more | Megabytes, usually under a second |
| Density | Fewer per host | Many per host |
| Isolation strength | Strong | Weaker: a kernel flaw can affect every container |

Two Linux features make a container:

| Feature | Provides | Examples |
| --- | --- | --- |
| **Namespaces** | What a process can **see** | `pid` (own process tree), `net` (own network stack and IP), `mnt` (own file system view), `uts` (own hostname), `ipc`, `user` (own user IDs), `cgroup` |
| **Control groups (cgroups)** | What a process can **use** | CPU, memory, I/O and process-count limits; Kubernetes requests and limits are applied through cgroups |

Kubernetes uses cgroup v2 (stable since v1.25). cgroup v1 is deprecated since v1.35, and by default the kubelet no longer starts on a cgroup v1 node.

> **Exam trap.** Namespaces isolate what a container sees; cgroups limit what it consumes. A "memory limit" is a cgroup, not a namespace.

<!-- section: images | objectives: 1.4.2 -->
## Images, registries and pull policies

An **image** is a read-only stack of **layers**, each one the file changes of a build step, plus a configuration (entrypoint, environment, user). Layers are shared between images and cached on nodes. A **registry** stores and distributes images, for example Docker Hub, `registry.k8s.io` or a private registry.

```text
registry.example.com:5000/shop/web:1.4.2@sha256:9f2b...e1

registry:    registry.example.com:5000
repository:  shop/web
tag:         1.4.2
digest:      sha256:9f2b...e1
```

| Reference | Meaning |
| --- | --- |
| No registry | The runtime's default registry, Docker Hub unless configured otherwise |
| **Tag** (`:1.4.2`) | A human-friendly, **mutable** name; no tag means `:latest` |
| **Digest** (`@sha256:...`) | The hash of the content: **immutable**; if both are given, only the digest is used |

`imagePullPolicy` decides when the kubelet pulls:

| Value | Behavior | Default when the field is omitted and the image has |
| --- | --- | --- |
| `Always` | Ask the runtime to pull at every container start (cached layers are reused) | The `:latest` tag, or no tag |
| `IfNotPresent` | Pull only if the image isn't on the node | Any other tag, or a digest |
| `Never` | Never pull; fail if the image is missing | — |

Private registries need credentials: a Secret of type `kubernetes.io/dockerconfigjson` referenced in `imagePullSecrets`, in the Pod's namespace.

The **Open Container Initiative** (OCI), a Linux Foundation project, publishes three specifications: the **image** spec (image format), the **runtime** spec (how to run a container from an unpacked image) and the **distribution** spec (registry API). Any OCI image runs on any OCI runtime.

> **Exam tip.** For reproducible deployments, use a precise tag or a digest, never `latest`: the same manifest could start a different image tomorrow.

<!-- section: building-images | objectives: 1.4.3 -->
## Building images

A **Dockerfile** (also called Containerfile) lists the build steps. Tools such as Docker (BuildKit), Podman and Buildah build it into an OCI image, then push it to a registry.

```text
# Build stage: full toolchain
FROM golang:1.25 AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -o /app ./cmd/web

# Final stage: only the binary
FROM gcr.io/distroless/static
COPY --from=build /app /app
USER 65532
ENTRYPOINT ["/app"]
```

| Practice | Why |
| --- | --- |
| **Multi-stage build** (`FROM ... AS build`, `COPY --from=build`) | Compilers and sources stay in the build stage; the final image holds only what runs |
| **Small base image** (distroless, Alpine, `scratch`) | Fewer packages: smaller downloads, faster starts, fewer vulnerabilities to patch |
| Order instructions from least to most frequently changed | Unchanged layers come from the build cache |
| Run as a non-root `USER` | Limits the damage if the app is compromised |
| One main process per container | Simple logs, health checks and restarts |

<!-- section: runtimes-cri | objectives: 1.4.4 -->
## Container runtimes and the CRI

The kubelet talks to the runtime through the **Container Runtime Interface** (CRI), a gRPC API; Kubernetes v1.37 requires a runtime that implements CRI v1. Runtimes work at two levels:

| Level | Role | Examples |
| --- | --- | --- |
| **High-level (CRI) runtime** | Receives kubelet requests, pulls and stores images, manages container lifecycle and Pod sandboxes | **containerd** (CNCF graduated), **CRI-O** (built for Kubernetes) |
| **Low-level (OCI) runtime** | Creates the container process with namespaces and cgroups, following the OCI runtime spec | **runc** (the reference implementation), crun |

**dockershim**, the built-in adapter that let the kubelet drive Docker Engine, was removed in Kubernetes v1.24. Images built with Docker still run everywhere, because they are OCI images. Docker Engine can still serve as a node runtime only through the external `cri-dockerd` adapter.

> **Exam trap.** "Kubernetes no longer supports Docker" is wrong in its common reading: Docker-built images work unchanged. Only the in-tree dockershim was removed; containerd or CRI-O run the containers.

<!-- section: sandboxed-runtimes | objectives: 1.4.5 -->
## Sandboxed runtimes and RuntimeClass

Ordinary containers share the host kernel. For untrusted or multi-tenant code, **sandboxed runtimes** add a layer between the container and the host kernel, at some cost in performance:

| Runtime | Approach |
| --- | --- |
| **gVisor** (`runsc`) | An application kernel written in Go that runs in user space and handles the container's system calls, so they don't reach the host kernel directly |
| **Kata Containers** | Each Pod runs in a lightweight virtual machine with its own kernel, using hardware virtualization, while keeping the container workflow |

A **RuntimeClass** (cluster-scoped, `node.k8s.io/v1`, stable since v1.20) names a runtime configuration through its `handler`, which must match a handler configured in the node's CRI runtime. A Pod selects it with `runtimeClassName`; without it, the node's default runtime is used. If the named RuntimeClass doesn't exist or the handler can't run, the Pod fails.

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: sandboxed
handler: runsc
---
apiVersion: v1
kind: Pod
metadata:
  name: untrusted-job
spec:
  runtimeClassName: sandboxed
  containers:
  - name: job
    image: registry.example.com/tools/scan:2.1
```

The optional `scheduling` field of a RuntimeClass (node selector and tolerations) sends its Pods to the nodes that have that runtime, and `overhead` accounts for the extra resources the sandbox uses.

<!-- section: key-points -->
## Key points

- Containers share the host kernel; VMs each run their own. Namespaces isolate the view, cgroups limit consumption.
- Image = layers + configuration. Tags are mutable, digests immutable. `:latest` or no tag means `imagePullPolicy: Always` by default.
- OCI defines image, runtime and distribution specs.
- Multi-stage builds and small base images give smaller, safer images.
- kubelet → CRI → containerd or CRI-O → runc. dockershim was removed in v1.24; Docker-built images still run.
- gVisor (user-space kernel) and Kata Containers (lightweight VMs) are selected per Pod with RuntimeClass.
