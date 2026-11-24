# QZ-dp-700-21-loading-patterns — notes

`content/dp-700/quizzes/21-loading-patterns.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.1.1 (q1, q4, q6, q9, q10), 2.1.2 (q3, q8), 2.1.3 (q2, q5, q7). Positions 6–10: single, dragdrop, multi, yesno_statements, dropdown.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Copy job SCD Type 2 is preview.** "Change data capture (CDC) in copy job" says that SCD Type 2 in copy job is currently in preview, and that it isn't supported for Oracle CDC sources. The chapter lists SCD Type 2 among the update methods as "(some databases)" and doesn't say it's preview. The quiz doesn't use it.
- **Copy job default update method.** "What is Copy job" says Append is the default. The CDC page calls SCD Type 1 (Merge) the default in its CDC comparison. The chapter says Append (default). The two pages don't fully agree, so q9 names the Merge method explicitly.
- **Copy job CDC sources** now include Fabric Lakehouse tables (through Delta change data feed: "Whether CDF is enabled or not on Fabric lakehouse tables cannot be automatically detected"). The chapter doesn't mention this. A table of mixed CDC and non-CDC tables is treated entirely as watermark-based.
- **Dataflow Gen2 incremental refresh**: the chapter leaves out several limits from the Learn page. There is a limit of 150 buckets per dataflow (the chapter has 50 per query). The destination must use a fixed schema, and replace is the only update method. The default destination isn't supported. OPTIMIZE and REORG aren't supported on lakehouse tables that use incremental refresh.
- **Spark surrogate keys** (`max(key) + row_number()`): this isn't on "Dimensional modeling in Microsoft Fabric Warehouse: Load tables", which only talks about IDENTITY. The quiz doesn't test it.
- Learn adds two dimensional-load points that the chapter doesn't have, and q8 uses them. Relative offset attributes of the date dimension must be updated daily (by a T-SQL stored procedure). Fact rows stored with the Unknown member need a periodic process to update their keys.
- Confirmed as written: update policy `IsTransactional` defaults to false (the data goes to the source only, and the ingestion succeeds). The watermark is `>` old and `<=` new, saved on success. Event processing before ingestion attaches after an operator or a derived stream. Direct ingestion attaches to the default or a derived stream. A Lakehouse destination can use the default or a derived stream.

## Not verified on a fetched page

- q10: the start version of `table_changes()` counts as included. That is standard Delta Lake behaviour, and the Fabric page shows `table_changes('t', 120, 125)` without saying it explicitly. The Fabric CDF page has no preview label, and it doesn't describe a MERGE pattern. Filtering out `update_preimage` is standard practice.
- q5: I didn't check whether eventstreams now have a SQL or code operator. The distractor uses only Manage fields, and Learn describes the editor as no-code with built-in functions.
- q2 option d (no partial rows with nulls on a query error) is inferred from "If an update policy fails, data is ingested only to the source table".

## Design notes

- I read the 35 mock questions of 2.1.x and avoided their decisions. The new decisions are: an identity watermark against a relative time window, the effect of a failed default update policy, no warehouse staging when the data is already in a lakehouse, the Dataflow Gen2 destination, bucket limit and column-choice rules, Spark job definition against eventstream, Dataflow or KQL for Python logic, soft-delete flag with MERGE against copy job Merge, a streaming pattern for each requirement, date-offset maintenance with the Unknown-key fix, and a CDF incremental copy.
- No preview feature is an answer.
