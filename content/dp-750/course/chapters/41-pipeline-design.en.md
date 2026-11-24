A data pipeline is a sequence of ingestion, validation, transformation and publishing steps that must run in the right order, recover from failures and be safe to rerun. In Azure Databricks you build it either as notebooks orchestrated by a Lakeflow job or declaratively with Lakeflow Spark Declarative Pipelines (the docs also say "Lakeflow pipelines"). The exam asks you to order the steps, pick the right tool, wire task dependencies and complete error-handling code.

<!-- section: order-of-operations | objectives: 4.1.1 -->
## Designing the order of operations

The medallion architecture gives the default order:

| Order | Layer | Operations | Typical object |
| --- | --- | --- | --- |
| 1 | Landing | Files arrive in a Unity Catalog volume or external location; sources are reached through Lakeflow Connect or a connection | Volume, external location |
| 2 | Bronze | Ingest incrementally, as-is, with ingestion metadata (file name, load time) | Streaming table, Delta table |
| 3 | Silver | Cast types, validate, deduplicate, apply CDC, conform keys | Streaming table, Delta table loaded with `MERGE` |
| 4 | Gold | Join, denormalize, aggregate for consumers | Materialized view, Delta table |
| 5 | Serve and maintain | Grant access, refresh dashboards, optimize tables, notify | SQL warehouse, job tasks |

Ordering rules the exam tests:

- **Dimensions before facts**: load or update the customer and product dimensions before the fact table that looks up their keys, or new facts get unknown keys.
- **Validate before publish**: quality checks run before the gold table or the share is updated, not after.
- **Deduplicate before merge**: a `MERGE` fails when several source rows match one target row.
- **Independent branches in parallel**: two bronze ingestions with no shared input don't depend on each other; give both the same downstream task.
- **Maintenance after writes**: `OPTIMIZE` and `VACUUM` run after the load, outside the critical path.
- **Idempotent steps**: each step can be rerun after a failure without duplicating data (`MERGE`, `REPLACE WHERE`, streaming checkpoints).

> **Exam tip.** In an ordering question, start from the data dependencies: a step can only come after every step that produces what it reads. Then place validation before any publication and notification last.

<!-- section: notebook-vs-sdp | objectives: 4.1.2 -->
## Choosing between notebooks and Lakeflow Spark Declarative Pipelines

In a **notebook** you write the imperative code: what to read, how to write, when to checkpoint, in which order. In a **pipeline** you declare datasets (streaming tables, materialized views, views) and the pipeline analyzes the dependencies, orders and parallelizes the work, manages checkpoints and retries.

| Requirement | Better choice |
| --- | --- |
| Declarative bronze-silver-gold flow, dependencies resolved automatically | Pipeline |
| Data quality rules with warn, drop or fail and built-in metrics | Pipeline (expectations) |
| CDC with out-of-order events into SCD type 1 or type 2 | Pipeline (`AUTO CDC`) |
| Incremental refresh of aggregates without writing merge logic | Pipeline (materialized view) |
| Exploration, ad hoc analysis, one-off fixes | Notebook |
| Arbitrary Python logic, calls to external APIs, side effects such as `collect()`, file moves or sending messages | Notebook |
| Fine control of each write (custom `foreachBatch`, complex `MERGE` conditions) | Notebook |
| Reuse existing imperative Spark code as is | Notebook |
| Lineage, event log and data quality tab with no extra code | Pipeline |

Pipelines require the Premium plan. Both run in a Lakeflow job: a **Notebook** task or a **Pipeline** task, so a job can mix them (a notebook that calls an API, then a pipeline that refreshes the tables).

> **Exam trap.** Pipeline dataset code must stay free of side effects: the source is evaluated several times during planning. Calls such as `collect()`, `count()`, `toPandas()`, `save()`, `saveAsTable()`, `start()` or `toTable()` don't belong in a dataset function. If the requirement needs them, use a notebook task.

<!-- section: task-logic | objectives: 4.1.3 -->
## Designing task logic for Lakeflow Jobs

A job is a graph of **tasks**. Common task types: Notebook, Python script, Python wheel, JAR, Spark Submit, SQL, Pipeline, dbt, Run Job (calls another job), If/else, For each, Dashboards, Power BI.

Each task lists the tasks it **depends on**. Its **Run if** condition decides whether it runs, given the state of those dependencies:

| Run if | Runs when | If not met |
| --- | --- | --- |
| All succeeded (default) | Every dependency ran and succeeded | `Upstream failed` |
| At least one succeeded | At least one dependency succeeded | `Upstream failed` |
| None failed | No dependency failed and at least one ran | `Upstream failed` |
| All done | Every dependency ran, whatever its status | |
| At least one failed | At least one dependency failed | `Excluded` |
| All failed | Every dependency failed | `Excluded` |

Excluded upstream tasks count as successful when a `Run if` condition is evaluated; `Upstream failed` and `Upstream canceled` count as failed. If all of a task's dependencies are excluded, the task is excluded too, and exclusion cascades down a chain.

Control-flow tasks:

| Task | Purpose | Key facts |
| --- | --- | --- |
| If/else condition | Branch on a value | Operators `==`, `!=` (string comparison) and `>`, `>=`, `<`, `<=` (numeric). Downstream tasks depend on `<task> (true)` or `<task> (false)` |
| For each | Run one nested task once per element of an array | Input: a JSON array, a task value or a job parameter; `{{input}}` or `{{input.<key>}}` in the nested task; Concurrency default 1; one nested task, which can't be another For each |
| Run Job | Call another job | Reuse a job as a step |

Passing information between tasks:

- **Job parameters** apply to every task that accepts key-value parameters; reference them as `{{job.parameters.<name>}}`.
- **Task values**: a Python notebook sets `dbutils.jobs.taskValues.set(key="bad_records", value=n)` (any JSON value up to 48 KiB, up to 250 values per run); downstream tasks read `{{tasks.<task_name>.values.<key>}}` in their parameters.
- **Dynamic value references** such as `{{job.run_id}}`, `{{job.start_time.iso_date}}`, `{{tasks.ingest.result_state}}` or `{{task.execution_count}}` are replaced by strings at run time; no expression is evaluated inside the braces.

```text
validate (notebook)  -- sets task value bad_records
   |
check_quality (If/else: {{tasks.validate.values.bad_records}} > 0)
   |-- true  --> quarantine_report (notebook)
   |-- false --> publish_gold (pipeline)
```

> **Exam trap.** `==` in an If/else condition compares strings, so `12.0 == 12` is false. Use `>=` or `<=` for numeric tests, or make the upstream task set an integer.

<!-- section: error-handling | objectives: 4.1.4 -->
## Designing error handling

| Level | Mechanism | Use it to |
| --- | --- | --- |
| Code | `try` / `except`, then `raise` | Log context, clean up, then fail the task so the job sees the failure |
| Notebook call | `dbutils.notebook.run(path, timeout_seconds, arguments)` raises an exception on failure or timeout | Catch and retry a child notebook |
| Data | Expectations (warn, drop, fail), `CHECK` constraints, quarantine tables | Isolate bad records instead of failing, or fail on corrupt input |
| Task | Retries, timeout, duration warning | Absorb transient failures; stop runaway tasks |
| Job graph | `Run if` = At least one failed or All failed, for an alert or compensation task; All done for cleanup | Run handling logic only when something failed |
| Notifications | On failure, duration warning | Alert people (chapter on Lakeflow Jobs) |

```text
try:
    df = spark.read.table("contoso.bronze.orders")
    (df.write.mode("overwrite")
       .option("replaceWhere", f"order_day = '{run_date}'")
       .saveAsTable("contoso.silver.orders"))
except Exception as e:
    print(f"Load failed for {run_date}: {e}")
    raise
```

Design rules:

- **Re-raise** after logging: a notebook that catches the exception and ends normally is reported as succeeded, and downstream tasks run on bad data. `dbutils.notebook.exit("FAILED")` also ends the notebook as succeeded; it only returns a string.
- **Make retries safe**: retries rerun the whole task, so writes must be idempotent.
- **Timeouts apply to each retry** when both are configured.
- On serverless compute, auto-optimization retries failed tasks by default; disable it in the task's retry policy for a non-idempotent task that must run at most once.
- In a pipeline, retryable errors are retried by the runtime: each flow up to `pipelines.maxFlowRetryAttempts` (default 2, three attempts in total), the update up to `pipelines.numUpdateRetryAttempts` (default 5 for triggered pipelines, unlimited for continuous ones), only when the pipeline runs from a job, the API or in continuous mode.

> **Exam trap.** Wrapping a load in `try` / `except` with only a `print` hides the failure: the task, the run and the notifications report success. Handling an error means either recovering for real or failing visibly.

<!-- section: notebook-pipeline | objectives: 4.1.5 -->
## Building a pipeline with notebooks and precedence constraints

There are two ways to chain notebooks:

| | `%run ./notebook` | `dbutils.notebook.run(path, timeout, args)` |
| --- | --- | --- |
| Execution | Inline, in the caller's session; functions and variables become available | Separate ephemeral run |
| Parameters | Widget defaults (or values passed to widgets) | `arguments` set the target's widgets (strings) |
| Return value | None | A string passed to `dbutils.notebook.exit()` |
| Use | Share helper code | Orchestrate steps from a driver notebook |

`%run` must be alone in its cell. A `timeout_seconds` of 0 means no timeout. Runs created with `dbutils.notebook` must complete within 30 days.

```text
# Driver notebook: bronze, then silver only if bronze succeeded
import json

result = dbutils.notebook.run("./01_bronze_orders", 1800, {"run_date": run_date})
if json.loads(result)["status"] != "OK":
    raise RuntimeError(f"Bronze load failed: {result}")

dbutils.notebook.run("./02_silver_orders", 1800, {"run_date": run_date})

# In 01_bronze_orders, the last cell:
# dbutils.notebook.exit(json.dumps({"status": "OK", "rows": n}))
```

The **precedence constraints** of such a pipeline are the conditions that decide whether the next step runs. In a driver notebook they are `if` tests on return values and exception handling. In a Lakeflow job they are declarative: the **Depends on** list and the **Run if** condition of each task, visible in the job graph and in each run.

| Requirement | Design |
| --- | --- |
| B runs only after A succeeds | B depends on A, Run if All succeeded |
| C runs after A and B, whatever their result (cleanup) | C depends on A and B, Run if All done |
| An alert task runs only when a step failed | Alert depends on the steps, Run if At least one failed |
| D runs if at least one of two sources loaded | D depends on both, Run if At least one succeeded |
| Each step visible, retried and alerted separately | One job task per notebook, not one driver notebook |

> **Exam tip.** Prefer one job task per notebook over a driver notebook: each task gets its own retries, timeout, compute and notifications, and a failed run can be repaired from the failed task instead of restarting everything.

<!-- section: sdp-pipeline | objectives: 4.1.6 -->
## Building a pipeline with Lakeflow Spark Declarative Pipelines

Create it from **Jobs & Pipelines > New > ETL pipeline** (or **New > ETL pipeline** in the sidebar): give a unique name, a **default catalog and schema** for unqualified dataset names, and start from sample code, a single transformation, existing assets or a source-controlled project. Defaults: Unity Catalog, the **Current** channel and **serverless** compute. Source files (SQL or Python) go in the `transformations` folder of the pipeline root folder, in any order: dependencies are analyzed automatically.

| Dataset | SQL | Python | Use |
| --- | --- | --- | --- |
| Streaming table | `CREATE OR REFRESH STREAMING TABLE` | `@dp.table` | Append-only or incremental sources; each record processed once |
| Materialized view | `CREATE OR REFRESH MATERIALIZED VIEW` | `@dp.materialized_view` | Joins, aggregates, sources with updates and deletes; results kept consistent |
| View | `CREATE TEMPORARY VIEW` | `@dp.temporary_view` | Intermediate step or checks, not published |
| Flow | `CREATE FLOW ... AS AUTO CDC INTO` | `dp.create_auto_cdc_flow` | CDC into SCD type 1 or type 2 |

```text
-- transformations/orders.sql
CREATE OR REFRESH STREAMING TABLE orders_bronze
AS SELECT *, _metadata.file_path AS source_file
FROM STREAM read_files('/Volumes/contoso/landing/orders/', format => 'json');

CREATE OR REFRESH STREAMING TABLE orders_silver (
  CONSTRAINT valid_amount EXPECT (amount >= 0) ON VIOLATION DROP ROW
)
AS SELECT CAST(order_id AS BIGINT) AS order_id, customer_id,
          CAST(amount AS DECIMAL(12, 2)) AS amount, CAST(order_ts AS TIMESTAMP) AS order_ts
FROM STREAM(orders_bronze);

CREATE OR REFRESH MATERIALIZED VIEW sales_by_day
AS SELECT DATE(order_ts) AS order_day, sum(amount) AS revenue
FROM orders_silver
GROUP BY DATE(order_ts);
```

`STREAM` gives streaming semantics: the source must be append-only, otherwise use the `skipChangeCommits` option. The materialized view reads `orders_silver` without `STREAM`, as a batch.

Unity Catalog pipelines that use the default publishing mode also accept `CREATE VIEW`: the view is created in the pipeline's target catalog and schema, but it accepts no expectations, can't contain a streaming query and can't be a streaming source. A `CREATE TEMPORARY VIEW` is private to the pipeline and isn't added to the catalog.

Settings and run behavior:

| Setting | Values |
| --- | --- |
| Pipeline mode | **Triggered** (default): processes the available data, then stops. **Continuous**: processes data as it arrives on an always-running cluster. For new continuous pipelines, Databricks recommends a **continuous job** with the mode left at Triggered (built-in Continuous is discouraged); a job that runs the pipeline always overrides this setting |
| Run as | Identity that runs the pipeline and owns its tables; a service principal is recommended |
| Configuration / parameters | Spark settings and key-value parameters referenced by the source code |
| Classic compute (if not serverless) | Policy, enhanced autoscaling, min and max workers, Photon |

A manual **Run now** from the editor reuses the cluster and disables retries, for fast debugging. Updates started by a job, the API or in continuous mode shut the cluster down after the run, **retry** specific errors and restart the cluster for recoverable ones. A **full refresh** clears streaming tables and their checkpoints and reprocesses all source data; block it on a table with `pipelines.reset.allowed = false`. Schedule a triggered pipeline with a **Pipeline** task in a job.

> **Exam trap.** A streaming table reading a source that receives updates or deletes fails with `STREAM`. Use a materialized view when the source changes, or `skipChangeCommits` when only new rows matter.

<!-- section: key-points -->
## Key points

- Order: land, bronze, silver, gold, serve; dimensions before facts, validation before publication, maintenance last.
- Pipelines declare datasets and handle dependencies, checkpoints, expectations and CDC; notebooks handle arbitrary logic and side effects.
- Run if: All succeeded by default; All done for cleanup; At least one failed for alerting; excluded tasks count as successful.
- Pass values with task values (`{{tasks.<task>.values.<key>}}`) and job parameters; If/else `==` compares strings.
- Handle errors visibly: re-raise, idempotent writes for retries, timeouts per retry.
- `dbutils.notebook.run` returns the string from `dbutils.notebook.exit` and raises on failure; `%run` inlines code.
- Pipelines: streaming tables for append-only sources, materialized views for joins and aggregates; triggered by default, serverless by default; continuous processing through a continuous job.
