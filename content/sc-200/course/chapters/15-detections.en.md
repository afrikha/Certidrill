Detections turn data into alerts. In the Defender portal you choose between Defender XDR **custom detection rules** and Microsoft Sentinel **analytics rules** (scheduled, near-real-time, threat intelligence, machine learning), and you measure what they cover with the MITRE ATT&CK page. Exam questions give a requirement (frequency, data source, automatic response, tuning) and ask which rule type or which setting fits.

<!-- section: custom-detection-create | objectives: 1.4.1 -->
## Creating custom detection rules from Advanced hunting

A custom detection rule runs an advanced hunting query on a schedule; each match creates an alert and can trigger **response actions**. Microsoft now presents custom detections as the preferred way to create new rules across Microsoft Sentinel and Defender XDR data.

Two entry points: run a query in **Hunting > Advanced hunting** and select **Create detection rule** (validates the results first), or select **+ Create detection rule** on the custom detection rules list. The wizard: alert details, enrichment (entities, custom details), actions, scope, review.

**Permissions**: for Defender XDR data, **Security settings (manage)** in unified RBAC, or the Microsoft Entra Security Administrator role (Security Operator works only if RBAC is off in Defender for Endpoint; with RBAC on, it also needs the **Manage security settings** permission). Permissions are checked per data source: with manage permissions for Defender for Office 365 only, you can use the `Email*` tables but not the `Identity*` tables. For Sentinel data, **Microsoft Sentinel Contributor** on the workspace. The user also needs permissions on every device of the rule's scope.

**Query requirements**:

- Return `Timestamp` (or `TimeGenerated`) and `ReportId` from the same event; for Defender for Endpoint tables, also `DeviceId`.
- Return the impacted asset columns that map entities automatically: `DeviceId`/`DeviceName`, `AccountObjectId`/`AccountSid`/`AccountUpn`, `RecipientEmailAddress`.
- Don't filter on `Timestamp`: the service applies the lookback itself.
- A rule creates at most 150 alerts per run.

```kusto
DeviceProcessEvents
| where FileName =~ "powershell.exe"
| where ProcessCommandLine has_any ("-enc", "-EncodedCommand")
| project Timestamp, DeviceId, DeviceName, ReportId, AccountUpn, ProcessCommandLine
```

| Frequency | Lookback |
| --- | --- |
| Continuous (NRT) | Near real time |
| Every hour | 4 hours |
| Every 3 hours | 12 hours |
| Every 12 hours | 48 hours |
| Every 24 hours | 30 days |
| Custom, every 5 minutes to 14 days (Sentinel data only) | Customizable, up to 30 days depending on the frequency; under 48 hours when the rule runs more often than hourly |

A new rule first runs against the past 30 days, then at its frequency. **Continuous** requires a query on one supported table (such as `DeviceProcessEvents`, `EmailEvents`, `IdentityLogonEvents`, `SigninLogs`, `SecurityEvent`), no `join`, `union` or `externaldata`, and no comment lines. Only generally available columns can be used, `EmailEvents` is supported except its `LatestDeliveryLocation` and `LatestDeliveryAction` columns, and a `matches regex` pattern must be written as an encoded string literal. Custom detections evaluate `ingestion_time()`, so late events older than the lookback can still be included.

Alert details: unique detection name and alert title, severity, category, MITRE techniques, description and recommended actions; dynamic values with `{{ColumnName}}` (up to three columns per field); up to 20 custom details.

**Actions** (Defender data only):

| Target | Actions | Required column |
| --- | --- | --- |
| Device | Isolate device, Collect investigation package, Run antivirus scan, Initiate investigation, Restrict app execution | `DeviceId` |
| File | Allow/Block (needs Remediate permission for files), Quarantine file | `SHA1` or `SHA256` (or `InitiatingProcessSHA1`, `InitiatingProcessSHA256` for quarantine) |
| User | Mark user as compromised | `AccountObjectId`, `InitiatingProcessAccountObjectId` or `RecipientObjectId` |
| User | Disable user, Reset user authentication | A SID column (`AccountSid`, `InitiatingProcessAccountSid`, `RequestAccountSid`, `OnPremSid`); Microsoft Entra identities also need `AccountObjectId` |
| Email | Move to mailbox folder (Junk, Inbox, Deleted items), Delete email (soft or hard) | `NetworkMessageId` and `RecipientEmailAddress` |

**Scope**: all devices or specific device groups; it affects only rules on device data.

> **Exam trap.** A query with a `join` can't use the Continuous frequency, and a rule on Sentinel-only data can't use device group scoping. "Isolate the device automatically when the query matches" is a custom detection rule action, not a Sentinel analytics rule setting.

<!-- section: custom-detection-manage | objectives: 1.4.2 -->
## Managing custom detection rules

**Hunting > Custom detection rules** lists the rules with **Last run**, **Last run status**, **Next run** and **Status** (on or off). Filter with **Add filter**, search by rule name or ID. With a Sentinel workspace onboarded, the list also shows Sentinel analytics rules.

| Action | Effect |
| --- | --- |
| Run | Runs the rule now and resets the interval for the next run |
| Edit | Opens the wizard: query, frequency, alert details, actions, scope |
| Modify query | Opens the query in Advanced hunting |
| Turn off / Turn on | Stops or resumes the rule; history is kept |
| Delete | Turns off the rule and permanently removes it |
| Include or exclude from correlation | Controls whether its alerts are correlated into incidents (included by default); public preview for custom detections, available for analytics rules |

The rule details page shows **Triggered alerts** (set status and classification, link to an incident, rerun the query) and **Triggered actions**. Changes apply at the next scheduled run. Rules that meet the Continuous requirements can be moved with **Migrate now**. Rules can also be managed as code with the Microsoft Security Bicep extension (preview).

> **Exam tip.** Noisy rule, legitimate activity: edit the query to exclude it. Rule no longer wanted temporarily: turn it off rather than delete it, so it can be turned on again unchanged.

<!-- section: analytics-rule-types | objectives: 1.4.3 -->
## Analytics rule types in Microsoft Sentinel

**Microsoft Sentinel > Configuration > Analytics** has the tabs **Active rules**, **Rule templates** and **Anomalies**. Templates come with Content hub solutions.

| Type | Behavior | Customizable |
| --- | --- | --- |
| Scheduled | KQL query run every 5 minutes to 14 days on a lookback of 5 minutes to 14 days | Fully |
| Near-real-time (NRT) | Runs every minute on events ingested during the previous minute | Mostly, with limits |
| Microsoft Defender Threat Intelligence Analytics | Matches Microsoft domain and IPv4 indicators (and URL indicators in CEF `RequestURL`) with CEF, DNS, Syslog and other logs | No (read only) |
| ML Behavior Analytics (preview) | Detects anomalous SSH and RDP sign-ins | No |
| Anomaly | Machine learning baselines; writes to `Anomalies`, no alerts | Duplicate and tune |
| Microsoft security (incident creation) | Creates incidents from Microsoft product alerts | Not supported in the Defender portal |
| Fusion (Advanced multistage attack detection) | Correlated low-fidelity alerts | Disabled when onboarded to the Defender portal |

In the Defender portal, the Defender XDR correlation engine creates all incidents and replaces Fusion; Microsoft security incident creation rules are deactivated to avoid duplicates.

<!-- section: scheduled-nrt-rules | objectives: 1.4.3 -->
## Configuring scheduled and NRT rules

The wizard tabs: **General** (name, severity, MITRE ATT&CK, status), **Set rule logic**, **Incident settings**, **Automated response**, **Review and create**. Permission: Microsoft Sentinel Contributor.

```kusto
SigninLogs
| where ResultType == "50126"
| summarize Attempts = count(), Users = dcount(UserPrincipalName) by IPAddress, bin(TimeGenerated, 1h)
| where Users > 10
```

| Setting | Values and rules |
| --- | --- |
| Rule query | Must return `TimeGenerated` |
| Entity mapping | Up to 10 entity types (Account, Host, IP...) |
| Custom details / Alert details | Surface fields in the alert; override name, description, severity with field values |
| Run query every / Lookup data from the last | 5 minutes to 14 days; lookback greater than or equal to the frequency |
| Start running | Automatically, or at a specific time (preview) |
| Alert threshold | For example "Is greater than 0"; 0 means no threshold |
| Event grouping | Group all events into a single alert (default), or trigger an alert for each event |
| Suppression | Stop running query after alert is generated, up to 24 hours |
| Alert grouping | Up to 150 alerts per incident; by all entities, all alerts, or selected entities and details |

Scheduled rules wait five minutes for late data; NRT rules two minutes and query on ingestion time. **NRT limits**: up to 50 NRT rules per customer, sources with an ingestion delay under 12 hours, up to 30 single-event alerts per run (the 30th summarizes the rest). NRT queries can reference more than one table and run across workspaces.

> **Exam trap.** In the Defender portal the Defender XDR correlation engine has the last word on grouping: alert grouping settings apply only when the incident is created, and **Re-open closed matching incidents** isn't available; new alerts create a new incident.

Use **Automated response** to attach automation rules. Alert-trigger playbooks attached directly to rules are deprecated; use automation rules.

<!-- section: ti-ml-rules | objectives: 1.4.3 -->
## Threat intelligence and machine learning rules

**Microsoft Defender Threat Intelligence Analytics**: create it from **Rule templates** (search "threat intelligence"). It needs at least one supported connector, no premium license, and its details are read only. It matches indicators in `CommonSecurityLog` (`RequestURL`, `DestinationIP`), `DnsEvents`, `Syslog`, `OfficeActivity`, `AzureActivity` and ASIM DNS and network session tables. Severity ranges from Informational to High depending on the match (allowed traffic scores higher than blocked traffic); alerts matching the same indicator within 24 hours are grouped into one incident.

For your own indicators (TAXII, upload API), use the **threat intelligence matching templates** for domain, email, file hash, IP and URL indicators; they are scheduled rules on `ThreatIntelIndicators`, so you can tune them.

**ML Behavior Analytics** rules (preview) detect anomalous SSH or RDP sign-in behavior from IP, geolocation and user history. Enable them from the templates; they aren't customizable.

> **Exam tip.** "High-fidelity alerts from Microsoft's own threat intelligence with the least effort" is the Defender Threat Intelligence Analytics rule. "Alert when traffic matches indicators from our partner's TAXII feed" is a TI matching scheduled rule.

<!-- section: mitre-coverage | objectives: 1.4.4 -->
## Analyzing coverage with the MITRE ATT&CK matrix

**Microsoft Sentinel > Threat management > MITRE ATT&CK (Preview)** shows a matrix of tactics and techniques aligned to MITRE ATT&CK version 18.

| View | Shows |
| --- | --- |
| Current coverage (default) | Techniques covered by **active** scheduled and NRT rules; the legend counts active detections per technique |
| Simulated rules | Coverage you would get from detections available but not configured, such as rule templates |
| Technique details | Description, link to the MITRE knowledge base, active rules and hunting queries; in the Defender portal, recommended coverage ratios |
| View MITRE by threat scenario | Filters the matrix for one scenario |

Coverage comes from the tactics and techniques you set on each rule's **General** tab and on hunting queries; incidents inherit them from their alerts.

How to close a gap: find a technique with no active rule, check the simulated view, then enable the matching template (after installing its Content hub solution and connecting its data), or write a custom rule and map it to the technique.

> **Exam trap.** Templates don't count as coverage until a rule is created from them. A technique covered only by hunting queries has no detection.

<!-- section: anomalies | objectives: 1.4.5 -->
## Configuring anomalies

Anomaly rules build machine learning baselines, typically over a training period of 7 to 21 days, and write results to the **`Anomalies`** table instead of generating alerts. Use them as context in hunting, investigations and your own rules.

| Kind | Focus | Prerequisite |
| --- | --- | --- |
| UEBA anomalies | **Who** behaves unusually (entity baselines, peers) | Enable UEBA and anomaly detection in the workspace |
| Machine learning anomaly rules | **What** activity is unusual | Templates enabled by default |

Built-in anomaly rules are enabled by default and **can't be edited or deleted**; you can only switch their status between **Production** and **Flighting**. To tune one:

1. On the **Anomalies** tab, select the rule and **Duplicate**: the copy is named with " - Customized", is **Disabled**, and shows the **FLGT** badge.
2. **Edit** the copy: change the threshold and parameters, check the results preview.
3. Enable it: it runs in **Flighting** while the original stays in **Production**.
4. Compare the results, then switch the copy to **Production**: the original moves to Flighting automatically.

Only one customized copy per anomaly rule, and only one version in production at a time. A rule that produces too many anomalies usually has a threshold that is too low.

```kusto
Anomalies
| where TimeGenerated > ago(1d)
| where AnomalyTemplateId contains "<RuleId>"
| project TimeGenerated, RuleName, RuleStatus, Score, AnomalyReasons
```

`RuleStatus` tells whether the anomaly came from the Production or the Flighting version of the rule. The DGA anomaly detections on DNS domains were discontinued on March 8, 2026.

> **Exam trap.** Anomalies never create incidents on their own. To be alerted, write a scheduled rule that queries `Anomalies`, possibly combined with another signal.

<!-- section: key-points -->
## Key points

- Custom detection rules: from Advanced hunting, `Timestamp` + `ReportId` (+ `DeviceId`), 150 alerts per run, automatic response actions on devices, files, users and emails.
- Continuous frequency: one supported table, no join or union, no comments; custom frequency only for Sentinel data.
- Manage rules: Run resets the interval, Turn off keeps the rule, Delete removes it; edits apply at the next run.
- Scheduled: 5 minutes to 14 days, `TimeGenerated` required, 10 entity types, suppression up to 24 hours, 150 alerts per incident.
- NRT: every minute, 50 rules per customer, 30 single-event alerts.
- Defender portal: Defender XDR correlation replaces Fusion and Microsoft incident creation rules; no reopening of closed incidents.
- MITRE ATT&CK page: active scheduled and NRT rules count; simulated view shows template potential.
- Anomalies: `Anomalies` table, no alerts, duplicate once and run in Flighting before Production.
