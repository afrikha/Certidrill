Monitoring starts with knowing what "normal" looks like (a baseline), then picking the right source for each metric, reading the numbers correctly and alerting on them. Exam questions name a symptom or a monitoring need and an offering, and ask which tool, view or metric answers it with the least effort: Azure Monitor, DMVs, Query Store, Extended Events or database watcher.

<!-- section: baseline | objectives: 3.1.1 -->
## Operational performance baseline

A **baseline** is a set of measurements captured while the workload behaves normally. Without it, "CPU at 70 %" means nothing: you can't tell a regression from a usual peak.

How to build one:

1. Choose the metrics: CPU, data I/O, log write, memory, workers and sessions, storage, wait statistics, top queries by duration and CPU, batch requests per second.
2. Capture over a **representative period** covering business peaks, month-end processing, batch windows and maintenance jobs: not one quiet afternoon.
3. Store the data beyond the built-in retention of the source (export it to Log Analytics, a table or a data store).
4. Capture again after every significant change (new release, scaling, migration, compatibility level change) and compare.
5. Set alert thresholds from the baseline, not from guesses.

| Source | Granularity | Retention | Use in a baseline |
| --- | --- | --- | --- |
| `sys.dm_db_resource_stats` (each database) | 15 seconds | About 1 hour | Short-term detail, current state |
| `sys.resource_stats` (in `master` of the logical server) | 5 minutes | About 14 days | Two-week history per database |
| `sys.elastic_pool_resource_stats` (in `master`, `dbmanager` role) | 15 seconds, one row per pool | About 14 days | Elastic pool history |
| Azure Monitor platform metrics | 1 minute | 93 days | Trends, alerts, dashboards |
| Query Store | Configurable interval | Configurable (size and age) | Query-level baseline: compare plans and durations before and after a change |
| Performance Monitor (SQL Server on VM) | Configurable | What you keep | OS and SQL Server counters |

> **Exam tip.** "Compare query performance before and after upgrading the compatibility level" is a Query Store baseline: capture with the old level, switch, then compare (Query Store's Regressed Queries report). For resource consumption over the last two weeks, query `sys.resource_stats`; for the last hour, `sys.dm_db_resource_stats`.

<!-- section: metric-sources | objectives: 3.1.2 -->
## Sources of performance metrics

| Source | Offerings | What it gives |
| --- | --- | --- |
| Azure Monitor metrics | Azure SQL Database, elastic pools, SQL Managed Instance | Platform metrics without configuration: CPU percentage, Data IO percentage, Log IO percentage, DTU percentage, Workers percentage, Sessions percentage, Data space used, Deadlocks, Failed connections, Blocked by Firewall |
| Diagnostic settings (resource logs) | Azure SQL Database, SQL Managed Instance | Categories sent to Log Analytics, storage or Event Hubs: `SQLInsights`, `AutomaticTuning`, `QueryStoreRuntimeStatistics`, `QueryStoreWaitStatistics`, `Errors`, `DatabaseWaitStatistics`, `Timeouts`, `Blocks`, `Deadlocks`, and metric groups such as `Basic` |
| Dynamic management views (DMVs) | All | Real-time engine state: requests, sessions, waits, memory, I/O, index usage |
| Query Store | All (on by default in Azure SQL Database and SQL Managed Instance) | Query text, plans, runtime and wait statistics over time |
| Extended Events | All | Detailed event capture: statements, errors, deadlocks, waits |
| Intelligent Insights | Azure SQL Database, SQL Managed Instance | AI-based detection of performance degradation, through the `SQLInsights` log |
| Database watcher (preview) | Azure SQL Database, SQL Managed Instance | DMV data collected into Azure Data Explorer or Fabric, with dashboards |
| Performance Monitor counters, Azure Monitor Agent | SQL Server on Azure VM | OS counters (`% Processor Time`, `Avg. Disk sec/Read`) and SQL Server counters (`Batch Requests/sec`, `Page life expectancy`), sent to Log Analytics with a data collection rule |
| `sys.dm_os_performance_counters` | All (on Basic, S0, S1 and pooled Azure SQL databases, only the server admin, the Microsoft Entra admin or `##MS_ServerStateReader##`) | SQL Server counters from T-SQL |

Choose by need:

| Need | Source |
| --- | --- |
| Alert when CPU exceeds 80 % for 10 minutes | Azure Monitor metric alert |
| Keep query and wait data for a year and query it with KQL | Diagnostic settings to a Log Analytics workspace |
| See which queries run right now and what they wait on | DMVs (`sys.dm_exec_requests`) |
| Find the query whose plan changed last Tuesday | Query Store |
| Capture every error 1205 or every statement longer than 5 seconds | Extended Events |
| Monitor CPU, memory and disk of the SQL Server VM itself | Azure Monitor metrics of the VM, VM insights, Azure Monitor Agent |

> **Exam trap.** Platform metrics are collected automatically and kept 93 days; **resource logs** (query statistics, waits, errors, Intelligent Insights) exist only after you create a **diagnostic setting** that sends them somewhere.

<!-- section: interpret-metrics | objectives: 3.1.3 -->
## Interpreting performance metrics

Every percentage of Azure SQL Database and elastic pools is **relative to the limit of the compute size** (or pool), not to the hardware.

| Observation | Interpretation | Usual action |
| --- | --- | --- |
| `avg_cpu_percent` near 100 % | CPU-bound: inefficient plans, missing indexes or real growth | Tune top CPU queries first, then scale up |
| `avg_data_io_percent` near 100 %, `PAGEIOLATCH_*` waits | Data reads exceed the I/O limit: scans, memory too small for the working set | Add indexes, more memory (larger compute size) |
| `avg_log_write_percent` near 100 %, `WRITELOG` or log rate governor waits | Log write throughput limit reached: large batch inserts or index rebuilds | Batch the writes, scale up, consider Business Critical or Hyperscale |
| `max_worker_percent` near 100 %, error 10928 | Worker limit: often caused by **blocking** that piles up requests | Fix blocking first; scale up only if needed |
| DTU percentage high | DTU % = the **highest** of CPU %, data I/O % and log write % | Look at the three to find which resource drives it |
| `LCK_M_*` waits | Blocking on locks | Find the head blocker, shorten transactions |
| `PAGELATCH_*` waits with `wait_resource` starting with `2:` | `tempdb` contention | Reduce temporary object churn |
| `RESOURCE_SEMAPHORE` waits | Queries waiting for memory grants | Fix bad estimates, add memory |
| `CXPACKET` / `CXCONSUMER` | Parallelism | Review MAXDOP and costly parallel plans before changing anything |
| `SOS_SCHEDULER_YIELD` | CPU pressure | Same as high CPU |

```text
-- Current hour, one database
SELECT end_time, avg_cpu_percent, avg_data_io_percent,
       avg_log_write_percent, max_worker_percent, max_session_percent
FROM sys.dm_db_resource_stats ORDER BY end_time DESC;

-- Last 14 days, run in master
SELECT start_time, database_name, avg_cpu_percent, avg_data_io_percent
FROM sys.resource_stats
WHERE database_name = 'Sales' ORDER BY start_time DESC;

-- Top waits of the database (Azure SQL Database)
SELECT TOP (10) wait_type, wait_time_ms, waiting_tasks_count
FROM sys.dm_db_wait_stats ORDER BY wait_time_ms DESC;
```

In SQL Server and Managed Instance, cumulative waits come from `sys.dm_os_wait_stats` (since the last restart). Reading these views needs `VIEW DATABASE STATE` (database) or `VIEW SERVER PERFORMANCE STATE` (server, through `##MS_ServerStateReader##` in Azure SQL Database).

> **Exam trap.** A short CPU spike isn't a reason to scale. Compare to the baseline: sustained values near the limit, with queries waiting on that resource, justify a change. And high workers with low CPU points to blocking, not to a lack of compute.

<!-- section: configure-monitoring | objectives: 3.1.4 -->
## Configuring and monitoring activity and performance

**Azure Monitor alerts**:

| Alert type | Based on | Example |
| --- | --- | --- |
| Metric alert | A platform metric, threshold or dynamic thresholds | CPU percentage greater than 80 % on average over 15 minutes |
| Log search alert | A KQL query on a Log Analytics workspace | More than 5 deadlocks in the `AzureDiagnostics` table in 1 hour |
| Activity log alert | Control plane events, Resource Health | Database scaled, or became unavailable |

Each alert rule calls an **action group** (email, SMS, push, webhook, Azure Function, Logic App, runbook, ITSM).

```bash
az monitor metrics alert create --name sql-cpu-high --resource-group RG1 \
  --scopes /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/RG1/providers/Microsoft.Sql/servers/sql-contoso/databases/Sales \
  --condition "avg cpu_percent > 80" --window-size 15m --evaluation-frequency 5m \
  --action ag-dba-team

az monitor diagnostic-settings create --name sales-to-law \
  --resource /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/RG1/providers/Microsoft.Sql/servers/sql-contoso/databases/Sales \
  --workspace law-contoso \
  --logs '[{"category":"QueryStoreRuntimeStatistics","enabled":true},{"category":"Deadlocks","enabled":true}]' \
  --metrics '[{"category":"Basic","enabled":true}]'
```

Other monitoring tools:

| Tool | Where | Use |
| --- | --- | --- |
| Query Performance Insight | Azure portal, Azure SQL Database | Top resource-consuming and long-running queries, built on Query Store |
| Metrics explorer | Azure portal | Charts of platform metrics, pinned to dashboards |
| Activity Monitor | SSMS, SQL Server only | Live processes, waits, data file I/O, recent expensive queries; needs `VIEW SERVER STATE`, plus `CREATE DATABASE`, `ALTER ANY DATABASE` or `VIEW ANY DEFINITION` for the Data File I/O section |
| Query Store reports | SSMS | Regressed queries, top resource consumers, forced plans |
| XEvent Profiler | SSMS | Quick live trace with Extended Events |

**Activity** (who is connected, what is running):

```text
SELECT s.session_id, s.login_name, s.host_name, r.status, r.command,
       r.wait_type, r.blocking_session_id, r.cpu_time, t.text
FROM sys.dm_exec_sessions AS s
JOIN sys.dm_exec_requests AS r ON r.session_id = s.session_id
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) AS t
WHERE s.is_user_process = 1;
```

<!-- section: database-watcher | objectives: 3.1.5 -->
## Monitoring with database watcher

**Database watcher** is a managed monitoring solution for **Azure SQL Database** (single databases, elastic pools) and **SQL Managed Instance**. It collects data from more than 70 catalog views and DMVs, grouped into datasets, and stores it in a data store you own. It isn't for SQL Server on Azure VMs.

> **Exam tip.** Database watcher is in **preview** and won't reach general availability. Since **November 9, 2026** you can't create or edit watchers, and on **April 30, 2027** existing watchers stop collecting data. Microsoft points to Database Hub in Microsoft Fabric as the replacement. The exam objective remains, so know how it works.

| Component | Detail |
| --- | --- |
| Watcher | The Azure resource that collects data; it isn't started automatically after creation |
| Data store | An Azure Data Explorer cluster (or a free cluster), or Real-Time Analytics in Microsoft Fabric |
| SQL targets | Databases, elastic pools, managed instances; up to **100 targets per watcher**, 20 watchers per subscription; any subscription of the same tenant |
| Dashboards | Azure Workbooks: estate view (CPU heatmaps, top queries) and per-resource views (sessions, waits, Query Store, backups, SQL Agent jobs, geo-replication) |
| Queries | KQL or T-SQL on the data store; Power BI, Grafana, Excel |
| Alerts | Azure Monitor log search alerts; not available with Real-Time Analytics or a free cluster |
| Cost | Watchers and dashboards are free; you pay for the data store, alerts and cross-region bandwidth |

Setup order:

1. Create the watcher and choose the data store.
2. Add the SQL targets.
3. Grant the watcher's **managed identity** access to the data store and to each target. On a logical server, create a Microsoft Entra login for it and add it to `##MS_ServerPerformanceStateReader##`, `##MS_DefinitionReader##` and `##MS_DatabaseConnector##`. On a managed instance, grant `CONNECT SQL`, `CONNECT ANY DATABASE`, `VIEW ANY DATABASE`, `VIEW ANY DEFINITION`, `VIEW SERVER PERFORMANCE STATE`, and `SELECT` on some `msdb` tables.
4. For private connectivity, create **managed private endpoints** and have the resource owner approve them; otherwise allow Azure services on the logical server, or open the managed instance public endpoint (TCP 3342) to `AzureCloud`.
5. **Start** the watcher.

The watcher prefers Microsoft Entra authentication; SQL authentication stores credentials in Key Vault. Granting more permissions than needed makes the watcher disconnect, and a DENY can stop collection.

```text
-- In master of the logical server, for the watcher identity wch-contoso
CREATE LOGIN [wch-contoso] FROM EXTERNAL PROVIDER;
ALTER SERVER ROLE ##MS_ServerPerformanceStateReader## ADD MEMBER [wch-contoso];
ALTER SERVER ROLE ##MS_DefinitionReader## ADD MEMBER [wch-contoso];
ALTER SERVER ROLE ##MS_DatabaseConnector## ADD MEMBER [wch-contoso];
```

<!-- section: extended-events | objectives: 3.1.6 -->
## Monitoring with Extended Events

Extended Events (XEvents) is the lightweight event-capture engine that replaces SQL Trace and SQL Server Profiler. A **session** combines events, actions, predicates and targets.

| Element | Role | Examples |
| --- | --- | --- |
| Event | What happened | `sql_statement_completed`, `rpc_completed`, `sql_batch_completed`, `error_reported`, `xml_deadlock_report`, `blocked_process_report`, `wait_info` |
| Action | Extra data added to the event | `sql_text`, `session_id`, `client_app_name`, `username`, `query_hash` |
| Predicate | Filter evaluated before collection | `duration > 5000000` (microseconds), `database_name = N'Sales'` |
| Target | Where events go | `event_file` (persistent), `ring_buffer` (memory), `histogram` (bucket counts), `event_counter`, `pair_matching` (SQL Server only, not Azure SQL Database or Managed Instance) |

| | Azure SQL Database | SQL Managed Instance, SQL Server |
| --- | --- | --- |
| Scope | `ON DATABASE` only; events of that database | `ON SERVER` (recommended), Managed Instance also accepts `ON DATABASE` |
| `event_file` target | Azure Blob Storage only, with a **database-scoped credential** | Azure Blob Storage on Managed Instance (server credential); local disk or URL on SQL Server |
| Storage | Standard general-purpose v2 account in the same region, Hot tier, redundancy matching the database (LRS, GRS or RA-GRS for a locally redundant resource; ZRS, GZRS or RA-GZRS for a zone-redundant one), no hierarchical namespace (error 13), no immutability policy; credential named after the container URL without a trailing slash (error 86), with a SAS (`rwdl`) or a managed identity with Storage Blob Data Contributor | Same rules for blob targets |
| Limits | 128 MB of session memory and 100 started sessions per database | Instance memory |
| Running sessions | `sys.dm_xe_database_sessions` | `sys.dm_xe_sessions` |

```text
-- Azure SQL Database: credential named after the container URL
CREATE DATABASE SCOPED CREDENTIAL [https://stcontosoxe.blob.core.windows.net/xevents]
WITH IDENTITY = 'SHARED ACCESS SIGNATURE', SECRET = 'sv=2025-01-05&sr=c&sp=rwdl&sig=REDACTED';

CREATE EVENT SESSION SlowQueries ON DATABASE
ADD EVENT sqlserver.sql_statement_completed (
    ACTION (sqlserver.sql_text, sqlserver.client_app_name)
    WHERE duration > 5000000)
ADD TARGET package0.event_file (
    SET filename = 'https://stcontosoxe.blob.core.windows.net/xevents/SlowQueries.xel')
WITH (MAX_MEMORY = 4 MB, STARTUP_STATE = ON);

ALTER EVENT SESSION SlowQueries ON DATABASE STATE = START;

SELECT CAST(event_data AS xml)
FROM sys.fn_xe_file_target_read_file(
  'https://stcontosoxe.blob.core.windows.net/xevents/SlowQueries', DEFAULT, DEFAULT, DEFAULT);
```

Use `STARTUP_STATE = ON` for sessions that must survive a restart or failover. SQL Server and Managed Instance run the built-in **system_health** session (deadlocks, severe errors); Azure SQL Database has a built-in `dl` deadlock session. In SSMS, **XEvent Profiler** gives a quick live view, and **Watch Live Data** streams any running session.

> **Exam trap.** In Azure SQL Database, an `event_file` target can't write to a local path, and `ON SERVER` sessions fail: use `ON DATABASE` with a blob container and a database-scoped credential. For a quick look without storage, use the `ring_buffer` target.

<!-- section: key-points -->
## Key points

- Baseline = representative period, stored beyond default retention, recaptured after each change; alert thresholds come from it.
- `sys.dm_db_resource_stats`: 15 seconds, 1 hour. `sys.resource_stats`: 5 minutes, 14 days, in `master`. Azure Monitor metrics: 93 days.
- Resource logs need a diagnostic setting; platform metrics don't.
- Percentages are relative to the compute size limit; DTU % is the highest of CPU, data I/O and log write.
- High workers with low CPU means blocking; `PAGEIOLATCH` means data I/O; `WRITELOG` means log throughput.
- Metric alerts for thresholds, log search alerts for KQL, action groups for notifications.
- Database watcher: preview, Azure SQL Database and Managed Instance, data in Azure Data Explorer or Fabric, managed identity with read-only server roles; retiring on April 30, 2027.
- Extended Events: `ON DATABASE` plus blob `event_file` and a database-scoped credential in Azure SQL Database; `ON SERVER` elsewhere.
