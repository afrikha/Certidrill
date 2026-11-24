# QZ-dp-800-22-performance — report

Quiz: `content/dp-800/quizzes/22-performance.yaml` (10 questions, check: 0 problem(s), 0 warning(s)).

| # | Objective | Type | Difficulty | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 2.2.2 | single | 1 | NOLOCK = dirty reads |
| 2 | 2.2.1 | single | 1 | Business Critical for 1-2 ms on all data |
| 3 | 2.2.3 | single | 2 | Actual plan to compare estimated and actual rows |
| 4 | 2.2.4 | single | 2 | Blocking by a client that doesn't fetch all rows |
| 5 | 2.2.3 | single | 2 | Stale statistics after a load (REORGANIZE doesn't update them) |
| 6 | 2.2.1 | single | 3 | Hyperscale serverless (> 4 TB + autoscale per second) |
| 7 | 2.2.1 | ordering | 3 | Compatibility level upgrade with a Query Store baseline and plan forcing |
| 8 | 2.2.3 | multi | 3 | Query Store / QPI history survives a failover, DMVs don't |
| 9 | 2.2.2 | dropdown | 3 | SNAPSHOT + ALLOW_SNAPSHOT_ISOLATION + retry on 3960 (SQL Server defaults) |
| 10 | 2.2.4 | yesno_statements | 3 | Reading a deadlock graph: victim, key-range locks of SERIALIZABLE, DEADLOCK_PRIORITY |

## Doubts and unverified facts

- Q8: `sys.dm_exec_query_stats` is documented as tied to the plan cache ("When a plan is removed from the cache, the corresponding rows are eliminated"); Learn doesn't say "failover" explicitly. The answer relies on the fact that the new primary replica has its own plan cache.
- Q9: Learn confirms error 3960 ("Snapshot isolation transaction aborted due to update conflict") but doesn't say in so many words that the transaction is rolled back; the code uses `IF @@TRANCOUNT > 0 ROLLBACK`, which works either way.
- Q6: the maximum vCores of Hyperscale serverless wasn't checked (the stem uses 24 vCores, far below the published limits as I know them). Hyperscale serverless auto-pause is a preview feature (serverless overview), so the stem states that the database never needs to pause.
- The Learn page I could find on SARGable predicates (Index architecture and design guide) only defines the term and gives no function-on-column example, so the quiz doesn't test the chapter's `YEAR(OrderDate)` row.

## Chapter vs current Learn

- Service tiers: the vCore page also gives Hyperscale "1-2 milliseconds on average for the frequently accessed part of your database". The chapter's table shows only "local SSD cache" for Hyperscale, and the exam tip "consistently under 2 ms = Business Critical" holds only when the requirement covers all the data; consider saying so.
- Snapshot isolation: the chapter doesn't give the defaults of `ALLOW_SNAPSHOT_ISOLATION` (ON in Azure SQL Database, OFF in SQL Server and Managed Instance, per the locking and row versioning guide); worth one line, since it decides whether `ALTER DATABASE ... SET ALLOW_SNAPSHOT_ISOLATION ON` is needed.
- Table hints: NOLOCK "can't be specified for tables modified by insert, update, or delete operations" and is ignored on the target of UPDATE/DELETE (deprecated); not in the chapter, no change needed.
- No error found in the mock-exam questions read for these objectives.
