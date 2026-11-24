Relational questions on AZ-305 follow one pattern: a workload and a few constraints (compatibility, size, usage profile, cost, compliance), from which you recommend the service, the tier, how it scales and how its data is protected.

<!-- section: choose-service | objectives: 2.1.1 -->
## Choosing the relational service

Azure SQL runs the same engine at three levels of control. Pick the most managed option that supports every feature the workload needs.

| Requirement in the scenario | Recommendation |
| --- | --- |
| New cloud application, least administrative effort, per-database scaling | Azure SQL Database (single database) |
| Many databases with varying, unpredictable usage, one budget | Azure SQL Database elastic pool |
| Migrate SQL Server with instance-scoped features and few changes, no operating system to manage | Azure SQL Managed Instance |
| Access to the operating system, a specific SQL Server version, SSRS or SSAS on the server, third-party agents | SQL Server on Azure Virtual Machines |
| Open-source PostgreSQL or MySQL engine, fully managed | Azure Database for PostgreSQL flexible server, Azure Database for MySQL flexible server |
| A very large database (tens of terabytes, up to 128 TB) on a platform service | Azure SQL Database Hyperscale |

What separates the three SQL options:

| Capability | SQL Database | SQL Managed Instance | SQL Server on Azure VMs |
| --- | --- | --- | --- |
| SQL Server Agent | No (elastic jobs instead) | Yes | Yes |
| Cross-database queries and transactions | No (elastic query instead) | Yes, within the instance | Yes |
| CLR, Service Broker, Database Mail, linked servers | No | Yes | Yes |
| Native restore from a `.bak` file | No | Yes, from URL | Yes |
| Windows authentication | No | Yes, for Microsoft Entra principals (Kerberos) | Yes |
| Network model | Public endpoint with firewall rules, or private endpoint | Injected in your virtual network | In your virtual network |
| Patching, backups, high availability | Built in | Built in | Yours to design (the SQL IaaS Agent extension automates part of it); a resize causes downtime |
| Maximum size | 128 TB (Hyperscale) | 16 TB, 32 TB with Next-gen General Purpose | 256 TB of storage per instance |

> **Exam trap.** "Minimize changes to the application" plus SQL Agent jobs, cross-database queries, CLR or linked servers means SQL Managed Instance, not SQL Database. "The server also hosts SSRS or SSAS" or "the vendor requires access to the operating system" means SQL Server on Azure VMs. Neither platform service runs SSRS or SSAS; SSIS packages run in an Azure-SSIS integration runtime of Azure Data Factory.

For open-source engines, recommend a flexible server (PostgreSQL or MySQL): zone-redundant high availability with a standby server in another availability zone, a server that can be stopped to pause compute billing (a stopped PostgreSQL flexible server restarts by itself after seven days), and automated backups kept 7 days by default and up to 35 days.

<!-- section: service-compute-tiers | objectives: 2.1.2 -->
## Service tiers and compute tiers

**Purchasing model.** Azure SQL Database offers two. The DTU model bundles compute, storage and I/O in fixed sizes: Basic (5 DTUs, 2 GB), Standard (up to 3,000 DTUs, 1 TB) and Premium (up to 4,000 DTUs, 4 TB). The vCore model sizes compute and storage independently and is the only one that offers the serverless compute tier, the Hyperscale service tier, Azure Hybrid Benefit and reserved capacity. SQL Managed Instance is vCore only.

**Service tier** (vCore model) fixes the storage architecture, hence performance and resilience:

| | General Purpose | Business Critical | Hyperscale |
| --- | --- | --- | --- |
| Storage | Remote premium storage | Local SSD | Decoupled storage with local SSD cache |
| I/O latency | 5 to 10 ms | 1 to 2 ms | 1 to 2 ms on frequently accessed data |
| Maximum database size | 4 TB | 4 TB | 128 TB |
| Replicas | One, no readable replica | Three secondary replicas, one of them readable at no extra cost | 0 to 4 high-availability replicas, up to 30 named replicas |
| In-memory OLTP | No | Yes | No |
| Zone redundancy | Supported | Supported | Supported |
| Typical use | Most business workloads, lowest cost | Low latency, high transaction rate | Very large or fast-growing databases |

Hyperscale backups are storage snapshots: restores take minutes regardless of size. A database migrated to Hyperscale can go back to General Purpose only within 45 days.

**Compute tier** decides how compute is billed:

| | Provisioned | Serverless |
| --- | --- | --- |
| Billing | Fixed price per hour for the vCores provisioned | Per second for the vCores used, between a minimum and a maximum you set |
| Auto-pause | No | Yes: after the auto-pause delay (15 minutes minimum, 60 by default in General Purpose) only storage is billed. In Hyperscale, auto-pause is in preview (60 minutes minimum) |
| Available in | General Purpose, Business Critical, Hyperscale, elastic pools | Single databases in General Purpose and Hyperscale, on Standard-series (Gen5) hardware only |
| Best for | Regular, predictable usage; databases that can't accept a resume delay | Intermittent, unpredictable usage with idle periods; new databases with no usage history |

| Requirement | Recommendation |
| --- | --- |
| Development database used a few hours a day, minimize cost | General Purpose, serverless with auto-pause |
| Read latency of 1 to 2 ms, in-memory OLTP | Business Critical (or Premium in the DTU model) |
| Reporting queries must not slow the primary, no extra cost | Business Critical: built-in readable replica |
| 20 TB database | Hyperscale |
| Existing SQL Server licenses with Software Assurance | vCore model with Azure Hybrid Benefit (General Purpose or Business Critical) |
| Steady, predictable usage for years | Provisioned compute with reserved capacity |

> **Exam trap.** Serverless isn't available in Business Critical, in the DTU model or for elastic pools. A requirement such as "the first connection after an idle period must not be delayed" rules out auto-pause: choose provisioned compute, or serverless with auto-pause disabled.

SQL Managed Instance has three tiers: General Purpose (16 TB, 100 databases), Next-gen General Purpose (32 TB, 500 databases, faster storage) and Business Critical (16 TB, local SSD, one readable replica, in-memory OLTP). It has neither Hyperscale nor serverless; an instance can be stopped and started instead.

PostgreSQL and MySQL flexible servers have three compute tiers: Burstable (low-cost development and low-concurrency workloads) and General Purpose or Memory Optimized (production workloads with high concurrency and predictable performance).

<!-- section: scalability | objectives: 2.1.3 -->
## Designing for database scalability

Scaling **up** (vertical) changes the size of one database; scaling **out** (horizontal) adds databases or replicas. Recommend the simplest technique that removes the bottleneck named in the scenario.

| Bottleneck or requirement | Technique |
| --- | --- |
| One database needs more CPU, memory or I/O | Change the compute size or the service tier (online; connections are dropped briefly at the end) |
| Load of one database varies during the day, unpredictably | Serverless compute tier (autoscaling) |
| Many databases with low average use and peaks at different times | Elastic pool |
| Read-heavy workload, reports competing with transactions | Read scale-out on a readable replica |
| Readers in other regions | Readable geo-replicas (active geo-replication, up to four secondaries; MySQL flexible server: up to 10 read replicas) |
| Database beyond 4 TB, or growth that is hard to forecast | Hyperscale |
| Data or write throughput beyond a single database; one database per tenant | Sharding with the Elastic Database tools |

**Elastic pools.** The databases of a pool share resources (eDTUs or vCores) at one price; you are billed for the pool, not per database. A pool pays off when each database has a low average utilization with infrequent spikes that don't coincide: Microsoft's example puts 20 databases that each peak at 90 DTUs in a 100 eDTU pool. Size the pool on the larger of two values: the sum of the average utilizations, or the number of databases peaking together multiplied by their peak. You can set a minimum and a maximum per database. All the databases of a pool are on the same logical server.

> **Exam trap.** An elastic pool saves money only when peaks are staggered. Several databases with a persistent medium-to-high utilization shouldn't share a pool: recommend single databases sized for their load.

**Read scale-out.** Premium and Business Critical databases get a readable secondary replica at no extra cost; a connection string with `ApplicationIntent=ReadOnly` is redirected to it. General Purpose, Basic and Standard have none. In Hyperscale, read scale-out needs at least one secondary replica: high-availability replicas, or named replicas scaled independently of the primary. Replicas are updated asynchronously: a session that must immediately read its own committed writes has to use the primary.

**Sharding** distributes identically structured data over many databases. Use it when the data or the transaction throughput exceeds one database, when tenants need physical isolation, or when parts of the data must stay in different geographies. The Elastic Database tools provide the client library (routing requests to the right shard), the split-merge tool (moving data between shards), elastic jobs (administration across databases), elastic transactions and elastic query (still in preview). Sharding works best when each transaction touches a single sharding key value; it complicates the application, so recommend it after scale-up, read scale-out and Hyperscale.

<!-- section: data-protection | objectives: 2.1.4 -->
## Protecting relational data

Match each threat to the control built for it:

| Threat or requirement | Control | What to remember |
| --- | --- | --- |
| Theft of data files or backups (data at rest) | Transparent data encryption (TDE) | On by default for new databases with a service-managed key. A customer-managed key in Azure Key Vault gives you control of rotation and revocation |
| Eavesdropping on the network (data in transit) | TLS | Always enforced by the service |
| Administrators and other privileged users must not read sensitive columns (data in use) | Always Encrypted | Columns are encrypted by the client driver; the key is never exposed to the database engine. Keys are stored in Azure Key Vault or the Windows certificate store |
| Support staff should see only part of a value (last four digits) | Dynamic data masking | Masks the result set for non-privileged users; the stored data is unchanged |
| Each user or tenant sees only its own rows | Row-level security | Filter based on the user or the execution context |
| Prove that data wasn't tampered with | Ledger | Cryptographic proof of integrity |
| Record who did what, for compliance | Auditing | Events written to an audit log in your storage account |
| Detect SQL injection, brute force, anomalous access | Microsoft Defender for SQL | Advanced Threat Protection alerts plus vulnerability assessment |
| No passwords stored in applications, centralized identities | Microsoft Entra authentication | Supports multifactor authentication and Conditional Access |
| Keep the database off the public internet | Private endpoint (SQL Database), virtual network injection (SQL Managed Instance) | Firewall and virtual network rules only restrict a public endpoint |

> **Exam trap.** Dynamic data masking isn't encryption: a user with enough permissions, and any administrator, still reads the real values. TDE doesn't hide anything from an authenticated user either; it protects the files. Only Always Encrypted keeps data unreadable for database administrators.

> **Exam tip.** "The organization must control the encryption key and be able to revoke it" means TDE with a customer-managed key in Azure Key Vault. "Regulated columns must never appear in plaintext on the server" means Always Encrypted.

Backups complete data protection. SQL Database and SQL Managed Instance take automated backups, allow point-in-time restore over 1 to 35 days (7 by default) and keep full backups up to 10 years with long-term retention. Backup storage is geo-redundant by default; choose locally redundant or zone-redundant backup storage when backups must stay in the region, knowing that geo-restore is then unavailable. The chapter on backup and disaster recovery develops these choices.

<!-- section: key-points -->
## Key points

- Most managed option that fits: SQL Database for new applications, SQL Managed Instance for instance-scoped SQL Server features, SQL Server on Azure VMs for operating system access, SSRS or SSAS.
- General Purpose is the default; Business Critical for 1 to 2 ms latency, in-memory OLTP and a free readable replica; Hyperscale beyond 4 TB and up to 128 TB.
- Serverless: single databases in General Purpose or Hyperscale, billed per second, auto-pause (preview in Hyperscale); never Business Critical, DTU or elastic pools.
- Elastic pool for many databases with staggered peaks; read scale-out for read-heavy workloads; sharding last.
- TDE protects files, TLS the network, Always Encrypted hides data from administrators, dynamic data masking only hides it in results, row-level security filters rows.
- Customer-managed TDE key in Azure Key Vault when the organization must control or revoke the key.
