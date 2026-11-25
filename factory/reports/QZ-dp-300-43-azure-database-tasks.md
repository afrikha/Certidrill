# QZ-dp-300-43-azure-database-tasks — notes

`content/dp-300/quizzes/43-azure-database-tasks.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 4.3.1 (q1, q3, q4, q10), 4.3.2 (q2, q7), 4.3.3 (q8), 4.3.4 (q5, q6, q9). Positions 6–10: single, multi ×2, yesno_statements, dropdown.

## Chapter vs current Learn (fix in the chapter, not done here)

- Confirmed on Learn: tiers JA100–JA800 (extra targets queue), job database S1+ / not Hyperscale / not auto-pausing serverless, one authentication method per agent, system-assigned identity not supported, 45-day history purge and `jobs.sp_purge_jobhistory`, `jobs.sp_add_jobstep` defaults (10 retries after the initial attempt, 1 s initial interval, 120 s max, multiplier 2.0, 43,200 s timeout), lifecycle values, the three job agent metrics (Elastic Jobs Executions Failed / Successful / Timed Out, no dimensions), Run As accounts retired on 30 September 2023, SQL database in Fabric has neither SQL Server Agent nor elastic jobs (Learn suggests scheduled Data Factory pipelines or Apache Airflow jobs).
- Chapter wording to refine: "Fabric pipelines, monitored in the Monitoring hub" — the Fabric limitations page names them **Data Factory pipelines** (or Apache Airflow jobs). The quiz uses "Data Factory pipeline".
- The chapter's troubleshooting table says "Allow Azure services on the target server" for firewall-blocked elastic jobs. The elastic jobs overview doesn't state that the agent needs this setting; it only presents private endpoints as the way to disable it. Worth checking before a question relies on it (not used here).
- The elastic jobs overview mentions a metric "Failed Elastic jobs" in prose, while the metrics reference names it "Elastic Jobs Executions Failed". The chapter uses the reference name (correct for the portal).
- Elastic job agent network security perimeter support is preview (overview); not in the chapter, fine.
- Learn's T-SQL examples show `GRANT ... TO job-agent-UMI` without brackets (a Learn typo); the chapter is correct with brackets.

## Not verified on a fetched page

- q6: that `Connect-AzAccount -Identity` picks a default subscription and that `Set-AzContext -Subscription` fixes a "resource group not found" error is shown by the Learn runbook sample (`Set-AzContext`), but no page states the failure mode. The stem gives the error and states that the identity can access both subscriptions.
- q9: that a skipped execution doesn't consume retries is inferred from the definitions (retries apply to failed attempts; Skipped = another execution of the same step was running on the target).
- q5: `jobs.sp_delete_job @force` comes from memory of the reference page (not fetched); it's only a distractor whose effect (deleting the job) is obvious.
- q7: Learn doesn't say "managed instance is not supported" for elastic jobs; it says elastic jobs apply to Azure SQL Database and lists only `SqlServer`, `SqlElasticPool` and `SqlDatabase` targets (Azure SQL Database). The chapter's "MSX/TSX not available on SQL Managed Instance" wasn't re-fetched.

## Design notes

- The mock bank already covers agent tier sizing, job database choice, `@max_parallelism`, private endpoints, schedule completion, target exclusion, UMI setup and `master` users, login failures on new databases, idempotent scripts, history facts, lifecycle grid, MI history limits, the symptom/fix matrix, runbook roles/webhook/Total Jobs metric/JobStreams alerts, MI operators and Database Mail. The quiz tests other decisions: where job procedures run, Fabric scheduling, queued targets, credential-based authentication, per-job purge, subscription context in a runbook, elastic jobs + SQL Server Agent for a mixed fleet, multi-condition metric alerts (AND) vs two rules, Skipped executions, and retry/backoff/timeout parameter semantics.
