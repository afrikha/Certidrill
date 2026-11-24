Azure runs relational databases in two ways: the Azure SQL family, built on the SQL Server database engine, and managed services for open-source engines. The exam describes a requirement (compatibility, control, administration effort) and asks which service meets it.

<!-- section: azure-sql-family | objectives: 2.2.1 -->
## The Azure SQL family

| | SQL Server on Azure Virtual Machines | Azure SQL Managed Instance | Azure SQL Database |
| --- | --- | --- | --- |
| Type of cloud service | IaaS | PaaS | PaaS |
| What it is | A virtual machine in Azure with SQL Server installed | A managed SQL Server instance that hosts several databases | A fully managed database service designed for the cloud |
| Compatibility with SQL Server | Full: same product as on-premises | Near 100 % | Most core database-level capabilities; some features are missing |
| Who manages the operating system, updates and backups | You | Azure, automatically | Azure, automatically |
| Best for | Migrating without any change ("lift and shift"), full control of server and operating system | Most migrations to the cloud, with minimal changes | New cloud applications, least administration |

The three options run the same database engine and use Transact-SQL. What changes is the share of the work that Azure does for you: the further to the right in the table, the less you administer and the less you control.

> **Exam trap.** A managed instance and a virtual machine both give you "an instance of SQL Server", but Azure SQL Managed Instance is **PaaS**: you have no access to the operating system and you don't patch anything. Only SQL Server on Azure Virtual Machines is IaaS.

<!-- section: azure-sql-database | objectives: 2.2.1 -->
## Azure SQL Database

Azure SQL Database always runs the latest stable version of the database engine; Azure updates and patches it. Databases are attached to a **logical server**, a central administrative point for logins, firewall rules and auditing rules, not a machine that you manage.

| Option | What it is | When to choose it |
| --- | --- | --- |
| **Single database** | One database with its own resources, which you scale up or down | One application with a predictable load |
| **Elastic pool** | Several databases share one pool of resources (memory, storage, processing power) | Many databases whose peaks of activity come at different times: the cost is lower than sizing each one for its peak |
| **Serverless** compute | Compute scales automatically within a range and is billed for what the database uses; in the General Purpose service tier, the database can pause when it is inactive | Intermittent or unpredictable use |
| **Hyperscale** service tier | Very large databases, up to 128 TB, with fast scaling, backup and restore | Databases that outgrow the other tiers |

Built-in capabilities to remember: automated backups with **point-in-time restore**, replication of databases to other regions, an availability SLA that increases with zone redundancy, encryption of data at rest and in motion, auditing, and threat protection with Microsoft Defender for SQL.

Because it isn't fully compatible with an on-premises SQL Server, features on which an existing application depends may be missing: SQL Server Agent, cross-database queries and the common language runtime (CLR), for example, are not available in Azure SQL Database.

<!-- section: managed-instance-and-vms | objectives: 2.2.1 -->
## Managed Instance and SQL Server on Azure Virtual Machines

**Azure SQL Managed Instance** is a complete SQL Server instance delivered as a service. You keep instance-level features such as SQL Server Agent, cross-database queries, CLR, Service Broker and Database Mail, while Azure automates backups, software patching and monitoring. Its update policy sets the engine that it follows (Always-up-to-date, SQL Server 2022 or SQL Server 2025); Azure installs the updates either way. The instance is deployed inside your virtual network.

**SQL Server on Azure Virtual Machines** is the same SQL Server as on-premises, in a virtual machine. You choose the version and edition, you have full administrative rights over the database system and the operating system, and in return you handle updates, configuration, backups and high availability. It suits applications that need operating system features unavailable in PaaS, and hybrid deployments in which part of a system stays on-premises.

| Requirement in the question | Answer |
| --- | --- |
| New application, minimal administration, lowest cost | Azure SQL Database |
| Several databases with varying and unpredictable usage, one budget | Azure SQL Database elastic pool |
| Database used a few hours a day, pay only for what is used | Azure SQL Database serverless |
| Migrate an instance that uses SQL Server Agent or cross-database queries, with automated patching and backups | Azure SQL Managed Instance |
| Access to the operating system, or software installed next to SQL Server | SQL Server on Azure Virtual Machines |
| A specific version of SQL Server, upgraded only when you decide | SQL Server on Azure Virtual Machines |

> **Exam tip.** Rank the three by control: virtual machine (everything), managed instance (the instance), SQL Database (the database). Administration effort follows the same order, from the most to the least.

<!-- section: open-source-databases | objectives: 2.2.2 -->
## Azure services for open-source databases

| Engine | What to know | Azure service |
| --- | --- | --- |
| **MySQL** | Simple-to-use open-source relational database, common in LAMP stack applications (Linux, Apache, MySQL, PHP) | **Azure Database for MySQL** |
| **PostgreSQL** | Object-relational database: relational tables plus custom data types, extensions, geometric data; its procedural language is PL/pgSQL | **Azure Database for PostgreSQL** |

Both are **PaaS** services, deployed as a **Flexible Server**: a fully managed server on which you keep control of the configuration and of costs. Azure Database for MySQL is based on the MySQL Community Edition.

- You don't manage hardware, virtual servers or software patches.
- High availability is built in, with automatic failover.
- Backups are automatic, with point-in-time restore (for Azure Database for MySQL: 7 days by default, up to 35 days).
- Scaling is fast, pricing is pay-as-you-go, and data is protected at rest and in transit.
- Applications and tools written for the open-source engine keep working (pgAdmin for PostgreSQL, for example).
- In return, some administration and security operations aren't available, because Azure performs them; Azure Database for PostgreSQL supports a defined list of extensions.

> **Exam trap.** An application written for MySQL or PostgreSQL isn't moved to Azure SQL Database: the engine and the SQL dialect differ. The answer that requires no change of the application is the Azure Database service of the same engine.

<!-- section: key-points -->
## Key points

- SQL Server on Azure Virtual Machines: IaaS, full compatibility and full control, you manage everything.
- Azure SQL Managed Instance: PaaS, near-100 % compatibility, instance-level features, the usual choice for migrations.
- Azure SQL Database: PaaS, fully managed, for new cloud applications; single database, elastic pool, serverless, Hyperscale up to 128 TB.
- Elastic pool: several databases share resources. Serverless: automatic scaling, billed for use, automatic pause in the General Purpose tier.
- Azure Database for MySQL and Azure Database for PostgreSQL: PaaS, Flexible Server, for applications built on those open-source engines.
