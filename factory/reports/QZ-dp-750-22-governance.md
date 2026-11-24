# QZ-dp-750-22-governance — report

File: `content/dp-750/quizzes/22-governance.yaml` (10 questions, `npx tsx factory/check-quiz.ts dp-750 22-governance` → 0 problem(s), 0 warning(s)).

Objectives: 2.2.1 (Q1), 2.2.2 (Q7), 2.2.3 (Q4, Q8), 2.2.4 (Q6), 2.2.5 (Q3), 2.2.6 (Q2, Q10), 2.2.7 (Q5, Q9). Formats 6–10: single, yesno_statements, single, dragdrop, multi.

## Chapter wrong or out of date against current Learn (Nov 2026)

- **Wrong exam trap: "`COMMENT ON` doesn't target columns"** (section descriptions-discovery and key points). The SQL reference "COMMENT ON" documents `COMMENT ON COLUMN relation_name.column_name IS ...` (Databricks SQL, DBR 16.1 and above). The "Add comments to data and AI assets" page still says "except table columns", so Learn contradicts itself. The mock questions `dp750-2a-column-comment-code` and `dp750-2a-comment-privileges` use `COMMENT ON COLUMN` as a valid statement, so the chapter contradicts the bank. Fix the trap: both `COMMENT ON COLUMN` (DBR 16.1+ / SQL warehouse) and `ALTER TABLE ... ALTER COLUMN ... COMMENT` work.
- **Retention rule**: "Work with table history" says `logRetentionDuration >= deletedFileRetentionDuration` applies from DBR 18.0, **and for Unity Catalog managed tables from DBR 12.2**. The chapter says "from DBR 18.0" only. Learn also says DBR 18.0+ blocks time travel to versions older than `deletedFileRetentionDuration`; not in the chapter.
- **ABAC**: Learn now has GRANT policies (dynamic privilege grants) and DENY policies (Beta), policies on views (Beta, DBR 19+, "ABAC on Views" preview), and dedicated compute needs DBR 16.4+ **with fine-grained access control filtering enabled**. Learn also documents a workaround for older runtimes: put the workload principal in `EXCEPT`. None of this is in the chapter. The fetched pages don't state whether row filter / column mask policies are GA (only the Beta items are labelled): unverified.
- **Lineage system tables**: Learn now says a "rolling 1-year window"; the chapter says 395 days. Learn also says jobs submitted with `runs submit` or `spark submit` don't appear in lineage.
- **Audit system table**: the reference page states no general retention period (the chapter says 395 days, unverified). It adds that SQL definitions in `request_params` are omitted unless you're an account admin or a member of `databricks_pii_access`. It also says that when a workspace is deleted, its events older than 14 days are removed.
- **IP access lists for recipients**: Learn says that without SecureConnect, storage URLs stay reachable from any client IP. The list controls the sharing REST API, the activation URL and the credential file download. The chapter says only "restrict a token recipient to known IP addresses".
- **Delta Sharing**: Learn names it OpenSharing (the chapter says so, correct). Databricks-to-Databricks only: Learn now also lists metric views and agent skills. Schema shares are always `WITH HISTORY` and drop aliases and partitions; not in the chapter.
- **Auto time-to-live**: the Learn page states no release status. It adds a deletion buffer of up to 6 days plus the file retention (formula `target - 6 - deletedFileRetentionDuration`). The quiz doesn't test auto time-to-live because its status couldn't be confirmed.
- The exam tip about open sharing tokens expiring on December 8, 2026 wasn't re-verified in this task.

## Doubts

- Q10: "Most audit logs are only available in the region of the workspace" (audit log system table reference). That compliance must query from East US compute with grants in the East US metastore follows from this sentence and from per-metastore privileges; Learn has no worked example.
- Q8: relies on "Recipients have full access to the shared asset" for ABAC tables whose share owner is in `EXCEPT` (create-share page) and on the ABAC requirements page.
