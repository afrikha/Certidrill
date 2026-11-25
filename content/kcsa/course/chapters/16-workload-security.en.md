The innermost layers of the 4Cs are the application and the Pod that runs it. This chapter covers how code is developed safely, how a workload should receive its credentials and configuration, and how the Pod specification hardens the container at run time.

<!-- section: secure-development | objectives: 1.6.1 -->
## Secure development practices

Application code is the attack surface you control most directly. The practices the exam expects:

| Practice | What it finds | When |
| --- | --- | --- |
| **Dependency management** (software composition analysis) | Known vulnerabilities and license issues in third-party libraries; pinned versions and lock files keep builds reproducible | Every build, and continuously as new CVEs are published |
| **SAST**, static application security testing | Unsafe coding patterns in the source (injection, hard-coded credentials, unsafe deserialization) without running the code | In the editor and in the pipeline, before merge |
| **DAST**, dynamic application security testing | Vulnerabilities in the running application, by probing it from outside (SQL injection, cross-site scripting, cross-site request forgery), for example with OWASP ZAP | Against a test deployment |
| **Code review** | Logic flaws, missing authorization checks, risky changes; a security-aware review process with required approvals | Every change, through pull requests |
| **Secret scanning** | Credentials committed to the repository | Pre-commit hooks and pipeline |
| **Manifest and infrastructure-as-code scanning** (for example Trivy or Kubescape) | Insecure Kubernetes manifests: privileged containers, missing limits, root users | Before the manifests reach the cluster |
| **Threat modeling** | Design flaws, by identifying trust boundaries and data flows | At design time |

Also keep the service's attack surface small: expose only the ports it needs, encrypt traffic with TLS (mutual TLS between services where possible), and validate all input.

> **Exam trap.** SAST analyzes source code without running it; DAST tests the running application from outside. "Probe the deployed service for SQL injection" is DAST; "find hard-coded passwords in the repository" is SAST or secret scanning.

<!-- section: credentials-and-configuration | objectives: 1.6.2 -->
## Credentials and configuration for workloads

Configuration goes in **ConfigMaps**; anything confidential goes in **Secrets**, never in a ConfigMap, an image or a manifest committed to a repository. A Secret reaches a container in one of two ways:

| | Mounted as a volume | Environment variable |
| --- | --- | --- |
| Storage on the node | Kept in a `tmpfs` (memory), deleted when the Pod is deleted | In the container's process environment |
| Update when the Secret changes | Updated in the volume, eventually (not with `subPath` mounts) | Not updated: the container must restart |
| Exposure | Readable only through the file path, with file permissions | Inherited by child processes, easily dumped in logs, crash reports or debug output |
| Recommended for | Most secrets, certificates and keys | Applications that only read the environment, with care |

Good practices around Secrets:

- **Limit who can read them**: `get`, `list` and `watch` on Secrets are sensitive (`list` returns the contents), and anyone who can create a Pod in a namespace can mount and read any Secret of that namespace.
- **Mount a Secret only in the container that needs it**, not in every container of the Pod.
- **Protect values after reading**: don't log them or send them to untrusted parties.
- Mark Secrets that never change `immutable: true` to prevent accidental updates.
- Remember that base64 is not encryption: enable encryption at rest on the API server.

**External secret stores** keep the secret outside the cluster, in a dedicated secrets manager or a cloud key vault:

- The **Secrets Store CSI Driver** runs as a DaemonSet and lets the kubelet fetch secrets from an external store and mount them as a volume in authorized Pods.
- Operators such as the External Secrets Operator synchronize external secrets into Kubernetes Secrets.

The workload's identity to the Kubernetes API is its **ServiceAccount**. Create one ServiceAccount per workload instead of using `default`, grant it least-privilege RBAC, and set `automountServiceAccountToken: false` when the application doesn't call the API. When it does, the kubelet mounts a **projected, time-limited token** bound to the Pod, rotated automatically; long-lived Secret-based ServiceAccount tokens are no longer created automatically and should not be created by hand.

> **Exam trap.** Changing a Secret doesn't update the environment variables of running containers. If a question says the application still uses the old password after the Secret was updated, the Secret is consumed as an environment variable (or through a `subPath` mount).

<!-- section: workload-hardening | objectives: 1.6.3 -->
## Hardening with securityContext and resource limits

The `securityContext` exists at Pod level (applies to all containers) and at container level (overrides the Pod value for that container).

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-api
  namespace: payments
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payments-api
  template:
    metadata:
      labels:
        app: payments-api
    spec:
      serviceAccountName: payments-api
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: api
        image: registry.example.com/payments/api:3.2.0
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop: ["ALL"]
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
          limits:
            memory: 256Mi
```

| Field | Effect |
| --- | --- |
| `runAsNonRoot: true` | The kubelet refuses to start the container if it would run as UID 0 |
| `runAsUser`, `runAsGroup` | Run with a specific unprivileged user and group, overriding the image |
| `allowPrivilegeEscalation: false` | A process can't gain more privileges than its parent (blocks setuid binaries) |
| `readOnlyRootFilesystem: true` | The container can't modify its own filesystem; write to an `emptyDir` or volume where needed |
| `capabilities.drop: ["ALL"]` | Removes every Linux capability; add back only what is needed, such as `NET_BIND_SERVICE` |
| `privileged: false` | No access to host devices and no bypass of the other protections |
| `seccompProfile.type: RuntimeDefault` | Applies the runtime's default system call filter |

**Resource requests and limits** protect the node and the neighbors: a memory limit stops one compromised or buggy container from exhausting the node's memory, a CPU limit can cap cryptomining or runaway loops on sensitive workloads, and requests drive scheduling. A **LimitRange** sets default and maximum values per container in a namespace, and a **ResourceQuota** caps the total for the namespace.

Deploy into a namespace that enforces an appropriate Pod Security Standard: the **Restricted** profile requires `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, dropping `ALL` capabilities (only `NET_BIND_SERVICE` may be added back) and a `RuntimeDefault` or `Localhost` seccomp profile.

> **Exam trap.** `readOnlyRootFilesystem` is good practice but the Restricted Pod Security Standard doesn't require it. And `runAsNonRoot: true` doesn't choose a user: it only makes the kubelet refuse a container that would run as root.

<!-- section: key-points -->
## Key points

- Secure development: dependency scanning, SAST on source, DAST on the running application, code review, secret and manifest scanning, threat modeling.
- Confidential data in Secrets, not ConfigMaps or images; prefer volumes to environment variables; restrict Secret access; consider external stores (Secrets Store CSI Driver).
- One ServiceAccount per workload, `automountServiceAccountToken: false` unless the API is needed; projected, time-limited tokens.
- Harden containers with `runAsNonRoot`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem`, dropped capabilities and seccomp `RuntimeDefault`; set memory limits and requests.
