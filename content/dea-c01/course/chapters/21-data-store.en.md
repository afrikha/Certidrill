A data store question gives an access pattern (key lookups, analytical scans, streams, files, similarity search), a volume, a latency and a budget, and asks for the store, the setting or the access method that meets them. This chapter covers the choice and configuration of stores, migration and remote-access tools, locking, open table formats and vector indexes.

<!-- section: store-selection | objectives: 2.1.1 -->
## Choosing storage for cost and performance

| Requirement | Store |
| --- | --- |
| Complex SQL over terabytes to petabytes, joins and aggregations, BI dashboards | Amazon Redshift |
| Transactions, relational integrity, moderate volume | Amazon RDS or Aurora |
| Key/value or single-table access in single-digit milliseconds at any scale | Amazon DynamoDB |
| Ordered stream kept for replay by several consumers | Kinesis Data Streams (24 hours by default, up to 365 days) or Amazon MSK |
| Cheap, durable storage of raw and curated files queried by many engines | Amazon S3 data lake, governed by Lake Formation |
| Spark or Hadoop processing with temporary working data | Amazon EMR with HDFS for intermediate data, S3 (EMRFS) for persistent data |

Cost and performance levers:

| Service | Lever |
| --- | --- |
| Redshift | Provisioned RA3 or RG nodes for steady workloads (managed storage billed separately from compute); Redshift Serverless (RPU-hours while queries run) for intermittent or unpredictable workloads |
| DynamoDB | On-demand for unknown or spiky traffic; provisioned capacity with auto scaling for steady traffic |
| Kinesis Data Streams | On-demand (starts at 4 MB/s write, scales automatically) or provisioned shards (1 MB/s or 1,000 records/s in, 2 MB/s out per shard); longer retention costs more |
| MSK | Provisioned brokers or MSK Serverless; tiered storage keeps long retention cheaply without adding brokers |
| EMR | Transient clusters reading S3, Spot Instances on task nodes, EMR Serverless for no cluster management |

> **Exam trap.** AWS Lake Formation is not a storage service. It registers S3 locations and manages permissions on Data Catalog tables; the data stays in S3.

<!-- section: access-patterns | objectives: 2.1.2 -->
## Configuring stores for access patterns

| Store | Access pattern → configuration |
| --- | --- |
| Redshift | Joins on a large fact table → distribution key on the join column, small dimensions with `DISTSTYLE ALL`; range filters on dates → sort key on the date; bursts of concurrent queries → concurrency scaling; mixed workloads → workload management queues |
| DynamoDB | High-cardinality partition key to spread traffic; sort key for range queries inside a partition; global secondary index for another access key (eventually consistent reads); local secondary index (same partition key, other sort key, defined at table creation); DAX for microsecond cached reads |
| RDS and Aurora | Read replicas or Aurora readers (up to 15, reader endpoint) for read scaling; Multi-AZ for availability; RDS Proxy for connection pooling from Lambda |
| EMR | HDFS on core nodes for iterative, shuffle-heavy jobs; S3 for data that must outlive the cluster |
| Lake Formation | Register the S3 location, grant table, column or row permissions to consumers |

> **Exam tip.** A DynamoDB "query by a non-key attribute" requirement is answered by a global secondary index, not by a `Scan` with a filter: a filter still reads, and bills, every item.

<!-- section: purpose-built-stores | objectives: 2.1.3 -->
## Purpose-built stores for specific use cases

| Use case | Store |
| --- | --- |
| Durable primary database with microsecond reads and single-digit millisecond writes, Valkey or Redis OSS API | Amazon MemoryDB (Multi-AZ transactional log) |
| Cache in front of another database, data loss acceptable | Amazon ElastiCache |
| Semantic search next to relational data, SQL joins with metadata | Aurora PostgreSQL with `pgvector` and an HNSW index |
| Full-text search, log analytics, vector search with high query rates | Amazon OpenSearch Service |
| Low-cost storage of large vector sets queried infrequently | Amazon S3 Vectors (vector buckets and indexes) |
| Relationships traversed over several hops | Amazon Neptune |
| JSON documents, MongoDB API | Amazon DocumentDB |
| Wide-column, Cassandra Query Language | Amazon Keyspaces |
| Time series | Amazon Timestream for InfluxDB (Timestream for LiveAnalytics is in maintenance, closed to new customers) |

> **Exam trap.** MemoryDB and ElastiCache share the Valkey and Redis OSS APIs, but only MemoryDB is a durable system of record. "Fast key/value access and no data loss on node failure" is MemoryDB.

<!-- section: migration-tools | objectives: 2.1.4 -->
## Integrating migration and transfer tools

| Requirement | Tool |
| --- | --- |
| Partners send files over SFTP, FTPS, FTP or AS2; no server to manage | AWS Transfer Family, storing into S3 or EFS |
| Copy file shares (NFS, SMB), HDFS, object stores or other clouds to S3, EFS or FSx, on a schedule, with verification | AWS DataSync (agent for on-premises sources) |
| Migrate a database with ongoing replication (full load plus CDC) | AWS DMS |
| Pull data from SaaS applications (Salesforce, ServiceNow...) | Amazon AppFlow |
| Rehost servers | AWS Application Migration Service |

Transfer Family integrates into a pipeline through S3: an upload creates an object, an S3 Event Notification or EventBridge rule starts a Lambda function, a Step Functions workflow or a Glue job. Transfer Family managed workflows can copy, tag, decrypt or scan a file right after upload. Users are managed by the service (SFTP), AWS Directory Service, or a custom identity provider (Lambda or API Gateway). FTP (unencrypted) is only allowed on a VPC endpoint.

DataSync copies only changed data on later runs, encrypts in transit and checks integrity. AWS Snowball Edge and Snowmobile are shut down: large offline transfers are no longer a Snow answer.

> **Exam tip.** "Partners keep their existing SFTP clients and scripts" points to Transfer Family. "Move 200 TB from an on-premises NAS to S3 over Direct Connect, then sync weekly" points to DataSync.

<!-- section: remote-access | objectives: 2.1.5 -->
## Remote access and migration with Redshift

| Requirement | Feature |
| --- | --- |
| Join live operational rows in RDS or Aurora (PostgreSQL, MySQL) with warehouse tables, no pipeline | Federated query: external schema with a Secrets Manager secret, predicates pushed down to the source |
| Query S3 files without loading them | Redshift Spectrum: external schema on the Glue Data Catalog, read-only external tables, partition pruning |
| Repeated expensive query or dashboard | Materialized view, refreshed manually or with `AUTO REFRESH YES`; automatic query rewriting uses it |
| Replicate an operational database into Redshift continuously without ETL code | Zero-ETL integration (Aurora MySQL and PostgreSQL, RDS for MySQL, PostgreSQL and Oracle, DynamoDB, some SaaS applications) |
| Other clusters or accounts read the same data without copies | Redshift data sharing |
| Migrate the data once into Redshift | `COPY` from S3 (or DMS for a database source) |

```text
CREATE EXTERNAL SCHEMA ops
FROM POSTGRES DATABASE 'orders' SCHEMA 'public'
URI 'orders-db.cluster-abc123.eu-west-1.rds.amazonaws.com'
IAM_ROLE 'arn:aws:iam::111122223333:role/RedshiftFederated'
SECRET_ARN 'arn:aws:secretsmanager:eu-west-1:111122223333:secret:orders-ro';

CREATE EXTERNAL SCHEMA lake
FROM DATA CATALOG DATABASE 'curated'
IAM_ROLE 'arn:aws:iam::111122223333:role/RedshiftSpectrum';

CREATE MATERIALIZED VIEW daily_sales AUTO REFRESH YES AS
SELECT sale_date, store_id, SUM(amount) AS revenue
FROM lake.sales
GROUP BY sale_date, store_id;
```

On RA3 nodes, Spectrum runs in a separate fleet; RG nodes and Redshift Serverless run data lake queries on their own compute.

> **Exam trap.** Federated queries read the source on every run and load it. For dashboards that run the same aggregation all day, a materialized view (or zero-ETL replication) avoids hitting the operational database each time.

<!-- section: locks | objectives: 2.1.6 -->
## Managing locks

**Redshift.** Transactions run in **SNAPSHOT** isolation by default on provisioned clusters and serverless workgroups; **SERIALIZABLE** is stricter and cancels a conflicting transaction with error 1023. Concurrent `INSERT` and `COPY` share a table lock; `UPDATE`, `DELETE`, `MERGE` and DDL need an exclusive lock. `LOCK` takes an `ACCESS EXCLUSIVE` lock that makes other reads and writes wait until the transaction ends.

```text
BEGIN;
LOCK sales;
DELETE FROM sales USING sales_stage WHERE sales.sale_id = sales_stage.sale_id;
INSERT INTO sales SELECT * FROM sales_stage;
COMMIT;

SELECT pid, xid, lock_mode, granted, relation FROM svv_transactions;
SELECT PG_TERMINATE_BACKEND(22378);
```

- Avoid deadlocks: update and lock tables in the same order in every transaction, separate exclusive statements from concurrent loads, add retry logic.
- Find blockers in `SVV_TRANSACTIONS` (`granted` false = waiting); end a blocking session with `PG_TERMINATE_BACKEND`, which rolls back its work. Conflicts are recorded in `STL_TR_CONFLICT`.

**RDS and Aurora.** The engines lock rows. `SELECT ... FOR UPDATE` locks the rows a transaction is about to change; `LOCK TABLE` (PostgreSQL) or `LOCK TABLES` (MySQL) locks whole tables. Long transactions and missing indexes cause lock waits: find them in `pg_locks` and `pg_stat_activity` (PostgreSQL) or the Performance Schema (MySQL), and in CloudWatch Database Insights wait events.

**Without locks.** DynamoDB uses optimistic locking: a version attribute checked by a condition expression. Iceberg tables in Athena use optimistic concurrency through the Glue Data Catalog.

> **Exam trap.** Under snapshot isolation, readers work on their snapshot and do not hold up a `COPY`; an open transaction holding an exclusive lock does. "Loads hang every night after an analyst's session" means an idle transaction still holding a lock: find it and terminate it.

<!-- section: open-table-formats | objectives: 2.1.7 -->
## Open table formats: Apache Iceberg

Apache Iceberg adds a metadata layer (metadata files, manifest lists, manifests) over Parquet, ORC or Avro data files in S3. Each commit creates a **snapshot**, which brings:

| Capability | Benefit |
| --- | --- |
| ACID transactions with optimistic concurrency | Readers never see partial writes |
| Row-level `UPDATE`, `DELETE`, `MERGE INTO` | Upserts and record deletion in a data lake |
| Time travel and version travel | Reproduce a report, audit or roll back |
| Schema evolution | Add, rename or drop columns without rewriting files |
| Hidden partitioning and partition evolution | Partition by `day(ts)` or `bucket(n, id)` without a partition column in queries; change the scheme later |

Apache Hudi and Delta Lake offer similar features. Lake Formation Governed Tables are shut down: Iceberg is the transactional table answer on AWS.

```text
CREATE TABLE curated.orders (order_id string, customer_id string, amount double, ts timestamp)
PARTITIONED BY (day(ts))
LOCATION 's3://example-lake/curated/orders/'
TBLPROPERTIES ('table_type' = 'ICEBERG');

MERGE INTO curated.orders t USING staging.orders s ON t.order_id = s.order_id
WHEN MATCHED THEN UPDATE SET amount = s.amount
WHEN NOT MATCHED THEN INSERT VALUES (s.order_id, s.customer_id, s.amount, s.ts);

SELECT * FROM curated.orders FOR TIMESTAMP AS OF (current_timestamp - interval '1' day);
OPTIMIZE curated.orders REWRITE DATA USING BIN_PACK;
VACUUM curated.orders;
```

Engines: Athena (Iceberg tables in the Glue Data Catalog), Glue jobs (`--datalake-formats iceberg`), EMR, Redshift, SageMaker Unified Studio. Maintenance:

| Problem | Maintenance | On AWS |
| --- | --- | --- |
| Many small files from streaming or frequent commits | Compaction | Athena `OPTIMIZE`, Glue Data Catalog table optimizers, automatic in S3 Tables (target 512 MB by default) |
| Old snapshots keep files and metadata | Snapshot expiration | Athena `VACUUM` (snapshots older than 5 days by default), Glue snapshot retention, S3 Tables snapshot management (120 hours, 1 snapshot minimum by default) |
| Files no longer referenced | Orphan file removal | `VACUUM`, Glue orphan file deletion, S3 Tables unreferenced file removal |

**Amazon S3 Tables** stores Iceberg tables in **table buckets**, with namespaces, and runs compaction, snapshot management and unreferenced file removal automatically; integration with the Glue Data Catalog makes them visible to Athena, Redshift, EMR and Spark.

> **Exam trap.** Expiring snapshots removes the ability to time travel to them. "Keep 30 days of time travel" means a snapshot retention of at least 30 days, not the default.

<!-- section: vector-indexes | objectives: 2.1.8 -->
## Vector index types: HNSW and IVF

An embedding is a vector of numbers that represents the meaning of a text, image or record. Similarity search finds the nearest vectors by cosine similarity, Euclidean (L2) distance or inner product. An exact k-NN search compares the query with every vector; approximate nearest-neighbor (ANN) indexes trade a little recall for much lower latency.

| | HNSW (Hierarchical Navigable Small Worlds) | IVF (inverted file) |
| --- | --- | --- |
| Structure | Multi-layer graph linking close vectors; search descends from sparse top layers to the dense bottom layer | Vectors grouped into clusters around centroids; a query scans only the nearest clusters |
| Training | None | k-means training on representative data before indexing |
| Build-time parameters | `m` (edges per vector), `ef_construction` | `nlist` (`lists` in pgvector) |
| Query-time parameter | `ef_search`: higher = better recall, slower | `nprobes` (`probes`): more clusters = better recall, slower |
| Memory | Higher (edges stored for every vector) | Lower; even lower with product quantization (PQ) |
| Build speed | Slower | Faster |
| Recall and latency | High recall at low latency | Lower recall for the same latency; drops when new data no longer matches the centroids (rebuild) |

```text
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX ON docs USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 256);
SET hnsw.ef_search = 100;

CREATE INDEX ON docs_archive USING ivfflat (embedding vector_l2_ops) WITH (lists = 1000);
SET ivfflat.probes = 20;
```

Where they run: Aurora PostgreSQL and RDS for PostgreSQL with `pgvector` (HNSW and IVFFlat), OpenSearch Service k-NN, S3 Vectors; Amazon Bedrock knowledge bases can use these stores.

> **Exam tip.** "Highest recall at low latency, memory is not a constraint" is HNSW. "Billions of vectors, minimize memory and cost, some loss of recall acceptable" is IVF, usually with product quantization.

<!-- section: key-points -->
## Key points

- Redshift for analytical SQL, RDS or Aurora for transactions, DynamoDB for key access at scale, Kinesis or MSK for replayable streams, S3 for the lake; Lake Formation governs, it does not store.
- Match configuration to access: distribution and sort keys, GSIs and LSIs, read replicas and RDS Proxy, HDFS only for temporary EMR data.
- MemoryDB is a durable in-memory database; pgvector with HNSW on Aurora PostgreSQL keeps vectors next to relational data.
- Transfer Family for SFTP, FTPS, FTP and AS2 partners; DataSync for file and object copies; DMS for databases; Snowball Edge is shut down.
- Redshift: federated queries for live RDS or Aurora data, Spectrum for S3, materialized views for repeated queries, zero-ETL for continuous replication, data sharing for copy-free access.
- Redshift defaults to SNAPSHOT isolation; `LOCK` is exclusive until commit; find blockers in `SVV_TRANSACTIONS`, end them with `PG_TERMINATE_BACKEND`.
- Iceberg: ACID, row-level changes, time travel, schema and partition evolution; maintain with compaction, snapshot expiration and orphan file removal (automatic in S3 Tables).
- HNSW: graph, no training, best recall, more memory. IVF: clusters, training, less memory, lower recall.
