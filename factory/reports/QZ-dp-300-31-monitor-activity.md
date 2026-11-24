# QZ-dp-300-31-monitor-activity — notes

`content/dp-300/quizzes/31-monitor-activity.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 3.1.1 (q1, q8), 3.1.2 (q2), 3.1.3 (q3, q6), 3.1.4 (q4, q7), 3.1.5 (q5), 3.1.6 (q9, q10). Positions 6–10: multi ×2, dropdown ×2, dragdrop.

## Chapter vs current Learn (fix in the chapter, not done here)

- **`pair_matching` isn't supported in Azure SQL Database or Azure SQL Managed Instance** (Extended Events Targets page: event_file, ring_buffer, histogram and event_counter are; pair_matching and etw_classic_sync_target aren't). The chapter's target table lists `pair_matching` with no platform caveat. q9 places the pair_matching requirement on SQL Server 2022 on a VM for that reason.
- **`sys.dm_os_performance_counters`** applies to Azure SQL Database too (and SQL database in Fabric), not only to SQL Server and Managed Instance as the chapter's source table says. Permissions differ by tier (Basic, S0, S1 and pooled databases need the server admin, the Entra admin or `##MS_ServerStateReader##`).
- **`sys.elastic_pool_resource_stats`**: the chapter says "Aggregated"; Learn says one row per pool for each **15-second** window, kept 14 days, and querying it needs membership in the **dbmanager** role.
- **Activity Monitor** applies to SQL Server only (Learn "Applies to"); its Data File I/O pane needs `CREATE DATABASE`, `ALTER ANY DATABASE` or `VIEW ANY DEFINITION` in addition to `VIEW SERVER STATE`. The chapter's tools table doesn't say so (q4 uses a sysadmin member to avoid the issue).
- **event_file storage**: Learn adds two requirements absent from the chapter: a Standard general-purpose v2 account, and redundancy that matches the SQL resource (LRS/GRS/RA-GRS for locally redundant, ZRS/GZRS/RA-GZRS for zone-redundant). The credential name must not end with a slash (error 86); hierarchical namespace gives error 13.
- Confirmed as written: database watcher is preview, won't reach GA, no create/edit since November 9, 2026, collection stops April 30, 2027, replacement Database Hub in Microsoft Fabric; not started automatically; 100 targets per watcher, 20 per subscription; no alerts with a free cluster or Real-Time Analytics; Key Vault only for SQL authentication. Deadlocks is a platform metric (`deadlock`, Count, Total/Count aggregations, PT1M).

## Preview feature as an answer

- q5 (3.1.5) is about database watcher, which is a preview being retired: the objective requires it. The statements test how an existing watcher works (Entra authentication without Key Vault, no edits since November 9, 2026, KQL on the data store); no statement asks to create or use a new watcher.

## Not verified on a fetched page

- q5 s3 (KQL or T-SQL on the data store) comes from the chapter; the fetched overview doesn't say it in the part I asked about.
- q6: "the memory that caches pages grows with the number of vCores" is general knowledge; the fetched DMV page only says to upgrade the compute size or tune the queries when the I/O limit is reached.
- q7: the one-hour lookback period of a metric alert rule isn't listed on the fetched page (it lists no values); one hour is a standard window size.
- q10 option `'stprosexe'`: an identity named after the storage account with the account key as SECRET is the SQL Server backup-to-URL credential form, not documented on the event_file page.

## Design notes

- Decisions not in the mock exam: baseline period (q1), PLE through T-SQL on MI (q2), WRITELOG → log write column (q3), Activity Monitor (q4), watcher after the edit freeze (q5), data I/O fixes with two complete solutions (q6), deadlock metric alert instead of logs for least cost (q7), pool-level 12-day history (q8), choosing four targets (q9), managed-identity credential with no secret (q10).
