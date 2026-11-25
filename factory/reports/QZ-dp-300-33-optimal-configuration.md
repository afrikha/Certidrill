# QZ-dp-300-33-optimal-configuration — report

File: `content/dp-300/quizzes/33-optimal-configuration.yaml` (10 questions, `npx tsx factory/check-quiz.ts dp-300 33-optimal-configuration` → 0 problem(s), 0 warning(s)).

Objectives: 3.3.3 (q1), 3.3.2 (q2), 3.3.5 (q3), 3.3.7 (q4), 3.3.8 (q5, q8), 3.3.4 (q6), 3.3.9 (q7), 3.3.1 (q9), 3.3.6 (q10). Formats 6–10: yesno_statements, dragdrop, multi, single, dropdown.

## Chapter vs current Learn (Nov 2026)

- **Scalar UDF inlining in Azure SQL Database is preview.** ALTER DATABASE SCOPED CONFIGURATION lists `TSQL_SCALAR_UDF_INLINING` as "Azure SQL Database (feature is in preview)" (Managed Instance isn't listed). The chapter (IQP section) gives `TSQL_SCALAR_UDF_INLINING = OFF` as a generic way to disable a feature. q4 uses SQL Server 2022 on a VM for this reason.
- **Geo-replication scaling order.** Learn (Scale single database resources in Azure SQL Database) says secondary-first upgrade / primary-first downgrade is a *requirement* only when the service tier (edition) changes. Within the same tier, it's "general guidance for best performance". The chapter table presents it as a rule. q8 says "Microsoft recommends". Mock `dp300-3c-scale-geo-order` (GP → BC) is fine.
- **Resource Governor I/O.** The chapter says Resource Governor limits "physical read I/O". CREATE RESOURCE POOL says that `MIN/MAX_IOPS_PER_VOLUME` count both reads and writes. The overview page says it doesn't govern write I/O by system tasks. This is a minor simplification.
- `sys.dm_operation_status`: it lives in master only (server-level principal), and Learn says it keeps about one hour of data. The chapter doesn't mention the retention.

## Facts not fully verified

- **OPPO (compatibility level 170, SQL Server 2025):** neither the IQP page nor the OPPO page labels it preview or GA. I treated it as GA (q7).
- **Automatic index compaction** (chapter 3.3.1): Learn only links to it. I didn't check whether it's GA, and I didn't use it in the quiz.
- `sys.dm_db_resource_stats` "every 15 seconds" (q5 distractor explanation): from memory, not fetched.
