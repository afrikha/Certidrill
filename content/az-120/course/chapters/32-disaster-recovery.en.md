High availability keeps an SAP system running inside one region; disaster recovery (DR) brings it back in another region after a widespread outage. AZ-120 questions give you an RPO, an RTO, a budget and a landscape, then ask which replication method each layer uses, what must be prepared in the DR region, which backup policy meets the requirement and how to test without touching production.

<!-- section: dr-design | objectives: 3.2.2 -->
## Designing DR with regional considerations

Start from the business targets: **RTO** (how long the system can be down) and **RPO** (how much committed data can be lost). Each technique gives a different RPO, and Microsoft gives no generic values: you derive them from the replication method.

| Design choice | What Learn says |
| --- | --- |
| Zone-to-zone DR | Mimics a metro DR design, but can fall short of resilience requirements for a geographically widespread disaster |
| Region pair | Each region has a pair in the same geography (Brazil South is the exception). Pairs can be **asymmetrical**: M-series SKUs or Azure NetApp Files may be missing in the paired region |
| Distance | Compliance may impose a minimum distance; more distance means more latency and potentially a higher RPO |
| GRS storage | Applies to standard storage accounts, which aren't suitable for SAP DBMS or data disks |
| Azure Backup | Replicates backups only between paired regions |

A common pattern runs non-production in the DR region and sacrifices it on failover.

Capacity is the other regional constraint:

- Check that the VM SKUs, Azure NetApp Files and Azure Files exist in the DR region (and zone).
- A separate DR subscription has its own quotas per VM family.
- Site Recovery alone doesn't guarantee compute. **On-demand capacity reservation** reserves capacity with no term commitment and integrates with Site Recovery to guarantee failovers. 1-year or 3-year reservations are usually not cost effective for an idle DR site.

> **Exam trap.** Availability zones are a high-availability answer. When the requirement says "regional disaster" or "minimum distance", the answer is a second region, not a second zone.

<!-- section: site-recovery | objectives: 3.2.1 -->
## Azure Site Recovery and the SAP layers

Site Recovery continuously replicates VMs and managed disks to the target region through a cache storage account in the source region. It doesn't guarantee database consistency and has data churn limits. So it protects the **application layer**, while databases use **native replication**.

| Component | DR method |
| --- | --- |
| SAP Web Dispatcher (parallel instances) | Site Recovery |
| Application servers | Site Recovery, one VM at a time; their shared file systems follow the storage method |
| ASCS/SCS and ERS | Site Recovery for VMs and disks, plus manual load balancer, Pacemaker, fencing and NFS work |
| SAP HANA | HANA System Replication (HSR) |
| SQL Server / Oracle / Db2 / SAP ASE / MaxDB | Always On / Data Guard (FarSync) / HADR / ASE HADR Always On / standby database |
| Active Directory domain controllers | Active Directory replication (a DC running in the DR region) |
| NFS on Azure NetApp Files | Cross-region replication of volumes |
| NFS on Azure Files | Custom script (for example rsync); SMB on Azure Files: Robocopy |
| Azure shared disk (Windows cluster) | Site Recovery with Azure shared disk |

What Site Recovery doesn't do for a central services cluster:

- It **doesn't replicate the Azure load balancer**: create an internal load balancer in the DR region beforehand (empty backend pool) or after failover.
- It **doesn't replicate NFS mounts**: `/sapmnt` and transport directories need their own replication.
- The Pacemaker configuration replicates with the disks but won't work out of the box; reconfigure it.
- Keep the same fencing mechanism in both regions:

| Fencing | DR action |
| --- | --- |
| SBD with iSCSI target servers | Replicate the iSCSI target VMs with Site Recovery, rediscover the iSCSI disk on DR VMs |
| Azure fence agent | Enable managed identities on DR VMs, assign the custom role, update the fence agent resource |
| SBD on Azure shared disk | Create a new shared disk in the DR region and attach it after failover |

- On Windows, Site Recovery doesn't replicate the **cloud witness**: deploy one in the DR region.

Support limits that show up in questions:

| Item | Site Recovery support |
| --- | --- |
| Write Accelerator | Not supported during protection: disable it before enabling replication, re-enable manually after failover |
| Premium SSD v2 and Ultra Disk | Supported as source with High Churn; replica disk is Premium SSD (`Premium_LRS`); host caching not supported |
| Churn | Normal Churn up to 54 MB/s per VM; eligible High Churn configurations up to 500 MB/s per VM and 250 MB/s per disk |
| Ephemeral OS disks, application security groups | Not supported |

A **recovery plan** orders the failover: VMs are grouped (all in Group 1 by default) and pre- or post-action scripts run between groups, for example to attach a load balancer or update DNS.

For SAP HANA across regions, synchronous HSR is excluded by latency. Use **asynchronous** HSR, which can't give RPO=0 and is always failed over manually. Combine it with in-region HA through **multitier** (tier 1 to tier 2 synchronous in-region, tier 3 asynchronous in the DR region) or **multitarget** replication (HANA 2.0 SPS3 and later; the DR site keeps replicating while the HA secondary is in maintenance). All tiers use the same operation mode, in practice `logreplay`.

> **Exam trap.** "Use Site Recovery for the HANA VM" is wrong for a production database. Site Recovery is for the application tier; HSR (or the DBMS-native method) protects the database.

<!-- section: dr-network | objectives: 3.2.3 -->
## Network configuration for DR

| Element | DR configuration |
| --- | --- |
| On-premises connectivity | Geo-redundant ExpressRoute: a circuit to the primary region and another to the DR region; site-to-site VPN as backup |
| Virtual network | A separate VNet and subnets in the DR region; peering between the two regions' VNets for HSR and file replication |
| Load balancers, Application Gateway (WAF) | Created separately in the DR region; cluster configuration adjusted |
| Name resolution | Update DNS after failover rather than reconfiguring clients; the DR region uses a different IP range |
| Foundation services | At least one domain controller and DNS server running in Azure; AD and DNS must work before SAP is recovered |

Site Recovery **network mapping** links source and target VNets in both directions. When replication is enabled, it creates the mappings in both directions automatically and, by default, an identical target network with the `-asr` suffix; when you map networks manually, you also create the mapping in the opposite direction. The target subnet is the one with the same name as the source subnet, otherwise the first subnet in alphabetical order.

| Failover IP rule | Result |
| --- | --- |
| Source NIC static or DHCP | Target NIC keeps the same mode |
| Target subnet has the same address space | Source IP reused if free, otherwise the next available IP |
| Target subnet has a different address space | Next available IP in the target subnet |

> **Exam tip.** SAP virtual host names resolve through DNS. A post-failover script in the recovery plan that updates the DNS records is the expected answer, not editing every client's configuration.

<!-- section: backup-strategy | objectives: 3.2.4 -->
## Backup strategy to meet SLA requirements

Backup and restore is the cheapest DR option and has the highest RTO, because everything must be restored. Azure Backup stores data in a **Recovery Services vault** replicated with LRS, ZRS or GRS. With GRS and **Cross Region Restore** (CRR) enabled, you can restore in the paired region.

| Workload | Azure Backup |
| --- | --- |
| Azure VMs, managed disks (including shared disks) | Supported |
| SAP HANA in Azure VMs, SQL Server in Azure VMs, SAP ASE | Supported |
| Oracle | Supported through VM backup with database-consistent snapshots |
| IBM Db2 | Not supported |
| Azure NetApp Files | Not supported (use ANF snapshots, AzAcSnap, ANF backup) |

SAP HANA options:

| Method | Characteristics |
| --- | --- |
| Backint streaming | Certified Backint integration; full, differential, incremental, log; point-in-time restore; long-term retention |
| HANA instance snapshot | HANA-consistent managed disk snapshots, instant backup and restore whatever the size; logs still streamed |
| AzAcSnap | Application-consistent ANF snapshots for HANA, Oracle, Db2, SQL Server; run from `cron` |

Figures to know: log backups every **15 minutes** minimum; database size up to **40 TB**; multistreaming up to **32 channels** and 1.5 GBps for data backups larger than 128 GB, on VMs with at least 16 vCPUs and 128 GB of RAM (`parallel_data_backup_backint_channels`). CRR for HANA gives an RPO of **12 hours plus the log backup frequency**.

> **Exam trap.** A requirement of an RPO of a few minutes in another region isn't met by Cross Region Restore. It needs HSR (or DBMS replication) to the DR region.

<!-- section: backup-policies | objectives: 3.2.5 -->
## Policies for backups and snapshots

HANA streaming policy rules:

- Full backup: daily or weekly. A daily full can't be combined with differential backups.
- **Either** differential **or** incremental, not both; at most one per day, retained 180 days maximum.
- Log backup can't be disabled (HANA manages it) and starts only after a successful full backup.
- Minimum retention for any backup type: 7 days. A full backup is kept until its last dependent backup expires; soft-deleted backups are kept 14 more days.

HANA instance snapshot policy: protect every database first with a Backint policy of **weekly fulls plus logs only** (no differential or incremental); snapshots are **daily**; instant restore retention 1 to 35 days (default 2). Subtypes: **Standard** (GA, no HSR) and **Enhanced** (preview, required for HSR, adds vault retention, immutability, CRR).

VM policy for application servers:

| | Standard | Enhanced |
| --- | --- | --- |
| Frequency | Daily | Every 4, 6, 8, 12 or 24 hours |
| Instant restore retention | 1 to 5 days | 1 to 30 days |
| Premium SSD v2, Ultra Disk | Not supported | Supported |
| Snapshot redundancy | LRS | ZRS for instant restore snapshots |

A VM protected with Enhanced can't be switched back to Standard.

At scale, Azure Policy deploys VM backup with built-in `deployIfNotExists` definitions such as "Configure backup on virtual machines without a given tag to an existing recovery services vault in the same location" (exclusion tag) and its inclusion-tag variant. They target one subscription and one location (not a management group) and a vault in the **same location**. Existing VMs need a remediation task. The audit definition is "Azure Backup should be enabled for Virtual Machines".

<!-- section: configure-validate | objectives: 3.2.6 -->
## Configuring and validating backups and snapshots

For HANA streaming backup, in order:

1. Create the Recovery Services vault in the **same region** as the VMs.
2. Open outbound access to Azure Backup, Azure Storage and Microsoft Entra ID: private endpoints, NSG service tags `AzureBackup`, `Storage`, `AzureActiveDirectory`, or the Azure Firewall `AzureBackup` FQDN tag (TLS inspection isn't supported). An HTTP proxy is supported only for Microsoft Entra traffic.
3. Run the **pre-registration script** as root: it creates `AZUREWLBACKUPHANAUSER` (or uses a custom user) and its `hdbuserstore` key. Otherwise discovery fails with `UserErrorHanaScriptNotRun`.
4. Discover databases (the VM is registered and an extension installed), select them, assign the policy.

For instance snapshots, also allow `AzureResourceManager` outbound and grant the roles:

| Role | Scope | Assigned to |
| --- | --- | --- |
| Virtual Machine Contributor | Source VM | Backup administrator |
| Disk Backup Reader | Source disks' resource group | VM managed identity |
| Disk Snapshot Contributor | Snapshot resource group | VM managed identity, and Backup Management Service (assigned manually) |

Snapshot supports `ext3` and `xfs` file systems. Snapshots are incremental, stored on Standard HDD in the resource group you choose, and not copied to the vault.

Validate with the backup item health: **Healthy**, **Unhealthy**, **NotReachable** (no sync for more than 2 hours) or **IRPending** (first backup not done). On ANF, an application-consistent snapshot is taken with:

```bash
azacsnap -c backup
```

<!-- section: backup-restore | objectives: 3.2.7 -->
## Performing backup and restore

| HANA restore option | Effect |
| --- | --- |
| Original location | Overwrites the source database (not supported for HSR) |
| Alternate location | Restores to another registered instance, keeps the source |
| Restore as files | Dumps files and metadata to a path (NFS, not CIFS) for a manual `RECOVER DATABASE` anywhere |

Choose **Logs (Point in Time)**, to the second, or **Full & Differential** recovery points. Rules: the target is in the **same region** and registered with the **same vault**; two instances on one VM can't be distinguished; after restoring SYSTEMDB of an MDC system, run the pre-registration script again. HSR databases restore as standalone: disable HSR on the target first. Cross Subscription Restore works only for streaming backups and can't be combined with CRR. Roles: Backup Operator on the vault, plus write access on the source and target VMs.

For application server VMs, a restore creates a new VM, restores disks or replaces existing disks.

<!-- section: dr-testing | objectives: 3.2.8 -->
## Testing disaster recovery

Test, document and tune the DR plan regularly.

- **Site Recovery**: run **Test Failover** on the recovery plan, choose a recovery point and an **isolated, non-production VNet** to avoid IP conflicts, validate, then **Cleanup test failover**. Production replication continues.
- **HSR**: a cross-region takeover is manual. Even in an exercise, confirm first that all committed data has reached the secondary.
- **Azure NetApp Files**: failover is manual; breaking replication peering makes the read-only destination volume writable.
- Recovery order: AD and DNS, database, central services, application servers, Web Dispatcher.

```bash
# On the DR HANA node, as <sid>adm
hdbnsutil -sr_state
hdbnsutil -sr_takeover
```

> **Exam trap.** A test failover into the failover VNet, when that VNet is connected to production, creates IP address and host name conflicts. Always pick an isolated, non-production network.

<!-- section: key-points -->
## Key points

- Zones are HA; a regional disaster needs a second region, checked for SKUs, ANF and quota.
- Site Recovery for application, ASCS and Web Dispatcher VMs; HSR or DBMS replication for databases.
- Site Recovery doesn't replicate load balancers, NFS mounts or the cloud witness; Write Accelerator must be disabled.
- Capacity reservation, not a reservation, guarantees DR compute.
- HANA policy: differential or incremental, logs every 15 minutes minimum; snapshots need weekly full plus logs.
- Test failover always targets an isolated VNet.
