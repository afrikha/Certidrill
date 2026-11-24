# QZ-dp-750-44-monitoring-optimization — report

File: `content/dp-750/quizzes/44-monitoring-optimization.yaml` (10 questions, check: 0 problem(s), 0 warning(s)).

Coverage: 4.4.1 (q2, q7), 4.4.2 (q3), 4.4.3 (q6), 4.4.4 (q9), 4.4.5 (q1, q10), 4.4.6 (q4), 4.4.7 (q5, q8). Positions 6–10: single, yesno_statements, multi, dragdrop, dropdown.

## Chapter out of date or wrong against current Learn (Nov 2026)

1. **Budgets (4.4.1 table "Levers to reduce cost")**: the chapter says budgets are "created by an **account admin**". The budgets page now also says that workspace admins can create and manage budgets scoped to the workspaces they administer, by using Governance Hub (Create and monitor budgets - Azure Databricks). The quiz avoids the point; the chapter row should be updated.
2. **`DatabricksTables` (4.4.6 table of Log Analytics tables)**: no such table or category exists in "Supported log categories - Microsoft.Databricks/workspaces". Table and permission events go to `DatabricksUnityCatalog` (category `unityCatalog`). Check and fix the row (EN and FR).
3. **Predictive optimization "on by default for accounts created since November 11, 2024"**: the current predictive optimization page only says "Predictive optimization is enabled by default", with no date. Consider removing the date.
4. **Skew fixes (4.4.4)**: the chapter lists "broadcast the small side" as a skew fix. The Skew and spill page says broadcast joins are never skew-optimized by AQE; broadcasting avoids the shuffle, so it isn't wrong, but the page's own skew fixes are AQE thresholds, salting, liquid clustering of the source table and the `REBALANCE` hint for skewed writes (the latter two are absent from the chapter).
5. **Jobs queueing (4.4.2)**: the chapter says Skipped runs are fixed by raising Maximum concurrent runs, but doesn't mention the **Queue** setting (on by default for jobs created in the UI since April 15, 2024), which prevents skips by queuing runs for up to 48 hours. Worth one line in the chapter; q3 uses it as a distractor (a queued run doesn't start at its scheduled time).
6. **VACUUM LITE** is Public Preview (Databricks Runtime 16.4 LTS and above) on the vacuum page; the chapter presents it without the preview mention. Also new: on Databricks Runtime 18.0 and above, retention is controlled with `deletedFileRetentionDuration`.
7. **Diagnostic logs**: the delivery page "highly discourages" moving audit data outside the platform and recommends `system.access.audit`; the chapter's exam tip says the recommendation but not the warning.

## Doubts and unverified facts

- q7 s1 (tags not retroactive): the chapter states it; Learn pages fetched (billing reference, usage-detail tags) don't say it in those words. It follows from records being written with the tags present at usage time, and from the tags page (tag changes apply only after a compute restart). Kept, with this caveat.
- q6 option c (`spark.driver.maxResultSize`): the explanation relies on Apache Spark configuration semantics (the limit caps serialized results sent to the driver), not on a fetched Learn page.
- q10: the predictive optimization page says explicit ENABLE/DISABLE at any level overrides inheritance, and INHERIT "resets ... to inherit from the parent object"; it doesn't spell out the exact case "table ENABLE under a schema DISABLE". The quiz relies on the general override rule.
- q8: Monitoring Reader (`*/read`, `workspaces/search/action`) and Monitoring Contributor (`scheduledqueryrules/*`, `actiongroups/*`, `*/read`) actions verified on "Azure built-in roles for Monitor". The log search alert page says a rule without a managed identity inherits the permissions of its last editor; no managed identity is needed for a Log Analytics query.
- Standard tier: the Premium plan requirement for diagnostic logs is still on Learn; the pages I fetched don't mention a Standard tier retirement.
