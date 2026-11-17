The Cloud Adoption Framework for Azure (CAF) tells the organization how to adopt, govern and secure the cloud as a whole; the Azure Well-Architected Framework (WAF) tells a team how to design one workload well. SC-100 asks you to design or evaluate a security and governance strategy with them, to place security in Azure landing zones, to build a DevSecOps process and to adopt AI securely. Questions describe an organization's current practices and ask which framework, which phase or which solution fixes the gap.

<!-- section: caf-waf | objectives: 1.3.2 -->
## CAF and WAF: two scales, one security strategy

| | Cloud Adoption Framework | Well-Architected Framework |
| --- | --- | --- |
| Scope | The organization and its whole cloud estate | One workload |
| Structure | Methodologies: Strategy, Plan, Ready, Adopt, Govern, Manage, and Secure across all of them | Five pillars: Reliability, Security, Cost Optimization, Operational Excellence, Performance Efficiency |
| Security content | The Secure methodology, the security design area of Azure landing zones | The Security pillar and its design review checklist |
| Typical owner | Cloud strategy, platform and governance teams, CISO | Workload architects and developers |
| Evaluation tools | Readiness and governance checklists | The Well-Architected Review assessment; Azure Advisor recommendations grouped by pillar |

The **CAF Secure methodology** applies security to every phase, because a gap in one phase weakens the whole posture:

| Phase | Security task |
| --- | --- |
| Teams and roles | Understand security teams and roles: cloud provider, platform teams, security architecture and posture management, security operations (SOC), governance, risk and compliance (GRC), security education and policy |
| Strategy | Integrate security into the cloud adoption strategy: posture modernization, incident preparedness, confidentiality, integrity and availability, posture sustainment |
| Plan | Plan a secure adoption, including the landing zone |
| Ready | Ready the secure cloud estate |
| Adopt | Perform the adoption securely |
| Govern | Securely govern the estate |
| Manage | Securely manage the estate |

The methodology builds on three ideas. **Security posture modernization** aligns with the Zero Trust adoption framework, prioritizes by measurable risk reduction and automates validation (policy, infrastructure as code, continuous compliance scanning, secure score in Defender for Cloud). **Incident preparation** covers readiness, detection, triage, containment, eradication, recovery and lessons learned. The **CIA triad** maps to controls: confidentiality (encryption, key management, identity, segmentation, classification), integrity (hashing, signing, immutable storage, version control, secure update supply chains), availability (redundancy, autoscaling, backup and disaster recovery).

The WAF **Security pillar** gives a design review checklist of 12 recommendations:

| Code | Recommendation |
| --- | --- |
| SE:01 | Establish a security baseline aligned to compliance requirements, industry standards and platform recommendations |
| SE:02 | Maintain a secure development lifecycle |
| SE:03 | Classify and label workload data and systems |
| SE:04 | Create intentional segmentation and perimeters |
| SE:05 | Implement strict, conditional and auditable identity and access management |
| SE:06 | Isolate, filter and control network traffic, ingress and egress |
| SE:07 | Encrypt data with modern, industry-standard methods |
| SE:08 | Harden all workload components |
| SE:09 | Protect application secrets: harden storage, restrict and audit access, rotate |
| SE:10 | Implement holistic monitoring with modern threat detection |
| SE:11 | Establish a comprehensive testing regimen |
| SE:12 | Define and test incident response procedures, up to disaster recovery |

> **Exam trap.** A stem about "evaluating the security of a single application's architecture" points to the WAF Security pillar and its checklist, not to CAF. A stem about "an enterprise-wide approach so that every new subscription inherits security controls" points to CAF and landing zones.

<!-- section: governance | objectives: 1.3.2, 1.3.3 -->
## Security and governance with CAF

The CAF **Govern** methodology has five steps. The first is done once; the other four repeat as a cycle:

1. Build a cloud governance team.
2. Assess cloud risks.
3. Document cloud governance policies.
4. Enforce cloud governance policies.
5. Monitor cloud compliance.

Governance covers security, regulatory compliance, operations, cost management, data management, resource provisioning, and emerging areas such as AI. Policies are written first, as business statements, then enforced with tools; enforcement is automated wherever possible.

| Requirement | Recommended solution |
| --- | --- |
| Rules that every subscription must follow, including future ones | Azure Policy assigned at a management group |
| Block a non-compliant configuration at deployment | An Azure Policy `deny` effect |
| Fix existing resources automatically | `deployIfNotExists` or `modify` with remediation |
| Measure security posture against best practices across Azure, AWS and GCP | Defender for Cloud, MCSB and secure score |
| Assess compliance with a regulation | Defender for Cloud regulatory compliance; Purview Compliance Manager for Microsoft 365 |
| Limit standing administrative access | Microsoft Entra PIM with recurring access reviews |
| Classify and govern data across the estate | Microsoft Purview |
| Inventory resources and find drift | Azure Resource Graph, Defender for Cloud inventory |
| Separate duties between platform, security and workload teams | Azure RBAC at management group, subscription and resource group scopes |

> **Exam tip.** "Evaluate an existing strategy" questions describe practices such as manual reviews, permanent Owner assignments or policies in audit mode only. The CAF answer moves each one to an automated, enforced control: deny policies, PIM, continuous compliance monitoring.

<!-- section: landing-zones | objectives: 1.3.4 -->
## Implementing and governing security with Azure landing zones

An **Azure landing zone** is the environment that CAF prepares before workloads arrive: a management group hierarchy, platform subscriptions (management, connectivity, identity, security) and application landing zones (one or more subscriptions per workload). The reference hierarchy:

| Management group | Content |
| --- | --- |
| Intermediate root (company name) | Policies for the whole organization |
| Platform | Management (logs, automation), Connectivity (hubs, firewalls, DNS), Identity (domain controllers), Security (Microsoft Sentinel) |
| Landing zones: Corp | Workloads connected to the corporate network |
| Landing zones: Online | Internet-facing workloads |
| Sandbox | Experiments, relaxed policies |
| Decommissioned | Canceled subscriptions |

Landing zones follow **policy-driven governance**: Azure Policy assignments and Azure RBAC role assignments on the management groups are inherited by every subscription below them, so a new workload subscription is secure from day one.

The **security design area** of Azure landing zones creates a foundation for Azure, hybrid and multicloud environments. Its scope is security operations tooling and access control, including Zero Trust and advanced network security. Its recommendations:

- Enable Defender for Cloud on all subscriptions and use Azure Policy to keep it enabled.
- Integrate Defender for Cloud with Microsoft Sentinel for a centrally managed SIEM and SOAR across hybrid and multicloud.
- Export the Azure activity log to Azure Monitor Logs, and to Azure Storage for retention beyond two years.
- Use Microsoft Entra reporting for access audits; for identities, Conditional Access and PIM with recurring access reviews.
- Monitor patching drift and VM security configuration drift.
- Define an incident response plan before going to production.

The reference implementation includes Defender for Cloud, Microsoft Sentinel, Azure Firewall, Web Application Firewall, PIM and optionally Azure DDoS Network Protection. Its policies for Corp and Online landing zones enforce secure access such as HTTPS to storage accounts, auditing and encryption for Azure SQL Database, and prevent IP forwarding, inbound RDP from the internet and subnets without an NSG.

> **Exam trap.** Assign organization-wide policies at the intermediate root, not at the tenant root group, and keep workload exceptions in their own management group or as exemptions. Resource locks can't be applied to a management group: Azure Policy and Azure RBAC are the controls that a hierarchy propagates.

<!-- section: devsecops | objectives: 1.3.5 -->
## A DevSecOps process aligned with CAF

CAF's guidance for secure DevOps environments applies the three Zero Trust principles to the development platform. The threat areas are developer workstations, release pipelines and test environments that give access to production data. DevSecOps "shifts left": security moves from a production-only concern into planning and development, with the controls of WAF SE:02 (secure development lifecycle) and SE:11 (testing).

| Stage | Practice | Microsoft and GitHub solutions |
| --- | --- | --- |
| Plan | Threat modeling (STRIDE), security requirements and secure coding standards | Work tracking in Azure Boards or GitHub Issues |
| Develop | Security checks in the IDE, peer review, no secrets in code | IDE security plugins; secret scanning with push protection |
| Commit and pull request | Branch review, static analysis, dependency review | Code scanning with CodeQL, Dependabot, GitHub Advanced Security for Azure DevOps |
| Build and test | Scan dependencies, containers and infrastructure as code; fail the build on high-severity findings | Defender for Cloud DevOps security, Microsoft Defender for Containers |
| Deploy | Pipelines authenticate to Azure without stored secrets; guardrails on what can be deployed | GitHub Actions with OpenID Connect federated identity, Azure Key Vault, Azure Policy |
| Operate | Monitor and detect, feed findings back to the backlog | Azure Monitor, Application Insights, Defender for Cloud, Microsoft Sentinel |

**Defender for Cloud DevOps security** connects Azure DevOps organizations, GitHub organizations and GitLab groups, and shows the security team the findings for code, secrets, dependencies and infrastructure as code next to cloud resources. GitHub Advanced Security for Azure DevOps is sold as GitHub Secret Protection for Azure DevOps and GitHub Code Security for Azure DevOps.

> **Exam trap.** Secret scanning finds secrets already in the repository; push protection blocks a new secret at push time. A requirement to "prevent developers from committing credentials" is push protection, and the long-term fix is a workload identity or OpenID Connect federation, so that no secret exists.

> **Exam tip.** "The security team must see vulnerabilities from GitHub, Azure DevOps and GitLab in one place, next to cloud posture" is Defender for Cloud DevOps security, not a separate dashboard per platform.

<!-- section: secure-ai-adoption | objectives: 1.3.1 -->
## A strategy for secure AI adoption

The CAF AI scenario prepares AI adoption in steps: plan (turn use cases into a production plan), ready (fit AI workloads into the Azure landing zone), then govern, secure and manage. It advises choosing the option with the least operational responsibility that meets the requirements: AI on SaaS platforms (Microsoft Copilot Studio for agents), on Azure platforms (Microsoft Foundry for custom applications and agents) or on Azure infrastructure. **Microsoft Agent 365** gives central visibility and governance of supported AI agents.

The **Secure AI** guidance has three parts:

| Part | Recommendations | Solutions |
| --- | --- | --- |
| Discover AI security risks | Threat model the AI systems (STRIDE, then MITRE ATLAS and OWASP generative AI risks); assess data risks by sensitivity; test models for data leakage, prompt injection and model inversion; red team; repeat assessments periodically | Microsoft Purview Insider Risk Management for data risk; adversarial testing |
| Protect AI resources and data | Build a complete AI asset inventory; authenticate with managed identities and isolate traffic in virtual networks; define data boundaries; prevent data loss; protect models and datasets | Azure Resource Graph, Defender for Cloud AI security posture management, Microsoft Purview classification and DLP, Azure RBAC, Azure Private Link, Blob Storage with private endpoints and encryption |
| Detect AI security threats | Automate AI risk detection; build AI-specific incident response procedures; monitor each platform | Defender for Cloud AI security posture management, AI incident response runbooks |

| Requirement | Recommendation |
| --- | --- |
| Know every AI deployment in the Azure estate and its misconfigurations | Defender for Cloud AI security posture management, with Azure Resource Graph |
| Stop sensitive data from flowing into AI prompts and outputs | Microsoft Purview classification and Data Loss Prevention |
| AI workloads reach data without stored credentials or public endpoints | Managed identities, private endpoints through Azure Private Link |
| Detect risky use of AI tools by employees | The Risky AI usage policy template of Purview Insider Risk Management |
| Central visibility and governance of the organization's agents | Microsoft Agent 365 |
| Controls that a secure AI design must meet | The MCSB artificial intelligence security domain |

> **Exam trap.** The CAF AI guidance is the adoption strategy (plan, ready, govern, secure, manage); the MCSB AI domain is the list of controls. A question about "the sequence an organization should follow to adopt AI securely" is CAF; one about "which control the chatbot design is missing" is MCSB.

<!-- section: key-points -->
## Key points

- CAF governs the estate (Strategy, Plan, Ready, Adopt, Govern, Manage, with Secure across them); WAF designs one workload (five pillars, Security checklist SE:01 to SE:12).
- CAF Govern: build the team, then cycle through assess risks, document policies, enforce policies, monitor compliance.
- Azure landing zones: management group hierarchy with platform and application landing zones, policy-driven governance inherited by every subscription.
- Landing zone security: Defender for Cloud on every subscription enforced by policy, Sentinel for SIEM and SOAR, PIM and access reviews, activity log export.
- DevSecOps: shift left; threat modeling, secret scanning and push protection, CodeQL, Dependabot, IaC and container scanning, OpenID Connect instead of secrets, Defender for Cloud DevOps security for one view.
- Secure AI adoption: discover risks, protect resources and data, detect threats; Defender for Cloud AI security posture management, Purview, managed identities and Private Link, Agent 365 for agents.
