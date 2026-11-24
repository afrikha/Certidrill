# FIX-dp-750-3 — chapters 42, 43 and 44 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert dp-750 42-lakeflow-jobs 43-development-lifecycle 44-monitoring-optimization` 0 problems; `content:validate --cert dp-750` 0 problems, 0 warnings; `check-quiz dp-750` (3 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. Section markers untouched. The shared WebFetch budget ran out several times. Every finding below was fetched before any change was made.

## 42-lakeflow-jobs

| Finding | Learn | Change |
| --- | --- | --- |
| Default retries: Learn contradicts itself | "Add notifications on a job": "By default, tasks are retried three times before failing fully". "Configure and edit tasks": "For most configurations, the default setting does not retry any tasks". `job-task-types` (bundles): `max_retries` "If not specified, the task will not be retried" | None (the chapter follows the two more specific pages). For a human decision |
| Streaming backlog is Public Preview | configure-task and configure-job: "Streaming observability for Lakeflow Jobs is in Public Preview". The notifications page has no label | Notification table row and key points: "(Public Preview)". Bank question rewritten (see below) |
| Maintenance start / complete events, Maintenance window | notifications (two events, for continuous jobs with a configured maintenance window); continuous (Advanced > **Maintenance window** when the job runs a pipeline) | New notification table row; continuous paragraph: one sentence; key points |
| Continuous can't be combined with other triggers | Confirmed ("Automate jobs with schedules and triggers": "A continuous trigger cannot be combined with any other trigger") | None |
| Continuous on serverless | Confirmed (continuous): `Trigger.ProcessingTime` and `Trigger.Continuous` not supported; bounded triggers such as `AvailableNow` restarted by the scheduler | Continuous paragraph: one sentence |
| Restart in backoff | "Troubleshoot and repair job failures": **Restart run** cancels the active run, resets the retry period, starts a new run; continuous page: or `run-now` with the job ID | automatic-restarts paragraph names **Restart run** and what it does |
| Table update: more object types, view source tables, 1,000 jobs | Confirmed ("Trigger jobs when source tables are updated"): metric views, OpenSharing objects, system tables; a view's source tables count toward the 10; at most 1,000 jobs without file events. No status label | Table update paragraph |
| File arrival: `MANAGE` for file events, `useManagedFileEvents` | Confirmed ("Trigger jobs when new files arrive"): owner or `MANAGE` on the external location to enable file events; the recommended Auto Loader code sets `cloudFiles.useManagedFileEvents` to `true` | File arrival paragraph |
| Run as set by workspace admins | Confirmed ("Manage identities, permissions, and privileges for Lakeflow Jobs"): by default workspace admins can set the owner or Run as to any user or service principal; account admins restrict with `RestrictWorkspaceAdmins` | create-job: one sentence |
| "Retry on timeout" not on configure-task | configure-task doesn't describe it, but "Add tasks to jobs in Declarative Automation Bundles" documents `retry_on_timeout` ("whether to retry the task when it times out", default false) | Prose now names `retry_on_timeout` (false by default) instead of a UI label |
| Auto Loader `addNewColumns` restarted by a task retry policy | Auto Loader schema page: "recommends configuring Auto Loader streams with Lakeflow Jobs so they restart automatically"; no mention of retries | None (the retry policy is the Jobs mechanism for that restart; not contradicted) |
| SQL conditions on triggers (Beta) | Confirmed Beta (file arrival page) | None (correctly left out) |

## 43-development-lifecycle

| Finding | Learn | Change |
| --- | --- | --- |
| Missing bundle commands | "bundle command group": `deploy --select` (resources and upstream dependencies; "only ... development workspaces"), `run --params` (job parameters), `run --no-wait`, `run --only` with `+key` (upstream) and `key+` (downstream), `generate --bind`, `lifecycle` protects resources from `destroy`. `deploy --plan` is "direct engine only" | Command table: `--only` row extended, two new rows (`--params`/`--no-wait`, `--select`), bind row with `generate job --bind`; destroy sentence mentions `lifecycle`. `deploy --plan` / `plan -o json` not added (engine-specific) |
| `deploy --force` is broader | Confirmed: "Override validations that block a deployment"; Git branch; also overwrites a dashboard modified in the workspace | `--force` row rewritten; trap "only overrides the safeguard" |
| Production Git folder permissions | Confirmed ("CI/CD with Databricks Git folders"): Can Run for project users and for service principals that run automation against the folder, optionally Can View for all users; edit only admins and service principals; scheduled job with `w.repos.update(...)` when no external CI/CD | git-folders paragraph; bundle-rest-ci-cd: one sentence after the CLI block |
| `databricks repos update <path> --branch main` unverified | Confirmed ("repos command group": `databricks repos update REPO_ID_OR_PATH [flags]`, `--branch`, `--tag`, path examples) | None (code block kept) |
| Development mode details | Confirmed ("Declarative Automation Bundles deployment modes"): `bundle.deployment.lock.enabled: true`, `max_concurrent_runs: 1`, `schedule.pause_status` / `continuous.pause_status`; preset `pipelines_development` | Deployment-modes table (two cells), presets list, trap ("on that job's `schedule` (or `continuous`)") |
| Production mode paths | Confirmed: `artifact_path`, `file_path`, `root_path`, `state_path` not overridden to a specific user | Validations cell |
| Declarative Automation Bundles naming | Confirmed on every fetched page | None |

## 44-monitoring-optimization

| Finding | Learn | Change |
| --- | --- | --- |
| Budgets: not only account admins | "Create and monitor budgets": account admins; "Workspace admins can create and manage budgets scoped to workspaces they administer using Governance Hub"; email when spending "has surpassed a budget threshold" | Budgets row |
| `DatabricksTables` doesn't exist | "Supported log categories - Microsoft.Databricks/workspaces": no such table; category `unityCatalog` → `DatabricksUnityCatalog` | Log Analytics table row replaced by `DatabricksUnityCatalog` |
| Predictive optimization date | "Predictive optimization for Unity Catalog managed tables": "enabled by default", tables inherit the account value, Premium plan in a supported region; no date | Date removed; "enabled by default (Premium plan, supported regions), and managed tables inherit the account setting" |
| Skew fixes | "Skew and spill": tune `spark.sql.adaptive.skewJoin.*` thresholds; "Broadcast joins are never skew-optimized"; salting; liquid clustering for a skewed stored table; `REBALANCE` hint for a skewed write | Skew row: "broadcast the small side" removed, the four Learn fixes added (broadcast stays in the shuffle row) |
| Queue setting for Skipped runs | Confirmed ("Configure and edit Lakeflow Jobs"): queued up to 48 hours; on by default for UI jobs after April 15, 2024 | Fixes-by-cause sentence |
| VACUUM LITE Public Preview; DBR 18.0 retention | "Remove unused data files with vacuum": LITE "in Public Preview in Databricks Runtime 16.4 LTS and above"; `deletedFileRetentionDuration` controls retention on DBR 18.0+ (12.2 LTS+ for UC managed tables) | Options cell labels LITE; retention bullet: one sentence. Bank question rewritten (see below) |
| Diagnostic logs: "highly discourages" | "Configure diagnostic log delivery": recommends `system.access.audit`; "highly discourages you from moving this data outside the platform". "Audit log system table reference": "This system table is in Public Preview" | Exam tip: warning sentence and "(Public Preview)" (as in chapter 22) |
| Premium plan for diagnostic logs | Confirmed ("Diagnostic logs require the Premium plan"); 15 minutes, permissions unchanged | None |

## Mock-exam bank questions changed

- `questions/pipelines/dp750-4b-notification-events-dragdrop.yaml` (4.2.4, dragdrop, difficulty 1, same id): the third requirement mapped to **Streaming backlog** (Public Preview). It now asks to tell report users that the weekly export has begun → **Start**. Streaming backlog stays as a distractor, with an explanation in `explanation.options` (replacing the Start one).
- `questions/pipelines/dp750-4d-maintenance-commands.yaml` (4.4.5, dragdrop, difficulty 1, same id): t4 mapped to `VACUUM ... LITE` (Public Preview). t4 now asks to collect column statistics for the optimizer → `ANALYZE TABLE ... COMPUTE STATISTICS`. LITE and `REORG ... APPLY (PURGE)` are distractors; explanation rewritten (EN + FR).

## Checked and left unchanged

Streaming backlog as a distractor only: `dp750-4b-bundle-notifications-yaml`, `-duration-warning-threshold`, `dp750-cs3b-duration-alert`. VACUUM LITE as a distractor only: `dp750-4d-purge-deletion-vectors`, `-external-table-maintenance`. Retries: `dp750-4b-retry-json` (`retry_on_timeout` confirmed on the bundles task page, default false), `-task-retry-policy` and `dp750-cs3b-partner-retries` ("most configurations" don't retry, as configure-task), `-continuous-statements` (three retries for a single-task job, confirmed), `dp750-4c-jobs-continuous-restart` (Restart run, confirmed). Triggers: `dp750-4b-trigger-limits-multi` (continuous not combinable, 10 tables, 12,000 active triggers: all confirmed), `-table-trigger-privileges`, `-file-arrival-statements`. `--force` questions (`dp750-4c-cli-stale-lock`, `-cli-deploy-facts`, `-cli-var-override`, `dp750-cs2c-bundle-modes`, `dp750-sr2-bundle-bind-3`): "overrides validations such as the Git branch check" matches Learn. `dp750-4c-cli-run-subset` (`transform+` and `--no-wait`, confirmed). `dp750-sr2-bundle-bind-*` and `dp750-4c-cli-first-deploy`: `bundle deployment bind` has no label; the Beta label on that page is for the separate `bundle-deployments` command group. `dp750-4c-bundle-mode-presets` (lock re-enable, confirmed). `dp750-4d-log-tables` already uses `DatabricksUnityCatalog`. Skew questions (`dp750-4d-skew-join-threshold`, `dp750-cs1b-feeder-skew`) agree with "Skew and spill". No bank question uses budgets or the predictive optimization date.

## Quiz files

None changed. All three quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 44 q3 already uses Queue as a distractor ("a queued run doesn't start at its scheduled time"), consistent with the new sentence. Quiz 43 Q8 cites the SDK call, now also in the chapter.

## For a human decision

- **Default task retries**: "Add notifications on a job" says three retries by default; "Configure and edit tasks" and the bundles task reference say no retry. Chapter 42 and the bank follow "no retry".
- **Streaming backlog** status: Public Preview on configure-task and configure-job, no label on the notifications page. Treated as preview.
- **Service Principal User**: chapter 42 and `dp750-4b-runas-sp-user-role` call it a "role"; the jobs privileges page calls it an "entitlement". Not changed.
- Not confirmed, left unchanged: tags "not retroactive" (chapter 44, quiz 44 q7 s1); `spark.driver.maxResultSize` semantics (quiz 44 q6); whether `${resources.jobs.<key>.name}` resolves (quiz 43 Q6); a user `root_path` failing production validation when that user is `run_as` (quiz 43 Q10, an inference from "not overridden to a specific user"); `%run` behavior (quiz 43 Q9).
- No Standard tier retirement found on the fetched pages; the Premium plan requirement stays.

## French terms not settled (not in the glossary)

- « dépôt » for a Git repository (chapter 43, seven occurrences, and bank questions such as `dp750-4b-sparse-checkout-steps`): the glossary's « référentiel » (repository) comes from Azure Container Registry pages (`also_seen: dépôt`). Not changed: one form should be chosen for Git repositories.
- « préversion publique » (built from the glossary's « préversion »); « fenêtre de maintenance » (glossary entry from Azure Monitor alert processing rules, reused for the Lakeflow Maintenance window); « vues de métriques »; « déclencheur borné » (bounded trigger); « indicateur » for SQL hints (as in `dp750-4d-broadcast-hint`); « optimiseur de requêtes ».
