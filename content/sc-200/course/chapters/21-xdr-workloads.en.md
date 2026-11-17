The Defender portal gathers the alerts of every Microsoft security workload in one queue. This chapter covers, workload by workload, what you investigate and which remediation action you take: email, data loss and insider risk, cloud workloads, SaaS apps, Microsoft Entra identities and on-premises Active Directory. Exam questions name an alert and ask for the next action, the tool to use or the role required.

<!-- section: defender-office-365 | objectives: 2.1.1 -->
## Defender for Office 365 and attack disruption

With Defender for Office 365 Plan 2, malicious email that reached mailboxes is removed either by the system (zero-hour auto purge, ZAP) or by analysts through **remediation actions**.

| Action | Result |
| --- | --- |
| Move to junk folder / Move to inbox / Move to deleted items | Moves the message to that folder (Move to inbox recovers a false positive) |
| Soft delete | Moves to Recoverable Items\Deletions; user and admins can recover it |
| Delete sender's copy | Also soft deletes the copy in the internal sender's Sent Items |
| Hard delete | Purges the message (admins can still recover it with single item recovery) |

Where to act: **Threat Explorer** (any view: Malware, Phish, All email), **Advanced hunting** (Take actions on `EmailEvents` results), and **automated investigation and response (AIR)**, whose recommended actions wait for approval. Selection limits: 100 emails picked by hand, up to 200,000 by query; remediate in batches of 50,000 or fewer; at most 50 concurrent remediations per organization.

| Approval model | How |
| --- | --- |
| Direct approval | A user with the **Search and Purge** role runs the action immediately |
| Two-step approval | A user without that role selects "add to remediation"; an authorized user approves it in **Actions & submissions > Action center > Pending** |

With unified RBAC, approval needs **Email & collaboration advanced actions (manage)**, and hard delete also needs **Email & collaboration content (read)**. Otherwise use the Organization Management or Data Investigator role groups, or a custom role group with Search and Purge. The Action center shows remediation actions for 30 days (**Pending**, **History**).

```kusto
EmailEvents
| where Timestamp > ago(2d)
| where SenderFromDomain == "fabrikam-invoices.com"
| project Timestamp, NetworkMessageId, RecipientEmailAddress, Subject, DeliveryLocation, LatestDeliveryAction
```

**Automatic attack disruption** steps in when Defender XDR correlates signals from email, identities, endpoints and SaaS apps into a high-confidence attack, such as business email compromise launched from a compromised account. It contains the attacker's assets: disable user (Defender for Identity, on domain controllers with the sensor, and in Microsoft Entra ID for synced or cloud accounts), revoke user session and suspend user in Microsoft Entra ID, contain user and contain device (Defender for Endpoint). The incident carries the **Attack Disruption** tag and a yellow banner, and the graph shows the asset status (account disabled, device contained). Every action is logged in the Action center and can be undone by the SOC.

> **Exam trap.** Attack disruption contains accounts and devices; it doesn't replace email remediation. After the incident, you still remove the phishing messages with Threat Explorer or the AIR actions, and you release a user only after resetting credentials.

<!-- section: purview-alerts | objectives: 2.1.2 -->
## Microsoft Purview: data loss prevention and insider risk

**DLP alerts** are generated when a DLP policy rule matches and its incident reports are set to generate alerts. They are investigated in the Defender portal (incidents kept 6 months) or in the Purview DLP Alerts dashboard (30 days). In the incident queue, filter on **Service/detection sources > Microsoft Data Loss Prevention**; the alert shows the policy, the **Sensitive info types** tab and, with permission, the **Source** tab with the file content.

Since early October 2026, a built-in alert tuning rule turns DLP signals into **behaviors** in Defender XDR: they no longer create alerts or appear in the incident queue, but stay in the `BehaviorInfo` and `BehaviorEntities` tables. To see them as alerts again, disable that rule in **Settings > Microsoft Defender XDR > Alert tuning**.

| Permission | Alerts visible |
| --- | --- |
| Manage Alerts, View-Only Manage Alerts | DLP and security alerts |
| Information Protection Analyst, DLP Compliance Management, View-Only DLP Compliance Management | DLP alerts only |

Remediation from the alert: for SharePoint and OneDrive files, apply a retention or sensitivity label, unshare, delete, or download (Data Classification Content Viewer role); for email, download the message. Hunt with `CloudAppEvents`, which holds the Purview audit data (up to 30 days). Administrative unit restrictions carry over: a restricted admin sees only the alerts of their unit.

**Insider risk management** alerts appear in the incident and alert queues (filter **Service source > Microsoft Purview Insider Risk Management**) once **Share user risk details with other security solutions** is turned on in the Insider Risk Management data sharing settings. Alerts of one user are correlated into a single incident. Viewing them requires an Insider Risk Management role group (Insider Risk Management, Analysts, Investigators). Status and classification sync with Purview within 30 minutes: True positive becomes Confirmed; Benign positive and False positive become Dismissed. Hunt in `DataSecurityEvents` and `DataSecurityBehaviors`; continue the case response in the Purview portal.

> **Exam trap.** A DLP alert that "no longer appears in the incident queue" after October 2026 isn't lost: look for the behavior, or disable the built-in tuning rule.

<!-- section: defender-for-cloud | objectives: 2.1.3 -->
## Defender for Cloud workload protections

With Defender for Cloud enabled and its workload protection plans turned on (servers, storage, SQL, containers, Key Vault...), every Defender for Cloud alert and incident appears in the Defender portal, without duplicates, with the **cloud resource** (Azure, AWS or Google Cloud) as an asset. Informational alerts aren't integrated. Visibility is tenant-wide; filter by the **alert subscription ID**. Without unified RBAC, viewing requires Security Administrator or Global Administrator.

| Status change made in | Defender for Cloud alert | Defender for Endpoint alert on a cloud VM |
| --- | --- | --- |
| Defender for Cloud | Synced both ways | Not synced to Defender XDR |
| Defender XDR | Synced both ways | Not synced to Defender for Cloud |

Responding in Defender for Cloud: open the alert, **View full details**, then the **Take action** tab:

1. **Inspect resource context**: the activity logs around the alert.
2. **Mitigate the threat**: manual remediation steps.
3. **Prevent future attacks**: security recommendations to harden the resource.
4. **Trigger automated response**: run a logic app.
5. **Suppress similar alerts**: create a suppression rule for benign activity.

Set the alert to **Dismissed** when done. Hunting tables: `CloudAuditEvents` (Azure Resource Manager and Kubernetes control plane), `CloudProcessEvents`, `CloudStorageAggregatedEvents`.

> **Exam tip.** Sentinel workspace with Defender XDR integration and duplicated Defender for Cloud incidents: use the **Tenant-based Microsoft Defender for Cloud** connector, disconnect the subscription-based (legacy) connector, and turn off the rules that create incidents from these alerts.

<!-- section: defender-cloud-apps | objectives: 2.1.4 -->
## Defender for Cloud Apps

Defender for Cloud Apps detects risky behavior in connected SaaS apps (anomaly detections with a seven-day learning period for most of them), risky OAuth apps and shadow IT. Since June 2025, legacy anomaly policies are moving to a dynamic threat detection model; for example, Activity from anonymous IP address becomes Activity from a TOR IP address and Anonymous proxy activity.

| Alert | Typical response when true positive |
| --- | --- |
| Impossible travel, Activity from infrequent country | Suspend the user, mark compromised, reset the password; for a corporate VPN false positive, add and tag its IP range |
| Suspicious inbox forwarding, Suspicious inbox manipulation rule | Suspend the user, reset the password, remove the rule; check Exchange message tracking |
| Unusual file download, share or deletion (by user), Ransomware activity | Suspend the user, mark compromised, reset the password; recover files if needed |
| Misleading OAuth app name, Unusual ISP for an OAuth app | Review permissions and consenting users, ban the app or revoke its tokens |
| Activity performed by terminated user | Disable the user and the apps they still access |

Classify each alert as true positive, benign true positive (penetration test, authorized action) or false positive.

| Governance action | Scope |
| --- | --- |
| Suspend user, Require user to sign in again | Account; sign-in again revokes refresh tokens and session cookies |
| Confirm user compromised | Sets the user risk to high, which triggers Microsoft Entra ID risk policies |
| Put in user quarantine / admin quarantine, Remove external users, Make private, Apply sensitivity label, Trash | File |
| Ban app, Revoke app | OAuth app; in Microsoft 365, ban blocks the third-party app permissions |

The **Governance log** (Cloud Apps > Governance log) records every manual and automatic action, its result, and lets you retry or revert some of them. File policies retire on January 6, 2027; file protection moves to Purview DLP and auto-labeling.

> **Exam trap.** Suspend user on an account synchronized from on-premises Active Directory is reverted by the next sync. Disable the account on-premises (or with Defender for Identity) instead.

<!-- section: entra-id-protection | objectives: 2.1.5 -->
## Compromised identities in Microsoft Entra ID

Microsoft Entra ID Protection (full features with Microsoft Entra ID P2 or Microsoft Entra Suite) computes **sign-in risk** and **user risk**. In the Defender portal, filter alerts on **Product name: AAD Identity Protection**; the risky users, risky sign-ins and risk detections reports are in the Microsoft Entra admin center. Global Reader is the least privileged role to view them.

```kusto
SigninLogs
| where TimeGenerated > ago(7d)
| where RiskLevelDuringSignIn in ("medium", "high")
| project TimeGenerated, UserPrincipalName, IPAddress, Location, RiskLevelDuringSignIn, RiskState
```

| Admin action | Risk state after | Who |
| --- | --- | --- |
| Reset password (temporary password) | Remediated | Security Operator plus User Administrator |
| Require a password change | Remediated once the user changes it | Admin requests, user completes |
| Dismiss risk | Dismissed (password unchanged) | Security Operator |
| Confirm compromised | Confirmed compromised | Admin, from risky users or risky sign-ins |

After **Confirm compromised**, contain the account: request a password change, block the user if the attacker could reset it or pass MFA, revoke refresh tokens, disable compromised devices, revoke access tokens with continuous access evaluation.

Self-remediation: risk-based Conditional Access requires MFA for sign-in risk and a **secure password change** for user risk. For hybrid users, **Allow on-premises password change to reset user risk** (requires password hash synchronization) lets an on-premises change remediate the risk. Token theft detections (Anomalous token, Attacker in the Middle, Token issuer anomaly...) are no longer auto-remediated by MFA alone.

> **Exam trap.** Dismissing risk doesn't make the account safe: the password stays the same. If the account was really compromised, reset the password and revoke sessions instead.

<!-- section: defender-for-identity | objectives: 2.1.6 -->
## Defender for Identity alerts

Defender for Identity sensors on domain controllers (and AD FS, AD CS, Microsoft Entra Connect servers) detect attacks on on-premises Active Directory. Classic alerts are grouped as reconnaissance and discovery, persistence and privilege escalation, credential access, lateral movement, and other.

| Alert (classic name) | Attack |
| --- | --- |
| Account Enumeration reconnaissance (LDAP), Security principal reconnaissance (LDAP), Network-mapping reconnaissance (DNS) | Discovery |
| Suspected Kerberos SPN exposure, Suspected AS-REP Roasting attack | Offline cracking of service or user tickets |
| Suspected DCSync attack (replication of directory services) | Replication of password hashes from a non-DC |
| Suspected Golden Ticket usage, Suspected skeleton key attack | Forged tickets, domain persistence |
| Honeytoken authentication activity | Use of a decoy account |

Triage each alert: true positive, benign true positive (pen test, approved tool) or false positive; check whether the triggering computers share a role. Tuning depends on the alert format: classic alerts use **Settings > Identities > Excluded entities**, Defender-format alerts use alert tuning rules.

```kusto
IdentityLogonEvents
| where Timestamp > ago(1d)
| where ActionType == "LogonFailed"
| summarize Failures = count() by AccountUpn, DeviceName, Protocol
| where Failures > 50
```

| Remediation action | Sources |
| --- | --- |
| Disable / Enable | Active Directory, Microsoft Entra ID and several third-party identity providers |
| Force password change | Active Directory, Microsoft Entra ID |
| Revoke session | Microsoft Entra ID, Okta |
| Mark as compromised | Microsoft Entra ID |

Actions are taken from the identity page or side panel, Advanced hunting or the Action center, and require a custom unified RBAC role with **Response (manage)**. On Active Directory, the sensor on a domain controller runs them with the domain controller's local system account (**Automatically use the sensor's local system account**); sensors on AD FS, AD CS or Microsoft Entra Connect don't remediate.

<!-- section: key-points -->
## Key points

- Email remediation: Threat Explorer, Advanced hunting or AIR; Search and Purge role to approve; two-step approvals in the Action center.
- Attack disruption contains users and devices automatically; actions are reversible from the Action center.
- DLP signals became behaviors in October 2026; disable the built-in tuning rule to get alerts back.
- Insider risk alerts need data sharing turned on and an Insider Risk Management role group.
- Defender for Cloud alerts: tenant-wide in the Defender portal, Take action tab, tenant-based Sentinel connector against duplicates.
- Defender for Cloud Apps: suspend, mark compromised, reset password; governance log for every action.
- Entra ID Protection: dismiss doesn't change the password; confirm compromised then contain.
- Defender for Identity: tuning depends on alert format; remediation needs Response (manage) and runs from domain controller sensors.
