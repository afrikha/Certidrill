Fabric gives several places to watch what runs, from the Monitor hub to queryable logs and alerts. Exam questions describe a symptom or a requirement (see every failed refresh of the last week, be emailed when a scheduled pipeline fails, query execution logs with KQL) and ask which tool or setting answers it.

<!-- section: monitoring-tools | objectives: 3.1.1, 3.1.2, 3.1.3 -->
## Choosing a monitoring tool

| Requirement | Tool |
| --- | --- |
| See the runs of pipelines, dataflows, notebooks, Spark job definitions, copy jobs and semantic models in one list, filtered by item type, status and workspace | Monitoring hub (filters Status, Item Type, Start Time, Submitter, Location), or the **Job runs** page of the new Monitor hub (preview) |
| See the recent runs of one item, with submitter, status and duration | The item's **Recent runs** (from the item's menu in the workspace) |
| Drill into activities of one pipeline run, with a Gantt chart | The pipeline run detail page |
| Drill into Spark jobs, executors and driver logs of a notebook | Spark application detail page, then Spark UI |
| Watch events flowing through an eventstream, and its errors | Eventstream **Data insights** and **Runtime logs** tabs |
| Keep execution logs of many items, query them with KQL, build dashboards | Workspace monitoring, preview (logs land in an eventhouse) |
| Find which item consumes the capacity, peak demand | Microsoft Fabric Capacity Metrics app |
| Analyze completed T-SQL queries of a warehouse | `queryinsights` views |
| Be notified when a job fails or succeeds | Alerts (failure notifications in the item's schedule, Activator rules on job events, Monitor hub alerts in preview) |

Any Fabric user can open the Monitor hub, but sees only the items they have permission to view. The new Monitor hub (preview) has pages such as **Job runs**, **Capacity and cost** and **Alerts**, and its job alerting is also in preview; the legacy Monitoring hub is still available and isn't in preview.

> **Exam trap.** The Monitor hub shows runs, not data. To find why rows are missing in a table, open the run detail (activity output, refresh details); to keep weeks of logs and query them, enable workspace monitoring.

<!-- section: monitor-ingestion | objectives: 3.1.1 -->
## Monitoring data ingestion

**Job runs page (new Monitor hub, preview).** Each row shows an item's last run status, average duration and a summary of its last five runs. Filters: a time range, **Item type**, **Status** and **Workspace**; the keyword search box matches only the items loaded on the current page. The page doesn't refresh continuously: select the **Reload** icon (called **Refresh** in the page's list of tasks). Selecting a row opens the last run details (submitter, what invoked the run) and the run history. Selecting a run opens **Run details**, with the activities as a table or a Gantt chart. For a failed pipeline run, **Investigate** (preview) starts a read-only investigation by the Operations agent, which suggests likely root causes without changing the pipeline.

Supported item types include pipelines, copy jobs, Dataflow Gen2, notebooks, Spark job definitions, lakehouses, semantic models and user data functions, but not Dataflow Gen1. A run that stays **Queued** is waiting for resources: check the capacity.

**Legacy Monitoring hub.** Filter by **Status**, **Item Type**, **Start Time**, **Submitter** and **Location**. In **Column Options**, turning on **Upstream run** and **Downstream runs** traces the job hierarchy (a pipeline that called a notebook, for example). Hover over a row to open **View detail**, or select the pipeline name to open the run detail page with its activity runs. For a completed run, the **Retry** icon reruns it; in the run detail view you can rerun **from a failed activity** or **from a selected activity**, so successful upstream activities aren't run again.

**Inside the pipeline editor.** The **Output** tab under the canvas shows the last run activity by activity, with each input, output and error. A Copy activity output shows what was really used, such as `usedDataIntegrationUnits` and the parallel copies.

**Eventstreams.** Select a node on the canvas, then the **Data insights** tab. The eventstream node charts **IncomingMessages**, **OutgoingMessages**, **IncomingBytes** and **OutgoingBytes**. Azure Event Hubs, Azure IoT Hub, lakehouse, eventhouse (*Event processing before ingestion* mode), derived stream and Activator nodes show richer metrics:

| Metric | Watch it for |
| --- | --- |
| Input events / Output events | Volume entering and leaving the node |
| Backlogged input events | The engine falling behind the input |
| Runtime errors | Errors while processing events |
| Data conversion errors | Output events that don't fit the expected output schema |
| Deserialization errors | Input events that can't be read (wrong format) |
| Watermark delay | How far processing lags behind real time, in seconds |

Streaming connector sources (Apache Kafka, Amazon Kinesis, Google Cloud Pub/Sub, CDC sources and others) show a third set: Source Outgoing Events, Source Incoming Events, Connector Errors Logged, Connector Processing Errors, Connector Processing Failures and Connector Events Skipped.

The **Runtime logs** tab shows engine logs at three levels (warning, error, information). Both tabs need at least the Viewer role.

**Eventhouses.** Ingestion results are collected by workspace monitoring (see below), and the KQL command `.show ingestion failures` lists the failures of ingestion commands, kept 14 days.

<!-- section: monitor-transformation | objectives: 3.1.2 -->
## Monitoring data transformation

**Dataflow Gen2.** In the workspace, the dataflow menu > **Recent runs** opens the refresh history: start time, status, duration and type of each refresh. It shows up to 50 refreshes or six months, whichever comes first (OneLake keeps up to 250 refreshes or six months). Select a start time to open the refresh details:

| Level | Shows |
| --- | --- |
| Refresh | Status, refresh type, start and end time, duration, Request ID, Session ID, Dataflow ID |
| Tables | The queries with loading enabled, staged by the dataflow, each with its details |
| Activities | Actions such as loading to an output destination, with statistics: bytes and rows read and written |

From a run, **Download detailed logs** gives a ZIP of Power Query mashup engine logs; they appear a few minutes after the refresh, stay available 28 days and need at least the Viewer role. Several runs can also be exported as a CSV. In the workspace list, a red exclamation mark in the **Status** column means the last refresh, save or validation failed: for a refresh, open the history; for a save or validation, open the editor and validate.

**Notebooks and Spark job definitions.** Spark runs appear in the Monitor hub (including those started by pipelines), in the notebook itself (job progress, executors and logs per cell, with Spark advisor recommendations) and in the pipeline notebook activity (deep links to the run, the snapshot and the inline error). The **Spark application detail page** has these tabs: **Jobs** (job ID, status, stages, tasks, duration, data read and written, code snippet; a job description opens the Spark UI), **Resources** (executor usage graph), **Logs** (Livy, Prelaunch and Driver logs, searchable and downloadable), **Data** (input and output files), **Item snapshots** (the notebook, Spark job definition or pipeline as it ran) and **Diagnostics** (Spark advisor and error analysis).

**Warehouses.** Completed T-SQL requests are kept 30 days in the `queryinsights` views, available in warehouses and SQL analytics endpoints. A completed query can take up to 15 minutes to appear.

```text
-- Top CPU consumers among completed requests
SELECT TOP 100 distributed_statement_id, query_hash, allocated_cpu_time_ms, label, command
FROM queryinsights.exec_requests_history
ORDER BY allocated_cpu_time_ms DESC;
```

Other views: `exec_sessions_history`, `long_running_queries` (by median elapsed time), `frequently_run_queries` and `sql_pool_insights` (resource pressure). `query_hash` groups queries of the same shape. Viewing them needs Contributor or higher.

<!-- section: monitor-semantic-refresh | objectives: 3.1.3 -->
## Monitoring semantic model refresh

For a semantic model in import mode, open the model > **Refresh** > **Refresh history**: status, start time, duration and error message of each attempt. Power BI retries a failed refresh automatically, and each failed attempt appears with a **Show** link to its details. Each attempt has two phases, **Data** and **Query Cache**; the query cache phase runs only if the data phase succeeds.

| Fact | Value |
| --- | --- |
| Scheduled refreshes per day | 8 on Pro (shared capacity); 48 on Premium, PPU or Fabric capacity |
| Refresh time limit | 2 hours on shared capacity, 5 hours on Premium (the XMLA endpoint can bypass it) |
| Schedule deactivated | After four consecutive failures or an unrecoverable error (expired credentials); the threshold can't be changed |
| Schedule paused | After two months without anyone viewing a dependent report or dashboard |
| Failure notification | Email to the owner by default, plus the contacts in **Email these contacts when the refresh fails** |

Failure emails are sent for scheduled refreshes only, not for on-demand or programmatic refreshes (REST API, Power Automate).

**Direct Lake.** A refresh of a Direct Lake model is **framing**: it copies only metadata, pointing the model to the latest version of the Delta tables, in a few seconds and at low cost. If a table exceeds the guardrails of the SKU (Parquet files, row groups or rows per table), the refresh of a Direct Lake on OneLake model fails until the Delta tables are optimized; a Direct Lake on SQL model falls back to DirectQuery if fallback is allowed, and the refresh succeeds with a warning.

**From a pipeline.** The **Semantic model refresh** activity refreshes a model after the load that feeds it. Settings: connection, workspace, semantic model, then in **Advanced**: **Wait on completion** (on by default: the activity ends when the refresh ends, so a failed refresh fails the activity), **Max parallelism**, **Retry Count**, a refresh timeout, **Transactional** or **Partial Batch** commit, and the tables or partitions to refresh. Without a selection, it runs a full refresh.

> **Exam tip.** "Refresh the model only after the lakehouse load succeeds, and see the failure in the pipeline run" points to the Semantic model refresh activity with **Wait on completion**, on the Upon Success path of the load, not to a separate refresh schedule.

<!-- section: workspace-monitoring | objectives: 3.1.1, 3.1.2, 3.1.3 -->
## Workspace monitoring

Workspace monitoring (preview) collects logs and metrics from the items of a workspace into an eventhouse, where you query them with KQL, save queries in a KQL queryset, build Real-Time Dashboards or Power BI reports, and create alerts on the results.

- It's managed through a **monitoring item**, which contains an eventhouse, an activator and an Operations agent. The logs can go to this item's eventhouse or to the eventhouse of another monitoring item, to centralize several workspaces (each source workspace gets its own KQL database there; both workspaces must be in the same Azure region). This choice can't be changed later.
- Collection is **off** when the item is created. After it's turned on, earlier activity isn't backfilled.
- Only one monitoring item collects telemetry for a workspace.
- The monitoring database is read-only; workspace users with at least the Contributor role can query it.
- Retention is **30 days** by default, changed in the KQL database with **Manage** > **Data policies**; the caching period must be less than or equal to the retention period.

| Workload | Telemetry |
| --- | --- |
| Data Factory | Pipeline activity runs, copy jobs, Dataflow Gen2 |
| Data Warehouse | Query execution logs of warehouses, SQL analytics endpoints and warehouse snapshots |
| Mirroring | Mirrored database execution logs |
| Databases, Data Engineering | SQL database metrics; GraphQL API metrics and operation logs |
| Power BI | Semantic model operation logs |
| Real-Time hub | Job event logs |
| Real-Time Intelligence | Eventhouse queries, commands and ingestion results; eventstream status and error metrics; Activator rule notifications; Real-Time Dashboard and KQL queryset operation logs |

> **Exam trap.** Workspace monitoring starts empty: it can't explain a failure that happened before it was enabled. For past runs, use the Monitor hub and the item's run history.

<!-- section: alerts | objectives: 3.1.4 -->
## Configuring alerts

| Requirement | Alert |
| --- | --- |
| Free email when a **scheduled** run of a pipeline, notebook or dataflow fails | The item's **Schedule** > **Failure notifications** (also shown as **Schedule failure emails** in Monitor hub > **Alerts**, preview) |
| Alert on more job events (Started, Succeeded), with Teams messages or an automated action | Activator rule on job events in Real-Time hub, or an Activator-based alert rule (paid, preview) created from **Job runs** > **Create and manage alerts** > **Alerts (paid)** |
| Email when a scheduled semantic model refresh fails | The model's refresh failure notification settings |
| Message inside the pipeline flow, with run details | Teams activity on the Upon Failure path |
| Alert when a value in a stream crosses a threshold, per device or customer | Activator rule on an eventstream |
| Alert on a Power BI visual or a Real-Time Dashboard | Activator rule created from the visual |
| React to an item created or deleted, a file landing in OneLake, a job failing | Fabric events in Real-Time hub, with an Activator rule |

**Failure notifications** are set per item, apply to all its schedules, and cover scheduled runs only; the Monitor hub and the job scheduler use the same settings. Recipients are users or groups of the Microsoft Entra tenant (B2B guests included), not external addresses. The Monitor hub alerts page says that configuring them requires at least the Contributor role on the workspace or Write permission on the item. Semantic models aren't yet supported on the **Schedule failures** page.

**Activator-based job alerts** (preview) support pipelines, Spark jobs, notebooks, user data functions, warehouses, lakehouses, mirrored databases, SQL databases and KQL databases. They need workspace monitoring enabled (**Workspace settings** > **Monitoring**), at least the Contributor role to create the monitoring and Activator items, and they're billed as Activator capacity usage.

**Fabric Activator** is a no-code detection engine fed by eventstreams, Fabric and Azure events, Power BI reports and Real-Time Dashboards. Events are grouped into **objects** by an ID column (`device_id`), each with **properties**. Rules are stateless (each event alone, such as a value below 50) or stateful per object (`BECOMES`, `INCREASES`, `DECREASES`, `EXIT RANGE`, and absence of data for heartbeat checks). A rule fires when the object enters the new state, so a condition that stays true doesn't repeat the alert. Actions: email, Teams message, Power Automate flow, or running a Fabric item (pipeline, notebook, Spark job definition, dataflow, copy job, user data function).

> **Exam trap.** A schedule failure email never fires for a pipeline started with **Run** or by another pipeline. When the requirement covers every run, or a success event, use an Activator rule on job events, or a Teams activity on the failure path.

<!-- section: key-points -->
## Key points

- Monitor hub = runs of all items you can see; run detail = activities, Gantt, errors; rerun from the failed activity to skip what succeeded.
- Dataflow Gen2 history: 50 refreshes or six months on screen; detailed logs kept 28 days.
- `queryinsights` keeps 30 days of completed queries, with up to 15 minutes of delay.
- Semantic model: 8 or 48 scheduled refreshes a day; schedule disabled after four consecutive failures; failure emails only for scheduled refreshes; Direct Lake refresh = framing.
- Workspace monitoring (preview): logs in an eventhouse, off by default, no backfill, 30 days retention, Contributor to query.
- Alerts: free failure notifications in the item's schedule (scheduled runs only) versus Activator rules on job events (any run, any action); the Monitor hub alerts pages are in preview.
