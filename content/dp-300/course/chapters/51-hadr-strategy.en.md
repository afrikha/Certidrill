A high availability and disaster recovery (HA/DR) design starts from two numbers the business gives you: the recovery point objective (RPO, how much data you may lose) and the recovery time objective (RTO, how long you may be down). Exam questions state those numbers with a cost or effort constraint, and expect the cheapest feature of the right offering that meets both.

<!-- section: rpo-rto | objectives: 5.1.1 -->
## Choosing by RPO and RTO

First separate the failure you protect against:

| Failure | Protection | Not a protection |
| --- | --- | --- |
| Node, disk or process failure | Built-in HA (PaaS), availability group or failover cluster instance (VMs) | Backups alone (RTO too long) |
| Availability zone outage | Zone redundancy (PaaS), replicas or VMs spread across zones | An availability set (protects within one datacenter) |
| Region outage | Failover group, active geo-replication, geo-restore, cross-region availability group or log shipping | Zone redundancy |
| Accidental `DELETE`, bad deployment, corruption | Point-in-time restore, long-term retention, log backups | Any replica: replication copies the mistake within seconds |

Microsoft's published targets for Azure SQL Database:

| Option | RTO | RPO |
| --- | --- | --- |
| High availability with zone redundancy | Typically less than 30 seconds | 0 |
| Failover group (customer-managed policy) or active geo-replication | Typically less than 60 seconds | 0 or more: changes not yet replicated are lost on a forced failover |
| Geo-restore from geo-redundant backups | Minutes to hours | Minutes to hours (latest geo-replicated backup) |

Decision table:

| Requirement | Answer |
| --- | --- |
| Survive a zone failure with no data loss, least effort, Azure SQL Database or SQL Managed Instance | Enable zone redundancy |
| Regional DR, RTO under a minute, applications must keep the same connection string | Failover group |
| Regional DR for one database, several readable secondaries or a secondary in the same region | Active geo-replication (SQL Database only) |
| Regional DR at the lowest cost, RPO and RTO of hours acceptable | Geo-restore (requires geo-redundant backup storage) |
| SQL Server on Azure VMs, automatic failover, zero data loss inside a region | Availability group, synchronous commit, VMs in different availability zones |
| SQL Server on Azure VMs, instance-level protection (jobs, logins, all databases) with shared storage | Failover cluster instance |
| SQL Server on Azure VMs, DR in another region, RPO of minutes, minimal cost and complexity | Log shipping or asynchronous availability group replica |
| Recover data as it was 3 days ago | Point-in-time restore |

> **Exam trap.** Synchronous commit means zero data loss but adds latency to every commit; across regions use **asynchronous** commit and accept an RPO greater than zero. Automatic failover requires synchronous commit.

> **Exam tip.** A geo-secondary used only for DR, with no read workload, can be designated a license-free **standby** replica in SQL Database, and a DR-only replica in a SQL Managed Instance failover group gets free vCores matching the primary. "Minimize cost" plus "secondary isn't used" points to that option.

<!-- section: hybrid-hadr | objectives: 5.1.2 -->
## HA/DR for hybrid deployments

Hybrid means a primary on-premises (or in another cloud) and a secondary in Azure, or the reverse. Connectivity comes first: site-to-site VPN or ExpressRoute.

| Requirement | Solution |
| --- | --- |
| DR in a PaaS service for an on-premises SQL Server 2016 or later, near real-time replication | Managed Instance link to SQL Managed Instance |
| Fail over to Azure and **fail back** to on-premises | Managed Instance link with SQL Server 2022 or 2025 (bidirectional) and a matching SQL Server 2022 or 2025 update policy on the instance |
| DR replica on SQL Server on an Azure VM, readable, automatic seeding | Availability group with an asynchronous replica in Azure, or a distributed availability group between an on-premises cluster and an Azure cluster |
| Simple, low-cost warm standby, RPO of minutes, manual failover | Log shipping to SQL Server on an Azure VM |
| Cold standby, lowest cost, RTO of hours | Backup to URL in geo-redundant storage, restore on demand |

Managed Instance link facts that decide answers:

- It uses distributed availability groups; it supports Enterprise, Developer and Standard editions.
- SQL Server 2016 SP3, 2017 CU31 (both with the Azure Connect pack) and 2019 CU20 replicate one way only (SQL Server to SQL Managed Instance); failing back isn't supported.
- Only user databases are replicated: logins, SQL Server Agent jobs and other server-level objects must be recreated on the instance.
- Authentication between the two sides is certificate-based; the link uses the instance's VNet-local endpoint, not a public or private endpoint.
- An instance that uses the link can't be part of a failover group.
- If the managed instance replica is designated for DR only, you pay no SQL Server license for its vCores (hybrid failover benefit).

> **Exam trap.** An availability group that spans on-premises and Azure as one Windows cluster needs the domain and the cluster extended to Azure. A **distributed** availability group links two separate availability groups on two clusters, which is the usual design between datacenters or regions.

<!-- section: azure-hadr | objectives: 5.1.3 -->
## Azure-specific HA/DR solutions

**Built-in HA of the PaaS offerings.** Nothing to configure, but the architecture explains the exam answers:

| Service tier | Availability model | Consequence |
| --- | --- | --- |
| Basic, Standard, General Purpose | Remote storage: stateless compute, data and log files on remote Azure storage | On failure a new compute node attaches the storage; failover takes longer, there's no readable replica |
| Premium, Business Critical | Local storage: primary plus up to three secondary replicas on local SSD, like an availability group | Fast failover; one secondary serves read-only connections through read scale-out at no extra charge |
| Hyperscale | Distributed: compute replicas, page servers, log service, storage | Optional high availability replicas are the failover targets; at least one is required for zone redundancy |

Zone redundancy is available for General Purpose, Business Critical, Hyperscale and Premium, not for Basic or Standard. Within a region, both locally redundant and zone-redundant availability have an RPO of zero.

**Geo-DR features compared:**

| Feature | Active geo-replication | Failover group |
| --- | --- | --- |
| Offering | SQL Database | SQL Database and SQL Managed Instance |
| Unit of failover | One database | A group of databases (SQL Database) or all user databases of the instance (SQL Managed Instance) |
| Readable secondaries | Up to four, any region, including the primary's | One secondary server or instance, in another region |
| Connection string after failover | Changes to the new server | Unchanged: read-write and read-only listeners |
| Microsoft-managed (automatic) failover option | No | Yes, but customer-managed is recommended |

**SQL Server on Azure VMs** uses the SQL Server features (availability groups, failover cluster instances, log shipping, backups) on Azure infrastructure. Place the VMs either in **availability zones** (protects against a datacenter loss, slightly higher latency between replicas) or in an **availability set** (protects against rack failures and planned maintenance); a VM can't be in both. Azure Site Recovery can replicate the whole VM to another region when the database isn't the only component to recover.

> **Exam trap.** Read scale-out on Business Critical uses the built-in HA replica of the **same** region. It isn't a DR solution: a regional outage takes it down with the primary.

<!-- section: testing | objectives: 5.1.4 -->
## Planning HA/DR tests

A DR plan that was never tested has an unknown RTO. A test procedure has these steps:

1. Write the runbook: who decides, which command fails over, the expected RPO and RTO, the rollback (failback) steps.
2. Prepare the secondary: same compute size and service tier, firewall rules, network access, logins with the same SIDs or contained users, SQL Server Agent jobs, Microsoft Entra configuration.
3. Run the failover in a maintenance window, then measure the time until the application works again and the data lost.
4. Validate the application: connection strings or listeners, retry logic for transient errors, read-only routing.
5. Fail back and record the lessons learned; repeat on a schedule and after every major change.

| Solution | Test without data loss |
| --- | --- |
| Built-in HA of SQL Database or an elastic pool | User-initiated failover: `Invoke-AzSqlDatabaseFailover` or `Invoke-AzSqlElasticPoolFailover` (once every 15 minutes per database or pool), or Maintenance > Restart in the portal |
| Built-in HA of SQL Managed Instance | `Invoke-AzSqlInstanceFailover` |
| Failover group or geo-replication | Planned failover (full synchronization, no data loss), then fail back |
| Availability group | Planned manual failover to a synchronous secondary; for an asynchronous DR replica, switch it to synchronous commit and wait for SYNCHRONIZED first |
| Azure Site Recovery | Test failover into an isolated virtual network: replication continues |
| Backups | Restore regularly to a test server, then run `DBCC CHECKDB` |

```powershell
# Test application resilience to a local failover of a database
Invoke-AzSqlDatabaseFailover -ResourceGroupName "rg-data" -ServerName "srv-sales" -DatabaseName "SalesDb"
```

> **Exam trap.** A **forced** failover (`FORCE_FAILOVER_ALLOW_DATA_LOSS`, `-AllowDataLoss`) is for real disasters when the primary is unreachable. A DR drill uses the planned failover.

<!-- section: key-points -->
## Key points

- Map each failure to a protection: replicas for hardware, zones and regions; backups for human error and corruption.
- Zone redundancy: RTO under 30 seconds, RPO 0. Failover groups and geo-replication: RTO under 60 seconds, RPO near 0. Geo-restore: hours.
- Failover groups keep connection strings and fail over several databases together; active geo-replication gives up to four secondaries for one SQL Database database.
- Hybrid DR to PaaS = Managed Instance link; fail back requires SQL Server 2022 or 2025 and a matching update policy.
- Synchronous commit for zero data loss and automatic failover nearby; asynchronous across regions.
- Test with planned failovers, measure RPO and RTO, and fail back; keep forced failover for real outages.
