An attack rarely stays in one place: a phishing email steals credentials, then the attacker moves to a device and to cloud apps. Microsoft Defender XDR joins the signals of several Defender services into one story. The exam asks which service protects what.

<!-- section: defender-xdr-services | objectives: 3.4.1 -->
## Microsoft Defender XDR services

**Microsoft Defender XDR** (extended detection and response) is a unified pre-breach and post-breach enterprise defense suite that coordinates detection, prevention, investigation and response across **endpoints, identities, email and applications**.

| Service | Protects |
| --- | --- |
| **Microsoft Defender for Endpoint** | Devices: laptops, phones, tablets, PCs |
| **Microsoft Defender Vulnerability Management** | Assets, by finding and fixing vulnerabilities and misconfigurations |
| **Microsoft Defender for Office 365** | Email, links and collaboration tools (Teams, SharePoint, OneDrive) |
| **Microsoft Defender for Identity** | Identities of on-premises Active Directory and Microsoft Entra ID, in hybrid environments |
| **Microsoft Entra ID Protection** | Cloud identities, against identity-based risks |
| **Microsoft Defender for Cloud Apps** | SaaS applications and the data in them |
| **Microsoft Defender Threat Intelligence** | Investigations, with threat information aggregated and enriched for triage, incident response and threat hunting (see Microsoft Threat Intelligence below) |
| **Microsoft Security Exposure Management** | The security posture across assets and workloads: attack surface and exposure risk |

What the suite adds on top of each service:

- **Combined incidents queue**: related alerts and assets are grouped into one incident that tells the full attack story.
- **Automatic attack disruption**: contains an attack in progress, for example by isolating a device or disabling a compromised account.
- **Self-healing**: automatic actions return affected devices, identities and mailboxes to a safe state.

<!-- section: defender-office-365 | objectives: 3.4.2 -->
## Microsoft Defender for Office 365

**Defender for Office 365** protects against threats such as phishing and malware that arrive through email messages, links (URLs), attachments and collaboration tools.

| Feature | Role |
| --- | --- |
| **Safe Attachments** | Opens attachments in a virtual environment to observe their behavior (detonation) before delivery |
| **Safe Links** | Checks URLs at the time of the click, in email, Teams and Office apps |
| **Anti-phishing protection** | Detects spoofed senders and impersonation of users and domains |
| **Attack simulation training** | Runs realistic simulated attacks to find and train vulnerable users |
| **Threat Explorer** or **Real-time detections** | Near real-time tools to investigate and respond to threats |
| **Automated investigation and response (AIR)** | Investigates well-known threats and remediates automatically |

Basic anti-malware, anti-spam and anti-spoofing protection is built into every cloud mailbox; Defender for Office 365 adds the rest, in two plans (Plan 2 brings Threat Explorer, AIR and attack simulation training).

<!-- section: defender-endpoint | objectives: 3.4.3 -->
## Microsoft Defender for Endpoint

**Defender for Endpoint** is an enterprise endpoint security platform that helps prevent, detect, investigate and respond to advanced threats on devices running Windows, macOS, Linux, Android and iOS.

| Capability | Role |
| --- | --- |
| **Attack surface reduction** | First line of defense: hardened configuration, network protection and web protection against malicious IP addresses, domains and URLs |
| **Next-generation protection** | Microsoft Defender Antivirus: behavior-based, real-time and cloud-delivered protection |
| **Endpoint detection and response (EDR)** | Near real-time detection of advanced attacks, with response actions for analysts |
| **Automated investigation and remediation** | Examines alerts and resolves breaches automatically |
| **Microsoft Secure Score for Devices** | Assesses the security configuration of devices and recommends improvements |

<!-- section: defender-cloud-apps | objectives: 3.4.4 -->
## Microsoft Defender for Cloud Apps

**Defender for Cloud Apps** protects SaaS applications. It is a **cloud access security broker (CASB)**: a gatekeeper between enterprise users and the cloud resources they use.

- **Cloud discovery**: finds the cloud apps that users really access, including **shadow IT**, and rates each app against more than 90 risk indicators.
- **Information protection**: finds sensitive files in connected apps, applies sensitivity labels, blocks downloads to unmanaged devices.
- **SaaS security posture management (SSPM)**: surfaces misconfigurations of connected apps and recommends fixes.
- **Advanced threat protection**: user and entity behavior analytics detect anomalies.
- **App governance**: visibility and control over OAuth apps that access data on behalf of users.
- **Conditional Access app control**: with Microsoft Entra Conditional Access, monitors and controls browser sessions in real time.

<!-- section: defender-identity | objectives: 3.4.5 -->
## Microsoft Defender for Identity

**Defender for Identity** is a cloud-based solution that uses signals from your identity infrastructure to detect identity-based attacks. It monitors on-premises Active Directory, Microsoft Entra ID and other identity solutions such as Okta. **Sensors** installed on domain controllers and on servers running AD FS and AD CS parse events and network traffic, then send the parsed data to the cloud service.

It detects every stage of an attack: **reconnaissance**, **compromised credentials** (brute force, failed authentications), **lateral movement** and **domain dominance**. It also assesses the identity posture and feeds recommendations into Microsoft Secure Score.

> **Exam trap.** On-premises Active Directory attacked: Defender for Identity. Risky sign-ins and risky users in Microsoft Entra ID: Microsoft Entra ID Protection. SaaS apps: Defender for Cloud Apps. Azure, AWS and GCP resources: Defender for Cloud, a different product.

<!-- section: defender-vulnerability-management | objectives: 3.4.6 -->
## Microsoft Defender Vulnerability Management

**Defender Vulnerability Management** applies a risk-based approach to discover, prioritize and remediate vulnerabilities and misconfigurations on Windows, macOS, Linux, Android, iOS and network devices.

| Capability | Content |
| --- | --- |
| **Continuous asset discovery and monitoring** | Inventories of software, digital certificates, browser extensions, hardware and firmware; security baselines assessment against benchmarks such as CIS |
| **Risk-based intelligent prioritization** | Ranks recommendations using threat intelligence, breach likelihood and business context: vulnerabilities exploited in the wild come first |
| **Remediation and tracking** | Remediation requests sent to IT through Microsoft Intune, blocking of vulnerable applications |

Its dashboard shows an **exposure score** (lower is better) and the Microsoft Secure Score for Devices (higher is better).

<!-- section: threat-intelligence | objectives: 3.4.7 -->
## Microsoft Threat Intelligence

**Microsoft Threat Intelligence** gathers and enriches what Microsoft knows about threat actors, their tools and their infrastructure. It is found under **Threat intelligence** in the Microsoft Defender portal:

- **Threat analytics**: reports on tracked threats, combined with your own data to show whether a threat is active in your network.
- **Intel profiles**: curated knowledge on threat actors, malicious tools and vulnerabilities.
- **Intel explorer**: search of articles and indicators of compromise by keyword, indicator or CVE ID.
- **Intel projects**: indicators gathered during an investigation.

In the new Threat intelligence experience of the Defender portal, these capabilities are grouped into two pages: **Overview**, which lists the threat articles, and **Intel explorer**, where the intel profiles appear as types such as threat actor, tool and vulnerability.

The standalone product Microsoft Defender Threat Intelligence (Defender TI) was retired on August 1, 2026: its capabilities converged into Defender XDR and Microsoft Sentinel.

<!-- section: defender-portal | objectives: 3.4.8 -->
## Microsoft Defender portal

The **Microsoft Defender portal** (`https://security.microsoft.com`) is the single place for security operations. It brings together Defender XDR, Microsoft Sentinel, Microsoft Defender for Cloud, Microsoft Threat Intelligence and Microsoft Security Exposure Management.

| Area | Content |
| --- | --- |
| **Exposure management** | Security posture across assets, **Microsoft Secure Score**, vulnerability management |
| **Investigation & response** | **Incidents & alerts**, **Hunting** (advanced hunting over up to 30 days of raw data, custom detection rules), **Actions & submissions** |
| **Assets** | Devices and identities |
| **Identities**, **Endpoints**, **Email & collaboration**, **Cloud apps** | The features of Defender for Identity, Defender for Endpoint, Defender for Office 365 and Defender for Cloud Apps |
| **Reports** | Unified security reports |

**Microsoft Secure Score** measures the security posture of the organization: the higher the number, the more recommended actions have been taken.

> **Exam trap.** Security operations: Microsoft Defender portal. Compliance and data protection (labels, DLP, eDiscovery, audit): Microsoft Purview portal. Identities and Conditional Access: Microsoft Entra admin center.

<!-- section: key-points -->
## Key points

- Defender XDR correlates signals across endpoints, identities, email and applications into incidents.
- Defender for Office 365: email and collaboration (Safe Attachments, Safe Links, anti-phishing).
- Defender for Endpoint: devices (attack surface reduction, next-generation protection, EDR).
- Defender for Cloud Apps: CASB for SaaS apps (cloud discovery, shadow IT).
- Defender for Identity: on-premises Active Directory through sensors, as well as Microsoft Entra ID and other identity solutions.
- Defender Vulnerability Management: discover, prioritize by risk, remediate.
- Microsoft Threat Intelligence: threat analytics, intel profiles, intel explorer.
- Defender portal: incidents, hunting, Secure Score and reports, with Sentinel and Defender for Cloud.
