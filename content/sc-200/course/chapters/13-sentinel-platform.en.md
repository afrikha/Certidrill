Microsoft Sentinel runs on a Log Analytics workspace and is operated from the Microsoft Defender portal; after March 31, 2027 it is available only there. This chapter covers the platform settings an analyst must master: the least-privileged role for each task, how long each table keeps its data in the analytics tier, the data lake tier and the Defender XDR default tier, workbooks for dashboards, and SOC optimization recommendations that improve coverage and cut useless ingestion.

<!-- section: roles | objectives: 1.2.1 -->
## Microsoft Sentinel roles

Sentinel SIEM permissions are Azure RBAC roles. Assign them **at the resource group** that holds the workspace, so they also cover playbooks and workbooks. If you assign them on the workspace instead, assign them also on the workspace's **SecurityInsights** solution resource.

| Role | Allows |
| --- | --- |
| Microsoft Sentinel Reader | View data, incidents, workbooks, recommendations and other Sentinel resources |
| Microsoft Sentinel Responder | Reader + manage incidents (assign, change status and severity, comment) |
| Microsoft Sentinel Contributor | Responder + create and edit analytics rules, workbooks and other resources, install and update content hub solutions |
| Microsoft Sentinel Playbook Operator | List, view and manually run playbooks |
| Microsoft Sentinel Automation Contributor | Lets Microsoft Sentinel add playbooks to automation rules; not for user accounts |

Tasks that need another role:

| Task | Role |
| --- | --- |
| Create or edit playbooks | Logic App Contributor |
| Create or delete workbooks with Reader or Responder | Add **Workbook Contributor** |
| Guest user who must assign incidents | Microsoft Sentinel Responder + **Directory Reader** (Microsoft Entra role) |
| Connect a data source | Write permission on the workspace, plus what the connector requires |
| Grant Sentinel permission on a playbook resource group | Owner on that resource group |
| Restrict a team to some tables or resources | Table-level RBAC or resource-context RBAC |

Microsoft's recommended assignments: analysts get Responder (plus Playbook Operator), engineers get Contributor (plus Logic App Contributor), a service principal for automation gets Contributor. Owner, Contributor and Reader on the resource group also grant Sentinel access, far too broadly. Assignments are cumulative.

**Data lake permissions** are Microsoft Entra roles or unified RBAC, not Sentinel roles:

| Need | Permission |
| --- | --- |
| Read the data lake of every workspace | Global Reader, Security Reader, Security Operator, Security Administrator (or Global Administrator) |
| Read one other workspace in the lake | An Azure role on that workspace, for example Log Analytics Reader or Microsoft Sentinel Reader |
| Write with KQL jobs or notebooks, manage data lake jobs | Security Operator or Security Administrator (or Global Administrator) |
| Change table settings in the Defender portal | Unified RBAC **Data (manage)** (Data operations), or Log Analytics Contributor on the workspace |

> **Exam trap.** Responder can manage an incident but can't run a playbook on it: add **Playbook Operator**. Contributor can attach a playbook to a rule but can't edit the logic app: that needs **Logic App Contributor**.

<!-- section: retention | objectives: 1.2.2 -->
## Data retention: Analytics, Data lake and XDR tiers

Each table sits in a tier that decides what you can do with its data and what it costs:

| Tier | Use | Retention |
| --- | --- | --- |
| **Analytics** | Analytics rules, custom detections, advanced hunting, workbooks, playbooks, fast queries | Analytics retention 30 days to 2 years; **90 days free** for Sentinel solution tables; total retention up to 12 years |
| **Data lake** | Low-cost storage of high-volume or secondary data; KQL jobs, notebooks, scheduled jobs, summary rules | 30 days to 12 years |
| **XDR default** | Defender XDR advanced hunting tables, included in the Defender license | 30 days; not ingested into the workspace unless you extend it |

An Analytics table has two settings: **analytics retention** (hot, fully queryable) and **total retention**. By default, analytics-tier data is mirrored to the data lake; total retention beyond analytics retention is kept in the lake only. A Data lake table has a single retention value and no real-time analytics.

To change them: **Microsoft Sentinel > Configuration > Tables** (or **Data & connectors > Tables**), select the table, **Manage table**, set the tier and retention, **Save**. Not every table can move to the Data lake tier: some XDR and solution tables must stay in Analytics.

| Change | Effect |
| --- | --- |
| Lower analytics retention | Immediate; the older data stays in the lake until total retention ends |
| Lower total retention | Deletion waits 30 days, so you can revert |
| Raise total retention | Applies to data already ingested and not yet removed |
| Move a table from Analytics to Data lake | Stops alerting, advanced hunting, analytics rules and custom detections on it |

**Defender XDR tables** (`DeviceProcessEvents`, `EmailEvents`, `IdentityLogonEvents`...) keep 30 days in advanced hunting. To keep them longer, set their analytics or total retention above 30 days in the Defender portal: they are then ingested into the Sentinel workspace (ingestion is billed, storage is free up to 90 days). Choose the **Data lake tier** to keep them cheaply for compliance: they stay 30 days in advanced hunting at no extra cost and go to the lake for the rest. Resetting both values to 30 days stops ingestion.

| Requirement | Setting |
| --- | --- |
| Hunt `DeviceNetworkEvents` over 180 days with fast queries | Analytics retention 180 days |
| Keep `SecurityEvent` 7 years for audit, queried a few times a year | Short analytics retention, total retention 7 years |
| Store high-volume firewall logs only for investigations | Data lake tier |
| Keep endpoint telemetry 1 year without paying analytics storage after 90 days | Analytics 90 days, total retention 1 year |

```kusto
Usage
| where TimeGenerated > ago(30d)
| where IsBillable == true
| summarize IngestedGB = sum(Quantity) / 1000 by DataType
| order by IngestedGB desc
```

> **Exam trap.** Raising analytics retention to two years is the expensive answer to "keep for compliance". When the data is rarely queried, keep analytics retention short and extend **total** retention, or use the Data lake tier. And data only in the lake can't feed analytics rules: a KQL job must promote the results to an Analytics table first.

<!-- section: workbooks | objectives: 1.2.3 -->
## Microsoft Sentinel workbooks

Workbooks are Azure Monitor workbooks that visualize workspace data: text, parameters, KQL queries and charts.

| Task | How |
| --- | --- |
| Use a template | **Threat management > Workbooks** > **Templates** tab, check **Required data types**, **Save** (creates an Azure resource), **View saved workbook** |
| Get more templates | Install the content hub solution that contains them |
| Create from scratch | **Add workbook** > **Edit**, add text, parameters and queries (Data source **Logs**, Resource type **Log Analytics**, one or more workspaces), **Done editing**, **Save** with name, subscription and resource group |
| Customize a template copy | **Edit** on the saved workbook, or **Save as** to clone it |
| Refresh | **Refresh**, or **Auto refresh** from 5 minutes to 1 day (off by default) |
| Delete | **My workbooks** tab > **Delete** (templates can't be deleted) |

A workbook is saved in the workspace's resource group as an Azure resource, so it can have its own role assignments. Only the JSON definition is saved, never the data. Viewing needs **Workbook Reader**, creating or editing needs **Workbook Contributor** (or Microsoft Sentinel Contributor). Microsoft recommends querying **ASIM parsers** instead of raw tables, so one workbook works with every source of the same type.

Parameters make a workbook interactive. A time range parameter named `TimeRange` is used in the queries like this:

```kusto
SigninLogs
| where TimeGenerated {TimeRange}
| where ResultType != "0"
| summarize FailedSignIns = count() by bin(TimeGenerated, 1h), AppDisplayName
| render timechart
```

> **Exam trap.** A user who must only view a workbook needs Workbook Reader (or a Sentinel role), not Workbook Contributor. A workbook template shows nothing until the data types it requires are ingested: check **Required data types** before blaming permissions.

<!-- section: soc-optimization | objectives: 1.2.4 -->
## SOC optimization recommendations

**SOC optimization** (Defender portal, **SOC optimization**) gives recommendations calculated every 24 hours from your ingestion, your enabled rules and Microsoft research. It uses the standard Sentinel roles and needs the workspace onboarded to the Defender portal to include coverage from other Microsoft security services.

| Type | Observation | Suggested action |
| --- | --- | --- |
| Data value | A billable table isn't used by any analytics rule in the last 30 days, or isn't used at all, or only by Azure Monitor | Turn on analytics rule templates that use it, or move it to a cheaper plan, stop its ingestion or move it to a non-security workspace |
| Data value, unused columns (preview) | `ConditionalAccessPolicies` column of the sign-in tables isn't used | Stop ingesting the column |
| Threat-based coverage | Data or detections are missing for an attack type | Turn on rule templates, connect data sources or install a solution (**Go to Content hub**) |
| AI MITRE ATT&CK tagging (preview) | Detections without MITRE tags | Apply the suggested tactics and techniques to one rule or all rules |
| Risk-based (preview) | Coverage gaps against operational, financial, reputational, compliance or legal risks | Turn on templates or connect sources |
| Similar organizations | Tables that organizations with a similar profile ingest and you don't | Connect the data sources |

Threat-based coverage is rated **High** (over 75 % of the recommended rules active), **Medium** (30 to 74 %) or **Low** (under 30 %). The overview also shows the data ingested over the last 90 days and the value of recent optimizations.

| Status | Meaning |
| --- | --- |
| Active | Default for a new recommendation |
| In progress | Set with **Mark as in progress** |
| Completed | Set manually, or automatically when the environment change makes it irrelevant (for example a rule now uses the table) |
| Dismissed | You won't act on it; it leaves the list |

Completed and dismissed recommendations can be **reactivated**; recalculation takes up to an hour. Tables used by UEBA or by the threat intelligence matching rule never get data value recommendations. Similar-organization recommendations ignore custom tables, custom connectors and multi-source tables such as `Syslog` and `CommonSecurityLog`.

> **Exam trap.** A data value recommendation doesn't change anything by itself. If the requirement is to reduce cost on a table that no rule uses, act on it (change the plan or tier, or stop ingestion), then mark it completed. Before downgrading, check that the table isn't needed for compliance.

<!-- section: key-points -->
## Key points

- Assign Sentinel roles at the resource group. Reader views, Responder manages incidents, Contributor creates content, Playbook Operator runs playbooks.
- Data lake access uses Microsoft Entra roles: Security Reader to read, Security Operator or Security Administrator to write and manage jobs.
- Analytics tier: up to 2 years, 90 days free for Sentinel tables; total retention and the Data lake tier: up to 12 years.
- Defender XDR tables keep 30 days; raise their retention above 30 days to ingest them into Sentinel.
- Lowering total retention deletes data only after 30 days; moving a table to the data lake stops rules and hunting on it.
- Workbooks: templates saved as Azure resources; Workbook Reader to view, Workbook Contributor to edit; use ASIM parsers and parameters.
- SOC optimization: data value, coverage and similar organizations recommendations, refreshed every 24 hours, statuses Active, In progress, Completed, Dismissed.
