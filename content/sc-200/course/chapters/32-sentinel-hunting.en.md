Microsoft Sentinel adds its own hunting tools to those of Defender XDR, and the data lake changed how they work. **Hunting queries** and **bookmarks** search the analytics tier; **KQL jobs** run queries over the data lake and promote results to the analytics tier; **summary rules** aggregate verbose logs into small tables; **notebooks** in Visual Studio Code analyze lake data at scale, next to the **Sentinel MCP server** that lets AI clients query the same data in natural language. The exam asks which tool fits a need, how to configure it and what its limits are.

<!-- section: hunting-queries | objectives: 3.2.1 -->
## Creating and monitoring hunting queries

In the Defender portal, open **Microsoft Sentinel > Threat management > Hunting** (Microsoft Sentinel leaves the Azure portal after March 31, 2027). The **Queries** tab lists the hunting queries installed with **Content hub** solutions and your custom queries, grouped by MITRE ATT&CK tactic.

To create a query: **New query**, then fill in the name, the description, the KQL **Query**, the **Entity mappings** (entity type, identifier, column) and the **MITRE ATT&CK** tactic, technique and sub-technique, and select **Create**. To adapt a built-in query, **Clone** it: only queries from a custom content source can be edited in place; a content hub query is changed at its source.

```kusto
SecurityEvent
| where TimeGenerated > ago(1d)
| where EventID == 4688
| where CommandLine has_any ("vssadmin delete shadows", "wbadmin delete catalog")
| project TimeGenerated, Computer, Account, CommandLine
```

Monitoring and working with the results:

| Feature | What it does |
| --- | --- |
| Run all queries / Run selected queries | Runs the queries and shows the number of results of each |
| Results delta, Results delta percentage | Last 24 hours compared with the previous 24–48 hours, to spot spikes |
| Favorites | Favorite queries run automatically each time the Hunting page opens |
| N/A in the Results filter | Queries whose data sources aren't connected |
| Bookmarks | Rows kept from a result with the query, tags, notes, entity and MITRE mappings; stored in the `HuntingBookmark` table |
| Incident actions | Turn bookmarks into a new incident or add them to an existing one |
| Hunts (preview) | A hunt project: hypothesis, queries, bookmarks, status, comments and metrics; analytics rules and incidents created from it are linked |
| New alert rule > Create Microsoft Sentinel alert | Turns the query into a scheduled analytics rule |

Hunting queries run on the **analytics tier**: data stored only in the data lake isn't searched by them, nor by analytics rules. **Livestream** sessions are no longer available: use KQL jobs, analytics rules (scheduled or NRT) or playbooks instead.

> **Exam trap.** A hunting query never alerts by itself. "Run this hunting query every hour and create incidents" is an analytics rule created from the query. "Keep these suspicious rows as evidence and attach them to incident 42" is a bookmark. Bookmarks exist in the Sentinel Hunting page, not in advanced hunting.

<!-- section: kql-jobs | objectives: 3.2.2 -->
## Creating and managing KQL jobs in the data lake

The data lake is queried in **Microsoft Sentinel > Data lake exploration > KQL queries**: same KQL syntax as advanced hunting, a **Selected workspaces** picker (several workspaces are combined with `union()`; `workspace("SOC-WS").SigninLogs` targets one), a time range up to 12 years, and asynchronous queries for long runs.

| Interactive lake queries | Limit |
| --- | --- |
| Rate | 30 queries per minute per tenant |
| Concurrency | 10 queries per tenant (rejected, not queued, beyond) |
| Results | 500,000 rows, 64 MB |
| Async query | 1 hour of execution; results cached 24 hours |
| Ingestion latency | About 15 minutes before new data is queryable |

A **KQL job** is a one-time or scheduled query over lake tables (and federated tables) that writes its results to a table. Its main use is to **promote** data from the data lake to the analytics tier, where analytics rules, hunting queries and advanced hunting can use it; other uses are long investigation queries, baselines and historical IOC matching.

Creating a job (**Create job** from the KQL editor, or from the **Jobs** page, or from a template):

1. Job name (unique in the tenant) and description.
2. Destination: a Sentinel workspace (analytics tier) or **System tables** (data lake tier, preview), and a **new table** or an **existing table** with the same schema.
3. The query and its source workspaces.
4. **One time** (runs on submit) or **Scheduled job**: by minute, hourly, daily, weekly or monthly, starting at least 30 minutes after creation, with an end date or indefinitely.

| Point | Value |
| --- | --- |
| New table in the analytics tier | Suffix `_KQL_CL` |
| New table in the data lake tier | Suffix `_KQL` |
| Enabled jobs per tenant | 100 |
| Concurrent job runs per tenant | 5 (a new run is rejected, not queued) |
| Query timeout | 1 hour (partial results might be promoted) |
| Output tables per job | 1 |
| Unsupported | `adx()`, `arg()`, `externaldata()`, `ingestion_time()`, user-defined functions |
| `TimeGenerated` | Overwritten when older than two days: copy the event time to another column |

```kusto
let delay = 15m;
let endTime = now() - delay;
let startTime = endTime - 1h;
let BadIPs = dynamic(["203.0.113.10", "198.51.100.7"]);
CommonSecurityLog
| where TimeGenerated between (startTime .. endTime)
| where DestinationIP in (BadIPs)
| project EventTime = TimeGenerated, DeviceVendor, SourceIP, DestinationIP, DestinationPort
```

The `delay` absorbs the ingestion latency of the lake so that late events aren't missed between two runs.

**Managing jobs**: the **Jobs** page (KQL, notebook and graph jobs) shows the status, the last and next runs and recent health issues. A KQL job's details pane offers **Enable** / **Disable**, **Edit** (the query can change but must keep the same output schema; editing a one-time job runs it again), **View history** (runs, status, rows sent) and **Delete** (permanent; a running job can't be deleted). A job whose source workspace was deleted is disabled automatically.

Permissions: a Microsoft Entra role that can write to the analytics tier and schedule jobs (Security Operator or Security Administrator), and, to create **new** analytics-tier tables, the **Log Analytics Contributor** role on the workspace for the data lake managed identity `msg-resources-<guid>`.

> **Exam trap.** A KQL job that fails to create its destination table while the analyst has every Entra role is missing the Log Analytics Contributor assignment of the `msg-resources-<guid>` managed identity. And promoting everything is the expensive answer: the analytics tier costs more, so project only the needed columns and rows.

<!-- section: summary-rules | objectives: 3.2.3 -->
## Creating and managing summary rule tables

A **summary rule** runs a KQL aggregation in the background at a fixed interval and writes the result to a custom table in the **Analytics** plan. Raw verbose logs (firewall, proxy, DNS) stay in a cheap tier; analytics rules, hunting queries and workbooks query the small summary table fast, even beyond the raw table's retention.

Create it in **Microsoft Sentinel > Configuration > Summary rules** (the workspace must be onboarded to the Defender portal for the Defender path), from scratch or from a content hub template (**Content type: Summary rules**). Microsoft Sentinel requires **Microsoft Sentinel Contributor**; in Azure Monitor terms, writing the rule and its destination table needs **Log Analytics Contributor**.

| Setting or rule | Value |
| --- | --- |
| Bin size (frequency) | 20, 30, 60, 120, 180, 360, 720 or 1,440 minutes |
| Delay | Optional wait before each run, for late-arriving data |
| Source table | Any plan: Analytics (all operators), Basic (one table, `lookup` to up to five Analytics tables), Auxiliary |
| Destination table | New or existing custom table ending in `_CL`, Analytics plan |
| Columns added | `_RuleName`, `_RuleLastModifiedTime`, `_BinSize`, `_BinStartTime` |
| Active rules | 100 per workspace |
| Not supported | `workspaces()`, `app()`, `resource()`, `ADX()`, `ARG()`, `union *`, `bag_unpack`, `narrow`, `pivot`, user-defined functions |
| Failures | 10 retries within 8 hours, then the bin is skipped; failed bins can be rerun |
| Cost | No charge for the rule; Analytics sources: result ingestion only; Basic and Auxiliary sources: data scanned plus result ingestion |

Don't add a time filter to the query: the bin defines the time range. Test the query in **Hunts** first, and keep results small (Microsoft suggests about 0.01 % of the source volume).

```kusto
CommonSecurityLog_CL
| summarize Connections = count(), FirstSeen = min(TimeGenerated), LastSeen = max(TimeGenerated)
    by SourceIP, DestinationIP, DestinationPort
```

Monitoring: turn on the **Summary Logs** category in the workspace diagnostic settings, then query `LASummaryLogs` (status `Started`, `Succeeded`, `Failed`). Each rule can be viewed, enabled, disabled, edited or deleted.

| Need | Tool |
| --- | --- |
| Continuous aggregation of a verbose table, queried by detections | Summary rule |
| Scheduled or one-time query over lake data, results promoted to the analytics tier | KQL job |
| One-off search of long-term retention of an Analytics table | Search job (`_SRCH` table) |

> **Exam trap.** A summary rule doesn't backfill: it processes recent bins only, from its start time. "Detect when an IP from the threat intelligence feed appears in 1 TB/day of firewall logs at the lowest cost" is a summary rule over the low-cost table plus an analytics rule on the summary table.

<!-- section: notebooks-mcp | objectives: 3.2.4 -->
## Hunting with notebooks and the Sentinel MCP server

**Data lake notebooks** are Jupyter notebooks run from **Visual Studio Code** with the **Microsoft Sentinel extension**, on managed Spark pools, against data lake tables. Prerequisites: data lake onboarding, a Microsoft Entra role (all workspaces) or an Azure RBAC role on the workspace, and optionally the GitHub Copilot extension for code suggestions. Sign in from the Microsoft Sentinel icon of the extension.

```text
from sentinel_lake.providers import MicrosoftSentinelProvider
data_provider = MicrosoftSentinelProvider(spark)
df = data_provider.read_table("SigninLogs")
failed = df.filter(df.ResultType != "0").groupBy("UserPrincipalName").count()
data_provider.save_as_table(failed, "FailedSignins_SPRK", write_options={"mode": "overwrite"})
```

| Point | Value |
| --- | --- |
| Pools | Small (exploration), Medium (joins, aggregations, ML), Large (deep learning, large joins) |
| Session start | A few minutes the first time |
| Interactive session timeout | 30 minutes by default, configurable |
| Interactive query timeout | 2 hours |
| Notebook job timeout, concurrency | 8 hours; 3 jobs at a time, the next ones queued |
| Libraries | Azure Synapse libraries and the Microsoft Sentinel Provider library only; no `pip install` |
| Display | 100,000 rows in VS Code |

A notebook can be scheduled as a **notebook job** from the extension to write results to the data lake or the analytics tier; the Jobs page of the Defender portal shows it read-only. Creating analytics-tier tables needs the same Log Analytics Contributor assignment of `msg-resources-<guid>` as KQL jobs.

The **Microsoft Sentinel MCP server** exposes tool collections over the data lake and Defender data to MCP clients: Security Copilot, Copilot Studio, Microsoft Foundry and Visual Studio Code (GitHub Copilot chat in agent mode). It is hosted by Microsoft and authenticates with Microsoft Entra ID.

| Collection | Server URL |
| --- | --- |
| Data exploration | `https://sentinel.microsoft.com/mcp/data-exploration` |
| Triage | `https://sentinel.microsoft.com/mcp/triage` |
| Security Copilot agent creation | `https://sentinel.microsoft.com/mcp/security-copilot-agent-creation` |

Connecting Visual Studio Code:

1. **Ctrl+Shift+P**, `MCP: Add Server`, choose **HTTP (HTTP or Server-Sent Events)**.
2. Enter the collection URL and a **Server ID**, then choose all workspaces or the current one.
3. **Allow** the authentication with an account that has at least **Security Reader**.
4. Open the chat in **Agent mode** and check the tools under **Configure Tools**.

| Data exploration tool | Use |
| --- | --- |
| `list_sentinel_workspaces` | Lists workspace names and IDs; run it first |
| `search_tables` | Finds relevant lake tables and returns their schema |
| `query_lake` | Runs one KQL query on the lake (focused retrieval, not bulk export) |
| `analyze_user_entity`, `analyze_url_entity`, `get_entity_analysis` | AI verdict on a user (7-day window at most) or a URL; needs **Security Copilot Contributor** and consumes SCUs |
| `find_blastradius`, `find_walkable_paths` and other graph tools (preview) | Graph questions; need Exposure Management read access |

Custom MCP tools can also expose your saved advanced hunting KQL queries to agents, for deterministic workflows.

> **Exam trap.** Security Reader is enough to list and call the MCP tools, but the entity analyzer also needs Security Copilot Contributor. And "export six months of sign-ins for offline analysis" is a KQL job or a notebook, not `query_lake`.

<!-- section: key-points -->
## Key points

- Hunting queries: New query with entity and MITRE mappings, Results delta, Favorites, bookmarks to incidents, Hunts; analytics tier only; no more livestream.
- KQL jobs: promote lake data to the analytics tier (`_KQL_CL`), one-time or scheduled, 100 enabled jobs, 5 concurrent runs, 1-hour timeout; `msg-resources-<guid>` needs Log Analytics Contributor for new tables.
- Summary rules: bins of 20 to 1,440 minutes, Analytics `_CL` destination, any source plan, 100 rules per workspace, monitored in `LASummaryLogs`.
- Notebooks: VS Code with the Microsoft Sentinel extension, Spark pools, `MicrosoftSentinelProvider`, notebook jobs.
- Sentinel MCP server: collection URLs, `MCP: Add Server` over HTTP, Security Reader minimum; `list_sentinel_workspaces` first.
