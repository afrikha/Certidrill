Pipelines in production must stay cheap, fast and observable. This chapter covers compute consumption, repairing Lakeflow Jobs runs, diagnosing Spark with the Spark UI and the query profile, `OPTIMIZE` and `VACUUM`, and streaming logs to Log Analytics for Azure Monitor alerts. Questions describe a symptom (a bill, a failed task, a slow stage, growing storage) and ask which tool, command or setting resolves it.

<!-- section: cluster-consumption | objectives: 4.4.1 -->
## Monitoring and managing compute consumption

Consumption is measured in **Databricks Units (DBUs)**. The risks are idle clusters left running and under-provisioned clusters that miss deadlines: match resources to the workload.

| What to watch | Where |
| --- | --- |
| CPU, memory, network, active tasks, shuffle read and write of all-purpose and job compute | **Compute** > the resource > **Metrics** tab (date picker up to the past 30 days; per node or aggregated) |
| Serverless compute for notebooks and jobs | **Query insights** (no Metrics tab) |
| SQL warehouse: running and queued queries, peak query count, running clusters | The warehouse > **Monitoring** tab |
| DBUs by SKU, job, cluster, tag or identity, across the account | System table `system.billing.usage` (prices in `system.billing.list_prices`) |
| Job runs and task runs history | `system.lakeflow` tables |

```text
SELECT usage_metadata.job_id AS job_id,
       SUM(usage_quantity)   AS total_dbus
FROM system.billing.usage
WHERE usage_metadata.job_id IS NOT NULL
  AND usage_date >= current_date() - INTERVAL 30 DAYS
GROUP BY ALL
ORDER BY total_dbus DESC;
```

Useful columns: `sku_name`, `usage_metadata.cluster_id`, `custom_tags['project']`, `identity_metadata.run_as` (who ran it), `product_features.is_serverless`. Join `usage_metadata.cluster_id` to `system.compute.clusters` to attribute DBUs to owners. A serverless run can produce several billing records: aggregate with `SUM()`.

Levers to reduce cost:

| Lever | Effect and caveat |
| --- | --- |
| Auto termination | Stops an inactive cluster (30–60 minutes typical in development); DStreams activity isn't monitored |
| Autoscaling | Adds or removes workers between a minimum and a maximum |
| Job compute instead of all-purpose compute | The cluster ends with the run |
| Tags | Propagate to billing records for chargeback; not retroactive |
| Budgets | Email when spending passes a threshold; created by an **account admin**, or by a workspace admin for the workspaces they administer (Governance Hub) |
| Warehouse sizing | Stuck at its maximum cluster count or many queued queries: raise the maximum |

> **Exam trap.** The Metrics tab doesn't exist for serverless compute: use query insights for serverless notebooks and jobs, and `system.billing.usage` with `product_features.is_serverless = true` for its cost.

<!-- section: lakeflow-jobs-troubleshooting | objectives: 4.4.2 -->
## Troubleshooting and repairing Lakeflow Jobs

A run's status is set by its **leaf tasks** (tasks with no downstream dependency):

| Status | Meaning |
| --- | --- |
| Failed | One or more leaf tasks didn't complete successfully |
| Succeeded with failures | Some tasks failed, but all leaf tasks succeeded |
| Skipped | The run didn't start: maximum concurrent runs for the job or the workspace exceeded |
| Timed Out | The run exceeded its configured maximum duration |
| Canceled | A user or a process stopped it |

To investigate: **Jobs & Pipelines** > the job > **Runs** tab. The **matrix view** shows each task's status across runs; select a red cell for the task run details (output, logs). A task failing in every run points to its code or configuration; random failures across tasks point to compute.

| Action | What it does | When |
| --- | --- | --- |
| **Repair run** | Reruns only the **unsuccessful tasks** (failed, or skipped because an upstream task failed) **and their dependents**; parameters entered override the originals for the repair | Multi-task job, cause fixed |
| **Run now** | New run of all tasks (**Run now with different parameters** overrides job parameters) | Single-task job (repair needs two or more tasks), or a full rerun |
| Stop, **Cancel runs**, **Cancel all queued runs** | Ends active or queued runs | Excessive resources or wrong data |
| **Restart run** | **Continuous** job in exponential backoff: cancels the active run, resets the retry period, starts a new run | Cause fixed, don't wait for the next retry |

Repair details the exam uses:

- Unsuccessful tasks run with the **current** job and task settings, so fix the task first (**Edit task**), then repair.
- A repaired task restarts from the beginning: if it had partially written its output, an append can duplicate data. Make tasks idempotent (overwrite or `MERGE`).
- Tasks sharing a job cluster get a new one for the repair (`my_job_cluster_v1`).
- The run state, not the disabled state, decides what is repaired; list a disabled task in `rerun_tasks` of the API request to force it.

Fixes by cause: wrong path or parameter, **Edit task**; insufficient compute, more or larger workers; Skipped runs, raise **Maximum concurrent runs** or enable **Queue** (on by default for jobs created in the UI since April 15, 2024), so that a run waits up to 48 hours instead of being skipped. Prevent with failure notifications (email, Slack, webhook) and queries on `system.lakeflow.job_run_timeline` (395 days of history).

> **Exam trap.** "Rerun the failed task and its downstream tasks, not the successful ones" is **Repair run**, not Run now. "A continuous job waits longer and longer between attempts": **Restart run**.

<!-- section: spark-troubleshooting | objectives: 4.4.3 -->
## Troubleshooting Spark jobs and notebooks

Failures come from **code**, **resource bottlenecks** (memory, CPU, network) or the **environment** (instances not acquired because of quota or spot reclamation). Start in the Spark UI (**Compute** > the cluster > **Spark UI**) with the **jobs timeline**:

| Symptom in the Spark UI | Likely cause | Fix |
| --- | --- | --- |
| One job much longer than the others | The main target | Drill into its longest stage |
| Gaps over a minute between jobs | Overloaded driver (or a cluster problem) | Larger driver; avoid pulling data to the driver |
| A stage with only one task | Not enough parallelism | Repartition the data |
| Spill on a stage | Not enough memory | Larger workers, more partitions |
| High CPU on all workers | CPU-bound | Photon, more workers |
| Large shuffle read and write | Network-bound | Filter early, broadcast small tables |
| Driver red, workers idle (blue) in server load | Driver bottleneck | Larger driver instance type |

A classic driver out-of-memory error comes from `collect()` or `toPandas()` on a large DataFrame: keep the work distributed and write results to a table instead.

**Cluster restart.** Check the **Event log** tab first (instance acquisition failures, spot reclamation, executor terminations), then restart from the **Compute** page or the CLI. A restart **terminates running jobs and resets the Spark UI history**; notebook state and cached data are lost. Schedule restarts of long-running streaming clusters so they run on current images.

```bash
databricks clusters list
databricks clusters restart 0123-456789-abcdefgh
```

> **Exam tip.** Look at the **Event log** of the compute before restarting it: a restart doesn't fix a quota or spot capacity problem.

<!-- section: cache-skew-spill-shuffle | objectives: 4.4.4 -->
## Caching, skew, spill and shuffle

Start with the **DAG** for the overall flow (shuffles are **Exchange** nodes), then drill down in the **Spark UI** (stages, task metrics) or, for SQL warehouse queries, the **query profile** (**Query History** > the query > **See query profile**: time, rows and memory per operator).

| Problem | How you see it | Fix |
| --- | --- | --- |
| Under-caching | High **Input** on stages that read the same data repeatedly | Enable the disk cache (Parquet data files cached on workers) with SSD-backed worker nodes; `cache()` a reused DataFrame |
| Over-caching | Memory needed for processing is held by cached data (**Storage** tab) | Cache only reused data; `unpersist()` when done |
| Skew | Stage **Summary Metrics**: **Max** task duration more than 50 % above the **75th percentile** | Adaptive Query Execution (AQE, on by default) handles skewed joins (tune `spark.sql.adaptive.skewJoin.*`; broadcast joins are never skew-optimized); salt hot keys; liquid clustering for a skewed stored table; `REBALANCE` hint for a skewed write |
| Spill | Non-zero **Shuffle Spill (Memory)** / **Shuffle Spill (Disk)** at the top of the stage page | More partitions (`spark.sql.shuffle.partitions` = `auto`), workers with more memory per core, fewer columns and earlier filters |
| Excessive shuffle | Large **Shuffle Read** / **Shuffle Write**; Exchange nodes in the profile | Filter before joins, broadcast joins for a small table (AQE converts below 30 MB by default), avoid needless `repartition()` |

```text
spark.conf.get("spark.databricks.io.cache.enabled")   # disk cache on?
spark.conf.set("spark.sql.shuffle.partitions", "auto")
df_lookup.cache()            # Spark cache: explicit
df_lookup.unpersist()        # release it
```

Skew comes from a hot key, nulls sent to one partition or uneven dates. Spill often comes with skew: fix the skew first.

> **Exam trap.** The **disk cache** is automatic and stores remote file data on local disks; the **Spark cache** (`cache()`, `persist()`) is explicit, uses memory and must be released with `unpersist()`.

<!-- section: optimize-vacuum | objectives: 4.4.5 -->
## Optimizing Delta tables with OPTIMIZE and VACUUM

| | `OPTIMIZE` | `VACUUM` |
| --- | --- | --- |
| Purpose | Performance: compacts small files or reclusters data | Storage cost: deletes unreferenced data files older than the retention threshold |
| Effect on readers | None; same results before and after | Time travel to versions older than the retention is lost |
| Automated by predictive optimization | Yes, on Unity Catalog managed tables | Yes, on Unity Catalog managed tables |
| Options | `WHERE` on partition columns, `ZORDER BY` (tables without liquid clustering), `FULL` (liquid clustering, Databricks Runtime 16.0+) | `RETAIN n HOURS`, `DRY RUN`, `LITE` (Public Preview, Databricks Runtime 16.4 LTS+; uses the transaction log instead of listing files), `FULL` (default) |
| Frequency | Start daily, then balance cost and performance | Regularly, on all tables |

```text
OPTIMIZE sales.silver.orders WHERE order_date >= '2026-10-01';
OPTIMIZE sales.silver.events ZORDER BY (customer_id);
OPTIMIZE sales.gold.daily_revenue FULL;

VACUUM sales.silver.orders DRY RUN;
VACUUM sales.silver.orders;
VACUUM sales.silver.orders RETAIN 336 HOURS;
VACUUM sales.silver.orders LITE;
```

Rules to remember:

- `OPTIMIZE` writes new files but doesn't delete the old ones: only `VACUUM` reclaims storage.
- The default retention threshold is **7 days**, the recommended minimum; a shorter value is blocked by a safety check (`spark.databricks.delta.retentionDurationCheck.enabled`). On Databricks Runtime 18.0 and above (12.2 LTS and above for Unity Catalog managed tables), the `deletedFileRetentionDuration` table property controls retention.
- `VACUUM` doesn't remove transaction log files (cleaned after checkpoints, 30 days by default); `LITE` requires a successful `VACUUM` within that period.
- With **liquid clustering**, `OPTIMIZE` groups data by the clustering keys; Databricks recommends liquid clustering over partitioning and `ZORDER`.
- **Predictive optimization** runs `OPTIMIZE`, `VACUUM` and `ANALYZE` on **Unity Catalog managed tables** only, on serverless jobs compute; enabled by default (Premium plan, supported regions), and managed tables inherit the account setting. Control it with `ALTER CATALOG | SCHEMA | TABLE ... ENABLE | DISABLE | INHERIT PREDICTIVE OPTIMIZATION`; history in `system.storage.predictive_optimization_operations_history`.

> **Exam trap.** "Reduce storage costs of files left by updates and deletes" is `VACUUM`, not `OPTIMIZE`. "Users must still query the table as of 10 days ago" means the retention must exceed 10 days before you vacuum.

<!-- section: log-analytics | objectives: 4.4.6 -->
## Streaming logs to Log Analytics

An Azure **diagnostic setting** sends the workspace's diagnostic logs (audit events) to a destination:

| Destination | Use |
| --- | --- |
| Log Analytics workspace | KQL queries, Azure Monitor alerts, correlation with other Azure services |
| Storage account | Archiving |
| Event hub | Streaming to a third-party tool |

Requirements and steps:

- The workspace must be on the **Premium** plan.
- Permission: Owner, Contributor, or a custom role with `Microsoft.Databricks/workspaces/assignWorkspaceAdmin/action` on the workspace.
- Portal: the Azure Databricks resource > **Monitoring** > **Diagnostic settings** > **Turn on diagnostics**, enter a name, choose the destination and the services (log categories), **Save**.
- Logs usually arrive within **15 minutes**, without a guaranteed time frame.

```powershell
New-AzDiagnosticSetting -ResourceId $databricks.ResourceId `
  -WorkspaceId $logAnalytics.ResourceId -Enabled $true `
  -Name "dbx-to-law" -Category jobs
```

| Log Analytics table | Contains |
| --- | --- |
| `DatabricksJobs` | Job creation, runs, failures, schedule changes |
| `DatabricksClusters` | Cluster creation, termination, resizing, configuration changes |
| `DatabricksNotebook` | Notebook execution, creation, modification |
| `DatabricksSQL` | SQL warehouse operations and queries |
| `DatabricksUnityCatalog` | Unity Catalog audit events (category `unityCatalog`), such as table creation, access and permission changes |
| `DatabricksWorkspace` | Workspace administrative actions |
| `DatabricksSecrets` | Secret scope and secret access |

Common columns: `TimeGenerated`, `OperationName`, `Identity`, `SourceIPAddress`, `RequestParams`, `Response`.

```kusto
DatabricksJobs
| where TimeGenerated > ago(7d)
| where Response contains "error" or Response contains "failed"
| summarize FailureCount = count() by OperationName, bin(TimeGenerated, 1h)
| order by FailureCount desc
```

> **Exam tip.** To query audit events from inside Azure Databricks, Databricks recommends the `system.access.audit` system table (Public Preview), and it highly discourages moving audit data outside the platform, because that can expose sensitive data. Choose Log Analytics when the requirement is centralized monitoring across Azure services, KQL or Azure Monitor alerts.

<!-- section: azure-monitor-alerts | objectives: 4.4.7 -->
## Configuring alerts with Azure Monitor

On Databricks logs in Log Analytics, you create a **log search alert rule**: run the query in Log Analytics, then **New alert rule**, or create it from **Azure Monitor** > **Alerts**.

| Setting | Meaning |
| --- | --- |
| Scope | The Log Analytics workspace that receives the Databricks logs |
| Query | KQL that returns the events to alert on |
| Measurement | **Table rows** or a numeric column, an aggregation type (Total, Average...) and an aggregation granularity (window) |
| Split by dimensions | Up to six columns (for example `Identity`), one alert per value |
| Threshold | Static value with an operator, or dynamic threshold |
| Frequency of evaluation | From 1 minute to 24 hours |
| Number of violations | Violations within an evaluation period before firing |
| Actions | An **action group** (email, SMS, Azure mobile app, webhook, ITSM...), reusable across rules |
| Details | Severity (Sev0 to Sev4), **Automatically resolve alerts** (stateful), **Mute actions** for a period |

```kusto
DatabricksJobs
| where TimeGenerated > ago(1h)
| where Response contains "error" or Response contains "failed"
| summarize FailureCount = count()
| where FailureCount > 5
```

Permissions to create the rule: read on the target resource, write on the resource group that holds the rule, read on the action groups it uses.

Which alerting mechanism:

| Requirement | Answer |
| --- | --- |
| Email the owner when a specific job fails | Lakeflow Jobs notifications on the job |
| Alert across workspaces and Azure services, with SMS, ITSM or escalation | Azure Monitor log search alert + action group |
| Alert when a value in a table crosses a threshold | Databricks SQL alert on a query |

> **Exam trap.** Azure Monitor alerts on Databricks events need the logs in Log Analytics first: diagnostic setting (Premium plan), then a log search alert rule. An alert rule can't read a storage account or an event hub destination.

<!-- section: key-points -->
## Key points

- Consumption: Metrics tab (classic compute), query insights (serverless), warehouse Monitoring tab, `system.billing.usage` for DBUs by job, tag or identity.
- Repair run reruns unsuccessful tasks and their dependents with current settings; Run now for single-task jobs; Restart run resets a continuous job's backoff.
- Spark UI: jobs timeline, longest stage, Summary Metrics (skew: Max vs 75th percentile), spill and shuffle metrics; query profile for SQL warehouses; check the Event log before restarting.
- `OPTIMIZE` compacts or reclusters, `VACUUM` deletes unreferenced files older than 7 days by default and limits time travel; predictive optimization automates both on Unity Catalog managed tables.
- Log streaming: diagnostic setting (Premium plan) to Log Analytics, `Databricks*` tables, results in about 15 minutes.
- Alerts: log search alert rule (query, measurement, threshold, frequency) + action group.
