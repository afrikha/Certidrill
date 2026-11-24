In the Defender portal, Microsoft Sentinel and Defender XDR share one incident queue and one correlation engine. This chapter covers investigating Sentinel incidents there, using Security Copilot and its agents, following multi-stage and lateral movement attacks across domains, and tracking the work with cases. Exam questions test where a feature lives, which role it needs and what each portal still supports before the Azure portal experience ends.

<!-- section: sentinel-incidents | objectives: 2.1.7 -->
## Investigating Microsoft Sentinel incidents

After March 31, 2027, Microsoft Sentinel is supported only in the Defender portal. There, Sentinel alerts and Defender XDR alerts land in **Investigation & response > Incidents & alerts > Incidents**:

- The Defender XDR engine creates and correlates every incident, including those from Sentinel analytics rules; the **Incident provider name** is always Microsoft XDR.
- Incidents created through the API, by a playbook or manually in the Azure portal aren't synchronized to the Defender portal.
- Adding or removing Sentinel alerts to or from incidents is supported only in the Defender portal: to remove an alert, add it to another incident.
- Defender incidents can take up to 5 minutes to sync with Sentinel, and automation rules up to 10 minutes to run.

Investigation steps on the incident page: read the **attack story** and graph, review the **Alerts** (with the reason they were correlated), open **Assets** and entity pages, check **Evidence and Response**, then pivot to raw data with **Go hunt** or, for incidents from analytics rules, **Run query**, which runs the rule query in Advanced hunting.

Learn now labels this incident page the **legacy** experience: incident cases (preview, see the last section) are recommended, and the legacy page stays available during the preview. On it, an incident has a single owner, a user or a group, and assigning the incident gives the same owner to all its alerts.

The Azure portal (until its retirement) adds widgets of its own:

| Feature | Detail |
| --- | --- |
| Incident timeline | Alerts and bookmarks in time order, with MITRE tactics and the system alert ID |
| Similar incidents | Up to 20 similar incidents, with a similarity reason; preview, not supported in the Defender portal |
| Top insights | Security research queries, from 24 hours before the first alert to the last alert |
| Investigation graph | Requires entity mapping in the rule; incidents up to 30 days old |
| Entities tab | Entity side pane with a seven-day timeline; full entity page for longer |

Permissions: **Microsoft Sentinel Responder** to investigate and update incidents (a guest who assigns incidents also needs Directory Reader); only the author edits a comment, and deleting comments requires **Microsoft Sentinel Contributor**. Editing comments isn't supported in the Defender portal.

Remediate with automation rules and playbooks run on the incident; running a playbook manually on an alert or an entity isn't supported in the Defender portal. Close by setting the status to **Resolved** with a classification (True positive, Informational expected activity, False positive) and a comment.

```kusto
SecurityIncident
| where TimeGenerated > ago(30d)
| summarize arg_max(TimeGenerated, *) by IncidentNumber
| where Status == "Closed"
| summarize Incidents = count() by Classification, Severity
```

> **Exam trap.** `SecurityIncident` stores one row per incident update. Use `arg_max(TimeGenerated, *) by IncidentNumber` to keep the latest state before counting, otherwise incidents are counted several times.

<!-- section: security-copilot | objectives: 2.1.8 -->
## Agentic AI and embedded Security Copilot

Copilot in Defender is available to users who have provisioned access to Security Copilot, with the relevant plugins turned on (Microsoft Defender, Defender Threat Intelligence, Natural Language to KQL). Embedded capabilities:

| Capability | Where it helps |
| --- | --- |
| Summarize incidents | The incident page: a summary of the attack and its impact |
| Guided responses | Recommended triage, containment and remediation actions for the incident |
| Script analysis, File analysis | Explains a command line or a suspicious file in the evidence |
| Device summary, Identity summary | Key information about a device or a user |
| Generate KQL queries | Advanced hunting: the threat hunting assistant (prerelease) turns natural language into KQL (**Query only** mode) or runs a multistep investigation (**Rich insights**, the default) |
| Incident report | A report of the incident and the actions taken |

**Defender Chat** (preview), opened with the **Copilot** button, answers questions in plain language with page context ("which users are involved in this incident?"). For multi-step requests it proposes a plan that you **Approve** or **Reject** before anything runs. **AI-generated analyst notes** need the tenant opt-in (**Opt-in to analyst notes** under Advanced features), a Security Copilot license and Security Data Read or Manage; they take up to 20 minutes.

Agents act autonomously within limits. The **Phishing Triage Agent** triages alerts of type **Email reported by user as malware or phish**:

1. Prerequisites: Security Copilot with provisioned Security Compute Units, Defender for Office 365 Plan 2 with unified RBAC, **Monitor reported messages in Outlook** on, the **Email reported by user as malware or phish** alert policy on.
2. Identity: a new **Microsoft Entra Agent ID** (recommended) or an existing user account, whose permissions it inherits.
3. Verdict: False Positive alerts are resolved; True Positive alerts stay open for an analyst. Each verdict comes with a natural language explanation and a graph of the agent's workflow; incidents get the **Agent** tag.
4. Feedback: **Change classification** with a reason; it teaches the agent only if you select **Use this feedback to teach the agent** (once per alert).

> **Exam trap.** The agent doesn't triage alerts already resolved by alert tuning. Disable the **Auto-Resolve - Email reported by user as malware or phish** rule and any custom tuning rule that resolves these alerts.

The same agent, extended as the **Security Alert Triage Agent**, is gaining identity and cloud alerts (preview). Agents consume Security Compute Units once their trial ends.

<!-- section: complex-attacks | objectives: 2.1.9 -->
## Investigating multi-stage and lateral movement attacks

An incident correlates alerts from endpoints, identities, email, SaaS apps, cloud resources and Sentinel data into one attack story. Its **Summary** aligns the alerts to MITRE ATT&CK, showing how far the attack progressed along the kill chain.

| Tool | Use it to |
| --- | --- |
| Incident graph | See where the attack started, how it spread over time and how far it went; **Play** replays alerts and nodes in order |
| Graph filters (severity, status, service sources), **Entity types** | Simplify large graphs |
| Alerts tab, correlation reason | Understand why alerts were linked |
| Assets tab | Devices, users, mailboxes and apps, with the number of assets in each category |
| Blast radius analysis | Possible propagation paths from a breached node to critical targets |
| Go hunt | Run queries on an entity (All Activity, Related Alerts) and link results to the incident |

**Blast radius analysis** replaces attack path analysis. It is available only to tenants onboarded to the Microsoft Sentinel data lake **before September 23, 2026**, and requires **Exposure management (read)** or higher; it shows the eight top-rated paths, up to seven hops (five for cloud, five on-premises, three for hybrid). Paths are possible routes, not proof that the attacker took them.

Hunting complements the graph. Accounts with alerts in several workloads:

```kusto
AlertEvidence
| where Timestamp > ago(7d)
| where EntityType == "User" and isnotempty(AccountObjectId)
| summarize Sources = make_set(ServiceSource), Alerts = dcount(AlertId) by AccountObjectId
| where array_length(Sources) >= 3
```

Possible lateral movement: one account signing in to many devices remotely.

```kusto
DeviceLogonEvents
| where Timestamp > ago(1d)
| where ActionType == "LogonSuccess" and LogonType in ("RemoteInteractive", "Network")
| summarize Targets = dcount(DeviceName), TargetList = make_set(DeviceName, 20) by AccountName, RemoteIP
| where Targets > 5
```

Typical sequence to recognize: phishing email (Defender for Office 365), risky sign-in (Microsoft Entra ID Protection), credential theft or reconnaissance on a domain controller (Defender for Identity), remote execution on servers (Defender for Endpoint), data exfiltration to a cloud app (Defender for Cloud Apps). Contain from the most privileged foothold outward: disable or contain the account, isolate devices, revoke sessions, then remove persistence.

> **Exam tip.** "Identify which other assets the compromised account can reach" points to blast radius analysis; "which devices did the account actually sign in to" points to a hunting query on `DeviceLogonEvents` or `IdentityLogonEvents`.

<!-- section: case-management | objectives: 2.1.10 -->
## Managing incidents with case management

**Cases** in the Defender portal track SOC work that spans incidents: an event covering several incidents, a threat hunt, IoCs and threat actors, detection logic to tune. Cases require a connected Microsoft Sentinel workspace and exist only in the Defender portal.

| Field | Values |
| --- | --- |
| Case ID | Starts at 1000, never purged |
| Status | New (default), Open, Closed; admins add custom statuses |
| Priority | Very low, Low, Medium, High, Critical |
| Assigned to | A single user |
| Due on, Description, Linked incidents | Optional |

Each case has **tasks** (name, status, priority, owner, due date; statuses New, In progress, Failed, Partially completed, Skipped, Completed), rich text **comments** with up to 10 attachments per comment (preview), and an **activity log** of audit events. You link incidents from the case or from the incident page menu, and indicators (preview); Defender Threat Intelligence projects are deprecated in favor of linking indicators to a case.

| Task | Unified RBAC | Sentinel role |
| --- | --- | --- |
| View cases, tasks, comments | Security data basics (read) | Microsoft Sentinel Reader |
| Create and manage cases, tasks, links | Alerts (manage) | Microsoft Sentinel Responder |
| Customize case statuses | Core Security settings (manage) | Microsoft Sentinel Contributor |

**Incident cases** (preview, **Cases > Incident**) are now the recommended way to work an individual incident. The case page has **Overview** (Copilot summary, attack graph), **Artifacts** (alerts, assets, investigations, evidence, activities) and **Comments & Attachments**. **Manage case** sets the assignee (user or group), severity, status, due date, tags and admin-defined custom fields; changes sync to the incident. Viewing requires **Security Data Read**; managing requires **Security Data Manage**.

> **Exam trap.** Resolving an incident case syncs the status to the incident, but the related alerts keep their own status: they aren't resolved automatically. In the legacy incident page, resolving an incident resolves all its linked active alerts.

Related incident cases can be merged; existing incident email notification rules still fire on assignment, status, severity and resolution changes.

<!-- section: key-points -->
## Key points

- Defender portal only after March 31, 2027; provider name always Microsoft XDR; API or playbook incidents don't sync.
- Microsoft Sentinel Responder investigates; Contributor deletes comments; Similar incidents and manual playbook runs on entities aren't in the Defender portal.
- `SecurityIncident` keeps every update: `arg_max` by `IncidentNumber` first.
- Copilot: summaries, guided responses, script and file analysis, KQL generation, incident reports; Defender Chat plans need approval.
- Phishing Triage Agent: Defender for Office 365 Plan 2, reported-message alerts, Agent tag, feedback taught only on request.
- Complex attacks: incident graph with Play, MITRE-aligned summary, blast radius (data lake onboarded before September 23, 2026, Exposure management read), hunting on `AlertEvidence` and logon tables.
- Cases: Sentinel workspace required, statuses New/Open/Closed plus custom, three RBAC levels.
- Incident cases: Security Data Read or Manage; resolving doesn't resolve the alerts.
