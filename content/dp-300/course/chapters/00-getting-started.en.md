DP-300 is the exam of the Microsoft Certified: Azure Database Administrator Associate certification. It targets the administrator who deploys, secures, monitors, automates and protects SQL Server databases on Azure: Azure SQL Database, Azure SQL Managed Instance, SQL Server on Azure Virtual Machines, and SQL Server outside Azure connected through Azure Arc. Questions are operational: a T-SQL statement, an `az` command or a portal setting to choose or complete, and a constraint (downtime, cost, least privilege) that decides between several real features.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Duration | 100 minutes of exam time |
| Questions | Not published; plan for about 45 to 58, including one case study and one "does the solution meet the goal" series |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Microsoft Learn is available during associate exams, on the same clock |
| Interactive components | Announced as possible by Microsoft ("you may have interactive components") |
| Skills measured | Study guide dated October 27, 2026 |
| Validity | One year, renewable for free with an online assessment on Microsoft Learn |

The five domains:

| Domain | Weight |
| --- | --- |
| Plan and implement data platform resources | 15 to 20 % |
| Implement a secure environment | 20 to 25 % |
| Monitor, configure, and optimize database resources | 20 to 25 % |
| Configure and manage automation of tasks | 15 to 20 % |
| Plan and configure a high availability and disaster recovery (HA/DR) environment | 20 to 25 % |

Expected formats: one answer among four or five, several answers ("each correct answer presents part of the solution"), T-SQL or command fragments with drop-down lists, Yes/No statements, drag and drop of features onto requirements, and ordering of steps. In a "does the solution meet the goal" series, the same scenario comes back with a different solution each time, and you can't go back to a previous question of the series. Questions with several elements usually give one point per correct element. Most questions cover generally available features; a widely used preview feature can appear.

If the exam isn't available in your language, you can request 30 extra minutes. A failed attempt can be retaken after 24 hours.

> **Exam tip.** Microsoft Learn is open during the exam but searching costs minutes. Use it to confirm one value (a retention limit, a parameter name), never to learn a topic.

<!-- section: reading-questions -->
## Reading a question

Stems are 3 to 6 sentences: "You have an Azure SQL managed instance named MI1 that hosts... You need to... The solution must minimize downtime." Identify the **offering** first (SQL Database, Managed Instance or virtual machine: many features exist on only one of them), then the **constraint**.

| Words in the question | Think of |
| --- | --- |
| "minimize downtime", "online" | An online method: Managed Instance link, Log Replay Service in continuous mode, transactional replication, availability group |
| "minimize administrative effort" | The platform feature (PaaS, automatic tuning, failover group, built-in backup) rather than a script or a virtual machine |
| "minimize costs" | The smallest tier that meets every requirement: serverless for intermittent use, elastic pool for many small databases, Azure Hybrid Benefit for existing licenses |
| "requires access to the operating system", "unsupported feature" | SQL Server on Azure Virtual Machines |
| "near 100 % compatibility", "instance-level features", "lift and shift" | Azure SQL Managed Instance |
| "principle of least privilege" | A database-level user and the narrowest fixed or custom role, not `db_owner` or the server admin |
| "RPO", "RTO", "if a region fails" | Geo-replication, failover groups, geo-restore: compare recovery time and data loss |
| "servers outside Azure", "on-premises", "other clouds" | SQL Server enabled by Azure Arc |

Read the code completely. In a drop-down question, the keywords around the blank (`FROM EXTERNAL PROVIDER`, `WITH (ONLINE = ON)`, `TO URL`) often exclude half of the options.

<!-- section: confusing-pairs -->
## Features that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| DTU model | vCore model | DTU bundles compute, memory and IO in fixed sizes; vCore lets you pick vCores, hardware and storage, and is the only one with serverless, Hyperscale and Azure Hybrid Benefit |
| Single database | Elastic pool | A pool shares resources among databases of one server whose peaks don't overlap |
| Business Critical | Hyperscale | Business Critical: local SSD, in-memory OLTP, one free readable replica, up to 4 TB; Hyperscale: up to 128 TB, fast scaling, named replicas |
| Azure SQL Managed Instance | SQL Server on Azure Virtual Machines | Managed Instance is PaaS with near-full compatibility; the virtual machine gives full parity and OS access, but you patch and back up |
| Table partitioning | Sharding | Partitioning splits a table inside one database; sharding spreads data across several databases |
| ROW / PAGE compression | Columnstore compression | Row and page compress rowstore data; columnstore compresses columns and suits analytics |
| Log Replay Service | Managed Instance link | LRS restores backup files from Blob Storage, database offline until cutover; the link replicates continuously through a distributed availability group with a readable target |
| SQL Server Agent | Elastic jobs | SQL Server Agent runs on Managed Instance and virtual machines; Azure SQL Database uses elastic jobs |
| Failover group | Active geo-replication | A failover group fails over several databases with stable listener endpoints; geo-replication is per database, up to four secondaries, no listener |
| Dynamic data masking | Always Encrypted | Masking hides values in query results; Always Encrypted encrypts on the client, the engine never sees the plaintext |
| Point-in-time restore | Long-term retention | PITR covers 1 to 35 days; LTR keeps full backups up to 10 years |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: deployment choices come first because every later answer depends on the offering.
2. Practice in a subscription: create a serverless database, a small managed instance if your budget allows (deployment takes time), and a SQL Server virtual machine from a gallery image. Run the T-SQL of each chapter.
3. Learn the code you will have to complete: `CREATE USER ... FROM EXTERNAL PROVIDER`, `ALTER DATABASE`, `BACKUP ... TO URL`, `CREATE PARTITION FUNCTION`, `ALTER INDEX ... REBUILD WITH (DATA_COMPRESSION = PAGE)`, the main DMVs and Query Store views.
4. After each domain, take a mock exam, read every explanation, and reread the sections linked to your mistakes.
5. Book the exam when three mock exams in a row are at 800 or more on questions you haven't seen before.
