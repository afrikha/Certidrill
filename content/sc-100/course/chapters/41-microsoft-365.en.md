Securing Microsoft 365 is an evaluation exercise on SC-100: you measure the posture of productivity workloads, then choose between products that overlap at first sight. Email and collaboration threats go to Microsoft Defender for Office 365, SaaS usage and OAuth apps to Microsoft Defender for Cloud Apps, devices to Microsoft Intune, information to Microsoft Purview, and Microsoft 365 Copilot adds no new permission model but makes every existing oversharing visible. Questions describe requirements and ask which solution, plan or control to recommend.

<!-- section: m365-posture | objectives: 4.1.1 -->
## Measuring posture with Microsoft Secure Score

**Microsoft Secure Score** is the posture metric of the Microsoft Defender portal for Microsoft 365 identities, apps, devices and data. A higher number means more recommended actions are in place. It is a measure of configuration and behavior, not a guarantee against breach.

How points work:

| Fact | Value |
| --- | --- |
| Points per recommended action | 10 or fewer |
| Binary actions | Implemented = 100 % of the points |
| Partial actions | Points in proportion to coverage: MFA for 50 of 100 users on a 10-point action gives 5 points |
| Security defaults | Full points for MFA registration for all users, MFA for administrative roles and blocking legacy authentication |
| Not applicable or covered elsewhere | **Risk accepted**, or **resolved through third party** or **alternate mitigation**: the score reflects the decision |
| Licenses | Recommendations appear for licensed products, but the absolute posture doesn't change with the licenses you own |
| Refresh | Visualizations in real time; achieved points synchronized daily |

Recommendations cover Microsoft Entra ID, Exchange Online, SharePoint Online, Microsoft Teams, Defender for Endpoint, Defender for Identity, Defender for Office 365, Defender for Cloud Apps, Purview Information Protection and app governance, plus SaaS apps connected through Defender for Cloud Apps (for example Salesforce, ServiceNow, Okta, GitHub, Zoom). Use **History**, **Metrics & trends** and **comparison with similar organizations** to set KPIs and report progress to leadership.

Access: with Defender unified RBAC, custom roles need **Exposure Management (read)** or **(manage)** with the Microsoft Security Exposure Management data source; with Microsoft Entra roles, Security Administrator (and Exchange or SharePoint Administrator) can change statuses, Security Reader and Global Reader can only read.

Which score answers which question:

| Requirement | Metric |
| --- | --- |
| Posture of Microsoft 365 workloads and identities | Microsoft Secure Score |
| Posture of Azure, AWS and GCP resources | **Secure score** of Microsoft Defender for Cloud (risk-based Cloud Secure Score in the Defender portal, classic secure score in the Azure portal) |
| Progress toward a regulation (GDPR, ISO 27001, NIST) | **Compliance score** of Microsoft Purview Compliance Manager |
| Configuration of endpoints only | Microsoft Secure Score for Devices (Defender Vulnerability Management) |
| Misconfigurations of a third-party SaaS app | SaaS security posture management of Defender for Cloud Apps, surfaced in Secure Score |

> **Exam trap.** Microsoft Secure Score and the Defender for Cloud secure score are two different metrics. "Track the security posture of Exchange Online and Teams" is Microsoft Secure Score; "track the posture of Azure subscriptions and AWS accounts" is Defender for Cloud.

<!-- section: mdo-mdca | objectives: 4.1.2 -->
## Defender for Office 365 and Defender for Cloud Apps

Every cloud mailbox has **Exchange Online Protection (EOP)**. Defender for Office 365 adds two plans:

| Capability | EOP | Plan 1 | Plan 2 |
| --- | --- | --- | --- |
| Anti-malware, anti-spam, spoofing protection, quarantine, zero-hour auto purge (ZAP) for email | Yes | Yes | Yes |
| User and domain impersonation protection, mailbox intelligence | No | Yes | Yes |
| **Safe Attachments** (email, SharePoint, OneDrive, Teams) and **Safe Links** (email, Office, Teams) | No | Yes | Yes |
| Investigation tool | Message trace, reports | **Real-time detections** | **Threat Explorer**, Threat Trackers, campaigns |
| **Automated investigation and response (AIR)** | No | No | Yes |
| **Attack simulation training**, priority account protection | No | No | Yes |

Plan 1 is included in Microsoft 365 E3/G3 and Microsoft 365 Business Premium; Plan 2 in Microsoft 365 E5 (and A5, G5); both are sold as add-ons. Deploy protection with the **Standard** or **Strict** **preset security policies** rather than hand-built policies: Microsoft maintains their settings as threats change.

**Defender for Cloud Apps** is Microsoft's cloud access security broker (CASB) and more:

| Requirement | Capability |
| --- | --- |
| Find unsanctioned cloud apps (shadow IT) and rate their risk | **Cloud Discovery**: traffic logs (Defender for Endpoint integration, log collector) matched against the cloud app catalog and its risk indicators; sanction or unsanction apps |
| Scan files and activities in a sanctioned SaaS app | **App connectors** (API) |
| Block downloads from unmanaged devices during a session | **Conditional Access app control** (session policies, started from a Microsoft Entra Conditional Access policy) |
| Detect over-privileged or unused OAuth apps and their credentials | **App governance** |
| Find misconfigurations of Salesforce, ServiceNow or GitHub | **SaaS security posture management (SSPM)**, reported in Secure Score |
| Apply sensitivity labels or remove external collaborators on confidential files in SaaS apps | File policies with governance actions, integrated with Microsoft Purview; file policies retire on January 6, 2027, so new designs use Purview DLP or auto-labeling policies |
| Detect impossible travel, mass download, ransomware activity in SaaS apps | Threat protection with user and entity behavior analytics, in Defender XDR incidents |

> **Exam trap.** Phishing and malicious attachments are Defender for Office 365; malicious OAuth consent and risky SaaS usage are Defender for Cloud Apps. "Investigate a campaign and remediate automatically" requires **Plan 2**, because Threat Explorer and AIR aren't in Plan 1.

<!-- section: intune | objectives: 4.1.3 -->
## Device management with Microsoft Intune

Intune is a cloud-only endpoint management service for Windows, macOS, iOS/iPadOS, Android and Linux. It doesn't authenticate anyone: it relies on Microsoft Entra ID and sends each device's **compliance state** to Conditional Access, which closes the Zero Trust loop (user, device, app, location, risk).

| Model | What Intune manages | Typical case | Selective wipe |
| --- | --- | --- | --- |
| Mobile device management (MDM) | The whole enrolled device: settings, security, apps | Corporate devices (Windows Autopilot, Apple Automated Device Enrollment, Android Enterprise) | Full wipe or retire |
| Mobile application management (MAM) | Only work apps and their data, through **app protection policies** | Personal devices (BYOD) that users refuse to enroll | Organization data only |

Design building blocks:

| Requirement | Intune feature |
| --- | --- |
| Allow access only from healthy, managed devices | **Compliance policy** + Conditional Access grant **Require device to be marked as compliant** |
| Protect corporate data on unmanaged phones (no copy to personal apps, PIN, encryption) | **App protection policy** + Conditional Access grant **Require app protection policy** |
| Block devices that Defender for Endpoint rates at high risk | Defender for Endpoint connector + compliance setting on the machine risk score |
| Enforce BitLocker, firewall, antivirus, attack surface reduction, EDR onboarding | **Endpoint security** policies |
| Apply Microsoft-recommended hardening | **Security baselines** |
| Zero-touch provisioning of new Windows devices | Windows Autopilot |
| Keep Configuration Manager for on-premises workloads while moving to the cloud | Co-management |
| Remove local admin rights but elevate approved apps | Endpoint Privilege Management (an advanced capability, Intune Suite or add-on) |

> **Exam trap.** "Users won't enroll personal phones, but corporate email must not be copied into personal apps" is MAM with app protection policies, not a compliance policy: a compliance policy needs an enrolled device.

<!-- section: purview-m365 | objectives: 4.1.4 -->
## Securing Microsoft 365 data with Microsoft Purview

Purview protects information wherever it goes, along the cycle **know your data, protect it, prevent its loss, govern it**:

| Requirement | Purview solution |
| --- | --- |
| Detect credit card numbers, IDs or exact values from a customer database | **Sensitive information types** (built-in, custom, **exact data match**) |
| Recognize contracts, resumes or source code by content category | **Trainable classifiers** |
| Encrypt and mark a document so protection follows it outside the tenant | **Sensitivity labels** with encryption and content marking |
| Control privacy and external sharing of Teams, Microsoft 365 groups and SharePoint sites | Sensitivity labels for **containers** |
| Label existing content without user action | **Auto-labeling** (client-side in Office apps, service-side for SharePoint, OneDrive and Exchange) |
| Block or warn when sensitive data is shared by email, Teams, SharePoint, OneDrive or endpoints | **Data loss prevention (DLP)** |
| Keep or delete content for a set period, declare records | **Data lifecycle management** and **records management** (retention policies and labels) |
| Detect a departing employee exfiltrating data | **Insider Risk Management** |
| Detect harassment or regulatory violations in messages | **Communication Compliance** |
| Prevent two groups from communicating (ethical wall) | **Information barriers** |
| Search, hold and export content for legal cases | **eDiscovery** |
| Investigate who accessed what | **Audit** |
| Microsoft must never be able to decrypt the most sensitive content | **Double Key Encryption** (one key held by the customer) |
| Control the root keys that encrypt Microsoft 365 data at rest | **Customer Key** |
| Prioritize risks across all these signals | **Data Security Posture Management (DSPM)** |

Design order: define the label taxonomy and classification first, publish labels, then build DLP and Insider Risk policies on those labels, and start policies in simulation or audit mode before enforcing them.

> **Exam trap.** DLP doesn't encrypt anything and a sensitivity label doesn't stop a user from emailing a file. "Prevent users from sending documents that contain credit card numbers to external recipients" is DLP; "keep files encrypted even after they are downloaded" is a sensitivity label with encryption.

<!-- section: copilot-controls | objectives: 4.1.5 -->
## Data security and compliance for Microsoft 365 Copilot

Microsoft 365 Copilot grounds answers through Microsoft Graph and the semantic index, and **only surfaces data the user can already view**. Prompts, responses and data accessed through Graph aren't used to train the foundation models. Copilot doesn't create new access; it makes existing oversharing easy to find. The security design therefore starts with permissions.

| Risk or requirement | Control |
| --- | --- |
| Overshared sites (Everyone except external users, broad links) | SharePoint Advanced Management: data access governance reports, site access reviews, **restricted access control**; Purview DSPM **data risk assessments** |
| Keep a site out of Copilot and organization-wide search while owners fix permissions | **Restricted content discovery** (doesn't change who can open the site) |
| Copilot must not return content of encrypted files to unauthorized users | Sensitivity labels with encryption: the user needs the **VIEW** and **EXTRACT** usage rights |
| Copilot must not summarize files or emails with a given label | **DLP policy for the Copilot location** (named Microsoft Copilot, Copilot Chat, and Copilot Cowork): condition on sensitivity labels |
| Copilot must not answer prompts that contain sensitive information types, or use web search for them | Same DLP location: **processing prompts** and **performing web searches** actions (prompt blocking in preview) |
| Detect prompt injection or access to protected materials by an insider | Insider Risk Management, **Risky AI usage** policy template |
| Detect inappropriate content in prompts and responses | Communication Compliance |
| Record and investigate Copilot interactions | **Audit** (one record per interaction: message IDs, prompt or response flag, resources accessed and their sensitivity labels, not the text) and DSPM activity explorer |
| Preserve or delete interactions, find them for a legal case | Retention policies for AI apps; **eDiscovery** (interactions are stored in the user's mailbox) |
| Assess AI regulations | Compliance Manager templates for generative AI |
| Control which agents users can run | Microsoft 365 admin center, **Integrated apps** |

DLP facts that decide answers: the Copilot location exists only in the **custom** policy template and excludes other locations from the same policy; a rule can't combine sensitivity label and sensitive information type conditions (use two rules); a labeled item can still appear in **citations**; content of files uploaded into a prompt isn't scanned; policy changes take up to four hours.

> **Exam trap.** "Users see confidential HR files in Copilot answers" isn't a Copilot setting to change: those users already have access. The fix is permissions (access reviews, restricted access control), with restricted content discovery or a label-based DLP rule as a temporary barrier.

<!-- section: key-points -->
## Key points

- Microsoft Secure Score: Microsoft 365 posture, 10 points or fewer per action, risk accepted or alternate mitigation statuses; Defender for Cloud secure score is for cloud resources, Compliance Manager for regulations.
- Defender for Office 365 Plan 2 = Threat Explorer, AIR, attack simulation training; Plan 1 = Safe Links, Safe Attachments, impersonation protection.
- Defender for Cloud Apps: Cloud Discovery, app connectors, Conditional Access app control, app governance, SSPM.
- Intune: MDM with compliance policies for managed devices, MAM with app protection policies for BYOD; Conditional Access enforces both.
- Purview: classify (SITs, trainable classifiers), protect (labels), prevent loss (DLP), govern (retention, IRM, eDiscovery, Audit).
- Copilot honors permissions and EXTRACT rights; fix oversharing first, then DLP for the Copilot location, audit, retention and eDiscovery.
