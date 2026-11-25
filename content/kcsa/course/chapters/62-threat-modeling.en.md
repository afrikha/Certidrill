Threat modeling answers four questions: what are we building, what can go wrong, what are we going to do about it, and did we do a good job? For Kubernetes, "what we are building" is the data flow between users, the API server, etcd, kubelets, Pods and external services, with the trust boundaries between them. The exam tests two frameworks for the second question, STRIDE and MITRE ATT&CK, and the reasoning that turns their output into a prioritized list of controls.

<!-- section: stride | objectives: 6.2.1 -->
## STRIDE applied to Kubernetes

**STRIDE** is a mnemonic of six threat categories. Each category is the violation of one security property, which makes it easy to pick the family of controls that answers it. You apply it element by element (process, data store, data flow, trust boundary) on a data flow diagram of the system.

| Category | Property violated | Kubernetes example | Typical controls |
| --- | --- | --- | --- |
| **Spoofing** | Authentication | A stolen ServiceAccount token or kubeconfig used from outside; a compromised node presenting itself as another node | Strong authentication (OIDC, client certificates), short-lived bound ServiceAccount tokens, `automountServiceAccountToken: false`, kubelet client certificates with the NodeRestriction admission plugin, mTLS between services |
| **Tampering** | Integrity | Modifying objects directly in etcd, replacing an image under the same tag, altering files in a running container | TLS and client authentication on etcd, network isolation of etcd, image digests and signature verification, `readOnlyRootFilesystem: true`, RBAC on admission webhook configurations |
| **Repudiation** | Non-repudiation | An administrator deletes a Deployment with a shared admin certificate and nobody can tell who did it | Individual identities, API server audit logging, logs shipped to storage outside the cluster |
| **Information disclosure** | Confidentiality | Reading Secrets through a broad `get`/`list secrets` permission, from an unencrypted etcd backup, or from the instance metadata service | RBAC least privilege, encryption at rest (EncryptionConfiguration, KMS v2), encrypted backups, NetworkPolicy egress rules, TLS everywhere |
| **Denial of service** | Availability | A Pod without limits exhausting node memory, a client flooding the API server, a fork bomb | Resource requests and limits, LimitRange, ResourceQuota, API Priority and Fairness, PID limits |
| **Elevation of privilege** | Authorization | A privileged Pod or a `hostPath` mount of `/` escaping to the node; a user who can `create pods` mounting a more powerful ServiceAccount; the `escalate`, `bind` or `impersonate` verbs | Pod Security Admission with the `restricted` (or at least `baseline`) level, RBAC review, user namespaces (`hostUsers: false`), sandboxed runtimes |

Applying STRIDE to the components:

- **API server**: the central trust boundary. Spoofing (authentication), elevation of privilege (authorization, admission), denial of service (API Priority and Fairness), repudiation (audit).
- **etcd**: a data store holding every object, including Secrets. Tampering and information disclosure dominate: only the API server should reach it, over mutual TLS.
- **kubelet**: an API on every node. Spoofing and elevation of privilege through anonymous access; disable anonymous authentication, use `Webhook` authorization, disable the read-only port.
- **Pods and containers**: tampering, denial of service and elevation of privilege (container escape) are the main threats.
- **Data flows** (client to API server, API server to kubelet, Pod to Pod): information disclosure and tampering on the network, answered by TLS, mTLS and NetworkPolicy.

> **Exam trap.** Match the category to the *property*, not to the attack's tool. An attacker who reads Secrets from an etcd backup is **information disclosure**, even though no one "spoofed" anything. A deleted audit trail that lets someone deny an action is **repudiation**, not tampering, when the question is about proving who acted.

<!-- section: mitre-attack | objectives: 6.2.2 -->
## MITRE ATT&CK for containers

**MITRE ATT&CK** is a knowledge base of adversary behaviour observed in real attacks. Its vocabulary is precise:

- A **tactic** is the adversary's goal, the "why" (gain initial access, persist, escalate privileges).
- A **technique** is how the goal is achieved, with an identifier such as `T1610` for Deploy Container (sub-techniques add a numeric suffix to the parent technique's identifier).
- **Mitigations** and **detections** are attached to each technique.

The **Containers matrix** of Enterprise ATT&CK covers container and orchestration platforms. Its tactics and some techniques:

| Tactic | Example techniques in a Kubernetes context |
| --- | --- |
| Initial Access | Exploit Public-Facing Application (a vulnerable web app in a Pod), External Remote Services (an exposed dashboard or API server), Valid Accounts (stolen credentials) |
| Execution | Container Administration Command (`kubectl exec`), Deploy Container (create a Pod running the attacker's image), Command and Scripting Interpreter |
| Persistence | Implant Internal Image (backdoor an image in the internal registry), Create Account, Scheduled Task/Job (a CronJob) |
| Privilege Escalation | Escape to Host (privileged container, `hostPath`, host namespaces), Exploitation for Privilege Escalation, Valid Accounts |
| Stealth | Masquerading (a Pod named like a system component), Indicator Removal (deleting logs), Build Image on Host |
| Defense Impairment | Disable or Modify Tools (stop a logging or security agent) |
| Credential Access | Unsecured Credentials (Secrets readable through RBAC, tokens mounted in Pods), Steal Application Access Token, Brute Force |
| Discovery | Container and Resource Discovery, Network Service Discovery, Permission Groups Discovery |
| Lateral Movement | Use Alternate Authentication Material (a stolen ServiceAccount token used from another Pod) |
| Impact | Resource Hijacking (cryptomining), Data Destruction, Endpoint Denial of Service |

In ATT&CK v19 (April 2026), MITRE split the former **Defense Evasion** tactic into **Stealth** (which keeps the identifier `TA0005`) and **Defense Impairment** (`TA0112`). Older material, including much KCSA preparation content, still shows Defense Evasion; recognise both names.

How ATT&CK is used in a cluster:

- **Detection coverage**: map Falco rules and audit-log alerts to techniques, and look for tactics with no detection.
- **Posture scanning**: tools such as Kubescape include a MITRE ATT&CK-based framework that maps misconfigurations to techniques.
- **Red team and incident reports**: describe an attack as a chain of techniques, which shows where it could have been stopped.

> **Exam trap.** STRIDE classifies *what can go wrong* during design, by violated property. ATT&CK describes *what real adversaries do*, as tactics (goals) and techniques (methods). "Escape to Host" is an ATT&CK technique of the Privilege Escalation tactic; the matching STRIDE category is elevation of privilege. A tactic is never a technique: "Persistence" is a tactic, "Implant Internal Image" is a technique.

<!-- section: prioritizing-controls | objectives: 6.2.3 -->
## From threats to prioritized controls

A threat model produces a list of threats; the value comes from turning it into a short, ordered list of controls.

1. **Rate each threat.** Estimate likelihood (how exposed is the component, how easy is the attack, is it seen in the wild according to ATT&CK) and impact (what data or control is gained). Risk is the combination of both.
2. **Start at the trust boundaries.** The API server, the kubelet API, etcd, ingress points and the boundary between a container and its node are where one control blocks many attack paths.
3. **Prefer controls that cover many threats.** Enforcing the Pod Security Standards `restricted` level blocks privileged containers, host namespaces, `hostPath` volumes and running as root at once: several escape and escalation techniques with one namespace label. RBAC least privilege on Secrets answers both information disclosure and lateral movement.
4. **Combine control types.** Prevent what you can (admission control, RBAC, NetworkPolicy), detect what you cannot prevent (audit logs, Falco runtime rules for Container Administration Command or Escape to Host), and prepare a response (playbooks, the ability to cordon a node and isolate a Pod).
5. **Decide about residual risk.** A threat with low likelihood and low impact may be accepted and documented; a high-impact threat with no preventive control needs at least detection.
6. **Revisit the model** when the architecture changes: a new external integration, a new tenant, a new data flow.

| Threat found | Likelihood and impact | Priority control |
| --- | --- | --- |
| Internet-exposed API server with weak authentication | High, cluster takeover | Private endpoint or allow-listed networks, OIDC, anonymous authentication disabled |
| Developers can deploy privileged Pods | Medium, node takeover | Pod Security Admission `enforce` at `baseline` or `restricted` |
| Flat Pod network, no NetworkPolicy | High after any compromise, lateral movement | Default-deny NetworkPolicy per namespace, then allow rules |
| Unsigned images from public registries | Medium, malicious code | Allowed registries, signature verification at admission |
| No audit logging | Not a direct attack path, but every incident becomes uninvestigable | Audit policy and off-cluster log storage |

> **Exam tip.** When a question asks for the *first* or *most effective* control, choose the one at the trust boundary that blocks the attack path (authentication on the API server, Pod Security Admission against privileged Pods) over a detective control that only reports it afterwards.

<!-- section: key-points -->
## Key points

- STRIDE: Spoofing (authentication), Tampering (integrity), Repudiation (non-repudiation), Information disclosure (confidentiality), Denial of service (availability), Elevation of privilege (authorization). Applied to each element and data flow of a diagram.
- ATT&CK: tactics are goals, techniques are methods with IDs. Containers matrix examples: Deploy Container, Container Administration Command, Implant Internal Image, Escape to Host, Unsecured Credentials, Resource Hijacking.
- Since ATT&CK v19 (April 2026), Defense Evasion is split into Stealth (TA0005) and Defense Impairment (TA0112).
- Prioritize by likelihood and impact, starting at trust boundaries, with controls that cover many threats; add detection where prevention is not possible; document accepted residual risk.
