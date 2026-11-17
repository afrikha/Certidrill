Optimization questions state a symptom (slow Power BI reports on Delta tables, a copy that takes hours, a stream that lags, a warehouse query that scans too much) and a constraint (minimize cost, development effort or latency), then ask which setting, command or design change fixes it. Know the default of each engine, because the exam often asks what changed when the default no longer fits.

<!-- section: lakehouse-tables | objectives: 3.3.1 -->
## Optimizing lakehouse tables

Every Delta write adds Parquet files; frequent small writes, updates and deletes leave many small files, which slow reads and the SQL analytics endpoint metadata sync. Compaction (`OPTIMIZE`) rewrites them into fewer, right-sized files.

```text
-- Spark SQL in a notebook
OPTIMIZE dbo.sales                                  -- bin compaction
OPTIMIZE dbo.sales ZORDER BY (customer_id)          -- co-locate values for data skipping
OPTIMIZE dbo.sales VORDER                           -- force V-Order on rewritten files
OPTIMIZE dbo.sales ZORDER BY (customer_id) VORDER   -- order: compaction, Z-Order, V-Order
VACUUM dbo.sales RETAIN 168 HOURS                   -- remove unreferenced files older than 7 days
```

| Feature | What it does | Default or setting |
| --- | --- | --- |
| Bin compaction (`OPTIMIZE`) | Groups small files into files of the target size | Target 1 GB (`spark.databricks.delta.optimize.maxFileSize`) |
| Z-Order | Sorts data on frequently filtered, high-selectivity columns so whole files are skipped | Off; per `OPTIMIZE` |
| V-Order | Write-time sorting, encoding and compression in Parquet, best for Power BI Direct Lake and SQL reads | **Disabled** for new workspaces (`spark.sql.parquet.vorder.default=false`) |
| Auto compaction | Runs a synchronous `OPTIMIZE` after a write when a partition has too many small files | Set with `spark.databricks.delta.autoCompact.enabled` or the table property `delta.autoOptimize.autoCompact` |
| Fast optimize | Skips bins unlikely to reach the target size | Set with `spark.microsoft.delta.optimize.fast.enabled` |
| `VACUUM` | Deletes files no longer referenced and older than the retention | 7 days; shorter retention fails unless `spark.databricks.delta.retentionDurationCheck.enabled` is `false` |

V-Order can be set at three levels: the session (`spark.sql.parquet.vorder.default`), the table (`TBLPROPERTIES("delta.parquet.vorder.enabled" = "true")`) and one write (`.option("parquet.vorder.enabled", "true")`). Session and write settings override the table property. Changing the property affects future writes only: existing files keep their layout until rewritten, for example by `OPTIMIZE ... VORDER`.

**Resource profiles** set these options together (`spark.fabric.resourceProfile`, in an environment or with `spark.conf.set` at run time; run time wins):

| Profile | Use | Main settings |
| --- | --- | --- |
| `writeHeavy` | Default for new workspaces; frequent ingestion | V-Order off |
| `readHeavyForPBI` | Power BI queries on Delta tables | V-Order on, optimized write on (1 GB bins) |
| `readHeavyForSpark` | Frequent Spark reads | Optimized write on (128 MB bins) |
| `custom` | Your own settings | User-defined |

Without code, the lakehouse explorer offers **Maintenance** on a table: **Optimize** (with **Apply V-order**), **Vacuum** (retention threshold, 7 days by default) and **Merge deletion vectors**, run as a job visible in the Monitor hub. A pipeline can run the same job with the Lakehouse Maintenance activity (preview). Maintenance applies to Delta tables only.

**Partitioning.** Partition only large tables, on a low-cardinality column (year, date) that produces partitions of about 1 GB or more; a high-cardinality column creates a partition per value and many small files.

> **Exam trap.** `VACUUM` doesn't make queries faster: it reclaims storage and limits time travel. For a slow read on fragmented files, the answer is `OPTIMIZE` (with V-Order for Direct Lake, Z-Order for selective filters).

<!-- section: pipelines | objectives: 3.3.2 -->
## Optimizing pipelines

**Copy activity settings.**

| Setting | Values | Effect |
| --- | --- | --- |
| Intelligent throughput optimization | **Auto** (default), Standard (64), Balanced (128), Maximum (256), or 4 to 256 | Compute allocated to the copy; the value used appears as `usedDataIntegrationUnits` |
| Degree of copy parallelism | Auto, or an integer of 1 or more | Maximum threads reading the source and writing the destination; each thread is a session on a database source |
| Partition option (SQL sources) | None (default), **Physical partitions of table**, **Dynamic range** | Splits the read into parallel queries |
| Staging | Required for a warehouse destination | ITO and parallelism then apply from source to staging |

| Source table | Partition option |
| --- | --- |
| Partitioned, with enough partitions | Physical partitions of table (parallelism is capped by the partition count) |
| Heap, indexed or skewed table | Dynamic range on a column, with upper and lower bounds set in advance, and a limited degree of parallelism (such as 50) |
| Unknown source DDL | Defaults, accepting a longer duration |

Without bounds, Dynamic range first queries the source to find them. Leave **Isolation level** at None when parallelism is Auto, to avoid overloading the source. Lowering ITO lengthens the copy but reduces the capacity units consumed: it's the lever when the requirement is cost.

**Control flow.** A ForEach runs its items in parallel unless **Sequential** is selected; **Batch count** limits how many items run at the same time. Copying a large table as date slices in a parallel ForEach is a common way to speed up a non-partitioned source. Other gains: remove unneeded activities between steps, run independent branches in parallel (no dependency between them), and filter at the source (query or incremental watermark) rather than copying everything.

> **Exam tip.** "Reduce the load on the source database during the copy" means lowering **Degree of copy parallelism**, not ITO. "Reduce the capacity units of the copy" means lowering ITO.

<!-- section: warehouse | objectives: 3.3.3 -->
## Optimizing a data warehouse

**Table design.**

- Use the smallest type that fits: `varchar(100)` rather than `varchar(8000)` or `varchar(max)`, `varchar` rather than `char` for variable lengths, integers rather than `decimal` when possible, and an explicit precision (`decimal(9,4)`: a bare `decimal` is `decimal(18,0)`).
- Declare columns `NOT NULL` when the model allows it.
- Keep the same data type on both sides of joins and filters to avoid conversions.

**Loading.** `COPY INTO` is the recommended way to load files: aim for files of 100 MB to 1 GB, many files, several `COPY INTO` in parallel. From lakehouse tables, use CTAS or `INSERT ... SELECT`. Avoid trickle (singleton) inserts, updates and deletes: each creates a new Parquet file. Batch them.

**Maintenance is automatic.** The warehouse compacts small files and removes deleted rows in the background, and maintains statistics automatically. You can still run `CREATE STATISTICS` or `UPDATE STATISTICS` (single-column histograms), for example after a large load. **V-Order is enabled by default** in a warehouse; disabling it is irreversible and only suits write-intensive staging warehouses.

**Data clustering (preview).** Stores rows with similar values together so queries skip files:

```text
CREATE TABLE dbo.Sales
(
    SaleID int, CustomerID int, SaleDate date, Amount decimal(10,2)
)
WITH (CLUSTER BY (CustomerID, SaleDate));
```

| Rule | Detail |
| --- | --- |
| Columns | 1 to 4; mid-to-high cardinality, used in range filters (`WHERE` on dates, IDs) |
| When | Defined at creation (`CREATE TABLE` or CTAS); can't be added, changed or removed later (rebuild with CTAS) |
| Not for | Small tables, low-cardinality columns, equality joins, `bit`, `varchar(max)`, identity columns |
| Cost | Slower ingestion and more capacity units; DML should handle at least 1 million rows to benefit |

**Concurrency.** Write-write conflicts are per table: schedule updates to the same table so they don't overlap.

> **Exam trap.** In a warehouse, you don't run `OPTIMIZE` or `VACUUM`: compaction is automatic. Those commands are for lakehouse Delta tables written by Spark.

<!-- section: eventstream-eventhouse | objectives: 3.3.4 -->
## Optimizing Eventstream and Eventhouse

**Eventstream.**

| Setting | Values | Use |
| --- | --- | --- |
| Event throughput | Low (under 10 MB/s), Medium (10 to 100 MB/s), High (over 100 MB/s) | Raise it when the backlog grows; nodes that support pause must be deactivated during the change |
| Retention | 1 day by default, up to 90 days | How long events stay available for replay |
| Eventhouse destination mode | Direct ingestion, or Event processing before ingestion | Direct for raw events; processing mode when operators (filter, aggregate) run first |

An Azure Event Hubs source with fewer than four partitions is limited by its partitions whatever the throughput level. Filtering and aggregating in the eventstream reduces the volume ingested downstream.

**Eventhouse (KQL database).**

| Lever | Effect | Command |
| --- | --- | --- |
| Caching policy | Data in the hot cache (local SSD) is queried faster; a longer period costs more | `.alter table Telemetry policy caching hot = 7d` |
| Retention policy | Data older than the period is deleted; default 3,650 days | **Manage** > **Data policies**, or `.alter table ... policy retention` |
| Ingestion batching policy | Defaults: 5 minutes, 500 items or 1 GB, whichever comes first; lower the time (minimum 10 seconds) for latency | `.alter table ... policy ingestionbatching` |
| Update policy | Transforms data once at ingestion (parse JSON, convert Unix time) instead of at every query | `.alter table ... policy update` |
| Materialized view | Precomputes an aggregation, kept up to date as data arrives | `.create materialized-view` |

The caching period must be less than or equal to the retention period. A batching time that's too short increases cost and can even add latency on busy tables.

```kusto
// Keep only the latest reading per device, maintained at ingestion
.create async materialized-view with (backfill=true) LatestReading on table Telemetry
{
    Telemetry
    | summarize arg_max(Timestamp, *) by DeviceId
}
```

A materialized view ends with a single `summarize` (supported aggregations include `count`, `dcount`, `sum`, `avg`, `min`, `max`, `arg_max`, `arg_min`, `take_any`); query it with `materialized_view('LatestReading')`.

> **Exam tip.** "Queries on the last 7 days must be fast, data kept one year at the lowest cost": hot cache 7 days, retention 365 days.

<!-- section: spark | objectives: 3.3.5 -->
## Optimizing Spark performance

**Compute.**

| Option | Startup | Use |
| --- | --- | --- |
| Starter pool | 5 to 10 seconds; Medium nodes only | Default; fast interactive work |
| Custom pool | About 3 minutes (on demand) | Other node sizes, fixed or autoscaled node counts |
| Starter pool plus libraries | Add 30 seconds to 5 minutes | Prefer an environment with libraries published once |
| High concurrency mode | Reuses a running session | Several notebooks share one Spark session |

Node sizes: Small 4 vCores and 32 GB, Medium 8 and 64 GB, Large 16 and 128 GB, X-Large 32 and 256 GB, XX-Large 64 and 512 GB. Autoscale sets minimum and maximum nodes; **dynamic allocation** adds and releases executors as the job needs. A capacity gives 2 Spark VCores per capacity unit, with 3x burst: an F64 allows 384 VCores in total.

**Native execution engine.** A vectorized engine (Velox and Apache Gluten) runs supported Spark operators outside the JVM, with no code change, on Runtime 1.3 and 2.0. It accelerates Parquet, Delta and CSV; unsupported operations (JSON, XML, structured streaming) fall back to the regular engine automatically. Enable it in the environment (**Spark compute** > **Acceleration** > **Enable native execution engine**) or per session:

```json
%%configure
{
    "conf": {
        "spark.native.enabled": "true"
    }
}
```

It helps compute-intensive queries (joins, aggregations), not simple or I/O-bound ones.

**Code-level practices.**

- Keep adaptive query execution on (`spark.sql.adaptive.enabled`), which adjusts shuffle partitions and join strategies at run time.
- Broadcast a small dimension in a join to avoid shuffling the large table.
- Cache a DataFrame only when it's reused several times; `unpersist()` it afterwards.
- Read only the needed columns and filter early, so Delta file skipping works.
- Choose the resource profile that matches the workload (`writeHeavy` for ingestion, `readHeavyForSpark` for repeated reads).
- Install libraries in an environment instead of `%pip` in every run.

> **Exam trap.** A slow session start is a compute issue (custom pool, libraries, private network), not a code issue: a starter pool without extra libraries starts in seconds.

<!-- section: query-performance | objectives: 3.3.6 -->
## Optimizing query performance

**T-SQL on warehouses and SQL analytics endpoints.** Don't judge a query by its first run: a cold run loads data from OneLake and builds statistics. `data_scanned_remote_storage_mb` greater than zero in `queryinsights.exec_requests_history` shows a cold run. Find the costly queries with `long_running_queries` and `frequently_run_queries`, then reduce what they scan: select only the needed columns, filter on clustered or Z-ordered columns, aggregate before joining, and keep join types identical.

On a SQL analytics endpoint, performance depends on the lakehouse file layout: too many small files add overhead, a few huge files limit parallelism. Run `OPTIMIZE`, avoid over-partitioning, and keep the default adaptive target file size on Runtime 2.0. V-Order mainly benefits Direct Lake and isn't required for the SQL analytics endpoint.

**KQL.**

| Do | Rather than | Why |
| --- | --- | --- |
| Filter on the `datetime` column first | Filtering on strings first | The datetime index eliminates whole shards |
| `has` | `contains` | Token index instead of a substring scan |
| `==`, `in` | `=~`, `in~` | Case-sensitive comparisons are cheaper |
| Filter on table columns | `extend` a calculated column, then filter | Filters on stored columns use the index |
| Smaller table on the left of `join` | Large table on the left | Fewer rows to match |
| `lookup` when the right side is small | `join` | Optimized for a small dimension |
| `hint.shufflekey` | Default strategy on two large sides or high-cardinality `summarize` | Spreads the work across nodes |
| `materialize()` for a `let` used several times | Recomputing it | Computed once |
| Materialized view or update policy | Repeating the same aggregation or JSON parsing at query time | Work done once at ingestion |

```kusto
Telemetry
| where Timestamp > ago(1h)
| where DeviceType has "pump"
| lookup kind=leftouter Devices on DeviceId
| summarize avg(Temperature) by Site, bin(Timestamp, 5m)
```

**Direct Lake.** Reports stay fast when the Delta tables stay within the SKU guardrails (Parquet files, row groups and rows per table): compact the tables and apply V-Order to tables that feed Direct Lake models.

<!-- section: key-points -->
## Key points

- Lakehouse: `OPTIMIZE` (compaction to 1 GB, `ZORDER BY`, `VORDER`), `VACUUM` 7 days; V-Order is off by default in new workspaces (`writeHeavy` profile).
- Pipelines: ITO for compute and cost, degree of copy parallelism for source load, Physical partitions or Dynamic range for SQL sources, staging for warehouses.
- Warehouse: small types, `COPY INTO` with 100 MB to 1 GB files, no trickle inserts; compaction and statistics are automatic; `CLUSTER BY` (1 to 4 columns) only at creation.
- Eventstream: raise Event throughput for backlog. Eventhouse: caching for speed, retention for cost, batching for latency, update policies and materialized views to work once.
- Spark: starter pools start in seconds, native execution engine for compute-heavy jobs, high concurrency to share sessions, environments for libraries.
- KQL: datetime filter first, `has` over `contains`, small table left, `lookup` for small dimensions.
