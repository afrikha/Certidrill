Orchestration decides which item does the work (Dataflow Gen2, pipeline, notebook), when it runs (schedule, event, another item) and how values flow between steps (parameters, variables, activity outputs, notebook exit values). Exam questions describe a team's skills, a data volume and a timing requirement, or show a pipeline expression with a gap, and ask for the item, the trigger or the expression.

<!-- section: choose-item | objectives: 1.4.1 -->
## Choosing between Dataflow Gen2, a pipeline and a notebook

The three items overlap, but each has a primary job:

| | Dataflow Gen2 | Pipeline | Notebook |
| --- | --- | --- | --- |
| Primary job | Ingest and transform with Power Query | Orchestrate activities and copy data at scale | Code-based ingestion, transformation and processing |
| Code | No code or low code (M behind the scenes) | No code or low code (canvas, JSON expressions) | Code: PySpark, Scala, Spark SQL, R |
| Skills | ETL, M, SQL | ETL, SQL, JSON | Spark |
| Connectors | 150+ | 50+ sources, 40+ destinations for copy | Hundreds of Spark libraries |
| Transformations | Low to high: 300+ transformation functions | Low: type conversion, column mapping, merge or split files, flatten hierarchy | Low to high: native Spark and open-source libraries |
| Control flow | None (one refresh) | ForEach, If condition, Switch, Until, Wait, Fail, Invoke pipeline... | Python code, `notebookutils.notebook.run` and `runMultiple` |
| Typical persona | Business analyst, data integrator | Data engineer, data integrator | Data engineer |

Two neighbours complete the picture: the **copy job** (wizard-driven full or incremental copy with CDC support, no pipeline to design) and the **Spark job definition** (non-interactive Spark code, preferred over a notebook for long-running production streams).

| Requirement | Item |
| --- | --- |
| Analysts clean and merge Excel, SharePoint and SQL data, no code | Dataflow Gen2 |
| Copy petabytes from on-premises and cloud sources on a schedule, minimal code | Pipeline with a Copy data activity |
| Run a dataflow, then a notebook, then a stored procedure, and email on failure | Pipeline that calls the three items |
| Parse nested JSON at scale, call a Python library, write Delta tables | Notebook |
| Incremental copy from a CDC-enabled SQL Server with an initial full load, wizard only | Copy job |
| Loop over a list of 200 tables and copy each one | Pipeline: Lookup, then ForEach with a Copy data activity |

> **Exam trap.** A pipeline orchestrates; it isn't a transformation engine. "Complex transformations with minimum code" is Dataflow Gen2; "complex transformations by Python developers" is a notebook. The pipeline only calls them in order, with retries and alerts.

<!-- section: schedules | objectives: 1.4.2 -->
## Designing schedules

Pipelines, notebooks, Dataflow Gen2 and other items use the Fabric **job scheduler**. Items aren't scheduled by default; open **Schedule** and add one or more schedules, each with a start, an end, a recurrence and a time zone.

| Recurrence | Options |
| --- | --- |
| Minute-based | Every 1 to 720 minutes |
| Hourly | Every 1 to 72 hours |
| Daily | Up to 10 times per day |
| Weekly | Selected weekdays, up to 10 times per week |
| Monthly | Every 1 to 12 months, or specific dates or weekdays of the month |

Rules to remember:

- Open-ended schedules aren't supported: set a distant end date such as `01/01/2099` for a permanent schedule. The scheduler handles daylight saving time and skips invalid dates such as 30 February.
- A pipeline accepts up to **20 schedules**, each with its own recurrence. A schedule can pass values to pipeline **parameters**, directly or from a **variable library**; a name that doesn't match exactly is ignored.
- **Interval-based schedules** (preview) run on fixed, non-overlapping windows and expose **Window start time** and **Window end time** as trigger parameters, which suits incremental loads by time slice. They can't be edited: delete and re-create them.
- Creating or changing a schedule requires the **Contributor** role in the workspace or **Write** on the item; Viewers only see schedules.
- **Failure notifications** go by email to users or groups of the tenant, only for **scheduled** runs, never for on-demand runs.
- Limits: 100 concurrent jobs per item, 24 days maximum per job, and the schedule is disabled after repeated consecutive failures (typically 10) until someone restarts it.
- A schedule **expires** if its owner doesn't sign in to Fabric for 90 consecutive days. Deployment pipelines carry schedules, and Git stores them in a `.schedules` file of the item definition.

> **Exam trap.** "Send an email when the nightly run fails" is the schedule's failure notification. "Send a Teams message when a manual run fails too" needs an activity on the pipeline's failure path (Teams activity), because notifications ignore on-demand runs.

**Run conditions** (preview) hold a run until upstream pipeline runs, required data or a time window are ready. They add to schedules and triggers, they don't replace them.

<!-- section: event-triggers | objectives: 1.4.2 -->
## Event-based triggers

An event trigger starts a pipeline when something happens instead of at a fixed time. Select **Trigger** on the pipeline's Home tab (or create the rule in Activator): Fabric creates an **Activator (Reflex) item** and an **eventstream** in the workspace, and the rule runs the pipeline.

| Event source | Examples |
| --- | --- |
| OneLake events | A file is created or deleted in a lakehouse folder |
| Azure Blob Storage events | `Microsoft.Storage.BlobCreated` in a container of a storage account |
| Job events | An item's job succeeded or failed |
| Workspace item events | An item is created, changed or deleted |

Filter storage events on the **Subject** field (container, folder, file name, extension). The trigger exposes built-in parameters parsed from the event, such as the file and folder names, in the expression builder. They're null during a manual test run, so use the `?` operator:

```text
@pipeline()?.TriggerEvent?.FileName
@concat('Files/landing/', pipeline()?.TriggerEvent?.FileName)
```

To review or edit a trigger, open the Reflex item, or use **Triggers > View triggers** on the pipeline. The copy job activity can be started by the same event triggers.

| Requirement | Answer |
| --- | --- |
| Load each CSV file as soon as it lands in a storage account | Event trigger on Azure Blob Storage events, filtered on the folder and `.csv` |
| Run every 15 minutes between two dates | Minute-based schedule, interval 15 |
| Process exact hourly slices without gaps or overlaps | Interval-based schedule using Window start time and Window end time |
| Start pipeline B only after pipeline A succeeds | Invoke pipeline activity at the end of A, or a run condition on B |

> **Exam tip.** "As soon as a file arrives" or "without polling" means an event trigger. A schedule that runs every minute to check for files wastes capacity and adds latency.

<!-- section: parameters-expressions | objectives: 1.4.3 -->
## Parameters, variables and dynamic expressions

| Element | Scope and behaviour | Syntax |
| --- | --- | --- |
| Pipeline parameter | Set at run start (by the caller, a schedule or a trigger), constant during the run | `@pipeline().parameters.SourceTable` |
| Variable | Changed during the run with Set variable or Append variable | `@variables('FileList')` |
| System variable | Provided by Fabric | `@pipeline().RunId`, `@pipeline().Pipeline`, `@pipeline().TriggerTime`, `@pipeline().DataFactory` (workspace name) |
| Activity output | Result of an earlier activity | `@activity('Lookup1').output.firstRow.MaxDate` |
| Current item of a ForEach | One element of the Items array | `@item()`, `@item().TableName` |

Expression rules:

- A value that starts with `@` is an expression. If the whole value is one expression, its type is kept (`@pipeline().parameters.myNumber` returns a number).
- `@{...}` is **string interpolation**: it always returns a string and can sit inside text. `@@` escapes a literal `@`.
- Functions cover strings (`concat`, `replace`, `split`, `substring`, `toLower`), dates (`utcNow`, `formatDateTime`, `addDays`, `startOfDay`, `convertFromUtc`), collections (`length`, `first`, `contains`, `union`), logic (`if`, `equals`, `and`, `or`, `not`) and conversion (`int`, `string`, `json`).

```text
@concat('sales_', formatDateTime(utcNow(), 'yyyyMMdd'), '.parquet')
Files/raw/@{pipeline().parameters.Region}/@{formatDateTime(pipeline().TriggerTime, 'yyyy/MM/dd')}
@if(equals(pipeline().parameters.LoadType, 'full'), 'overwrite', 'append')
@pipeline()?.TriggeredByPipelineName
```

The **Lookup** activity returns `output.firstRow` when **First row only** is selected, otherwise `output.value`, an array that feeds a ForEach. Limits: 5,000 rows, 4 MB of output, and a query must return exactly one result set.

**ForEach** iterates over its **Items** expression; child activities run one after the other for each item, and items run in parallel unless **Sequential** is selected (**Batch count** caps the parallelism).

Activities connect through four conditions: **On success**, **On failure**, **On completion** (whatever the result) and **On skip**. Every activity has a timeout (default 12 hours, maximum 7 days, format `D.HH:MM:SS`), optional retries with an interval (default 30 seconds), and **Secure input** and **Secure output** to keep values such as secrets out of the run logs. A pipeline holds at most **120 activities**, inner activities of containers included.

> **Exam trap.** `'@{pipeline().parameters.Year}'` inside a SQL query string is interpolation and works; `@pipeline().parameters.Year` written in the middle of text without braces is taken literally. When the value must stay a number or a Boolean, write the whole value as a single expression without braces.

<!-- section: notebook-orchestration | objectives: 1.4.3 -->
## Orchestrating notebooks and pipelines

**Notebook activity in a pipeline.** Select the notebook and a connection, then set **Base parameters** (name, type, value). The notebook must have a cell marked as the **parameter cell** (toggle parameter cell): only variables defined there are detected and overridden at run time; without it, no parameter is passed. The notebook returns a value with `notebookutils.notebook.exit()`, which the pipeline reads in later activities:

```text
# Parameter cell of the notebook (defaults, overridden by the pipeline)
load_date = "2026-01-01"
source_table = "orders"

# Last cell, outside any try/except block
notebookutils.notebook.exit(str(rows_written))
```

```text
@activity('Notebook1').output.result.exitValue
@greater(int(activity('Notebook1').output.result.exitValue), 0)
```

- The exit value is always a **string**; convert it (`int()`) before comparing numbers.
- To run several notebooks of one pipeline on a shared Spark session, turn on **High concurrency mode for pipeline running multiple notebooks** in the workspace Spark settings and give the Notebook activities the same **session tag**: start-up time drops.
- A Notebook activity can run under a **workspace identity**: create it in the pipeline's workspace, enable the tenant setting *Service principals can call Fabric public APIs*, and give it at least Contributor on the notebook's workspace.

**Notebook calling notebooks.** `notebookutils` (the new name of `mssparkutils`) runs child notebooks on the caller's Spark session:

```text
result = notebookutils.notebook.run("Clean_Orders", 600, {"load_date": "2026-11-01"})

DAG = {
    "activities": [
        {"name": "Extract", "path": "Extract_Orders", "args": {"load_date": "2026-11-01"}},
        {"name": "Clean", "path": "Clean_Orders", "dependencies": ["Extract"],
         "retry": 1, "retryIntervalInSeconds": 10},
        {"name": "Customers", "path": "Load_Customers"}
    ],
    "timeoutInSeconds": 3600,
    "concurrency": 4
}
notebookutils.notebook.validateDAG(DAG)
results = notebookutils.notebook.runMultiple(DAG)
```

| Fact | Value |
| --- | --- |
| `run()` default timeout | 90 seconds (`timeout_seconds`) |
| `run()` returns | The string passed to `exit()` in the child, or `""` |
| `runMultiple()` DAG timeout | 43,200 seconds (12 hours) by default |
| `runMultiple()` concurrency | 3 times the available CPU cores by default; `0` means unlimited |
| Per-activity cell timeout | 90 seconds by default (`timeoutPerCellInSeconds`) |
| Child with a different default lakehouse | Blocked, unless `useRootDefaultLakehouse: True` is passed in the arguments |
| `validateDAG()` checks | Duplicate names, missing dependencies, circular references |

**Pipeline calling pipelines.** The **Invoke pipeline** activity calls a child pipeline, now across workspaces and also Azure Data Factory and Synapse pipelines, with child runs visible in monitoring. It requires a **connection** (organizational account, service principal or workspace identity). The legacy version calls only pipelines of the same workspace and offers **Wait on completion**: cleared, the child runs in parallel with the next activities.

| Pattern | Implementation |
| --- | --- |
| Metadata-driven copy of many tables | Lookup on a control table, ForEach over `output.value`, Copy data with `@item()` values |
| Fan-out of independent Spark jobs with one session | `runMultiple` with no dependencies, or Notebook activities sharing a session tag |
| Parent pipeline controlling reusable child pipelines | Invoke pipeline with parameters |
| Stop the run with a clear error when a check fails | If condition, then Fail activity with a message and code |
| Log every failure | On failure (or On completion) path to a Stored procedure, Teams or Web activity |

> **Exam trap.** `notebookutils.notebook.exit()` inside a `try`/`except` block doesn't take effect. Call it at the top level, in its own last cell.

<!-- section: key-points -->
## Key points

- Dataflow Gen2 = Power Query, no code; pipeline = orchestration and bulk copy; notebook = Spark code; copy job = wizard incremental copy.
- Schedules: minute-based to monthly, up to 20 per pipeline, an end date is mandatory, failure emails for scheduled runs only, expiry after 90 days without owner sign-in.
- Event triggers create an Activator (Reflex) item and an eventstream; trigger values come from `@pipeline()?.TriggerEvent?...`.
- `@` keeps the type, `@{}` returns a string; Lookup `firstRow` or `value`; ForEach `@item()`.
- Notebook parameters need a parameter cell; `exit()` returns a string read with `output.result.exitValue`.
- `runMultiple` runs a DAG of notebooks on one session; Invoke pipeline calls child pipelines through a connection.
