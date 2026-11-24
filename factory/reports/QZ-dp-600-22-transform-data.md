# QZ-dp-600-22-transform-data — report

File: `content/dp-600/quizzes/22-transform-data.yaml` (10 questions, `dp600-qz-22-01` to `-10`). `npx tsx factory/check-quiz.ts dp-600 22-transform-data`: 0 problem(s), 0 warning(s).

Objectives: 2.2.1 (q5), 2.2.2 (q6), 2.2.3 (q2, q9), 2.2.4 (q7), 2.2.5 (q3), 2.2.6 (q1), 2.2.7 (q8), 2.2.8 (q10), 2.2.9 (q4). Formats 6–10: single ×2, yesno_statements, dropdown (PySpark), ordering.

The bank already holds ≈130 questions on 2.2.x. The quiz uses decisions it doesn't test: UNION ALL, SCD type 3, the GROUP BY ALL grain trap, filtering on the partition column, sp_refreshview, adding an IDENTITY key to an existing table, composite-key fan-out when denormalizing, COUNT(*) vs COUNT(expr) and AVG with TRY_CAST/COALESCE, lakehouse surrogate keys (left_anti + row_number + max), and changing a column type without ALTER COLUMN.

## Facts verified on Learn (fetched)

- T-SQL surface area: ADD nullable columns and DROP COLUMN are supported, ALTER COLUMN is in preview, sp_rename renames columns, GROUP BY ALL and QUALIFY are supported, MERGE is GA, and materialized views, triggers and synonyms are unsupported.
- ALTER TABLE (Fabric syntax): ALTER COLUMN supports only metadata-only changes that need no validation or rewrite of the data. Supported type changes are widening, such as int to bigint.
- IDENTITY page: ALTER TABLE can't add IDENTITY; Learn suggests a CTAS or SELECT INTO copy. IDENTITY is bigint only, with no seed or increment.
- GROUP BY page: Fabric `GROUP BY ALL` groups by all the non-aggregated SELECT expressions. This differs from the legacy SQL Server `GROUP BY ALL col`.
- sp_refreshview, UNION, TRY_CAST and AVG all apply to Warehouse in Microsoft Fabric.
- Partitioning for Delta tables: pruning happens "when a query filters on the partition column."

## Doubts and unverified points

- **q4 (partition filter)**: Learn says pruning happens when the filter is on the partition column. It doesn't say outright that `year(OrderDate)` reads every partition. So the stem states that the Spark UI shows every partition being read, instead of claiming it as a general rule. Delta generated columns could change this behaviour, but the scenario doesn't use them.
- **q6**: Learn doesn't give the exact syntax for adding a new IDENTITY column with CTAS. The correct option says to "copy the rows into a new table that has a bigint IDENTITY column, and replace dbo.DimSupplier". It doesn't specify CTAS.

## Chapter and mock-exam issues against current Learn (not edited)

- **sp_rename for columns**: Learn contradicts itself here. The surface-area page says to use sp_rename to rename a column in a Warehouse table. The sys.sp_rename page says `OBJECT` is the only supported `@objtype` for Warehouse in Microsoft Fabric and gives no Fabric column example. The chapter (`sp_rename` for columns) and the mock question `dp600-2b-sp-rename-column` (answer `EXEC sp_rename 'dbo.DimCustomer.CustSeg', 'CustomerSegment', 'COLUMN'`) rely on the `'COLUMN'` form, so someone should check this. q10 says "Run sp_rename" without an objtype.
- **Materialized views**: the "What Is Fabric Data Warehouse?" page now lists "materialized views" among the warehouse capabilities. The T-SQL surface area page still lists them as unsupported. The chapter (key points: "No materialized views in the warehouse") and the bank (`dp600-2b-agg-statements` s2, `dp600-2b-sqlep-statements` e, `dp600-2b-migrate-redesign`, `dp600-2b-date-table-proc` d) follow the surface area page. Watch for a change.
- **IDENTITY copy**: the chapter says "copy the table with CTAS or SELECT ... INTO". The IDENTITY page only documents that a CTAS or SELECT INTO copy **inherits** an IDENTITY that already exists. How to add a new one in the copy isn't shown, so "create the new table with IDENTITY, then INSERT ... SELECT" is the safer wording.
- **Partitioning**: Learn now says that "for file skipping and read performance alone, liquid clustering is more effective than partitioning." It also recommends at least 1 GB per partition. The chapter's sentence on partition pruning could add both points.
