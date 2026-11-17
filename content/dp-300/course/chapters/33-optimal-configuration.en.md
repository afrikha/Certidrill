This chapter covers the settings and maintenance tasks that keep a database fast over time: index and statistics maintenance, integrity checks, automatic tuning, instance and database-level configuration, Resource Governor, scaling and intelligent query processing. Exam questions test which option exists on which offering, the exact command, and what a setting changes.

<!-- section: index-maintenance | objectives: 3.3.1 -->
## Index maintenance

Measure before maintaining. `sys.dm_db_index_physical_stats` returns logical fragmentation (`avg_fragmentation_in_percent`) and page density (`avg_page_space_used_in_percent`, filled in `SAMPLED` or `DETAILED` mode):

```text
SELECT OBJECT_NAME(ips.object_id) AS table_name, i.name AS index_name,
       ips.avg_fragmentation_in_percent, ips.avg_page_space_used_in_percent,
       ips.page_count
FROM sys.dm_db_index_physical_stats(DB_ID(), DEFAULT, DEFAULT, DEFAULT, 'SAMPLED') AS ips
JOIN sys.indexes AS i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
WHERE ips.page_count > 1000;

ALTER INDEX IX_Orders_CustomerID ON dbo.Orders REORGANIZE;
ALTER INDEX PK_Orders ON dbo.Orders REBUILD WITH (ONLINE = ON, RESUMABLE = ON, MAX_DURATION = 60 MINUTES);
ALTER INDEX PK_Orders ON dbo.Orders PAUSE;
ALTER INDEX PK_Orders ON dbo.Orders RESUME;
```

| | `REORGANIZE` | `REBUILD` |
| --- | --- | --- |
| Online | Always | Only with `ONLINE = ON` (offline holds object-level locks for the whole operation) |
| Resources | Lower: Microsoft's preferred method unless there's a reason to rebuild | Higher; needs space for two copies of the index |
| Interrupted | Progress already made is kept | Lost, unless `RESUMABLE = ON` (pause and resume) |
| Statistics | Not updated | Index statistics updated as with `FULLSCAN` (not for partitioned or resumable rebuilds) |

Current Microsoft guidance: don't rely on fixed fragmentation thresholds alone or on a fixed schedule; monitor fragmentation and page density and maintain when performance needs it. Often an `UPDATE STATISTICS` brings the same benefit at a lower cost.

In Azure SQL Database and Managed Instance, storage has little difference between sequential and random I/O, so fragmentation matters less, and maintenance consumes the same governed resources as the workload: run it only when there's a demonstrated need. Resumable rebuilds survive a failover. Schedule maintenance with SQL Server Agent (SQL Server, Managed Instance) or elastic jobs and Azure Automation (Azure SQL Database). Automatic index compaction (`ALTER DATABASE ... SET AUTOMATIC_INDEX_COMPACTION = ON`, off by default) is a low-overhead alternative in Azure SQL Database and Managed Instance with the Always-up-to-date update policy.

> **Exam trap.** "Minimize locking during maintenance of a large index" means `REORGANIZE` or `REBUILD WITH (ONLINE = ON)`. "The rebuild must continue after a failover or a maintenance window ends" means `RESUMABLE = ON`.

<!-- section: statistics-maintenance | objectives: 3.3.2 -->
## Statistics maintenance

The optimizer estimates row counts from statistics (histograms). Stale statistics show as estimated rows far from actual rows in a plan.

| Database option | Effect |
| --- | --- |
| `AUTO_CREATE_STATISTICS` | Creates single-column statistics on predicate columns when needed |
| `AUTO_UPDATE_STATISTICS` | Updates statistics marked out of date before compiling the query (keep it `ON`) |
| `AUTO_UPDATE_STATISTICS_ASYNC` | Off by default; when on, the query compiles with the old statistics and the update runs in the background: no compile wait |

Statistics are marked out of date after a number of modifications: at compatibility level 130 and above, the threshold is `MIN(500 + 0.20 * n, SQRT(1000 * n))` (44,721 changes for a 2-million-row table); below 130, it's 500 + 20 % of the rows.

```text
UPDATE STATISTICS dbo.Orders WITH FULLSCAN;
UPDATE STATISTICS dbo.Orders IX_Orders_OrderDate WITH SAMPLE 25 PERCENT, PERSIST_SAMPLE_PERCENT = ON;
EXEC sp_updatestats;

SELECT s.name, sp.last_updated, sp.rows, sp.rows_sampled, sp.modification_counter
FROM sys.stats AS s
CROSS APPLY sys.dm_db_stats_properties(s.object_id, s.stats_id) AS sp
WHERE s.object_id = OBJECT_ID(N'dbo.Orders');
```

`sp_updatestats` updates only statistics that have modifications, with the default sample. Update manually after large loads or when an ascending key (dates, identities) makes the newest rows invisible to the histogram; keep auto update on alongside.

> **Exam trap.** `REORGANIZE` doesn't update statistics; an index `REBUILD` updates only that index's statistics, not column statistics. Updating statistics right after a rebuild is redundant for that index.

<!-- section: integrity-checks | objectives: 3.3.3 -->
## Database integrity checks

```text
DBCC CHECKDB (SalesDB) WITH NO_INFOMSGS, ALL_ERRORMSGS;
DBCC CHECKDB (SalesDB) WITH PHYSICAL_ONLY;
DBCC CHECKTABLE ('dbo.Orders') WITH TABLOCK;

ALTER DATABASE SalesDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
DBCC CHECKDB (SalesDB, REPAIR_ALLOW_DATA_LOSS);
ALTER DATABASE SalesDB SET MULTI_USER;
```

| Command or option | Use |
| --- | --- |
| `DBCC CHECKDB` | Runs `CHECKALLOC`, `CHECKTABLE` on every table and view, and `CHECKCATALOG`; uses an internal database snapshot, so no blocking |
| `PHYSICAL_ONLY` | Page and allocation structure only: much faster on large databases; skips column-value checks |
| `NO_INFOMSGS` | Shows only errors |
| `TABLOCK` | Takes locks instead of a snapshot (skips `CHECKCATALOG`) |
| `REPAIR_REBUILD` | Repairs without data loss (for example nonclustered indexes) |
| `REPAIR_ALLOW_DATA_LOSS` | Last resort when no good backup exists; requires single-user mode |

Running it requires `sysadmin` or `db_owner`.

| Platform | Integrity responsibilities |
| --- | --- |
| SQL Server on Azure VMs, on-premises | Yours: schedule `DBCC CHECKDB` (SQL Server Agent job or maintenance plan), keep `PAGE_VERIFY CHECKSUM`, use `BACKUP ... WITH CHECKSUM` |
| Azure SQL Managed Instance | You can run `DBCC CHECKDB`; storage must hold the whole internal snapshot file |
| Azure SQL Database | The service verifies pages during backups and restores, uses `CHECKSUM` on all backups and alerts its engineers; you can still run `DBCC CHECKDB` |
| Azure SQL Database Hyperscale | `DBCC CHECKDB` isn't supported: use `DBCC CHECKTABLE ... WITH TABLOCK` |

> **Exam trap.** When `DBCC CHECKDB` reports corruption, the recommended fix is restoring from a known good backup. `REPAIR_ALLOW_DATA_LOSS` can lose more data than the restore.

<!-- section: automatic-tuning | objectives: 3.3.4 -->
## Automatic tuning

| Option | Action | Azure SQL Database | Managed Instance | SQL Server 2017+ |
| --- | --- | --- | --- | --- |
| `FORCE_LAST_GOOD_PLAN` | Detects a plan regression and forces the last good plan | Yes | Yes | Yes |
| `CREATE_INDEX` | Creates indexes that would help the workload | Yes | No | No |
| `DROP_INDEX` | Drops indexes unused for 90 days and duplicate indexes (never unique or primary key indexes) | Yes | No | No |

- Plan correction relies on **Query Store**, which must be on and in `READ_WRITE`.
- Azure defaults for new servers: `FORCE_LAST_GOOD_PLAN` on, `CREATE_INDEX` and `DROP_INDEX` off. Databases inherit from the server; Microsoft recommends configuring at the server and letting databases inherit.
- Every automatic change is validated (30 minutes to 72 hours, depending on how often the query runs) and reverted if performance doesn't improve. Recommendations applied manually with T-SQL aren't validated or reverted.
- `DROP_INDEX` can be disabled automatically when queries use index hints or the workload switches partitions; on Premium and Business Critical, it drops only duplicate indexes. `CREATE_INDEX` gives no recommendation for tables whose clustered index or heap exceeds 10 GB.
- History of automatic changes is kept 21 days.

```text
-- Azure SQL Database: inherit from the server, or set options per database
ALTER DATABASE CURRENT SET AUTOMATIC_TUNING = INHERIT;
ALTER DATABASE CURRENT SET AUTOMATIC_TUNING (CREATE_INDEX = ON, DROP_INDEX = ON);

-- SQL Server, Managed Instance
ALTER DATABASE SalesDB SET AUTOMATIC_TUNING (FORCE_LAST_GOOD_PLAN = ON);

SELECT name, desired_state_desc, actual_state_desc, reason_desc
FROM sys.database_automatic_tuning_options;
SELECT name, reason, score, state, details FROM sys.dm_db_tuning_recommendations;
```

In the portal: logical server or database > **Automatic tuning**; recommendations under **Performance recommendations**.

> **Exam trap.** A managed instance or a SQL Server VM can't create or drop indexes automatically: only plan correction exists there. `sys.dm_db_tuning_recommendations` isn't persisted across a SQL Server restart.

<!-- section: server-settings | objectives: 3.3.5 -->
## Server settings for performance

Instance-level options are set with `sp_configure` (SQL Server, Managed Instance) and take effect after `RECONFIGURE`. Azure SQL Database has no instance settings: use database-scoped configuration.

```text
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'max server memory (MB)', 57344;
EXEC sp_configure 'max degree of parallelism', 8;
EXEC sp_configure 'cost threshold for parallelism', 50;
EXEC sp_configure 'optimize for ad hoc workloads', 1;
RECONFIGURE;
```

| Setting | Guidance |
| --- | --- |
| `max server memory (MB)` | Leave enough memory for the operating system |
| `max degree of parallelism` | One NUMA node: at most the number of logical processors, 8 when above 8; several NUMA nodes: at most the processors per node, half of them (max 16) above 16 per node. Default 8 in Azure SQL Database (database-scoped) and Managed Instance |
| `cost threshold for parallelism` | Default 5; raise it so that only expensive queries go parallel |
| `optimize for ad hoc workloads` | Caches a stub on first execution: less plan-cache bloat on OLTP with many single-use queries |
| Lock pages in memory, instant file initialization | Enable on SQL Server VMs (Windows privileges of the service account) |

SQL Server on Azure VMs checklist:

| Area | Recommendation |
| --- | --- |
| `tempdb` | One data file per core, up to eight; on the local ephemeral SSD (D:) when available, except for failover cluster instances (shared storage) |
| Disk layout | Data, log and `tempdb` on separate drives; stripe disks with Storage Spaces for more IOPS; 64-KB allocation unit |
| Host caching | Read-only for data disks, none for log disks, never read/write; stop SQL Server before changing it |
| Database options | Page and backup compression, autoshrink and autoclose off, limited autogrowth, Query Store on |

> **Exam trap.** Read/write host caching on a log disk risks data loss and is never recommended; read-only caching helps data files only.

<!-- section: resource-governor | objectives: 3.3.6 -->
## Resource Governor

Resource Governor limits the CPU, memory and physical read I/O that a workload can use. It exists in SQL Server (Enterprise and Developer editions; also Standard starting with SQL Server 2025) and Azure SQL Managed Instance; it can't be configured in Azure SQL Database.

| Component | Role |
| --- | --- |
| Resource pool | Physical limits: `MIN/MAX_CPU_PERCENT`, `CAP_CPU_PERCENT` (hard cap), `MIN/MAX_MEMORY_PERCENT`, `MIN/MAX_IOPS_PER_VOLUME`. Built-in pools: `internal`, `default` |
| Workload group | Request policies inside a pool: `REQUEST_MAX_MEMORY_GRANT_PERCENT`, `MAX_DOP`, `GROUP_MAX_REQUESTS`; `tempdb` limits `GROUP_MAX_TEMPDB_DATA_MB` / `_PERCENT` in SQL Server 2025 |
| Classifier function | Scalar function in `master`, `WITH SCHEMABINDING`, run for every new session; returns the workload group name |

```text
USE master;
CREATE RESOURCE POOL ReportsPool WITH (MAX_CPU_PERCENT = 20, CAP_CPU_PERCENT = 30);
CREATE WORKLOAD GROUP Reports WITH (REQUEST_MAX_MEMORY_GRANT_PERCENT = 15) USING ReportsPool;
GO
CREATE FUNCTION dbo.rg_classifier() RETURNS sysname WITH SCHEMABINDING
AS
BEGIN
    DECLARE @grp sysname = 'default';
    IF APP_NAME() LIKE 'PowerBI%' SET @grp = 'Reports';
    RETURN @grp;
END;
GO
ALTER RESOURCE GOVERNOR WITH (CLASSIFIER_FUNCTION = dbo.rg_classifier);
ALTER RESOURCE GOVERNOR RECONFIGURE;
```

If the function returns `NULL`, an unknown group or fails, the session goes to the `default` group. A slow classifier delays every login. Monitor with `sys.dm_resource_governor_resource_pools` and `sys.dm_resource_governor_workload_groups`.

> **Exam trap.** Classification happens once, at login: existing sessions keep their group. Without `ALTER RESOURCE GOVERNOR RECONFIGURE`, no change takes effect. On SQL Server availability groups, the configuration doesn't propagate to secondaries (it does in Managed Instance).

<!-- section: database-scoped-configuration | objectives: 3.3.7 -->
## Database-scoped configuration

`ALTER DATABASE SCOPED CONFIGURATION` sets options for one database, the way to tune instance-like behavior in Azure SQL Database. It requires `ALTER ANY DATABASE SCOPED CONFIGURATION`. Values are in `sys.database_scoped_configurations` (`value`, `value_for_secondary`).

```text
ALTER DATABASE SCOPED CONFIGURATION SET MAXDOP = 4;
ALTER DATABASE SCOPED CONFIGURATION FOR SECONDARY SET MAXDOP = 8;
ALTER DATABASE SCOPED CONFIGURATION SET LEGACY_CARDINALITY_ESTIMATION = ON;
ALTER DATABASE SCOPED CONFIGURATION SET LAST_QUERY_PLAN_STATS = ON;
ALTER DATABASE SCOPED CONFIGURATION CLEAR PROCEDURE_CACHE;
```

| Option | Default | Use |
| --- | --- | --- |
| `MAXDOP` | 0 (use the server setting); 8 for new Azure SQL Database databases | Parallelism for this database |
| `LEGACY_CARDINALITY_ESTIMATION` | `OFF` | Old CE model without lowering the compatibility level |
| `PARAMETER_SNIFFING` | `ON` | `OFF` = plans built for average values |
| `QUERY_OPTIMIZER_HOTFIXES` | `OFF` | Enables optimizer fixes released after the compatibility level |
| `OPTIMIZE_FOR_AD_HOC_WORKLOADS` | `OFF` | Plan stub on first execution |
| `LAST_QUERY_PLAN_STATS` | `OFF` | Last actual plan in `sys.dm_exec_query_plan_stats` |
| `ELEVATE_ONLINE`, `ELEVATE_RESUMABLE` | `OFF` | Make supported index operations online or resumable by default |
| `CLEAR PROCEDURE_CACHE` | Action | Clears this database's plan cache |

`FOR SECONDARY` applies a value to all readable secondaries (geo-replicas included); `PRIMARY` makes them inherit the primary's value.

> **Exam tip.** "Use the legacy cardinality estimator but keep the latest compatibility level and its features" is `LEGACY_CARDINALITY_ESTIMATION = ON`, not a lower `COMPATIBILITY_LEVEL`.

<!-- section: scaling-resources | objectives: 3.3.8 -->
## Configuring compute and storage for scaling

**Azure SQL Database.** Change the service objective or max size; the database stays online while new compute is prepared, then connections drop briefly (usually under 30 seconds): applications need retry logic.

```bash
az sql db update --resource-group rg-sales --server sql-sales --name SalesDB \
  --edition GeneralPurpose --family Gen5 --capacity 8 --max-size 500GB
```

```powershell
Set-AzSqlDatabase -ResourceGroupName rg-sales -ServerName sql-sales -DatabaseName SalesDB `
  -RequestedServiceObjectiveName "GP_Gen5_8"
```

```text
ALTER DATABASE SalesDB MODIFY (SERVICE_OBJECTIVE = 'GP_Gen5_8', MAXSIZE = 500 GB);
-- In master
SELECT * FROM sys.dm_operation_status WHERE major_resource_id = 'SalesDB';
```

| Rule | Detail |
| --- | --- |
| Duration | Constant (minutes) when the storage stays in place; about 1 minute per GB when data must be copied (to Premium, Business Critical or Hyperscale) |
| Max size | Not raised by a tier upgrade unless you set it; a downgrade needs used space below the target's limit |
| Geo-replication | Upgrade the secondaries first; downgrade the primary first |
| Hyperscale | Scaling between Hyperscale sizes is constant time; going back to General Purpose is limited to supported scenarios |
| Serverless | General Purpose and Hyperscale, vCore only; set min and max vCores and the auto-pause delay (General Purpose 15 minutes to 7 days, default 60, -1 disables; Hyperscale auto-pause is preview) |
| Monitoring, cancel | `sys.dm_operation_status`, `az sql db op list` / `cancel`, `Get-AzSqlDatabaseActivity` / `Stop-AzSqlDatabaseActivity` |

Other levers: elastic pools for many databases with complementary peaks, read scale-out (`ApplicationIntent=ReadOnly`) to offload reporting on Premium, Business Critical and Hyperscale.

**Azure SQL Managed Instance.** Scaling vCores or storage is a management operation that runs online; the instance is unavailable only at the final failover: up to 20 seconds in Business Critical, up to 2 minutes in General Purpose (Next-gen General Purpose up to 10 minutes as databases reattach). Operations submitted within one minute are batched.

**SQL Server on Azure VMs.** Resize the VM (restart), add or expand data disks, and change disk performance tiers; scale storage throughput with more striped disks or Premium SSD v2.

> **Exam trap.** Scaling an Azure SQL database isn't zero-downtime: a short disconnect happens at the switch. To stop paying for idle compute, choose serverless with auto-pause, not a smaller provisioned size.

<!-- section: iqp | objectives: 3.3.9 -->
## Intelligent query processing

Intelligent query processing (IQP) features improve plans without code changes. Most turn on with the database **compatibility level** (`ALTER DATABASE SalesDB SET COMPATIBILITY_LEVEL = 160`); several feedback features need Query Store in `READ_WRITE`.

| Problem | IQP feature | Compatibility level |
| --- | --- | --- |
| Join type wrong for the actual row count (batch mode) | Adaptive joins | 140 |
| Bad estimate for a multi-statement table-valued function | Interleaved execution | 140 |
| Spills or oversized memory grants on repeated queries | Memory grant feedback: batch mode 140, row mode 150; percentile and persistence in SQL Server 2022 | 140 / 150 |
| Fixed estimate for table variables | Table variable deferred compilation | 150 |
| Slow scalar UDFs | Scalar UDF inlining | 150 |
| Analytics on rowstore tables without columnstore | Batch mode on rowstore | 150 |
| `COUNT(DISTINCT)` on huge data where an approximation is acceptable | `APPROX_COUNT_DISTINCT` | Any (SQL Server 2019+) |
| Percentiles on huge data | `APPROX_PERCENTILE_CONT` / `_DISC` | 110 (SQL Server 2022+) |
| One cached plan bad for some parameter values | Parameter Sensitive Plan optimization | 160 |
| Wrong CE assumptions on repeated queries | Cardinality estimation feedback | 160 |
| Too much parallelism on repeated queries | DOP feedback (`DOP_FEEDBACK` is off by default) | 160 |
| Compilation cost of forced plans | Optimized plan forcing | Any (SQL Server 2022+) |
| Optional parameters (`@p IS NULL OR col = @p`) | Optional parameter plan optimization | 170 (SQL Server 2025) |

On Azure SQL Managed Instance, the newest features (DOP feedback, optimized plan forcing, OPPO) require the SQL Server 2025 or Always-up-to-date update policy. Disable one feature without changing the level with its database-scoped configuration (for example `BATCH_MODE_ON_ROWSTORE = OFF`, `TSQL_SCALAR_UDF_INLINING = OFF`).

> **Exam tip.** "Improve performance without changing code, after migrating from an old SQL Server version" usually means raising the compatibility level (with Query Store capturing a baseline first so regressions can be reverted).

<!-- section: key-points -->
## Key points

- `REORGANIZE` is always online and keeps its progress if stopped; `REBUILD` needs `ONLINE = ON`, `RESUMABLE = ON` to pause; don't maintain on fixed thresholds alone.
- Keep auto create and auto update statistics on; `AUTO_UPDATE_STATISTICS_ASYNC` avoids compile waits; `sys.dm_db_stats_properties` shows `modification_counter`.
- `DBCC CHECKDB` on VMs is your job; restore rather than `REPAIR_ALLOW_DATA_LOSS`; Hyperscale uses `CHECKTABLE`.
- Automatic tuning: `FORCE_LAST_GOOD_PLAN` everywhere (needs Query Store); `CREATE_INDEX` / `DROP_INDEX` only in Azure SQL Database.
- Resource Governor: SQL Server and Managed Instance only; pool + group + classifier in `master` + `RECONFIGURE`.
- Database-scoped configuration replaces instance settings in Azure SQL Database (`MAXDOP` default 8).
- Scaling Azure SQL Database drops connections briefly; upgrade geo-secondaries first.
- IQP features follow the compatibility level: 140, 150, 160, 170.
