Lakeflow Jobs is the orchestrator of Azure Databricks: a job groups tasks, their compute, their parameters, their triggers, their notifications and their retry policies. The exam asks how to configure a job for a stated requirement: who it runs as, when it starts, who is told when it fails, and how it recovers on its own.

<!-- section: create-job | objectives: 4.2.1 -->
## Creating and configuring a job

In the workspace sidebar, open **Jobs & Pipelines** and create a job, then add its tasks (type, source, parameters, compute, dependencies). A new job is named `New Job <date> <time>` until you rename it; the name must be unique. By default a job runs only when started manually: add a trigger to automate it.

| Job setting | What to know |
| --- | --- |
| Compute | Serverless compute, classic **jobs compute** (a cluster created for the run and terminated after it, cheaper than all-purpose) or an all-purpose cluster. Without serverless, Databricks recommends jobs compute; several tasks can share one job cluster |
| Performance optimized (serverless) | Enabled: faster start for time-sensitive jobs. Disabled (standard): fewer DBUs, startup latency of 4 to 6 minutes. Same SKU; affects only serverless tasks |
| Job parameters | Key-value pairs passed to every task that accepts parameters; overridable for a run |
| Max concurrent runs | Default **1**. A run that would exceed it is skipped, or queued when queueing is on |
| Queue | Enabled by default for jobs created in the UI since April 15, 2024; a run waits up to 48 hours when the job, workspace or Run Job limits are reached |
| Duration thresholds | **Warning** (expected duration, for notifications) and **Timeout** (run set to `Timed Out`) |
| Tags | Labels or key-value pairs; they propagate to the job clusters. Not for sensitive values |
| Git | Tasks can check out source code from a remote Git repository |
| Run as | The identity whose permissions the run uses; the owner by default |

Permissions on a job (each includes the ones below it):

| Permission | Allows |
| --- | --- |
| IS OWNER | Default **Run as** identity; one owner per job, never a group; only workspace admins change it |
| CAN MANAGE | Edit the job, its tasks and permissions; pause and resume schedules |
| CAN MANAGE RUN | Trigger and cancel runs |
| CAN VIEW | View run results, details, history and status |

Runs started with **Run now** use the permissions of the **Run as** identity, not those of the user who clicked. Changing **Run as** requires CAN MANAGE or IS OWNER, and you can choose a service principal only if you have the **Service Principal User** role on it. Run production jobs as a service principal, so that they don't depend on a person's account.

```json
{
  "name": "contoso-orders-daily",
  "max_concurrent_runs": 1,
  "queue": { "enabled": true },
  "run_as": { "service_principal_name": "00000000-0000-0000-0000-000000000000" },
  "parameters": [ { "name": "run_date", "default": "{{job.start_time.iso_date}}" } ],
  "tasks": [
    {
      "task_key": "ingest",
      "notebook_task": { "notebook_path": "/Workspace/orders/01_ingest" },
      "max_retries": 2,
      "min_retry_interval_millis": 60000,
      "retry_on_timeout": false,
      "timeout_seconds": 3600
    },
    {
      "task_key": "refresh_gold",
      "depends_on": [ { "task_key": "ingest" } ],
      "run_if": "ALL_SUCCESS",
      "pipeline_task": { "pipeline_id": "<pipeline-id>" }
    }
  ]
}
```

> **Exam trap.** A user with CAN MANAGE RUN can start the job, but the run gets the permissions of the **Run as** identity. Granting the user `SELECT` on the tables doesn't fix a run that fails for missing privileges: the Run as identity needs them.

<!-- section: triggers | objectives: 4.2.2 -->
## Configuring job triggers

Add triggers in **Job details > Schedules & Triggers > Add trigger**.

| Trigger | Starts a run when | Use it for |
| --- | --- | --- |
| None (manual) | **Run now**, the Jobs API or an external orchestrator calls it | Ad hoc runs, Azure Data Factory orchestration |
| Scheduled | A time-based schedule fires | Fixed batch windows (next section) |
| File arrival | New files arrive in a Unity Catalog external location or volume | Irregular file drops |
| Table update | Source tables are updated | Run when upstream data is ready |
| Continuous | The previous run ends (completes or fails) | Always-on streaming |

**File arrival**: monitors the root or a subpath of an external location or a volume, recursively, without wildcards. It checks for new files about every minute, at no cost beyond listing the storage. You need `READ` on the location and CAN MANAGE on the job. Only new files trigger a run: overwriting a file with the same name doesn't. With **file events** enabled on the external location (recommended), there's no file count limit; without them, at most 50 jobs per workspace use such a trigger and the path holds at most 10,000 files. In the triggered task, read the files with Auto Loader and `trigger(availableNow=True)` so each run processes only what is new.

**Table update**: watches up to 10 tables (Delta or Iceberg managed tables, Delta external tables, materialized views, streaming tables, views on supported tables) and starts when **any** or **all** of them are updated. The **Run as** identity needs `SELECT` on each table plus `USE CATALOG` and `USE SCHEMA`; without it the trigger fails to evaluate. `{{job.trigger.table_update.updated_tables}}` lists the updated tables.

Both file arrival and table update triggers have two optional settings:

| Setting | Pattern | Example |
| --- | --- | --- |
| Minimum time between triggers in seconds | Cooldown: at most one run per interval after a run completes | `900`: run at most every 15 minutes |
| Wait after last change in seconds | Debounce: wait after the last arrival or update; each new one resets the timer | `60`: let a batch of files finish arriving |

**Continuous**: one run always active; a new run starts less than 60 seconds after the previous one ends. It can't be combined with other triggers, and task dependencies with `Run if` and per-task retry policies aren't available.

Limits: up to 12,000 active triggers per workspace (paused triggers don't count); a job can have up to five triggers during the Multiple Triggers Beta, each paused or resumed independently. In the Jobs API 2.1 and later, triggers go in the `triggers` array; don't mix it with the legacy `schedule`, `trigger` or `continuous` fields.

> **Exam trap.** "Files arrive at unpredictable times; process them within minutes without paying for idle compute" is a **file arrival** trigger, not a continuous job (always running) nor a schedule every minute.

<!-- section: schedule | objectives: 4.2.3 -->
## Scheduling a job

A **Scheduled** trigger has two schedule types:

| Type | You define | Limitation |
| --- | --- | --- |
| Simple | A unit and an interval (every 12 hours) | You can't choose the time of the first run |
| Advanced | Period, start time and **time zone**; **Show Cron Syntax** edits a Quartz cron expression | |

A Quartz cron expression has fields for seconds, minutes, hours, day of month, month and day of week; `?` stands for "no specific value" in one of the two day fields.

| Expression | Runs |
| --- | --- |
| `0 0 2 * * ?` | Every day at 02:00 |
| `0 30 6 ? * MON-FRI` | Weekdays at 06:30 |
| `0 0 * * * ?` | Every hour on the hour |
| `0 0 1 1 * ?` | The first day of each month at 01:00 |

```json
{
  "schedule": {
    "quartz_cron_expression": "0 30 6 ? * MON-FRI",
    "timezone_id": "Europe/Paris",
    "pause_status": "UNPAUSED"
  }
}
```

Scheduling rules:

- At least **10 seconds** between runs started by a schedule, whatever the cron expression.
- In a time zone with daylight saving time, an hourly job can be skipped or appear delayed by an hour or two at the change; choose **UTC** to run every absolute hour.
- The scheduler isn't for low latency: runs can be delayed by several minutes, and they start as soon as the service is available.
- If the previous run is still active and max concurrent runs is 1, the scheduled run is skipped (or queued when queueing is on).
- **Pause** stops new runs and lets active runs finish; **Resume** returns to the same schedule.
- A pipeline is scheduled through a job with a **Pipeline** task; a notebook can also be scheduled from the notebook UI.

> **Exam tip.** "At 06:30 local time, Monday to Friday" needs an **advanced** schedule with the time zone set; a simple schedule can't fix the start time.

<!-- section: alerts | objectives: 4.2.4 -->
## Configuring alerts for a job

Notifications are set at the **job** level (Job details) or the **task** level, by a user with CAN MANAGE or IS OWNER.

| Event | Fires when |
| --- | --- |
| Start | A run starts |
| Success | A run completes, including in the `Succeeded with failures` state |
| Failure | A run fails |
| Duration warning | A run exceeds the **Warning** duration threshold, which must be set first |
| Streaming backlog | The average backlog over 10 minutes exceeds the threshold (then at most every 30 minutes); not for pipeline tasks |

| Destination | Notes |
| --- | --- |
| Email addresses | One or more |
| System destinations: Slack, Microsoft Teams, PagerDuty, HTTP webhook | Created first by an administrator (**Edit system notifications**); at most **three** per job or task for each event type |

Options and behaviors:

- **Mute notifications for skipped runs** and **Mute notifications for canceled runs** (job level). They don't filter task-level notifications.
- **Mute notifications until the last retry** (task level) avoids one alert per failed attempt.
- Job-level notifications aren't sent when failed tasks are retried; use task notifications to hear about every failed task.
- A webhook receives `jobs.on_start`, `jobs.on_success`, `jobs.on_failure` or `jobs.on_duration_warning_threshold_exceeded`. Use a webhook when you need a stable message schema.
- A pipeline has its own email notifications on success or failure conditions in its settings.

> **Exam trap.** "Notify the on-call team in Microsoft Teams when the job fails" requires an administrator to create the Teams system destination first; a job owner can only pick existing destinations.

<!-- section: automatic-restarts | objectives: 4.2.5 -->
## Configuring automatic restarts

**Task retries**: in the task settings, click **Add** next to **Retries** to set how many times and how often a failed task is retried. The interval is measured from the start of the failed run to the next attempt. **Retry on timeout** decides whether a timed-out attempt is retried; when timeout and retries are both set, the timeout applies to each attempt.

| Configuration | Default retry behavior |
| --- | --- |
| Most job configurations | No retry |
| Serverless tasks | **Auto-optimization** retries failed tasks; clear **Enable serverless auto-optimization (may include additional retries)** for tasks that must run at most once |
| Continuous job | Exponential backoff for the whole job, no limit on the number of retries |
| Pipeline update from a job, the API or continuous mode | Automatic retry and cluster restart for recoverable errors |

**Continuous jobs**: per-task retry policies can't be used. With **Task retry mode** On failure (the default), a failed task is retried with increasing delays up to a maximum (three for a single-task job), then the run is canceled and a new one starts. After repeated failures the whole job restarts with an increasing retry period, capped by the system; the backoff resets after a successful run. You can restart a job in backoff from the UI or with `run-now`. Databricks recommends a continuous job rather than the old pattern of unlimited retries and one concurrent run.

**Streaming tasks**: an Auto Loader stream in `addNewColumns` mode stops on purpose when the schema changes; a retry policy on the task (or a continuous job) restarts it with the new schema.

**Pipelines**: in production runs (from a job, the API or in continuous mode), the runtime retries a failed flow up to `pipelines.maxFlowRetryAttempts` times (default 2) and the whole update up to `pipelines.numUpdateRetryAttempts` times (default 5 for triggered pipelines, unlimited for continuous ones), and restarts the cluster for recoverable errors such as memory leaks or stale credentials. Manual **Run now** from the editor disables these retries for debugging.

| Requirement | Configuration |
| --- | --- |
| Transient network errors must not fail the nightly job | Task retries with an interval |
| A streaming job must restart by itself after any failure, indefinitely | Continuous trigger |
| A non-idempotent serverless task must never run twice | Disable serverless auto-optimization |
| One alert after the final failed attempt, not per attempt | Task notification with **Mute notifications until the last retry** |
| A failed run must resume from the failed task after a fix | Repair run (manual), not automatic retry |

> **Exam trap.** Retries rerun a task after a failure in the same run; **repair** reruns selected failed tasks of a finished run, after you fix the cause. Automatic restart is a retry policy or a continuous trigger, never a repair.

<!-- section: key-points -->
## Key points

- Run production jobs as a service principal; Run now uses the Run as identity's permissions; IS OWNER is never a group.
- Max concurrent runs defaults to 1; excess runs are skipped or queued (up to 48 hours).
- Triggers: manual, scheduled, file arrival, table update, continuous; cooldown and debounce settings tame bursts.
- Advanced schedules use Quartz cron with a time zone; minimum 10 seconds between runs; UTC avoids daylight saving surprises.
- Notifications: start, success, failure, duration warning, streaming backlog; system destinations come from an admin, three per event type.
- Retries are off by default except serverless auto-optimization; continuous jobs back off exponentially without limit; pipelines retry flows and updates in production runs.
