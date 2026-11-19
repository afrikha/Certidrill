AWS follows a purpose-built approach: one managed database for each kind of data and access pattern, instead of one database for everything. The exam asks you to recognize relational, NoSQL and in-memory databases, to decide between a database you run on Amazon EC2 and an AWS managed database, and to name the tools that migrate a database to AWS.

<!-- section: database-services | objectives: 3.4.1 -->
## AWS database services

| Data and access pattern | Service | Examples of use |
| --- | --- | --- |
| Relational (SQL, tables, joins, transactions) | **Amazon RDS**, **Amazon Aurora** | Orders, accounting, ERP and CRM applications |
| Key-value and document, any scale | **Amazon DynamoDB** | Shopping carts, user sessions, gaming, IoT |
| In-memory cache or data store | **Amazon ElastiCache** | Caching database query results, session stores, leaderboards |
| JSON documents, MongoDB compatibility | **Amazon DocumentDB (with MongoDB compatibility)** | Content catalogs, user profiles |
| Graph (nodes and relationships) | **Amazon Neptune** | Social networks, fraud detection, recommendations |
| Data warehouse (analytics on large data sets) | **Amazon Redshift** | Business intelligence and reporting over terabytes |

> **Exam tip.** Read the shape of the data first: "relational" or "SQL" means RDS or Aurora; "key-value", "flexible schema" or "millions of requests per second" means DynamoDB; "relationships" means Neptune; "analytics on historical data" means Redshift.

<!-- section: ec2-or-managed | objectives: 3.4.3 -->
## EC2-hosted databases or AWS managed databases

| | Database on Amazon EC2 | AWS managed database (RDS, Aurora, DynamoDB...) |
| --- | --- | --- |
| Operating system, installation, patching | Customer | AWS |
| Backups, high availability, scaling | Customer configures and operates them | Built-in options (automated backups, Multi-AZ, read replicas) |
| Access to the OS and full configuration | Yes | No OS access |
| Data, schema, access control, query tuning | Customer | Customer |

Choose **EC2** when you need full control of the operating system or the database software, a database engine or version that the managed services don't offer, or a configuration they don't allow. Choose a **managed database** to reduce operational overhead: AWS handles hardware, OS and database software patching, backups, failover and scaling options, so the team focuses on the application.

> **Exam trap.** "With the LEAST operational overhead" or "without managing servers" never points to a database installed on EC2. "Requires access to the underlying operating system" rules out RDS.

<!-- section: relational | objectives: 3.4.4 -->
## Relational databases: Amazon RDS and Amazon Aurora

**Amazon RDS** is a managed relational database service. Supported engines: **IBM Db2, MariaDB, Microsoft SQL Server, MySQL, Oracle Database and PostgreSQL**. AWS manages provisioning, OS and database patching, automated backups and hardware; you are responsible for query tuning and your data.

| Feature | Purpose |
| --- | --- |
| **Multi-AZ deployment** | A standby in another Availability Zone with automatic failover: high availability |
| **Read replicas** | Copies that serve read traffic: read scaling; can be in another Region |
| Automated backups and snapshots | Restore the database to a point in time |

**Amazon Aurora** is part of Amazon RDS: a fully managed relational engine **compatible with MySQL and PostgreSQL**, with a distributed storage layer that grows automatically as needed (up to 256 TiB per cluster volume). It is the choice for high performance and availability with MySQL or PostgreSQL applications, without changing their code.

> **Exam trap.** Aurora is not a separate engine family like Oracle or SQL Server: it supports only MySQL and PostgreSQL compatibility. An Oracle database moves to RDS for Oracle (same engine) or is converted to Aurora PostgreSQL (different engine).

<!-- section: nosql | objectives: 3.4.5 -->
## NoSQL databases: Amazon DynamoDB

**Amazon DynamoDB** is a serverless, fully managed NoSQL database for key-value and document data:

- Single-digit millisecond performance at any scale; no servers, patching or capacity planning (on-demand capacity mode).
- Data replicated across multiple Availability Zones of the Region automatically.
- Flexible schema: each item can have different attributes; items are read by their key.
- **Global tables** replicate a table to several Regions, readable and writable in each.
- **DynamoDB Accelerator (DAX)**: an in-memory cache for DynamoDB that serves reads in microseconds.

Other NoSQL services: Amazon DocumentDB for JSON documents with MongoDB compatibility, Amazon Neptune for graphs.

> **Exam tip.** "Serverless database", "unpredictable traffic at massive scale" or "key-value" points to DynamoDB; complex joins and SQL transactions across tables point to a relational database.

<!-- section: in-memory | objectives: 3.4.6 -->
## Memory-based databases: Amazon ElastiCache

**Amazon ElastiCache** is a managed, distributed **in-memory** data store and cache, compatible with **Valkey, Memcached and Redis OSS**. It is available as **ElastiCache Serverless** (no nodes to provision, scales automatically) or as node-based clusters across Availability Zones.

- Put it in front of a database to serve repeated reads from memory, much faster than from disk, and reduce the load on the database.
- Store user sessions, leaderboards and other data that need very fast access.

> **Exam trap.** A cache speeds up repeated reads; it is not the system of record. "Improve read performance of a relational database for frequently requested data" is ElastiCache (or read replicas), not a second RDS database.

<!-- section: migration | objectives: 3.4.2, 3.4.7 -->
## Database migration tools

| Migration | Example | Tools |
| --- | --- | --- |
| **Homogeneous** (same engine) | MySQL on premises to RDS for MySQL or Aurora MySQL | AWS DMS (or the engine's native tools) |
| **Heterogeneous** (different engine) | Oracle to Aurora PostgreSQL; SQL Server to Aurora MySQL | AWS SCT or DMS Schema Conversion to convert the schema and code, then AWS DMS to move the data |

- **AWS Database Migration Service (AWS DMS)** migrates data to AWS databases. The **source database stays fully operational** during the migration, which minimizes downtime; ongoing replication (change data capture) keeps the target in sync until you switch over. Sources and targets can be on premises, on EC2 or in RDS.
- **AWS Schema Conversion Tool (AWS SCT)** converts a database schema (tables, views, stored procedures, functions) from one engine to another, assesses the migration and flags what needs manual work. Its targets include RDS engines, Aurora and Redshift. **DMS Schema Conversion** offers schema conversion managed in the DMS console.

> **Exam trap.** DMS moves data; it doesn't convert a schema between different engines. "Migrate Oracle to Aurora PostgreSQL" needs SCT (or DMS Schema Conversion) plus DMS. "MySQL to Aurora MySQL" needs no schema conversion.

<!-- section: key-points -->
## Key points

- Purpose-built databases: RDS and Aurora (relational), DynamoDB (key-value, document), ElastiCache (in-memory), DocumentDB (MongoDB-compatible), Neptune (graph), Redshift (warehouse).
- Managed databases remove OS and database patching, backups and failover work; EC2 is for full control or unsupported engines.
- RDS engines: Db2, MariaDB, SQL Server, MySQL, Oracle, PostgreSQL. Aurora: MySQL- and PostgreSQL-compatible, auto-growing storage.
- DynamoDB: serverless, single-digit milliseconds, global tables, DAX for microseconds.
- DMS migrates data with the source online; SCT converts the schema for heterogeneous migrations.
