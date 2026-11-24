A migration question gives an on-premises estate (hypervisor, servers, databases, file shares), constraints of downtime, bandwidth and effort, and asks which framework step, which assessment tool, which target or which transfer method to recommend. Most answers are a pair: a strategy (rehost, replatform...) and the tool that carries it out.

<!-- section: caf | objectives: 4.3.1 -->
## Evaluating a migration with the Cloud Adoption Framework

The Microsoft Cloud Adoption Framework for Azure (CAF) organizes adoption in phases, each answering one question:

| Phase | Question | Main output |
| --- | --- | --- |
| Strategy | What should our Azure adoption look like? | Motivations, business outcomes, business case |
| Plan | How do we prepare? | Inventory of workloads, migration strategy per workload, skills and timeline |
| Ready | How do we build the environment? | Azure landing zone |
| Adopt | How do we migrate, modernize and build workloads? | Migrated, modernized or cloud-native workloads |
| Govern, Secure, Manage | How do we control, protect and operate the environment? | Policies, security baseline, operations: continuous, in parallel with adoption |

An **Azure landing zone** must exist before workloads move. Its platform landing zone provides the management group hierarchy with its policies and the shared services (identity, connectivity, management); workload teams then receive subscriptions, the workload landing zones, that inherit those guardrails.

During Plan, each workload receives one migration strategy:

| Strategy | What it means | Choose it when |
| --- | --- | --- |
| Retire | Decommission the workload | It no longer provides business value |
| Rehost | Move as is, like for like (server to virtual machine) | Speed and minimal disruption matter, no modernization planned soon, datacenter exit date |
| Replatform | Move to a managed hosting platform with minimal code changes (web app to App Service, SQL Server to SQL Managed Instance) | You want to offload operating system and patching work |
| Refactor | Change the code without adding features | Reduce technical debt, adopt cloud services and patterns |
| Rearchitect | Redesign the architecture (decompose into services) | Components must scale independently |
| Rebuild | Redevelop with cloud-native services | The existing application can't meet the requirements |
| Replace | Adopt a SaaS product | A commercial solution covers the need |
| Retain | Leave it where it is | Stable, compliant, no driver to move |

The Migrate methodology of the Adopt phase has five steps: plan the migration, prepare the workloads, execute the migration, optimize in the cloud, decommission the source. Its planning guidance is tested as common sense: discover dependencies and move dependent components in the same wave, migrate non-production before production and simple workloads before complex ones, define rollback criteria before each cutover. A downtime migration (stop, copy, restart) is simpler and suits workloads with a maintenance window; a near-zero-downtime migration replicates continuously and cuts over at the end, for critical workloads.

> **Exam trap.** "Minimal changes" and "fastest" designate rehost, even when a PaaS target would be better in the long run. "Reduce management overhead with minimal code changes" designates replatform. Read which constraint the question states.

<!-- section: assess | objectives: 4.3.2 -->
## Evaluating on-premises servers, data and applications

**Azure Migrate** is the free hub for discovery, assessment and migration of servers, databases and web applications. It works in three stages.

**Discover.** A lightweight Azure Migrate appliance, deployed on-premises, continuously collects configuration and performance data, the software inventory, the SQL Server instances and the ASP.NET web applications, without installing anything on the servers.

| Source | Appliance deployment | Discovery limit per appliance |
| --- | --- | --- |
| VMware | OVA template or script | 10,000 servers, up to 10 vCenter Servers |
| Hyper-V | VHD template or script | 5,000 servers, up to 300 hosts |
| Physical servers, other clouds | Script | 1,000 servers |

**Build the business case.** It compares the total cost of ownership on-premises and in Azure, shows the savings from Azure Hybrid Benefit and from moving capital expenses to operating expenses, and lets you compare "migrate to all IaaS" with "modernize with PaaS".

**Assess.** An assessment checks Azure readiness, then right-sizes the target, then estimates the monthly cost. Four types exist: Azure VM, Azure SQL (SQL Database, SQL Managed Instance or SQL Server on a virtual machine), Azure App Service (web applications) and Azure VMware Solution.

| Setting | Effect |
| --- | --- |
| Performance-based sizing | Sizes the target from the collected CPU, memory and disk utilization: avoids paying for oversized servers |
| As-is on-premises sizing | Keeps the current allocation: use it when no performance history exists; web apps are always assessed this way, because the appliance collects no performance data for them |
| Percentile utilization | The percentile of the samples used, 95th for example to ignore outliers |
| Comfort factor | A multiplier that adds a buffer for seasonal peaks or growth: 2.0 doubles the computed size |

**Dependency analysis** shows which servers talk to each other, from their TCP connections, so that they migrate in the same wave. The agentless analysis runs from the appliance and is the recommended one; the agent-based analysis is being phased out.

For SQL Server, an estate connected through Azure Arc can also be assessed from the Azure portal, with a recommended Azure SQL target and size. Data Migration Assistant was retired in July 2025.

> **Exam trap.** A server sized "as-is on-premises" reproduces its over-provisioning in Azure. When the question says "minimize Azure costs" and the servers are underused, the answer is a performance-based assessment, after enough days of data collection.

> **Exam tip.** "Identify which servers must be migrated together" is dependency analysis; "estimate the savings to justify the project" is the business case; "check whether the servers can run in Azure and at what size" is an assessment.

<!-- section: migrate-workloads | objectives: 4.3.3 -->
## Migrating workloads to IaaS and PaaS

To rehost servers as Azure virtual machines, the migration tool of Azure Migrate replicates the disks while the servers keep running, lets you run a test migration in an isolated network, then cuts over.

| Source | Recommended method | How it works |
| --- | --- | --- |
| VMware virtual machines | Agentless | The Azure Migrate appliance replicates through VMware snapshots; nothing is installed in the machines |
| VMware, when agentless prerequisites aren't met | Agent-based | A replication appliance and the Mobility service agent in each machine |
| Hyper-V virtual machines | Agentless | Replication provider installed on the Hyper-V hosts, no agent in the machines |
| Physical servers, virtual machines in AWS or Google Cloud, other hypervisors | Agent-based | Treated as physical servers: replication appliance and Mobility service agent |

Other targets cover other strategies:

| Requirement | Recommend |
| --- | --- |
| Move hundreds of VMware machines quickly, keep vSphere tooling and skills, avoid converting machines or changing their IP addresses | Azure VMware Solution: a VMware private cloud (vSphere, vSAN, NSX) on dedicated Azure hosts, three hosts minimum, with VMware HCX for the migration |
| Move an ASP.NET application from IIS to a managed platform | App Service Migration Assistant for one server; Azure Migrate to discover, assess and migrate web applications at scale |
| The application depends on components that App Service doesn't provide | Containerize it with the Azure Migrate app containerization tool, then run it in App Service containers or AKS |
| Move the database tier to PaaS | Next section |

Azure Site Recovery replicates machines too, but it is the disaster recovery service; for a migration, Microsoft directs you to Azure Migrate.

> **Exam trap.** "No agent can be installed on the servers" still allows agentless migration for VMware and Hyper-V, but not for physical servers or AWS instances, which always need the Mobility service agent.

<!-- section: migrate-databases | objectives: 4.3.4 -->
## Migrating databases

First choose the target, from what the databases use:

| Requirement | Target |
| --- | --- |
| New or modernized application, database-scoped features only, lowest administration | Azure SQL Database |
| Lift and shift of SQL Server with instance-scoped features: SQL Server Agent, cross-database queries, CLR, Service Broker, linked servers | Azure SQL Managed Instance |
| Access to the operating system, a specific SQL Server version, SSRS or SSAS on the same server, third-party agents | SQL Server on Azure Virtual Machines |

Then choose the tool, from the accepted downtime. An **offline** migration stops the application for the whole copy; an **online** migration keeps replicating changes and the application stops only for the cutover.

| Tool | Targets | Use |
| --- | --- | --- |
| Azure Database Migration Service | SQL Database (offline); SQL Managed Instance and SQL Server on Azure VMs (online or offline) | Managed service for migrations at scale, driven from the portal, PowerShell or the Azure CLI; it migrates no logins and no TDE-encrypted databases |
| Managed Instance link | SQL Managed Instance, from SQL Server 2016 or later | Near real-time replication through a distributed availability group: the online migration with the least downtime; the instance is readable during the migration |
| Log Replay Service | SQL Managed Instance | Restores full, differential and log backups from Blob Storage until you cut over |
| Native backup and restore from Blob Storage | SQL Managed Instance, SQL Server on Azure VMs | Simplest when a downtime window is accepted |
| BACPAC import | SQL Database | Small databases, with downtime |
| Transactional replication | SQL Database, SQL Managed Instance | Continuous replication of selected tables |
| SQL Server Migration Assistant (SSMA) | SQL Server, SQL Database, SQL Managed Instance | Converts schemas and migrates data from Oracle, Db2, MySQL, SAP ASE and Access |
| Migration service in Azure Database for PostgreSQL | PostgreSQL flexible server | Offline or online, from on-premises, Azure virtual machines, Amazon RDS or Aurora, Google Cloud SQL |

> **Exam trap.** Azure SQL Database accepts only offline migrations through Database Migration Service. "Minimal downtime" with a SQL Database target needs another mechanism such as transactional replication, or a SQL Managed Instance target.

> **Exam tip.** A source that isn't SQL Server (Oracle, Db2, MySQL) going to Azure SQL always involves SSMA for the schema conversion.

<!-- section: migrate-data | objectives: 4.3.5 -->
## Migrating unstructured data

The method follows the volume of data, the available bandwidth and whether the transfer is one-time or recurring. A quick check: at 100 Mbps, 10 TB take more than nine days of continuous transfer, and 100 TB about three months.

| Requirement | Recommend |
| --- | --- |
| Up to about 35 TB, limited bandwidth, one-time import | Azure Data Box Disk: up to five 8 TB encrypted SSDs per order, import only |
| More than 40 TB, limited bandwidth, import or export | Azure Data Box: a rugged device of 120 TB or 525 TB usable capacity |
| Use your own disk drives, or export blobs to drives | Azure Import/Export service: imports to Blob Storage and Azure Files, exports from Blob Storage only |
| Good bandwidth, scripted or repeated copy to blobs | AzCopy |
| A few files, graphical tool | Azure Storage Explorer |
| Migrate SMB or NFS file shares, or Amazon S3 buckets, as a managed and tracked project | Azure Storage Mover |
| Replace file servers but keep a local cache and SMB access in the offices | Azure File Sync with cloud tiering |
| Scheduled pipelines from many data stores, with transformation | Azure Data Factory |

Data Box Heavy has been retired; several Data Box devices can be ordered for larger volumes. Data on a Data Box is encrypted with AES 256-bit, and the device is wiped after the upload.

**Azure Storage Mover** is a fully managed migration service: one resource in Azure tracks the projects. In an agent-based migration, an agent deployed near the source copies files directly to blob containers or Azure file shares while preserving folder structure, timestamps and permissions. Agentless migrations need no agent: from SMB shares (private connectivity to the share, credentials in Azure Key Vault), from NFS shares (preview) and from cloud sources such as AWS S3. It combines with Data Box: the device carries the bulk offline, then Storage Mover uploads only the changes made since.

**Azure File Sync** synchronizes Windows file servers with Azure file shares. Used as a migration tool, it uploads in the background while users keep working; with cloud tiering, only the frequently used files stay on the server. For a cloud-only target, Robocopy to a mounted Azure file share and Storage Mover preserve full file fidelity; AzCopy and Storage Explorer may lose permissions on Azure Files.

> **Exam trap.** Data Box Disk can't export data from Azure and stops at about 35 TB per order. An export of blobs to an on-premises site uses Data Box or the Import/Export service.

> **Exam tip.** "Limited bandwidth" or "the transfer would take months" designates an offline device. "Ongoing synchronization" or "keep the local file server" designates Azure File Sync. "NTFS permissions must be preserved" excludes Storage Explorer.

<!-- section: key-points -->
## Key points

- CAF phases: Strategy, Plan, Ready, Adopt, then Govern, Secure and Manage. A landing zone comes before the first workload.
- Rehost moves as is; replatform moves to a managed platform with minimal code changes; refactor, rearchitect and rebuild change the code more and more; replace adopts SaaS; retire and retain move nothing.
- Azure Migrate: appliance for agentless discovery, business case for savings, assessments for readiness, size and cost, dependency analysis for migration waves.
- Performance-based sizing with a comfort factor avoids migrating over-provisioning.
- Agentless replication for VMware and Hyper-V; agent-based for physical servers and other clouds. Azure VMware Solution keeps the VMware stack; App Service Migration Assistant moves IIS applications.
- Instance-scoped SQL Server features lead to SQL Managed Instance, operating system access to SQL Server on a virtual machine. Managed Instance link for the least downtime; Database Migration Service is offline only for SQL Database; SSMA for other engines.
- Data: Data Box Disk up to 35 TB, Data Box beyond 40 TB, AzCopy with good bandwidth, Storage Mover for managed share migrations, File Sync for hybrid file servers.
