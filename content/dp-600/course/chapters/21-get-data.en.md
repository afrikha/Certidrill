Getting data into Fabric starts with a connection to the source, then a choice: reference the data where it is (shortcut), replicate it continuously (mirroring) or copy and transform it (copy job, pipeline, dataflow, notebook, eventstream). The landing item also matters: lakehouse, warehouse or eventhouse. Exam questions combine a source, a skill set and a constraint ("without copying the data", "near real-time", "T-SQL only", "minimize development effort") and expect one method and one store.

<!-- section: data-connections | objectives: 2.1.1 -->
## Creating a data connection

A **connection** stores the address of a source and the credentials used to reach it. Items that move or read data (pipelines, copy jobs, Dataflow Gen2, shortcuts to external storage) bind to a connection instead of embedding credentials.

Create one in **Settings > Manage connections and gateways > Connections > New**, or directly from the item's Get data experience:

| Setting | Values and notes |
| --- | --- |
| Gateway type | **Cloud** for a source reachable from the internet; an on-premises or virtual network data gateway for a private source |
| Connection type | The connector: SQL Server, Azure Data Lake Storage Gen2, Amazon S3, and so on |
| Authentication method | Depends on the connector: for SQL Server, **Basic**, **OAuth2** or **Service Principal**. OAuth2 tokens can expire during long queries; cross-tenant Entra accounts aren't supported |
| Privacy level | Optional; used by Power Query when combining sources. No effect on DirectQuery |
| Gateway use | **This connection can be used with on-premise data gateways and VNet data gateways** (checkbox) |

Each connection has its **own access list**, separate from workspace roles:

| Connection role | Can |
| --- | --- |
| User | Use the connection in their items |
| User with resharing | Use it and share it with others |
| Owner | Manage it, its credentials and its users |

- Anyone who can use a connection reaches the source **with the stored credentials**: share it only with trusted users, and store a narrowly scoped service account or service principal in it.
- A shortcut to ADLS Gen2 or Amazon S3 uses a cloud connection; creating the shortcut **binds** it, which requires permission on that connection.
- Users see only the connections they have access to.

> **Exam trap.** Giving someone the Contributor role on the workspace doesn't let them use your connection in a new pipeline. Add them as **User** of the connection.

<!-- section: discover-data | objectives: 2.1.2 -->
## Discovering data with the OneLake catalog and the Real-Time hub

**OneLake catalog** (OneLake icon in the Fabric navigation pane) is the place to find existing items before creating new ones. It's also embedded in Microsoft Teams, Excel and Copilot Studio.

| Tab | Use |
| --- | --- |
| Explore | List and filter items; open an item's details (metadata, lineage, permissions) beside the list |
| Govern | Governance insights and recommended actions for the data you own (labels, endorsement, domains) |
| Secure | One view of workspace roles and OneLake security roles across items; review, create or edit roles |

- Explore lists the items **you can access or request access to**, plus semantic models marked **discoverable** even without access.
- Filters: **All items**, **My items**, **Endorsed items** (certified first, then promoted), **Favorites**; selectors for **domain**, **item type** category, **tags** (if enabled) and **workspaces**.
- Columns show type, owner, last refresh, workspace, endorsement and sensitivity label.
- Expanding an item to see its schemas and tables requires **Read** on the item.

**Real-Time hub** is the tenant-wide catalog of **streaming data and events**, available without setup. It shows what you can access:

| Section | Lists |
| --- | --- |
| All data streams and tables | Outputs of running eventstreams and tables of KQL databases |
| Microsoft sources | Streaming resources such as Azure Event Hubs and Azure IoT Hub |
| Fabric events and Azure events | Workspace item events, OneLake events, job events, capacity events; Azure storage account (Blob) events |

From the hub you **connect** a source (Event Hubs, Service Bus, IoT Hub, Kafka and Confluent Cloud, Amazon Kinesis, Google Pub/Sub, change data capture from Azure SQL Database, PostgreSQL, MySQL, Cosmos DB and SQL Server), then **process** it in an eventstream, **analyze** it in a KQL database, or **act** on it with an alert (Activator), for example to run a pipeline when a file lands in OneLake.

> **Exam tip.** "Find a certified lakehouse that contains customer data" is the OneLake catalog. "Find the stream of IoT telemetry already flowing in the tenant" or "trigger an action when a file is created" is the Real-Time hub.

<!-- section: ingest-or-access | objectives: 2.1.3 -->
## Ingesting or accessing data

| Requirement | Method |
| --- | --- |
| Use data in ADLS Gen2, S3, Google Cloud Storage, Dataverse or another Fabric item **without copying** it | OneLake shortcut |
| Keep an operational database (Azure SQL, SQL Server, Cosmos DB, Snowflake, PostgreSQL...) replicated in near real time, no ETL to build | Mirroring |
| Copy data with incremental or CDC loads from a wizard, no pipeline to design | Copy job |
| Move large volumes on a schedule, with orchestration and control flow | Pipeline with a copy activity |
| Clean, reshape and merge data with Power Query, low code | Dataflow Gen2 |
| Complex code-based transformation at scale (PySpark, Spark SQL) | Notebook |
| Ingest events continuously (Event Hubs, Kafka, CDC streams) | Eventstream |
| Load files from a storage account into a warehouse table with T-SQL | `COPY INTO` in the warehouse |

**Shortcuts** behave like symbolic links: the data stays in the target.

- In a lakehouse **Tables** folder, a shortcut must be at the **top level** and point to **Delta** data to appear as a table. In **Files**, any level and any format.
- Targets: other Fabric items (lakehouse, warehouse, KQL database, mirrored database, SQL database, semantic model) and external storage (ADLS Gen2, Azure Blob Storage, Amazon S3 and S3-compatible, Google Cloud Storage, Dataverse, OneDrive and SharePoint, Iceberg, on-premises through a gateway).
- Internal shortcuts use the **caller's identity** (passthrough): the user needs read access to the target. External shortcuts use the **connection's** credentials.
- **Deleting a shortcut** leaves the target intact; deleting a file **inside** a shortcut deletes it at the target.
- Caching for S3, S3-compatible, Google Cloud Storage and gateway shortcuts reduces egress: 1 to 28 days, files over 1 GB aren't cached.
- A warehouse can be a shortcut **target**, but shortcuts are created in lakehouses and KQL databases.

**Mirroring** creates a mirrored database item with a SQL analytics endpoint, and replicates the source into Delta tables in OneLake:

| Type | What is replicated | Examples |
| --- | --- | --- |
| Database mirroring | Data and schema, changes published as often as every 15 seconds | Azure SQL Database, SQL Server, Azure SQL Managed Instance, Azure Cosmos DB, Snowflake, Oracle, Google BigQuery, PostgreSQL |
| Metadata mirroring | Only the catalog; data is read through shortcuts | Azure Databricks Unity Catalog |
| Open mirroring | Changes written by your own application through the open mirroring APIs | Any source |

Replication compute is free, and each capacity includes **1 TB of mirroring storage per capacity unit** (64 TB for an F64). Queries on the mirrored data are billed normally, and replication stops when the capacity is paused.

> **Exam trap.** "Without copying the data" excludes mirroring and every pipeline: only a shortcut (or metadata mirroring for a Databricks catalog) leaves the data at the source. "Near real time from an Azure SQL database, no code" is mirroring, not a scheduled copy.

<!-- section: choose-data-store | objectives: 2.1.4 -->
## Choosing a data store

| Criterion | Lakehouse | Warehouse | Eventhouse | SQL database |
| --- | --- | --- | --- | --- |
| Data | Structured, semi-structured, unstructured files and Delta tables | Structured, star schema | Streaming events, JSON, logs, time series | Relational, normalized, operational |
| Write with | Spark (PySpark, Spark SQL, Scala, R), dataflows, pipelines | **T-SQL** (DML, `COPY INTO`, CTAS), pipelines, dataflows | Eventstreams, KQL ingestion | T-SQL, applications |
| Read with | Spark; T-SQL **read-only** through the SQL analytics endpoint | T-SQL | **KQL**, T-SQL | T-SQL |
| Transactions | Delta transactions per table | Full multi-table T-SQL transactions | Append-optimized ingestion | Full ACID, foreign keys |
| Typical persona | Data engineer, data scientist | SQL developer, BI developer | Analyst of real-time data | Application developer |
| Delta in OneLake | Yes | Yes | Opt-in (OneLake availability) | Yes, replicated automatically |

Decision rules:

- A team that knows T-SQL and needs `INSERT`, `UPDATE`, `DELETE` and multi-table transactions: **warehouse**.
- Mixed PySpark and SQL users, files of any format, data science: **lakehouse**; SQL users still read it through the SQL analytics endpoint.
- Billions of telemetry rows, time series and geospatial analysis, fast queries on fresh data: **eventhouse**.
- A high-concurrency operational application: **SQL database**, with its SQL analytics endpoint for reporting.
- All of them store Delta tables in OneLake (except the eventhouse until OneLake availability is on), so one store can read another through shortcuts or **three-part names** in T-SQL:

```text
SELECT c.CustomerName, SUM(o.Amount) AS Total
FROM SalesWarehouse.dbo.DimCustomer AS c
JOIN SalesLakehouse.dbo.Orders AS o ON o.CustomerKey = c.CustomerKey
GROUP BY c.CustomerName;
```

> **Exam trap.** The SQL analytics endpoint of a lakehouse is read-only. A requirement to update rows with T-SQL rules out the lakehouse, unless the update runs in Spark.

<!-- section: onelake-integration | objectives: 2.1.5 -->
## OneLake integration for Eventhouse and semantic models

**Eventhouse OneLake availability** writes a KQL database's tables as **Delta Parquet** files in OneLake, a logical copy with **no extra storage cost**. Then lakehouses (through a shortcut), warehouses, notebooks and Direct Lake semantic models read the same data.

- Turn it on per **database** (new tables; select **Apply to existing tables** to backfill) or per **table**: details pane, **OneLake** section, **Availability > Enabled**.
- Writes are batched into large Parquet files: by default up to **3 hours** of delay (`TargetLatencyInMinutes`, 5 minutes to 3 hours). Shorter delays create small files, and the OneLake copy is read-only and can't be optimized.
- The database **retention policy** also removes data from OneLake. Turning availability off soft deletes the OneLake copy; turning it on again restores it.
- While it's on, you can't rename a table, change a column type, apply row-level security to the table, or delete, truncate or purge data.

```kusto
.alter-merge table Telemetry policy mirroring dataformat=parquet with (IsEnabled=true, TargetLatencyInMinutes=60);
.show table Telemetry mirroring operations
```

**Semantic model OneLake integration** exports the **Import-mode tables** of a semantic model to Delta tables in OneLake at each refresh, so that Spark, T-SQL or other tools read exactly the data behind the reports.

- Requires a workspace on a **Fabric F or Premium P** capacity (not Pro, PPU or Embedded) and the tenant settings **Users can create Fabric items** and **Semantic models can export data to OneLake** (both on by default).
- Enable it in the semantic model settings: **OneLake integration > On > Apply**. Tables appear after the **next refresh** and reflect the last successful refresh.
- Not exported: measures, DirectQuery tables, hybrid tables, calculation group tables and aggregation tables managed by the system.
- Data lands in the workspace folder ending in **.SemanticModel**; consume it with a **OneLake shortcut** from a lakehouse (New shortcut > Microsoft OneLake > select the model and its tables).
- If the model has RLS or OLS roles, only users with **write** access can read the exported tables.
- With XMLA read-write, a TMSL `export` command triggers it on demand:

```json
{
  "export": {
    "layout": "delta",
    "type": "full",
    "objects": [ { "database": "Sales Model" } ]
  }
}
```

> **Exam trap.** OneLake integration exports Import tables only. A Direct Lake or DirectQuery model already reads data that is in OneLake or at the source, so there's nothing to export.

<!-- section: key-points -->
## Key points

- Connections hold credentials and have their own User, User with resharing and Owner roles.
- OneLake catalog finds items (Explore, Govern, Secure); Real-Time hub finds streams and events and connects streaming sources.
- Shortcut = no copy; mirroring = continuous replica of an operational database; copy job = wizard with incremental copy; pipeline = orchestrated bulk copy; Dataflow Gen2 = Power Query; notebook = Spark code; eventstream = events.
- Warehouse for T-SQL writes and transactions, lakehouse for Spark and files, eventhouse for streaming and KQL, SQL database for operational apps.
- Eventhouse OneLake availability: per database or table, up to 3 hours of latency by default, blocks renames and purges.
- Semantic model OneLake integration: Import tables only, after refresh, F or P capacity, read through shortcuts.
