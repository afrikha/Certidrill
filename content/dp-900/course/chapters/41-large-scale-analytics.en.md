Large-scale analytics turns data from many operational systems into reports and models. The exam asks you to place a step in the architecture (ingest, store, model, visualize), to tell a data warehouse from a data lake and a lakehouse, and to recognize what Microsoft Fabric and Azure Databricks provide.

<!-- section: analytics-architecture | objectives: 4.1.1 -->
## The elements of a large-scale analytics solution

| Element | What happens |
| --- | --- |
| **Data ingestion and processing** | Data from transactional stores, files and real-time streams is loaded into a data lake or a data warehouse, then cleaned, filtered and restructured for analysis |
| **Analytical data store** | The prepared data is kept in a data warehouse, a data lake or a lakehouse |
| **Analytical data model** | A semantic model defines tables, relationships, hierarchies and measures on top of the store |
| **Data visualization** | Analysts build reports and dashboards that show trends, comparisons and key performance indicators (KPIs) |

Natural-language assistants such as Copilot in Microsoft Fabric or Genie in Azure Databricks let users ask questions of the data without writing queries.

<!-- section: ingestion-processing | objectives: 4.1.1 -->
## Data ingestion and processing

Two orders are possible for preparing data:

| Process | Order | Where the transformation runs |
| --- | --- | --- |
| **ETL**: extract, transform, load | The data is transformed **before** it is loaded into the analytical store | In the pipeline |
| **ELT**: extract, load, transform | The data is copied to the store as it is, **then** transformed | In the analytical store |

- Processing is done by **distributed** engines such as Apache Spark, which split the work across the nodes of a cluster to handle large volumes in parallel.
- Ingestion covers both **batch** processing of static data and **real-time** processing of streaming data.
- A **pipeline** orchestrates the work: it chains **activities** (copy data, run a notebook, call a stored procedure) that run in sequence or in parallel.

| Tool | Role |
| --- | --- |
| **Pipelines** in Fabric Data Factory | Orchestrate multi-step data movement and transformation |
| **Dataflows Gen2** in Fabric Data Factory | Low-code, visual transformations with Power Query |
| **OneLake shortcuts** | Reference data that stays in external storage, without copying it |
| **Mirroring** in Fabric | Replicate an operational database (Azure SQL Database, Azure Cosmos DB and others) into OneLake continuously, with no pipeline to build |
| **Eventstream** in Fabric | Ingest real-time streams |
| **Notebooks** (Fabric or Azure Databricks) | Code-first ingestion and transformation with Spark |
| **Lakeflow pipelines** in Azure Databricks | Declarative pipelines that load Delta Lake tables incrementally, in batch or streaming |
| **Azure Data Factory** | Standalone Azure service for pipelines outside Fabric, for example with on-premises sources in a hybrid environment; connections are called linked services |

> **Exam trap.** ETL and ELT contain the same three steps. Only the order differs: with ELT the raw data lands in the store first, a common pattern with a data lake.

<!-- section: analytical-stores | objectives: 4.1.2 -->
## Analytical data stores

| | Data warehouse | Data lake | Data lakehouse |
| --- | --- | --- | --- |
| **Nature** | Relational database with a schema optimized for analytics | File store on a distributed file system | Files in a data lake, exposed as tables |
| **Data** | Structured | Structured, semi-structured and unstructured | All types, with tables for the structured part |
| **Schema** | Defined before loading and enforced | Applied when the data is read: **schema-on-read** | Enforced on the tables by a format such as Delta Lake |
| **Query** | SQL | Engines such as Apache Spark | SQL and Spark |
| **Choose it when** | The data fits a structured schema of tables and analysts use SQL | You keep varied raw data without imposing a schema at write time | You want the flexibility of the lake and the SQL tables of a warehouse on one copy of the data |

In a data warehouse the tables usually follow a **star schema**:

- A **fact table** holds the numeric values to aggregate, one row per event (a sales order line with quantity and revenue).
- **Dimension tables** hold the entities by which you aggregate (customer, product, store, time).
- A **snowflake schema** adds tables related to the dimensions to represent hierarchies (product, then product category).

**Delta Lake** is the open-source lakehouse format used by Microsoft Fabric and Azure Databricks. It adds relational capabilities to Parquet files: tables with schema enforcement and transactional consistency, for batch and streaming data.

> **Exam tip.** "Relational, structured, SQL" points to a data warehouse. "Files, any format, schema applied on read" points to a data lake. "Both at once" or "Delta tables" points to a lakehouse.

<!-- section: analytics-services | objectives: 4.1.3 -->
## Microsoft Fabric and Azure Databricks

Both platforms cover the whole architecture, with different approaches.

**Microsoft Fabric** is a unified analytics platform delivered as software as a service (SaaS). All its workloads share **OneLake**, a single data lake for the whole tenant, so data isn't copied between services.

| Fabric component | Role |
| --- | --- |
| **Lakehouse** | Delta Lake tables and files in OneLake, processed with Spark notebooks and queried through a SQL analytics endpoint |
| **Warehouse** | Fully managed relational data warehouse, queried with T-SQL |
| **Data Factory** | Pipelines and Dataflows Gen2 for ingestion and transformation |
| **Real-Time Intelligence** | Analytics on streaming data, logs and telemetry |
| **Power BI** | Semantic models, reports and dashboards |

**Azure Databricks** is a cloud analytics platform built on **Apache Spark**, for large-scale data engineering, data science and SQL analytics. It runs as a managed service in your Azure subscription and uses Delta Lake as its native format.

| Azure Databricks component | Role |
| --- | --- |
| **Notebooks** | Collaborative code in Python, SQL, Scala and R for pipelines, exploration and machine learning |
| **Databricks SQL** | SQL warehouses that run analytical queries on Delta tables for reports and BI tools |
| **Unity Catalog** | Governance of data and AI assets: access control, lineage, discovery |

| Requirement | Answer |
| --- | --- |
| One SaaS platform from ingestion to Power BI reports, with one shared data lake | Microsoft Fabric |
| A code-first Spark platform, existing Databricks skills, portability across clouds | Azure Databricks |
| A relational warehouse queried with T-SQL | Warehouse in Microsoft Fabric |

<!-- section: key-points -->
## Key points

- Architecture: ingestion and processing, analytical data store, analytical data model, visualization.
- ETL transforms before loading; ELT loads, then transforms in the store.
- Pipelines chain activities; Spark processes large volumes in parallel on a cluster.
- Data warehouse: relational, structured, SQL, star schema of fact and dimension tables.
- Data lake: files of any type, schema-on-read. Lakehouse: lake files exposed as tables, with Delta Lake.
- Microsoft Fabric: unified SaaS platform on OneLake (Lakehouse, Warehouse, Data Factory, Real-Time Intelligence, Power BI).
- Azure Databricks: Apache Spark platform with notebooks, Databricks SQL and Unity Catalog.
