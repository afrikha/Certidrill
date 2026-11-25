This chapter turns the ingestion design into code: Lakeflow Connect pipelines for managed sources, notebooks with DataFrames, SQL commands (CTAS, `CREATE OR REPLACE TABLE`, `COPY INTO`), CDC feeds applied with AUTO CDC, Spark Structured Streaming, Azure Event Hubs through its Kafka endpoint, and Lakeflow Spark Declarative Pipelines with Auto Loader. Exam questions show a partial notebook, SQL statement or bundle file and ask for the missing option, or describe a requirement and ask which command fits.

<!-- section: lakeflow-connect | objectives: 3.2.1 -->
## Ingesting with Lakeflow Connect

A Lakeflow Connect ingestion pipeline has three parts:

| Component | Role |
| --- | --- |
| Connection | Unity Catalog securable holding the endpoint and credentials; created once, reused by pipelines (`CREATE CONNECTION` on the metastore to create one, `USE CONNECTION` to use it) |
| Ingestion definition | Source objects (tables, reports) and their destination catalog and schema |
| Schedule | How often the pipeline runs; each schedule creates a Lakeflow job |

For **database connectors** (SQL Server, MySQL, PostgreSQL), creating the pipeline also creates an **ingestion gateway** that extracts changes continuously and writes them to staging storage; the ingestion pipeline then applies them on its schedule. **SaaS connectors** (Salesforce, Workday, ServiceNow...) and **query-based connectors** call the source directly, without a gateway. Pipelines run on serverless compute and write **streaming tables**.

In the UI: **Data Ingestion**, pick the source, create or select the connection (and, for a database, the gateway), choose the objects, then the destination catalog and schema. Pipelines can also be defined in Databricks Asset Bundles (now named Declarative Automation Bundles on Learn), notebooks or the CLI:

```yaml
resources:
  pipelines:
    orders_ingest:
      name: erp-orders-ingest
      catalog: sales
      schema: bronze
      ingestion_definition:
        ingestion_gateway_id: ${resources.pipelines.erp_gateway.id}
        objects:
          - table:
              source_schema: dbo
              source_table: orders
              destination_catalog: sales
              destination_schema: bronze
              table_configuration:
                scd_type: SCD_TYPE_2
                include_columns:
                  - order_id
                  - customer_id
                  - total_amount
```

| Behavior | Detail |
| --- | --- |
| First run | Full snapshot of the selected objects, then change tracking |
| Later runs | Incremental: only changed rows (CDC or change tracking for SQL Server, a cursor column for query-based and some SaaS connectors) |
| `scd_type` | `SCD_TYPE_1` (overwrite, current state) or `SCD_TYPE_2` (history with `__START_AT` and `__END_AT`) |
| `include_columns` / `exclude_columns` | With `include_columns`, new source columns don't appear; with `exclude_columns`, they do |
| Full refresh | Reloads a table from scratch (after an unrecoverable schema change); for database connectors, existing data stays queryable until the new snapshot completes, a full refresh window (`start_hour`, `days_of_week`, `time_zone_id`) can confine it to off-peak hours, and an auto full refresh policy (off by default; `min_interval_hours` 24 by default) triggers it after a truncate, an incompatible schema change, a column rename or a column added with a default |
| Failures | Automatic retries with exponential backoff; resumes from the last cursor |

Batch or streaming: each scheduled run of the ingestion pipeline loads the changes since the previous run (incremental batches). For databases, the gateway captures changes continuously, so a frequent schedule gives near real-time tables. Streaming connectors (message buses such as RabbitMQ) ingest event streams into streaming tables.

> **Exam trap.** A database connector needs the gateway and staging storage; a SaaS connector doesn't. "The pipeline captures no changes from SQL Server" can mean the gateway isn't running, or CDC or change tracking isn't enabled at the source.

<!-- section: notebooks | objectives: 3.2.2 -->
## Ingesting with notebooks, batch and streaming

Batch ingestion reads a bounded dataset with `spark.read` and writes a Unity Catalog table:

```text
df = (spark.read.format("csv")
        .option("header", "true")
        .option("inferSchema", "true")
        .load("/Volumes/sales/landing/raw/orders/"))

df.write.mode("append").saveAsTable("sales.bronze.orders")

jdbc_df = (spark.read.format("jdbc")
        .option("url", "jdbc:sqlserver://erp.contoso.com:1433;database=erp")
        .option("dbtable", "(SELECT * FROM dbo.customers WHERE active = 1) AS c")
        .option("user", dbutils.secrets.get(scope="erp", key="user"))
        .option("password", dbutils.secrets.get(scope="erp", key="password"))
        .load())
```

| Write mode | Effect |
| --- | --- |
| `error` (default) | Fails if the table exists |
| `append` | Adds rows |
| `overwrite` | Replaces the content |
| `ignore` | Does nothing if the table exists |

XML needs `option("rowTag", ...)`; a subquery in `dbtable` pushes the filter down to the database; credentials come from a secret scope.

Streaming ingestion uses `spark.readStream` and `writeStream` with a checkpoint:

```text
schema = "order_id BIGINT, customer_id STRING, amount DOUBLE, order_ts TIMESTAMP"

(spark.readStream.format("json")
   .schema(schema)
   .load("/Volumes/sales/landing/raw/orders_stream/")
   .writeStream
   .option("checkpointLocation", "/Volumes/sales/landing/chk/orders")
   .trigger(availableNow=True)
   .toTable("sales.bronze.orders"))
```

> **Exam trap.** A plain file streaming source (`format("json")` with `readStream`) needs an explicit schema: schema inference isn't supported. Auto Loader (`format("cloudFiles")`) infers and stores the schema itself.

<!-- section: sql-methods | objectives: 3.2.3 -->
## Ingesting with SQL: CTAS, CREATE OR REPLACE TABLE, COPY INTO

```text
CREATE TABLE sales.bronze.products AS
SELECT * FROM read_files('/Volumes/sales/landing/raw/products/', format => 'csv', header => true);

CREATE OR REPLACE TABLE sales.silver.daily_revenue AS
SELECT order_date, SUM(amount) AS revenue FROM sales.silver.orders GROUP BY order_date;

CREATE TABLE IF NOT EXISTS sales.bronze.events (event_id STRING, event_ts TIMESTAMP, payload STRING);

COPY INTO sales.bronze.events
FROM '/Volumes/sales/landing/raw/events/'
FILEFORMAT = JSON
PATTERN = 'events_2026*.json'
FORMAT_OPTIONS ('multiLine' = 'true')
COPY_OPTIONS ('mergeSchema' = 'true');
```

| Method | Behavior | Use for |
| --- | --- | --- |
| CTAS | Creates the table from a query, schema from the result; fails if the table exists | Initial loads, one-time migrations |
| `CREATE OR REPLACE TABLE ... AS` | Replaces content and schema; keeps the table history, grants, row filters and column masks | Periodic full refresh of a table that users query |
| `COPY INTO` | Appends files to an **existing** table; idempotent (already loaded files are skipped on rerun) | Repeated batch loads of new files, thousands of files |
| Streaming table with `read_files` | Auto Loader in SQL | Millions of files, schema evolution, recommended for incremental SQL ingestion |

`COPY INTO` options: `FILEFORMAT` (`CSV`, `JSON`, `PARQUET`, `AVRO`, `ORC`, `TEXT`, `BINARYFILE`), `FORMAT_OPTIONS` (for example `'header' = 'true'`, `'inferSchema' = 'true'`), `COPY_OPTIONS ('mergeSchema' = 'true')` to add new columns, `PATTERN` or `FILES = (...)` to select files, `VALIDATE ALL` to check parsing and constraints without loading.

> **Exam trap.** `DROP TABLE` followed by `CREATE TABLE ... AS` loses the history and the grants; `CREATE OR REPLACE TABLE` keeps them, so consumers keep their access.

<!-- section: cdc-feed | objectives: 3.2.4 -->
## Ingesting a change data capture feed

A CDC record carries the data columns, an **operation** (insert, update, delete) and a **sequence** (timestamp or number) that orders the changes. AUTO CDC applies such a feed to a streaming table, deduplicates, ignores late records older than what is already applied, and handles deletes:

```text
from pyspark import pipelines as dp
from pyspark.sql.functions import col, expr

@dp.temporary_view
def customer_changes():
    return spark.readStream.table("sales.bronze.customer_cdc")

dp.create_streaming_table("customers")

dp.create_auto_cdc_flow(
    target="customers",
    source="customer_changes",
    keys=["customer_id"],
    sequence_by=col("change_seq"),
    apply_as_deletes=expr("operation = 'DELETE'"),
    except_column_list=["operation", "change_seq"],
    stored_as_scd_type=1
)
```

| Parameter (Python / SQL) | Purpose |
| --- | --- |
| `keys` / `KEYS` | Columns that identify a row |
| `sequence_by` / `SEQUENCE BY` | Ordering column; must be sortable and not null |
| `apply_as_deletes` / `APPLY AS DELETE WHEN` | Condition that marks a delete |
| `except_column_list` / `COLUMNS * EXCEPT` | Columns not written to the target |
| `stored_as_scd_type` / `STORED AS SCD TYPE` | 1 = current state, 2 = history |
| `ignore_null_updates` / `IGNORE NULL UPDATES` | Partial updates: null values keep the existing column value |

When the source provides **full snapshots** instead of change records, use AUTO CDC FROM SNAPSHOT (`create_auto_cdc_from_snapshot_flow`), which derives the changes by comparing successive snapshots.

When the source is a Delta table, enable its change data feed (`delta.enableChangeDataFeed = true`) and read the changes with `readChangeFeed`; the first streaming read returns the current snapshot as inserts, then the changes:

```text
changes = (spark.readStream
    .option("readChangeFeed", "true")
    .table("sales.silver.orders"))
```

Without a pipeline, the same feed is applied with `MERGE INTO` in a `foreachBatch` function, but you must deduplicate and order the changes yourself.

> **Exam trap.** Ordering by arrival time is wrong: with out-of-order events, only `SEQUENCE BY` on the source sequence column guarantees the correct final state.

<!-- section: structured-streaming | objectives: 3.2.5 -->
## Ingesting with Spark Structured Streaming

A stream is an unbounded table: `spark.readStream` defines the source, transformations are the usual DataFrame API, `writeStream` writes to a sink with a checkpoint.

| Trigger | Behavior |
| --- | --- |
| None (default) | Next micro-batch as soon as the previous one finishes |
| `processingTime="1 minute"` | Micro-batch at a fixed interval |
| `availableNow=True` | Processes everything available in several batches, then stops |
| `once=True` | One micro-batch, then stops (deprecated: use `availableNow`) |

| Output mode | Writes |
| --- | --- |
| `append` | New rows only; default for ingestion |
| `update` | Changed rows (aggregations) |
| `complete` | The whole result each time (aggregations) |

```text
raw = (spark.readStream.format("kafka")
         .option("kafka.bootstrap.servers", "broker1.contoso.com:9092")
         .option("subscribe", "telemetry")
         .option("startingOffsets", "earliest")
         .load())

query = (raw.selectExpr("CAST(key AS STRING) AS device", "CAST(value AS STRING) AS body", "timestamp")
           .writeStream
           .option("checkpointLocation", "/Volumes/iot/raw/chk/telemetry")
           .trigger(processingTime="30 seconds")
           .toTable("iot.bronze.telemetry"))
```

The Kafka source returns `key`, `value` (binary), `topic`, `partition`, `offset` and `timestamp`. `startingOffsets` (`earliest` or `latest`) applies only on the first run: afterwards the checkpoint decides where the stream resumes. Monitor queries in the Spark UI **Structured Streaming** tab, or with `query.status` and `query.recentProgress`.

> **Exam trap.** Each streaming query needs its own checkpoint location. Two queries sharing one checkpoint, or a checkpoint deleted by a storage lifecycle policy, corrupt the stream state.

<!-- section: event-hubs | objectives: 3.2.6 -->
## Ingesting streaming data from Azure Event Hubs

Event Hubs exposes an Apache Kafka endpoint in the **Standard, Premium and Dedicated** tiers (not Basic), so the Kafka connector built into Databricks Runtime reads it:

| Kafka | Event Hubs |
| --- | --- |
| Cluster | Namespace |
| Topic | Event hub |
| Consumer group | Consumer group |
| Partition, offset | Partition, offset |

```text
from pyspark.sql.functions import col, from_json

conn = dbutils.secrets.get(scope="eventhubs", key="orders-connection-string")

events = (spark.readStream.format("kafka")
    .option("kafka.bootstrap.servers", "contoso-ns.servicebus.windows.net:9093")
    .option("subscribe", "orders")
    .option("kafka.security.protocol", "SASL_SSL")
    .option("kafka.sasl.mechanism", "PLAIN")
    .option("kafka.sasl.jaas.config",
            'kafkashaded.org.apache.kafka.common.security.plain.PlainLoginModule required '
            f'username="$ConnectionString" password="{conn}";')
    .load())

orders = (events.select(from_json(col("value").cast("string"),
                                  "order_id BIGINT, amount DOUBLE, ts TIMESTAMP").alias("o"))
                .select("o.*"))
```

| Setting | Value |
| --- | --- |
| Bootstrap server | `<namespace>.servicebus.windows.net:9093` |
| `kafka.security.protocol` | `SASL_SSL` |
| `kafka.sasl.mechanism` | `PLAIN` with a connection string (username `$ConnectionString`), or `OAUTHBEARER` with Microsoft Entra ID |
| `subscribe` | The event hub name |
| JAAS class prefix on Databricks | `kafkashaded.` |

Store the connection string in a secret scope. Event Hubs recommends Microsoft Entra ID (OAuth) over shared access keys, because it allows Azure RBAC. On Databricks Runtime 16.1 and above, Databricks recommends a Unity Catalog **service credential** when Kafka streaming runs on standard access mode or serverless compute: set `databricks.serviceCredential` to its name and don't set `kafka.security.protocol` or the `kafka.sasl.*` options; the access connector behind the credential needs permissions on Event Hubs. Entra ID with a client ID and secret (`OAUTHBEARER`) isn't supported in Lakeflow pipelines configured with Unity Catalog. In a Lakeflow pipeline, the Kafka options go in a `@dp.table` function, with non-secret values such as the namespace passed as pipeline parameters.

> **Exam trap.** Port 9093, not 9092: the Event Hubs Kafka endpoint accepts only `SASL_SSL` on port 9093. A Basic tier namespace has no Kafka endpoint at all.

<!-- section: declarative-pipelines | objectives: 3.2.7 -->
## Ingesting with Lakeflow Spark Declarative Pipelines and Auto Loader

A **streaming table** processes each source row exactly once: the right target for append-only ingestion. `STREAM read_files(...)` in SQL, or `format("cloudFiles")` in Python, is **Auto Loader**; inside a pipeline, checkpoints and schema locations are managed for you.

```text
CREATE OR REFRESH STREAMING TABLE orders_bronze
AS SELECT *, _metadata.file_path AS source_file
FROM STREAM read_files(
  '/Volumes/sales/landing/raw/orders/',
  format => 'json',
  schemaHints => 'order_id BIGINT, amount DECIMAL(10,2)'
);
```

```text
from pyspark import pipelines as dp

@dp.table(comment="Raw orders loaded by Auto Loader")
def orders_bronze():
    return (spark.readStream.format("cloudFiles")
              .option("cloudFiles.format", "json")
              .option("cloudFiles.inferColumnTypes", "true")
              .option("cloudFiles.schemaEvolutionMode", "addNewColumns")
              .load("/Volumes/sales/landing/raw/orders/"))
```

Outside a pipeline, Auto Loader also needs `cloudFiles.schemaLocation` (where the inferred schema is tracked) and a `checkpointLocation`.

| Option | Role |
| --- | --- |
| `cloudFiles.format` | `json`, `csv`, `parquet`, `avro`, `orc`, `xml`, `text`, `binaryFile` |
| `cloudFiles.schemaLocation` | Stores the inferred schema and its evolution |
| `cloudFiles.inferColumnTypes` | Infer real types; by default JSON and CSV columns are inferred as strings |
| `cloudFiles.schemaHints` | Force the type of known columns |
| `cloudFiles.schemaEvolutionMode` | What happens when new columns appear (next table) |
| `cloudFiles.maxFilesPerTrigger`, `cloudFiles.maxBytesPerTrigger` | Limit the size of each micro-batch |

| Schema evolution mode | Behavior |
| --- | --- |
| `addNewColumns` (default without a schema) | The stream fails, the new columns are added to the schema, and the next run continues with them |
| `rescue` | Schema never changes, stream doesn't fail; unexpected data goes to `_rescued_data` |
| `failOnNewColumns` | Stream fails until the schema is updated or the file removed |
| `none` (default with a schema) | New columns ignored |

`addNewColumns` can't be combined with a provided schema (`.schema(...)`); give known types as schema hints instead, which Auto Loader applies only when no schema is provided.

File discovery: **directory listing** (default, no setup) or **file notification**; Databricks recommends file notification with **file events** enabled on the Unity Catalog external location for production, to cut latency and listing costs. `cloud_files_state('<checkpoint>')` shows discovered files.

Several sources can feed one streaming table through **flows** (`CREATE FLOW ... AS INSERT INTO ... BY NAME`, or `@dp.append_flow(target=...)` in Python). Kafka and Event Hubs are read with `read_kafka(...)` in SQL or the Kafka options in Python.

> **Exam trap.** A flow's name identifies its checkpoint: renaming a flow makes it start again from the beginning of the source, as a new flow.

<!-- section: key-points -->
## Key points

- Lakeflow Connect = connection + ingestion definition + schedule; database connectors add a gateway; output is streaming tables on serverless.
- Notebooks: `spark.read` plus a write mode for batch; `readStream`, a checkpoint and a trigger for streaming; credentials from secrets.
- CTAS creates, `CREATE OR REPLACE` replaces but keeps grants and history, `COPY INTO` appends new files idempotently to an existing table.
- AUTO CDC needs keys, `SEQUENCE BY` and a delete condition; SCD type 1 or 2; snapshots use AUTO CDC FROM SNAPSHOT.
- Structured Streaming: one checkpoint per query, `availableNow` for scheduled incremental runs, `append` for ingestion.
- Event Hubs: Kafka endpoint on port 9093, `SASL_SSL`, `$ConnectionString`, Standard tier or above; a Unity Catalog service credential (`databricks.serviceCredential`, DBR 16.1+) on standard access mode or serverless.
- Auto Loader: `cloudFiles` or `STREAM read_files`, schema location, `addNewColumns` by default, `_rescued_data` in rescue mode, file events for production.
