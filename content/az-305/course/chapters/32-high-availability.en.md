High availability keeps a workload running through the failure of a server, a datacenter or a zone, without a restore. Exam questions state a failure to survive, an SLA, an RPO or an RTO and a cost constraint, and ask for the cheapest redundancy option that meets them.

<!-- section: ha-principles | objectives: 3.2.1, 3.2.2, 3.2.3 -->
## Reading the requirement: which failure must be survived

High availability (HA) is redundancy that takes over automatically, usually inside one region, with little or no data loss. Disaster recovery (DR) restarts the workload in another region, with a measured data loss (RPO) and downtime (RTO). Backup protects against deletion and corruption, which replication copies faithfully: it is never an availability answer.

| Failure stated in the question | Scope of the answer | Typical options |
| --- | --- | --- |
| A server, a rack, a planned host update | Inside a datacenter | Availability set, several instances, LRS, built-in replicas of a PaaS tier |
| A datacenter or an availability zone | Across the zones of a region | Availability zones, zone-redundant tiers, ZRS |
| A whole region | Across regions | Geo-replication, failover groups, GRS or GZRS, Azure Site Recovery, a global load balancer |

Availability zones are physically separate locations of a region, each with its own power, cooling and network. A **zonal** resource is pinned to one zone that you select: it survives a zone failure only if you deploy other instances in other zones. A **zone-redundant** resource is spread or replicated across zones by the platform (ZRS, a zone-redundant database). A **regional** (nonzonal) resource has no zone: Azure places it anywhere, with no guarantee.

Components in series multiply their SLAs: a web tier at 99.95 % in front of a database at 99.99 % gives about 99.94 %, lower than each part.

> **Exam trap.** A zone-redundant design doesn't survive a regional outage. "Datacenter failure" means zones; "regional outage" means a second region.

> **Exam tip.** Synchronous replication (across zones) gives an RPO of zero; asynchronous replication (between regions) always gives an RPO above zero.

<!-- section: compute-vms | objectives: 3.2.1 -->
## High availability for virtual machines

A single virtual machine is a single point of failure. The options, in increasing order of protection:

| Option | Protects against | Facts to know |
| --- | --- | --- |
| Availability set | Rack failure and planned host updates, inside one datacenter | Up to 3 fault domains and 20 update domains, fixed at creation; 99.95 % SLA for two or more VMs; no extra cost; for regions without zones |
| Availability zones | Failure of a datacenter | Two or more VMs in two or more zones: 99.99 % SLA; a zonal VM can't be moved to another zone, it is redeployed |
| Virtual Machine Scale Sets | Same, plus automatic scaling | Flexible orchestration is the recommended mode; a zone-spanning scale set balances instances across zones |
| Azure Site Recovery | Failure of a region, or of a zone with zone-to-zone replication | Asynchronous replication to any secondary region; a DR answer with an RTO, not an HA one |

Redundant machines also need:

- **A load balancer.** Standard Load Balancer (layer 4) or Application Gateway v2 (layer 7) stop sending traffic to an unhealthy instance. A zone-redundant frontend keeps the same IP address during a zone failure.
- **Resilient disks.** Managed disks support LRS and ZRS only. A ZRS disk can be attached to a VM in another zone when its zone fails; Ultra Disk supports LRS only.
- **Replicated state.** Two VMs that each hold a local copy of the data are highly available only if the application replicates it.

An on-demand capacity reservation guarantees that a VM size is available when a failover or a scale-out needs it. A proximity placement group reduces latency; it adds no availability.

> **Exam trap.** "The application must remain available if a datacenter fails" excludes the availability set, whose machines share one datacenter. "The region has no availability zones" makes the availability set the answer.

<!-- section: compute-paas | objectives: 3.2.1 -->
## High availability for App Service, containers and multiple regions

Platform services replace failed instances themselves. The design questions are about zones and about a second region.

| Service | Zone resilience | Facts to know |
| --- | --- | --- |
| App Service | Zone-redundant App Service plan | Premium v2 to Premium v4 plans; at least two instances; no separate meter, you pay for the instances |
| Azure Kubernetes Service | Node pools spread across zones | The control plane is zone resilient by default; zones are chosen when a node pool is created; run several pod replicas and use ZRS disks for state |
| AKS pricing tier | Uptime SLA of the API server | Free: no financially backed SLA; Standard and Premium: 99.95 % with zones, 99.9 % without |
| Service Bus, Azure Container Registry | Zone-redundant by default where zones exist | No configuration, in every tier, at no extra cost |

App Service and AKS are regional: a regional outage stops every instance. A multi-region design deploys the application in two regions, replicates the data, and adds a global entry point: **Azure Front Door** for HTTP and HTTPS (fast failover, TLS offload, caching, web application firewall), **Traffic Manager** for any protocol through DNS (failover is slower because clients cache DNS answers), or the **global tier of Standard Load Balancer** for TCP and UDP behind one anycast IP address.

Active-active (both regions serve traffic) gives the lowest RTO at the price of two full deployments. Active-passive keeps the second region scaled down or undeployed: cheaper, with a longer RTO.

> **Exam trap.** Scaling out to three instances is not zone redundancy: the instances of a plan that isn't zone-redundant can share one zone.

<!-- section: relational | objectives: 3.2.2 -->
## High availability for relational data

Every Azure SQL Database tier is locally redundant. The architecture of the tier decides the rest:

| Service tier | Architecture | Zone redundancy |
| --- | --- | --- |
| Basic, Standard (DTU) | Remote storage, one compute node | Not supported |
| General Purpose (vCore), provisioned or serverless | Remote storage, stateless compute | Supported |
| Premium (DTU), Business Critical (vCore) | Local SSD storage, one primary and up to three secondary replicas | Supported at no extra cost; Business Critical includes a readable replica (read scale-out) at no extra charge |
| Hyperscale | Distributed compute, page servers and log service | Supported, chosen at database creation only; needs a high-availability replica and zone-redundant backup storage |

A zone-redundant database fails over with an RPO of zero and an RTO typically under 30 seconds. For a regional outage:

| Mechanism | Scope | Failover and endpoints |
| --- | --- | --- |
| Active geo-replication | One database; up to four readable geo-secondaries, in the same or another region; SQL Database only | Started by you or by the application; the connection string changes |
| Failover group | A group of databases of a logical server, or all user databases of a managed instance; the secondary is in another region | Customer managed (recommended) or Microsoft managed after a grace period of at least one hour; a read-write and a read-only listener endpoint stay the same |
| Geo-restore | Geo-redundant backups | Manual restore to a new server; minutes to hours of downtime and data loss |

Geo-replication and failover groups are asynchronous: RPO above zero, RTO typically under 60 seconds. SQL Managed Instance supports zone redundancy (General Purpose, Business Critical) and failover groups only: one group per instance, both instances in the same DNS zone, and a secondary used only for DR pays no SQL Server license.

SQL Server on Azure Virtual Machines has no built-in HA. An **Always On availability group** protects databases (HA in the region, DR with an asynchronous replica elsewhere, readable secondaries); a **failover cluster instance** protects the whole instance on shared storage (Azure shared disks, premium file shares, Storage Spaces Direct). Spread the VMs across zones (99.99 %) or in an availability set (99.95 %).

Azure Database for PostgreSQL and MySQL flexible servers use a standby server that doesn't serve traffic, takes over automatically and is billed like the primary:

| Configuration | Standby location | PostgreSQL SLA |
| --- | --- | --- |
| No high availability | None | 99.9 % |
| Same-zone HA (local-redundant for MySQL) | Zone of the primary | 99.95 % |
| Zone-redundant HA | Another zone; failover typically in 60 to 120 seconds | 99.99 % |

HA isn't available in the Burstable tier. Read replicas are asynchronous and promoted manually: they answer "another region" and "scale reads", not HA.

> **Exam trap.** "The connection string must not change after a failover" means a failover group. "A readable secondary in the same region" or "several secondaries" means active geo-replication.

> **Exam tip.** To offload reports from a Business Critical database at no extra cost, use its read scale-out replica (`ApplicationIntent=ReadOnly`), not a geo-secondary.

<!-- section: nonrelational | objectives: 3.2.3 -->
## High availability for semi-structured and unstructured data

Azure Storage always keeps several copies; the redundancy option decides where.

| Option | Copies | Durability over a year | Survives |
| --- | --- | --- | --- |
| LRS | Synchronous, in one datacenter | 11 nines | A node or rack failure |
| ZRS | Synchronous, across three or more zones | 12 nines | A zone failure |
| GRS | LRS, then asynchronous to a secondary region | 16 nines | A regional outage, after a failover |
| GZRS | ZRS, then asynchronous to a secondary region | 16 nines | A zone failure, and a regional outage after a failover |
| RA-GRS, RA-GZRS | Same as GRS and GZRS | 16 nines | Same, and the secondary is readable at any time |

The read-access options expose the endpoint `<account>-secondary` and raise the read SLA of the hot tier from 99.9 % to 99.99 %. The Last Sync Time property tells how much data a failover would lose; geo priority replication guarantees an RPO of 15 minutes or less for block blobs.

| Failover | When | Result |
| --- | --- | --- |
| Customer-managed planned | Both regions available: DR test, proactive move | No data loss expected; the account stays geo-redundant |
| Customer-managed unplanned | Primary endpoints unavailable | Writes after the Last Sync Time are lost; the account becomes LRS in the new primary region |
| Microsoft-managed | Severe disaster of a region | Outside your control; don't design on it |

A failover updates the DNS entries, so the URLs don't change. Limits to know: premium block blobs and SSD file shares support LRS and ZRS only; HDD file shares of Azure Files add GRS and GZRS, without read access to the secondary; the archive tier exists only with LRS, GRS and RA-GRS; managed disks support LRS and ZRS.

Azure Cosmos DB combines zone redundancy, enabled per region, with replication to other regions:

| Configuration | Outage of the write region |
| --- | --- |
| Single region | Unavailable; zone redundancy covers a zone failure only |
| Several regions, one write region | Reads continue; writes resume after a service-managed or forced failover |
| Several write regions | No expected downtime; strong consistency isn't supported |

The consistency level sets the RPO of a multi-region account: zero with strong, the staleness window with bounded staleness, less than 15 minutes with session, consistent prefix and eventual.

> **Exam trap.** RA-GRS gives read access to the secondary, never write access. To keep writing during a regional outage you need an account failover, or multi-region writes in Azure Cosmos DB.

> **Exam tip.** "Survive a zone failure and a regional outage at the lowest cost" is GZRS; add "read during the outage without a failover" and it is RA-GZRS.

<!-- section: key-points -->
## Key points

- Server or rack: availability set. Datacenter: zones, zone-redundant tiers, ZRS. Region: a second region, replication and a global entry point.
- Availability set 99.95 %, in one datacenter; two or more VMs across zones 99.99 %.
- App Service zone redundancy needs Premium v2 or higher and two instances; AKS needs zones on node pools and the Standard tier for an SLA.
- Azure SQL: no zone redundancy in Basic and Standard; Business Critical has a free readable replica; Hyperscale decides at creation.
- Failover group: stable endpoints, the only geo option for SQL Managed Instance. Active geo-replication: per database, up to four readable secondaries.
- PostgreSQL and MySQL flexible servers: standby in another zone, not in Burstable; read replicas for other regions.
- Storage: ZRS for a zone, GRS for a region, GZRS for both, RA- to read the secondary. An unplanned failover leaves the account in LRS.
- Cosmos DB: several write regions for the highest availability; the consistency level sets the RPO.
