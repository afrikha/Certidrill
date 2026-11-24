# QZ-dp-700-23-streaming-data — notes

`content/dp-700/quizzes/23-streaming-data.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.3.1 (q1), 2.3.2 (q2), 2.3.3 (q6), 2.3.4 (q3, q7), 2.3.5 (q4, q9), 2.3.6 (q10), 2.3.7 (q5, q8). Positions 6–10: single, multi, dropdown (T-SQL), dropdown (PySpark), yesno.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Update policy, cross-database**: the chapter says "Source and target are in the same database; no cross-database query". The current "Update policy overview" page says the function *can* reference tables in other databases if the policy has a `ManagedIdentity` property and that identity has the `viewer` role on those databases. The limit only applies when no managed identity is set. The mock question `dp700-2d-kql-policy-statements` states "No managed identity is configured", so it is still correct.
- **Update policies over accelerated shortcuts**: Learn contradicts itself. "Query acceleration for OneLake shortcuts - overview" says materialized views **and update policies** aren't supported on accelerated shortcuts. "Update policy overview" says a policy query can reference an accelerated external table only if its `Hot` period covers all data (currently `Hot` >= 100 years), and it has a preview section on update policies over external delta tables. The chapter says this is "limited to a preview". Keep it out of questions.
- **Schema changes**: standard shortcuts sync schema changes automatically by default (`AutoUpdateSchema`), and q2 relies on this. For accelerated shortcuts, Learn says a schema change must be followed by an `.alter` of the external delta table schema, which can restart acceleration from scratch. The chapter's line "Schema changes in the source are synchronized by default" doesn't make this distinction.
- **SQL operator**: Learn adds a limit that the chapter doesn't mention: eventstream names that contain `_` or `.` aren't compatible with SQL operators.
- **Group by windows**: the Learn training unit "Eventstream transformations" lists only tumbling and sliding windows for the Group by operator. The chapter writes "tumbling, sliding and other types", which I couldn't confirm.

## Facts beyond the chapter text

- In q9, Delta sinks support append and complete output modes, not update. Source: "Select an output mode for Structured Streaming" (Azure Databricks Learn page; no Fabric page states it). The question can also be solved from the chapter alone: update would append changed rows and duplicate devices. I cited the Databricks page because it is the only Learn source for output modes. Databricks is out of scope as a product but not as a reference for Spark/Delta behaviour.
- q8 (T-SQL `LAG` and `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`) tests the batch SQL windowing that the chapter covers in one sentence. The OVER clause page lists Fabric Warehouse and SQL analytics endpoint under "Applies to".
- In q6, the 6 GB compressed Parquet limit, the 900 columns and the 2.5 million files come from the query acceleration overview (verified). Rewriting the table into smaller files as the fix is my own inference from that limit: Learn gives no fix.

## Design notes

- The mock bank covers 2.3.x heavily, so I chose decisions it doesn't test: a Google Cloud Pub/Sub source, shortcut schema sync, the Aggregate operator (per event) versus Group by, partition column cardinality, the snapshot window, the 6 GB cache limit, SQL operator path rules (not combined with built-in operators, not chained), the T-SQL moving window, complete mode for an unwindowed aggregation, and cascading update policies with a 0s soft-delete period (which requires transactional policies).
- No preview feature is a correct answer.
