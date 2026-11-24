# FIX-dp-300-2 — chapters 23, 31, 32, 33 and 41 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert dp-300 23-compliance-controls 31-monitor-activity 32-query-performance 33-optimal-configuration 41-sql-agent-jobs` 0 problems; `content:validate --cert dp-300` 0 problems, 0 warnings; `check-quiz dp-300` (5 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. One code block changed, identically in both languages (the `sys.fn_get_audit_file` path in 23). The WebFetch hourly budget ran out twice during the pass; every finding below marked "Confirmed" was fetched before it was changed.

## 23-compliance-controls

| Finding | Learn | Change |
| --- | --- | --- |
| Server-level auditing re-architected | Confirmed (auditing-overview, "July 2025 GA"): one server-level extended event session for all databases; all server audit logs, read-only replicas included, go to a single `master` folder (filter on `is_secondary_replica_true`); viewing needs `VIEW DATABASE SECURITY AUDIT` in the user database; database auditing unchanged, recommended for many databases with heavy OLTP workloads | auditing section: new paragraph |
| `sys.fn_get_audit_file` path `.../sqldbauditlogs/sql-contoso/` | audit-log-format: `<ServerName>/<DatabaseName>/<AuditName>/<Date>/`; fn_get_audit_file_v2 documents `<container>/<ServerName>/<DatabaseName>/` | Code path now `.../sqldbauditlogs/sql-contoso/master/` (EN and FR identical) |
| Immutable audit storage | Confirmed: **Allow protected append writes** = Append blobs or Block and append blobs, None not supported; storage retention interval shorter than auditing retention; auditing retention 0 not supported | Storage notes sentence |
| Data classification: Purview access policies retired, Security Admin, User Access Administrator | Confirmed (data-discovery-and-classification-overview): label-based access control with MIP access policies retired, existing policies no longer enforced (no date given); tenant-wide Security Admin switches the mode; User Access Administrator and Reader can read only | New sentence under the policy-mode table; roles sentence |
| Ledger: Contributor for Azure Confidential Ledger | Confirmed (ledger-digest-management) | Digest bullet |
| Ledger: `sys.sp_verify_database_ledger` needs `VIEW LEDGER CONTENT` | Confirmed (procedure page) | New bullet |
| Ledger: verification needs a database option set first | ledger-verify-database says an ALTER DATABASE SET option must be enabled but doesn't name it; the procedure page names none | None (an unnamed option isn't teachable). Not confirmed which option |
| Ledger trap "doesn't prevent it" too strong | Confirmed (ledger-overview): append-only tables, history tables and ledger views can't be modified (API level); someone controlling the files can bypass checks, ledger detects it at verification | Trap reworded |
| CDC on Azure SQL Database extra limits | Confirmed (change-data-capture-overview): `maxtrans`/`maxscans` changeable with `sp_cdc_change_job`; online index operations not supported (error 18773); ADR aggressive log truncation disabled; no SLA, no sub-second latency | CDC facts paragraph. The Entra-user restrictions (database created by an Entra user, restores) are left out: too detailed for the objective |
| Change tracking PK only on ALTER TABLE page; DDM `datetime()` "SQL Server 2022" | Not re-fetched; the chapter doesn't contradict either | None |

## 31-monitor-activity

| Finding | Learn | Change |
| --- | --- | --- |
| `pair_matching` not in Azure SQL Database / Managed Instance | Confirmed (targets-for-extended-events: pair_matching and etw_classic_sync_target SQL Server only) | Target row: "(SQL Server only…)" |
| event_file storage requirements | Confirmed (xevent-code-event-file): Standard general-purpose v2, same region, Hot, redundancy matching the SQL resource (LRS/GRS/RA-GRS or ZRS/GZRS/RA-GZRS), no hierarchical namespace; error 13 = HNS or immutability policy; error 86 = credential name with a trailing slash | Storage row of the XE table |
| `sys.dm_os_performance_counters` applies to Azure SQL Database | Confirmed: SQL Server, Azure SQL Database, Managed Instance, Synapse, Fabric; Basic/S0/S1/pooled need server admin, Entra admin or `##MS_ServerStateReader##` | Sources table row |
| `sys.elastic_pool_resource_stats` "Aggregated" | Confirmed: one row per pool per 15-second window, 14 days, `master`, `dbmanager` role | Baseline table row |
| Activity Monitor SQL Server only, Data File I/O permissions | Confirmed (activity-monitor and open-activity-monitor pages: Applies to SQL Server; `VIEW SERVER STATE`, plus `CREATE DATABASE`, `ALTER ANY DATABASE` or `VIEW ANY DEFINITION` for Data File I/O) | Tools table row |
| Database watcher dates, limits, deadlocks metric | Confirmed by the QZ writer; not re-fetched | None |

## 32-query-performance

| Finding | Learn | Change |
| --- | --- | --- |
| Optimized locking not on MI with the SQL Server 2022 update policy | Confirmed (optimized-locking availability table) | "(not available with the SQL Server 2022 update policy)" |
| PSP "not available in Azure SQL Database" (Performance Tuning Guidance page) | Not confirmed: the PSP page (most specific) applies to SQL Server 2022+, Azure SQL Database, Managed Instance, Fabric, at compatibility level 160 (170 for the SQL Server 2025 enhancements) | None. Chapter and `dp300-3b-construct-psp` kept |
| Query Store hints on secondary replicas | Confirmed (query-store-hints): SQL Server 2025 with Query Store for secondary replicas; `@replica_group_id`; otherwise primary only | New sentence after the hints paragraph |
| `@query_hints` vs `@value` | Learn inconsistent within query-store-hints (syntax section `@query_hints`, demo `@value`, and one section names `sys.sp_query_store_set_query_hints`) | None: chapter keeps `@query_hints` |
| Blocking page DMV inconsistency | Not re-fetched; the chapter's table is right as the QZ writer says | None |

## 33-optimal-configuration

| Finding | Learn | Change |
| --- | --- | --- |
| `TSQL_SCALAR_UDF_INLINING` preview in Azure SQL Database | Confirmed (ALTER DATABASE SCOPED CONFIGURATION: "Azure SQL Database (feature is in preview)", Managed Instance not listed); `BATCH_MODE_ON_ROWSTORE` applies to SQL Server 2019+, Azure SQL Database and Managed Instance | IQP paragraph: example scoped to SQL Server 2019+, preview noted for Azure SQL Database |
| Geo-replication scaling order is a rule only across editions | Confirmed (single-database-scale) | Table row |
| Resource Governor "physical read I/O" | Confirmed (CREATE RESOURCE POOL: IOPS limits count reads and writes) | "physical I/O (reads and writes, in IOPS per volume)" |
| `sys.dm_operation_status` retention | Confirmed: `master`, server-level principal, about 1 hour; Activity Log 90 days | Monitoring row |
| Automatic index compaction GA or preview | Learn page has no preview label; applies to Azure SQL Database, Managed Instance (Always-up-to-date), Fabric; off by default | None. Blogs outside Learn call it preview: flagged |
| OPPO GA or preview | Not labeled on Learn (per QZ writer) | None |

## 41-sql-agent-jobs

| Finding | Learn | Change |
| --- | --- | --- |
| CmdExec/PowerShell steps on Managed Instance | **Learn disagrees**: job-automation-managed-instance lists "OS command/PowerShell steps that can execute custom OS script" as supported (a script stored as a file on disk and PowerShell Core aren't); transact-sql-tsql-differences-sql-server says "Command shell isn't yet supported" | None. For a human decision (see below) |
| Entra group limitation on MI | Confirmed (transact-sql-tsql-differences-sql-server, SQL Server Agent section) | None (chapter right) |
| Agent XPs enabled automatically only when the Agent is started from SSMS | Confirmed (agent-xps-server-configuration-option) | Troubleshooting row |
| History defaults 1,000 / 100 | Confirmed (job-automation-managed-instance) | None |
| `sp_add_jobserver` | Not confirmed beyond "sets the server where the job executes" (QZ writer) | None |

## Mock-exam bank questions changed

None. No bank question of these objectives is contradicted by a confirmed fact.

## Checked and left unchanged

- Auditing: `dp300-2c-audit-storage-firewall`, `-audit-server-db`, `-audit-siem`, `-audit-mi-tsql`, `-audit-entra-failed`, `cs4a-medical-audit` (none uses the folder path or an immutability setting).
- Classification: `dp300-2c-classify-policy-mode` (tenant-wide Security Admin, no recommendations in MIP mode: matches Learn), `-classify-role`, `-classify-*`.
- Ledger: `dp300-2c-ledger-statements` (s1 is about an updatable table, so "detectable, not impossible" is right), `-ledger-digest-storage` (Storage Blob Data Contributor and locked policy match Learn; option d LRS not re-fetched), `-ledger-*`.
- CDC: `dp300-2c-cdc-azure-facts` (matches: frequency fixed, `maxtrans`/`maxscans` adjustable), `-cdc-dtu-tier`.
- XE and metrics: `dp300-3a-xe-*`, `cs2b-xe-session`, `cs4a-deadlock-capture` (no pair_matching on Azure SQL), `dp300-3a-baseline-resource-stats` (option on `sys.dm_os_performance_counters` in DB1 is wrong for another reason), `dp300-3b-dmv-resource-stats-week`.
- Query performance: `dp300-3b-construct-psp` (PSP page confirms level 160 in Azure SQL Database), `dp300-3b-blocking-rcsi-vm`, `-blocking-statements` (optimized locking).
- Configuration: `dp300-3c-scale-geo-order` (GP → BC changes edition, so the order is required), `dp300-3c-rg-*`, the scalar UDF distractors in `dp300-3b-construct-psp` and `-construct-udf`.
- Agent: `dp300-4a-agent-platforms`, `-mi-agent-statements`, `-mi-entra-group`, `-cmdexec-proxy` and `cs2b-agent-proxy` (SQL Server context), `cs1a-job-notification`.

Note for a reviewer: `dp300-3a-xe-storage-account` lists region, tier and hierarchical namespace but not account kind or redundancy, which Learn also requires (Standard general-purpose v2, redundancy matching DB1). The answer is still the only possible one, so it wasn't changed; a sentence such as "All the accounts are Standard general-purpose v2 accounts that use LRS" would remove the unstated condition.

## Quiz files

None changed. The five quizzes still agree with the corrected chapters (check-quiz 0/0).

## For a human decision

- **Managed Instance CmdExec/PowerShell job steps** (41, `agent-platforms` table, exam trap and key points; also `dp300-4b-auto-mi-step-types`, objective 4.3.2, not in this task): the two Learn pages above contradict each other. The chapter follows the T-SQL differences page ("Command shell isn't yet supported").
- **Automatic index compaction** (33): no preview label on Learn; confirm the release status.
- **Ledger verification database option** (23): Learn says an option must be enabled but doesn't name it.
- **Performance Tuning Guidance page** says PSP isn't available in Azure SQL Database; the PSP page says it is. The chapter follows the PSP page.
- **`TSQL_SCALAR_UDF_INLINING` "feature is in preview"** in Azure SQL Database: Learn's wording doesn't say whether the configuration or scalar UDF inlining itself is preview there; the chapter says only that Learn marks the configuration as preview.
- Not checked, possible inconsistency: chapter 33 says optimized plan forcing and OPPO on Managed Instance need the SQL Server 2025 or Always-up-to-date policy; the ALTER DATABASE SCOPED CONFIGURATION page lists neither option for Managed Instance (only DOP_FEEDBACK has the update-policy note).

## French terms not settled

- « mis hors service » (retired) used in 23, as elsewhere in DP-300 chapters; not in the glossary.
- « écritures d'ajout protégées » kept with the English setting name **Allow protected append writes**; « session d'événements étendus » (extended event session); « troncation agressive du journal » (aggressive log truncation): not in the glossary.
- « groupe de disponibilité » (availability group) is used across DP-300 chapters; the glossary only has « groupe à haute disponibilité » for availability sets.
