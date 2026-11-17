Azure Cosmos DB is the Azure database service for non-relational (NoSQL) data that must scale and answer fast anywhere in the world. The exam asks you to recognize the workloads it fits and to match a data model to the right Azure Cosmos DB API.

<!-- section: cosmos-db-basics | objectives: 3.2.1 -->
## What Azure Cosmos DB is

Azure Cosmos DB is a **fully managed NoSQL database**, delivered as platform as a service (PaaS): Microsoft handles servers, patching, updates and backups.

It is **schema-agnostic**: two items of the same container don't need the same properties.

```json
[
  { "id": "1001", "type": "bike", "name": "Mountain bike", "price": 899.99 },
  { "id": "1002", "type": "helmet", "name": "Road helmet", "sizes": ["S", "M", "L"], "color": "red" }
]
```

Data is organized in four levels:

| Level | Role |
| --- | --- |
| **Account** | The Azure resource; the API and the regions are chosen here |
| **Database** | A logical namespace that groups containers |
| **Container** | The unit of storage and scaling; it carries the partition key, the throughput and the indexing policy |
| **Item** | One entity: a document, a row, a node or an edge, depending on the API |

- The **partition key** is a property that spreads the items across logical partitions. A logical partition holds up to 20 GB; a good key has many distinct values.
- **Every property is indexed automatically** by default: no schema to declare, no index to manage.

<!-- section: distribution-performance | objectives: 3.2.1 -->
## Global distribution, consistency and throughput

- **Global distribution**: you add Azure regions to the account at any time and the data is replicated to each of them. Users read from the nearest replica; with **multi-region writes**, they also write to the nearest region.
- **Guarantees**: reads and writes complete in less than 10 milliseconds at the 99th percentile; accounts with multi-region writes get a 99.999 % availability SLA.
- **Throughput** is expressed in **request units per second (RU/s)**. One RU is about the cost of reading one 1-KB item by its ID and partition key. Reads, writes, queries and deletes all consume RUs.

| Throughput mode | Principle | Use |
| --- | --- | --- |
| **Provisioned** | You reserve RU/s for a container (dedicated) or for a database (shared) | Steady, predictable traffic |
| **Autoscale** | You set a maximum RU/s; capacity follows demand below it | Variable traffic |
| **Serverless** | Nothing to provision; you pay the RUs consumed. One region only | Intermittent, unpredictable traffic |

Because data lives in several replicas, you choose one of **five consistency levels**, from the most consistent to the most available:

| Level | Guarantee |
| --- | --- |
| **Strong** | Every read returns the most recent write |
| **Bounded staleness** | Reads lag behind writes by at most a configured interval |
| **Session** | Consistent inside one client session; the most widely used level |
| **Consistent prefix** | Reads never see writes out of order, but may be stale |
| **Eventual** | Replicas converge over time; weakest guarantee, highest availability |

<!-- section: use-cases | objectives: 3.2.1 -->
## Use cases for Azure Cosmos DB

Choose Azure Cosmos DB when an operational application needs a **flexible schema, global reach and low latency at any scale**.

| Scenario | Why Azure Cosmos DB fits |
| --- | --- |
| **IoT and telemetry** | Fast ingestion of high-frequency device data, available for near-real-time processing |
| **Gaming** | Player profiles, leaderboards and in-game statistics with low-latency reads and writes |
| **Retail and e-commerce** | Product catalogs with varied attributes, shopping carts, order pipelines |
| **Web and mobile applications** | Personalization, social features, users spread across the world |

| Requirement | Better answer |
| --- | --- |
| Complex joins across many tables, fixed relational schema | Azure SQL Database |
| Large-scale analytical workloads | Microsoft Fabric |
| Simple key-value storage in a storage account, without global distribution | Azure Table storage |
| Files, images, videos | Azure Blob storage |

> **Exam trap.** Azure Cosmos DB is a NoSQL service, even though its native API is queried with a SQL-like language. A requirement for a relational database points to the Azure SQL family.

<!-- section: cosmos-db-apis | objectives: 3.2.2 -->
## Azure Cosmos DB APIs

Azure Cosmos DB exposes several APIs that are compatible with the wire protocol of well-known databases, so existing tools, drivers and skills keep working. **You choose the API when you create the account**; it decides the data model and the query language.

| API | Data model | Query language | Choose it when |
| --- | --- | --- | --- |
| **Azure Cosmos DB for NoSQL** | JSON documents | SQL-like syntax | New applications; the native API (formerly the SQL API) |
| **Azure Cosmos DB for MongoDB** | Documents in BSON (binary JSON) | MongoDB Query Language (MQL) | The team uses MongoDB drivers and skills |
| **Azure Cosmos DB for Table** | Key-value pairs: rows found by `PartitionKey` and `RowKey` | Same programming model as Azure Table storage | An Azure Table storage application needs global distribution, more performance or automatic indexing |
| **Azure Cosmos DB for Apache Cassandra** | Column-family: rows of one table can hold different columns | Cassandra Query Language (CQL), close to SQL | Migrating an Apache Cassandra workload to a managed service |
| **Azure Cosmos DB for Apache Gremlin** | Graph: vertices (nodes) linked by edges (relationships) | Gremlin | Relationships matter as much as the data: social networks, recommendations, fraud detection, organization charts |

> **Exam tip.** Read the data model in the stem. Documents: NoSQL or MongoDB. Key-value: Table. Column-family: Apache Cassandra. Graph, or the words vertices and edges: Apache Gremlin.

> **Exam trap.** "Table" exists twice. Azure Table storage is a service of a storage account; Azure Cosmos DB for Table offers the same model with global distribution and an index on all properties.

Azure Cosmos DB for PostgreSQL is a separate, relational offering on a retirement path; it is not one of the five NoSQL APIs.

<!-- section: key-points -->
## Key points

- Azure Cosmos DB: fully managed (PaaS), NoSQL, schema-agnostic, all properties indexed automatically.
- Account, database, container, item; the partition key spreads items across logical partitions.
- Global distribution with multi-region writes, reads and writes under 10 ms at the 99th percentile, 99.999 % availability SLA with multi-region writes.
- Five consistency levels from strong to eventual; session is the most used.
- Throughput in RU/s: provisioned, autoscale or serverless.
- Use cases: IoT, gaming, retail, web and mobile. Not for complex joins (Azure SQL Database) or large-scale analytics (Microsoft Fabric).
- APIs: NoSQL (JSON documents, SQL-like), MongoDB (BSON, MQL), Table (key-value), Apache Cassandra (column-family, CQL), Apache Gremlin (graph).
