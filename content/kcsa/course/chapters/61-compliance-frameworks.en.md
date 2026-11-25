Compliance is the part of security that someone else checks: a regulator, an auditor, a payment card brand or a customer. Kubernetes is not "compliant" by itself; a cluster and the workloads on it become part of the scope of a framework, and the operator must show which controls meet each requirement. The exam asks you to recognise the main frameworks and what they protect, to tell the CIS Kubernetes Benchmark from NIST SP 800-190, and to explain how evidence is collected continuously rather than once a year.

<!-- section: regulations | objectives: 6.1.1 -->
## Regulations and compliance frameworks

A **regulation** is law (non-compliance means fines or legal action); a **standard** or **framework** is a set of requirements that an organisation adopts, often because customers or contracts demand it. Both state *what* must be achieved (protect cardholder data, log access, control identities), rarely *how* to configure Kubernetes. The operator translates each requirement into technical controls.

| Framework | Kind | Applies to | What it focuses on |
| --- | --- | --- | --- |
| **PCI DSS** (Payment Card Industry Data Security Standard) | Industry standard of the PCI Security Standards Council | Any organisation that stores, processes or transmits payment card data | Twelve requirements: network security controls, secure configurations, protecting stored account data, encrypting transmission, malware protection, secure software, need-to-know access, user identification and authentication, physical access, logging and monitoring, regular testing, security policy |
| **HIPAA** (Health Insurance Portability and Accountability Act) | United States law | Healthcare providers, insurers and their business associates handling protected health information (PHI) | Security Rule safeguards: administrative, physical and technical (access control, audit controls, integrity, authentication, transmission security) |
| **GDPR** (General Data Protection Regulation) | European Union regulation | Any organisation processing personal data of people in the EU, wherever it is located | Lawful processing, data subject rights, "appropriate technical and organisational measures" such as encryption and pseudonymisation, breach notification to the authority within 72 hours |
| **SOC 2** | Attestation report by an independent auditor, based on the AICPA Trust Services Criteria | Service organisations, typically SaaS providers, that want to prove their controls to customers | Security, availability, processing integrity, confidentiality and privacy; a Type I report assesses control design at a point in time, a Type II report assesses operating effectiveness over a period |
| **ISO/IEC 27001** | International standard, certifiable | Any organisation | An information security management system (ISMS): risk assessment, a set of reference controls (Annex A) and continual improvement |

Why these frameworks matter in a cluster:

- **Scope reduction.** Workloads that handle regulated data (a `payments` namespace handling card data) bring every component they touch into scope: nodes, the network path, the CI/CD pipeline, the registry. Isolating them on dedicated nodes or a dedicated cluster, with NetworkPolicy around them, keeps the rest of the platform out of scope.
- **Shared responsibility.** With a managed Kubernetes service, the provider's own certifications (for example its SOC 2 report or ISO/IEC 27001 certificate) cover the control plane it runs; the customer remains responsible for workloads, RBAC, network policies and data.
- **Data residency.** GDPR and sectoral rules can constrain where data and backups (including etcd snapshots that contain Secrets) are stored.

> **Exam trap.** A framework does not prescribe Kubernetes settings. PCI DSS says "restrict access by need to know"; RBAC least privilege is *your* implementation of it. Configuration-level guidance for Kubernetes comes from the CIS Kubernetes Benchmark, not from PCI DSS, HIPAA or GDPR.

<!-- section: cis-and-nist | objectives: 6.1.2 -->
## CIS Kubernetes Benchmark and NIST SP 800-190

These two documents are security guidance, not regulations, and they work at different levels.

**CIS Kubernetes Benchmark.** Published by the Center for Internet Security and developed through a community consensus process, it is a list of **configuration recommendations** for the Kubernetes components themselves. Each recommendation has a rationale, an audit procedure (how to check it) and a remediation. Recommendations are grouped by component:

| Area | Examples of what is checked |
| --- | --- |
| Control plane node configuration files | Ownership and permissions of the manifests and kubeconfig files of the API server, controller manager and scheduler |
| API server, controller manager, scheduler | Anonymous authentication disabled, `--authorization-mode` not `AlwaysAllow`, admission plugins such as NodeRestriction enabled, audit logging configured, profiling disabled |
| etcd | TLS for clients and peers, client certificate authentication |
| Control plane configuration | Authentication and authorization choices, audit policy |
| Worker nodes | kubelet: anonymous authentication disabled, `Webhook` authorization, read-only port disabled, certificate rotation; file permissions |
| Policies | RBAC (minimise access to Secrets, avoid wildcards, limit `cluster-admin`), Pod Security, NetworkPolicy, Secrets management, namespaces |

Recommendations are marked as automated (they can be checked by a tool) or manual, and assigned to profiles: **Level 1** is a practical baseline with little impact on functionality, **Level 2** adds defense-in-depth settings that may restrict functionality. CIS also publishes separate benchmarks for managed Kubernetes services, because the customer cannot inspect or configure their control plane. The benchmark is checked automatically by tools such as **kube-bench** (see the Automation and Tooling chapter).

**NIST SP 800-190, Application Container Security Guide** (NIST, September 2017) is broader and technology-neutral: it explains the risks of container technologies and the countermeasures for each. Its risk categories follow the core components:

| Component | Risks named by SP 800-190 |
| --- | --- |
| **Image** | Image vulnerabilities, configuration defects, embedded malware, embedded clear-text secrets, untrusted images |
| **Registry** | Insecure connections, stale images, insufficient authentication and authorization |
| **Orchestrator** | Unbounded administrative access, unauthorized access, poorly separated inter-container traffic, mixing workload sensitivity levels, orchestrator node trust |
| **Container** | Runtime software vulnerabilities, unbounded network access, insecure runtime configuration, application vulnerabilities, rogue containers |
| **Host OS** | Large attack surface, shared kernel, host component vulnerabilities, improper user access rights, host file system tampering |

Two of its recommendations are classic exam material: use a **container-specific (minimal) host OS** to reduce the attack surface, and **group containers by purpose, sensitivity and threat posture** on separate hosts so that a compromise does not cross sensitivity levels. It also recommends hardware-based countermeasures such as a trusted boot chain.

> **Exam trap.** "Which document gives the expected file permissions of the kubelet configuration and the API server flags to set?" is the CIS Kubernetes Benchmark. "Which NIST publication describes the risks of images, registries, orchestrators, containers and host OSes?" is SP 800-190. NIST SP 800-190 contains no `kube-apiserver` flags.

<!-- section: continuous-compliance | objectives: 6.1.3 -->
## Continuous compliance and evidence

A cluster changes many times a day; a yearly manual audit would describe a system that no longer exists. **Continuous compliance** means mapping requirements to controls once, enforcing those controls automatically, and collecting evidence all the time.

**1. Map controls to requirements.** Build a control matrix: each requirement of the framework points to one or more technical controls and to the evidence that proves them.

| Requirement (paraphrased) | Kubernetes control | Evidence |
| --- | --- | --- |
| Restrict access to data by need to know | RBAC Roles scoped to namespaces, no wildcard verbs, few `cluster-admin` bindings | RBAC manifests in Git, periodic RBAC review, kube-bench policy checks |
| Identify and authenticate every user | OIDC authentication with individual identities, no shared admin certificates | Identity provider logs, `user.username` in audit events |
| Log and monitor access to sensitive data | API server audit policy at `Metadata` level for Secrets, logs shipped off-cluster | Audit log retention, SIEM alerts |
| Segment the regulated environment | Default-deny NetworkPolicy in the `payments` namespace, dedicated nodes | NetworkPolicy manifests, policy reports |
| Secure configuration of systems | Pod Security Admission `restricted` enforced on regulated namespaces, CIS Benchmark hardening | Namespace labels, kube-bench reports |
| Protect stored data | Encryption at rest of Secrets (EncryptionConfiguration with a KMS v2 provider), encrypted volumes | API server configuration, KMS key logs |

**2. Enforce as code.** Policies stored in Git and applied by admission control (Pod Security Admission, ValidatingAdmissionPolicy, Kyverno, OPA Gatekeeper) make the control repeatable and versioned: the Git history itself shows when a control was introduced and who approved it.

**3. Collect evidence continuously.**

- **Audit logs** of the API server record who did what, when, on which resource, and the response: the primary evidence for access requirements. Use `Metadata` level for Secrets and ConfigMaps so that values never land in the log, and send the logs to tamper-resistant storage outside the cluster with the retention period the framework requires.
- **Policy reports**: Kyverno writes `PolicyReport` and `ClusterPolicyReport` resources with pass and fail results, including background scans of resources that existed before the policy; Gatekeeper's audit records violations of existing resources in the status of each constraint. These show compliance of what is running, not only of what was admitted.
- **Benchmark and scan reports**: kube-bench results, image vulnerability reports and SBOMs, kept per release.
- **Runtime alerts** (Falco) prove that detective controls are in place and show incidents.

> **Exam tip.** Admission control only checks resources when they are created or updated. To prove that resources *already running* comply, the answer is a background scan or audit: Kyverno background scans with policy reports, or Gatekeeper audit.

<!-- section: key-points -->
## Key points

- PCI DSS: payment card data, twelve requirements. HIPAA: US health data (PHI), administrative, physical and technical safeguards. GDPR: personal data of people in the EU, 72-hour breach notification. SOC 2: auditor's report on the Trust Services Criteria, Type I (design) or Type II (operation over time). ISO/IEC 27001: certifiable ISMS.
- Frameworks say what to achieve; the operator maps each requirement to Kubernetes controls and evidence. Isolating regulated workloads reduces the scope.
- CIS Kubernetes Benchmark: consensus configuration recommendations per component (control plane, etcd, worker nodes, policies), Level 1 and Level 2 profiles, automated or manual checks; checked by kube-bench.
- NIST SP 800-190: risks and countermeasures for images, registries, orchestrators, containers and host OSes; minimal host OS; group containers by sensitivity.
- Continuous compliance: policy as code in Git, admission enforcement, audit logs shipped off-cluster, policy reports and background scans as evidence of what runs.
