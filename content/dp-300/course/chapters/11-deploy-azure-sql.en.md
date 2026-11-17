Every DP-300 scenario starts with an offering. The same SQL Server engine runs as Azure SQL Database, Azure SQL Managed Instance, SQL Server on Azure Virtual Machines, SQL database in Microsoft Fabric, and SQL Server outside Azure managed through Azure Arc; what differs is what Microsoft runs for you and which features you keep.

<!-- section: choose-offering | objectives: 1.1.1 -->
## Choosing the database offering

| Criterion | Azure SQL Database | Azure SQL Managed Instance | SQL Server on Azure Virtual Machines |
| --- | --- | --- | --- |
| Model | PaaS, one database (or an elastic pool) on a logical server | PaaS, a whole instance in your virtual network | IaaS, you manage the OS and the instance |
| Compatibility | Most database-level capabilities | Almost all instance-level and database-level capabilities | Full parity with the same SQL Server version |
| OS access | No | No | Yes |
| Maximum size | Up to 128 TB (Hyperscale) | Up to 16 TB, 32 TB with Next-gen General Purpose | Up to 256 TB per instance |
| Network | Public endpoint or private endpoint (Private Link) | Private IP in a dedicated subnet | Private IP in your virtual network |
| Patching, backups | Automatic | Automatic | Your responsibility (helped by extensions) |
| Changing compute | Online, connections dropped briefly at the end | Online, short failover at the end | Resizing the virtual machine means downtime |

Decision rules:

| Requirement | Answer |
| --- | --- |
| New cloud application, no DBA team, smallest administrative effort | Azure SQL Database |
| Many tenant databases with unpredictable, non-overlapping peaks | Azure SQL Database elastic pool |
| Lift and shift with SQL Server Agent jobs, cross-database queries, CLR, linked servers | Azure SQL Managed Instance |
| OS access, third-party agents on the server, SQL Server Reporting Services on the same host, a feature PaaS doesn't support | SQL Server on Azure Virtual Machines |
| Operational database whose data must be immediately available to Fabric analytics | SQL database in Microsoft Fabric |
| Keep SQL Server in your datacenter or another cloud but manage it from Azure | SQL Server enabled by Azure Arc |

Azure SQL Database offers two purchasing models:

| | DTU model | vCore model |
| --- | --- | --- |
| Sizing | Bundled compute, memory and IO: Basic (5 DTUs, 2 GB), Standard (up to 3,000 DTUs, 1 TB), Premium (up to 4,000 DTUs, 4 TB) | vCores and hardware chosen, storage sized separately |
| Tiers | Basic, Standard, Premium | General Purpose, Business Critical, Hyperscale |
| Serverless, Hyperscale, Azure Hybrid Benefit | No | Yes |

vCore service tiers of Azure SQL Database:

| | General Purpose | Business Critical | Hyperscale |
| --- | --- | --- | --- |
| Storage | Remote premium storage, 1 GB to 4 TB | Local SSD, 1 GB to 4 TB | Distributed storage with local SSD cache, 10 GB to 128 TB |
| Latency | 5 to 10 ms | 1 to 2 ms | 1 to 2 ms for frequently accessed data |
| Replicas | One, no read scale-out | Three secondary replicas, one free readable replica | 0 to 4 high availability replicas, named replicas |
| In-memory OLTP | No | Yes | No |
| Serverless compute | Yes | No | Yes |

> **Exam trap.** In-memory OLTP needs Business Critical (or DTU Premium). Hyperscale is the answer for size and fast scaling, not for in-memory tables.

**Serverless** (General Purpose and Hyperscale, Standard-series hardware) scales between a minimum and a maximum vCore setting, bills per second, and can **auto-pause**: General Purpose allows a delay of 15 minutes to 7 days (default 60 minutes, `-1` disables it), and only storage is billed while paused. It fits intermittent, unpredictable use; a workload that can't wait for a resume needs provisioned compute or auto-pause disabled.

An **elastic pool** shares eDTUs or vCores among databases of the **same logical server**. It saves money when many databases have a low average and peaks at different times; databases with steady medium-to-high use don't belong in a pool. Moving a database into or out of a pool drops connections for only a few seconds.

<!-- section: deploy-methods | objectives: 1.1.2, 1.1.7 -->
## Deploying with automation

| Method | Choose it when |
| --- | --- |
| Azure portal | One-off deployment, learning, checking options |
| Bicep or ARM template | Declarative, repeatable, idempotent deployment kept in source control and run from a pipeline |
| Azure CLI (`az sql ...`) | Scripts in Bash or Cloud Shell, imperative steps |
| Azure PowerShell (`New-AzSqlServer`, `New-AzSqlDatabase`, `New-AzSqlInstance`) | Scripts in PowerShell |

A logical server and a database in Bicep:

```bicep
param location string = resourceGroup().location
param adminLogin string
@secure()
param adminPassword string

resource sqlServer 'Microsoft.Sql/servers@2022-05-01-preview' = {
  name: 'sql-contoso-prod'
  location: location
  properties: {
    administratorLogin: adminLogin
    administratorLoginPassword: adminPassword
  }
}

resource sqlDb 'Microsoft.Sql/servers/databases@2022-05-01-preview' = {
  parent: sqlServer
  name: 'SalesDb'
  location: location
  sku: {
    name: 'GP_S_Gen5'
    tier: 'GeneralPurpose'
    family: 'Gen5'
    capacity: 2
  }
  properties: {
    autoPauseDelay: 60
  }
}
```

```bash
az deployment group create --resource-group RG1 \
  --template-file main.bicep --parameters adminLogin=sqladmin
```

The same with the Azure CLI:

```bash
az sql server create --name sql-contoso-prod --resource-group RG1 \
  --location westeurope --admin-user sqladmin --admin-password "<password>"

# Serverless General Purpose, 2 vCores max, pause after 120 minutes
az sql db create -g RG1 -s sql-contoso-prod -n SalesDb \
  -e GeneralPurpose -f Gen5 -c 2 --compute-model Serverless --auto-pause-delay 120

# Hyperscale with 2 high availability replicas
az sql db create -g RG1 -s sql-contoso-prod -n BigDb \
  -e Hyperscale -f Gen5 -c 4 --ha-replicas 2

# Backup storage redundancy: Local, Zone, Geo or GeoZone
az sql db create -g RG1 -s sql-contoso-prod -n LocalDb \
  --service-objective S0 --backup-storage-redundancy Local
```

A service objective encodes the tier, the hardware and the size: `S0`, `P1`, `GP_Gen5_2`, `GP_S_Gen5_8` (serverless), `BC_Gen5_2`, `HS_Gen5_32`.

A **managed instance** needs a dedicated subnet in a virtual network. `--storage` is set in increments of 32 GB, `--license-type BasePrice` applies Azure Hybrid Benefit (`LicenseIncluded` pays for the license), and `--gpv2 true` with `--iops` and `--memory` deploys Next-gen General Purpose:

```bash
az sql mi create -g RG1 -n mi-contoso -l westeurope \
  -u miadmin -p "<password>" \
  --subnet "<subnet resource ID>" \
  -e GeneralPurpose -f Gen5 -c 8 --storage 256GB \
  --license-type BasePrice
```

**SQL Server on an Azure virtual machine** is usually deployed from an Azure Marketplace image that already contains SQL Server; such a virtual machine is registered with the **SQL IaaS Agent extension** automatically (a self-installed SQL Server 2016 or later is usually registered when detected, otherwise register it yourself). Basic registration gives portal management and lets you switch between pay-as-you-go and Azure Hybrid Benefit licensing or update the edition metadata without redeploying. Features such as automated backup, automated patching, Azure Key Vault integration, `tempdb` configuration, Microsoft Entra authentication and the best practices assessment install the agent when you enable them. A failover cluster instance doesn't support the agent features.

> **Exam trap.** Creating a managed instance in an empty subnet creates its virtual cluster first, so it takes far longer than creating a database. A question that asks for the fastest available target with no network preparation points to Azure SQL Database.

<!-- section: arc-fabric | objectives: 1.1.3, 1.1.4 -->
## Azure Arc and SQL database in Fabric

**SQL Server enabled by Azure Arc** brings Azure management to SQL Server 2014 and later running outside Azure: in your datacenter, at edge sites or in another cloud. It isn't for SQL Server on Azure virtual machines (those use the SQL IaaS Agent extension).

| Use case | Notes |
| --- | --- |
| One inventory of instances and databases | Azure portal, Azure Resource Graph |
| Pay-as-you-go SQL Server licensing billed through Azure | Instead of buying licenses |
| Extended Security Updates for out-of-support versions | Subscription billed through Azure |
| Microsoft Defender for Cloud, best practices assessment | Need Azure Monitor Agent |
| Microsoft Entra authentication | SQL Server 2022 or later |
| Migration assessment and database migration | Readiness, SKU recommendation, migration to Managed Instance |
| Automated backups, point-in-time restore, automatic updates | Not available with the "license only" license type |

The license type decides features: "license only" gets inventory, Entra authentication, Defender, Purview and migration; Software Assurance, a SQL Server subscription or pay-as-you-go add the best practices assessment, automatic updates, automated backups and Extended Security Updates.

**SQL database in Microsoft Fabric** is a transactional database built on the Azure SQL Database engine and created in a Fabric workspace. Its data is replicated automatically, in near real time, to OneLake in an analytics-ready format, with a SQL analytics endpoint, so Spark, notebooks and Power BI use it without an ETL pipeline. Use cases: operational database for a Fabric analytics solution, reverse ETL, operational data store, translytical and AI applications.

| Requirement | SQL database in Fabric? |
| --- | --- |
| Operational data available to Fabric analytics with no pipeline | Yes |
| Microsoft Entra authentication only | Yes (no logins, only users for Entra principals) |
| SQL authentication, elastic pools, failover groups, Always Encrypted, ledger, long-term retention | No: Azure SQL Database |
| More than 32 vCores or more than 4 TB | No: Azure SQL Database |

<!-- section: plan-partitioning | objectives: 1.1.5 -->
## Planning table partitioning

Partitioning splits a table or an index horizontally inside **one database**, by ranges of a partitioning column. It is planned in three objects: a **partition function** (boundary values), a **partition scheme** (partitions mapped to filegroups) and the table or index created on the scheme.

| Goal | Does partitioning help? |
| --- | --- |
| Load or archive a month of data instantly (sliding window) | Yes: `SWITCH` a partition in or out, a metadata operation |
| Rebuild, compress or truncate only recent data | Yes: per-partition maintenance |
| Faster single-row OLTP lookups | Rarely: queries that can't eliminate partitions can get slower |
| Spread data across several databases or servers | No: that is sharding |

Planning rules:

- Choose a column present in most filters and in the load pattern, usually a date. `text`, `ntext`, `image`, `xml`, `varchar(max)`, `nvarchar(max)`, `varbinary(max)`, `timestamp`, alias types and CLR types can't be partitioning columns; a computed column must be `PERSISTED`.
- `RANGE RIGHT` puts each boundary value in the partition on its right: the natural choice for dates (`'2026-02-01'` starts the February partition). `RANGE LEFT` is the default when neither is written.
- n boundary values create n + 1 partitions; a table or index supports up to 15,000 partitions, but designs with hundreds or thousands of partitions are discouraged.
- Keep indexes **aligned** (built on the same scheme) so that partitions can be switched.
- In Azure SQL Database and SQL database in Fabric only the `PRIMARY` filegroup exists: every partition maps to `PRIMARY`. Multiple filegroups (tiered storage, piecemeal backup) are possible on Managed Instance and virtual machines.

<!-- section: sharding | objectives: 1.1.6 -->
## Recommending a sharding solution

**Sharding** (horizontal scale-out) spreads rows with the same schema across several databases, each holding a range or a list of sharding key values (typically a tenant ID). Scaling up (vertical scaling) changes the compute size of one database instead.

| Requirement | Recommendation |
| --- | --- |
| Database larger than a single database allows, or more throughput than the largest compute size | Sharding across databases, or first consider Hyperscale (128 TB) |
| One tenant per database for isolation, per-tenant restore and scaling | Single-tenant shards, often in an elastic pool to share cost |
| Many small tenants per database | Multitenant shards with a tenant key column, row-level security to filter rows |
| Route each request to the right database | Elastic Database client library (shard map manager, data-dependent routing) |
| Move tenants between shards, split or merge shards | Split-merge tool |
| Run a schema change on every shard | Elastic jobs |
| Query across shards for reporting | Elastic query (preview) |

Sharding works best when every transaction stays within one sharding key value, so within one database.

> **Exam trap.** Restoring a single tenant out of a multitenant database isn't possible with a database restore; isolation and per-tenant point-in-time restore require one tenant per database.

<!-- section: hybrid | objectives: 1.1.8 -->
## Deploying hybrid SQL Server solutions

To connect a SQL Server instance outside Azure to Azure Arc:

1. Onboard the server with the **Azure Connected Machine agent** (it becomes an Azure Arc-enabled server).
2. The **Azure extension for SQL Server** is installed and discovers the instances; each instance becomes a SQL Server - Azure Arc resource. Assign the same region to the server and its SQL Server instances.
3. Choose the license type, then enable the features you need (Microsoft Entra authentication, Defender for Cloud, best practices assessment, automatic updates, backups).

The agent and the extension use only **outbound HTTPS on TCP port 443**. Windows Server 2016 or later and some Linux distributions are supported; SQL Server in containers isn't.

Other hybrid building blocks:

| Need | Solution |
| --- | --- |
| Near real-time replica of an on-premises database in Azure, readable, for DR or reporting | Managed Instance link (distributed availability group), SQL Server 2016 or later |
| Fail over to Azure and fail back | Managed Instance link with SQL Server 2022 or later |
| Disaster recovery replica that isn't charged SQL Server licensing | Hybrid failover benefit on a passive, DR-only managed instance |
| Always On availability group spanning on-premises and Azure virtual machines | Availability group with replicas on Azure virtual machines, network connectivity by VPN or ExpressRoute |

<!-- section: patching | objectives: 1.1.9 -->
## Patching hybrid and IaaS deployments

Azure SQL Database and Managed Instance are patched by Microsoft (a maintenance window can be chosen). Virtual machines and Arc-enabled servers are your responsibility:

| Tool | Scope | What it installs |
| --- | --- | --- |
| Automated Patching (SQL IaaS Agent extension) | SQL Server on Azure virtual machines | Windows and SQL Server updates marked Important or Critical, in a maintenance window (day, start hour, 30 to 180 minutes). Scheduled to retire on September 17, 2027 |
| Azure Update Manager | Azure virtual machines and Arc-enabled servers at scale | Also installs SQL Server cumulative updates; the recommended tool |
| Automatic updates of SQL Server enabled by Azure Arc | Arc-enabled SQL Server | Disabled by default; needs Software Assurance, a SQL Server subscription or pay-as-you-go |
| Extended Security Updates through Azure Arc | Out-of-support SQL Server versions | Security updates for up to three years |

```powershell
Update-AzSqlVM -ResourceGroupName RG1 -Name SQLVM1 `
  -AutoPatchingSettingDayOfWeek Thursday `
  -AutoPatchingSettingMaintenanceWindowStartingHour 11 `
  -AutoPatchingSettingMaintenanceWindowDuration 120 `
  -AutoPatchingSettingEnable
```

> **Exam trap.** Automated Patching doesn't install cumulative updates that aren't marked Important or Critical. To install cumulative updates automatically, use Azure Update Manager, and use only one patching service per virtual machine: overlapping tools cause failed updates.

For an availability group or a failover cluster instance on virtual machines, patch the secondary replicas first, fail over, then patch the former primary, so that the database stays available.

<!-- section: key-points -->
## Key points

- SQL Database = least effort and up to 128 TB (Hyperscale); Managed Instance = instance features and easiest migration; virtual machine = OS access and full parity.
- Business Critical alone (with DTU Premium) has in-memory OLTP; serverless exists only in General Purpose and Hyperscale.
- Elastic pools share resources among databases of one server with non-overlapping peaks.
- Bicep for repeatable declarative deployments; `az sql db create`, `az sql mi create`; a managed instance needs a dedicated subnet.
- Azure Arc manages SQL Server outside Azure; features depend on the license type.
- Partitioning stays inside one database (only `PRIMARY` in SQL Database); sharding spreads data across databases with the elastic database tools.
- Patch virtual machines with Azure Update Manager; Automated Patching installs only Important or Critical updates and retires in 2027.
