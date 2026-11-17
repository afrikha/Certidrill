Security operations is where every other design decision is tested: an attack that gets through must be detected, correlated, contained and investigated. The exam asks you to place Microsoft Defender XDR and Microsoft Sentinel correctly, to decide where logs go and how long they stay, to extend monitoring to on-premises servers, AWS and GCP, to choose the right automation layer, and to judge detection coverage with the MITRE ATT&CK matrices.

<!-- section: xdr-siem | objectives: 2.1.1 -->
## Detection and response: XDR and SIEM

The two halves of Microsoft's detection and response stack do different jobs:

| | Microsoft Defender XDR | Microsoft Sentinel |
| --- | --- | --- |
| Category | Extended detection and response (XDR) | Security information and event management (SIEM), with SOAR |
| Data | Native signals of Microsoft security products: Defender for Endpoint, Defender for Office 365, Defender for Identity, Defender for Cloud Apps, plus alerts from Defender for Cloud | Any source: Microsoft services, firewalls, proxies, Syslog and CEF appliances, AWS, GCP, SaaS apps, custom logs |
| Strength | Deep, product-specific detections, cross-domain correlation into incidents, built-in response actions on devices, mailboxes and identities | Broad correlation across non-Microsoft sources, custom analytics rules, long retention, playbooks |
| Licensing logic | Included in the Defender product licenses | Consumption billing on ingested and stored data |

The **unified security operations platform** puts both in the **Microsoft Defender portal**: one incident queue, one advanced hunting experience over Sentinel and Defender XDR tables, custom detections that query both, and the Defender XDR correlation engine merging Sentinel and Defender alerts into the same incidents. Microsoft Learn states that after **March 31, 2027** Microsoft Sentinel is no longer supported in the Azure portal and is available only in the Defender portal. Moving to the Defender portal has no extra cost, and Sentinel can be used there even without Defender XDR or an E5 license.

Design consequences of the unified platform:

- Alerts of Microsoft security products reach Sentinel through the **Microsoft Defender XDR connector**, and only in the **primary workspace**; the standalone product connectors are disconnected.
- Fusion and Microsoft incident creation rules are disabled: incidents come from the Defender XDR correlation engine.
- Custom detections can query Defender XDR tables without ingesting that data into Sentinel.

| Requirement | Recommendation |
| --- | --- |
| Correlate endpoint, email and identity attacks with the least effort | Defender XDR, already licensed with Microsoft 365 E5 |
| Correlate a Palo Alto firewall, AWS CloudTrail and Okta with Microsoft signals | Microsoft Sentinel, in the Defender portal |
| One queue and one hunting experience for the whole SOC | Unified security operations platform (Sentinel connected to the Defender portal) |
| Keep security data for years at the lowest cost | Sentinel data lake tier, not long analytics retention |

> **Exam trap.** Defender XDR and Sentinel aren't alternatives. Defender XDR covers Microsoft-protected workloads in depth; Sentinel is the answer as soon as the scenario adds non-Microsoft sources, custom detection logic or long retention. A design with "Sentinel only" loses the native response actions of the Defender products.

<!-- section: centralized-logging | objectives: 2.1.2 -->
## Centralized logging and auditing

A logging design answers four questions: which sources, which destination, how long, and who can read.

**Log Analytics workspaces.** Start with as few workspaces as possible: a single Sentinel workspace makes correlation and hunting simpler. Split only for a clear reason: data residency (keep EU data in an EU region), separate ownership or billing, or a regulatory boundary. Several tenants or customers (an MSSP) are managed with **Azure Lighthouse** and multi-workspace views rather than by copying data.

**Retention tiers** (Sentinel):

| Tier | Use | Retention |
| --- | --- | --- |
| Analytics | Analytics rules, custom detections, fast hunting, workbooks | Up to 2 years; 90 days free for Sentinel solution tables |
| Data lake | Low-cost storage of high-volume or rarely queried data, KQL jobs, notebooks | Up to 12 years |
| Defender XDR default | Advanced hunting tables of Defender XDR | 30 days unless extended into the workspace |

**Microsoft Purview Audit** is the unified audit log of Microsoft 365 (Exchange, SharePoint, OneDrive, Teams, Microsoft Entra ID, Copilot and many other services). It is on by default.

| | Audit (Standard) | Audit (Premium) |
| --- | --- | --- |
| Default retention | 180 days | 1 year for Microsoft Entra ID, Exchange, OneDrive and SharePoint records; 180 days for the others |
| Longer retention | No | Audit log retention policies by service, activity or user, up to 1 year, or 10 years with the 10-Year Audit Log Retention add-on (not retroactive) |
| Forensic events | Standard events | Intelligent insights, for example `MailItemsAccessed` with the sensitivity label of the accessed item, Teams message read events |
| Office 365 Management Activity API | Baseline bandwidth | About twice the bandwidth |
| Search | Purview portal, `Search-UnifiedAuditLog`, Audit Search Graph API | Same |

The Office 365 Management Activity API is the path to export audit records to a SIEM; in Sentinel, the Microsoft 365 and Microsoft Entra ID connectors bring the operational logs into the workspace.

| Requirement | Recommendation |
| --- | --- |
| Investigate which mailbox items an attacker read | Audit (Premium), `MailItemsAccessed` |
| Keep SharePoint audit records of a regulated team for 10 years | Audit (Premium) retention policy + 10-Year Audit Log Retention add-on |
| Correlate Microsoft 365 activity with firewall logs | Sentinel connectors into the workspace |
| Keep Azure resource logs centrally on every subscription, including new ones | Diagnostic settings enforced by Azure Policy (`deployIfNotExists`) at the management group |

> **Exam trap.** Purview Audit answers "who did what in Microsoft 365" for compliance and forensics; it isn't a SIEM and doesn't correlate. Records older than the retention period are gone: a 10-year policy only protects records created after it exists.

<!-- section: hybrid-multicloud-monitoring | objectives: 2.1.3 -->
## Monitoring hybrid and multicloud environments

| Environment | Posture and workload protection | SIEM collection |
| --- | --- | --- |
| On-premises and other-cloud servers | Azure Arc onboarding, then Defender for Servers | Azure Monitor Agent (AMA) on the Arc-enabled server, driven by data collection rules (DCRs) |
| AWS accounts | Defender for Cloud AWS connector (agentless CSPM, plans per account; EC2 instances onboarded through Azure Arc with Defender for Servers) | AWS connectors of Sentinel (CloudTrail, VPC flow logs, GuardDuty through an S3 bucket) |
| GCP projects | Defender for Cloud GCP connector | GCP connectors of Sentinel (Pub/Sub) |
| Network devices, appliances | Not applicable | Syslog or CEF via AMA through a Linux log forwarder |
| SaaS apps | Defender for Cloud Apps (app connectors, shadow IT discovery) | Defender XDR connector, SaaS vendor connectors |
| On-premises Active Directory | Defender for Identity sensors | Defender XDR connector, Windows Security Events via AMA |

Design rules:

- Every non-Azure machine needs **Azure Arc** before AMA-based collection and Azure Policy can apply to it; Arc gives it an Azure resource ID, RBAC, tags and policy.
- DCRs filter and transform at the source: collect only the events that detections use, to control cost.
- For an AWS organization, Defender for Cloud connects the management account, which onboards member accounts.
- Use the **Defender portal** as the single pane: Defender for Cloud alerts and Sentinel incidents land in the same queue.

> **Exam tip.** "Monitor on-premises and AWS servers with the same agent and the same policies" points to Azure Arc + AMA + DCRs, not to the retired Log Analytics agent (MMA).

<!-- section: soar | objectives: 2.1.4 -->
## Security orchestration, automation and response

Two automation layers exist, and they complement each other:

| Layer | Mechanism | Typical use |
| --- | --- | --- |
| Defender XDR | **Automated investigation and response (AIR)**, governed by the automation level of device groups | Investigate an alert and remediate the evidence (files, processes, mailbox items) |
| Defender XDR | **Automatic attack disruption** | Contain compromised users and devices during ransomware or business email compromise, with high confidence, before the SOC reacts |
| Sentinel | **Automation rules** | No-code triage: change severity or status, assign an owner, add tags or tasks, run a playbook |
| Sentinel | **Playbooks** (Azure Logic Apps) | Multi-step responses with connectors: open a ticket in ServiceNow, block an IP on a third-party firewall, disable an account in Okta, notify Teams |

In the Defender portal, alert-trigger automation rules act only on Sentinel alerts unless you use the **Enhanced Alert Trigger**, and the Incident provider condition no longer exists. Incident updates reach Sentinel with a short delay (up to minutes), so an SLA that requires a response in seconds is met by attack disruption or AIR, not by a playbook.

Playbook design: a **managed identity** with only the roles the action needs, connector secrets in Key Vault, and a human approval step for destructive actions on critical assets.

| Requirement | Recommendation |
| --- | --- |
| Automatically close known false positives from a scanner | Sentinel automation rule |
| Isolate devices and disable accounts as soon as a ransomware attack is detected | Defender XDR automatic attack disruption |
| Create a ticket in the ITSM tool for every high-severity incident | Automation rule that runs a playbook |
| Remediate malicious files on servers with the least effort | AIR with full automation on the device group |

> **Exam trap.** A playbook is the answer only when the action needs a connector or several steps. "Minimize administrative effort" with a simple action (status, owner, severity, tag) means an automation rule.

<!-- section: security-workflows | objectives: 2.1.5 -->
## Security workflows: incident response, hunting and incident management

**Incident response** follows a lifecycle: preparation, detection and analysis, containment, eradication and recovery, then post-incident lessons learned. Microsoft publishes incident response playbooks for common attacks (phishing, password spray, app consent grant) that define the steps, the data to collect and the roles. A design specifies:

| Element | Design decision |
| --- | --- |
| Roles | Tiered SOC (triage, investigation, hunting), incident commander, legal and communications contacts |
| Permissions | Least privilege: Microsoft Sentinel Responder for analysts, Contributor for engineers, Defender XDR unified RBAC roles scoped by device group |
| Severity and SLAs | Severity drives assignment and response time; automation rules enforce them |
| Containment actions | Pre-approved actions (isolate device, disable user, revoke sessions) and who may take them |
| Out-of-band communication | A channel that still works when Microsoft 365 or the identity system is compromised |
| Evidence | Retention long enough for the investigation and legal hold |

**Threat hunting** is proactive: start from a hypothesis (a MITRE technique, threat intelligence, an anomaly), query the data, save findings as bookmarks, and turn a successful hunt into a **custom detection** or analytics rule so it doesn't depend on a human again. Use advanced hunting in the Defender portal over Defender XDR and Sentinel tables, and the data lake (KQL jobs, notebooks) for hunts over long periods.

**Incident management** evaluates how incidents flow: a single queue, deduplication by correlation, tasks for standard steps, comments for hand-over, closing reasons that feed tuning, and metrics (mean time to acknowledge, to respond) reviewed regularly. **SOC optimization** recommendations in the Defender portal point out coverage gaps and data that is ingested but unused.

> **Exam tip.** When a question asks you to "evaluate" a workflow, look for the missing step: no containment owner, no lessons-learned loop, hunts that never become detections, or analysts with Contributor rights they don't need.

<!-- section: mitre-coverage | objectives: 2.1.6 -->
## Threat detection coverage with MITRE ATT&CK

MITRE ATT&CK is a knowledge base of adversary **tactics** (the goal, such as initial access or lateral movement) and **techniques** (how). It has three matrices:

| Matrix | Covers | Microsoft sources of detections |
| --- | --- | --- |
| Enterprise | Windows, macOS, Linux, cloud (identity providers, SaaS, IaaS, Office suite), network devices, containers | Defender XDR products, Defender for Cloud, Sentinel analytics rules |
| Mobile | Android and iOS devices | Defender for Endpoint on Android and iOS, Intune compliance signals |
| ICS | Industrial control systems: PLCs, HMIs, engineering workstations, OT protocols | Microsoft Defender for IoT, whose OT alerts carry MITRE ATT&CK tactics and techniques (`T0xxx` IDs) |

The **MITRE ATT&CK page of Microsoft Sentinel** (Defender portal: Microsoft Sentinel > Threat management > MITRE ATT&CK, preview) shows the matrix with the number of detections per technique. It is aligned with MITRE ATT&CK version 18.

| View | Shows |
| --- | --- |
| Active coverage (default) | Scheduled and near real-time analytics rules currently enabled in the workspace |
| Simulated coverage | Detections available (templates) but not configured: what coverage would be if you enabled them |
| Technique details | Related rules and hunting queries; in the Defender portal, recommended coverage (ratio of active detections and products to the recommended ones) |

Coverage comes from rules, incidents and hunting queries mapped to techniques, and a rule only works if a connector ingests the data it needs.

How to evaluate coverage:

1. Select the threats that matter for the business (threat intelligence on the sector, ransomware, an OT environment).
2. List the techniques those actors use, in the right matrix.
3. Compare with active coverage; use simulated coverage to find templates that close gaps.
4. Check the data sources: a technique without the logs it needs can't be detected.
5. Prioritize gaps on business-critical assets and validate with attack simulation or purple teaming.

> **Exam trap.** A plant with PLCs and engineering workstations is assessed with the **ICS** matrix and protected with Defender for IoT, not with Defender for Endpoint alone. And simulated coverage isn't protection: it shows what you could detect after enabling rules and connecting data.

<!-- section: key-points -->
## Key points

- Defender XDR: deep detection and response on Microsoft workloads. Sentinel: SIEM and SOAR for every source. Together in the Defender portal; Sentinel leaves the Azure portal after March 31, 2027.
- Few workspaces; split only for residency, ownership or regulation. Data lake tier for cheap long retention.
- Purview Audit Standard keeps 180 days; Premium adds 1 year for core services, retention policies, 10 years with the add-on, and `MailItemsAccessed`.
- Non-Azure servers: Azure Arc + AMA + DCRs. AWS and GCP: Defender for Cloud connectors for posture, Sentinel connectors for logs.
- Attack disruption and AIR for fast containment; automation rules for no-code triage; playbooks for connectors and multi-step responses.
- Hunts become detections; incident workflows need roles, SLAs, containment owners and lessons learned.
- MITRE matrices: Enterprise, Mobile, ICS. Sentinel's MITRE page shows active and simulated coverage.
