# QZ-dp-700-32-resolve-errors — notes

`content/dp-700/quizzes/32-resolve-errors.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 3.2.1 (q1, q9), 3.2.2 (q5), 3.2.3 (q4, q7), 3.2.4 (q2, q8), 3.2.5 (q3), 3.2.6 (q6), 3.2.7 (q10). Positions 6–10: multi ×2, yesno_statements ×2, single.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Database shortcut, tenant**: the chapter (section eventhouse-errors) says a database shortcut "works only within the same tenant and region". "Create a Database Shortcut" (fabric/real-time-intelligence/database-shortcut) says the source and the shortcut must be in the same region, but that they "can be in different tenants". The tenant part is wrong. I didn't test it in the quiz.
- **`SET TRANSACTION ISOLATION LEVEL`**: the chapter says the statement "is ignored". The T-SQL surface area page lists it among unsupported commands ("Don't try to use these commands. Even if they appear to succeed, they might cause problems"). Better wording would be "not supported, don't use it". It isn't used in the quiz.
- **Spark bursting**: the chapter's "bursting up to three times" has exceptions in the Learn table. F2 bursts to 20 VCores, not 12. A trial capacity has no burst (128/128) and no queue. FTL4 bursts to 16. A capacity admin can also turn off job-level bursting (**Disable job-level bursting**). The chapter could add a line on these.
- **Eventstream data conversion errors**: Learn defines the metric but gives no fix. The chapter's fix ("fix the mapping or add a transformation") is reasonable but unsourced. I didn't find a Learn page that says Manage fields can change a field's type, so no quiz question relies on it.
- Confirmed as written: the Fail activity (custom message and code, used with If Condition). HTTP 430: interactive jobs and the notebook public API are rejected, pipeline, scheduler and SJD jobs are queued (FIFO, expire after 24 h), and a throttled capacity rejects jobs. `_inlineInstallationEnabled` is a Boolean activity parameter. `%pip` isn't supported in high concurrency mode or reference runs. Destinations take tabular queries only. Duration goes only to ADX. Detailed logs are kept 28 days. The red exclamation mark means a failed refresh or a failed save/validation. Fabric DW blocks `ALTER TABLE` except the listed subset, and triggers aren't supported. KQL `external_table()` queries shortcuts. Query limits are 500,000 records / 64 MB and 4 min / 10 min / 1 h. Shuffle suits high-cardinality keys. Trusted workspace access needs an F SKU (not trial), rules through ARM/PowerShell only, the shortcut principal needs a Storage Blob Data role, and the DFS URL.

## Doubts and unverified facts

- q1 (rerun from the failed activity): the Fabric page "How to monitor pipeline runs in Monitoring hub" says you can "rerun your pipeline by failed activity or the selected activity". It doesn't say in so many words that activities that already succeeded are skipped. The quiz relies on the usual meaning of the feature.
- q9 cites the ADF page "Pipeline failure and error message", whose Applies to banner lists ADF and Synapse but not Fabric. I found no Fabric page that covers the AND semantics of several dependencies or the Upon Completion + If Condition OR pattern. The chapter uses the same source. The second reference is the Fabric Fail activity page.
- q8 first used `hint.shufflekey` for a high-cardinality `summarize`. I replaced it with a Yes/No question on update policy failures, the 14-day window and the command timeout, because `dp700-3d-kql-antipatterns` (3.3.6) already tests the same shuffle decision. Treating `.set-or-append` as a management command with the 10-minute default comes from the query limits page ("10 minutes for management commands").
- q7 s3 depends on the default capacity setting (job-level bursting on) and on the pool size given in the stem (24 × 8 = 192 VCores).

## Design notes

- The mock bank covers almost every symptom of the chapter. The quiz tests the remaining decisions: rerun from the failed activity, `external_table()`, data conversion vs deserialization errors, `_inlineInstallationEnabled` when the notebook can't change, Duration/list/validation status in Dataflow Gen2, unsupported `ALTER TABLE ADD ... NOT NULL` and triggers, throttling vs queueing and job-level bursting, update policy failures without IsTransactional (rows in the source only), the 14-day window of `.show ingestion failures` and the 10-minute timeout of management commands, AND dependencies plus the Fail activity, and trusted access with an organizational account on a trial capacity.
- No preview feature is an answer.
