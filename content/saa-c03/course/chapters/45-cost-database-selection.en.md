The cheapest database is the one whose data model, engine and capacity model fit the workload, so that you neither pay for idle capacity nor for licenses and features you do not use. Exam questions give an access pattern, a data shape, a traffic profile or a licensing constraint and ask for the database type, service, engine, capacity mode or commitment that meets it most cost-effectively.

<!-- section: database-types | objectives: 4.3.9, 4.3.13 -->
## Database types and AWS services

| Data model | Service | Choose it for |
| --- | --- | --- |
| Relational (SQL, joins, transactions) | Amazon RDS (MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, Db2), Amazon Aurora (MySQL- and PostgreSQL-compatible) | Structured data with relationships, ad hoc queries, existing SQL applications |
| Key-value and document, serverless | Amazon DynamoDB | Known access patterns by key, any scale, single-digit millisecond latency, variable traffic |
| Document (MongoDB-compatible) | Amazon DocumentDB | JSON documents and MongoDB drivers |
| Wide-column (Apache Cassandra-compatible), serverless | Amazon Keyspaces | Cassandra workloads without managing clusters |
| Graph | Amazon Neptune | Highly connected data: social networks, fraud rings, recommendations, knowledge graphs |
| In-memory | Amazon ElastiCache (Valkey, Redis OSS, Memcached) | Caching, sessions, leaderboards, sub-millisecond reads |
| Time series | Amazon Timestream for InfluxDB | Metrics, IoT and telemetry data indexed by time |
| Columnar data warehouse | Amazon Redshift (provisioned RA3 or Redshift Serverless) | Analytical SQL over large historical datasets, aggregations, BI |
| Search | Amazon OpenSearch Service | Full-text search, log analytics |

**Columnar formats save money twice.** A columnar store (Redshift) or a columnar file format (Apache Parquet or ORC in S3, queried with Athena or Redshift Spectrum) reads only the columns a query needs and compresses well. Athena bills by data scanned, so converting CSV to partitioned Parquet directly cuts the bill. An analytical query workload on a row-oriented OLTP database (RDS) is a classic cost and performance mistake.

**Time series.** Timestream for LiveAnalytics no longer accepts new customers (since June 20, 2025); AWS recommends Timestream for InfluxDB for new time series workloads. A relational table with a timestamp column works for small volumes but becomes expensive to query and retain at IoT scale.

> **Exam trap.** "Purpose-built" is the default answer when the data shape is explicit: graph traversals are Neptune, not RDS with recursive queries; petabyte-scale analytics are Redshift, not a larger RDS instance; key lookups at massive scale are DynamoDB, not Aurora with many replicas.

<!-- section: dynamodb-vs-rds | objectives: 4.3.12, 4.3.9 -->
## DynamoDB, RDS, Aurora and serverless options

| Requirement | Most cost-effective choice |
| --- | --- |
| Simple key lookups, unpredictable or spiky traffic, no servers to manage | DynamoDB on-demand |
| Steady, predictable key-value traffic | DynamoDB provisioned with auto scaling, plus reserved capacity |
| Large table rarely read (old orders, logs) where storage dominates cost | DynamoDB Standard-IA table class |
| Joins, complex SQL, referential integrity, existing SQL application | RDS or Aurora |
| Relational database idle most of the day or used intermittently (dev, test, internal tools) | Aurora Serverless v2 with a minimum of 0 ACUs (auto-pause) |
| Relational, I/O-intensive, I/O at 25 % or more of Aurora spend | Aurora I/O-Optimized cluster storage |
| Relational, moderate I/O | Aurora Standard (pay per million I/O requests) |
| Small steady relational workload, cheapest | Single-AZ RDS on a small instance (Multi-AZ only if availability is required) |
| Occasional analytics with idle periods | Redshift Serverless (billed per second of RPU use, 60-second minimum) |

Serverless options and their capacity units:

| Service | Capacity unit | Notes |
| --- | --- | --- |
| DynamoDB on-demand | Read and write request units | Default and recommended mode for most workloads; pay per request |
| Aurora Serverless v2 | ACU (about 2 GiB of memory plus CPU and networking) | 0 to 256 ACUs (Aurora MySQL) or up to 384 (Aurora PostgreSQL) depending on version; scales in 0.5-ACU steps; can mix with provisioned instances in one cluster |
| Redshift Serverless | RPU (16 GB of memory) | Base capacity 4 to 512 RPUs (default 128); maximum capacity and RPU-hour limits cap spend |
| Keyspaces | On-demand (default) or provisioned | Serverless Cassandra |

More cost levers:

- **DynamoDB TTL** deletes expired items without consuming write capacity.
- **Aurora** bills storage only for space used (the cluster volume grows automatically, up to 256 TiB depending on version) and replicates six copies across three AZs without extra charge for that replication.
- You can switch Aurora Standard to I/O-Optimized once every 30 days, and back at any time.

> **Exam trap.** Aurora Serverless v2 is not cheaper for a database that is busy 24/7: steady load costs less on provisioned instances with Reserved Instances or Database Savings Plans. Serverless wins when load is variable or the database is often idle.

<!-- section: capacity-planning | objectives: 4.3.5 -->
## Database capacity planning

**DynamoDB units:**

| Operation | One unit covers |
| --- | --- |
| Strongly consistent read | 1 read per second of an item up to 4 KB (1 RCU) |
| Eventually consistent read | 2 reads per second of items up to 4 KB (1 RCU) |
| Transactional read | Needs 2 RCUs per item up to 4 KB |
| Standard write | 1 write per second of an item up to 1 KB (1 WCU) |
| Transactional write | Needs 2 WCUs per item up to 1 KB |

Item sizes round up: reads to the next 4 KB, writes to the next 1 KB.

```text
Reads: 200 items/s of 6 KB, strongly consistent
  6 KB rounds up to 8 KB = 2 RCU per read  -> 200 x 2 = 400 RCU
  eventually consistent                   -> 400 / 2 = 200 RCU
Writes: 100 items/s of 2.5 KB
  2.5 KB rounds up to 3 KB = 3 WCU per write -> 100 x 3 = 300 WCU
  transactional writes                       -> 300 x 2 = 600 WCU
```

Choosing the capacity mode:

| Traffic | Mode |
| --- | --- |
| New table, unknown or spiky traffic, pay only for use | On-demand |
| Steady, forecastable traffic with gradual growth | Provisioned with auto scaling (target utilization 70 % recommended) |
| Steady baseline you will keep for a year or more | Provisioned plus reserved capacity (Standard table class only, 1 or 3 years, partial upfront, in 100-unit blocks, one Region) |

- Provisioned capacity is billed per hour for what you provision, used or not.
- A table can switch from provisioned to on-demand up to four times in a rolling 24 hours, and from on-demand to provisioned at any time.
- Query results are summed then rounded to 4 KB; a Scan consumes capacity for every item it evaluates, not only those it returns: prefer Query with a good key design.

**Relational capacity**: size the instance class (memory for the working set, vCPU for concurrency), use storage auto scaling rather than over-allocating storage, and add read replicas or a cache before scaling the writer up. Aurora Serverless v2 replaces instance sizing with a minimum and maximum ACU range.

> **Exam trap.** On-demand is not always the cheapest DynamoDB mode: for a table with high, flat traffic around the clock, provisioned capacity with reserved capacity costs less. On-demand wins for spiky, unpredictable or low traffic.

<!-- section: engines | objectives: 4.3.7, 4.3.11 -->
## Choosing a database engine

| Need | Engine |
| --- | --- |
| Simple web application, read-heavy, broad tool and hosting compatibility | MySQL (or MariaDB, a MySQL fork) |
| Complex queries, advanced data types (JSONB, arrays), extensions such as PostGIS, strict SQL standards | PostgreSQL |
| Higher performance and availability than community engines with the same compatibility | Aurora MySQL or Aurora PostgreSQL |
| Application that depends on Oracle or SQL Server features, cannot be changed | RDS for Oracle or RDS for SQL Server |
| SQL Server application moving to an open-source engine with fewer code changes | Aurora PostgreSQL with Babelfish (understands T-SQL and the SQL Server wire protocol) |

Licensing drives cost for commercial engines:

- **License Included**: the license is in the hourly price (RDS for SQL Server; RDS for Oracle Standard Edition 2).
- **Bring Your Own License (BYOL)**: reuse existing licenses (RDS for Oracle; EC2 Dedicated Hosts for per-socket or per-core licenses).
- Moving from a commercial engine to MySQL, PostgreSQL or Aurora removes license fees, which is often the largest saving in a migration question.

Migrations by type:

| Type | Example | Tools |
| --- | --- | --- |
| Homogeneous | MySQL on premises → RDS for MySQL or Aurora MySQL; PostgreSQL → Aurora PostgreSQL | Native tools (dump and restore, native replication) or AWS DMS; no schema conversion |
| Heterogeneous | Oracle or SQL Server → Aurora PostgreSQL; SQL Server → Aurora MySQL | Convert the schema and code first with **DMS Schema Conversion** (managed, built on the AWS SCT engine) or AWS SCT, then move the data with **AWS DMS** |

DMS Schema Conversion converts schemas, views, procedures and functions only, not data; its assessment report shows what needs manual work.

> **Exam trap.** Heterogeneous migration always needs two steps: schema conversion (DMS Schema Conversion or SCT), then data migration (DMS). DMS alone moves data but does not convert stored procedures or engine-specific code.

<!-- section: db-cost-tools | objectives: 4.3.1, 4.3.2 -->
## Cost management features and tools for databases

**Commitments**

| Option | Covers | Key facts |
| --- | --- | --- |
| RDS and Aurora reserved DB instances | One instance class in one Region and engine | 1 or 3 years; No Upfront (1 year only), Partial Upfront or All Upfront; size flexibility for MySQL, MariaDB, PostgreSQL, Db2 and Oracle BYOL, not for SQL Server or Oracle License Included; applies to Single-AZ and Multi-AZ |
| Database Savings Plans | Aurora, RDS, DynamoDB, ElastiCache, DocumentDB, Neptune, Keyspaces, Timestream, DMS, OpenSearch Service | Up to 35 %; 1 year, No Upfront; any engine, family, size, AZ, Region, including serverless usage; cannot be combined with RIs or DynamoDB reserved capacity on the same usage |
| DynamoDB reserved capacity | Provisioned RCUs and WCUs, Standard table class | 1 year (3 years in some Regions), cannot be cancelled or moved |
| ElastiCache and Redshift reserved nodes, OpenSearch Service Reserved Instances | Nodes or instances of a type | 1 or 3 years |

Choose Database Savings Plans when engines, sizes or Regions will change or serverless usage must be covered; choose reserved DB instances for a stable instance class where a 3-year term gives a larger discount.

**Features and tools**

- **Cost allocation tags** on DB instances, clusters and tables (activated in Billing) split database spend by application, environment or cost center; consolidated billing shares reservations across the organization.
- **Cost Explorer**: group by service and usage type to see, for example, Aurora I/O charges (to justify I/O-Optimized), backup storage or data transfer; RI and Savings Plans purchase recommendations and coverage.
- **AWS Budgets**: alert on database spend, or on RI or Savings Plans utilization and coverage dropping below a target.
- **AWS Cost and Usage Report**: per-resource line items to attribute each DB instance's cost.
- **AWS Compute Optimizer**: right-sizing recommendations for RDS and Aurora instances and DynamoDB, among others.
- Non-production databases: stop RDS instances when unused (up to 7 days at a time), or use Aurora Serverless v2 with auto-pause.

> **Exam tip.** "Reduce cost of an always-on production RDS instance that will run for three years without change" is a 3-year reserved DB instance; "commit to database spend while migrating from RDS to Aurora and DynamoDB" is a Database Savings Plan.

<!-- section: key-points -->
## Key points

- Match the data model: relational (RDS, Aurora), key-value (DynamoDB), document (DocumentDB), wide-column (Keyspaces), graph (Neptune), in-memory (ElastiCache), time series (Timestream for InfluxDB), columnar analytics (Redshift, Parquet with Athena).
- DynamoDB for key access at any scale; RDS or Aurora for SQL and joins; serverless (DynamoDB on-demand, Aurora Serverless v2, Redshift Serverless) for variable or idle workloads.
- RCU = 4 KB strongly consistent read per second (half for eventually consistent, double for transactional); WCU = 1 KB write per second (double for transactional); sizes round up.
- On-demand for unknown or spiky traffic, provisioned with auto scaling and reserved capacity for steady traffic; Standard-IA table class when storage dominates.
- Aurora I/O-Optimized when I/O is 25 % or more of Aurora spend.
- MySQL for simple web workloads, PostgreSQL for advanced features; open-source engines remove license costs; heterogeneous migration = schema conversion then DMS.
- Commitments: reserved DB instances, Database Savings Plans (1 year, up to 35 %), DynamoDB reserved capacity; tags, Cost Explorer, Budgets and the Cost and Usage Report track the spend.
