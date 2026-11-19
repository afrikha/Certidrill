Database questions describe the data (relational, key-value, documents, graph, time-ordered), the access pattern (read-heavy, write-heavy, single-digit millisecond lookups, complex joins, analytics) and the scale, then ask for the database type, the engine, the capacity configuration or the migration path. AWS's answer is a purpose-built database for each pattern rather than one database for everything.

<!-- section: database-types | objectives: 3.3.8 -->
## Database types and AWS services

| Type | Data model | AWS service | Typical use |
| --- | --- | --- | --- |
| Relational (OLTP) | Tables, SQL, joins, ACID transactions | Amazon RDS (MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, Db2), Amazon Aurora (MySQL- and PostgreSQL-compatible) | ERP, e-commerce orders, any schema with relationships |
| Key-value and wide-item | Items accessed by key, flexible attributes | Amazon DynamoDB | Shopping carts, sessions, user profiles, gaming, IoT at any scale |
| Document | JSON documents, MongoDB API | Amazon DocumentDB (with MongoDB compatibility) | Content catalogs, profiles with nested data |
| Wide-column | Cassandra tables, CQL | Amazon Keyspaces (for Apache Cassandra) | Migrating Cassandra workloads without managing clusters |
| Graph | Nodes and relationships; Gremlin, openCypher, SPARQL | Amazon Neptune | Social networks, fraud rings, recommendations, knowledge graphs |
| In-memory cache | Key-value in RAM, microsecond reads | Amazon ElastiCache (Valkey, Redis OSS, Memcached) | Cache in front of a database, session store, leaderboards |
| In-memory durable | Valkey/Redis OSS API with a Multi-AZ transaction log | Amazon MemoryDB | Primary database that needs microsecond reads and single-digit millisecond writes |
| Data warehouse (OLAP) | Columnar, SQL analytics over large datasets | Amazon Redshift | Reporting and BI over terabytes to petabytes |

**Serverless** options remove capacity management: Aurora Serverless v2 (scales in ACUs, down to 0 with auto-pause on supported versions), DynamoDB on-demand (default and recommended mode), ElastiCache Serverless, Redshift Serverless, Amazon Keyspaces, Neptune Serverless.

> **Exam trap.** Redshift isn't a transactional database. "Thousands of small transactions per second from the web application" is RDS, Aurora or DynamoDB; "complex analytical queries across years of sales data" is Redshift.

<!-- section: database-type-choice | objectives: 3.3.12 -->
## Choosing the database type: Aurora, RDS or DynamoDB

| Requirement in the stem | Answer |
| --- | --- |
| Existing SQL application, joins, MySQL or PostgreSQL, highest performance and availability of a managed relational database | Amazon Aurora |
| Commercial engine (Oracle, SQL Server, Db2) or a specific open-source version, standard managed database | Amazon RDS |
| Need OS or database host access for a commercial engine | Amazon RDS Custom (Oracle, SQL Server) |
| Single-digit millisecond latency at any scale, key-based access, no schema, serverless | Amazon DynamoDB |
| Microsecond reads for DynamoDB without changing data model | DynamoDB Accelerator (DAX) |
| Unpredictable relational workload, idle periods, scale automatically | Aurora Serverless v2 |
| Multi-Region active-active writes on key-value data | DynamoDB global tables |
| Relational, one primary Region, fast cross-Region reads and DR | Aurora Global Database |

Aurora versus RDS: Aurora separates compute from a **cluster volume** replicated across three Availability Zones (six storage nodes) that grows automatically, up to 15 Aurora Replicas share that storage with replica lag usually under 100 ms, and failover usually completes in under 60 seconds. RDS stores data on EBS volumes attached to the instance.

DynamoDB limits to remember: items up to 400 KB, tables of unlimited size, 20 global secondary indexes and 5 local secondary indexes per table by default (LSIs only at table creation).

> **Exam tip.** "Relational", "joins", "SQL" or "ACID across tables" rule out DynamoDB, whatever the scale. "Key-value", "flexible schema", "millions of requests per second" or "serverless with no servers to manage" point to DynamoDB.

<!-- section: access-patterns | objectives: 3.3.3 -->
## Data access patterns: read-intensive and write-intensive

| Pattern | Relational answer | DynamoDB answer |
| --- | --- | --- |
| Read-heavy, same rows read again and again | ElastiCache in front of the database; read replicas | DAX; eventually consistent reads (half the cost of strongly consistent) |
| Read-heavy, reporting queries slow the application | Read replica or Aurora Replica for reports; Redshift for analytics | Export to S3 and query with Athena |
| Write-heavy, a single writer saturated | Scale up the writer (bigger instance class, more IOPS); shard across databases; consider DynamoDB | Spread writes with a high-cardinality partition key; on-demand mode or provisioned with auto scaling |
| Spiky writes that the database can't absorb | Buffer writes in an SQS queue, consumers write at a steady rate | On-demand mode, or SQS buffer in front of provisioned capacity |
| Many lookups by different attributes | Indexes | Global secondary indexes |

- **Read replicas don't scale writes**: every replica replays every write. A write-bound relational database scales vertically, by sharding, or by moving the hot data to DynamoDB.
- In DynamoDB, a partition supports up to 3,000 RCUs and 1,000 WCUs. A low-cardinality partition key (a date, a status) creates a **hot partition** and throttling; add a random or calculated suffix to the key (write sharding) or choose a key with many distinct values.

> **Exam trap.** Adding read replicas to an RDS instance that is CPU-bound by INSERT and UPDATE statements doesn't help. The writer must grow, or the write path must change.

<!-- section: capacity-planning | objectives: 3.3.4 -->
## Database capacity planning

**DynamoDB capacity units**

| Unit | Definition |
| --- | --- |
| 1 RCU | 1 strongly consistent read per second, or 2 eventually consistent reads per second, for an item up to 4 KB |
| 1 WCU | 1 write per second for an item up to 1 KB |
| Transactional read / write | 2 RCUs per 4 KB read / 2 WCUs per 1 KB write |

Sizes round up: reading a 6 KB item strongly consistent costs 2 RCUs; writing a 1.5 KB item costs 2 WCUs. Example: 100 strongly consistent reads per second of 9 KB items = 100 × 3 = 300 RCUs; eventually consistent = 150 RCUs.

| Mode | Behavior | Choose when |
| --- | --- | --- |
| On-demand | Pay per request, instantly accommodates up to double the previous peak | Default; new, unknown or spiky traffic; tables idle for long periods |
| Provisioned with auto scaling | Pay for provisioned RCUs/WCUs per hour, auto scaling tracks a target utilization (70 % recommended) | Predictable, steady traffic; with reserved capacity for lower cost |

You can switch a table from provisioned to on-demand up to four times in a rolling 24 hours, and back to provisioned at any time.

**Relational capacity**

- **Instance classes**: db.m (general purpose), db.r and db.x (memory optimized, for large working sets and caches), db.t (burstable, dev/test and light workloads). Graviton classes (letter `g`) give better price performance.
- **RDS storage**: General Purpose SSD (gp3, baseline IOPS and throughput included, more provisioned separately) or **Provisioned IOPS SSD** (io2 Block Express, io1) for I/O-intensive production databases with consistent low latency. **Storage autoscaling** grows allocated storage when free space runs low.
- **Aurora**: storage is automatic (cluster volume up to 128 TiB, or 256 TiB on recent engine versions); you size the instances. **Aurora I/O-Optimized** has no charge per I/O and is the best choice when I/O is 25 % or more of Aurora spend; **Aurora Standard** below 25 %.
- **Aurora Serverless v2**: capacity in ACUs (each about 2 GiB of memory with CPU and networking), from 0 (auto-pause on supported versions) up to 256 ACUs (Aurora MySQL) or 384 ACUs (Aurora PostgreSQL), in steps as small as 0.5 ACU. Serverless and provisioned instances can be mixed in one cluster.

> **Exam trap.** Throttling on a DynamoDB table whose total provisioned capacity is far from consumed usually means a hot partition, not too little capacity: fix the key design.

<!-- section: engine-choice | objectives: 3.3.11 -->
## Choosing a database engine

| Requirement | Engine |
| --- | --- |
| Widely used open-source engine for web applications, simple read-heavy queries, existing MySQL code | MySQL (RDS for MySQL or Aurora MySQL) |
| MySQL fork already used by the application | MariaDB (RDS for MariaDB) |
| Advanced SQL, complex queries, rich data types (JSONB, arrays), extensions such as PostGIS for geospatial data | PostgreSQL (RDS for PostgreSQL or Aurora PostgreSQL) |
| Oracle-specific features such as PL/SQL packages, existing Oracle licenses | RDS for Oracle (Bring Your Own License or License Included) |
| Microsoft SQL Server, T-SQL, Windows-authenticated applications | RDS for SQL Server; or Aurora PostgreSQL with Babelfish to run many T-SQL queries on PostgreSQL |
| IBM Db2 workloads | RDS for Db2 |
| Leave commercial licensing | Migrate to Aurora PostgreSQL or Aurora MySQL (heterogeneous migration) |

- Choose **Aurora** over RDS for the same open-source engine when the stem asks for higher throughput, faster failover, up to 15 low-lag replicas, Global Database or automatic storage growth.
- Choose **RDS** when the exact engine version, an unsupported extension or the lowest cost for a small database matters.

> **Exam tip.** When the stem names an engine feature (PostGIS, Oracle PL/SQL, T-SQL), the engine is decided by the feature. The rest of the question decides RDS versus Aurora.

<!-- section: migrations | objectives: 3.3.6 -->
## Homogeneous and heterogeneous migrations

| Migration | Example | Tools |
| --- | --- | --- |
| Homogeneous (same engine) | On-premises MySQL to RDS for MySQL or Aurora MySQL; PostgreSQL to Aurora PostgreSQL | Native tools (dump and restore, native backups such as SQL Server `.bak` files from S3, Aurora from an RDS snapshot or a read replica), or AWS DMS for full load plus ongoing replication |
| Heterogeneous (different engine) | Oracle or SQL Server to Aurora PostgreSQL; SQL Server to Aurora MySQL | Convert the schema and code with **DMS Schema Conversion** (managed, built on the AWS SCT engine, with generative AI assistance for some paths) or AWS SCT; then move the data with **AWS DMS** |
| Minimal downtime | Any | AWS DMS full load + **change data capture (CDC)**, then cut over when the target is in sync |
| Into analytics | OLTP to Redshift | AWS DMS to Redshift (Oracle schemas convert with DMS Schema Conversion) |

- DMS migrates **data** only: tables, rows, ongoing changes. Secondary indexes, stored procedures, triggers and views are schema objects: convert them with DMS Schema Conversion or SCT.
- The source stays online during a DMS migration; a replication instance (or DMS Serverless) runs the task.

> **Exam trap.** "Migrate Oracle to Aurora PostgreSQL" with DMS alone is incomplete: the schema conversion step comes first. For MySQL to Aurora MySQL, no schema conversion is needed.

<!-- section: database-architectures | objectives: 3.3.10 -->
## Designing database architectures

| Requirement | Architecture |
| --- | --- |
| High availability in one Region, no read scaling | RDS Multi-AZ DB instance (synchronous standby, not readable) |
| High availability plus readable standbys, lower write latency | RDS Multi-AZ DB cluster (one writer, two readable readers in three AZs; MySQL and PostgreSQL) |
| Read scaling and fast failover on a shared volume | Aurora cluster with replicas in several AZs, reader endpoint, Aurora Auto Scaling |
| Global reads with local latency and Regional DR for relational data | Aurora Global Database (up to 10 secondary Regions, replication typically under a second) |
| Multi-Region writes, key-value | DynamoDB global tables |
| Many short-lived connections (Lambda) | RDS Proxy in front of RDS or Aurora |
| Hot reads | ElastiCache or DAX in front |
| Microservices each with their own data | One purpose-built database per service (polyglot persistence) |

Put databases in **private subnets**, spread across AZs with a DB subnet group, accessed through security groups that allow only the application tier. Design for the pattern: cache for repeated reads, replicas for read scale, a queue for write spikes, a warehouse for analytics.

> **Exam tip.** Separate the reporting load from the OLTP load: an Aurora Replica with a custom endpoint for reports, or Redshift fed by DMS or zero-ETL integration, keeps the transactional writer fast.

<!-- section: key-points -->
## Key points

- One purpose-built database per access pattern: relational (RDS, Aurora), key-value (DynamoDB), document (DocumentDB), graph (Neptune), wide-column (Keyspaces), in-memory (ElastiCache, MemoryDB), warehouse (Redshift).
- Read-heavy: caches and replicas. Write-heavy: bigger writer, sharding, DynamoDB with a good partition key, SQS buffer.
- RCU = 4 KB strongly consistent read (2 eventually consistent); WCU = 1 KB write; transactions cost double. On-demand by default; provisioned with auto scaling for steady traffic.
- PostgreSQL for advanced SQL and PostGIS, MySQL for widespread web workloads; Aurora when performance, replicas and failover matter.
- Homogeneous: native tools or DMS. Heterogeneous: DMS Schema Conversion or SCT, then DMS with CDC.
