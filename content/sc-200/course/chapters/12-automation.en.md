Automation is where SC-200 mixes products the most. In Defender XDR, automated investigation and response (AIR) remediates threats according to the automation level of each device group, and automatic attack disruption contains users and devices during an attack. In Microsoft Sentinel, automation rules triage incidents and alerts without code and run playbooks, which are Azure Logic Apps workflows. The exam asks which mechanism fits a requirement, which setting allows or blocks an automatic action, and which permission is missing when automation fails.

<!-- section: air | objectives: 1.1.7 -->
## Automated investigation and response

AIR examines alerts and remediates the evidence it judges malicious, which reduces the alert volume the SOC handles by hand.

| Step | What happens |
| --- | --- |
| Trigger | An alert fires and an incident is created; later alerts on the same threat join the incident and the investigation |
| Scope expansion | Other devices where the same threat or an incriminated entity appears are added. From 10 devices for one entity, the expansion itself needs approval |
| Verdict | Each piece of evidence is **Malicious**, **Suspicious** or **No threats found** |
| Remediation | Actions such as quarantine a file, stop a service, remove a scheduled task. They run automatically or wait for approval, depending on the device group's automation level |
| Tracking | **Action center**: **Pending** tab (approve or reject) and **History** tab (completed actions, which can be undone) |

Rules to remember:

- A pending action not approved within 7 days times out, which counts as a rejection.
- For **email and Office content**, AIR can be triggered by alerts, but no remediation is applied automatically: actions wait for approval in the Action center.
- Prerequisites for the full Defender XDR experience: Microsoft 365 E5 (or an equivalent bundle), Defender for Endpoint and Defender Antivirus configured, Defender for Office 365 configured, Defender for Identity and Defender for Cloud Apps integrated. Configuring it requires Security Administrator or higher.
- An **Allow** indicator makes AIR ignore a bad verdict; a **Block** indicator makes AIR treat the item as bad. Automation folder exclusions make AIR skip folders.
- Approving actions requires the **Active remediation actions** permission (Security operations) in a Defender for Endpoint role, or its equivalent in unified RBAC.

**Change in 2026.** Microsoft Learn states that since September 1, 2026, Defender for Endpoint AIR no longer runs as a separate investigation experience and can no longer be triggered manually: its detection and response capabilities run automatically as part of the default antivirus protection stack, and a full antivirus scan replaces an on-demand investigation. The automation levels of device groups still decide whether remediation is automatic or pending.

> **Exam trap.** If remediation actions sit in the **Pending** tab, the fix is the automation level of the device group (Full), not a new role for the analyst. If they never appear at all, check that the device group isn't set to **No automated response**.

<!-- section: attack-disruption | objectives: 1.1.8 -->
## Automatic attack disruption

Attack disruption correlates signals from endpoints, identities, email and SaaS apps into a high-confidence incident, identifies the assets the attacker controls and contains them automatically, for example during ransomware or business email compromise. The SOC then investigates and releases the assets.

| Action | Product that performs it |
| --- | --- |
| Contain device, contain IP, isolate device | Defender for Endpoint |
| Contain user | Defender for Endpoint |
| Disable user (Active Directory) | Defender for Identity, through the sensor on a domain controller |
| Revoke user session, suspend user | Microsoft Entra ID |
| Disrupt a compromised OAuth app | Defender for Cloud Apps |
| Suspend user in Okta, attach deny policy to an AWS user (preview) | Microsoft Sentinel, with the provider's connector on a workspace connected to the Defender portal |

Prerequisites that the exam tests:

| Product | Requirement |
| --- | --- |
| Defender for Endpoint | Device discovery set to **Standard discovery** (for Contain device); automation level **Full** recommended on device groups; Sense agent 10.8470 or later for Contain user |
| Defender for Identity | Audit policies on domain controllers; the action account is the domain controller's **LocalSystem** by default; a sensor on the domain controller where the account is disabled |
| Defender for Cloud Apps | Microsoft 365 connected with the **Microsoft Office 365** connector, all options selected |
| Defender for Office 365 | Mailboxes in Exchange Online, with mailbox auditing of MailItemsAccessed, UpdateInboxRules, MoveToDeletedItems, SoftDelete and HardDelete |

Disruption is on by default. You don't switch it on; you **exclude** assets in **Settings > Microsoft Defender XDR > Automated response**:

| Exclude | How |
| --- | --- |
| A user account (for example a break-glass account) | **Identities** > **Add user exclusion** |
| Devices | **Devices** > **Device groups**: set the group's automation level to **No automated response** (this also stops AIR actions on it) |
| IP addresses | **Devices** > **Exclude IP**: addresses, ranges or subnets |
| Some controls for some devices (preview) | **Policy application** rule on a dynamic tag |

Excluding devices requires Security Administrator, or Security Operator or **Core security settings (manage)** with unified RBAC. Security Readers can only view exclusions. Opting out entirely requires a support case; Microsoft recommends exclusions instead.

In the incident queue, disrupted incidents carry an **Attack Disruption** tag; the incident page shows a yellow banner and the asset status (account disabled, device contained). Every action is recorded in the Action center and can be undone by the SOC.

> **Exam trap.** A process that automatically re-enables accounts (for example a script that enforces "all employees are enabled") can undo the disruption of a compromised account. And attack disruption acts on devices whatever the Defender Antivirus state: active, passive or EDR in block mode.

<!-- section: device-groups | objectives: 1.1.9 -->
## Device groups, permissions and automation levels

**Device groups** (Settings > Endpoints > Permissions > Device groups > **Add device group**) serve three purposes: limit which analysts see which devices, set the automation level, and scope settings such as indicators and notification rules.

| Wizard page | Content |
| --- | --- |
| General | Unique name, **automation level**, description |
| Devices | Matching rule on device name, domain, tag and OS platform (all conditions must match; up to 10 values per property, combined with OR) |
| Preview devices | Up to 10 matching devices |
| User access | Microsoft Entra groups that already have a role |

| Rule | Detail |
| --- | --- |
| Overlap | A device that matches several groups joins only the **highest-ranked** one (rank 1 is highest); promote or demote groups to change it |
| Default group | **Ungrouped devices**: can't be deleted or re-ranked, but its automation level and user access can change |
| Access | A group with no Entra group assigned is visible to every user with portal access |
| Limit | 2,000 device groups per tenant |
| Propagation | Several minutes, sometimes several hours |

The automation levels:

| Level | Remediation |
| --- | --- |
| Full - remediate threats automatically | Automatic; actions appear in History. Recommended, and the default for tenants created since August 16, 2020 |
| Semi - require approval for all folders | Every action pending |
| Semi - require approval for core folders | Pending for files in system folders such as `\windows\*`, automatic elsewhere |
| Semi - require approval for non-temp folders | Automatic only in temporary folders such as `\users\*\downloads\*` or `\windows\temp\*`, pending elsewhere |
| No automated response | No automated investigation and no remediation; not recommended |

**Permissions.** Defender for Endpoint roles (Settings > Endpoints > Roles > **Add role**) combine permissions and are assigned to Entra groups, then linked to device groups:

| Permission | Allows |
| --- | --- |
| View data | Security operations data, Defender Vulnerability Management data |
| Active remediation actions | Response actions, approve or dismiss pending actions, manage indicators |
| Alerts investigation | Manage alerts, start investigations, run scans, collect investigation packages, manage device tags |
| Manage security settings in Security Center | Alert suppression, automation folder exclusions, onboarding, email notifications, indicators |
| Manage portal system settings | Automated file uploads, roles and device groups (only in the default administrator role) |
| Live response capabilities | **Basic** (read-only commands, download files) or **Advanced** (upload files, run scripts from the library) |

Since February 16, 2025, new Defender for Endpoint customers only have the **Microsoft Defender XDR unified RBAC** model; existing customers keep their Defender for Endpoint roles until they move. In unified RBAC, custom roles combine permission groups (Security operations, Authorization and settings, Data operations) and are assigned with a scope of data sources and device groups.

> **Exam trap.** An analyst who must collect investigation packages but not run scripts needs **Alerts investigation**, not **Live response capabilities: Advanced**. Least privilege usually means the narrower permission on the analyst's device group only.

<!-- section: automation-rules | objectives: 1.1.10 -->
## Automation rules in Microsoft Sentinel

Automation rules are created in **Microsoft Sentinel > Configuration > Automation** (or from the **Automated response** tab of an analytics rule, or from an incident). They need **Microsoft Sentinel Contributor**.

| Element | Values |
| --- | --- |
| Trigger | **When incident is created**, **When incident is updated**, **When alert is created** |
| Conditions | Incident properties with operators (equals, contains, starts with, ends with and their negations); on update also **changed**, **changed from**, **changed to**, **added** and **Updated by**; entity properties on incident triggers |
| Actions | Run playbook, change status (with closing reason and comment), change severity, assign owner, add tag, add task |
| Order | A number; rules of one trigger run sequentially in that order, never in parallel. Create rules run before update rules |
| Expiration | Optional date after which the rule is disabled |

Rules to remember:

- The alert trigger works for alerts of **Scheduled**, **NRT** and **Microsoft security** analytics rules, with the analytics rules as the only condition.
- In the Defender portal, Sentinel's incident creation rules must be disabled: incidents come from Defender XDR correlation. Alert-trigger automation for Defender XDR alerts isn't available. Several changes to one incident within 5 to 10 minutes reach Sentinel as one update.
- **Updated by** distinguishes a change made by a user, an application, a playbook, another automation rule, AIR or alert grouping: use it to avoid loops.
- Two rules with the same order number run in random order.
- Automation rules export to ARM templates for other workspaces.

| Requirement | Answer |
| --- | --- |
| Close the incidents of a known pentest for two weeks | Automation rule, create trigger, condition on the analytics rule or entity, change status to Closed, expiration date |
| Give every new incident from one rule a checklist | Automation rule with **Add task** |
| Raise severity when a VIP account appears | Automation rule with an entity condition and **Change severity** |
| Assign incidents of many analytics rules to one team | One automation rule whose condition lists the rules |
| Notify a Teams channel when an incident is closed | Update trigger, condition "Status changed to Closed", action **Run playbook** |

> **Exam trap.** "Minimize administrative effort" and an action available in the list (status, severity, owner, tag, task) means an automation rule. A playbook is the answer only when the action needs a connector or several steps.

<!-- section: playbooks | objectives: 1.1.11 -->
## Microsoft Sentinel playbooks

A playbook is a Logic Apps workflow that starts with a Microsoft Sentinel trigger. Create it in **Automation** > **Create** > **Logic App playbook**, from a template (content hub solutions and the playbook templates gallery) or empty.

| Choice | Detail |
| --- | --- |
| Trigger | **Incident** (incident with its alerts and entities), **alert** or **entity**. An incident playbook runs from incident-trigger automation rules, an alert playbook from alert-trigger automation rules; an entity playbook runs manually on an entity, for example during hunting |
| Plan | **Consumption** (per-trigger templates) or **Standard** (Blank playbook; private endpoints and virtual network integration for protected resources) |
| Authentication to Sentinel | **Managed identity** (recommended), service principal or OAuth user |

The permissions are the most tested part:

| Who | Needs | For |
| --- | --- | --- |
| Engineer who writes the playbook | **Logic App Contributor** (Consumption) or a Logic Apps Standard role | Create and edit the workflow |
| Analyst who runs it manually | **Microsoft Sentinel Playbook Operator** | Run a playbook on an incident, an alert or an entity |
| Playbook's managed identity | **Microsoft Sentinel Responder** on the workspace (update incidents), Reader if it only reads | Act on Sentinel |
| Sentinel service account | **Microsoft Sentinel Automation Contributor** on the playbook's resource group, granted with **Manage playbook permissions** by an **Owner** | Let automation rules run the playbook |

In the designer, outputs of the trigger (incident ARM ID, entities, custom details) are picked from **Dynamic content**. An entity playbook run outside an incident receives a null incident ARM ID: test it with a condition before using it. Run history is on the logic app's page.

> **Exam trap.** The playbook is listed but the automation rule fails to run it: Sentinel's service account has no permission on the playbook's resource group. Giving the analyst Logic App Contributor doesn't fix it; an Owner must grant **Manage playbook permissions**.

<!-- section: key-points -->
## Key points

- AIR remediates according to the device group automation level; pending actions are approved in the Action center within 7 days. Email remediation always waits for approval.
- Attack disruption is on by default: exclude users in Automated response > Identities, devices through **No automated response**, IPs with Exclude IP.
- Device groups: highest rank wins, Ungrouped devices can't be deleted, 2,000 per tenant; Full automation is recommended.
- New tenants since February 2025 use unified RBAC; Defender for Endpoint roles map permissions to Entra groups and device groups.
- Automation rule = trigger + conditions + ordered actions + optional expiration, no code; playbook = Logic Apps for connectors and multi-step logic.
- Playbook Operator runs, Logic App Contributor edits, Automation Contributor lets Sentinel run playbooks, the managed identity needs Responder.
