Batch ingestion and transformation is the core of the exam: pick the store, decide whether to reference, replicate or copy the data, then write the PySpark, T-SQL or KQL that cleans, joins, aggregates and deduplicates it. Questions combine a skill set ("the team knows T-SQL"), a constraint ("without copying the data", "minimize development effort") and a data problem (duplicates, nulls, rows that arrive late).

<!-- section: choose-store | objectives: 2.2.1 -->
## Choosing a data store

| Criterion | Lakehouse | Warehouse | Eventhouse |
| --- | --- | --- | --- |
| Data | Files of any format plus Delta tables | Structured tables, star schemas | Events, logs, telemetry, time series, JSON |
| Write with | Spark, Dataflow Gen2, pipelines, eventstreams | T-SQL (`INSERT`, `UPDATE`, `DELETE`, `MERGE`, `COPY INTO`, CTAS), pipelines, Dataflow Gen2 | Eventstreams, KQL ingestion, update policies |
| Read with | Spark; T-SQL **read-only** through the SQL analytics endpoint | T-SQL | KQL (and T-SQL) |
| Transactions | Per Delta table | Multi-table T-SQL transactions | Append-optimized ingestion |
| Typical team | Data engineers, PySpark | SQL developers | Real-time analysts |

All three keep their data in OneLake (the eventhouse through OneLake availability), so a lakehouse can read a warehouse table through a shortcut and T-SQL can join items with three-part names (`Warehouse.schema.table`).

| Requirement | Store |
| --- | --- |
| Raw JSON and images plus curated Delta tables, PySpark team | Lakehouse |
| SQL team must update and delete rows, multi-table transactions | Warehouse |
| Billions of telemetry rows, queries on data seconds old | Eventhouse |
| Medallion architecture: bronze and silver in Spark, gold served to SQL analysts | Lakehouses for bronze and silver, warehouse (or lakehouse) for gold |

> **Exam trap.** The SQL analytics endpoint of a lakehouse is read-only: views and functions yes, `UPDATE` no. If T-SQL must change rows, the answer is a warehouse.

<!-- section: choose-transform | objectives: 2.2.2 -->
## Choosing between Dataflow Gen2, notebooks, KQL and T-SQL

| Tool | Language | Best for | Writes to |
| --- | --- | --- | --- |
| Dataflow Gen2 | Power Query (M), visual | No-code cleaning, 150+ connectors, business users | Lakehouse, warehouse, Azure SQL Database and others |
| Notebook | PySpark, Spark SQL, Scala, R | Large volumes, complex logic, semi-structured data, libraries, Delta `MERGE` | Lakehouse Delta tables (and files) |
| T-SQL | SQL in a warehouse | Set-based transforms by SQL developers, stored procedures called by pipelines | Warehouse tables |
| KQL | Kusto Query Language | Time series, logs, parsing at ingestion (update policies), near real-time aggregates | Eventhouse tables |

> **Exam tip.** Match the tool to the store and the skill: data in a warehouse and a SQL team means T-SQL stored procedures; data in an eventhouse means KQL; Delta tables in a lakehouse and Python skills mean a notebook; "analysts, no code" means Dataflow Gen2.

<!-- section: shortcuts | objectives: 2.2.3 -->
## Creating and managing OneLake shortcuts

A shortcut is a pointer: the data stays at the target and is read in place, without copy or schedule.

- Create it in a **lakehouse** (Tables or Files) or a **KQL database**: **New shortcut**, pick the source, then the folder or table.
- Internal targets: lakehouses, warehouses, KQL databases, mirrored databases and other Fabric items. External targets: ADLS Gen2, Azure Blob Storage, Amazon S3 and S3-compatible, Google Cloud Storage, Dataverse, and on-premises sources through a gateway.
- In **Tables**, a shortcut must sit at the **top level** and point to **Delta** data to be recognized as a table. In **Files**, any folder and format.
- **Authentication**: an internal shortcut uses the **identity of the caller** (who needs access to the target); an external shortcut uses the credentials of its **cloud connection**.
- **Deleting a shortcut** never deletes the target. **Deleting a file or folder through the shortcut** deletes it at the target.
- Caching of S3, S3-compatible, Google Cloud Storage and on-premises shortcuts reduces egress cost: retention 1 to 28 days, files over 1 GB aren't cached.

In a KQL database, a shortcut is queried as an external table, one folder or table per shortcut, and it can't be renamed:

```kusto
external_table('SalesOrders')
| where OrderDate > ago(7d)
| summarize Revenue = sum(Amount) by Region
```

| Requirement | Answer |
| --- | --- |
| Use Delta tables of another workspace's lakehouse, no copy | Shortcut in Tables |
| Analyze Parquet files in an S3 bucket without moving them | Shortcut to Amazon S3 (with caching to reduce egress) |
| Users must not read the target directly | Internal shortcut checks the caller: they need permission on the target |
| A copy that survives deletion of the source | Not a shortcut: copy the data |

> **Exam trap.** A shortcut placed in a subfolder of Tables, or pointing to CSV files, doesn't appear as a table. Put CSV shortcuts in Files and load them into Delta with a notebook or pipeline.

<!-- section: mirroring | objectives: 2.2.4 -->
## Implementing mirroring

Mirroring replicates an external database into OneLake as Delta tables and keeps it in sync, without ETL to build.

| Type | What happens | Examples |
| --- | --- | --- |
| Database mirroring | Tables and changes replicated, changes published as often as every 15 seconds | Azure SQL Database, Azure SQL Managed Instance, SQL Server, Azure Cosmos DB, Azure Database for PostgreSQL, Snowflake, Oracle, Google BigQuery, SAP |
| Metadata mirroring | Only the catalog is synchronized; data is read in place through shortcuts | Azure Databricks Unity Catalog |
| Open mirroring | Your application writes change files into a landing zone through public APIs | Any source |

- Creating a mirror produces a **mirrored database** item with a **SQL analytics endpoint**; query it with T-SQL (three-part names across warehouses and lakehouses), Spark, Power BI Direct Lake or shortcuts.
- **Cost**: replication compute is free; storage is free up to **1 TB per capacity unit** (64 TB on an F64). Queries are billed normally. A paused capacity stops replication (status **Paused**).
- **Monitor replication** shows the database status (Running, Running with warning, Stopping/Stopped, Failed, Paused) and, per table, the status, **rows replicated** and **last completed** time. Workspace monitoring adds logs in the `MirroredDatabaseTableExecution` table.
- Fabric SQL database is mirrored automatically.

| Requirement | Method |
| --- | --- |
| Near real-time copy of an Azure SQL database for analytics, no pipeline | Mirroring |
| Read Databricks Unity Catalog tables without copying | Metadata mirroring (or shortcuts) |
| Scheduled nightly copy with transformations | Pipeline or copy job |
| Data stays only at the source | Shortcut |

> **Exam trap.** Mirroring copies data (into OneLake) continuously; a shortcut doesn't copy at all. "Low latency replica of an operational database" is mirroring; "no data movement" is a shortcut.

<!-- section: pipeline-ingestion | objectives: 2.2.5 -->
## Ingesting data by using pipelines

The **Copy data** activity moves data from 50+ source connectors to 40+ destinations, at petabyte scale, with lightweight transformations only (type conversion, column mapping, merge or split files, flatten hierarchy). The **Copy assistant** builds it from a wizard.

- Sources behind a firewall or on-premises use an **on-premises data gateway** or a **virtual network data gateway**; the activity binds to a **connection** that holds the credentials.
- Lakehouse table destinations are written as Delta tables (append or overwrite).
- Other activities of an ingestion pipeline: **Lookup** (control table or watermark), **Get metadata** (list files), **ForEach**, **Delete data**, **Copy job** (runs a copy job), **Dataflow Gen2**, **Notebook**, **Stored procedure**, **SQL script**, **Refresh SQL analytics endpoint** and **Lakehouse maintenance**.

Metadata-driven ingestion keeps one pipeline for many tables:

```text
Lookup "GetTables"     : SELECT SchemaName, TableName, LoadType FROM ctl.IngestList WHERE Enabled = 1
ForEach "EachTable"    : Items = @activity('GetTables').output.value
  Copy data "CopyOne"  : source table = @{item().SchemaName}.@{item().TableName}
                         destination table = @{toLower(item().TableName)}
```

> **Exam tip.** A pipeline ingests and orchestrates; for incremental copy with CDC from a wizard and no orchestration logic, the copy job needs less effort than a pipeline built by hand.

<!-- section: transform-code | objectives: 2.2.6 -->
## Transforming data by using PySpark, SQL and KQL

PySpark in a notebook (lakehouse):

```text
from pyspark.sql import functions as F

orders = (spark.read.table("bronze_orders")
    .filter(F.col("Status") != "Test")
    .withColumn("OrderDate", F.to_date("OrderTs"))
    .withColumn("Amount", F.col("Amount").cast("decimal(18,2)")))

items = spark.read.json("Files/raw/items/")
flat = items.select("OrderID", F.explode("lines").alias("line")) \
            .select("OrderID", "line.sku", "line.qty")

orders.write.mode("overwrite").format("delta").saveAsTable("silver_orders")
```

T-SQL in a warehouse:

```text
-- Load files into a warehouse table
COPY INTO stg.Orders
FROM 'https://contosolake.blob.core.windows.net/raw/orders/*.parquet'
WITH (FILE_TYPE = 'PARQUET');

-- Create and fill a table from a query (CTAS)
CREATE TABLE dbo.FactOrders AS
SELECT o.OrderID, o.OrderDate, c.CustomerKey, o.Amount
FROM stg.Orders AS o
JOIN dbo.DimCustomer AS c ON c.CustomerID = o.CustomerID AND c.IsCurrent = 1;

-- Read a lakehouse table through its SQL analytics endpoint
INSERT INTO dbo.FactReturns (OrderID, ReturnDate, Amount)
SELECT OrderID, ReturnDate, Amount FROM SalesLakehouse.dbo.returns;
```

KQL in an eventhouse:

```kusto
// Query-time transformation
RawLogs
| extend d = parse_json(Payload)
| project Timestamp, DeviceId = tostring(d.deviceId), Temp = todouble(d.temp)
| where isnotnull(Temp)

// Store the result of a query in another table
.set-or-append CleanLogs <|
    RawLogs
    | extend d = parse_json(Payload)
    | project Timestamp, DeviceId = tostring(d.deviceId), Temp = todouble(d.temp)
```

| Need | PySpark | T-SQL | KQL |
| --- | --- | --- | --- |
| Filter | `filter()` / `where()` | `WHERE` | `where` |
| New column | `withColumn()` | expression in `SELECT` | `extend` |
| Choose columns | `select()` | `SELECT` list | `project` |
| Flatten arrays | `explode()` | `OPENJSON` | `mv-expand` |
| Parse JSON | `from_json()` | `JSON_VALUE` | `parse_json()` |

<!-- section: denormalize-aggregate | objectives: 2.2.7, 2.2.8 -->
## Denormalizing, grouping and aggregating data

**Denormalize** a snowflaked source into one dimension table, and push header attributes down to the fact:

```text
CREATE TABLE dbo.DimProduct AS
SELECT p.ProductID, p.ProductName,
       COALESCE(s.SubcategoryName, 'Unknown') AS Subcategory,
       COALESCE(c.CategoryName, 'Unknown') AS Category
FROM stg.Product AS p
LEFT JOIN stg.Subcategory AS s ON s.SubcategoryID = p.SubcategoryID
LEFT JOIN stg.Category AS c ON c.CategoryID = s.CategoryID;
```

In PySpark the same uses `join(..., how="left")`; a small dimension can be marked with `F.broadcast()` to avoid a shuffle.

**Group and aggregate** to change the grain (order line to day and store):

```text
daily = (spark.read.table("silver_sales")
    .groupBy("OrderDate", "StoreID")
    .agg(F.sum("Amount").alias("Revenue"),
         F.countDistinct("CustomerID").alias("Customers"),
         F.count("*").alias("Lines")))
daily.write.mode("overwrite").saveAsTable("gold_daily_sales")
```

```kusto
Sales
| summarize Revenue = sum(Amount), Customers = dcount(CustomerId) by StoreId, Day = bin(Timestamp, 1d)
```

T-SQL uses `GROUP BY` with `HAVING` to filter groups; Dataflow Gen2 has **Group by** (Basic or Advanced).

> **Exam trap.** `INNER JOIN` while flattening drops products without a subcategory; use `LEFT JOIN` plus `COALESCE`. Averages and distinct counts aren't additive: store sums and counts if a higher level must be rebuilt.

<!-- section: data-quality | objectives: 2.2.9 -->
## Handling duplicate, missing and late-arriving data

| Problem | PySpark | T-SQL | KQL |
| --- | --- | --- | --- |
| Exact duplicate rows | `dropDuplicates()` | `SELECT DISTINCT` | `distinct *` |
| Keep the latest row per key | `row_number()` over a window ordered by date desc, keep 1 | `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ... DESC)` | `summarize arg_max(Timestamp, *) by Key` |
| Replace nulls | `fillna()`, `coalesce()` | `COALESCE()`, `ISNULL()` | `coalesce()` |
| Drop incomplete rows | `dropna(subset=[...])` | `WHERE col IS NOT NULL` | `where isnotempty(col)` |
| Fact key not in the dimension | Left join, then key `-1` | `COALESCE(d.Key, -1)` | `join kind=leftouter` |

```text
from pyspark.sql import Window

w = Window.partitionBy("OrderID").orderBy(F.col("ModifiedAt").desc())
latest = (spark.read.table("bronze_orders")
    .withColumn("rn", F.row_number().over(w))
    .filter("rn = 1").drop("rn"))
```

In an eventhouse, a materialized view keeps deduplicated or latest data up to date as events arrive:

```kusto
.create materialized-view with (backfill=true) DeviceLatest on table Telemetry
{
    Telemetry
    | summarize arg_max(Timestamp, *) by DeviceId
}
```

**Late-arriving data** (rows whose business date is before the last load):

- **Late facts**: reload a sliding **lookback window** (for example the last 3 days) each run and upsert with `MERGE` on the business key, so re-reading the same rows doesn't create duplicates. Filter on the load or modified timestamp, not on the business date.
- **Late dimension members**: load the fact with an inferred or Unknown member, then update that member when its details arrive.
- **Retries**: make every load idempotent (merge or replace a partition), so a rerun gives the same result.

> **Exam trap.** `dropDuplicates(["OrderID"])` keeps an arbitrary row, not the most recent one. "Keep the latest version" needs `row_number()` with an ordering (or `arg_max` in KQL). Appending a lookback window without a merge duplicates the reprocessed rows.

<!-- section: key-points -->
## Key points

- Lakehouse for Spark and files, warehouse for T-SQL writes, eventhouse for events and KQL.
- Dataflow Gen2 = no code; notebook = Spark at scale; T-SQL = warehouse; KQL = eventhouse.
- Shortcut = no copy; Tables shortcuts must be top-level Delta; internal shortcuts use the caller's identity; deleting through a shortcut deletes at the target.
- Mirroring = continuous replica as Delta, free compute, 1 TB per CU, Monitor replication for status and rows.
- Pipelines: Copy data at scale, gateways, Lookup and ForEach for metadata-driven loads.
- Dedupe with `row_number()` or `arg_max`, fill nulls with `COALESCE` or `fillna`, handle late data with a lookback window and `MERGE`.
