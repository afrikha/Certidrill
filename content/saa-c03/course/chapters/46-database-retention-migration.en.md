Once the engine is chosen, a database's running cost depends on how many reads a cache keeps away from it, how connections reach it, how many copies run and where, and how long backups and old data are kept. Migration questions add one more decision: which tool moves the schema and the data with the least effort.

<!-- section: caching-strategies | objectives: 4.3.3 -->
## Caching strategies

A cache saves money when it lets you run a smaller instance, fewer read replicas or fewer read capacity units. Pick the layer closest to the user that can serve the data:

| Layer | Caches | Typical requirement |
| --- | --- | --- |
| Amazon CloudFront | HTTP responses at edge locations | Static or cacheable content for users worldwide |
| API Gateway caching (REST APIs) | Responses of an API stage, default TTL 300 seconds, maximum 3,600 | Same API calls repeated, fewer backend invocations |
| Amazon ElastiCache (Valkey, Redis OSS, Memcached) | Query results, sessions, computed objects | Relational database overloaded by repeated reads, sub-millisecond latency |
| DynamoDB Accelerator (DAX) | DynamoDB items and query results | Microsecond reads on DynamoDB with minimal code change |
| Read replicas | A full readable copy | Many different queries that a key-value cache cannot serve |

How the application fills the cache decides freshness and cost:

| Strategy | How it works | Strength | Weakness |
| --- | --- | --- | --- |
| Lazy loading (cache-aside) | Read the cache; on a miss read the database and write the result to the cache | Only requested data is cached; a failed node only adds latency | Each miss costs three trips; data can be stale |
| Write-through | Every database write also updates the cache | Cached data is never stale | Data missing until written; cache churn with data nobody reads |
| TTL on every key | The key expires after a set time, then is reloaded | Limits staleness and frees memory | Expiry causes a burst of misses |

Combine them: lazy loading for misses, write-through for data that changes often, and a TTL on every write so that unread data does not fill the cache.

ElastiCache cost levers:

- **Valkey** is priced lower than the other engines: 33 % lower on ElastiCache Serverless and 20 % lower on node-based clusters. Serverless Valkey also has a 100 MB minimum metered storage per cache instead of 1 GB.
- **ElastiCache Serverless** bills data stored (GB-hours) and ElastiCache Processing Units (ECPUs), with no capacity planning. It suits spiky or unknown traffic.
- **Node-based clusters** suit steady traffic: **reserved nodes** (1 or 3 years, size flexible) cut the hourly price, and **data tiering** on r6gd nodes moves less-used items to SSD for large datasets. Neither reserved nodes nor data tiering applies to Serverless.

DAX is API-compatible with DynamoDB and serves **eventually consistent** reads in microseconds: the cost answer for read-heavy, hot-key workloads that would otherwise need more read capacity. It is wrong for strongly consistent reads, write-heavy tables or few repeated reads (it performs best above a 90 % cache hit rate).

> **Exam trap.** A cache does not help a write-heavy workload or one that requires strongly consistent reads. When the stem says "reads must always return the latest data", eliminate DAX and lazy-loaded caches without write-through.

<!-- section: connections-proxies | objectives: 4.3.6 -->
## Database connections and proxies

Every open connection uses memory and CPU on the database instance. Applications that open many short connections, typically AWS Lambda functions scaling out, can exhaust the connection limit. **Amazon RDS Proxy** fixes this without a bigger instance:

- It keeps a **connection pool** and reuses connections, queues or throttles requests it cannot serve immediately, and rejects connections beyond the limits you set (load shedding).
- It reconnects to a standby automatically during a failover while preserving application connections.
- Clients can be forced to use **IAM authentication**; the proxy reaches the database with credentials stored in **AWS Secrets Manager** or with IAM database authentication. Most applications need no code change: only the endpoint changes.
- It runs in the same VPC as the database and **can't be publicly accessible**. In an RDS replication configuration it is associated with the writer DB instance, not a read replica.
- Supported with Aurora and with RDS for MySQL, PostgreSQL, MariaDB and SQL Server.
- Price: per vCPU-hour of the underlying provisioned instance, or per Aurora Capacity Unit (ACU) for Aurora Serverless.

**Pinning** (for example after a statement larger than 16 KB) ties a session to one database connection and reduces the benefit.

Aurora also routes connections without a proxy: the **cluster endpoint** reaches the writer, the **reader endpoint** spreads read-only connections across Aurora Replicas.

| Requirement | Answer |
| --- | --- |
| Lambda functions exhaust database connections | RDS Proxy in front of the DB instance or Aurora cluster |
| Database credentials must not be in the code | RDS Proxy with Secrets Manager, IAM authentication for clients |
| Spread reads across Aurora Replicas | Aurora reader endpoint |

> **Exam tip.** "Too many connections" errors with low CPU utilization point to RDS Proxy. Scaling the instance up works but costs more and is rarely the MOST cost-effective option.

<!-- section: read-replicas | objectives: 4.3.8 -->
## Read replicas and their cost

An RDS **read replica** receives changes **asynchronously** and accepts read-only connections. It is billed as a standard DB instance of its own class, so each replica must save more than it costs.

| Fact | Detail |
| --- | --- |
| Quota | 15 read replicas per primary DB instance (RDS for Oracle: up to 15, 5 recommended to limit lag) |
| Same-Region replication | No charge for the data transferred between source and replica |
| Cross-Region replication | Data transfer out of the source Region is charged, for the initial snapshot and every change |
| Replica of a replica | RDS for MySQL, MariaDB and some PostgreSQL versions; not Oracle, SQL Server or Db2 |
| Promotion | A replica can be promoted to a standalone DB instance (cross-Region disaster recovery) |
| Multi-AZ standby | Synchronous, serves **no** reads; it is for availability, not read scaling |

To reduce cross-Region charges for MySQL and MariaDB, create **one** replica in the remote Region from the source and the others from that replica: only the first transfer crosses Regions.

**Aurora Replicas** (up to 15 per cluster) share the cluster volume, so a replica adds compute but no copy of the storage, and lag is usually well under 100 ms. For other Regions, Aurora offers Aurora Global Database and, for Aurora MySQL, binlog-based cross-Region replicas.

| Requirement | Answer |
| --- | --- |
| Reporting queries slow down the production database | One read replica for the reporting tool |
| Survive an Availability Zone failure | Multi-AZ (not a read replica) |
| Readable copy in another Region at the lowest transfer cost (MySQL) | One cross-Region replica, other replicas chained from it |
| Many replicas without paying for extra storage copies | Aurora Replicas |

> **Exam trap.** Read replicas are asynchronous: an application that must read its own writes immediately has to read from the primary. And a Multi-AZ standby is not a free read replica: it can't serve read traffic.

<!-- section: retention-policies | objectives: 4.3.4 -->
## Data retention policies

Keeping old rows in a provisioned database is the most expensive option: move them to cheaper storage or let them expire.

| Requirement | Design |
| --- | --- |
| Delete DynamoDB items (sessions, events) after a period at no write cost | DynamoDB **Time to Live (TTL)** |
| Keep expired DynamoDB items for audit | TTL plus DynamoDB Streams and a Lambda function that writes the deleted items to Amazon S3 |
| Keep years of RDS or Aurora data for analysis, rarely queried | Export the snapshot to Amazon S3 (Parquet) and query it with Amazon Athena |
| Table where storage is the dominant cost (order history, logs) | DynamoDB Standard-IA table class |
| Keep a database copy beyond the automated backup window | Manual snapshot, which never expires |
| Backups nobody may delete before the end of retention | AWS Backup Vault Lock |

**DynamoDB TTL** facts: the attribute is a Number holding a Unix epoch time in seconds; expired items are deleted **within a few days**, not at the exact second; until then they still appear in reads (filter them out); TTL deletions consume no write throughput. In global tables, the replica deletes consume replicated write capacity.

**RDS snapshot export to S3** writes compressed Apache Parquet files without affecting the database, from manual, automated or AWS Backup snapshots. Exported data can't be restored into a DB instance: it is for analytics and archiving. Once in S3, an S3 Lifecycle rule can move it to an S3 Glacier storage class.

> **Exam trap.** TTL is not a scheduler. If items must disappear at an exact time, TTL alone does not meet the requirement; if "within a few days" is acceptable, TTL is the cheapest and least operational answer.

<!-- section: backup-policies | objectives: 4.3.10 -->
## Backup frequency and retention

Backup frequency follows the recovery point objective (RPO); retention follows the legal or business requirement.

| Service | Automated backups | Retention | Notes |
| --- | --- | --- | --- |
| Amazon RDS (DB instance) | Daily snapshot during the backup window plus transaction logs, point-in-time restore | 0–35 days; 7 by default in the console, 1 with the API or CLI | 0 disables automated backups (and changing to or from 0 causes an outage) |
| Amazon Aurora | Continuous and incremental, no performance impact | 1–35 days, default 1 | Automated backups can't be disabled |
| Amazon DynamoDB | Point-in-time recovery (PITR), per-second granularity | Recovery period 1–35 days, default 35 | Price based on table size; shortening the period doesn't lower it |
| Any of them | Manual snapshot or on-demand backup | Until you delete it | 100 manual DB snapshots per Region by default for RDS |

RDS gives **free backup storage equal to 100 % of the provisioned database storage** in each Region; beyond that, backup storage is billed. Automated backups are deleted with the DB instance unless you choose **Retain automated backups**; final and manual snapshots are independent.

**AWS Backup** centralizes the policy for many services in **backup plans**:

- Frequency: every hour, every 12 hours, daily, weekly, monthly or a cron expression. **Continuous backups** (PITR) for supported resources such as RDS, Aurora and S3 are kept 1–35 days.
- Snapshot retention: 1 day to 100 years, or indefinite.
- **Cold storage** lifecycle for supported types only (EBS, EFS, DynamoDB with advanced features, Timestream, among others, not RDS or Aurora): a backup must stay at least **90 days** in cold storage, so the retention must be at least 90 days longer than the transition setting.
- Copies to another Region or account for disaster recovery.
- **Vault Lock** for write-once, read-many backups: governance mode can be changed with sufficient IAM permissions; compliance mode becomes immutable, even for the root user and AWS, after a grace time of at least 3 days.

Aurora MySQL also offers **Backtrack**, which rewinds a cluster to a time within a window of up to 72 hours without a restore. It must be enabled when the cluster is created or restored, is billed for the change records kept, and is not a replacement for backups.

> **Exam trap.** A requirement to keep backups for 7 years does not mean 7 years of automated backups: automated retention stops at 35 days. Use AWS Backup with long retention (and cold storage where supported), or manual snapshots, or snapshot export to S3.

<!-- section: migration | objectives: 4.3.14 -->
## Migrating schemas and data

A **homogeneous** migration keeps the engine (Oracle to RDS for Oracle, PostgreSQL to Aurora PostgreSQL); a **heterogeneous** migration changes it (Oracle to Aurora PostgreSQL, SQL Server to Aurora MySQL) and needs a schema conversion first.

| Tool | Role |
| --- | --- |
| AWS Database Migration Service (AWS DMS) | Moves the data: full load, ongoing replication (change data capture, CDC), or full load plus ongoing replication, while the source stays in use |
| DMS homogeneous data migrations | Like-to-like migrations to RDS or Aurora with the engine's native tools, serverless |
| DMS Schema Conversion | Managed, free-to-use schema assessment and conversion (tables, indexes, views, triggers) to the new engine; you pay only for the S3 storage it uses |
| AWS Schema Conversion Tool (AWS SCT) | The downloadable alternative for schema conversion on your own computer |
| AWS DMS Serverless | Capacity scales automatically from 1 to 384 DMS capacity units (DCUs), no replication instance to size |

Order of operations for a heterogeneous migration: assess and convert the schema (DMS Schema Conversion or AWS SCT), apply it to the target, run a DMS full load with CDC, then cut over when replication has caught up.

Other low-effort paths: an Aurora read replica of an RDS for MySQL or PostgreSQL instance, then promoted; or a snapshot copied to another Region and restored. Data transfer into AWS DMS is free, and so is transfer between DMS and an RDS or EC2 instance in the same Availability Zone; across Availability Zones or Regions, standard rates apply.

| Requirement | Answer |
| --- | --- |
| Oracle to Aurora PostgreSQL with minimal downtime | DMS Schema Conversion, then DMS full load plus CDC |
| On-premises PostgreSQL to Aurora PostgreSQL, least effort | DMS homogeneous data migration |
| RDS for MySQL to Aurora MySQL, minimal downtime | Aurora read replica, then promote |
| Unpredictable migration volume, no instance sizing | AWS DMS Serverless |

> **Exam trap.** AWS DMS doesn't convert the schema of a heterogeneous migration on its own. "Different engine" in the stem means a schema conversion step (DMS Schema Conversion or AWS SCT) before the data migration.

<!-- section: key-points -->
## Key points

- Cache to shrink the database: lazy loading plus write-through plus TTL; Valkey is the cheapest ElastiCache engine; DAX only for eventually consistent DynamoDB reads.
- RDS Proxy pools connections for Lambda-heavy applications without a larger instance; it is private and attaches to the writer.
- Same-Region read replica traffic is free, cross-Region is charged; chain MySQL and MariaDB replicas in the remote Region. Multi-AZ standbys serve no reads.
- DynamoDB TTL deletes for free within a few days; snapshot export to S3 Parquet keeps old data for Athena.
- Automated backups stop at 35 days; long retention needs AWS Backup, manual snapshots or S3. Cold storage: 90-day minimum, not for RDS or Aurora.
- Heterogeneous migration = schema conversion, then DMS full load plus CDC.
