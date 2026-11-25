# QZ-dp-750-42-lakeflow-jobs — report

File: `content/dp-750/quizzes/42-lakeflow-jobs.yaml` (10 questions). `npx tsx factory/check-quiz.ts dp-750 42-lakeflow-jobs` → 0 problem(s), 0 warning(s).

Objectives: 4.2.1 (Q1, Q6), 4.2.2 (Q2, Q10), 4.2.3 (Q3, Q9), 4.2.4 (Q4, Q7), 4.2.5 (Q5, Q8). Formats 6–10: single, dragdrop, single, yesno_statements, multi (choose 3).

The bank already has 41 questions on 4.2.x. The quiz tests decisions they don't: the Run now identity, file arrival cost, a 6-hour cron, webhook payloads, the retry interval measured from the start of the attempt, max concurrent runs for parallel parameterized runs, job-level vs task-level notifications and mutes, an Auto Loader `addNewColumns` restart in a scheduled job, a queued run vs a skipped run, and file events + debounce + `availableNow` combined. A "restart a continuous job in backoff" question was dropped: `dp750-4c-jobs-continuous-restart` (4.4.2) already tests it.

## Sources fetched (2026-11-24)

jobs/file-arrival-triggers, jobs/notifications, jobs/continuous, jobs/configure-task, jobs/configure-job, jobs/scheduled, jobs/trigger-table-update, jobs/repair-job-failures, jobs/privileges, ingestion/.../auto-loader/schema.

## Chapter out of date or incomplete against current Learn

- **Default retries: Learn contradicts itself.** "Add notifications on a job" says that by default tasks are retried three times before failing fully. "Configure and edit tasks" says that for most configurations no task is retried. The chapter follows the second page. The quiz doesn't test the default.
- **Streaming backlog** thresholds and notifications are **Public Preview** (configure-job, configure-task). The chapter lists them with no preview label. The quiz doesn't use them as a correct answer.
- **Notification events**: Learn now also lists **Maintenance start / Maintenance complete** for continuous jobs that run a pipeline with a maintenance window. Continuous jobs get a **Maintenance window** setting. Neither is in the chapter.
- **Continuous trigger "can't be combined with other triggers"**: the continuous page doesn't say this. Only the bank's `dp750-4b-trigger-limits-multi` and the chapter state it. Not verified.
- **Continuous on serverless**: `Trigger.ProcessingTime` and `Trigger.Continuous` aren't supported. Bounded triggers (`AvailableNow`) restart with the job. Not in the chapter.
- **Restart in backoff**: Learn documents a **Restart run** button, which cancels the active run, resets the retry period and starts a new run, or `run-now` with the job ID. The chapter says "from the UI"; naming **Restart run** would be more exact.
- **Table update trigger**: Learn now also supports metric views, OpenSharing objects and system tables. A view's source tables count toward the 10-table limit. Without file events, at most 1,000 jobs can have a table update trigger. The chapter lists a subset.
- **File arrival**: enabling file events requires owner or `MANAGE` on the external location. Learn's recommended Auto Loader code sets `cloudFiles.useManagedFileEvents = true`. Neither is in the chapter.
- **Run as**: by default, workspace admins can set Run as to any user or service principal (account admins can restrict this with `RestrictWorkspaceAdmins`). Not in the chapter.
- **SQL conditions on triggers** (Beta) exist on the schedule and triggers pages; they are correctly left out of the chapter.

## Unverified or inferred

- "Retry on timeout" (chapter, and the bank's `dp750-4b-retry-json`) isn't described on the configure-task page; the quiz doesn't use it.
- Q4 s3 / Q7: "Mute notifications until the last retry" exists only on task notifications. The notifications page says this for task notifications, and the job-level settings list only the skipped/canceled mutes. That a task notification also has its own canceled-run mute is inferred from Learn's sentence that job-level mute settings don't filter task-level notifications, so you must also filter the task-level notifications.
- Q8: Learn recommends Lakeflow Jobs to restart Auto Loader streams automatically after a schema change. That a **task retry policy** does it within a scheduled job is the chapter's statement (and the bank's `dp750-3d-evolution-modes` stem), not a Learn sentence.
