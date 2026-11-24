Query performance questions start from a symptom (a query that became slow, sessions that wait, CPU at 100 %) and ask which tool finds the cause and which change fixes it. The tools are Query Store for history and plan regressions, dynamic management views (DMVs) for what is happening now, execution plans for why one query is slow, and Intelligent Insights for automatic detection in Azure SQL.

<!-- section: query-store-config | objectives: 3.2.1 -->
## Configuring Query Store

Query Store records, per database, the text of queries, their plans and runtime statistics (duration, CPU, reads, waits) aggregated by time interval. It survives restarts and failovers, unlike the plan cache.

| Platform | Default state for a new database |
| --- | --- |
| Azure SQL Database, Azure SQL Managed Instance | On (`READ_WRITE`) |
| SQL Server 2022 (16.x) and later | On (`READ_WRITE`) |
| SQL Server 2016, 2017, 2019 | Off: enable it per database |
| `master`, `tempdb` | Can't be enabled |

```text
ALTER DATABASE SalesDB
SET QUERY_STORE = ON (
    OPERATION_MODE = READ_WRITE,
    QUERY_CAPTURE_MODE = AUTO,
    MAX_STORAGE_SIZE_MB = 2048,
    CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30),
    SIZE_BASED_CLEANUP_MODE = AUTO,
    INTERVAL_LENGTH_MINUTES = 60,
    WAIT_STATS_CAPTURE_MODE = ON
);
```

| Option | Default | Meaning |
| --- | --- | --- |
| `OPERATION_MODE` | `READ_WRITE` | `READ_ONLY` keeps data readable but captures nothing new |
| `QUERY_CAPTURE_MODE` | `AUTO` (SQL Server 2019+, Azure SQL Database); `ALL` before 2019 | `AUTO` ignores infrequent and cheap queries; `NONE` stops capturing new queries; `CUSTOM` sets your own thresholds |
| `MAX_STORAGE_SIZE_MB` | 1,000 MB (SQL Server 2019+); 100 MB (2016–2017) | Size limit of the Query Store data |
| `STALE_QUERY_THRESHOLD_DAYS` | 30 | Age-based cleanup |
| `SIZE_BASED_CLEANUP_MODE` | `AUTO` | Cleanup starts at 90 % of the max size and stops around 80 % |
| `INTERVAL_LENGTH_MINUTES` | 60 | Aggregation interval of runtime statistics |
| `DATA_FLUSH_INTERVAL_SECONDS` | 900 | How often in-memory data is written to disk |
| `MAX_PLANS_PER_QUERY` | 200 | Plans kept per query |
| `WAIT_STATS_CAPTURE_MODE` | `ON` | Wait statistics per query (SQL Server 2017+, Azure SQL) |

With `QUERY_CAPTURE_MODE = CUSTOM`, a `QUERY_CAPTURE_POLICY` sets `EXECUTION_COUNT` (default 30), `TOTAL_COMPILE_CPU_TIME_MS` (1,000), `TOTAL_EXECUTION_CPU_TIME_MS` (100) and `STALE_CAPTURE_POLICY_THRESHOLD` (1 day, from 1 hour to 7 days): a query is captured when it reaches one threshold within that window.

When the max size is reached, Query Store switches itself to `READ_ONLY`. Check it and fix it:

```text
SELECT actual_state_desc, desired_state_desc, readonly_reason,
       current_storage_size_mb, max_storage_size_mb
FROM sys.database_query_store_options;

ALTER DATABASE SalesDB SET QUERY_STORE (MAX_STORAGE_SIZE_MB = 4096);
ALTER DATABASE SalesDB SET QUERY_STORE (OPERATION_MODE = READ_WRITE);
-- Or remove all collected data
ALTER DATABASE SalesDB SET QUERY_STORE CLEAR ALL;
```

> **Exam trap.** `actual_state_desc = READ_ONLY` while `desired_state_desc = READ_WRITE` means Query Store ran out of space. Raising `MAX_STORAGE_SIZE_MB` or cleaning data is the fix; restarting the database isn't.

<!-- section: query-store-monitor | objectives: 3.2.2 -->
## Monitoring with Query Store

SQL Server Management Studio (SSMS) shows the built-in reports under the database's **Query Store** node:

| Report | Use it to find |
| --- | --- |
| Regressed Queries | Queries whose duration, CPU or reads got worse, usually after a plan change |
| Overall Resource Consumption | Total consumption of the database over time |
| Top Resource Consuming Queries | The heaviest queries for a metric and period |
| Queries With Forced Plans | Every plan currently forced |
| Queries With High Variation | Queries with unstable performance (parameter sensitivity) |
| Query Wait Statistics | Wait categories and the queries that wait the most |
| Tracked Queries | The history of one query you choose |

The same data is in catalog views: `sys.query_store_query` and `sys.query_store_query_text` (queries), `sys.query_store_plan` (plans, with `is_forced_plan`), `sys.query_store_runtime_stats` and `sys.query_store_runtime_stats_interval` (statistics per interval), `sys.query_store_wait_stats` (waits per plan).

```text
-- Top 10 queries by average CPU over the last 24 hours
SELECT TOP 10 q.query_id, p.plan_id, qt.query_sql_text,
       AVG(rs.avg_cpu_time) AS avg_cpu_us, SUM(rs.count_executions) AS executions
FROM sys.query_store_runtime_stats AS rs
JOIN sys.query_store_runtime_stats_interval AS i
     ON rs.runtime_stats_interval_id = i.runtime_stats_interval_id
JOIN sys.query_store_plan AS p ON rs.plan_id = p.plan_id
JOIN sys.query_store_query AS q ON p.query_id = q.query_id
JOIN sys.query_store_query_text AS qt ON q.query_text_id = qt.query_text_id
WHERE i.start_time > DATEADD(hour, -24, SYSUTCDATETIME())
GROUP BY q.query_id, p.plan_id, qt.query_sql_text
ORDER BY avg_cpu_us DESC;
```

To fix a plan regression without changing code, force the previous plan; to change how a query compiles without touching the application, add a Query Store hint (SQL Server 2022+, Azure SQL Database, Azure SQL Managed Instance):

```text
EXEC sp_query_store_force_plan @query_id = 48, @plan_id = 49;
EXEC sp_query_store_unforce_plan @query_id = 48, @plan_id = 49;

EXEC sys.sp_query_store_set_hints @query_id = 39,
     @query_hints = N'OPTION(MAX_GRANT_PERCENT = 10)';
EXEC sys.sp_query_store_clear_hints @query_id = 39;
```

Query Store hints override hard-coded statement-level hints and plan guides. A hint that can't be applied is ignored, never blocking the query; the failure reason is in `sys.query_store_query_hints`. Hints apply on the primary replica only, except in SQL Server 2025 with Query Store for secondary replicas enabled, where they can also apply on availability group secondaries (`@replica_group_id` targets one replica group).

> **Exam tip.** "The application code can't be modified" points to plan forcing or Query Store hints. Forcing a plan manually is the one-off fix; automatic plan correction (`FORCE_LAST_GOOD_PLAN`, chapter 33) does it continuously.

<!-- section: blocking | objectives: 3.2.3 -->
## Identifying and resolving session blocking

Blocking is normal locking that lasts too long: session A holds a lock, session B waits for it. A deadlock is different: two sessions wait for each other, and the engine ends one (the victim, error 1205).

Find blocked sessions and the **head blocker** (the session at the top of the chain, blocked by nobody):

```text
SELECT r.session_id, r.blocking_session_id, r.wait_type, r.wait_time,
       r.wait_resource, t.text
FROM sys.dm_exec_requests AS r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) AS t
WHERE r.blocking_session_id <> 0;

-- What the head blocker is doing and whether it has an open transaction
SELECT s.session_id, s.status, s.open_transaction_count, ib.event_info
FROM sys.dm_exec_sessions AS s
CROSS APPLY sys.dm_exec_input_buffer(s.session_id, NULL) AS ib
WHERE s.session_id = 72;
```

| DMV | Shows |
| --- | --- |
| `sys.dm_exec_requests` | Running requests; `blocking_session_id` = 0 means not blocked |
| `sys.dm_exec_sessions` | All sessions, including sleeping ones with `open_transaction_count` |
| `sys.dm_os_waiting_tasks` | Current waits, with the blocking session and resource |
| `sys.dm_tran_locks` | Locks held and requested |

| Scenario | Signs | Resolution |
| --- | --- | --- |
| Long-running query | Head blocker running | Tune the query (indexes), shorten the transaction |
| Sleeping session with an uncommitted transaction | Status sleeping, open transactions above 0 | Fix the application: `SET XACT_ABORT ON`, roll back in error handlers; `KILL` the session as an emergency |
| Client doesn't fetch all rows | Head blocker waits on the client | Fetch all results or close the connection |
| Orphaned connection | Sleeping, open transaction, client gone | `KILL 99` |

Reduce blocking by design: short transactions, the right indexes (fewer rows read means fewer locks), and **row versioning**. Read committed snapshot isolation (RCSI) is on by default for new Azure SQL Database databases: readers don't take shared locks, so they don't block writers. On SQL Server, enable it with `ALTER DATABASE SalesDB SET READ_COMMITTED_SNAPSHOT ON`.

**Optimized locking** (transaction ID locking plus lock after qualification) reduces lock memory and the number of locks held by writers. It's always on in Azure SQL Database and in Azure SQL Managed Instance with the SQL Server 2025 or Always-up-to-date update policy (not available with the SQL Server 2022 update policy); in SQL Server 2025 it's off by default and requires accelerated database recovery. Lock after qualification works only with RCSI. Check it with `DATABASEPROPERTYEX(DB_NAME(), 'IsOptimizedLockingOn')`.

> **Exam trap.** A timeout or a cancel ends the batch but doesn't roll back the open transaction: its locks stay until the application commits, rolls back or disconnects.

<!-- section: dmvs | objectives: 3.2.4 -->
## Finding performance issues with DMVs

DMVs show the current state of the engine. Querying them requires `VIEW DATABASE STATE` in Azure SQL Database (granted to a database user) or `VIEW SERVER STATE` (or `VIEW SERVER PERFORMANCE STATE`, for example through the `##MS_ServerStateReader##` server role).

| Question | DMV |
| --- | --- |
| Resource use of an Azure SQL database, last hour | `sys.dm_db_resource_stats` (one row every 15 seconds, about 1 hour kept) |
| Same, last 14 days | `sys.resource_stats` in `master` (5-minute intervals, about 14 days) |
| Resource use of a managed instance | `sys.server_resource_stats` in `master` |
| What runs now | `sys.dm_exec_requests` + `sys.dm_exec_sql_text` |
| Heaviest cached queries | `sys.dm_exec_query_stats` (one row per statement in the plan cache; lost when the plan leaves the cache) |
| A cached plan | `sys.dm_exec_query_plan(plan_handle)` |
| Waits since start | `sys.dm_os_wait_stats` (SQL Server, Managed Instance), `sys.dm_db_wait_stats` (Azure SQL Database) |
| Memory grants | `sys.dm_exec_query_memory_grants` |
| Index use and fragmentation | `sys.dm_db_index_usage_stats`, `sys.dm_db_index_physical_stats` |
| Missing indexes | `sys.dm_db_missing_index_details`, `_groups`, `_group_stats` |

Interpret the dominant wait type:

| Wait | Points to |
| --- | --- |
| `SOS_SCHEDULER_YIELD`, high `avg_cpu_percent` | CPU pressure: tune top CPU queries or scale up |
| `PAGEIOLATCH_*` | Data file reads: missing indexes, scans, too little memory |
| `WRITELOG` | Transaction log writes |
| `LCK_M_*` | Blocking |
| `RESOURCE_SEMAPHORE` | Queries waiting for memory grants |
| `PAGELATCH_*` with `wait_resource` starting `2:` | `tempdb` allocation contention (database ID 2) |
| `CXPACKET`, `CXCONSUMER` | Parallelism: review MAXDOP and cost threshold |

```text
SELECT TOP 10 qs.query_hash,
       SUM(qs.total_worker_time) / SUM(qs.execution_count) AS avg_cpu_us,
       SUM(qs.execution_count) AS executions
FROM sys.dm_exec_query_stats AS qs
GROUP BY qs.query_hash
ORDER BY avg_cpu_us DESC;
```

> **Exam trap.** DMV data is volatile: plan cache and wait statistics are reset by a restart or failover. For "last week" or "before the plan changed", use Query Store, not `sys.dm_exec_query_stats`. Queries compiled with `OPTION (RECOMPILE)` don't appear in `sys.dm_exec_query_stats`.

<!-- section: index-changes | objectives: 3.2.5 -->
## Identifying and implementing index changes

| Requirement | Index |
| --- | --- |
| Point lookups and range searches on a key | Clustered index (one per table) on a narrow, unique, ever-increasing key |
| Seek on other columns | Nonclustered index |
| Avoid key lookups for a frequent query | Covering index: key columns + `INCLUDE` for the selected columns |
| Queries on a well-defined subset (`WHERE Status = 'Open'`) | Filtered index |
| Large scans and aggregations (analytics, reporting) | Columnstore index (clustered for a fact table, nonclustered on an OLTP table) |
| Unused index that slows writes | Drop it (check `sys.dm_db_index_usage_stats`: many `user_updates`, no seeks or scans) |

The **missing index** feature suggests indexes when the optimizer compiles a query, in the plan (green "Missing Index" text, `MissingIndexes` XML element) and in the missing index DMVs:

```text
SELECT TOP 10 d.statement, d.equality_columns, d.inequality_columns,
       d.included_columns, s.user_seeks, s.avg_user_impact
FROM sys.dm_db_missing_index_group_stats AS s
JOIN sys.dm_db_missing_index_groups AS g ON s.group_handle = g.index_group_handle
JOIN sys.dm_db_missing_index_details AS d ON g.index_handle = d.index_handle
ORDER BY s.user_seeks * s.avg_user_impact DESC;

CREATE NONCLUSTERED INDEX IX_Orders_CustomerID_OrderDate
ON dbo.Orders (CustomerID, OrderDate)
INCLUDE (TotalDue)
WITH (ONLINE = ON);
```

Build the key with equality columns first, then inequality columns; put the other columns in `INCLUDE` (their order doesn't matter). Limits: nonclustered rowstore indexes only (never filtered or unique), at most 600 missing index groups, estimates never verified after execution, data lost at restart or failover, no check for overlap with existing indexes. Merge suggestions with existing indexes, then measure.

In Azure SQL Database, automatic tuning can create and drop indexes itself (chapter 33); in Managed Instance and SQL Server it can't.

> **Exam trap.** A Key Lookup with a high cost in the plan is fixed by adding the looked-up columns to the nonclustered index with `INCLUDE`, not by adding a second index on the same key.

<!-- section: query-constructs | objectives: 3.2.6 -->
## Recommending query construct changes

When one query consumes most of the CPU, reads or memory, the fix is often in the T-SQL itself:

| Construct | Problem | Rewrite |
| --- | --- | --- |
| Function on a column: `WHERE YEAR(OrderDate) = 2026` | Not SARGable: index scan instead of seek | `WHERE OrderDate >= '2026-01-01' AND OrderDate < '2027-01-01'` |
| Implicit conversion: `nvarchar` parameter against a `varchar` column | `CONVERT_IMPLICIT` warning, scan | Use the column's data type for parameters |
| Leading wildcard `LIKE '%son'` | Can't seek | Full-text search, or a different predicate |
| `SELECT *` | More reads, key lookups, no covering index possible | Select only needed columns |
| Cursor or `WHILE` loop row by row | High CPU and duration | Set-based `UPDATE`/`INSERT ... SELECT` |
| One huge `DELETE` | Long locks, lock escalation, log growth | Delete in batches (`DELETE TOP (5000)` in a loop) |
| Plan good for some parameter values only (parameter sniffing) | High variation in duration | `OPTION (RECOMPILE)`, `OPTIMIZE FOR`, or Parameter Sensitive Plan optimization (compatibility level 160) |
| Scalar user-defined function called per row | Serial, row-by-row execution | Scalar UDF inlining (compatibility level 150) or an inline table-valued function |

> **Exam tip.** Resource clues pick the fix: high logical reads, add or change an index or the predicate; high CPU with few reads, row-by-row logic or scalar functions; a memory grant wait (`RESOURCE_SEMAPHORE`) or a spill, bad estimates (statistics) or excessive sorts and hashes.

<!-- section: execution-plans | objectives: 3.2.7 -->
## Reviewing execution plans

| Plan | How | Content |
| --- | --- | --- |
| Estimated | SSMS **Display Estimated Execution Plan** (Ctrl+L), `SET SHOWPLAN_XML ON` | Compiled without running: estimates only |
| Actual | SSMS **Include Actual Execution Plan** (Ctrl+M), `SET STATISTICS XML ON` | After execution: actual rows, runtime warnings |
| Live | **Include Live Query Statistics**, `sys.dm_exec_query_profiles` | Operator progress while the query runs |
| Last actual (cached) | `ALTER DATABASE SCOPED CONFIGURATION SET LAST_QUERY_PLAN_STATS = ON` then `sys.dm_exec_query_plan_stats(plan_handle)` | Last known actual plan, from lightweight profiling |
| Historical | Query Store reports, `sys.query_store_plan` | Every plan a query used |

Viewing a plan requires the `SHOWPLAN` permission on the databases involved. `SET STATISTICS IO ON` and `SET STATISTICS TIME ON` add reads and CPU per statement.

Read the plan right to left, then look for:

| Sign | Meaning |
| --- | --- |
| Index Scan or Table Scan on a large table where few rows return | Missing index or non-SARGable predicate |
| Key Lookup / RID Lookup executed many times | Index doesn't cover the query |
| Estimated rows very different from actual rows | Stale or missing statistics, parameter sniffing, table variable |
| Warning: spill to `tempdb` on Sort or Hash Match | Memory grant too small (bad estimate) |
| Warning: `CONVERT_IMPLICIT` | Data type mismatch |
| Nested Loops on two large inputs | Bad estimate; Hash Match usually suits large unsorted inputs, Merge Join two sorted inputs |

Lightweight profiling, on by default in SQL Server 2019+ and Azure SQL Database, makes actual-plan data cheap to collect. SSMS can compare two plans (**Compare Showplan**), for example the plans of a regressed query found in Query Store.

> **Exam trap.** The estimated plan can't show spills, actual row counts or runtime warnings: questions that need them require the actual plan.

<!-- section: intelligent-insights | objectives: 3.2.8 -->
## Monitoring with Intelligent Insights

Intelligent Insights uses built-in intelligence to compare the last hour of a database's workload with a seven-day baseline and to detect performance degradation. It applies to Azure SQL Database and Azure SQL Managed Instance (not SQL Server on VMs) and is a preview feature, not available in West Europe, North Europe, West US 1 and East US 1.

It measures query duration and timeouts (primary metrics) plus excessive waits and errors. Each detected issue is written to the **SQLInsights** diagnostic log with the impacted queries, the root cause and, when possible, a recommendation, and is tracked until it's resolved.

Configure it with a diagnostic setting on the database (or the managed instance database): select the **SQLInsights** category and a destination.

| Destination | For |
| --- | --- |
| Log Analytics workspace | Querying with KQL, workbooks, log alerts |
| Azure Event Hubs | Streaming to custom monitoring or third-party tools |
| Azure Storage account | Archiving and custom reporting |

Its 15 detectable patterns include reaching resource limits, workload increase, memory pressure, locking, missing index, new query, `tempdb` contention, plan regression, database-scoped configuration value change and pricing tier downgrade; elastic pool DTU shortage applies to Azure SQL Database only.

> **Exam trap.** The **SQLInsights** log isn't the retired Azure Monitor SQL Insights solution. Intelligent Insights reports problems; it doesn't fix them. Automatic correction is automatic tuning.

<!-- section: key-points -->
## Key points

- Query Store is on by default in Azure SQL and SQL Server 2022+; it turns `READ_ONLY` when full; fix with a larger `MAX_STORAGE_SIZE_MB` or cleanup.
- Regressed Queries report + `sp_query_store_force_plan` fixes a plan regression without code changes; Query Store hints change compilation without code changes.
- Blocking: find the head blocker with `blocking_session_id`; RCSI (default in Azure SQL Database) stops readers blocking writers; `KILL` is the last resort.
- DMVs = now (volatile); Query Store = history; `sys.dm_db_resource_stats` = 1 hour, `sys.resource_stats` = 14 days.
- Missing index suggestions: equality, inequality, then `INCLUDE`; nonclustered only; verify before creating.
- Estimated plan = no execution; actual plan = actual rows and warnings; estimate vs actual gap = statistics.
- Intelligent Insights: preview, Azure SQL Database and Managed Instance, SQLInsights log to Log Analytics, Event Hubs or Storage.
