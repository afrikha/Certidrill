# QZ-dp-700-22-batch-data — notes

`content/dp-700/quizzes/22-batch-data.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.2.1 (q3), 2.2.2 (q7), 2.2.3 (q1), 2.2.4 (q2), 2.2.5 (q4), 2.2.6 (q8), 2.2.7 (q9), 2.2.8 (q5), 2.2.9 (q6, q10). Positions 6–10: dropdown ×2, single, yesno_statements, multi.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Mirroring after a capacity pause**: the chapter says "A paused capacity stops replication (status Paused)". According to "Troubleshoot Fabric mirrored databases", the mirrored database stays **Paused** after the capacity resumes, until someone selects **Resume replication**. After a long pause, mirroring may reseed from the beginning. Throttling, by contrast, resumes by itself. The chapter should say this, because q2 tests it.
- **Event processing editor**: Activator is also a destination that supports operators before ingestion (Lakehouse, Eventhouse with event processing, derived stream, Activator).
- **KQL database shortcuts**: the KQL page lists internal sources (KQL databases, lakehouses, warehouses) and external sources (ADLS, Amazon S3, Google Cloud Storage). The chapter's list of external targets (Dataverse, S3-compatible, on-premises) applies to lakehouse shortcuts and doesn't say this.
- **Pipeline activities**: the activity overview also lists **Refresh materialized lake view** next to Refresh SQL analytics endpoint and Lakehouse maintenance. The chapter could add it.
- **T-SQL in a KQL database** is query-only (DQL; CREATE/INSERT/ALTER aren't supported). `explain` translates a T-SQL SELECT into KQL. The chapter's "KQL (and T-SQL)" could say read-only.
- Confirmed as written: OPENJSON and JSON_VALUE apply to Fabric Warehouse and the SQL analytics endpoint. Cross-database queries with three-part names work within the same workspace. Shortcuts in a KQL database are queried with `external_table()`, one folder or table each, and can't be renamed. Distinct counts and ratios aren't additive (fact tables page).

## Not verified on a fetched page

- q6: the PySpark signatures (`dropDuplicates()`, `dropna(subset=)`, `fillna(value, subset=)`, `replace()`) come from the Apache Spark API. The cited training unit shows the same cleaning rules in Spark SQL only.
- q9: join fan-out on duplicate keys and broadcast-join behaviour are general Spark behaviour. The cited Learn pages cover denormalization and joins, but not these two points.
- q1: no page says that referencing a shortcut by its bare name fails. Learn only says to query it with `external_table()`.
- q4: the "Refresh SQL analytics endpoint activity" page has no preview label, and the activity overview labels no activity preview.
- q10: the dynamic partition overwrite mode with INSERT OVERWRITE is a best-practice bullet on "Replace Delta tables" (Fabric). No code example was visible.

## Design notes

- I read the 95 mock questions of 2.2.x and avoided their decisions. The new decisions are: `external_table()` for a KQL shortcut, Resume replication after a capacity pause, a same-workspace cross-database join, the Refresh SQL analytics endpoint activity, non-additive distinct counts, an exact-duplicate, missing-key and fill-one-column PySpark chain, KQL update policy against T-SQL in a KQL database, OPENJSON with CROSS APPLY, denormalization fan-out and broadcast, and idempotent reprocessing (dynamic partition overwrite or MERGE).
- No preview feature is an answer.
