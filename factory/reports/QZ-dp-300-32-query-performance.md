# QZ-dp-300-32-query-performance — notes

`content/dp-300/quizzes/32-query-performance.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 3.2.1 (q1), 3.2.2 (q9), 3.2.3 (q3, q10), 3.2.4 (q2, q8), 3.2.5 (q7), 3.2.6 (q5), 3.2.7 (q4), 3.2.8 (q6). Positions 6–10: multi ×2, single, dropdown, yesno_statements.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Optimized locking requires accelerated database recovery** (Learn: "You must enable ADR on a database before you can enable optimized locking"; to disable ADR, disable optimized locking first). The chapter says this. It doesn't say that Managed Instance with the **SQL Server 2022 update policy** has no optimized locking (only Always-up-to-date and SQL Server 2025 policies have it, always on).
- **Performance Tuning Guidance page (Azure SQL Database)** says that "Parameter Sensitivity Plan Optimization is not available in Azure SQL Database". The chapter (and the mock question `dp300-3b-construct-psp`, answer: compatibility level 160 in Azure SQL Database) say it is available at compatibility level 160. The Learn PSP page should be checked; this quiz doesn't use PSP.
- **Query Store hints**: Learn's demo section calls `sp_query_store_set_hints` with `@value` while the syntax uses `@query_hints` (Learn inconsistency; the chapter and q9 use `@query_hints`). Hints are also allowed on secondary replicas from SQL Server 2025 when Query Store for secondary replicas is enabled (not in the chapter).
- **Blocking page**: Learn's text says `sys.dm_exec_requests` lists only executing requests, but its scenario table attributes the sleeping status and `Open_Tran` to `sys.dm_exec_request` (Learn inconsistency). The chapter's DMV table is right.
- Confirmed as written: `DATA_FLUSH_INTERVAL_SECONDS` default 900, `INTERVAL_LENGTH_MINUTES` default 60; Query Store hints override hard-coded hints and plan guides and are ignored (never blocking) when they can't be applied; RCSI is on by default in Azure SQL Database; Intelligent Insights is preview, Azure SQL Database and Managed Instance, not in West Europe, North Europe, West US 1, East US 1; filtered indexes don't support `LIKE`.

## Preview feature as an answer

- q6 (3.2.8) asks where Intelligent Insights can be used: the feature is a preview, and the objective requires testing it. The chapter and the mock questions do the same.

## Not verified on a fetched page

- q4 option d: "a spill shows as a warning in the actual plan" comes from the chapter (exam trap), not from the fetched Statistics page.
- q5: the fetched Performance Tuning Guidance page doesn't discuss row-by-row versus set-based code or non-SARGable functions; these come from the chapter. The SARGability of `LIKE 'EU-%'` (constant prefix) is general knowledge.
- q7: the use of `WITH (ONLINE = ON)` with a filtered index isn't on the fetched filtered index page (it's supported by CREATE INDEX).
- q10: the default state of ADR and RCSI on a new SQL Server 2025 database (off) isn't on the fetched page; Learn says optimized locking is off by default in SQL Server 2025.

## Design notes

- Decisions not in the mock exam: data flush interval (q1), memory grants DMV (q2), head blocker absent from `sys.dm_exec_requests` (q3), stale statistics on an ascending key with RECOMPILE ruling out sniffing (q4), resource clue → fix (q5), Intelligent Insights by region and offering (q6), filtered covering index (q7), `query_hash` + `total_worker_time` in `sys.dm_exec_query_stats` (q8), Query Store hint overriding a hard-coded hint, failure and persistence (q9), optimized locking prerequisites on SQL Server 2025 (q10).
