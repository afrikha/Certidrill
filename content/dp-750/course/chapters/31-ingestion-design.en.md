Before writing any ingestion code, a data engineer decides how data is extracted from each source, which tool moves it, whether it loads in batches or as a stream, which format it lands in, and how the resulting table is physically laid out. Exam questions describe a source (an ERP database, a SaaS application, files dropped in ADLS, an event hub), constraints on freshness, cost and maintenance, and ask for the extraction type, the tool, the loading method, the format or the partitioning column.

<!-- section: ingestion-logic | objectives: 3.1.1 -->
## Ingestion logic, source configuration and file types

Four extraction types:

| Extraction type | What it reads | Prerequisites | Typical fit |
| --- | --- | --- | --- |
| Full | The whole dataset at each run | None | Small tables (around 100,000 rows or fewer), no change tracking at the source, simple rebuild acceptable |
| Incremental | Only rows new or changed since the last run | A reliable change indicator (timestamp, sequence number, version column) and stored state of the last position | Large tables, hourly or daily freshness |
| Streaming | Events continuously, as they arrive | The source publishes to a message bus or change feed; always-on compute | Freshness in seconds or minutes |
| CDC | Row-level inserts, updates **and deletes**, with the operation type | Transaction-log CDC, a change data feed or comparable snapshots; a sequencing column | Deletes must propagate, audit trail required |

> **Exam trap.** Incremental extraction on a `last_modified` column never sees rows deleted at the source. If deletes must reach the lakehouse, the answer is CDC (or a periodic full comparison of snapshots).

Source configuration by source family:

- **Cloud object storage** (ADLS): govern paths with Unity Catalog **external locations** (a storage credential, typically an Azure managed identity through an access connector, plus a path), or land files in a **volume**. Organize folders for incremental processing: one folder per source and entity (`/landing/erp/orders/`), Hive-style partition folders (`year=2026/month=11/`), whose values Spark reads as columns without opening the files.
- **Databases**: network path to the server, credentials in **secrets** (`dbutils.secrets.get`) or in a Unity Catalog **connection**, never in the notebook; push filters down to limit the load on the source.
- **Message buses**: broker endpoint, authentication, consumer group, offset management.
- **SaaS APIs**: rate limits, pagination, OAuth or API keys.

File types:

| Format | Nature | Strengths | Weaknesses |
| --- | --- | --- | --- |
| CSV | Text, row-based | Universal, human-readable | No types, header and delimiter issues, slow to parse, no compression benefit |
| JSON | Text, semi-structured | Nested data, API payloads | Same parsing cost as CSV, schema varies between records |
| XML | Text, hierarchical | Legacy exchanges | Needs `rowTag` to map elements to rows |
| Parquet, ORC | Columnar binary | Compression, column pruning, embedded schema | Not human-readable |
| Avro | Row-based binary with schema | Streaming with schema evolution and a schema registry | Less efficient for analytics |

When you control the export, ask upstream systems for a columnar format; accept CSV or JSON only when the source can't produce anything else or volumes are small.

<!-- section: ingestion-tools | objectives: 3.1.2 -->
## Choosing an ingestion tool

The guidance from Microsoft Learn: start with the **most managed** option that meets the requirements, and move to a more customizable one only when a requirement can't be met.

| Source and requirement | Tool |
| --- | --- |
| SaaS application with a managed connector (Salesforce, ServiceNow, Workday, SharePoint, Dynamics 365...) | Lakeflow Connect SaaS connector |
| SQL Server, MySQL or PostgreSQL, continuous change capture including deletes | Lakeflow Connect database connector (CDC, with an ingestion gateway and staging storage) |
| Supported database, no CDC possible, reliable cursor column | Lakeflow Connect query-based connector (no gateway, more load on the source) |
| Database without a managed connector, custom extraction logic | Notebook with a JDBC read |
| Files arriving continuously in cloud storage | Auto Loader (in Lakeflow Spark Declarative Pipelines or Structured Streaming) |
| One-time or simple scheduled batch load of files, SQL-first team | `COPY INTO` |
| Kafka or Event Hubs streams | Standard connector in a pipeline, or Structured Streaming for full control (the Lakeflow Connect managed Kafka connector is in Beta) |
| On-premises source not reachable from Databricks, or company standard on ADF, orchestration across Azure services | Azure Data Factory (self-hosted integration runtime) lands the data in ADLS, then Databricks transforms it |

Lakeflow Connect managed connectors run on **serverless** compute, store credentials in a Unity Catalog **connection** (no secret in the pipeline), write to **streaming tables**, ingest incrementally after the first full load, and retry automatically. Each schedule creates a Lakeflow job. For database connectors, the ingestion gateway runs continuously in its own job. The SQL Server connector also offers **integrated CDC**: a single pipeline that references a Unity Catalog connection and embeds extraction in each update, with the staging volume set through `data_staging_options`.

**Notebooks** give the most control (any JDBC source, custom parsing, complex logic) at the cost of code to write, test and maintain.

**Azure Data Factory** moves data; keep transformation logic in Azure Databricks rather than in ADF data flows. ADF can also orchestrate Databricks notebooks or jobs as activities.

> **Exam trap.** "Minimize development and maintenance effort" for a supported SaaS source points to a Lakeflow Connect managed connector, not to a notebook calling the API, and not to ADF.

<!-- section: loading-method | objectives: 3.1.3 -->
## Batch or streaming loading

| Method | How it runs | Choose when |
| --- | --- | --- |
| Batch | Reads a bounded dataset on a schedule (`spark.read`, CTAS, `COPY INTO`) | Daily or hourly freshness, full reloads, small sources |
| Incremental batch | Streaming code that processes everything new, then stops: `trigger(availableNow=True)`, or a triggered pipeline | Hourly or daily freshness with exactly-once, incremental processing and no always-on cost |
| Streaming | Always-on query processing micro-batches as data arrives (default trigger, about 3-5 seconds of latency, or `processingTime`), or a continuous pipeline | Seconds-to-minutes latency (fraud, IoT alerts) |

In Lakeflow Spark Declarative Pipelines, the same code runs in **triggered** mode (process available data, then stop: batch-like schedules) or **continuous** mode (keep running). Changing mode doesn't change the code.

A streaming source (Auto Loader, Kafka, a Delta table read with `readStream`) remembers what it processed in a **checkpoint**, so each record is processed once even across restarts. A batch job that reruns has to compute what is new itself, or use an idempotent command such as `COPY INTO`.

> **Exam tip.** "Data needed every morning, lowest cost, new files only" is answered by incremental batch: Auto Loader with `availableNow` (or a triggered pipeline) scheduled by a job. Continuous streaming meets the latency but pays for compute all day.

<!-- section: table-formats | objectives: 3.1.4 -->
## Choosing a table format

A **file format** (Parquet, CSV, JSON) defines how bytes are stored. A **table format** (Delta Lake, Apache Iceberg) adds a metadata layer over Parquet files: transactions, schema enforcement, history.

| Requirement | Format |
| --- | --- |
| Default for any table in Azure Databricks; ACID, time travel, `MERGE`, change data feed, streaming source and sink | Delta Lake |
| Tables read and written by other engines through an Iceberg catalog (Spark, Flink, Trino, Snowflake) | Managed Apache Iceberg table in Unity Catalog |
| Iceberg tables owned by another catalog (AWS Glue, Snowflake Horizon Catalog) | Foreign Iceberg table (read-only, through Lakehouse Federation) |
| Raw landing files, exchange with systems that only produce text | CSV or JSON, then convert to Delta |
| Analytical files outside a table format | Parquet |

Delta Lake is the default: `CREATE TABLE` without `USING` creates a Delta table. Unity Catalog **managed** tables are Delta or Iceberg only; CSV, JSON, Parquet, Avro, ORC and text are supported only as **external** tables.

```text
CREATE TABLE sales.gold.orders_ice (order_id BIGINT, amount DECIMAL(12,2))
USING ICEBERG;
```

Managed Iceberg tables need Databricks Runtime 16.4 LTS or above, serverless compute enabled and predictive optimization enabled. External engines reach them through the Iceberg REST Catalog API with credential vending. Liquid clustering and predictive optimization apply to both Delta and managed Iceberg tables.

> **Exam trap.** Change data feed relies on the Delta transaction log: legacy change data feed doesn't support Iceberg tables. A requirement to consume row-level changes downstream points to Delta.

<!-- section: partitioning | objectives: 3.1.5 -->
## Designing a partitioning scheme

Partitioning splits a table into directories by the values of a column; queries filtering on that column read only matching partitions (**partition pruning**). The rules from Microsoft Learn:

| Rule | Value |
| --- | --- |
| Don't partition tables smaller than | 1 TB |
| Minimum data per partition | 1 GB |
| Partition column cardinality | Low (date, region, category, status), never an ID or a timestamp to the second |
| Partition column choice | The column most queries filter on |
| Number of schemes per table | One |

Below 1 TB, unpartitioned Delta tables already benefit from **ingestion time clustering**, and liquid clustering is the recommended layout for new tables. Partitioning and liquid clustering can't be combined on the same table. From Databricks Runtime 18.1, `ALTER TABLE ... REPLACE PARTITIONED BY WITH CLUSTER BY (...)` converts a partitioned Delta table to liquid clustering in place; then run `OPTIMIZE ... FULL`.

```text
CREATE TABLE sales.silver.transactions (
  transaction_id STRING,
  amount DECIMAL(12,2),
  transaction_ts TIMESTAMP,
  transaction_date DATE GENERATED ALWAYS AS (CAST(transaction_ts AS DATE))
)
PARTITIONED BY (transaction_date);
```

```text
(df.write.format("delta")
   .mode("append")
   .partitionBy("transaction_date")
   .saveAsTable("sales.silver.transactions"))
```

A **generated column** derives the partition value from a timestamp; a query that filters on `transaction_ts` still gets partition pruning, because Delta generates the partition filter.

Over-partitioning (too many small partitions) produces small files and slow queries: choose a coarser granularity (month instead of day). Changing the partition column means rewriting the whole table.

> **Exam trap.** Partitioning a 200 GB table by `customer_id` is wrong twice: the table is under 1 TB and the column has high cardinality. Use liquid clustering on `customer_id` instead.

<!-- section: key-points -->
## Key points

- Full for small tables, incremental with a change column, streaming for seconds of latency, CDC when deletes and operation types matter.
- Credentials go in secrets or Unity Catalog connections; storage access goes through external locations or volumes.
- Most managed first: Lakeflow Connect for supported SaaS and databases, Auto Loader for files, `COPY INTO` for simple SQL batch loads, notebooks for unsupported sources, ADF for landing and cross-service orchestration.
- `availableNow` = streaming semantics at batch cost; continuous = lowest latency, always-on cost.
- Delta by default; managed Iceberg for multi-engine access; CSV and JSON only for landing.
- Partition only above 1 TB, at least 1 GB per partition, on a low-cardinality filter column; otherwise liquid clustering.
