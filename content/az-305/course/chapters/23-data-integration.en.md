Data integration moves data from operational sources to a place where it can be analyzed; data analysis turns it into answers. On AZ-305 you never write a pipeline: you choose the orchestrator, the runtime that reaches the source, the store that holds the data and the engine that queries it, from the latency, skills and cost constraints of the scenario.

<!-- section: integration-pipelines | objectives: 2.3.1 -->
## Designing data integration with Azure Data Factory

**Azure Data Factory** is the managed service for hybrid extract-transform-load (ETL) and extract-load-transform (ELT) projects: it orchestrates the movement and the transformation of data between stores, on a schedule or on events, without servers to manage.

| Concept | Role |
| --- | --- |
| Pipeline | Logical group of activities that performs a unit of work |
| Activity | One step: data movement (copy), data transformation, or control flow |
| Linked service | Connection information for a data store or a compute service, like a connection string |
| Dataset | Structure of the data that an activity reads or writes |
| Mapping data flow | Transformation logic designed visually and executed on Spark clusters that the service starts and stops for you |
| Trigger | Decides when a pipeline run starts (schedule, tumbling window, event) |
| Integration runtime | Compute that runs the activities, close to the data |

The **integration runtime** is the usual subject of the question, because it decides which networks the factory can reach:

| Integration runtime | Runs | Recommend when |
| --- | --- | --- |
| Azure | Data flows, data movement, activity dispatch | Sources and sinks have public endpoints; with a managed virtual network, it reaches data stores through private endpoints |
| Self-hosted | Data movement, activity dispatch | The data store is on-premises or in a private network with no line of sight from the cloud. Installed on a machine behind the firewall, it only makes outbound connections |
| Azure-SSIS | Execution of SSIS packages | Existing SQL Server Integration Services packages are lifted and shifted without being rewritten |

| Requirement | Recommendation |
| --- | --- |
| Copy tables every night from an on-premises SQL Server to Azure, no inbound firewall port | Data Factory with a self-hosted integration runtime |
| Reuse 200 existing SSIS packages with minimal rework | Azure-SSIS integration runtime |
| Analysts build transformations without writing Spark code | Mapping data flows |
| Transformations already written as notebooks | Pipeline that calls Azure Databricks notebook activities |
| The factory must reach storage accounts and databases that have no public access | Azure integration runtime in a managed virtual network with managed private endpoints |

**ETL or ELT.** In ETL, data is transformed before it is loaded into the target, in a dedicated engine. In ELT, raw data is loaded first into a data lake or a warehouse, then transformed there with the scalable engine of the target. ELT is the usual recommendation for large volumes: the raw data stays available for other uses, and the load isn't slowed by transformations.

> **Exam trap.** A site-to-site VPN or ExpressRoute isn't required to copy on-premises data with Data Factory: the self-hosted integration runtime initiates outbound connections only. Conversely, the Azure integration runtime alone can't reach a server inside the on-premises network.

Azure Synapse Analytics includes pipelines built on the same integration engine as Data Factory, to orchestrate without leaving the workspace; they support the Azure and self-hosted integration runtimes, not Azure-SSIS. Microsoft now presents Data Factory in Microsoft Fabric as the next generation of Azure Data Factory: Learn advises those who are new to data integration to start with it, and existing Azure Data Factory workloads can upgrade to it.

<!-- section: data-lake-processing | objectives: 2.3.1 -->
## The data lake and the processing engines

**Azure Data Lake Storage** is the landing zone of most integration designs: a storage account with the hierarchical namespace, which keeps any type of data at Blob Storage prices, with directories, POSIX ACLs and access tiers. Analytics engines read it in place through the ABFS driver, so data doesn't have to be copied before it is analyzed. A common layout separates raw, cleansed and curated data in different containers or directories, each with its own permissions and lifecycle rules.

**Azure Databricks** is the Apache Spark-based analytics platform for data engineering, machine learning and streaming:

- ETL written in SQL, Python or Scala, with scheduled jobs.
- The **lakehouse**: Delta Lake tables stored in the data lake combine the low cost of a lake with the transactions and query performance of a warehouse.
- Structured Streaming for incremental and streaming data, SQL warehouses for analysts, MLflow for machine learning.
- Unity Catalog for unified governance of data and permissions.

| Requirement | Recommendation |
| --- | --- |
| Store raw files of any format cheaply, with directory-level ACLs | Azure Data Lake Storage |
| Data engineers and data scientists work in notebooks on the same Spark platform | Azure Databricks |
| Orchestrate ingestion, then call the Spark transformations, on a schedule | Data Factory pipeline with Databricks activities |
| Spark, SQL warehousing and pipelines in a single workspace managed with Azure tooling | Azure Synapse Analytics |

> **Exam tip.** Data Factory orchestrates and copies; it isn't where heavy transformations are coded. When a scenario says "data scientists", "notebooks", "machine learning" or "Delta Lake", the processing engine is Azure Databricks, and Data Factory, if present, only schedules it.

<!-- section: analytics-platforms | objectives: 2.3.2 -->
## Choosing a data analysis solution

**Azure Synapse Analytics** brings several engines together in one workspace:

| Engine | What it is | Billing and use |
| --- | --- | --- |
| Dedicated SQL pool | Data warehouse that distributes queries over compute nodes, with data loaded into hash, round-robin or replicated tables | Reserved compute, sized in data warehouse units; can be paused so that only storage is billed. For predictable performance on a modeled warehouse |
| Serverless SQL pool | T-SQL endpoint, present in every workspace, that queries files in the data lake (Parquet, Delta Lake, delimited text) in place | Billed for the data processed by each query, nothing to provision. For exploration, a logical data warehouse over the lake, unplanned or bursty workloads |
| Apache Spark pool | Managed Spark for data preparation, data engineering and machine learning | No cluster to manage yourself |
| Data Explorer pool (retired) | Former preview engine for logs and time series, retired on October 7, 2025: its workloads were deleted | Don't recommend it; Learn directs its workloads to Eventhouse in Microsoft Fabric |

> **Exam trap.** A serverless SQL pool has no storage of its own and doesn't support tables or data modification statements: it reads files where they are. "Minimize cost for occasional queries over Parquet files" points to it; "consistent performance for hundreds of concurrent reports on a star schema" points to a dedicated SQL pool.

**Azure Data Explorer** is the platform for interactive analysis of high volumes of logs, telemetry and time series in near real time: it ingests millions of events per second, and queries written in Kusto Query Language (KQL) return in seconds. Recommend it for IoT telemetry, application logs and exploratory analytics over raw, fast-arriving data rather than over a curated model.

**Microsoft Fabric** is a software as a service analytics platform that covers ingestion, transformation, real-time processing, warehousing and reporting. All workloads (Data Factory, Data Engineering, Data Warehouse, Data Science, Real-Time Intelligence, Databases, Power BI) share **OneLake**, a single logical data lake built on Azure Data Lake Storage. Two features avoid copy pipelines: **shortcuts** give zero-copy access to data that stays in Azure Data Lake Storage, Amazon S3 or Google Cloud Storage, and **mirroring** continuously replicates sources such as Azure SQL Database, Azure Cosmos DB, Azure Databricks or Snowflake into OneLake.

| Requirement | Recommendation |
| --- | --- |
| Enterprise data warehouse, T-SQL, reserved and predictable performance | Synapse dedicated SQL pool |
| Ad hoc T-SQL queries over files in the data lake, pay per query | Synapse serverless SQL pool |
| Spark-based data engineering and machine learning on a lakehouse | Azure Databricks |
| Interactive analysis of logs, telemetry and time series with KQL | Azure Data Explorer |
| One managed platform from ingestion to Power BI reports, least infrastructure to run | Microsoft Fabric |
| Analyze Azure Cosmos DB operational data in near real time, without ETL and without consuming the transactional throughput | Analytical store with Azure Synapse Link in existing designs; Azure Cosmos DB mirroring in Microsoft Fabric for new projects |

Azure Synapse Link for Azure Cosmos DB keeps a column-oriented analytical store in sync with the transactional store, isolated from it. Microsoft no longer supports it for new projects and directs them to mirroring in Fabric, but the reasoning the exam tests is unchanged: analytical queries must not run against the operational store.

<!-- section: data-paths | objectives: 2.3.2 -->
## Hot, warm and cold data paths

An analytics design usually serves several latencies at once. Identify the path that the requirement describes:

| Path | Latency | Typical design |
| --- | --- | --- |
| Hot | Seconds or less | Real-time alerts and dashboards computed on the stream as events arrive |
| Warm | Near real time | Stream processing with windowed aggregations and joins; recent data kept in Azure SQL Database or Azure Cosmos DB |
| Cold | Batch | Batch layer: long-term storage in Blob Storage or Azure Data Lake Storage, transformation with Data Factory and Spark, precalculated views |

**Azure Stream Analytics** is the fully managed stream processing engine, programmed in a SQL language extended with time semantics.

- Streaming inputs: Azure Event Hubs and Azure IoT Hub; Blob Storage or Azure Data Lake Storage for historical data. Reference data from Blob Storage or Azure SQL Database can be joined to the stream for lookups.
- Outputs: Blob Storage and Azure Data Lake Storage, Azure SQL Database, Azure Cosmos DB, Azure Synapse Analytics, Azure Data Explorer, Azure Database for PostgreSQL, Table storage, Event Hubs, Service Bus queues and topics, Azure Functions, Power BI for live dashboards.
- Tumbling, hopping and sliding windows for aggregations over time.
- Capacity is expressed in streaming units, with no cluster to provision; the service guarantees 99.9% availability.
- The same queries can run on Azure IoT Edge to process data next to the devices.

| Requirement | Recommendation |
| --- | --- |
| Aggregate device telemetry over 5-minute windows with SQL skills, feed Power BI | Azure Stream Analytics |
| Complex streaming transformations, machine learning on the stream, Delta Lake | Spark Structured Streaming on Azure Databricks |
| Run custom code for each event, no state between events | Azure Functions |
| Low-code stream routing and transformation inside Microsoft Fabric | Fabric eventstreams |
| Filter and aggregate on the device, with intermittent connectivity | Stream Analytics on Azure IoT Edge |

> **Exam trap.** Event Hubs and IoT Hub ingest events; they don't analyze them. A requirement to detect a condition over a time window needs a processing engine behind the ingestion service, typically Stream Analytics.

<!-- section: key-points -->
## Key points

- Data Factory orchestrates and copies; the integration runtime decides reach: Azure for public or managed private endpoints, self-hosted for on-premises and private networks (outbound only), Azure-SSIS for existing SSIS packages.
- ELT into Azure Data Lake Storage is the default for large volumes; Azure Databricks is the Spark engine for data engineering, machine learning and the lakehouse.
- Dedicated SQL pool for a provisioned warehouse (can be paused); serverless SQL pool to query lake files and pay per data processed.
- Azure Data Explorer for logs, telemetry and time series with KQL; Microsoft Fabric for an integrated software as a service platform on OneLake.
- Hot path in seconds or less, warm path in near real time, cold path in batch; Stream Analytics for SQL over streams from Event Hubs or IoT Hub.
- Never run analytics against the operational store: use a replica, an analytical store, mirroring or a pipeline.
