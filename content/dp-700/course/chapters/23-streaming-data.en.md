Streaming questions ask which engine processes the events (eventstream, Spark structured streaming or KQL in an eventhouse), where the data lives (native eventhouse tables or OneLake shortcuts, accelerated or not), and how to write the transformation and the time window. Expect code to complete in KQL, PySpark or the eventstream SQL operator, and window-type questions where one word ("overlapping", "inactivity", "every event") decides the answer.

<!-- section: choose-engine | objectives: 2.3.1 -->
## Choosing a streaming engine

| | Eventstream | Spark structured streaming | KQL in an eventhouse |
| --- | --- | --- | --- |
| Authoring | No-code canvas, or SQL operator | PySpark or Scala code in a notebook or Spark job definition | KQL queries, update policies, materialized views |
| Role | Capture, light transformation and **routing** of events | Complex stream processing, libraries, joins with Delta tables | Store and analyze events, transform at ingestion, query fresh data |
| Sources | Event Hubs, IoT Hub, Service Bus, Kafka and Confluent Cloud, Amazon Kinesis, Google Pub/Sub, CDC from Azure SQL Database, SQL Server, PostgreSQL, MySQL and Cosmos DB, custom endpoint, Fabric and Azure events | Event Hubs, Kafka and other Spark connectors, Delta tables | Eventstreams, other ingestion methods |
| Output | Eventhouse, lakehouse, Activator, custom endpoint, derived stream | Delta tables | Eventhouse tables, dashboards, alerts |
| Latency | Seconds | Micro-batch (trigger interval) | Seconds from ingestion to query |

| Requirement | Engine |
| --- | --- |
| Route events from Event Hubs to an eventhouse and to Activator, no code | Eventstream |
| Filter and aggregate events before storage, SQL skills | Eventstream (no-code operators or SQL operator) |
| Parse events, call a Python library, merge into Delta tables | Spark structured streaming |
| Interactive analysis of logs and time series seconds after arrival | Eventhouse with KQL |
| Parse raw JSON into typed columns automatically as data lands in KQL | Update policy |

> **Exam trap.** An eventstream doesn't store data for analysis: it processes and routes. "Query the last 30 days of telemetry with sub-second latency" needs an eventhouse destination (or Spark writing Delta), not the eventstream alone.

<!-- section: native-or-shortcut | objectives: 2.3.2 -->
## Native tables or OneLake shortcuts in Real-Time Intelligence

An eventhouse can **ingest** data into native KQL tables, or **reference** data in OneLake or external storage through a shortcut (queried with `external_table()`).

| | Native table | OneLake shortcut (standard) |
| --- | --- | --- |
| Data | Ingested and stored in the eventhouse, indexed | Stays in the source (lakehouse, warehouse, KQL database, ADLS, S3, Google Cloud Storage) |
| Query | `TableName` | `external_table('ShortcutName')` |
| Performance | Fastest | Slower: network calls to storage, no indexes |
| Update policies, materialized views | Yes | No |
| Freshness | As soon as ingested | Whatever the source holds at query time |
| Duplication | A copy of the data | No copy |
| Limits | | One folder or table per shortcut, one shortcut created at a time, can't be renamed, no `*` in column names |

Delta types map to KQL types (`string` to `string`, `long` to `long`, `integer` to `int`, `decimal` to `decimal`, `date` and `timestamp_ntz` to `datetime`, `struct`, `array` and `map` to `dynamic`). Schema changes in the source are synchronized by default for a standard shortcut (an accelerated one needs an `.alter`, see below).

| Requirement | Choice |
| --- | --- |
| Streaming events queried constantly by dashboards | Native table |
| Join telemetry with a product table that lives in a lakehouse, rarely queried | Shortcut |
| Transform the data at ingestion with an update policy | Native table |
| Avoid storing a second copy of curated Delta tables | Shortcut |

> **Exam tip.** Events arriving continuously go into native tables; slowly changing reference data that already sits in OneLake is better reached through a shortcut than copied.

<!-- section: query-acceleration | objectives: 2.3.3 -->
## Query acceleration for OneLake shortcuts

**Query acceleration** applies a policy to the external Delta table behind a shortcut: the eventhouse indexes and caches the data as it lands in OneLake, for query performance comparable to ingested data.

- Turn it on when creating the shortcut (**Accelerate** to On) or later: **Manage > Data policies > Query acceleration**. It requires Admin, Member or Contributor in the workspace.
- The **caching period** (number of days, the policy's **Hot** property) counts from the file modification time in the Delta log; by default it's the database's caching period.
- Billing: accelerated data is charged on the **OneLake Premium cache** meter, like native tables, and indexing consumes capacity units.
- Limits: at most **900 columns**; Parquet files over **6 GB** compressed aren't cached; performance may suffer beyond 2.5 million data files; no index-based pruning for partitions. A schema change in the Delta table must be followed by an `.alter` of the external delta table schema, and a breaking change can restart acceleration from scratch. Accelerated shortcuts behave like external tables, without materialized views (and update policies over them are limited to a preview).
- Monitor progress:

```kusto
.show external table operations query_acceleration statistics
```

| Requirement | Choice |
| --- | --- |
| Occasional ad hoc queries on a large lakehouse table, lowest cost | Standard shortcut |
| Dashboards query the last 30 days of a Delta table every minute, no copy pipeline | Accelerated shortcut with a 30-day caching period |
| Data must be transformed by an update policy and kept as a materialized view | Native table (ingest it) |

> **Exam trap.** Query acceleration doesn't copy the data into a native table and isn't free: the cache is billed like eventhouse storage. If the requirement is "no additional storage cost", keep a standard shortcut.

<!-- section: eventstream | objectives: 2.3.4 -->
## Processing data by using Eventstream

An eventstream has a **default stream** fed by its sources; operators create processed streams, and a **derived stream** publishes a processed stream to the Real-Time hub so that other eventstreams and destinations reuse it.

| Operator | Does |
| --- | --- |
| Filter | Keeps events that meet a condition (temperature `> 80`, status = error) |
| Manage fields | Adds, removes, renames fields or changes their type; built-in string, date and time, and math functions |
| Aggregate | Sum, Minimum, Maximum or Average recalculated on each new event over a period |
| Group by | Aggregations over **time windows** (such as tumbling or sliding), grouped by columns |
| Union | Merges streams; only fields with the same name and type are kept |
| Join | Combines two streams on a matching condition |
| Expand | One row per value of an array |
| SQL | Custom logic in the Stream Analytics query language |

The **SQL operator** writes one or more `SELECT ... INTO output FROM input` statements (a `WITH` clause reads the input once for several outputs), uses **arrival time** unless `TIMESTAMP BY` sets event time, and has late-arrival and out-of-order thresholds in its advanced settings. It can't be combined with other operators in the same path, can't be chained, and needs new destination nodes. Eventstream names that contain `_` or `.` aren't compatible with the SQL operator.

```text
SELECT System.Timestamp() AS WindowEnd, roomId, AVG(temperature) AS AvgTemp
INTO HotRooms
FROM SensorInput TIMESTAMP BY eventTime
GROUP BY roomId, TumblingWindow(minute, 1)
HAVING AVG(temperature) > 75
```

Destinations: **Eventhouse** (Direct ingestion, or Event processing before ingestion), **Lakehouse**, **Activator**, **custom endpoint**, **derived stream**. Lakehouse, Eventhouse (event processing), derived stream and Activator accept processed data; any other destination receives it through a derived stream. Building or editing an eventstream requires Contributor or higher on the workspace; test operators with **Refresh** in Edit mode, then **Publish**.

> **Exam trap.** Union drops fields that don't match by name **and** type. Two streams with `temp` as `double` in one and `string` in the other lose that field: align types with Manage fields first.

<!-- section: spark-streaming | objectives: 2.3.5 -->
## Processing data by using Spark structured streaming

A structured streaming query reads an unbounded source as a table that keeps growing, and writes each micro-batch to a sink:

```text
from pyspark.sql import functions as F

raw = (spark.readStream
    .format("eventhubs")
    .options(**ehConf)
    .load())

events = (raw
    .withColumn("body", F.col("body").cast("string"))
    .select(F.from_json("body", schema).alias("e"))
    .select("e.*"))

(events.writeStream
    .format("delta")
    .option("checkpointLocation", "Files/checkpoints/events")
    .outputMode("append")
    .partitionBy("EventDate")
    .trigger(processingTime="1 minute")
    .toTable("bronze_events"))
```

| Element | Role |
| --- | --- |
| `readStream` / `writeStream` | Streaming read and write (versus `read` / `write` for batch) |
| `checkpointLocation` | Progress and state, so a restarted query resumes without loss or duplicates; one per query |
| `outputMode("append")` | Writes only new rows (`update` and `complete` for aggregations) |
| `trigger(processingTime=...)` | Micro-batch interval; larger batches give fewer, larger Delta files |
| `partitionBy()` | Folders by column; choose a column that yields well-sized files |
| Optimized write | `spark.databricks.delta.optimizeWrite.enabled` merges or splits partitions before writing, instead of `repartition()` |

In production, run the stream as a **Spark job definition** with a **retry policy** (restart count and interval, up to infinite) instead of an interactive notebook, and monitor input rate, process rate and batch duration in the **Structured Streaming** tab of the Monitoring hub. Event Hubs high-throughput scenarios commonly use 32 or more partitions.

> **Exam trap.** Without a `checkpointLocation`, a restarted query can't know which events it already wrote. Two queries must never share a checkpoint.

<!-- section: kql-processing | objectives: 2.3.6 -->
## Processing data by using KQL

KQL transforms at three moments: at **query** time, at **ingestion** time (update policy) and **continuously** in the background (materialized view).

An **update policy** runs a query on every batch ingested into a source table and writes the result into a target table:

```kusto
.create function ParseTelemetry() {
    RawTelemetry
    | extend d = parse_json(Payload)
    | project Timestamp = todatetime(d.ts), DeviceId = tostring(d.deviceId), Temp = todouble(d.temp)
}

.alter table Telemetry policy update
@'[{"IsEnabled": true, "Source": "RawTelemetry", "Query": "ParseTelemetry()", "IsTransactional": true}]'
```

- `IsTransactional` defaults to `false`: if the policy fails, the source keeps the data and the target misses it. `true` makes both fail together (recommended in production).
- The function's output must match the target schema (column types and order). Source and target are in the same database. The query can read tables of other databases only if the policy has a `ManagedIdentity` that has the `viewer` role on them; no cross-eventhouse query, external table (except an accelerated one), or plugin call.
- To keep only the transformed data, set the source's retention soft-delete period to `0s` with a transactional policy.
- Policies can cascade (A to B to C). Check failures with `.show ingestion failures`.

A **materialized view** keeps an aggregation up to date: deduplication (`take_any`), latest record per key (`arg_max`), or downsampling with `bin()`:

```kusto
.create materialized-view with (backfill=true) TelemetryHourly on table Telemetry
{
    Telemetry
    | summarize AvgTemp = avg(Temp), Readings = count() by DeviceId, bin(Timestamp, 1h)
}

materialized_view('TelemetryHourly')
| where Timestamp > ago(1d)
```

> **Exam trap.** An update policy transforms each new batch once, at ingestion; it doesn't recompute history. A materialized view aggregates continuously over the whole table (`backfill=true` includes existing data). "Latest status of each device" is a materialized view with `arg_max`, not an update policy.

<!-- section: windowing | objectives: 2.3.7 -->
## Creating windowing functions

| Window | Behaviour | Event in several windows | Stream Analytics (SQL operator) |
| --- | --- | --- | --- |
| Tumbling | Fixed size, contiguous, no overlap | No | `TumblingWindow(minute, 5)` |
| Hopping | Fixed size, moves forward by a hop smaller than the size | Yes | `HoppingWindow(minute, 10, 5)` (size 10, hop 5) |
| Sliding | Output only when an event enters or leaves the window | Yes | `SlidingWindow(minute, 10)` |
| Session | Grows while events keep arriving within a timeout, closes after inactivity or at a maximum duration | No | `SessionWindow(minute, 5, 60)` (timeout 5, maximum 60) |
| Snapshot | Groups events with the same timestamp | No | `GROUP BY System.Timestamp()` |

A tumbling window is a hopping window whose hop equals its size. Results are emitted at the **end** of the window, stamped with the window end time.

Spark structured streaming uses `window()` and `session_window()` with a **watermark** that tells Spark how long to wait for late events before closing a window and dropping its state:

```text
counts = (events
    .withWatermark("EventTime", "10 minutes")
    .groupBy(F.window("EventTime", "5 minutes"), "DeviceId")
    .agg(F.avg("Temp").alias("AvgTemp")))

hopping = events.groupBy(F.window("EventTime", "10 minutes", "5 minutes"), "DeviceId").count()
sessions = events.groupBy(F.session_window("EventTime", "15 minutes"), "UserId").count()
```

In KQL, `bin()` builds tumbling windows; `row_window_session()` assigns sessions on sorted rows; window functions such as `prev()` need serialized (ordered) input:

```kusto
Telemetry
| where Timestamp > ago(1h)
| summarize AvgTemp = avg(Temp) by DeviceId, bin(Timestamp, 5m)

Clicks
| order by UserId asc, Timestamp asc
| extend SessionStart = row_window_session(Timestamp, 1h, 15m, UserId != prev(UserId))
```

Batch SQL also has windowing functions over rows: `ROW_NUMBER()`, `LAG()`, and `SUM(...) OVER (PARTITION BY ... ORDER BY ... ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` for a running or moving total.

> **Exam trap.** "Overlapping windows every 5 minutes covering the last 10 minutes" is hopping, not sliding. "Group a user's clicks until 15 minutes of inactivity" is session. "Count per non-overlapping hour" is tumbling, which is `bin(Timestamp, 1h)` in KQL.

<!-- section: key-points -->
## Key points

- Eventstream routes and lightly transforms; Spark structured streaming handles code-heavy processing to Delta; the eventhouse stores and analyzes with KQL.
- Native tables: fastest, update policies and materialized views. Shortcuts: no copy, `external_table()`, slower.
- Query acceleration caches shortcut data for a number of days (Hot), billed like eventhouse storage; 900 columns maximum, no materialized views.
- Eventstream operators: Filter, Manage fields, Aggregate, Group by, Union, Join, Expand, SQL; derived streams carry processed data to other destinations.
- Spark streaming: checkpoint, append mode, trigger interval, Spark job definition with retry policy in production.
- Windows: tumbling (no overlap), hopping (overlap by hop), sliding (on each event change), session (inactivity timeout), snapshot (same timestamp); watermarks bound late data.
