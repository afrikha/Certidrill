Security controls are classified by what they do (prevent, detect, correct), they follow a few general principles, and they are chosen with the help of published guidance. The exam asks you to classify a Kubernetes feature, to recognize a principle in a scenario, and to know which document or tool answers which need.

<!-- section: control-types | objectives: 1.3.1 -->
## Preventive, detective and corrective controls

| Type | Goal | Kubernetes examples |
| --- | --- | --- |
| **Preventive** | Stop the unwanted action before it happens | RBAC denying a verb; Pod Security Admission in `enforce` mode rejecting a privileged Pod; a validating admission policy or Kyverno or OPA Gatekeeper rejecting unsigned images; NetworkPolicy dropping traffic; encryption at rest; seccomp blocking a system call |
| **Detective** | Notice that something happened or is happening | Audit logs of the API server; Pod Security Admission in `audit` or `warn` mode; Falco alerting on a shell spawned in a container; image scanning of running images; kube-bench reporting a failed CIS check; metrics and log alerts |
| **Corrective** (responsive) | Limit the damage and restore a safe state | Deleting or isolating a compromised Pod with a quarantine NetworkPolicy; cordoning and draining a node, then replacing it; revoking a RoleBinding and rotating credentials, certificates and encryption keys; redeploying from a known-good image; restoring etcd from a backup |

The same tool can play several roles. A policy engine is preventive when it rejects objects at admission and detective when it only reports violations in audit mode. Pod Security Admission works the same way: `enforce` prevents, `audit` and `warn` only report.

Controls are combined: preventive controls are never perfect, so detective controls find what got through and corrective controls contain it. A cluster with RBAC and admission policies but no audit logs or runtime detection can't tell that it has been compromised.

> **Exam trap.** Falco is detective: it alerts on behavior at runtime but doesn't prevent a Pod from being created. A question that asks to "prevent" privileged Pods expects admission control (Pod Security Admission, a policy engine), not Falco.

<!-- section: security-principles | objectives: 1.3.2 -->
## Security principles

| Principle | Meaning | In Kubernetes |
| --- | --- | --- |
| **Least privilege** | Every identity gets only the permissions its task needs, for no longer than needed | Namespaced Roles instead of ClusterRoles, no wildcards, no `cluster-admin` for daily work; a ServiceAccount per workload and `automountServiceAccountToken: false` when the API isn't needed; dropped Linux capabilities; least-privilege cloud identities for nodes |
| **Defense in depth** | Several independent layers, so one failure doesn't expose everything | The 4Cs; RBAC plus admission plus NetworkPolicy plus runtime detection; a hardened node under a hardened container |
| **Zero trust** | No implicit trust based on network location: every request is authenticated and authorized, every connection encrypted | Every API client authenticated, even components; mutual TLS between services through a service mesh with workload identities (SPIFFE); default deny NetworkPolicy, then explicit allows |
| **Secure defaults** | The default configuration is the safe one; weakening it requires an explicit decision | Pod Security Admission labels on every namespace; a default deny NetworkPolicy in every namespace; `seccompDefault` on the kubelet; tools and charts that ship hardened settings |

Secure defaults matter because several Kubernetes defaults are **not** secure, and the exam likes them:

| Default behavior | Secure setting |
| --- | --- |
| Without a NetworkPolicy, every Pod can reach every other Pod | Default deny policies per namespace |
| Secrets are stored unencrypted (base64) in etcd | EncryptionConfiguration on the API server |
| A Pod without a seccomp profile runs `Unconfined` | `seccompProfile: RuntimeDefault`, or `seccompDefault` enabled on the kubelet |
| The API server accepts anonymous requests (`--anonymous-auth` defaults to true) | Anonymous access disabled or limited to health endpoints |
| `--authorization-mode` defaults to `AlwaysAllow` when nothing is configured | `Node,RBAC` |
| The kubelet allows unauthenticated access to its API unless configured | Anonymous authentication off, Webhook authorization |
| A ServiceAccount token is mounted in every Pod | `automountServiceAccountToken: false` where not needed |
| A namespace without Pod Security labels accepts privileged Pods | `enforce` label with Baseline or Restricted |

> **Exam tip.** "Explicitly verify every request, even from inside the cluster network" describes zero trust. "Give the CI ServiceAccount only `get` and `patch` on Deployments in one namespace" describes least privilege.

<!-- section: security-guidance | objectives: 1.3.3 -->
## Security guidance

You don't invent controls from scratch: published guidance tells you what to check and why.

| Guidance | Publisher | What it is | Typical use |
| --- | --- | --- | --- |
| **CIS Kubernetes Benchmark** | Center for Internet Security | Consensus-based secure configuration recommendations for the control plane, etcd, worker nodes and policies, each with an audit and a remediation; variants exist for managed services | Audit a cluster's configuration, automatically with **kube-bench** |
| **NIST SP 800-190**, Application Container Security Guide | US National Institute of Standards and Technology (2017) | Risks and countermeasures for images, registries, orchestrators, containers and host operating systems | Build a container security program; map controls for compliance |
| **CNCF Cloud Native Security Whitepaper** (v2, 2022) | CNCF TAG Security | Controls and practices for each lifecycle phase: Develop, Distribute, Deploy, Runtime | Design security across the whole lifecycle |
| **Kubernetes Security Checklist** | Kubernetes project | Baseline checklist for clusters: authentication and authorization, network security, Pod security, logs and auditing, Pod placement, Secrets, images, admission controllers | Review a cluster before production |
| **Application Security Checklist** | Kubernetes project | Checklist for application developers: ServiceAccounts, securityContext, RBAC, image security, NetworkPolicy, seccomp, AppArmor, SELinux, runtime classes | Review a workload before deploying it |
| **Threat modeling frameworks** (STRIDE, MITRE ATT&CK) | Microsoft (STRIDE), MITRE (ATT&CK) | Ways to enumerate threats and attacker techniques | Decide which controls matter most |

Guidance is a starting point, not a certificate of security: you choose the recommendations that match your risks, document the exceptions, and check continuously because configurations drift.

> **Exam trap.** The CIS Kubernetes Benchmark is a configuration benchmark, kube-bench is the tool that checks it, and neither scans images for vulnerabilities (that's Trivy or a registry scanner). NIST SP 800-190 is guidance, not a tool.

<!-- section: key-points -->
## Key points

- Preventive controls stop actions (RBAC, admission, NetworkPolicy, enforce mode); detective controls report them (audit logs, Falco, audit and warn modes, kube-bench); corrective controls contain and repair (isolate, rotate, replace, restore).
- Principles: least privilege, defense in depth, zero trust (authenticate and authorize every request, encrypt every connection), secure defaults.
- Many Kubernetes defaults are open: allow-all networking, unencrypted Secrets, Unconfined seccomp, anonymous API requests, mounted ServiceAccount tokens, namespaces without Pod Security labels.
- Guidance: CIS Kubernetes Benchmark (checked by kube-bench), NIST SP 800-190, the CNCF Cloud Native Security Whitepaper, the Kubernetes security and application security checklists.
