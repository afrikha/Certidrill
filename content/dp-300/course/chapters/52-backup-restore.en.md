Who takes the backups depends on the offering: Azure takes them for Azure SQL Database and SQL Managed Instance, while on SQL Server on Azure VMs you choose between an Azure-managed service and your own T-SQL jobs. Exam questions test the retention limits, which restore option meets a requirement, and the exact `BACKUP` and `RESTORE` syntax, including backups to Azure Blob Storage.

<!-- section: backup-strategy | objectives: 5.2.1 -->
## Choosing a backup strategy

**Azure SQL Database and SQL Managed Instance: automated backups.**

| Setting | Value |
| --- | --- |
| Schedule | Full every week, differential every 12 hours (vCore default) or 24 hours (DTU default), transaction log about every 10 minutes |
| Point-in-time restore (PITR) retention | 1 to 35 days, 7 by default; Basic: 1 to 7 days |
| Backup storage redundancy | LRS, ZRS, GRS or GZRS; geo-redundant by default. A change applies to future backups only; for Hyperscale it can only be set at creation |
| Long-term retention (LTR) | Weekly, monthly and yearly full backups kept up to 10 years |
| Cost | Backup storage up to the database's maximum data size isn't charged |

Hyperscale takes storage snapshots instead of full, differential and log backups, so backup and restore are fast whatever the size.

> **Exam trap.** Geo-restore needs **geo-redundant** (GRS or GZRS) backup storage. A database switched to LRS or ZRS for data residency loses geo-restore.

**SQL Server on Azure VMs: three options.**

| Requirement | Option |
| --- | --- |
| Central dashboard, policies, retention of months or years, availability group backup preference honored, e-mail alerts on failures | Azure Backup for SQL Server in Azure VMs (Recovery Services vault, log backups as often as every 15 minutes, restore to a point in time from the portal) |
| Simple, per-VM, to a storage account, managed by the SQL IaaS Agent extension | Automated Backup: retention 1 to 90 days, log backups every 5 to 60 minutes, optional encryption and system databases; user databases must use the full recovery model |
| Full control (custom schedules, a third-party tool, backup to URL from your own jobs) | Manual `BACKUP` statements in SQL Server Agent jobs or maintenance plans |

Automated Backup and Azure Backup are mutually exclusive on a VM.

**Recovery models** decide what you can back up and restore on SQL Server:

| Model | Log backups | Point-in-time restore |
| --- | --- | --- |
| FULL | Yes | Yes |
| BULK_LOGGED | Yes | Not inside a log backup that contains minimally logged operations |
| SIMPLE | No | No: only to the last full or differential backup |

The RPO of a SQL Server strategy is the log backup interval; the RTO is the time to restore the full backup, the last differential and every log backup since.

<!-- section: native-backup | objectives: 5.2.2, 5.2.6 -->
## Backing up with native tools and T-SQL

The native tools are SQL Server Management Studio (Tasks > Back Up), maintenance plans, SQL Server Agent jobs and T-SQL:

```text
-- Full, differential and log backups with integrity checks and compression
BACKUP DATABASE SalesDb TO DISK = N'F:\Backup\SalesDb_full.bak'
    WITH CHECKSUM, COMPRESSION, STATS = 10;
BACKUP DATABASE SalesDb TO DISK = N'F:\Backup\SalesDb_diff.bak'
    WITH DIFFERENTIAL, CHECKSUM, COMPRESSION;
BACKUP LOG SalesDb TO DISK = N'F:\Backup\SalesDb_log_1015.trn'
    WITH CHECKSUM, COMPRESSION;

-- Ad hoc full backup that doesn't reset the differential base
BACKUP DATABASE SalesDb TO DISK = N'F:\Backup\SalesDb_copy.bak' WITH COPY_ONLY;

-- Encrypted backup (certificate in master, back it up with its private key)
BACKUP DATABASE SalesDb TO DISK = N'F:\Backup\SalesDb_enc.bak'
    WITH COMPRESSION, ENCRYPTION (ALGORITHM = AES_256, SERVER CERTIFICATE = BackupCert);

-- Tail-log backup before restoring a damaged database
BACKUP LOG SalesDb TO DISK = N'F:\Backup\SalesDb_tail.trn' WITH NO_TRUNCATE, NORECOVERY;
```

| Option | Use |
| --- | --- |
| `COPY_ONLY` | A full backup outside the schedule (to refresh a test copy) without changing the base of the next differential |
| `CHECKSUM` | Verifies page checksums while reading, and writes a backup checksum |
| `COMPRESSION` | Smaller and usually faster backups |
| `ENCRYPTION` | Encrypts the backup file with a certificate or asymmetric key; without that certificate the backup can't be restored |
| `NORECOVERY` (log backup) | Takes the tail of the log and leaves the database in the RESTORING state |

> **Exam trap.** On Azure SQL Database you can't run `BACKUP` at all. On SQL Managed Instance a user backup must be `COPY_ONLY` and `TO URL`, and it fails on a database encrypted with **service-managed** TDE: use customer-managed TDE (or disable TDE) to take one.

<!-- section: native-restore | objectives: 5.2.3, 5.2.6 -->
## Restoring with native tools and T-SQL

A restore sequence applies the full backup, the most recent differential, then every log backup in order. Every step except the last uses `NORECOVERY`:

```text
-- Inspect a backup file before restoring
RESTORE HEADERONLY FROM DISK = N'F:\Backup\SalesDb_full.bak';
RESTORE FILELISTONLY FROM DISK = N'F:\Backup\SalesDb_full.bak';
RESTORE VERIFYONLY FROM DISK = N'F:\Backup\SalesDb_full.bak' WITH CHECKSUM;

-- Restore under a new name, moving the files
RESTORE DATABASE SalesDb_Test FROM DISK = N'F:\Backup\SalesDb_full.bak'
    WITH MOVE N'SalesDb' TO N'G:\Data\SalesDb_Test.mdf',
         MOVE N'SalesDb_log' TO N'H:\Log\SalesDb_Test.ldf',
         NORECOVERY;
RESTORE DATABASE SalesDb_Test FROM DISK = N'F:\Backup\SalesDb_diff.bak' WITH NORECOVERY;
RESTORE LOG SalesDb_Test FROM DISK = N'F:\Backup\SalesDb_log_1015.trn' WITH NORECOVERY;
RESTORE DATABASE SalesDb_Test WITH RECOVERY;
```

| Option | Effect |
| --- | --- |
| `NORECOVERY` | Leaves the database restoring, ready for the next backup |
| `RECOVERY` | Rolls back uncommitted transactions and brings the database online; no further backup can be applied |
| `STANDBY = 'file'` | Read-only between log restores (used by log shipping) |
| `REPLACE` | Overwrites an existing database with a different one, skipping the safety check |
| `MOVE` | Relocates data and log files (other drive letters on the target VM) |

In SSMS, Databases > Restore Database builds the same sequence from the backup history and offers a tail-log backup. On SQL Managed Instance, `RESTORE DATABASE ... FROM URL` restores a full backup without any `WITH` option (no `MOVE`, `REPLACE`, `NORECOVERY` or `STATS`); the restore runs asynchronously and can be tracked in `sys.dm_operation_status`.

> **Exam tip.** "The database must be readable between restores" = `STANDBY`. "Apply more log backups later" = `NORECOVERY`. Forgetting the final `WITH RECOVERY` leaves the database in the RESTORING state.

<!-- section: point-in-time | objectives: 5.2.4 -->
## Restoring to a point in time

**SQL Server (VM or on-premises):** restore the full and differential backups with `NORECOVERY`, then the log backups with `STOPAT`:

```text
RESTORE DATABASE SalesDb FROM DISK = N'F:\Backup\SalesDb_full.bak' WITH NORECOVERY, REPLACE;
RESTORE LOG SalesDb FROM DISK = N'F:\Backup\SalesDb_log_1015.trn' WITH NORECOVERY;
RESTORE LOG SalesDb FROM DISK = N'F:\Backup\SalesDb_log_1030.trn'
    WITH STOPAT = N'2026-11-10T10:24:00', RECOVERY;
```

`STOPATMARK` stops at a named transaction (`BEGIN TRANSACTION Release42 WITH MARK`). Point-in-time restore needs the FULL recovery model and an unbroken log chain.

**Azure SQL Database and SQL Managed Instance:** PITR from the portal (database > Restore), Azure CLI, PowerShell or REST, never with T-SQL. It always creates a **new** database; you can't overwrite an existing one.

```bash
az sql db restore --resource-group rg-data --server srv-sales --name SalesDb \
  --dest-name SalesDb_1024 --time "2026-11-10T10:24:00"
```

```powershell
Restore-AzSqlDatabase -FromPointInTimeBackup -PointInTime "2026-11-10T10:24:00" `
  -ResourceGroupName "rg-data" -ServerName "srv-sales" -TargetDatabaseName "SalesDb_1024" `
  -ResourceId (Get-AzSqlDatabase -ResourceGroupName "rg-data" -ServerName "srv-sales" -DatabaseName "SalesDb").ResourceId
```

| Requirement | Restore option (Azure SQL Database) |
| --- | --- |
| Undo a mistake made 2 hours ago | PITR to a new database on the **same server**, then copy the rows back or swap names |
| Database dropped yesterday | Restore deleted database (portal: server > Deleted databases; `Restore-AzSqlDatabase -FromDeletedDatabaseBackup`), same server |
| Region unavailable | Geo-restore to any server in any region (`Restore-AzSqlDatabase -FromGeoBackup`) |
| Backup older than the PITR retention | Restore from an LTR backup |

To replace the original, restore with the same service tier and compute size, then rename the databases with `ALTER DATABASE SalesDb MODIFY NAME = SalesDb_old`. Restoring requires Contributor or SQL Server Contributor on the server's scope.

> **Exam trap.** PITR in SQL Database is limited to the **same server**: cross-server, cross-subscription and cross-region PITR isn't supported. A deleted **server** takes its PITR backups with it; only LTR backups survive.

<!-- section: long-term-retention | objectives: 5.2.5 -->
## Configuring long-term backup retention

An LTR policy copies automated full backups to separate storage, with four parameters: weekly retention (W), monthly retention (M, the first backup of each month), yearly retention (Y) and the week of the year (WeekOfYear) whose backup is kept as the yearly one. Durations use ISO 8601: `P12W`, `P12M`, `P5Y`.

| Requirement | Policy |
| --- | --- |
| Keep every weekly backup 12 weeks | W = `P12W` |
| Keep one backup per month for a year | M = `P12M` |
| Keep the backup of week 16 for 7 years | Y = `P7Y`, WeekOfYear = 16 |

```bash
az sql db ltr-policy set --resource-group rg-data --server srv-sales --name SalesDb \
  --weekly-retention "P12W" --monthly-retention "P12M" --yearly-retention "P7Y" --week-of-year 16
```

```powershell
Set-AzSqlDatabaseBackupLongTermRetentionPolicy -ResourceGroupName "rg-data" -ServerName "srv-sales" `
  -DatabaseName "SalesDb" -WeeklyRetention P12W -MonthlyRetention P12M -YearlyRetention P7Y -WeekOfYear 16
```

Rules: you can't trigger an LTR backup or choose its time; the first one can take up to 7 days to appear (the most recent PITR full backup is copied when the policy is first enabled). LTR exists for SQL Database, including Hyperscale, and SQL Managed Instance. A restore creates a new database on any server or instance **of the same subscription** (`az sql db ltr-backup restore`, `Restore-AzSqlDatabase -FromLongTermRetentionBackup`). With geo-replication or failover groups, configure the same policy on the secondary: it takes effect only once that database becomes primary. SQL Server Contributor can restore LTR backups but not delete them.

> **Exam tip.** "Keep backups for 7 years for compliance" = LTR, never a PITR retention (35 days maximum). On SQL Server VMs, the equivalent is Azure Backup retention policies.

<!-- section: cloud-storage | objectives: 5.2.7 -->
## Backing up to and restoring from cloud storage

SQL Server backs up directly to Azure Blob Storage with `BACKUP ... TO URL`. The credential decides the blob type:

| Credential | Blob type | Limits |
| --- | --- | --- |
| Shared access signature (recommended), credential named after the container URL | Block blob | About 195 GB per blob (50,000 blocks of 4 MB); stripe up to 64 URLs, about 12.8 TB |
| Storage account access key, credential with any name, `WITH CREDENTIAL` | Page blob | 1 TB, no striping |

```text
CREATE CREDENTIAL [https://stcontosobackup.blob.core.windows.net/sql]
    WITH IDENTITY = 'SHARED ACCESS SIGNATURE', SECRET = '<SAS token without the leading ?>';

BACKUP DATABASE SalesDb
TO URL = N'https://stcontosobackup.blob.core.windows.net/sql/SalesDb_1.bak',
   URL = N'https://stcontosobackup.blob.core.windows.net/sql/SalesDb_2.bak'
WITH COMPRESSION, CHECKSUM, MAXTRANSFERSIZE = 4194304, BLOCKSIZE = 65536, FORMAT;

RESTORE DATABASE SalesDb
FROM URL = N'https://stcontosobackup.blob.core.windows.net/sql/SalesDb_1.bak',
     URL = N'https://stcontosobackup.blob.core.windows.net/sql/SalesDb_2.bak'
WITH RECOVERY;
```

Rules to remember:

- Appending to an existing blob isn't supported; overwrite it with `WITH FORMAT`. `INIT`, `SKIP`, `RETAINDAYS` and the tape options aren't supported.
- Backup to URL over HTTP and to premium storage isn't supported.
- Use `MAXTRANSFERSIZE = 4194304` and `BLOCKSIZE = 65536` for large backups, and stripe them to stay under the block limit.
- Starting with SQL Server 2025, backup to URL can authenticate with a managed identity (preview, SQL Server enabled by Azure Arc).

On **SQL Managed Instance**, the credential uses a SAS or the instance's managed identity (access keys aren't supported), a backup can use up to 32 stripes of at most 195 GB each, and only `BACKUP ... TO URL WITH COPY_ONLY` is allowed. Native restore from URL is how you bring a `.bak` from SQL Server into a managed instance, and a backup taken on a managed instance can be restored to SQL Server 2022 only.

> **Exam trap.** Restoring a SQL Server backup into SQL Managed Instance uses `RESTORE ... FROM URL`, not `FROM DISK`: upload the `.bak` to Blob Storage first. Into Azure SQL Database, a `.bak` can't be restored at all; use a BACPAC or a migration tool.

<!-- section: key-points -->
## Key points

- PaaS backups are automatic: full weekly, differential 12 or 24 hours, log about every 10 minutes; PITR 1 to 35 days (7 by default, Basic 7 maximum); LTR up to 10 years.
- Every PaaS restore creates a new database; PITR stays on the same server; geo-restore needs geo-redundant backup storage; LTR restores within the subscription.
- SQL Server VMs: Azure Backup for central management and long retention, Automated Backup for simple per-VM backups, T-SQL for full control.
- Restore chain: full, last differential, logs, each `NORECOVERY` except the last; `STOPAT` for a point in time; `STANDBY` for read access between restores.
- Backup to URL: SAS gives block blobs and striping up to 64 URLs; an access key gives a single page blob up to 1 TB.
- SQL Managed Instance user backups: `COPY_ONLY`, `TO URL`, not with service-managed TDE; restores `FROM URL` without `WITH` options.
