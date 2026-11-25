Troubleshooting questions give an error message or a symptom (a pipeline marked Failed although its error handler ran, a notebook rejected with HTTP 430, a shortcut that shows no table) and ask for the cause or the fix. Learn where each engine writes the real error, then the classic causes.

<!-- section: pipeline-errors | objectives: 3.2.1 -->
## Pipeline errors

Open the run (Monitor hub or the **Output** tab), then the failed activity: its error message, error code and output usually name the cause. Fix it, then rerun **from the failed activity** so that successful activities aren't repeated.

General settings that cause or prevent failures:

| Setting | Default | Note |
| --- | --- | --- |
| Timeout | 12 hours | Maximum seven days, format `D.HH:MM:SS`; an activity that exceeds it fails |
| Retry, Retry interval | Interval 30 seconds | For transient errors (throttling, network) |
| Secure input / Secure output | Off | Hides the input or output from logs (secrets, tokens) |
| Activity state | Activated | A deactivated activity doesn't run; **Mark activity as** Succeeded, Failed or Skipped decides which branch follows |

**Dependency conditions.** Each arrow between activities is a condition: **Upon Success** (default), **Upon Failure**, **Upon Completion** (succeeded or failed) or **Upon Skip** (the activity didn't run). Upon Completion can't coexist with Upon Success or Upon Failure from the same activity. An activity with several incoming arrows runs only when **all** its conditions are met (AND).

The pipeline's final status is computed from the **leaf activities** (if a leaf was skipped, its parent is evaluated): the pipeline fails if any evaluated activity failed.

| Pattern | Paths defined | Activity fails → pipeline status |
| --- | --- | --- |
| Try-Catch | Upon Failure only | Succeeded (the handler is the leaf and succeeded) |
| Do-If-Else | Upon Success and Upon Failure | **Failed** (the Upon Success branch is skipped, its parent failed) |
| Do-If-Skip-Else | Upon Success and Upon Failure, plus a final activity on Upon Skip | Succeeded |

> **Exam trap.** "The error handler ran, but the run still shows Failed" is the Do-If-Else pattern working as designed. To report success after handling the error, keep only the Upon Failure path (Try-Catch) or add the Upon Skip activity; to make the run fail on purpose with a clear message, end the handler with a **Fail** activity.

The **Fail** activity fails the pipeline with a custom error message and error code, shown in the run history. Typical use: an If Condition tests a Lookup result (no rows, wrong count) and the True branch runs Fail. To act when any of several activities failed, connect them with Upon Completion to an If Condition:

```text
@or(equals(activity('Copy Orders').Status, 'Failed'), equals(activity('Copy Customers').Status, 'Failed'))
```

Other classic causes:

| Symptom | Cause and fix |
| --- | --- |
| Source unreachable, credentials error | Connection credentials expired or wrong; on-premises source without a running data gateway |
| Copy activity to a warehouse can't run as configured | A warehouse destination requires staging |
| Scheduled run ignores a parameter | The schedule's parameter name doesn't exactly match the pipeline parameter (mismatches are ignored) |
| Teams activity inactive after deployment | Its connection is tied to a user; create a user connection in the target workspace |

<!-- section: dataflow-errors | objectives: 3.2.2 -->
## Dataflow Gen2 errors

Open **Recent runs**, select the failed run, then the failing **table** or **activity** (writing to a destination is an activity): each level shows its error. For deeper analysis, **Download detailed logs** (mashup engine logs, 28 days). A red exclamation mark in the workspace may also mean a failed **save or validation**: open the editor and validate.

Most refresh failures come from the data destination:

| Symptom | Cause and fix |
| --- | --- |
| `We can't insert null data into a non-nullable column.` | A column detected as non-nullable receives nulls. Delete the destination table, remove the destination, set the column types to `type nullable ...`, then add the destination again |
| Publishing fails after a query change | **Fixed schema**: the query schema no longer matches the destination. Update the mapping, or use **dynamic schema** (Replace only), which drops and recreates the table |
| New column not added to the table | The update method is **Append**: schema changes aren't possible with Append |
| Loading to a warehouse fails or warns | Staging is required for a warehouse destination, the warehouse must be in the same workspace, and only fixed schema is supported |
| Type error on load | Unsupported types: DateTimeZone and Time aren't supported by lakehouse and warehouse destinations; Currency isn't supported by the warehouse (convert to decimal); Duration only by Azure Data Explorer |
| Table deleted from the destination isn't recreated | It was an **existing** table: Dataflow Gen2 recreates only the tables it created |
| Replace fails on a KQL database | KQL databases and Azure Data Explorer support Append only |
| Gateway refresh: no detailed logs | Turn on **Admin consent for gateway diagnostics** on the gateway |

Destinations apply only to tabular queries, not to functions or lists.

<!-- section: notebook-errors | objectives: 3.2.3 -->
## Notebook errors

Look at the cell error first, then the Spark application detail page: **Logs** (Livy, Prelaunch, Driver) and **Diagnostics** (Spark advisor error analysis). Logs may be missing if the job stayed queued or the cluster couldn't be created.

**Capacity limits.** One capacity unit gives two Spark VCores, with bursting up to three times (an F64 reaches 384 VCores). Exceptions: an F2 bursts to 20 VCores, and a trial capacity has no burst (128 VCores) and no queue. A capacity admin can turn on **Disable job-level bursting**, which caps a single job at the base VCores (128 on an F64). When the capacity is fully used, an interactive notebook fails with:

```text
[TooManyRequestsForCapacity] HTTP Response code 430: This Spark job can't be run because you have hit a Spark compute or API rate limit. To run this Spark job, cancel an active Spark job through the Monitoring hub, or choose a larger capacity SKU or try again later.
```

| Job source | When the capacity is full |
| --- | --- |
| Interactive notebook, notebook public API | Rejected with HTTP 430, not queued |
| Pipeline, scheduler, Spark job definition | Queued (FIFO) and retried automatically; expires after 24 hours |
| Any job while the capacity is throttled | Rejected, not queued |

The queue limit grows with the SKU (64 jobs on F64).

**Sessions.** Interactive sessions expire after 20 minutes by default (workspace setting **Spark session timeout**); an admin can also set a **maximum job lifetime**, after which Fabric cancels the job.

**Libraries.**

| Symptom | Cause and fix |
| --- | --- |
| `%pip install` works interactively but fails in the pipeline | Inline installation is disabled in pipeline runs; add the boolean parameter `_inlineInstallationEnabled` = `True` to the notebook activity, or better, install the library in an environment |
| Library missing on executors | `!pip` installs on the driver only; use `%pip` |
| Variables lost after an install cell | `%pip` restarts the Python interpreter; put installs at the top of the notebook |
| Inline install refused | Not supported in high concurrency mode or in a referenced notebook |

**Orchestration from code.** `notebookutils` (formerly `mssparkutils`) runs child notebooks:

```text
# run(path, timeout_seconds=90, arguments, workspace) returns the child's exit value
value = notebookutils.notebook.run("Clean_Orders", 600, {"load_date": "2026-11-01"})

# runMultiple raises RunMultipleFailedException if an activity fails
from notebookutils.common.exceptions import RunMultipleFailedException
try:
    results = notebookutils.notebook.runMultiple(DAG)
except RunMultipleFailedException as ex:
    results = ex.result   # per activity: exitVal and exception
```

The default `run()` timeout is 90 seconds: a long child notebook fails unless you raise it. `notebookutils.notebook.exit()` has no effect inside `try`/`except`: call it at the top level. In a pipeline run, `exit()` returns the value to the notebook activity and stops the session.

<!-- section: eventhouse-errors | objectives: 3.2.4 -->
## Eventhouse errors

**Ingestion.** Failed ingestion commands are listed for 14 days:

```kusto
.show ingestion failures
| where FailedOn > ago(1d) and Table == "Telemetry"
| project FailedOn, Table, FailureKind, ErrorCode, Details, OriginatesFromUpdatePolicy
```

`FailureKind` is `Permanent` (malformed data, mapping, access forbidden: fix and reingest) or `Transient` (retry). Typical error codes: `Stream_ClosingQuoteMissing` for malformed CSV, `Download_Forbidden` when the source storage refuses access.

**Update policies.** When `OriginatesFromUpdatePolicy` is true, the update policy query failed: its output must match the target table in column types **and order**.

| `IsTransactional` | If the update policy fails |
| --- | --- |
| `false` (default) | Data lands in the source table only; the ingestion succeeds and the target misses rows |
| `true` | Nothing is ingested in the source or the target; the ingestion fails and can be retried |

**Query errors.**

| Error | Cause | Fix |
| --- | --- | --- |
| `E_QUERY_RESULT_SET_TOO_LARGE` | Result over 500,000 records or 64 MB | Aggregate, `project` fewer columns, `take`; `set notruncation;` only when really needed; `.export` for large extracts |
| `E_RUNAWAY_QUERY` | An operator (`join`, `summarize`, `sort`) exceeded its memory per node | Filter earlier, use `hint.shufflekey`, or raise `maxmemoryconsumptionperiterator` |
| Timeout | Default 4 minutes for queries, 10 for management commands, maximum 1 hour | Optimize, or set `servertimeout` |
| Query complexity error | Very long `or` chains, huge `union *`, deep nesting | Rewrite with `in()`, reduce the tables and columns |

A shortcut in a KQL database is queried with `external_table('MyShortcut')`; a database shortcut must be in the same region as its source database (the tenants can differ), and creating one from a cluster URI needs at least contributor permissions on the source data.

<!-- section: eventstream-errors | objectives: 3.2.5 -->
## Eventstream errors

Select the failing node and read **Data insights** (Runtime errors, Data conversion errors, Deserialization errors, Backlogged input events, Watermark delay) and **Runtime logs** (filter on Error).

| Symptom | Cause and fix |
| --- | --- |
| Deserialization errors on the source | The data format selected for the source (JSON, Avro or CSV with header) doesn't match the events |
| Data conversion errors on a destination | Events don't fit the destination schema: fix the mapping or add a transformation |
| Azure Event Hubs source can't connect | The event hub is behind a firewall: it must be public, or reached through a managed private endpoint; check the shared access key name and value |
| Filter or aggregation output doesn't reach the eventhouse | Direct ingestion takes the raw stream; after operators, use **Event processing before ingestion** |
| Backlog grows, watermark delay increases | Throughput too low for the input: raise the **Event throughput** setting |
| Old events are missing | They exceeded the eventstream retention (1 day by default, up to 90 days) |
| Destination missing the first events | Ingestion was activated after the data arrived; reactivate with **Custom time** at an earlier timestamp |

Schema-enabled sources (schemas from the schema registry) can only feed eventhouse, custom endpoint and derived stream destinations.

<!-- section: tsql-errors | objectives: 3.2.6 -->
## T-SQL errors

**Write-write conflicts.** A warehouse uses snapshot isolation only (a change of isolation level in T-SQL is ignored at execution time, and `SET TRANSACTION ISOLATION LEVEL` is on the list of unsupported commands) and table-level locking. Two transactions that `UPDATE`, `DELETE` or `MERGE` the same table conflict even when they touch different rows: the first to commit wins, the other fails with error **24556** or **24706** ("Snapshot isolation transaction aborted due to update conflict"). Fix: retry with exponential backoff, avoid concurrent updates on the same table, keep transactions short. `INSERT` creates new files and rarely conflicts; a `MERGE` conflicts even when it only appends.

**Statements that fail:**

| Symptom | Cause |
| --- | --- |
| `INSERT`, `UPDATE` or `CREATE TABLE` fails on the SQL analytics endpoint | The endpoint is read-only for tables; write in a warehouse or with Spark (views, functions and procedures can be created) |
| `CREATE TABLE` with `datetime`, `money`, `nvarchar`, `tinyint` fails | Unsupported in tables: use `datetime2` (up to 6 fractional digits), `decimal`, `varchar` (UTF-8 collation), `smallint` |
| `ALTER TABLE` fails | Only adding nullable columns, dropping columns and adding or dropping `NOT ENFORCED` primary, unique and foreign keys are supported (`ALTER COLUMN` is in preview); rename with `sp_rename` |
| Trigger, materialized view, recursive query, `SET ROWCOUNT`, synonym | Not supported in Fabric Warehouse |
| Savepoint, named or distributed transaction | Not supported |
| A new lakehouse table isn't visible from the endpoint | Metadata sync lag (usually under a minute); refresh the endpoint metadata |

`varchar(max)` and `varbinary(max)` are limited to 16 MB. Use `queryinsights.exec_requests_history` to find slow statements after the fact, and `sys.dm_tran_locks` to see current locks.

> **Exam trap.** Two pipelines that update different rows of the same warehouse table at the same time still conflict. Serialize them (dependency or a single pipeline) or add retry logic: changing the isolation level isn't an option.

<!-- section: shortcut-errors | objectives: 3.2.7 -->
## OneLake shortcut errors

| Symptom | Cause and fix |
| --- | --- |
| Shortcut in **Tables** not shown as a table | The target isn't in Delta format, the shortcut isn't at the top level of Tables, or its name contains a space |
| Can't create a shortcut in a subfolder of Tables | Only top-level shortcuts are supported in Tables; use **Files** for any other location |
| Access denied through an internal shortcut | OneLake uses the **calling user's identity**: the user needs read permission on the target item |
| Can't create an ADLS Gen2 or S3 shortcut | Access goes through a cloud **connection**: you need permission on the connection, and its credentials must reach the data |
| Shortcut suddenly broken | The target was moved, renamed or deleted |
| Data deleted at the source | Deleting files through a shortcut deletes them in the target when you have write permission |
| Name refused | `%` and `+` and non-Latin characters aren't allowed in names and paths |
| New shortcut not yet in the Table API | It can take up to a minute |

Limits: 100,000 shortcuts per item, 10 per OneLake path, 5 shortcuts chained to shortcuts, 100 external connections per item. Deleting a shortcut never deletes the target.

**Firewall-protected storage.** An ADLS Gen2 account with public access restricted to selected networks, or disabled, is reached through **trusted workspace access**:

1. The workspace runs on an F SKU capacity (not trial).
2. Create a workspace identity.
3. On the storage account, add a resource instance rule for the workspace (ARM template or PowerShell, not the portal).
4. Give the identity used by the connection a Storage Blob Data role (Reader, Contributor or Owner).
5. Create the shortcut with the DFS URL (`https://account.dfs.core.windows.net`), authenticating with an organizational account, a service principal or the workspace identity.

It stops working one hour after the workspace moves to a trial or non-F capacity, and fails if a Conditional Access policy for workload identities covers all service principals.

> **Exam trap.** A shortcut that works for the workspace admin but not for a colleague is a permission issue on the target (internal shortcut) or on the connection (external shortcut), not a broken shortcut.

<!-- section: key-points -->
## Key points

- Pipeline status is decided by leaf activities: Try-Catch succeeds, Do-If-Else fails after handling; Fail activity for a custom error; rerun from the failed activity.
- Dataflow Gen2 failures are mostly destination issues: nullable columns, fixed schema, Append, warehouse staging, unsupported types.
- HTTP 430 = Spark capacity full; interactive jobs aren't queued, pipeline jobs are (24 hours).
- `%pip` in a pipeline needs `_inlineInstallationEnabled`; prefer environments. `notebook.run()` times out after 90 seconds by default.
- Eventhouse: `.show ingestion failures` (14 days), transactional update policies, 500,000 records or 64 MB per result.
- Warehouse: table-level write-write conflicts (24556, 24706) need retries; the SQL analytics endpoint is read-only.
- Shortcuts: Tables top level and Delta; user identity for internal targets, connection for external; trusted workspace access for firewalled storage.
