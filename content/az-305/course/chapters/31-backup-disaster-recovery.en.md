Every recovery question hides two numbers: how much data the business accepts to lose and how long it accepts to be down. They decide between a backup, a replica and a failover service, and the cheapest option that meets both is the answer.

<!-- section: recovery-objectives | objectives: 3.1.1 -->
## Recovery objectives and the recovery solution

The **recovery point objective (RPO)** is the maximum acceptable data loss, measured as time before the incident. The **recovery time objective (RTO)** is the maximum acceptable time to bring the workload back.

| Need | Solution | Order of magnitude |
| --- | --- | --- |
| Recover from deletion, corruption or ransomware; keep data for months or years | Azure Backup | RPO set by the backup frequency (often a day), RTO set by the restore time |
| Restart whole machines in another region or zone after a disaster | Azure Site Recovery | RPO in seconds to minutes (continuous replication), RTO in minutes |
| No interruption when a datacenter or zone fails | High availability: zones and replicas | RPO and RTO near zero, inside one region |

> **Exam trap.** Site Recovery replicates corruption and deletions too, and keeps recovery points 15 days at most: it doesn't replace a backup. A backup restored into another region rarely meets an RTO of minutes: it doesn't replace disaster recovery. A scenario with both "retain 7 years" and "RTO of 30 minutes" needs both services.

**Azure Site Recovery** orchestrates replication, failover and failback:

| Scenario | Target | What to know |
| --- | --- | --- |
| Azure virtual machines, region to region | Another Azure region | A cache storage account in the source region; virtual machines are created in the target region only at failover |
| Azure virtual machines, zone to zone | Another availability zone of the same region | Data never leaves the region (data residency); simpler networking, but no protection against a region-wide disaster |
| VMware virtual machines and physical servers | Azure | An on-premises replication appliance and the Mobility service on each machine |
| Hyper-V virtual machines | Azure | Site Recovery Provider and Recovery Services agent on the Hyper-V hosts; nothing is installed in the virtual machines |

Replication is continuous for Azure and VMware virtual machines and as frequent as every 30 seconds for Hyper-V. Crash-consistent recovery points are created every 5 minutes; application-consistent snapshots are optional, at the frequency set in the replication policy. Microsoft commits to an RTO of up to one hour and gives no SLA for the RPO.

Design elements:

- A **recovery plan** groups machines and sequences the failover of a multi-tier application, with scripts, manual actions and Azure Automation runbooks.
- A **test failover** runs a drill in an isolated network without affecting replication or production.
- Place the Recovery Services vault in the **target** region, so that failover remains possible while the source region is down.
- After a failover, reprotect the machines to replicate in the opposite direction, then fail back.

| Requirement | Recommendation |
| --- | --- |
| Azure virtual machines must run in another region within one hour, RPO of 15 minutes | Site Recovery, region to region |
| Same need, but data must not leave the region | Site Recovery, zone to zone |
| On-premises VMware workloads must fail over to Azure, no second datacenter | Site Recovery to Azure |
| A three-tier application must start in a defined order; recovery must be proven without downtime | Recovery plan; test failover |
| Restore a file deleted three months ago | Azure Backup |

<!-- section: compute-backup | objectives: 3.1.2 -->
## Backup and recovery for compute

The workload decides the vault type:

| Vault | Workloads |
| --- | --- |
| Recovery Services vault | Azure virtual machines, SQL Server and SAP HANA in Azure virtual machines, Azure Files, on-premises machines with the MARS agent, Microsoft Azure Backup Server (MABS) or DPM |
| Backup vault | Azure managed disks, Azure Blob Storage, Azure Data Lake Storage, Azure Database for PostgreSQL, Azure Kubernetes Service (AKS) |

**Azure virtual machines.** A backup extension snapshots all the disks, then transfers the changed blocks to the vault. Snapshots are application-consistent on Windows (VSS); on Linux they are file-system consistent unless you provide pre and post scripts. The snapshot kept next to the disks allows an **instant restore**, faster than a restore from the vault. You can restore a whole machine, its disks or individual files.

| | Standard policy | Enhanced policy |
| --- | --- | --- |
| Frequency | Once a day (RPO up to 24 hours) | Several times a day, as often as every 4 hours |
| Instant restore snapshots | 1 to 5 days (2 by default) | 1 to 30 days (7 by default), zone-redundant |
| Ultra Disk, Premium SSD v2 | Not supported | Supported |
| Trusted Launch virtual machines | Only through Azure CLI 2.73.0+, Azure PowerShell Az 14.0.0+ or REST API 2025-01-01+ | Supported |
| Change of policy type | Can move to Enhanced (migration in preview) | Can't return to Standard |

**Cross Region Restore** restores in the paired region at any time, for drills or during an outage. It requires a geo-redundant vault, and the secondary region can lag by up to 36 hours.

| Requirement | Recommendation |
| --- | --- |
| RPO of 4 hours for virtual machines, or Ultra Disks | Azure VM backup, Enhanced policy |
| Several crash-consistent backups a day of one data disk or of a shared disk, no agent | Azure Disk Backup (Backup vault; incremental snapshots kept in your subscription) |
| Cluster state and persistent volumes of an AKS cluster | AKS backup (backup extension in the cluster, Backup vault) |
| Files, folders and system state of a few on-premises Windows servers | MARS agent to a Recovery Services vault |
| Application-aware backup of on-premises SQL Server, Hyper-V or VMware virtual machines | MABS or DPM: backup to local disk, then to the vault |
| App Service app | Automatic backups (hourly, kept 30 days, nothing to configure); custom backups to your storage account for longer retention or backup over a virtual network |

**Protecting the vault.** Three settings answer ransomware or a rogue administrator:

- **Soft delete** keeps deleted backup data 14 days by default, up to 180 days; new Recovery Services vaults can't disable it.
- An **immutable vault** blocks operations that would lose recovery points (deleting backup data, reducing retention). Locking it is irreversible.
- **Multi-user authorization** protects critical operations (disabling soft delete or immutability, reducing retention) with a Resource Guard owned by another administrator, ideally in another subscription or tenant.

Vault storage is geo-redundant by default, or locally redundant or zone-redundant. For a Recovery Services vault, choose before the first backup is configured.

> **Exam tip.** "Backups must stay in the region" means a zone-redundant or locally redundant vault. "Restore in another region during a regional outage" means a geo-redundant vault with Cross Region Restore. "A compromised backup administrator must not be able to delete backups" means multi-user authorization and a locked immutable vault.

<!-- section: database-backup | objectives: 3.1.3 -->
## Backup and recovery for databases

**Azure SQL Database and SQL Managed Instance** back themselves up: full backups every week, differential backups every 12 or 24 hours, transaction log backups every 5 to 10 minutes.

| Capability | What it gives |
| --- | --- |
| Point-in-time restore | Any point within 1 to 35 days (7 by default, 7 at most in the Basic tier). Creates a new database; also restores a deleted database |
| Long-term retention | Weekly, monthly or yearly full backups kept up to 10 years |
| Backup storage redundancy | Geo-redundant by default; locally redundant, zone-redundant or geo-zone-redundant |
| Geo-restore | Restores the latest geo-replicated backup to any region. Requires geo-redundant backup storage |

Backups alone give a slow regional recovery. Compare the objectives:

| Option | RPO | RTO |
| --- | --- | --- |
| Zone-redundant configuration (high availability) | 0 | Typically under 30 seconds |
| Active geo-replication or failover group | Above 0: the changes not yet replicated | Typically under 60 seconds |
| Geo-restore | Typically minutes or hours | Typically minutes or hours |

**Active geo-replication** is configured per database, allows up to four readable secondaries and exists only for SQL Database; after a failover the application connects to another server. A **failover group** fails over a set of databases together behind read-write and read-only listener endpoints that don't change; it is the only option for SQL Managed Instance.

> **Exam trap.** "No change to the connection string after failover" or "fail over all the databases of the application at once" means a failover group. "A readable copy in a third region" or "four secondaries" means active geo-replication. Geo-restore is the cheapest regional protection, but its RTO can reach hours.

**SQL Server on Azure virtual machines**:

| Need | Option |
| --- | --- |
| Simple scheduled backups to a storage account, managed per virtual machine | Automated Backup (SQL IaaS Agent extension) |
| Central management of many servers, long-term retention, Always On availability groups, 15-minute RPO | Azure Backup for SQL Server in Azure VMs (Recovery Services vault) |
| Full control with existing scripts | Manual backup to URL or to attached disks |

**Open-source and NoSQL databases.**

- Azure Database for PostgreSQL flexible server: backups kept 7 to 35 days (1 to 35 for MySQL flexible server), point-in-time restore to a new server. Geo-redundant backup can be chosen only at creation; a geo-restore has an RPO of up to one hour. Azure Backup adds long-term retention up to 10 years.
- Azure Cosmos DB: periodic backup by default, restored through a support request; continuous backup (7, 30 or 35 days) for self-service point-in-time restore.

<!-- section: unstructured-backup | objectives: 3.1.4 -->
## Backup and recovery for unstructured data

**Blobs.** Azure Backup offers two modes, both managed from a Backup vault. A new backup policy always includes vaulted backup (selected by default, it can't be turned off) and can add operational backup: an operational-only policy can no longer be created, but existing policies are unchanged.

| | Operational backup | Vaulted backup |
| --- | --- | --- |
| Where the data is | Stays in the source storage account | Copied to the Backup vault |
| How | Continuous: point-in-time restore, versioning, change feed and soft delete | Scheduled copies, retained according to the policy |
| Restore | To any point in time, into the source account only | To the source account or to a different storage account |
| Protects against | Accidental deletion or corruption of block blobs; a delete lock that it applies to the account guards against accidental deletion of the account | Also the deletion of containers or of the storage account itself |
| Limits | Retention up to 360 days; block blobs in standard general-purpose v2 accounts | Recovery points only at the scheduled times |

**Azure Files.** Snapshot backup keeps share snapshots in the storage account: restoring a share or single files is fast, but the snapshots disappear with the account. Vaulted backup transfers the data to the Recovery Services vault: an off-site copy that survives the loss of the account and can be restored in another region. For on-premises file servers, synchronize them with Azure File Sync and back up the Azure file share, or use the MARS agent on the servers.

**Storage account failover** is the regional recovery mechanism of geo-redundant accounts:

| Failover | When | Consequence |
| --- | --- | --- |
| Customer-managed, unplanned | The primary region is down | Writes not yet replicated are lost (check the Last Sync Time); the account becomes locally redundant in the new primary region |
| Customer-managed, planned | Drill or anticipated event, both regions available | No data loss; the account stays geo-redundant |
| Microsoft-managed | Extreme disaster, decided by Microsoft | Don't build a recovery plan on it |

| Requirement | Recommendation |
| --- | --- |
| Undo a mass overwrite of block blobs made two hours ago | Operational backup (or point-in-time restore) |
| Recover blobs even if the storage account is deleted | Vaulted backup |
| Keep reading blobs during a regional outage, then write again | RA-GRS or RA-GZRS, then customer-managed failover |
| A second, usable copy of block blobs in a region of your choice | Object replication |

> **Exam trap.** Geo-redundant storage isn't a backup: a deleted or encrypted blob is deleted or encrypted in the secondary region too. And every in-account protection (soft delete, versioning, operational backup, snapshots) goes away with the storage account; only a vaulted backup or a copy in another account is independent of it.

<!-- section: key-points -->
## Key points

- RPO is data loss, RTO is downtime. Azure Backup for retention and recovery from deletion or ransomware; Site Recovery for failover of machines with an RPO of minutes; both when both needs appear.
- Site Recovery: region to region, zone to zone when data must stay in the region, on-premises machines to Azure; recovery plans order the failover; test failovers don't disturb production.
- Recovery Services vault for virtual machines, databases in virtual machines, Azure Files and on-premises agents; Backup vault for disks, blobs, PostgreSQL and AKS.
- Enhanced policy for backups every 4 hours and newer disk types; Cross Region Restore needs a geo-redundant vault; soft delete, immutable vault and multi-user authorization protect the backups.
- SQL Database: point-in-time restore 1 to 35 days, long-term retention up to 10 years, geo-restore for a slow and cheap regional recovery, failover groups for a fast one with stable endpoints.
- Blobs and files: operational or snapshot backup for fast local recovery, vaulted backup against the loss of the account; geo-redundancy and failover for regional outages, never as a backup.
