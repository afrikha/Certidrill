Some risks come from inside the organization, and some questions come afterwards: what did this user do, and where is the evidence? Three Microsoft Purview solutions answer them. The exam expects you to tell them apart: insider risk management detects risky behavior, eDiscovery finds and preserves content for a legal case, Audit records who did what.

<!-- section: insider-risk-management | objectives: 4.4.1 -->
## Insider risk management

**Microsoft Purview Insider Risk Management** helps minimize internal risks by letting you **detect, investigate and act on** risky and malicious activities in the organization, whether intentional or inadvertent: leaks of sensitive data, intellectual property theft, confidentiality violations, fraud, insider trading, regulatory compliance violations.

It is built on four principles:

| Principle | Meaning |
| --- | --- |
| **Transparency** | Balance user privacy against organizational risk, with privacy by design: users are **pseudonymized by default** |
| **Configurable** | Policies adapted to the industry, the geography and the business groups |
| **Integrated** | One workflow across Microsoft Purview solutions |
| **Actionable** | Insights that lead to reviewer notifications, data investigations and user investigations |

The workflow has five steps:

| Step | What happens |
| --- | --- |
| **Policies** | Created from predefined **templates**; they define the risk indicators, the users in scope and the period |
| **Alerts** | Generated automatically when risk indicators match the policy conditions |
| **Triage** | A reviewer examines each alert, then opens a new case, attaches the alert to an existing case or dismisses it |
| **Investigate** | A **case** gathers the user's activity, the related content and the case notes |
| **Action** | Send a reminder notice to the user, or escalate the case to eDiscovery for a legal investigation |

Policy templates to recognize: **data theft by departing users** (uses an HR connector to know who is leaving), **data leaks**, **security policy violations** (uses Microsoft Defender for Endpoint signals), **risky AI usage**, **patient data misuse**.

> **Exam trap.** DLP looks at the **content** and blocks an action at the moment it happens. Insider risk management looks at the **behavior of a user** over time and raises alerts for an investigation: its purpose is to detect and investigate, not to block.

<!-- section: ediscovery | objectives: 4.4.2 -->
## eDiscovery solutions in Microsoft Purview

**eDiscovery** (electronic discovery) is the process of identifying and delivering electronic information that can be used as **evidence in legal cases**. The Microsoft Purview portal offers one unified eDiscovery experience; depending on licensing, premium features are added. Using it requires being assigned the appropriate permissions.

| Element | Role |
| --- | --- |
| **Case** | Contains all the searches, holds and review sets of one investigation; access is limited to the members of the case |
| **Search** | Finds content in Exchange mailboxes, Microsoft 365 Groups, Microsoft Teams, SharePoint sites, OneDrive accounts and Viva Engage |
| **Hold** | Preserves the content of a location so that it cannot be deleted, inadvertently or intentionally, during the investigation |
| **Export** | Copies the search results into a package that you download for review outside Microsoft 365 |
| **Review set** (premium) | A secure, static copy of the collected content, in which you search, filter, tag and analyze |

Other premium features: optical character recognition to make the text of images searchable, conversation threading for Teams and Viva Engage messages, analytics to set aside content that is not relevant, and automatic decryption of encrypted items.

Content search, formerly a separate tool, is now part of eDiscovery.

> **Exam tip.** "Legal case", "litigation", "preserve content", "legal hold", "evidence": eDiscovery. A hold wins over retention settings: content on hold is not permanently deleted until the hold is released.

<!-- section: audit | objectives: 4.4.3 -->
## Audit solutions in Microsoft Purview

**Microsoft Purview Audit** records user and administrator activities across Microsoft services in a **unified audit log**: files opened or shared in SharePoint and OneDrive, emails accessed in Exchange, messages and meetings in Teams, sign-ins and role assignments in Microsoft Entra ID, Microsoft 365 Copilot interactions. Security, compliance and legal teams search it for forensic investigations and to meet compliance obligations.

| | Audit (Standard) | Audit (Premium) |
| --- | --- | --- |
| Enabled by default | Yes | Yes |
| Audited activities | Thousands, searchable | The same |
| Default retention of records | 180 days | One year for Microsoft Entra ID, Exchange, OneDrive and SharePoint records; 180 days for the others |
| Audit log retention policies | No | Yes: by service, activity or user |
| Retention up to 10 years | No | Yes, with an add-on license |
| Intelligent insights | No | Yes: for example which mail items were accessed, what users searched for |
| Access to the Office 365 Management Activity API | Standard bandwidth | Higher bandwidth |

Audit data is searched with the **audit log search tool** of the Microsoft Purview portal (results can be exported to a CSV file), with a PowerShell cmdlet or through APIs, for example to feed a SIEM.

| Requirement | Answer |
| --- | --- |
| Know who deleted a file or changed a mailbox permission last month | Audit |
| Keep audit records for several years | Audit (Premium) |
| Preserve a departing manager's mailbox for a lawsuit and export the relevant emails | eDiscovery (hold, search, export) |
| Be alerted when an employee who resigned downloads many confidential files | Insider risk management |
| Block the sending of credit card numbers by email | Data loss prevention |

<!-- section: key-points -->
## Key points

- Insider risk management: detect, investigate and act on risky user activities. Workflow: policies, alerts, triage, investigate, action. Users are pseudonymized by default.
- Policy templates include data theft by departing users, data leaks and security policy violations.
- eDiscovery: identify and deliver electronic evidence for legal cases, with cases, searches, holds and exports; review sets are a premium feature.
- A hold preserves content against deletion.
- Audit: unified audit log of user and admin activities. Standard keeps records 180 days; Premium keeps one year for Microsoft Entra ID, Exchange, OneDrive and SharePoint, up to 10 years with an add-on, and adds retention policies and intelligent insights.
- Who did what: Audit. Evidence for a lawsuit: eDiscovery. Risky behavior of a user: insider risk management. Sensitive content leaving: DLP.
