# FIX-dp-700-1 — chapters 11, 12, 13, 14 and 21 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert dp-700 11-workspace-settings 12-lifecycle-management 13-security-governance 14-orchestration 21-loading-patterns` 0 problems; `content:validate --cert dp-700` 0 problems, 0 warnings; `check-quiz dp-700` (the 5 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed.

The shared web-fetch budget ran out twice during the task, and then the hourly limit was hit. Findings whose page couldn't be fetched are marked "not confirmed" and were left unchanged.

## 11-workspace-settings

| Finding | Learn | Change |
| --- | --- | --- |
| Environment: the Compute section needs Customize compute configurations for items | Confirmed (environment-manage-compute, 2026-03-25): when the toggle is off, "the Compute section in environment items is disabled and all Spark jobs use the workspace default pool" | spark-environment-jobs: the "When it is off" sentence now says so (no Environment pool, no driver or executor sizes) |
| Airflow starter pool: node size Large (fixed), instant start | Confirmed (apache-airflow-jobs-workspace-settings, 2026-03-18): starter pool Large, startup "Instantaneous"; custom pool "starts in the stopped stage"; both resume in up to 5 minutes | Airflow table: Node size row "Large (fixed)"; Availability row |
| Domains: overriding an existing assignment needs the tenant setting Allow tenant and domain admins to override workspace assignments (preview) | Confirmed, but the same page (domains) also says that By workspace name and By workspace admin show a warning and then let you override, with no mention of the setting | None. Flag for review |
| OneLake diagnostics: engine access only logs FabricWorkloadAccess; a deleted destination disables diagnostics | Confirmed (onelake-diagnostics-overview, 2026-05-18): every operation is logged for the Fabric UI and the Blob/ADLS APIs; for Fabric workloads, only the fact that temporary access was granted (`FabricWorkloadAccess`), with details in engine logs. Deleting the lakehouse disables diagnostics for every workspace that points to it, and the data already written is kept. Moving the workspace to another capacity disables logging | onelake-settings: the diagnostics paragraph and the same-capacity bullet |

## 12-lifecycle-management

| Finding | Learn | Change |
| --- | --- | --- |
| Warehouse database projects are preview | Confirmed: develop-warehouse-project (2026-09-22) says "This feature is in preview". SQL database in Fabric has no preview label (overview 2026-10-02, source-control). SDK-style SQL projects are GA in VS Code and support SQL database in Microsoft Fabric as a target (sql-database-projects, 2026-08-24) | database-projects: the scope sentence now puts SQL database first (GA) and the warehouse as preview. Key points updated. Bank: see below |
| `BlockOnPossibleDataLoss` defaults to True | Confirmed (SqlPackage Publish): default True; `DropObjectsNotInSource` default False | Publish profile table, Guidance column; key points |
| A deployment deletes target shortcuts and reverts manual edits | Confirmed (lakehouse-git-deployment-pipelines, 2026-10-13): "A deployment overrides the state of shortcuts in the target workspace" | Lakehouse row of the deployment table |
| Unidentified section after Git sync | Confirmed (same page). Also: "A git update overrides the state of shortcuts in the workspace" | Git exam trap |
| Lakehouse Git tracking is opt-in per object type | Confirmed (same page): Lakehouse settings, `alm.settings.json`, all GA types selected for new lakehouses | Lakehouse row of the Git table |
| Variable library still "(preview)" in a link text | variable-library-overview (2026-09-01): no preview label in title, H1 or body | None (the chapter and bank questions are right) |
| A workspace can be assigned to only one deployment pipeline | Confirmed (assign-pipeline, 2026-11-02) | Deployment pipelines intro: one sentence |
| Permissions to assign a workspace | assign-pipeline says workspace admin plus contributor on adjacent stages and doesn't mention pipeline admin; understand-the-deployment-process (2026-09-24, more specific table) says pipeline admin plus workspace admin | None (the chapter follows the permissions table) |

## 13-security-governance

| Finding | Learn | Change |
| --- | --- | --- |
| RLS: "one security policy can carry predicates for several tables" | row-level-security (Fabric): "Each table must have its own row-level security defined separately". It doesn't say whether one policy can cover several tables. A second predicate for the same operation on a table fails, even if it is disabled | Added the "second filter predicate fails" sentence. The several-tables sentence is unchanged: flag for review |
| Who manages OneLake security roles (Write or Reshare vs the Admin/Member table) | Not re-fetched (budget). The QZ report found the two Learn pages inconsistent | None. The chapter already says "in practice Admins and Members". Flag for review |
| Monitor can't be granted on its own | **Not confirmed**: share-warehouse-manage-permissions couldn't be fetched (hourly limit) | None |
| OneLake security GA status | Not re-fetched. The QZ report says the security pages have no preview banner, but lakehouse sharing still says preview | None. Flag for review |

## 14-orchestration

| Finding | Learn | Change |
| --- | --- | --- |
| `@pipeline().DataFactory` returns the workspace **ID** | Confirmed (expression-language): workspace ID; `Pipeline` = pipeline ID, `PipelineName` = name | System variable row: `Pipeline` (pipeline ID), `PipelineName` added, `DataFactory` (workspace ID) |
| 20 schedules per pipeline | pipeline-runs (2026-09-29): the only "up to 20 schedules" sentence is in the **Interval-based schedule (preview)** section. The fixed-schedule section says only "multiple" | Schedules bullet: "several schedules", with the 20 limit stated for interval-based schedules only; key points |
| Weekly "up to 10 times per week" | Not re-fetched; not tested | None |
| Activity defaults (12 h, 7 days, 30 s), 120 activities | Not re-verified (budget) | None |

## 21-loading-patterns

| Finding | Learn | Change |
| --- | --- | --- |
| Copy job SCD Type 2 is preview, not for Oracle CDC | Confirmed (cdc-copy-job, 2026-09-10). Note: its own connector table marks Oracle "yes" for SCD Type 2. The note, which is more specific, was followed | Copy job row: "SCD Type 2 (preview, not with Oracle CDC sources)"; key points |
| Copy job CDC sources include Fabric Lakehouse tables; mixed tables | Confirmed (same page): Lakehouse table is a CDC source; a job that mixes CDC and non-CDC tables is treated as watermark-based | Copy job row |
| Copy job default update method | The CDC page says Merge (SCD Type 1) is "the default behavior for CDC"; "What is Copy job" wasn't fetched again (the QZ report says it gives Append) | None ("Append (default)" kept). Flag for review |
| Dataflow Gen2 incremental refresh limits | Confirmed (dataflow-gen2-incremental-refresh): 50 buckets per query **and** 150 per dataflow; destination explicitly defined (the default destination isn't supported); fixed schema; replace only; no OPTIMIZE / REORG TABLE on lakehouse tables | Dataflow row. The chapter's 50-per-query figure was already right |
| Spark surrogate key `max(key) + row_number()` | Not on dimensional-modeling-load-tables (only IDENTITY) | Removed (not verifiable). No bank or quiz question uses it |
| Date dimension offsets updated daily; Unknown-member fact rows fixed by a periodic process | Confirmed (same page): run daily, T-SQL stored procedure, extend at the start of every year; a periodic process updates the keys of Unknown fact rows | Surrogate-key paragraph: one sentence; Missing-members paragraph: periodic process |

## Mock-exam bank questions changed

Warehouse database projects (preview) were the correct answer in all 1.2.2 questions. Objective 1.2.2 ("Implement database projects") doesn't name the warehouse, so the questions were moved to SQL database in Fabric and SDK-style SQL projects (GA). They keep the same id, type, objective and difficulty, and the answer stays where the behaviour is the same:

- `dp700-1b-dbproj-build-check`: SQL_Sales (SQL database) instead of DW_Sales. Same answer (Build). Reference: What are SQL database projects?
- `dp700-1b-dbproj-connection-profile`: rewritten. The warehouse connection string and authentication had no GA equivalent that I could verify, so it is now a development plan: VS Code with SQL Database Projects / `dotnet build` / .dacpac in bin/Debug (distractors: Visual Studio 2026, which supports only the original format; query editor; Extract; Export; .bacpac; .sqlproj).
- `dp700-1b-dbproj-deploy-report`: SQL_Prod, Sales.dacpac. Same answer (DeployReport).
- `dp700-1b-dbproj-extract-publish`: SQL_Sales, workspace not connected to Git. Same sequence. The SQL Server 2022 distractor now says the project must target SQL database in Microsoft Fabric.
- `dp700-1b-dbproj-reference-data`: Git-connected SQL database promoted by a deployment pipeline. Post-deployment MERGE in the Shared Queries folder, set as the post-deployment script (source-control page). Same answer. The CTAS distractor (not T-SQL for SQL database) became SELECT INTO.
- `dp700-1b-dbproj-script-rules`: new statements: the post-deployment script runs on Git update and deployment pipeline deployment (Yes); collation is stored in the project and deployed (No); an update builds and validates before SqlPackage changes the database (Yes).
- `dp700-1b-dbproj-sqlpackage-publish`: Sales.sqlproj, SQL_Prod. Same answers. The explanation now says True is the default. Reference: SqlPackage Publish page instead of the warehouse page.
- `dp700-1b-dbproj-statements`: SQL_Claims. Options d and e replaced: the same .dacpac can be published to test and prod (true); a casing warning fails the build (false; build warnings don't fail it). Answer still b, d.
- `dp700-1b-dbproj-sys-reference`: rewritten (the FabricDw dacpac reference is warehouse-only). Troubleshooting: a manual edit to the .sqlproj file disappears after a commit from Fabric, because Fabric regenerates the project file.
- `dp700-1b-dbproj-vscode-extensions`: rewritten. Which two tools does a Linux build agent need for a SQL project: the .NET SDK and SqlPackage (distractors AzCopy, Visual Studio 2026, Power Platform CLI).
- `dp700-1d-interval-schedule` (1.4.2): the correct answer was an interval-based schedule (preview). The stem no longer forbids a watermark and adds "a failed run must be caught up". The correct option is now a fixed hourly schedule with a watermark from the last successful run and a new maximum read at run start. Explanation rewritten. Same id, type, objective and difficulty.

## Quiz files changed

- `quizzes/14-orchestration.yaml` Q4, explanation of option d: "under the limit of 20 per pipeline" (that limit is only stated for interval-based schedules) became "Twelve daily schedules produce the runs, but they multiply the schedules to create and maintain." EN + FR.

## Checked and left unchanged

- 1.1.x: OneLake diagnostics (`dp700-1a-onelake-diag-*`: permissions, query, setup, statements, stopped after a capacity move), Airflow (`pool-facts`, `uptime`), `spark-environment-compute`, and the domain questions (`domain-*`, `cs1a-domain-role`; none relies on overriding an existing assignment).
- 1.3.3: `dp700-1b-granular-rls-statements` (dbo/db_owner filtered, inserts not blocked, empty result) agrees with the Fabric RLS page. No bank question claims that one policy covers several tables.
- 1.4.x: no bank question relies on 20 schedules or on `@pipeline().DataFactory`. The only other use, `dp700-3a-teams-message-expr` (3.1.4, not mine), already says workspace ID.
- 2.1.x: no question makes copy job SCD Type 2 the answer. `dp700-2a-dfg2-incr-settings` and `dfg2-buckets` use 50 buckets per query, which is correct.

## For a human decision

- **`dp700-cs1b-database-project` (case study Lucerne Publishing) is unchanged and still has a preview feature as its answer.** The case text (requirement 3: the schema of the warehouse WH_Royalty is developed in VS Code and deployed by Azure Pipelines) is shared with questions of other objectives, so I didn't edit it. Options: rewrite requirement 3 and WH_Royalty as a SQL database (this affects `cs1b-primary-key-error`, `cs1b-scd2-author`, `cs1b-data-stores`, `cs1b-endorse-label` and `cs1b-audit-deletion`), or keep it as a known preview exception.
- **Dataflow Gen2 public parameters**: `dp700-1d-region-dataflow-loop` (1.4.1) and `dp700-1d-dataflow-public-params` (1.4.3) make public parameters mode the answer. The Learn page's `<title>` says "(Preview)", but its H1 and body have no preview label or banner (2026-01-28). This is ambiguous, so the questions are unchanged.
- The chapter still describes warehouse projects in detail (VS Code steps, FabricDw `.sqlproj` snippet), labelled preview. Should it stay, now that the bank tests SQL database?
- Domains: the override tenant setting (preview) vs the "warning, then override" wording on the same page (see 11).
- RLS: can one policy carry predicates for several tables? (see 13). Who can manage OneLake security roles (Write **or** Reshare vs the Admin/Member table). Is OneLake security GA?
- Copy job default update method: Append (overview) vs Merge for CDC (CDC page).
- Not confirmed because of the fetch limit: Monitor can't be granted on its own (13); activity timeout, retry and 120-activity limits (14).

## French terms not settled

- « dépôt » (Git repository) is used in chapter 12 and in the bank. The shared glossary gives « référentiel » for "repository" (area compute, ACR), with « dépôt » as also_seen. It is unclear whether that entry covers Git repositories.
- « classement » (collation), « artefact », « agent de build », « casse » (casing), « membre déduit » (inferred member, existing text), « attributs de décalage relatif »: not in the glossary.
- « éléments appariés » (paired items, existing in 12) was kept. It isn't the « appairé » form that the guide forbids for peering.
