Regulations rarely name a product: they ask for controls, such as "personal data must stay in the EU", "access to cardholder data must be logged and reviewed", "records must be kept seven years". The architect turns each requirement into technical controls, chooses the Microsoft tool that enforces or measures each one, and proves alignment to auditors. The exam tests three tools that are easy to confuse: Microsoft Purview, Azure Policy and the regulatory compliance dashboard of Microsoft Defender for Cloud.

<!-- section: requirements-to-controls | objectives: 2.4.1 -->
## Translating compliance requirements into security controls

Method:

1. **Identify the obligations**: regulations (GDPR, NIS2, DORA, HIPAA, PCI DSS), industry standards (ISO/IEC 27001, SOC 2), contracts and internal policies, and the data, systems and regions in scope.
2. **Apply the shared responsibility model**: Microsoft is responsible for the physical datacenter and the platform, and documents it in its audit reports on the **Service Trust Portal**; the customer always keeps responsibility for data, identities, accounts and devices, and more as it moves from SaaS to PaaS to IaaS.
3. **Map each requirement to control families**, using a framework that is already mapped to the standards: the **Microsoft cloud security benchmark (MCSB)** maps its controls to CIS Controls, NIST SP 800-53 and PCI DSS.
4. **Choose a preventive, detective or corrective control** and the tool that implements it.
5. **Measure and collect evidence** continuously, not only before the audit.

| Requirement | Control | Microsoft solution |
| --- | --- | --- |
| Data must stay in a geography | Allowed locations for resources; data residency commitments | Azure Policy (allowed locations), Azure region choice, EU Data Boundary for Microsoft cloud services |
| Encrypt data at rest with keys the customer controls | Customer-managed keys, key access logging | Azure Key Vault or Managed HSM; Purview Customer Key for Microsoft 365 |
| Microsoft engineers must not access content without approval | Approval of support access | Customer Lockbox |
| Log administrative and user activity, keep it for years | Central audit trail, retention | Purview Audit (Premium), Sentinel data lake tier, diagnostic settings |
| Personal data must be found and protected | Classification, labeling, DLP | Microsoft Purview Information Protection and Data Loss Prevention |
| Keep records for seven years, then delete them | Retention and disposition | Purview Data Lifecycle Management and Records Management |
| Only authorized people access sensitive systems; access reviewed | Least privilege, recertification | PIM, access reviews, Conditional Access |
| Resources must meet the security baseline | Configuration standards, drift detection | Azure Policy, Defender for Cloud recommendations |

> **Exam trap.** Microsoft's certifications cover Microsoft's part of the service. A customer workload isn't PCI DSS compliant because Azure is: the customer must implement and prove its own controls.

<!-- section: purview-compliance | objectives: 2.4.2 -->
## Addressing compliance requirements with Microsoft Purview

**Microsoft Purview Compliance Manager** turns regulations into **assessments**:

| Element | Meaning |
| --- | --- |
| Regulation template | A prebuilt list of controls for a regulation or standard (hundreds available, custom templates possible) |
| Assessment | A template applied to your environment, with its own score |
| Control | A requirement of the regulation |
| Improvement action | What you must do to meet a control; assigned to an owner, with status, notes and evidence; technical actions are tested automatically when possible |
| Compliance score | Progress on improvement actions, weighted by risk; includes Microsoft-managed actions and your own |

Compliance Manager assesses Microsoft 365 by default and can assess other clouds through connectors. The compliance score measures progress on recommended actions; it isn't a certification.

The other Purview solutions implement the controls:

| Requirement | Purview solution |
| --- | --- |
| Classify and protect documents and emails wherever they go (encryption, marking) | Information Protection, sensitivity labels |
| Prevent sharing of card numbers or health data in email, Teams, endpoints, browsers | Data Loss Prevention |
| Keep or delete content for a set period | Data Lifecycle Management (retention policies and labels) |
| Declare records, immutable, with disposition review | Records Management |
| Preserve and collect content for litigation or an investigation | eDiscovery (holds, searches, review sets) |
| Investigate who did what | Audit (Standard or Premium) |
| Detect data theft by departing employees | Insider Risk Management |
| Detect harassment or regulatory violations in messages | Communication Compliance |
| Control sensitive data in generative AI apps and Microsoft 365 Copilot | Data Security Posture Management (DSPM) for AI, with labels and DLP |
| Inventory and classify data in Azure, AWS, on-premises databases | Purview Data Map and Unified Catalog (data governance) |

> **Exam trap.** Purview governs and protects **data** (Microsoft 365, endpoints, data estates). It doesn't evaluate Azure resource configurations: "storage accounts must deny public access" is Azure Policy or Defender for Cloud, not Purview.

<!-- section: azure-policy | objectives: 2.4.3 -->
## Azure Policy solutions for security and compliance

Azure Policy evaluates Azure Resource Manager requests and existing resources against rules.

| Building block | Design use |
| --- | --- |
| Definition | One rule with an effect |
| Initiative (policy set) | A group of definitions for one goal; built-in regulatory initiatives (ISO 27001, NIST SP 800-53, PCI DSS...) map definitions to the standard's controls |
| Assignment | Applies a definition or initiative to a management group, subscription or resource group; inherited below; exclusions possible |
| Exemption | A resource or scope skips an assignment, category **Waiver** or **Mitigated**, with an optional expiry |
| Remediation task | Fixes existing resources for `deployIfNotExists` and `modify`, using the assignment's managed identity |

| Effect | Security use |
| --- | --- |
| `deny` | Prevent non-compliant resources (public IP on a database subnet, storage without HTTPS only) |
| `audit` / `auditIfNotExists` | Report non-compliance or a missing related resource without blocking |
| `deployIfNotExists` | Deploy what is missing: diagnostic settings to the central workspace, a Defender plan, an agent |
| `modify` | Add or change properties and tags, for example disable public network access |
| `denyAction` | Block delete operations on protected resources |
| `manual` | Attested controls that can't be checked automatically |

Design principles:

- Assign at the **highest management group** that matches the requirement, as in Azure landing zones, so new subscriptions inherit the controls.
- Roll out in **audit** first (or with enforcement mode disabled), then **deny** once the impact is known.
- Manage definitions and assignments as code, with versioning and review.
- Extend beyond Azure: **Azure Arc** brings on-premises and other-cloud servers and Kubernetes clusters under Azure Policy; **machine configuration** audits or configures settings inside the operating system; **Azure Policy for Kubernetes** applies admission rules to clusters.

| Requirement | Recommendation |
| --- | --- |
| Only EU regions for every subscription, including future ones | Allowed locations, `deny`, at the top management group |
| All resources must send logs to the central workspace | `deployIfNotExists` diagnostic settings initiative with remediation |
| Report password policy settings inside Windows servers in Azure and on-premises | Machine configuration, servers onboarded with Azure Arc |
| A legacy app needs a temporary waiver | Exemption, category Waiver, with an expiry date |

> **Exam trap.** Azure Policy can't evaluate an AWS account or a GCP project. For multicloud configuration compliance, use the standards of Defender for Cloud on the AWS and GCP connectors; Azure Policy reaches other clouds only through Arc-enabled servers and Kubernetes.

<!-- section: defender-regulatory | objectives: 2.4.4 -->
## Validating alignment with Defender for Cloud regulatory compliance

The **regulatory compliance dashboard** of Defender for Cloud shows each assigned standard, its controls and the resources that pass or fail the assessments behind each control.

| Item | Detail |
| --- | --- |
| Default standard | Azure: MCSB. AWS: MCSB and AWS Foundational Security Best Practices. GCP: MCSB and GCP Default |
| Standards for Azure, AWS and GCP | Among others: ISO/IEC 27001:2022, NIST SP 800-53, NIST CSF v2.0, PCI DSS v4.0.1, CIS Controls v8.1, SOC, EU GDPR, NIS2, DORA, EU AI Act |
| Cloud-specific standards | CIS benchmarks for Azure, AWS, GCP and their Kubernetes services; HIPAA and FedRAMP for Azure; AWS Well-Architected Framework |
| Prerequisite to add standards | A paid Defender for Cloud plan, except Defender for Servers Plan 1 and Defender for APIs Plan 1 |
| Control status | Automatically assessed controls are compliant or non-compliant; controls that can't be assessed automatically are greyed out and need manual evidence |
| Where | Configuration and assignment in the Azure portal; read-only monitoring in the Defender portal |

The MCSB is the security standard behind Defender for Cloud recommendations and the **Defender for Cloud secure score**; regulatory standards reuse the same assessments, mapped to their own controls. On Azure, these standards are Azure Policy initiatives.

How to use it in a design:

1. Assign the standards that the business must meet at the management group, AWS organization or GCP organization level.
2. Remediate failing recommendations, or enforce them (`deny`, `deployIfNotExists`) so they don't recur.
3. Attest manual controls with evidence, and exempt resources protected by another control (Mitigated).
4. Export results and download Microsoft's audit reports for the auditor; track trends over time.

| Tool | Answers |
| --- | --- |
| Defender for Cloud regulatory compliance | Do my Azure, AWS and GCP resources meet the technical controls of a standard? |
| Purview Compliance Manager | How far is the organization, Microsoft 365 included, in implementing all the controls of a regulation, technical and organizational? |
| Azure Policy | Enforce or audit one configuration rule on Azure resources |
| Microsoft Secure Score | Security posture of Microsoft 365 and identity workloads |

> **Exam trap.** A green standard in Defender for Cloud means the automated checks pass, not that the organization is certified. And the regulatory compliance dashboard needs a paid plan to add standards beyond the MCSB: Defender for Servers Plan 1 alone isn't enough.

<!-- section: key-points -->
## Key points

- Requirement, then control, then tool: preventive (Azure Policy `deny`, DLP), detective (Defender for Cloud, Audit), corrective (remediation, retention).
- Shared responsibility: Microsoft's audit reports on the Service Trust Portal don't cover the customer's controls.
- MCSB maps to CIS, NIST and PCI DSS and is the default standard of Defender for Cloud.
- Purview protects and governs data; Compliance Manager scores progress on regulations with improvement actions.
- Azure Policy enforces configuration on Azure and, through Arc, on hybrid servers and Kubernetes; assign at management groups, audit before deny.
- Defender for Cloud regulatory compliance validates Azure, AWS and GCP resources against standards; adding standards needs a paid plan other than Servers Plan 1 or APIs Plan 1.
