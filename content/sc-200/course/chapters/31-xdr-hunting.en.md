Threat hunting in Microsoft Defender XDR means looking for attacker activity that no alert has reported yet. The analyst writes KQL in **advanced hunting**, reads the intelligence of **threat analytics**, and, since the Microsoft Sentinel data lake and graph arrived, explores relationships between entities with **hunting graphs**, **blast radius** and the **Sentinel graph**. Exam questions show a hunting need and ask for the table, the operator that completes a query, the action available from the results, or the graph experience to use.

<!-- section: xdr-tables | objectives: 3.1.1 -->
## Choosing the right advanced hunting table

Each Defender workload feeds its own tables. Pick the table from the **source of the signal** and the **type of event**:

| Requirement | Table |
| --- | --- |
| Processes started on devices, with their command line and parent | `DeviceProcessEvents` |
| Network connections from devices | `DeviceNetworkEvents` |
| Files created, modified, renamed or deleted on devices | `DeviceFileEvents` |
| Registry changes | `DeviceRegistryEvents` |
| DLL loading | `DeviceImageLoadEvents` |
| Sign-ins on a device (interactive, RDP, network) | `DeviceLogonEvents` |
| Antivirus detections, ASR and exploit protection events, other security-control events | `DeviceEvents` |
| Device properties (OS, onboarding), network adapters | `DeviceInfo`, `DeviceNetworkInfo` |
| Vulnerabilities and software inventory | `DeviceTvmSoftwareVulnerabilities`, `DeviceTvmSoftwareInventory` |
| Email delivery and blocking (sender, recipient, verdict) | `EmailEvents` |
| Attachments, URLs in email | `EmailAttachmentInfo`, `EmailUrlInfo` |
| Actions after delivery (ZAP, manual remediation) | `EmailPostDeliveryEvents` |
| Safe Links clicks | `UrlClickEvents` |
| Authentication against Active Directory and online services (Defender for Identity) | `IdentityLogonEvents` |
| LDAP and other queries against Active Directory | `IdentityQueryEvents` |
| Domain controller events: group membership changes, password changes, account disabled | `IdentityDirectoryEvents` |
| Microsoft Entra interactive and non-interactive sign-ins | `EntraIdSignInEvents` (or the older `AADSignInEventsBeta`) |
| Microsoft Entra service principal and managed identity sign-ins | `EntraIdSpnSignInEvents` |
| Account details from Entra ID and other sources | `IdentityInfo`, `IdentityAccountInfo` |
| Activities in Office 365 and other cloud apps (Defender for Cloud Apps) | `CloudAppEvents` |
| Requests to Microsoft Graph | `GraphAPIAuditEvents` |
| Alerts from all Defender products, and the entities in them | `AlertInfo`, `AlertEvidence` |
| Automatic attack disruption actions | `DisruptionAndResponseEvents` |
| Exposure Management graph (assets and their relationships) | `ExposureGraphNodes`, `ExposureGraphEdges` |

Rules that decide answers:

- Advanced hunting covers **30 days** of Defender data. Once a Microsoft Sentinel workspace is connected to the Defender portal, its tables (`SecurityEvent`, `SigninLogs`, `CommonSecurityLog`, custom tables...) are queried in the same editor, for the analytics-tier retention of each table. Data that exists only in the **data lake** isn't available in advanced hunting: use data lake exploration.
- Defender tables are filtered on `Timestamp`; Sentinel tables on `TimeGenerated`. All data is in UTC.
- Entity tables (`DeviceInfo`, `IdentityInfo`...) are refreshed every hour with the latest full record of each entity.

> **Exam trap.** Three "logon" tables. `DeviceLogonEvents` = sign-ins **on an endpoint** (Defender for Endpoint). `IdentityLogonEvents` = authentications seen by Defender for Identity on domain controllers (Kerberos, NTLM, LDAP). `EntraIdSignInEvents` = cloud sign-ins to Microsoft Entra ID. And `AlertInfo` has one row per alert, while `AlertEvidence` has one row per entity of an alert: join them on `AlertId`.

<!-- section: kql-threats | objectives: 3.1.2 -->
## Identifying threats with KQL

A query starts from a table and pipes rows through operators. The operators the exam completes most often:

| Operator or function | Use |
| --- | --- |
| `where` | Filter rows; put time and the most selective filters first |
| `project`, `project-away` | Keep or remove columns |
| `extend` | Add a calculated column |
| `summarize ... by` | Aggregate: `count()`, `dcount()`, `make_set()`, `min()`, `max()`, `arg_max()` |
| `bin(Timestamp, 1h)` | Group times into buckets, inside `summarize ... by` |
| `ago(7d)`, `between (a .. b)` | Relative time filter, range filter |
| `arg_max(Timestamp, *)` | Latest row for each key (for example, the last record of each device) |
| `join kind=...` | Correlate two tables on a key |
| `union` | Stack the rows of several tables |
| `let` | Name a value, a list or a subquery, reused later |
| `mv-expand` | Turn each element of a dynamic array into its own row |
| `parse_json()`, `tostring()` | Read fields of a dynamic column such as `AdditionalFields` |
| `top`, `order by`, `take` | Sort and limit |

String operators:

| Operator | Matches | Case |
| --- | --- | --- |
| `==` / `=~` | The whole value | Sensitive / insensitive |
| `has` | A whole term (indexed, fastest) | Insensitive |
| `contains` | Any substring | Insensitive |
| `startswith`, `endswith` | Beginning, end of the value | Insensitive |
| `in`, `in~`, `has_any` | A list of values or terms | `in` sensitive, `in~` and `has_any` insensitive |

Join kinds:

| Kind | Result |
| --- | --- |
| `innerunique` (default) | Matching rows, with the left side deduplicated on the key |
| `inner` | Every matching combination |
| `leftouter` | All left rows, with right columns when they match |
| `leftanti` | Left rows that have **no** match on the right |
| `leftsemi` | Left rows that have a match, left columns only |

```kusto
let lookback = 1d;
DeviceLogonEvents
| where Timestamp > ago(lookback)
| where ActionType == "LogonFailed" and LogonType == "RemoteInteractive"
| summarize Failures = count(), Accounts = dcount(AccountName) by DeviceName, RemoteIP, bin(Timestamp, 1h)
| where Failures > 20
```

```kusto
EmailEvents
| where Timestamp > ago(7d) and ThreatTypes has "Phish"
| join kind=inner (UrlClickEvents | where ActionType == "ClickAllowed") on NetworkMessageId
| project Timestamp, RecipientEmailAddress, SenderFromAddress, Subject, Url
```

```kusto
DeviceProcessEvents
| where Timestamp > ago(7d)
| where FileName =~ "powershell.exe" and ProcessCommandLine has_any ("-enc", "-EncodedCommand")
| summarize arg_max(Timestamp, *) by DeviceId
```

The first query finds RDP brute force by hour, the second the recipients who clicked a phishing URL that was allowed, the third the latest encoded PowerShell command on each device.

> **Exam trap.** The default join is `innerunique`, not `inner`: it keeps one left row per key and can hide duplicates. "Devices that were onboarded but never sent a network event" is `leftanti`. And `has "power"` doesn't match `powershell`: `has` looks for whole terms, `contains` for substrings.

<!-- section: advanced-hunting | objectives: 3.1.3 -->
## Creating advanced hunting queries

Open **Investigation & response > Hunting > Advanced hunting** in the Defender portal.

- **Guided mode** builds a query without KQL (table, filters, conditions); **advanced mode** is the KQL editor. A guided query can be opened in the editor.
- The schema pane lists the tables and their columns; queries can be saved under **My queries** or **Shared queries** for the tenant, and the sample queries are a starting point.
- A query used regularly becomes a **custom detection rule** (**Create detection rule** from the editor), which runs it on a schedule and raises alerts.
- From an incident, **Go hunt** opens a prebuilt query on an entity; **Link to incident** attaches selected results to an incident.

Quotas, applied separately to manual queries and custom detections:

| Quota | Limit |
| --- | --- |
| Time range | 30 days of Defender data; Sentinel tables according to their analytics retention |
| Rows returned | 100,000 |
| Duration | 10 minutes |
| Result size | 64 MB (beyond, results are truncated) |
| CPU | Tenant budget refreshed every 15 minutes; queries are blocked when it is exhausted |

**Taking action from results.** Select rows, then **Take actions**. The query must return the columns that identify the target:

| Target | Actions | Required columns |
| --- | --- | --- |
| Devices | Isolate, collect investigation package, antivirus scan, automated investigation, restrict app execution | `DeviceId` |
| Files | Quarantine | `DeviceId` and `SHA1` or `SHA256` (or the `InitiatingProcess` versions) |
| Users | Disable user, reset user authentication | `AccountSid` (or another SID column); `AccountObjectId` for Entra ID users |
| Emails | Move to a mailbox folder, soft or hard delete, submit to Microsoft, automated investigation | `NetworkMessageId`, `RecipientEmailAddress`; delete also needs `EmailDirection` and `SenderFromAddress` |

Every action is recorded in **Action center > History**. Email actions need a role allowed to search and purge email, device actions the **Active remediation actions** permission.

> **Exam trap.** "Delete the phishing message from every mailbox, from the hunting results" fails if the query projects only `RecipientEmailAddress`: add `NetworkMessageId`, `EmailDirection` and `SenderFromAddress`. And a query that must run every hour is a custom detection rule, not a saved query.

<!-- section: threat-analytics | objectives: 3.1.4 -->
## Interpreting threat analytics

**Threat analytics** (**Threat intelligence > Threat analytics**) publishes reports by Microsoft Threat Intelligence on actors, campaigns, tools, techniques and vulnerabilities, and connects each report to **your** environment.

The dashboard has three lists: **Latest threats**, **High-impact threats** (most active and resolved alerts in your tenant) and **Highest exposure threats** (vulnerability severity and number of exploitable devices). Reports can be filtered by threat tag (Ransomware, Phishing, Activity group, Vulnerability) and category (Actor, OSINT...).

| Report tab | Use |
| --- | --- |
| Overview | Summary, impact charts (incidents, alerts), resilience charts |
| Analyst report | Full write-up: attack chain, MITRE ATT&CK techniques, recommendations, hunting guidance |
| Related incidents | Incidents in your tenant linked to the threat |
| Impacted assets | Devices, users, mailboxes, apps, cloud resources affected |
| Endpoints exposure | Exposure level and deployment status of the security updates (Defender Vulnerability Management) |
| Recommended actions | Mitigations tracked in Microsoft Secure Score (cloud-delivered protection, PUA protection, real-time protection...) |
| Indicators | IOCs of the threat |

Reading a report:

- Active alerts in **Related incidents** mean the threat is in the tenant now: start there.
- A high **Endpoints exposure** without alerts means not attacked yet but vulnerable: deploy the updates and the **Recommended actions**.
- Use the hunting guidance of the **Analyst report** in advanced hunting to look for activity that predates the detections.
- Email notifications can be configured for new or updated reports.

Viewing reports, incidents and impacted assets needs **Security data basics (read)**; exposure data and recommended actions also need **Vulnerability management (read)** or **Exposure Management (read)**.

> **Exam trap.** Recommended actions show only mitigations tracked in Secure Score; other recommendations are in the Analyst report. And a user who sees the report but not the exposure tab lacks the vulnerability management or Exposure Management read permission, not a Defender for Endpoint role.

<!-- section: hunting-graphs | objectives: 3.1.5 -->
## Creating hunting graphs and blast radius

A **hunting graph** renders a hunting scenario as nodes (devices, accounts, IP addresses, cloud resources) and edges (relationships), to find attack paths and choke points that tables hide. Prerequisites: onboarding to the **Microsoft Sentinel data lake** (graph is provisioned with it), at least **read-only access to Microsoft Security Exposure Management**, and the advanced hunting permissions.

To create one:

1. In **Advanced hunting**, select the hunting graph icon or **Create new > Hunting graph**.
2. Select **Search with Predefined scenarios**, choose a scenario and enter its inputs.
3. Adjust the filters, then **Run scenario**.

| Predefined scenario | Input |
| --- | --- |
| Attack paths to critical asset | Target critical asset |
| Paths between two entities | Start and target |
| Entity relationship map | Source entity |
| Access to key vaults, Users with access to sensitive data | Target key vault, target storage account |
| Paths to domain admins, Paths to domain compromise (DCSync) | None |
| Kerberoast paths to critical assets, AS-REP roast paths to critical assets | None |

Filters: **Show only the shortest paths**; source node (is critical, is vulnerable, is exposed to the internet); target node (has sensitive data, is vulnerable); edge type (member of, has permissions to, can authenticate as, has credentials of...); edge direction.

**Blast radius** answers "if this entity is compromised, what can the attacker reach?". In an incident graph, select a node and **View blast radius**: the graph adds the possible propagation paths from that node to critical targets, up to **seven hops**. It shows **possible** paths, not confirmed attacker activity. It requires the same data lake onboarding and Exposure Management read permission.

> **Exam trap.** The incident graph shows what happened (alerts and their entities); blast radius adds what could happen next. "Show which critical servers a compromised account could reach" is blast radius, not the alert story or a KQL query on `DeviceLogonEvents`.

<!-- section: sentinel-graph | objectives: 3.1.6 -->
## Analyzing entity relationships with the Sentinel graph

The **Microsoft Sentinel graph** is the graph analytics layer of Microsoft Sentinel: users, devices, cloud resources, data, activities and attacker actions as nodes and edges. It is enabled with the data lake and powers several experiences:

| Experience | Where |
| --- | --- |
| Incident graph with blast radius, hunting graph | Defender portal |
| Attack paths | Microsoft Security Exposure Management, Defender for Cloud |
| Data risk graph | Purview Insider Risk Management, Data Security Investigations |
| Custom graphs (preview) | Built in a Jupyter notebook with the Microsoft Sentinel extension for Visual Studio Code, published by a **graph job**, queried with **GQL** in the Defender portal |

An on-demand graph job keeps the graph 30 days; a scheduled job rebuilds it on its schedule. Custom graphs and their queries are billed on the Sentinel graph meter.

In advanced hunting, relationships are also queried with KQL on the exposure graph tables, using the graph operators `make-graph` and `graph-match`:

```kusto
ExposureGraphEdges
| make-graph SourceNodeId --> TargetNodeId with ExposureGraphNodes on NodeId
| graph-match (SourceNode)-[edges]->(TargetNode)
    where TargetNode.NodeLabel == "microsoft.compute/virtualmachines"
    project IncomingNodeLabels = SourceNode.NodeLabel
| summarize by IncomingNodeLabels
```

AI clients reach the same graph through the graph tools of the Sentinel MCP server (`find_blastradius`, `find_walkable_paths`, `find_exposure_perimeter`).

> **Exam trap.** `ExposureGraphNodes` and `ExposureGraphEdges` are advanced hunting tables that describe assets and permissions, not activity: "which identities can access this key vault" is a graph question, "who accessed the key vault yesterday" is an activity table.

<!-- section: key-points -->
## Key points

- Pick the table from the source: `Device*` (Defender for Endpoint), `Email*` and `UrlClickEvents` (Defender for Office 365), `Identity*` (Defender for Identity), `EntraIdSignInEvents`, `CloudAppEvents`, `Alert*`.
- Advanced hunting: 30 days of Defender data, Sentinel analytics-tier tables in the same editor, not lake-only data; 100,000 rows, 10 minutes, 64 MB.
- KQL: `has` (term) versus `contains` (substring); default join `innerunique`; `leftanti` for "no match"; `arg_max` for the latest row.
- Actions from results need the identifying columns (`DeviceId`, `SHA1`, `NetworkMessageId`...).
- Threat analytics: related incidents = attacked now; endpoints exposure = vulnerable; recommended actions = Secure Score mitigations.
- Hunting graph and blast radius: data lake onboarding plus Exposure Management read; blast radius shows possible paths up to seven hops.
