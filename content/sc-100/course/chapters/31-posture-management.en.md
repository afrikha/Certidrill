Posture management answers one question for the architect: across Azure, AWS, GCP, on-premises servers and the internet-facing estate, where are the weaknesses, and which ones should be fixed first? SC-100 expects you to pick the right tool for each layer (Defender for Cloud, Microsoft Secure Score, Azure Arc, Defender EASM, Microsoft Security Exposure Management), to know which plan unlocks which capability, and to tell the scores apart.

<!-- section: defender-cloud-mcsb | objectives: 3.1.1 -->
## Evaluating posture with Defender for Cloud and the MCSB

Microsoft Defender for Cloud is a cloud-native application protection platform with two halves: **cloud security posture management (CSPM)**, which finds misconfigurations before an attacker does, and **cloud workload protection (CWP)**, which detects attacks on running resources (see [workload protection](#workload-protection)).

The **Microsoft cloud security benchmark (MCSB)** is the default standard of Defender for Cloud. It is assigned automatically to every Azure subscription, AWS account and GCP project connected to Defender for Cloud, and its built-in recommendations feed the secure score. The MCSB controls are grouped by security domain (for example network security, identity management, privileged access, data protection, logging and threat detection, posture and vulnerability management, endpoint security, backup and recovery, DevOps security), and each Azure service has a **security baseline** that maps the MCSB controls to that service's settings.

| Capability | Foundational CSPM (free) | Defender CSPM (paid) |
| --- | --- | --- |
| Asset inventory, recommendations, secure score, MCSB | Yes | Yes |
| Workflow automation, continuous export, exemptions | Yes | Yes |
| Regulatory standards beyond MCSB (PCI DSS, ISO 27001, NIST SP 800-53, CIS) | No | Yes |
| Attack path analysis, cloud security explorer, risk prioritization | No | Yes |
| Agentless vulnerability and secrets scanning of machines | No | Yes |
| Sensitive data discovery, AI security posture management | No | Yes |
| External attack surface insights (EASM) for cloud resources | No | Yes |
| Governance rules, critical assets | No | Yes |

**Recommendations** are the unit of work (affected resources, severity, remediation); accepted risks become **exemptions** with an expiration date. **Regulatory compliance** maps the same assessments to the controls of a standard; manual controls must be attested with evidence. Assign policies and plans at the **management group** so new subscriptions inherit them.

> **Exam trap.** "Assess Azure, AWS and GCP against one common benchmark at no extra cost" is Foundational CSPM with the MCSB. As soon as the requirement names **another standard**, **attack paths** or **sensitive data context**, the answer becomes Defender CSPM.

<!-- section: secure-score | objectives: 3.1.2 -->
## Evaluating posture with Microsoft Secure Score

**Microsoft Secure Score** measures the posture of Microsoft 365 identities, apps and devices. It lives in the Microsoft Defender portal (Exposure management > Secure score). A higher number means more recommended actions have been taken; it is a measure, not a guarantee against breach.

Rules that decide exam answers:

- Each recommended action is worth **10 points or less**. Most actions are binary; some give **partial points** (50 of 100 users protected by MFA on a 10-point action gives 5 points).
- Contributing products include Microsoft Entra ID, the Defender products for Endpoint, Identity, Office 365 and Cloud Apps, Exchange Online, SharePoint Online, Teams, plus SaaS apps such as Salesforce, ServiceNow and Okta.
- An action handled differently can be marked **resolved through third party** or **resolved through alternative mitigation** (for example, security defaults cover the MFA and legacy authentication actions), or its risk can be **accepted**.
- Recommendations appear whatever the license: the score reflects absolute posture, not what you bought.
- Access: Defender unified RBAC permissions **Exposure Management (read)** and **(manage)**, or Microsoft Entra roles (Security Administrator read/write; Security Reader, Global Reader and Security Operator read-only).

Five scores that the exam mixes up:

| Score | Product and portal | Measures |
| --- | --- | --- |
| Microsoft Secure Score | Defender portal | Microsoft 365 identities, apps, devices and connected SaaS |
| Secure score (classic) | Defender for Cloud, Azure portal | Azure, AWS, GCP resources against MCSB recommendations |
| Cloud Secure Score (risk-based) | Defender for Cloud in the Defender portal (Cloud initiative) | Same cloud resources, weighted by recommendation risk, asset risk factors and asset criticality |
| Initiative score | Security Exposure Management | Exposure in one area (for example ransomware) |
| Compliance score | Microsoft Purview Compliance Manager | Progress on regulatory improvement actions |

The classic score counts only built-in MCSB recommendations that are generally available (preview ones are excluded), and a control earns points only when all its recommendations are met for all resources. The Cloud Secure Score uses a 0–100 scale and a different calculation: the two values aren't comparable.

> **Exam trap.** "Measure the posture of Exchange Online, SharePoint and Entra ID" is Microsoft Secure Score, not Defender for Cloud. "Measure Azure subscriptions and AWS accounts" is the Defender for Cloud secure score. "Measure progress toward GDPR" is the compliance score.

<!-- section: integrated-posture | objectives: 3.1.3 -->
## Designing integrated posture management for hybrid and multicloud

An integrated design brings every environment into **one** posture view and one prioritization logic:

| Environment | How it reaches Defender for Cloud |
| --- | --- |
| Azure subscriptions | Native; enable plans at the management group |
| AWS accounts | AWS connector; connect the **management account** to onboard member accounts automatically |
| GCP projects | GCP connector at project or **organization** level |
| On-premises and other-cloud servers | **Azure Arc**-enabled servers, then Defender for Servers |
| Code and pipelines | DevOps security connectors for Azure DevOps, GitHub and GitLab |
| Internet-facing assets | Defender EASM insights in Defender CSPM, or a standalone EASM resource |

Design principles:

1. **One view.** Defender for Cloud is integrated into the Microsoft Defender portal, next to endpoint, identity and email signals; Exposure Management correlates them.
2. **Prioritize by risk.** Defender CSPM risk prioritization and **critical assets** put an internet-exposed VM with access to sensitive data before an isolated test VM.
3. **Own and automate.** Governance rules assign an owner and a due date; workflow automation and continuous export feed ticketing and Microsoft Sentinel.
4. **Enforce at scale.** Azure Policy (DeployIfNotExists) enables plans everywhere; deny policies stop the misconfiguration from coming back.

> **Exam tip.** When the scenario says "a single dashboard for Azure, AWS, GCP and on-premises servers with the least administrative effort", the expected design is Defender for Cloud with the AWS and GCP connectors and Azure Arc for the servers, not a third-party CSPM tool or one Defender for Cloud deployment per cloud.

<!-- section: workload-protection | objectives: 3.1.4 -->
## Selecting cloud workload protection plans

Posture finds weaknesses; **workload protection** detects active threats and raises security alerts. Each Defender plan is enabled per subscription, AWS account or GCP project.

| Requirement | Plan |
| --- | --- |
| EDR, vulnerability assessment and threat detection on Windows and Linux servers in any cloud or on-premises | Defender for Servers (Plan 1 or Plan 2) |
| Just-in-time VM access, file integrity monitoring, agentless malware scanning, OS baseline assessment | Defender for Servers **Plan 2** |
| Runtime protection of AKS, EKS, GKE and Arc-enabled Kubernetes, image vulnerability assessment, gated deployment | Defender for Containers |
| Malware scanning on upload and threats on Blob Storage, Azure Files, Data Lake Storage | Defender for Storage |
| SQL injection and anomalous access on Azure SQL, SQL Server on machines, open-source databases, Azure Cosmos DB | Defender for Databases |
| Attacks on web apps hosted on App Service | Defender for App Service |
| Suspicious access to secrets in Azure Key Vault | Defender for Key Vault |
| Suspicious management operations (ARM) | Defender for Resource Manager |
| API inventory and attacks on APIs published in API Management | Defender for APIs |
| Jailbreak, data leakage and credential theft against generative AI applications | Defender for AI services |

> **Exam trap.** Workload protection plans don't add attack path analysis or cloud security explorer: those are Defender CSPM. A design that needs both runtime alerts and attack paths includes **Defender CSPM plus the workload plan**.

<!-- section: azure-arc | objectives: 3.1.5 -->
## Integrating hybrid and multicloud environments with Azure Arc

**Azure Arc** projects resources that run outside Azure as Azure Resource Manager resources, so they receive the same governance and security controls as native resources.

| Arc resource | Typical security use |
| --- | --- |
| Arc-enabled servers (Windows and Linux, on-premises or other clouds) | Defender for Servers, Azure Policy and machine configuration baselines, Azure Monitor Agent data for Microsoft Sentinel, Azure Update Manager |
| Arc-enabled Kubernetes | Defender for Containers, Azure Policy for Kubernetes, GitOps configuration |
| Arc-enabled SQL Server | Defender for SQL on machines, inventory |

A projected server gets a resource ID, Azure RBAC, tags, Azure Policy, extensions and a **system-assigned managed identity** (Azure access without stored secrets).

Design choices:

| Requirement | Design |
| --- | --- |
| Onboard thousands of servers | Scripted onboarding with a service principal holding **Azure Connected Machine Onboarding** only |
| No public internet path from the datacenter | Azure Arc **private link scope** with private endpoints over ExpressRoute or VPN |
| AWS EC2 or GCP VMs with Defender for Servers | The Defender for Cloud multicloud connector deploys Arc automatically |
| Apply the same OS baseline to Azure and Arc servers | Azure Policy machine configuration at the management group |

> **Exam trap.** An on-premises server onboarded **directly** to Defender for Endpoint, without Arc, gets the endpoint protection but not the Defender for Cloud features that need an Azure resource: Plan 2 capabilities such as file integrity monitoring and the OS baseline, Azure Policy and recommendations.

<!-- section: defender-easm | objectives: 3.1.6 -->
## Designing a solution with Defender EASM

**Microsoft Defender External Attack Surface Management (Defender EASM)** looks at the organization from the outside, as an attacker does. From **discovery seeds** (domains, IP blocks, hosts, email contacts, ASNs, Whois organizations), it recursively discovers internet-facing assets, including **shadow IT**, scans them and reports vulnerabilities, exposed services and hygiene issues.

| Option | Choose when |
| --- | --- |
| EASM insights in **Defender CSPM** | The scope is internet exposure of Azure, AWS and GCP resources, used in attack paths and cloud security explorer; no separate EASM resource |
| Standalone **Defender EASM** resource | The scope is the whole external footprint: domains, websites, IPs and hosts outside the clouds, acquisitions, subsidiaries, shadow IT |

Asset states drive what is monitored: **Approved Inventory** assets are owned, shown in dashboards and rescanned daily; **Candidate** and **Requires Investigation** assets must be reviewed; **Dependency** and **Monitor Only** cover third-party or related infrastructure that you don't control.

> **Exam trap.** Defender EASM discovers what is exposed **to the internet**. Discovering unmanaged OT or IoT devices **inside** the network is Defender for IoT; discovering unmanaged laptops on the corporate network is Defender for Endpoint device discovery.

<!-- section: exposure-management | objectives: 3.1.7 -->
## Posture management with Microsoft Security Exposure Management

**Microsoft Security Exposure Management** gives a unified view of posture across endpoints, identities, cloud resources (Azure, AWS and GCP through Defender for Cloud), SaaS and the external attack surface. It sits in the **Exposure management** section of the Defender portal, needs no installation, and is available in the public cloud only. It follows the **continuous threat exposure management (CTEM)** approach: scope, discover, prioritize, validate, mobilize.

| Building block | What it does |
| --- | --- |
| Enterprise exposure graph | Correlates assets and relationships from all workloads; queried in advanced hunting (`ExposureGraphNodes`, `ExposureGraphEdges`) |
| Attack surface map | Visual exploration of assets and their connections, including cloud resources |
| Critical asset management | Predefined and custom classifications that mark devices, identities and cloud resources as critical |
| Attack paths | End-to-end routes from an entry point to a critical asset, with choke points and blast radius |
| Exposure insights: initiatives | Metric-driven programs per security area (for example ransomware), each with a score, a target and linked recommendations |
| Exposure insights: metrics, recommendations, events | Measurements inside initiatives, the fixes from Secure Score and Defender for Cloud, and alerts on score drops |
| Data connectors | Third-party sources such as ServiceNow CMDB, Tenable, Qualys and Rapid7 |

Attack paths and attack surface reduction:

- **Choke points** are nodes where many paths converge: securing one breaks many paths at once. **Blast radius** shows what an attacker reaches if a choke point falls.
- On-premises paths end at "end game" assets (Domain Admins, Enterprise Admins, domain controllers); **hybrid paths** can start on a cloud VM, pivot through an identity and reach a domain controller.
- Paths are incomplete when critical assets aren't defined or a workload isn't licensed.
- Attack surface reduction = removing exposure: internet exposure, standing privilege, vulnerable choke points, missing endpoint hardening such as attack surface reduction rules.

A posture management process to specify:

1. **Classify critical assets** (rules plus custom classifications).
2. Connect sources: Defender for Endpoint, Defender for Identity, Defender CSPM, Defender Vulnerability Management, third-party scanners.
3. Choose the **initiatives** that match business risk and set **target scores**.
4. Prioritize choke points and paths to critical assets, then recommendations by impact.
5. Remediate in the source workload; record **exemptions** with justification and review period.
6. Track initiative trends and events on score drops.

Access: **Exposure Management (read)** or **(manage)** in Defender unified RBAC (manage sets target scores), or Security Administrator in Entra ID. Licensing: Microsoft 365 E5, E3 with add-ons or Defender suite licenses; full value needs Defender CSPM and Defender Vulnerability Management.

> **Exam trap.** Defender for Cloud attack path analysis covers **cloud** resources only. A path that combines an endpoint, an on-premises identity and a cloud resource is the Exposure Management attack path experience in the Defender portal.

<!-- section: key-points -->
## Key points

- MCSB is the default, free standard of Defender for Cloud; other standards, attack paths, sensitive data and EASM insights need Defender CSPM.
- Microsoft Secure Score: Microsoft 365 posture in the Defender portal; Defender for Cloud secure score: cloud resources; compliance score: Purview.
- Integrated posture: AWS and GCP connectors, Arc for servers, DevOps connectors, one view in the Defender portal, risk-based prioritization.
- Workload plans raise alerts; Defender CSPM prioritizes posture. JIT and file integrity monitoring need Servers Plan 2.
- Azure Arc turns non-Azure servers and clusters into Azure resources for Policy, RBAC, Defender and managed identity.
- Defender EASM: outside-in discovery from seeds; standalone for the whole footprint, Defender CSPM for cloud exposure.
- Exposure Management: critical assets first, then initiatives, attack paths, choke points and recommendations across all workloads.
