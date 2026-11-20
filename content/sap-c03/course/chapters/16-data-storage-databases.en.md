Data questions at the professional level combine several stores in one design: a lake on S3 governed by Lake Formation, a warehouse, operational databases replicated across Regions, caches and file systems, shared between accounts and sometimes with partners. Decide from the access pattern (key lookups, joins, scans, streams, files), the consistency and recovery targets, the scale and the operating model, and check every option against the deciding qualifier.

<!-- section: lakehouse | objectives: 1.5.1 -->
## Data lake and lakehouse architectures

A data lake stores raw and curated data in S3 in open formats; a **lakehouse** adds warehouse-like guarantees on the same files through an open table format, so several engines read and write the same tables.

| Layer | AWS building block |
| --- | --- |
| Storage | S3 general purpose buckets organized in zones (raw, curated, consumption), or **S3 Tables** table buckets |
| Table format | **Apache Iceberg**: ACID transactions, schema and partition evolution, time travel, row-level updates and deletes |
| Metadata | AWS Glue Data Catalog (databases, tables, partitions), populated by crawlers, ETL jobs or engines |
| Governance | AWS Lake Formation: database, table, column, row and cell-level permissions, LF-Tags, cross-account sharing |
| Engines | Athena (serverless SQL), Redshift and Redshift Spectrum, EMR and Glue (Spark), Amazon Quick for dashboards |

**S3 Tables** stores tables in Iceberg format as subresources of a table bucket and runs maintenance continuously: compaction of small files, snapshot management and removal of unreferenced files. Access is controlled with IAM and SCPs in the `s3tables` namespace (per table, namespace or bucket), Block Public Access is always on, and the Glue Data Catalog integration makes the tables visible to Athena, Redshift and EMR. Self-managed Iceberg tables in general purpose buckets give more control but you schedule compaction yourself.

**Redshift Spectrum** queries data in S3 through external schemas mapped to the Data Catalog, so a warehouse joins its local tables with lake data without loading it; Lake Formation permissions apply to Spectrum queries. Athena is the answer for ad hoc SQL on the lake with no infrastructure; Redshift for high-concurrency BI with complex joins on curated data.

> **Exam trap.** "Update and delete individual records in the data lake for privacy requests, with time travel" needs an open table format such as Iceberg; plain Parquet files in S3 can't be updated row by row.

<!-- section: analytics-pipelines | objectives: 1.5.2 -->
## Real-time and batch analytics pipelines

| Need | Service |
| --- | --- |
| Ordered stream per key, multiple consumers, replay | Kinesis Data Streams (on-demand or provisioned shards) |
| Existing Kafka producers and consumers, Kafka APIs | Amazon MSK: provisioned with Standard or Express brokers, or MSK Serverless; MSK Connect for connectors |
| Stateful stream processing (windows, joins) | Amazon Managed Service for Apache Flink |
| Deliver a stream to S3, Redshift or OpenSearch Service with buffering, no code | Amazon Data Firehose |
| Stream straight into the warehouse | Redshift streaming ingestion from Kinesis Data Streams or MSK into materialized views |
| Large batch Spark, Hive, Presto with control of the cluster | Amazon EMR on EC2 (Spot task nodes), EMR on EKS to share a Kubernetes platform |
| Batch Spark or Hive without clusters | EMR Serverless or AWS Glue ETL jobs |
| Replicate operational data to Redshift without pipelines | Zero-ETL integrations (Aurora MySQL and PostgreSQL, RDS for MySQL, PostgreSQL and Oracle, DynamoDB, applications such as Salesforce or SAP) |
| SaaS data (Salesforce, ServiceNow, Zendesk) on a schedule or on events | Amazon AppFlow, with PrivateLink where supported |

MSK **Express brokers** give up to three times the throughput per broker of Standard brokers, elastic pay-as-you-go storage with nothing to provision, partition moves and scaling up to 20 times faster, and run only in three AZs. MSK Serverless removes capacity planning for variable workloads.

A typical combined design: producers write to Kinesis Data Streams; Flink computes real-time aggregates for a dashboard; Firehose lands the raw events in S3 (Iceberg tables) for batch processing by EMR or Glue; Redshift serves curated data. Choose the fewest services that meet the latency target: seconds (streams), minutes (Firehose buffering, micro-batches), hours (batch).

> **Exam tip.** "Kafka" or "existing Kafka clients" points to MSK; "least operational overhead to land streaming data in S3" points to Firehose; "query operational data in Redshift within seconds without ETL code" points to zero-ETL.

<!-- section: database-selection | objectives: 1.5.3 -->
## Selecting database services

| Workload requirement | Service |
| --- | --- |
| Relational, existing engine (MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, Db2) | Amazon RDS |
| Relational with higher throughput, fast failover, up to 15 readers, global replication, serverless scaling | Amazon Aurora (Aurora Serverless v2 for variable load) |
| Key-value or document at any scale, single-digit-millisecond latency, known access patterns | Amazon DynamoDB (on-demand or provisioned capacity) |
| Analytical SQL over terabytes to petabytes, columnar | Amazon Redshift (RA3 provisioned or Redshift Serverless) |
| MongoDB-compatible documents | Amazon DocumentDB |
| Highly connected data, graph traversals | Amazon Neptune |
| Cassandra (CQL) workloads | Amazon Keyspaces |
| Time series at high ingest rate | Amazon Timestream |
| Durable in-memory primary database, Redis OSS or Valkey compatible | Amazon MemoryDB |

Selection criteria the exam combines:

- **Access patterns**: DynamoDB requires designing keys and indexes for known queries (partition key, sort key, GSIs); ad hoc joins and reporting push to relational or Redshift.
- **Consistency**: DynamoDB reads are eventually consistent by default, strongly consistent on request in the Region; Aurora readers lag slightly behind the writer; global tables in multi-Region strong consistency (MRSC) mode return the latest write in every Region.
- **Scale**: relational engines scale writes vertically (or by sharding); DynamoDB and Keyspaces scale horizontally to virtually any table size.
- **Operations**: serverless options (DynamoDB, Aurora Serverless v2, Redshift Serverless) for spiky or unknown load.

> **Exam trap.** Redshift is not an OLTP database: thousands of small transactional writes per second belong in Aurora or DynamoDB, with zero-ETL or streaming into Redshift for analytics.

<!-- section: database-ha-scaling | objectives: 1.5.4 -->
## Database scaling and high availability

| Feature | Replication | Readable | Scope and use |
| --- | --- | --- | --- |
| RDS Multi-AZ DB instance | Synchronous to one standby | No | One Region, automatic failover |
| RDS Multi-AZ DB cluster (MySQL, PostgreSQL) | Semisynchronous to two readers in three AZs (commit after one acknowledgment) | Yes | Lower write latency than Multi-AZ instance, readable standbys |
| RDS read replicas | Asynchronous, same or other Region | Yes | Read scaling (up to 15 for MySQL, MariaDB, PostgreSQL), promotion for DR |
| Aurora cluster | Shared storage, six copies across three AZs | Up to 15 replicas | Failover to a replica, reader endpoint, Auto Scaling of replicas |
| Aurora Global Database | Storage-level, typically under one second | Secondary clusters (up to 16 instances each) | Up to 10 secondary Regions, switchover without data loss, failover for outages, optional write forwarding |
| DynamoDB global tables MREC | Asynchronous, usually under a second | Every replica is read-write | Last writer wins, RPO equals replication delay |
| DynamoDB global tables MRSC | Synchronous to at least one other Region | Every replica is read-write | Exactly three Regions (three replicas, or two plus a witness), RPO zero, no transactions, no TTL, no LSIs |

Rules that decide answers:

- MRSC is chosen at creation (empty table) and can't be changed; conflicting concurrent writes fail with `ReplicatedWriteConflictException` instead of being overwritten.
- Aurora Global Database managed switchover and failover need matching major and minor engine versions between clusters. Write forwarding lets an application in a secondary Region send writes that the primary applies.
- RDS Oracle and Db2 replicas can run in mounted or standby mode for cross-Region DR without serving reads; Oracle, SQL Server and Db2 can't create replicas of replicas.
- Connection storms during failover: put **RDS Proxy** in front of RDS or Aurora to pool connections and shorten failover impact.

> **Exam trap.** A Multi-AZ DB instance standby can't serve reads. "Scale reads and survive an AZ failure" needs a Multi-AZ DB cluster, Aurora replicas, or read replicas plus Multi-AZ.

<!-- section: storage-architectures | objectives: 1.5.5 -->
## Storage architectures by access pattern

| Access pattern | Service and option |
| --- | --- |
| Objects, any scale, web and analytics | S3 storage classes; S3 Express One Zone directory buckets for consistent single-digit-millisecond access in one AZ |
| Block storage for one instance, general purpose | EBS gp3: up to 80,000 IOPS, 2,000 MiB/s and 64 TiB, performance set independently of size |
| Highest block performance, Multi-Attach, sub-millisecond | EBS io2 Block Express: up to 256,000 IOPS, 4,000 MiB/s, 64 TiB |
| Sequential throughput, low cost | EBS st1 (500 MiB/s), sc1 for cold data |
| Shared POSIX file system for Linux, elastic | Amazon EFS: Elastic throughput (default), Regional or One Zone, Standard, IA and Archive classes |
| Windows SMB shares with Active Directory | FSx for Windows File Server (Single-AZ or Multi-AZ) |
| HPC, ML training, sub-millisecond latency, data in S3 | FSx for Lustre linked to S3 with a data repository association |
| NFS, SMB and iSCSI on one system, NetApp features | FSx for NetApp ONTAP (snapshots, SnapMirror, clones, Multi-AZ) |
| NFS with ZFS snapshots and clones | FSx for OpenZFS |
| Scratch data at the lowest latency | Instance store (lost when the instance stops) |

EFS guidance: General Purpose performance mode is recommended for all file systems (Max I/O is previous generation, not available with Elastic throughput or One Zone); Elastic throughput suits spiky loads and charges per data read and written, Provisioned suits steady high throughput. Per-client throughput reaches 1,500 MiB/s only with Elastic throughput on Regional file systems and a recent EFS client.

> **Exam tip.** "Lift and shift Windows file servers that use NTFS ACLs and DFS" is FSx for Windows File Server; "migrate NetApp filers keeping SnapMirror" is FSx for NetApp ONTAP; "process S3 datasets with a parallel file system" is FSx for Lustre.

<!-- section: caching | objectives: 1.5.6 -->
## Data caching strategies

| Cache | Placement | Use |
| --- | --- | --- |
| DynamoDB Accelerator (DAX) | In front of DynamoDB, API-compatible | Microsecond reads for read-heavy, eventually consistent access, minimal code change |
| ElastiCache (Valkey, Redis OSS, Memcached) | Application-managed cache for any data source | Query results, sessions, leaderboards, rate limiting |
| ElastiCache Serverless | Same engines, no node sizing | Unpredictable load, scales automatically |
| CloudFront | Edge | HTTP content and API responses |
| API Gateway caching | REST API stage | Repeated identical API calls |

DAX behavior: an item cache for `GetItem` and `BatchGetItem`, a separate query cache for `Query` and `Scan`. Strongly consistent and transactional reads pass through to DynamoDB uncached. Writes go through to DynamoDB and update the item cache, but not the query cache, which stays stale until its TTL. Run at least three nodes in several AZs.

Patterns for ElastiCache:

- **Lazy loading (cache-aside)**: read the cache, on a miss read the database and populate the cache. Only requested data is cached; a miss costs three trips; data can be stale.
- **Write-through**: update the cache whenever the database is written. Data is current, but every write pays the extra step and rarely read data fills memory.
- **TTL** on every key to bound staleness and memory, with jitter to avoid simultaneous expiry.
- Valkey or Redis OSS for replication, Multi-AZ failover, persistence and rich data types; Memcached for a simple multithreaded cache. Global Datastore replicates Valkey or Redis OSS caches to other Regions for low-latency reads.

> **Exam trap.** DAX does not help strongly consistent reads, and it is not a general cache for RDS. Caching relational query results is ElastiCache.

<!-- section: catalog-sharing | objectives: 1.5.7 -->
## Data cataloging and cross-account data sharing

- **AWS Glue Data Catalog**: one catalog per account and Region; crawlers infer schemas and partitions; a catalog resource policy can open it to other accounts, but Lake Formation is the recommended way to share.
- **Lake Formation sharing**: grant permissions to another account, an organization, an OU or a specific IAM principal. **LF-Tag-based access control** (recommended) grants on tag expressions so new tables are covered automatically; the **named resource** method grants on specific databases and tables. Lake Formation uses AWS RAM; grants inside the organization apply immediately, external accounts accept an invitation. Organization and OU grants with LF-Tags need cross-account version settings 3 or later. The consumer creates **resource links** so Athena and Redshift Spectrum can query shared tables. Data filters restrict rows, columns or cells. **Hybrid access mode** turns on Lake Formation permissions for selected tables and principals while existing IAM and S3 policies keep working for others.
- **Redshift data sharing**: live read (and write) access to databases, schemas, tables and views across clusters, workgroups, accounts and Regions, without copying data.
- **AWS Clean Rooms**: partners analyze combined datasets without seeing each other's raw data. Members join a collaboration and link configured tables (S3 with the Glue Data Catalog, Athena, Snowflake, Databricks); data stays where it is. **Analysis rules**: aggregation (statistics only), list (row-level overlap) or custom (approved analysis templates). Options: differential privacy, Clean Rooms ML lookalike segments, cryptographic computing to keep data encrypted during queries.

```bash
# Producer account: share every table tagged domain=sales and sensitivity=internal
aws lakeformation grant-permissions \
  --principal DataLakePrincipalIdentifier=444455556666 \
  --permissions SELECT DESCRIBE \
  --resource '{"LFTagPolicy":{"ResourceType":"TABLE","Expression":[{"TagKey":"domain","TagValues":["sales"]},{"TagKey":"sensitivity","TagValues":["internal"]}]}}'
```

| Requirement | Answer |
| --- | --- |
| Central governance, consumer accounts query curated tables with column restrictions | Lake Formation LF-Tags shared with consumer accounts, resource links |
| BI account reads the live warehouse of the finance account | Redshift data sharing |
| Two companies measure campaign overlap without exchanging customer lists | Clean Rooms with an aggregation analysis rule |

> **Exam trap.** Copying data to each consumer account (S3 replication or exports) breaks single-source governance and multiplies cost; the qualifier "without copying the data" points to Lake Formation sharing, Redshift data sharing or Clean Rooms.

<!-- section: key-points -->
## Key points

- Lakehouse = S3 plus Iceberg (S3 Tables for managed maintenance) plus Glue Data Catalog plus Lake Formation; Athena ad hoc, Redshift Spectrum to join lake and warehouse.
- Streams: Kinesis Data Streams, MSK (Express brokers, Serverless), Flink, Firehose; batch: EMR, EMR Serverless, Glue; zero-ETL into Redshift; AppFlow for SaaS.
- Pick databases by access pattern, consistency and scale; Redshift is analytics, not OLTP.
- Multi-AZ instance standby is not readable; Multi-AZ DB cluster has two readable standbys; Aurora Global Database up to 10 secondary Regions; DynamoDB MRSC = three Regions, RPO zero, no transactions.
- gp3 up to 80,000 IOPS, io2 Block Express up to 256,000; EFS Elastic throughput by default; FSx flavor by protocol and features.
- DAX for eventually consistent DynamoDB reads; ElastiCache with lazy loading, write-through and TTLs.
- Share without copying: Lake Formation (LF-Tags, RAM, resource links), Redshift data sharing, Clean Rooms analysis rules.
