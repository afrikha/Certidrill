A migration question gives a source (SQL Server version, size, features in use), a target and a downtime budget, then asks for the tool, the order of steps or the cause of a failure. The downtime budget usually decides between an offline method (backup files, BACPAC) and an online one (continuous replication with a short cutover).

<!-- section: migration-requirements | objectives: 1.3.1 -->
## Evaluating the requirements

Collect these facts before choosing a target and a method:

| Requirement | Why it matters |
| --- | --- |
| Source version, edition, OS | Managed Instance link needs SQL Server 2016 or later; Azure Arc migration needs SQL Server 2014 or later |
| Database size and change rate | Decides how long a full copy takes and whether log catch-up is needed |
| Allowed downtime | Minutes: online method; hours: backup and restore or BACPAC |
| Instance-level dependencies | SQL Server Agent jobs, cross-database queries, CLR, linked servers, Database Mail point to Managed Instance |
| Unsupported in PaaS | FILESTREAM and FileTable, PolyBase, cross-instance transactions, OS access point to a virtual machine |
| Network | Bandwidth to Azure, VPN or ExpressRoute for private targets, ports to open |
| Security | Windows logins (use Microsoft Entra ID in Azure SQL Database), TDE certificates, keys |

Assessment tools:

| Tool | Gives |
| --- | --- |
| Azure Migrate | Discovery and assessment of the SQL estate at scale, Azure SQL target recommendations, sizing and monthly cost estimates |
| Migration assessment of SQL Server enabled by Azure Arc | Readiness, risks and mitigations, recommended target and service tier, price estimates; runs weekly by default, free for all editions |
| Performance baseline (Perfmon counters collected with Logman) | CPU, memory, IO data used to size the target |

Items that a database-level migration doesn't carry over and that you must plan for: **logins**, **SQL Server Agent jobs**, other server-level objects (linked servers, credentials, server audits), and the application connection strings.

<!-- section: online-offline | objectives: 1.3.2 -->
## Online or offline

**Offline**: the application stops for the whole data copy. **Online**: data is copied while the source stays in use, changes are replicated, and the application stops only for a short **cutover**.

| Method | Mode | Targets |
| --- | --- | --- |
| Managed Instance link (distributed availability group) | Online, the least downtime; target readable during replication | Managed Instance |
| Log Replay Service, continuous mode | Online-like: full, differential and log backups restored continuously; target in restoring state until cutover | Managed Instance |
| Azure Database Migration Service | Online or offline to Managed Instance and SQL Server on Azure Virtual Machines; offline to Azure SQL Database | All three |
| Database migration from SQL Server enabled by Azure Arc | Managed from the Azure portal (Managed Instance link or LRS); Azure SQL Database target in preview | Managed Instance, virtual machines, SQL Database |
| Transactional replication | Online; complex to set up | SQL Database (as subscriber), Managed Instance |
| Native backup and restore (`BACKUP ... TO URL`, `RESTORE ... FROM URL`) | Offline: downtime covers a full backup and restore | Managed Instance, virtual machines |
| BACPAC (SqlPackage, Import/Export) | Offline: export at source, import at target | SQL Database, Managed Instance |
| bcp, Azure Data Factory | Offline data copy; schema created separately | All |

> **Exam trap.** Azure SQL Database has no native `RESTORE` of a `.bak` file. To reach it, use Database Migration Service (offline), a BACPAC, or transactional replication for minimal downtime.

<!-- section: online-migration | objectives: 1.3.3 -->
## Implementing an online migration

**Managed Instance link** replicates one database per link in near real time from SQL Server 2016 or later (Enterprise, Developer or Standard). During replication the database on the managed instance is **read-only**, which also allows testing and reporting before the cutover. Prerequisites on SQL Server: the Always On availability groups feature enabled (a service restart is needed) and multiple-database link mode enabled; a database master key in `master`, which protects the certificates of the trust between the two sides; a database mirroring endpoint (port 5022 by default); every replicated database in the full recovery model with at least one full backup. Network: port 5022 open in both directions and the range 11000-11999 open from SQL Server to the managed instance subnet, with no overlapping IP ranges. Trace flags `-T1800` and `-T9567` are recommended. Only user databases are replicated, not logins, jobs or server objects. Cutover: stop the application, fail the link over to the managed instance, repoint the connection strings. With SQL Server 2022 or later the link can also fail back.

**Log Replay Service (LRS)** in **continuous** mode:

1. Back up the database with `CHECKSUM` (full, then differentials and logs) and upload the files to a Blob Storage container, one flat folder per database.
2. Start LRS without the autocomplete option, with a SAS token on the container that has **Read and List** permissions only, or a managed identity (not both).
3. Keep uploading log backups; LRS restores them in sequence.
4. At cutover: stop the application, take a tail-log backup, upload it, check that it's restored, run the complete command, repoint the application.

```bash
az sql midb log-replay start -g RG1 --mi mi-contoso -n SalesDb \
  --storage-uri "https://stcontoso.blob.core.windows.net/migration/SalesDb" \
  --storage-sas "<SAS token with Read and List only, without the leading ?>"

az sql midb log-replay show -g RG1 --mi mi-contoso -n SalesDb

az sql midb log-replay complete -g RG1 --mi mi-contoso -n SalesDb \
  --last-backup-name "SalesDb_tail.trn"
```

In **autocomplete** mode (`-a --last-bn <file>`), the full chain is uploaded in advance and LRS brings the database online after the last file: suited to a passive database that needs no catch-up. A single LRS job runs at most **30 days**. LRS is also the only way to apply **differential** backups to a managed instance.

**Transactional replication** to Azure SQL Database: the on-premises SQL Server is publisher and distributor, the Azure SQL database is a **push** subscriber. After the initial snapshot, changes flow continuously; at cutover, stop writes, let the last changes arrive, then repoint the application.

> **Exam tip.** "Minimal downtime" plus "test the target with read-only queries before cutover" plus Managed Instance as target: the Managed Instance link.

<!-- section: offline-migration | objectives: 1.3.4 -->
## Implementing an offline migration

**Native backup and restore** to a managed instance or a virtual machine:

```text
-- On SQL Server and on the managed instance: a credential for the container
CREATE CREDENTIAL [https://stcontoso.blob.core.windows.net/migration]
    WITH IDENTITY = 'SHARED ACCESS SIGNATURE',
    SECRET = '<SAS token without the leading ?>';

-- On SQL Server
BACKUP DATABASE [SalesDb]
    TO URL = 'https://stcontoso.blob.core.windows.net/migration/SalesDb_full.bak'
    WITH COPY_ONLY, COMPRESSION, CHECKSUM;

-- On the managed instance
RESTORE DATABASE [SalesDb]
    FROM URL = 'https://stcontoso.blob.core.windows.net/migration/SalesDb_full.bak';
```

**BACPAC** with SqlPackage, recommended over the portal for production and large databases:

```text
SqlPackage /a:Export /ssn:sqlsrv01 /sdn:SalesDb /tf:SalesDb.bacpac

SqlPackage /a:Import /tsn:sql-contoso-prod.database.windows.net /tdn:SalesDb /sf:SalesDb.bacpac /ua:True /tid:"contoso.onmicrosoft.com"
```

Import constraints: the portal creates only a single Azure SQL database, from a BACPAC in Blob Storage; a BACPAC into a managed instance needs SqlPackage or SSMS; importing into an elastic pool isn't supported by the portal, PowerShell or Azure CLI; the Import/Export service doesn't work with storage behind a firewall, when "Allow access to Azure services" is off, or with Microsoft Entra authentication when MFA is required.

**Database Migration Service, offline** to Azure SQL Database migrates schema and data; it doesn't migrate logins or TDE-encrypted databases.

<!-- section: migrate-to-azure | objectives: 1.3.5 -->
## Running a migration to Azure

Whatever the tool, the procedure follows the same order:

1. **Assess**: Azure Migrate or the Arc migration assessment; fix blocking issues.
2. **Choose and size the target**, from the assessment and the performance baseline.
3. **Prepare the target**: network (subnet, VPN or ExpressRoute, private endpoint), firewall rules, Microsoft Entra administrator, logins or Microsoft Entra users, keys and certificates.
4. **Migrate the schema and data** with the chosen online or offline method.
5. **Cut over**: stop writes on the source, wait for the last changes, bring the target online.
6. **Post-migration**: recreate SQL Server Agent jobs (or elastic jobs on SQL Database), map database users to logins, update statistics, repoint connection strings, run the application tests.

Keep the source **database compatibility level** at first and raise it after testing, with Query Store capturing plans before and after, to detect regressions.

For a **SQL Server on Azure Virtual Machines** target, the common choices are backup and restore through Blob Storage (offline), Database Migration Service online or offline, or a **distributed availability group** when an availability group is already configured on-premises (minimal downtime). Azure Migrate moves a whole server as is (lift and shift).

<!-- section: between-azure-sql | objectives: 1.3.6 -->
## Migrating between Azure SQL services

| From | To | Method |
| --- | --- | --- |
| Azure SQL Database | Another logical server or the same one | Database copy: `CREATE DATABASE ... AS COPY OF` or `az sql db copy` (transactionally consistent; same edition, changeable afterwards) |
| Azure SQL Database, any tier | Hyperscale | Change the service objective; online, manual cutover available within 24 hours |
| Hyperscale (converted) | General Purpose | Reverse migration within 45 days |
| Azure SQL Database | Managed Instance | BACPAC export and import with SqlPackage (no native backup exists in SQL Database) |
| Managed Instance | Azure SQL Database | BACPAC, or transactional replication with the managed instance as publisher |
| Managed Instance | Managed Instance, same region | Database copy or move |
| Managed Instance | SQL Server 2022 or SQL Server 2025 | `COPY_ONLY` backup to URL and restore `WITH MOVE` (explicit file paths), if the update policy matches the target version. A database encrypted with a service-managed TDE key (the default) can't be restored: it needs a customer-managed key that SQL Server reaches through the SQL Server Connector for Azure Key Vault |
| SQL Server on Azure Virtual Machines | Managed Instance | Same tools as from on-premises: Managed Instance link, LRS, Database Migration Service |

```text
-- Run in the master database of the destination server
CREATE DATABASE [SalesDb_Test] AS COPY OF [sql-contoso-prod].[SalesDb];
```

```bash
az sql db copy -g RG1 -s sql-contoso-prod -n SalesDb \
  --dest-name SalesDb_Test --dest-server sql-contoso-test --service-objective S0
```

<!-- section: mi-copy-move | objectives: 1.3.7 -->
## Copying and moving Managed Instance databases

Database **copy** and **move** replicate a user database **online** from one managed instance to another with Always On availability group technology:

| | Copy | Move |
| --- | --- | --- |
| Source after completion | Stays online | Dropped |
| Data loss | You don't control the exact moment replication stops | None, guaranteed by design |

1. In the portal: the source instance, **Data management > Databases**, select databases, then **Copy** or **Move**; set source and destination, **Review + Start**. With PowerShell: `Copy-AzSqlInstanceDatabase` or `Move-AzSqlInstanceDatabase`; with the Azure CLI: `az sql midb copy` or `az sql midb move`.
2. The database is seeded to the destination (up to 360 GB per hour in optimal conditions); changes keep replicating.
3. When the status is **Ready for completion**, select **Complete** within **24 hours**, or the operation is cancelled and the destination database dropped.
4. The destination database comes online for reads and writes.

Rules:

- Source and destination are different instances in the **same Azure region**; different subscriptions are allowed within the same Microsoft Entra tenant.
- Different virtual networks need connectivity (for example peering) and TCP ports **5022** and **11000-11999** open in both directions.
- User databases only, one operation per database at a time, up to eight concurrent operations per source instance; no rename during the operation.
- Databases in a failover group or a Managed Instance link can't be copied or moved, and neither the source nor the destination instance should be configured with a failover group.
- Point-in-time backups don't follow: a new backup chain starts on the destination. Tags aren't copied; transactional replication, change data capture and distributed transactions must be reconfigured after a move.
- The destination needs a matching or higher **update policy**, and access to the same Key Vault key for a customer-managed TDE protector.

Seeding progress:

```text
SELECT role_desc, transfer_rate_bytes_per_second, transferred_size_bytes,
       database_size_bytes, estimate_time_complete_utc
FROM sys.dm_hadr_physical_seeding_stats;
```

> **Exam trap.** Copy and move don't cross regions. To bring a managed instance database to another region, use a failover group, geo-restore or backup and restore instead.

<!-- section: troubleshoot | objectives: 1.3.8 -->
## Troubleshooting a migration

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| LRS fails to start | A database with the same name already exists on the instance | Rename or drop one of the databases |
| LRS fails to start with a valid-looking SAS | Token has more than Read and List (for example Write), was copied with the `?`, or is outside its validity window (time zones) | Regenerate a Read and List token, copied after the `?`, with a wider validity window |
| LRS can't find backups | Container or folder named `backup` or `backups` (reserved), nested folders, or wrong last file name in autocomplete mode | Rename the folder, use one flat folder per database, check the file name |
| LRS restore is slow | Backups taken without `CHECKSUM`, so the instance runs an integrity check | Take backups `WITH CHECKSUM` |
| LRS job cancelled | 30-day maximum exceeded | Restart, plan the cutover inside 30 days |
| Users can't sign in after a backup and restore migration | Logins not migrated; database users orphaned | Create the logins (or Microsoft Entra users), then `ALTER USER [u] WITH LOGIN = [u];` |
| Scheduled tasks stopped after migration | SQL Server Agent jobs aren't migrated with the database | Script and recreate jobs (elastic jobs on SQL Database) |
| BACPAC over 150 GB fails to import from the portal ("File contains corrupted data") or "not enough space on the disk" | Import/Export service limits (450 GB local disk) | Import with SqlPackage |
| Import/Export request fails | Storage behind a firewall, or "Allow access to Azure services" off | Run SqlPackage from an Azure virtual machine |
| Database Migration Service can't migrate a database | TDE-encrypted database | Use another method (link, LRS, backup and restore with the certificate) |
| Copy or move doesn't start or stalls | Ports 5022 and 11000-11999 blocked, different region, lower update policy, failover group on the database or on either instance | Open the ports, choose a valid destination |
| Queries slower after migration | New compatibility level or outdated statistics | Compare plans in Query Store, force the good plan or lower the compatibility level, update statistics |

<!-- section: key-points -->
## Key points

- Assess with Azure Migrate or the Azure Arc migration assessment; logins and Agent jobs are always yours to migrate.
- Online to Managed Instance: Managed Instance link (readable target, least downtime) or LRS continuous mode; online to SQL Database: transactional replication.
- Offline: backup to URL and restore (Managed Instance, virtual machines), BACPAC with SqlPackage (SQL Database, Managed Instance), DMS offline to SQL Database.
- LRS: SAS with Read and List only, one flat folder per database, `CHECKSUM`, 30 days maximum, complete command for cutover.
- Database copy for SQL Database; copy and move for Managed Instance in the same region, complete within 24 hours.
- Most migration failures come from permissions, names, network ports and objects outside the database.
