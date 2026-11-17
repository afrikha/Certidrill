This chapter configures the HA/DR features chosen in the strategy: active geo-replication and failover groups for the PaaS offerings, availability groups, failover cluster instances and log shipping for SQL Server, plus the Managed Instance link. Exam questions show commands to complete, steps to order, and symptoms to diagnose with DMVs.

<!-- section: active-geo-replication | objectives: 5.3.1 -->
## Configuring active geo-replication

Active geo-replication (Azure SQL Database only) creates up to four readable geo-secondaries of one database, on other logical servers in the same or other regions, through asynchronous replication. A secondary of a secondary (chaining) is possible, but only programmatically.

Rules that decide answers:

- The secondary must use the **same service tier**; use the same compute size, compute tier and backup storage redundancy too. Scale up the secondary first, then the primary; scale down in the reverse order.
- A secondary can be a single database or a database in an elastic pool, but two secondaries of the same primary can't share a pool.
- After a failover the endpoint **changes** to the new server: applications need a new connection string (failover groups avoid this).
- Use database-level firewall rules and contained database users: they replicate with the database. Server-level rules and logins must be recreated on the secondary server.
- A secondary used for no workload can be designated a license-free standby replica.

Portal: database > Replicas > Create replica. T-SQL runs in `master`:

```text
-- On the primary server (master): create a readable secondary
ALTER DATABASE [SalesDb] ADD SECONDARY ON SERVER [srv-sales-dr] WITH (ALLOW_CONNECTIONS = ALL);

-- On the secondary server (master): planned failover, no data loss
ALTER DATABASE [SalesDb] FAILOVER;

-- On the secondary server (master): forced failover when the primary is unavailable
ALTER DATABASE [SalesDb] FORCE_FAILOVER_ALLOW_DATA_LOSS;

-- On the primary database: wait until committed transactions reach the secondary
EXEC sys.sp_wait_for_database_copy_sync @target_server = N'srv-sales-dr', @target_database = N'SalesDb';
```

```bash
az sql db replica create --resource-group rg-data --server srv-sales --name SalesDb \
  --partner-resource-group rg-dr --partner-server srv-sales-dr
az sql db replica set-primary --resource-group rg-dr --server srv-sales-dr --name SalesDb
```

```powershell
New-AzSqlDatabaseSecondary -ResourceGroupName "rg-data" -ServerName "srv-sales" -DatabaseName "SalesDb" `
  -PartnerResourceGroupName "rg-dr" -PartnerServerName "srv-sales-dr" -AllowConnections "All"
Set-AzSqlDatabaseSecondary -ResourceGroupName "rg-dr" -ServerName "srv-sales-dr" -DatabaseName "SalesDb" `
  -PartnerResourceGroupName "rg-data" -Failover
```

> **Exam trap.** Failover commands always run against the **secondary** that becomes primary. Add `-AllowDataLoss` (PowerShell), `--allow-data-loss` (CLI) or `FORCE_FAILOVER_ALLOW_DATA_LOSS` only when the primary is unreachable.

<!-- section: availability-groups | objectives: 5.3.2 -->
## Configuring availability groups on Azure VMs and SQL Managed Instance

**SQL Server on Azure VMs.** Order of operations:

1. Deploy the VMs in different availability zones (or one availability set), ideally each in its **own subnet** of the same virtual network; one NIC per VM.
2. Create the Windows Server failover cluster and its quorum: a **cloud witness** whenever possible (Windows Server 2016 or later).
3. Enable the Always On availability groups feature in SQL Server Configuration Manager and restart the service.
4. Set the databases to the FULL recovery model and take a full backup.
5. Create the availability group with database mirroring endpoints (port 5022 by default), synchronous commit with automatic failover between the nearby replicas, asynchronous commit for a remote DR replica.
6. Create the listener, then test a failover.

```text
CREATE AVAILABILITY GROUP [AG1]
WITH (AUTOMATED_BACKUP_PREFERENCE = SECONDARY)
FOR DATABASE [SalesDb]
REPLICA ON
  N'SQLVM1' WITH (ENDPOINT_URL = N'TCP://sqlvm1.contoso.com:5022',
    AVAILABILITY_MODE = SYNCHRONOUS_COMMIT, FAILOVER_MODE = AUTOMATIC, SEEDING_MODE = AUTOMATIC),
  N'SQLVM2' WITH (ENDPOINT_URL = N'TCP://sqlvm2.contoso.com:5022',
    AVAILABILITY_MODE = SYNCHRONOUS_COMMIT, FAILOVER_MODE = AUTOMATIC, SEEDING_MODE = AUTOMATIC);

-- On SQLVM2
ALTER AVAILABILITY GROUP [AG1] JOIN;
ALTER AVAILABILITY GROUP [AG1] GRANT CREATE ANY DATABASE;

-- Multi-subnet listener: one IP address per subnet
ALTER AVAILABILITY GROUP [AG1] ADD LISTENER N'ag1-listener'
  (WITH IP ((N'10.10.1.10', N'255.255.255.0'), (N'10.10.2.10', N'255.255.255.0')), PORT = 1433);
```

| Connectivity | When |
| --- | --- |
| Multi-subnet listener | Recommended: no load balancer or DNN needed, like on-premises |
| Distributed network name (DNN) listener | Single subnet; faster failover, no load balancer to manage. SQL Server 2016 SP3, 2017 CU25 or 2019 CU8 and later on Windows Server 2016 and later |
| Virtual network name (VNN) with Azure Load Balancer | Single subnet, older versions; enable floating IP (Direct Server Return) and a health probe port |

Clients set `MultiSubnetFailover=True`, even in a single subnet. A basic availability group (Standard edition) has one secondary, not readable.

**SQL Managed Instance.** You don't create availability groups on a managed instance: Business Critical already runs one internally. The availability group you configure is the **Managed Instance link**, a distributed availability group between SQL Server and the instance:

1. On SQL Server: enable the Always On availability groups feature, use the FULL recovery model, take a full backup, create a database mirroring endpoint secured with a certificate.
2. Open network connectivity between SQL Server and the instance's subnet (VPN, ExpressRoute or peering for an Azure VM).
3. In SSMS, run the link wizard (Azure SQL Managed Instance link > Replicate database), or script it with Az.Sql or Azure CLI.
4. Fail over with the SSMS failover wizard or, from SQL Server 2022 CU13, with T-SQL.

<!-- section: failover-groups | objectives: 5.3.3 -->
## Configuring failover groups

A failover group replicates a set of databases to a secondary server in another region and fails them over together, behind listeners that don't change:

| Offering | Read-write listener | Read-only listener |
| --- | --- | --- |
| SQL Database | `<fog-name>.database.windows.net` | `<fog-name>.secondary.database.windows.net` |
| SQL Managed Instance | `<fog-name>.<zone_id>.database.windows.net` | `<fog-name>.secondary.<zone_id>.database.windows.net` |

| Setting | SQL Database | SQL Managed Instance |
| --- | --- | --- |
| Databases | Chosen databases or elastic pools; several groups per server | All user databases (not `master` or `msdb`); one group per instance |
| Secondary | A server in another region, same Microsoft Entra tenant | An instance in another region sharing the **DNS zone** of the primary (set at creation), same configuration, networks connected by global peering (recommended), VPN or ExpressRoute |
| Seeding | Up to 500 GB per hour | Up to 360 GB per hour |

Failover policy: **customer managed** (`Manual`, recommended) or Microsoft managed (`Automatic`, with a grace period of at least 1 hour before a forced failover with possible data loss). Failover of the read-only listener is disabled by default.

```bash
az sql failover-group create --name fog-sales --resource-group rg-data --server srv-sales \
  --partner-server srv-sales-dr --add-db SalesDb OrdersDb --failover-policy Manual
# Planned failover: run against the secondary server
az sql failover-group set-primary --name fog-sales --resource-group rg-data --server srv-sales-dr
```

```powershell
New-AzSqlDatabaseFailoverGroup -ResourceGroupName "rg-data" -ServerName "srv-sales" `
  -PartnerServerName "srv-sales-dr" -FailoverGroupName "fog-sales" -FailoverPolicy Manual
Switch-AzSqlDatabaseFailoverGroup -ResourceGroupName "rg-data" -ServerName "srv-sales-dr" -FailoverGroupName "fog-sales"
```

SQL Server Contributor has the permissions to create and fail over failover groups. Prepare the secondary: matching server logins (same SIDs) and firewall rules for SQL Database; logins and SQL Server Agent jobs recreated on the secondary instance for SQL Managed Instance.

> **Exam trap.** A SQL Managed Instance failover group can't fail over a subset of databases, and its listeners aren't reachable through the public endpoint. For one database to fail over alone, it must be in its own SQL Database failover group or use geo-replication.

<!-- section: failover-cluster-instances | objectives: 5.3.4 -->
## Configuring failover cluster instances on Azure VMs

A failover cluster instance (FCI) protects the whole SQL Server instance (logins, jobs, all databases) on shared storage; only one node owns the instance at a time.

| Shared storage | Use when | Limits |
| --- | --- | --- |
| Azure shared disks (Premium SSD, Premium SSD v2, Ultra Disk) | Default choice; FILESTREAM and MSDTC supported | Premium SSD caching not supported; Premium SSD ZRS for availability zones; Ultra Disk in one zone only |
| Premium file shares (SMB) | SQL Server 2012 and later, availability sets or zones | No FILESTREAM, no MSDTC |
| Storage Spaces Direct | Software virtual SAN, SQL Server 2016 and later | Availability sets only, storage paid on every node, no MSDTC |
| Azure Elastic SAN (iSCSI) | SQL Server 2022, availability zones | No cloud witness, no FILESTREAM or MSDTC |

Steps: prepare the VMs (one subnet per VM recommended), attach the shared storage, create the cluster and its quorum (a **disk witness** is preferred with shared disks), install SQL Server as an FCI on the first node and add the other nodes, then configure connectivity (multi-subnet, DNN or VNN with a load balancer). An FCI registered with the SQL IaaS Agent extension doesn't support automated backup, patching or Microsoft Entra authentication.

> **Exam tip.** "Protect instance-level objects without synchronizing them" points to an FCI; "readable secondary" or "a copy of the data in another region" points to an availability group, because an FCI has a single copy of the data.

<!-- section: log-shipping | objectives: 5.3.5 -->
## Configuring log shipping

Log shipping is a SQL Server feature (on Azure VMs and on-premises) that sends log backups from a primary database to one or more secondaries. SQL Server Agent runs four jobs:

| Job | Server | Role |
| --- | --- | --- |
| Backup | Primary | Backs up the log to a share (or path) |
| Copy | Secondary | Copies the backup files to the secondary |
| Restore | Secondary | Restores them `WITH NORECOVERY`, or `WITH STANDBY` for read access between restores |
| Alert | Monitor server (optional) or each server | Raises an alert when a backup or restore threshold is exceeded |

Requirements: FULL or BULK_LOGGED recovery model, an initial full backup restored on the secondary with `NORECOVERY`, a share reachable by the SQL Server Agent accounts. In SSMS: database > Properties > Transaction Log Shipping > enable as primary, schedule the backup, add the secondaries and an optional monitor. Failover is manual: back up the tail of the log, restore the remaining backups, recover the secondary with `RESTORE DATABASE SalesDb WITH RECOVERY`, then redirect the applications.

> **Exam trap.** In `STANDBY` mode, users are disconnected while each log backup is restored; the RPO is the backup plus copy plus restore interval. Log shipping has no automatic failover and no listener.

<!-- section: monitor-hadr | objectives: 5.3.6 -->
## Monitoring HA/DR

| Solution | Where to look |
| --- | --- |
| Active geo-replication | `sys.dm_geo_replication_link_status` on the primary database (`replication_state_desc`, `replication_lag_sec`, `last_replication`); `sys.geo_replication_links` in `master` |
| Failover group | Portal status (Seeding, Synchronizing, Failover in progress); the same DMVs per database; Microsoft-initiated failovers appear in the activity log |
| Availability group, Managed Instance link | SSMS availability group dashboard; `sys.dm_hadr_database_replica_states` (`synchronization_state_desc`, `log_send_queue_size`, `redo_queue_size`); `sys.dm_hadr_availability_replica_states`; the `AlwaysOn_health` Extended Events session |
| Failover cluster instance | Failover Cluster Manager, cluster log, Windows events |
| Log shipping | Transaction Log Shipping Status report in SSMS; `msdb.dbo.log_shipping_monitor_primary` and `log_shipping_monitor_secondary`; Agent job history |
| Platform events | Azure Monitor activity log and Resource Health |

```text
-- Geo-replication lag, on the primary database
SELECT partner_server, partner_database, replication_state_desc, replication_lag_sec, last_replication
FROM sys.dm_geo_replication_link_status;

-- Availability group data loss and recovery exposure, on the primary replica
SELECT DB_NAME(database_id) AS db, synchronization_state_desc,
       log_send_queue_size, log_send_rate, redo_queue_size, redo_rate
FROM sys.dm_hadr_database_replica_states;
```

A growing `log_send_queue_size` means more potential data loss (RPO); a growing `redo_queue_size` means a longer failover (RTO).

<!-- section: troubleshoot-hadr | objectives: 5.3.7 -->
## Troubleshooting HA/DR

| Symptom | Cause | Fix |
| --- | --- | --- |
| Logins fail after a geo-failover | Server logins missing on the new primary, or created with different SIDs | Create the logins with the same SID, or use contained database users |
| Clients refused after failover, the database is online | Server-level firewall rules don't replicate | Use database-level firewall rules or set the same server rules on both servers |
| Applications still connect to the old primary | Connection string uses the server name | Use the failover group listener or the availability group listener with `MultiSubnetFailover=True` |
| Cluster evicts nodes (event 1135), lease expired (errors 19407, 19419) | Monitoring thresholds too aggressive for Azure | Relaxed monitoring: SameSubnetThreshold and CrossSubnetThreshold 40, lease timeout 40 seconds, health check timeout 60 seconds |
| Availability group doesn't fail over again after several failovers | Max failures in the specified period reached (default 2) | Increase it in the clustered role's failover properties |
| Listener with VNN unreachable | Load balancer without floating IP, or probe port blocked | Enable Direct Server Return and open the probe port; or switch to DNN or multi-subnet |
| Transaction log of the primary keeps growing | A secondary replica is disconnected or suspended: the log can't be truncated | Fix the connection, then `ALTER DATABASE [SalesDb] SET HADR RESUME;` on the secondary, or remove the replica |
| Replication lag grows | Secondary under-sized, or a large write burst | Scale the secondary to the primary's size (scale it up first) |
| Managed instance failover group stuck seeding | No connectivity between the two subnets | Fix global peering or the VPN, and the NSG rules between the subnets |

> **Exam tip.** Relaxed monitoring hides problems; use it to reduce false failovers in Azure, not as the fix for an unhealthy network.

<!-- section: key-points -->
## Key points

- Active geo-replication: up to four readable secondaries per SQL Database database, same service tier, endpoint changes on failover; commands run on the secondary.
- Failover groups: listeners that don't change; SQL Database groups selected databases, SQL Managed Instance groups all user databases, one group per instance and a shared DNS zone.
- Availability groups on VMs: cluster plus cloud witness, synchronous nearby and asynchronous remote, multi-subnet or DNN listener; on SQL Managed Instance, the Managed Instance link.
- FCI: shared storage (Azure shared disks preferred, disk witness), one copy of the data, instance-level protection.
- Log shipping: backup, copy, restore and alert jobs; `NORECOVERY` or `STANDBY`; manual failover.
- Monitor lag with `sys.dm_geo_replication_link_status` and `sys.dm_hadr_database_replica_states`; recreate logins, firewall rules and jobs on the secondary.
