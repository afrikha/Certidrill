Performance questions describe a workload (latency target, database size, read-heavy reporting, intermittent use), a symptom (a query that got slower, sessions waiting, error 1205) or a data-integrity requirement (no oversold stock, a consistent report), and ask which configuration, isolation level, tool or fix applies. Know the Azure SQL Database defaults: they decide many answers.

<!-- section: database-configurations | objectives: 2.2.1 -->
## Recommending database configurations

Azure SQL Database offers two purchasing models: **vCore** (choose cores, memory and storage; recommended for new deployments and SQL Server migrations, with reserved capacity and Azure Hybrid Benefit) and **DTU** (bundled Basic, Standard and Premium tiers).

| vCore tier | Storage | Max size | Replicas | Choose it for |
| --- | --- | --- | --- | --- |
| General Purpose | Remote (5 to 10 ms latency) | 4 TB | No readable replica | Budget-oriented workloads |
| Business Critical | Local SSD (1 to 2 ms latency) | 4 TB | Includes a free read-only replica | Low latency, high I/O, fastest failover |
| Hyperscale | Decoupled, local SSD cache (1 to 2 ms latency for the frequently accessed part of the database) | 128 TB | 0 to 4 high-availability replicas, plus named replicas | Large or fast-growing databases, read scale-out |

Compute tiers: **provisioned** (fixed vCores, predictable workloads) or **serverless** (autoscaling, billed per second; General Purpose and Hyperscale; auto-pause in General Purpose, in preview in Hyperscale) for intermittent workloads.

Database-level settings and their Azure SQL Database defaults:

| Setting | Default | Recommendation |
| --- | --- | --- |
| `MAXDOP` (database scoped configuration) | 8 for new databases | Keep 8 or lower for OLTP; never 0 in production; override a query with `OPTION (MAXDOP n)` |
| Compatibility level | 170 for new databases; never upgraded automatically | Raise it after testing with a Query Store baseline; 150 brings batch mode on rowstore and scalar UDF inlining, 160 parameter sensitive plan optimization |
| Automatic tuning | `FORCE_LAST_GOOD_PLAN` on; `CREATE_INDEX` and `DROP_INDEX` off | Turn on index creation if you accept automatic, validated indexes |
| `OPTIMIZE_FOR_AD_HOC_WORKLOADS` | Off | On when many single-use queries bloat the plan cache |
| Accelerated database recovery (ADR) | Always on, can't be disabled | Keep transactions short to limit the persistent version store |
| `READ_COMMITTED_SNAPSHOT` | On | Keep: readers don't block writers |
| Query Store | On (`READ_WRITE`) | Keep; enlarge `MAX_STORAGE_SIZE_MB` if it switches to `READ_ONLY` |

```text
ALTER DATABASE SCOPED CONFIGURATION SET MAXDOP = 4;
ALTER DATABASE SCOPED CONFIGURATION FOR SECONDARY SET MAXDOP = 8;
ALTER DATABASE SCOPED CONFIGURATION SET OPTIMIZE_FOR_AD_HOC_WORKLOADS = ON;
ALTER DATABASE CURRENT SET COMPATIBILITY_LEVEL = 170;
ALTER DATABASE CURRENT SET AUTOMATIC_TUNING (FORCE_LAST_GOOD_PLAN = ON, CREATE_INDEX = ON, DROP_INDEX = OFF);
```

Automatic tuning validates each change (30 minutes to 72 hours) and reverts it if performance gets worse; it never drops unique indexes.

> **Exam tip.** "Consistently under 2 ms of storage latency" for all the data = Business Critical (Hyperscale gives 1 to 2 ms only for the frequently accessed part). "Database will exceed 4 TB" = Hyperscale. "Used a few hours a day, minimize cost" = serverless General Purpose with auto-pause. "Offload reporting at no extra cost" = the read-only replica of Business Critical (`ApplicationIntent=ReadOnly`).

<!-- section: isolation-concurrency | objectives: 2.2.2 -->
## Transaction isolation levels and concurrency controls

| Isolation level | Dirty reads | Nonrepeatable reads | Phantoms | Readers block writers |
| --- | --- | --- | --- | --- |
| READ UNCOMMITTED (`NOLOCK`) | Yes | Yes | Yes | No |
| READ COMMITTED (locking) | No | Yes | Yes | Yes |
| READ COMMITTED SNAPSHOT (RCSI) | No | Yes | Yes | No |
| REPEATABLE READ | No | No | Yes | Yes |
| SNAPSHOT | No | No | No | No (update conflicts possible) |
| SERIALIZABLE | No | No | No | Yes (range locks) |

- **RCSI** (default in Azure SQL Database): each **statement** reads the last committed version as of its start, from the row versions kept by ADR in the database.
- **SNAPSHOT**: each **transaction** reads a consistent version as of its start. It needs `ALLOW_SNAPSHOT_ISOLATION ON` (the default in Azure SQL Database; `OFF` by default in SQL Server and Azure SQL Managed Instance, where `ALTER DATABASE ... SET ALLOW_SNAPSHOT_ISOLATION ON` is required) and `SET TRANSACTION ISOLATION LEVEL SNAPSHOT`. If two transactions update the same row, the second fails with update conflict error **3960** instead of overwriting.
- **SERIALIZABLE**: prevents phantoms with range locks; lowest concurrency, more deadlocks.

**Optimized locking**, always on in Azure SQL Database, holds one lock on the transaction ID instead of row and key locks (**TID locking**), and with RCSI evaluates the predicate on the latest committed version before locking only the qualifying rows (**lock after qualification**). Result: fewer locks, almost no lock escalation, less blocking.

Concurrency patterns for the classic lost update (two orders read the same stock of 1 and both decrement):

```text
-- Atomic: read and change in one statement, check the result
UPDATE dbo.Product SET Stock = Stock - 1
WHERE ProductID = 42 AND Stock >= 1;
IF @@ROWCOUNT = 0 THROW 50001, 'Out of stock', 1;

-- Pessimistic: lock the row when reading it
BEGIN TRANSACTION;
SELECT @Stock = Stock FROM dbo.Product WITH (UPDLOCK, HOLDLOCK) WHERE ProductID = 42;
-- ...business checks...
UPDATE dbo.Product SET Stock = @Stock - 1 WHERE ProductID = 42;
COMMIT;

-- Optimistic: rowversion column, update only if nobody changed the row
UPDATE dbo.Product SET Price = @NewPrice
WHERE ProductID = 42 AND RowVer = @RowVerReadEarlier;
IF @@ROWCOUNT = 0 THROW 50002, 'Row changed by another user', 1;
```

Choose RCSI with optimized locking for most workloads, SNAPSHOT for multi-query reports that need one point in time, SERIALIZABLE only when phantoms cause real errors (double booking). Keep transactions short and never wait for user input inside one.

> **Exam trap.** RCSI doesn't prevent lost updates: it changes what readers see, not how writers conflict. "Two sessions must not both sell the last item" needs an atomic `UPDATE ... WHERE`, `UPDLOCK`, or optimistic concurrency, not a change of isolation level for readers. And `NOLOCK` is never the answer when results must be correct.

<!-- section: plans-dmvs | objectives: 2.2.3 -->
## Execution plans and dynamic management views

The **estimated plan** shows what the optimizer intends without running the query; the **actual plan** (Include Actual Execution Plan, or `SET STATISTICS XML ON`) adds actual row counts, so a large gap between estimated and actual rows points to stale statistics or parameter sensitivity. `SET STATISTICS IO, TIME ON` shows logical reads and CPU per statement.

| Plan sign | Usual cause | Fix |
| --- | --- | --- |
| Index or table **scan** for a selective predicate | No usable index, or a non-SARGable predicate (function on the column) | Index the column; rewrite `WHERE YEAR(OrderDate) = 2026` as a date range |
| **Key Lookup** for many rows | Nonclustered index doesn't cover the query | Add the missing columns with `INCLUDE` |
| Warning: implicit conversion | Parameter type differs from the column (`nvarchar` against `varchar`) | Match the data types |
| Sort or hash **spill** to tempdb | Memory grant too small (bad estimates) | Update statistics; memory grant feedback |
| Estimated 1 row, actual 100,000 | Stale statistics, table variable, parameter sniffing | `UPDATE STATISTICS`, temp table, Query Store hint |

| DMV or function | Answers |
| --- | --- |
| `sys.dm_exec_requests` | What is running now, waits, `blocking_session_id` |
| `sys.dm_exec_sessions`, `sys.dm_exec_connections` | Who is connected, open transactions |
| `sys.dm_exec_query_stats` + `sys.dm_exec_sql_text` + `sys.dm_exec_query_plan` | Most expensive cached queries and their plans |
| `sys.dm_db_resource_stats` | Azure SQL Database CPU, data I/O, log and memory use every 15 seconds, last hour |
| `sys.dm_db_wait_stats` (Azure SQL Database), `sys.dm_os_wait_stats` | Where time is spent waiting |
| `sys.dm_tran_locks` | Locks held and requested |
| `sys.dm_db_missing_index_details` | Indexes the optimizer wanted |
| `sys.dm_db_index_usage_stats` | Indexes never read but maintained |

```text
SELECT TOP 10 qs.total_worker_time / qs.execution_count AS avg_cpu_us,
       qs.execution_count, st.text, qp.query_plan
FROM sys.dm_exec_query_stats AS qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) AS st
CROSS APPLY sys.dm_exec_query_plan(qs.plan_handle) AS qp
ORDER BY avg_cpu_us DESC;
```

DMVs on the plan cache lose history at restart or plan eviction; Query Store keeps it.

<!-- section: query-store-qpi | objectives: 2.2.3 -->
## Query Store and Query Performance Insight

**Query Store** persists query text, plans, runtime statistics and wait statistics inside the database, so you can compare before and after a change. It is on by default in Azure SQL Database; recommended settings are capture mode **Auto** and size-based cleanup **Auto**.

| SSMS report | Use it to find |
| --- | --- |
| Regressed Queries | Queries that switched to a slower plan |
| Top Resource Consuming Queries | Biggest consumers for a metric and period |
| Queries With High Variation | Unstable performance, often parameter sensitivity |
| Queries With Forced Plans | Plans currently forced |
| Query Wait Statistics | Wait categories and the queries behind them |

```text
EXEC sp_query_store_force_plan @query_id = 42, @plan_id = 17;
EXEC sp_query_store_unforce_plan @query_id = 42, @plan_id = 17;
EXEC sp_query_store_set_hints @query_id = 42, @query_hints = N'OPTION (RECOMPILE)';
EXEC sp_query_store_clear_hints @query_id = 42;

SELECT actual_state_desc, desired_state_desc, readonly_reason,
       current_storage_size_mb, max_storage_size_mb
FROM sys.database_query_store_options;
```

**Query Store hints** change a query's behavior without changing the application code, and override hard-coded hints and plan guides. If `actual_state_desc` is `READ_ONLY` while `desired_state_desc` is `READ_WRITE`, Query Store is full: raise `MAX_STORAGE_SIZE_MB` or purge data.

**Query Performance Insight** is an Azure SQL Database page in the Azure portal (database > Intelligent Performance > Query Performance Insight) that charts Query Store data: by default the top five queries by CPU, with a Custom tab for duration or execution count, a period of 24 hours, a week or a month, and 5, 10 or 20 queries. It shows Database Advisor recommendations as annotations. It requires Query Store and shows nothing new when Query Store is read-only.

> **Exam trap.** "A query regressed after a plan change and the code can't be modified" = force the last good plan in Query Store (or let automatic tuning do it), or a Query Store hint. Rewriting the query or adding `OPTION` to the code isn't allowed by the constraint. Query Performance Insight is portal-only and Azure SQL Database only.

<!-- section: blocking-deadlocks | objectives: 2.2.4 -->
## Blocking and deadlocks

**Blocking** is a wait for a lock that another session holds; it ends when that session commits or rolls back. With RCSI, readers no longer wait for writers, but writers still block writers. Find the **head blocker**: the session that blocks others while its own `blocking_session_id` is 0.

```text
SELECT r.session_id, r.blocking_session_id, r.wait_type, r.wait_time,
       r.wait_resource, t.text AS query_text
FROM sys.dm_exec_requests AS r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) AS t
WHERE r.blocking_session_id <> 0
ORDER BY r.wait_time DESC;
```

| Cause of blocking | Resolution |
| --- | --- |
| Long transaction or long-running query | Shorten the transaction, add indexes so fewer rows are locked |
| Sleeping session with an open transaction (error left it open) | `SET XACT_ABORT ON` so errors roll back; fix the code; `KILL` the session if orphaned |
| Application didn't fetch all result rows | Fetch to completion (RCSI mitigates) |
| Long rollback | ADR makes rollback nearly instant |

A **deadlock** is a cycle: each transaction waits for a lock the other holds. The deadlock monitor (every 5 seconds, down to 100 ms when deadlocks are frequent) picks the cheapest transaction as **victim**, rolls it back and returns error **1205**. SQL Server and Managed Instance record deadlock graphs in the `system_health` session; in Azure SQL Database, create a database-scoped Extended Events session:

```text
CREATE EVENT SESSION [deadlocks] ON DATABASE
ADD EVENT sqlserver.database_xml_deadlock_report
ADD TARGET package0.ring_buffer
WITH (STARTUP_STATE = ON, MAX_MEMORY = 4 MB);
ALTER EVENT SESSION [deadlocks] ON DATABASE STATE = START;
```

The deadlock graph lists the **victim**, each **process** (query, isolation level, lock mode) and each **resource** with its owner and waiter. Prevention: access tables in the same order in every procedure, keep transactions short, use RCSI (with optimized locking), and index so fewer rows are locked. Applications must **retry** on 1205, after a short random delay:

```text
BEGIN TRY
    BEGIN TRANSACTION;
    -- data modifications
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    IF ERROR_NUMBER() = 1205
        PRINT 'Deadlock victim: retry after a random delay of 1 to 3 seconds';
    ELSE
        THROW;
END CATCH;
```

> **Exam trap.** Blocking and deadlocks have different fixes. Blocking waits until the holder finishes: find and fix the head blocker. A deadlock never resolves by waiting: the engine kills a victim, so the fix is consistent access order, shorter transactions and retry logic, not a longer lock timeout.

<!-- section: key-points -->
## Key points

- Business Critical for low latency and a free readable replica, Hyperscale beyond 4 TB, serverless for intermittent use.
- Azure SQL Database defaults: MAXDOP 8, compatibility level 170, RCSI on, `ALLOW_SNAPSHOT_ISOLATION` on, ADR on, optimized locking on, Query Store on, `FORCE_LAST_GOOD_PLAN` on.
- RCSI = statement-level consistency, SNAPSHOT = transaction-level (error 3960 on update conflict), SERIALIZABLE = no phantoms. Lost updates need atomic updates, `UPDLOCK` or rowversion checks.
- Actual plans reveal estimate errors; Key Lookup = add `INCLUDE`; implicit conversion = fix data types.
- Query Store: regressed queries, plan forcing, hints without code change; Query Performance Insight = portal view of Query Store for Azure SQL Database.
- Head blocker has `blocking_session_id = 0`; deadlock victim gets 1205; Azure SQL Database needs an XE session for deadlock graphs.
