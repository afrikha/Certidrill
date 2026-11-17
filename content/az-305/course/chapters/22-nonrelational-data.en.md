Semi-structured data (JSON documents, key-value entities, graphs) goes to Azure Cosmos DB or Azure Table Storage; unstructured data (files, images, logs, disks) goes to Azure Storage. The exam then asks you to tune the choice: consistency, capacity mode, access tier, redundancy, protection against deletion.

<!-- section: semi-structured | objectives: 2.2.1 -->
## Storing semi-structured data

**Azure Cosmos DB** is the default recommendation for operational NoSQL data: reads and writes in less than 10 ms at the 99th percentile, elastic throughput, and replication to any number of regions, added or removed at any time without redeploying the application. Choose the API from the data model and from what the application already uses:

| Scenario | API |
| --- | --- |
| New application, JSON documents, SQL-like queries | NoSQL |
| Existing MongoDB application to migrate without rewriting it | MongoDB |
| Existing Cassandra workload, CQL, wide-column data | Apache Cassandra |
| Relationships to traverse (social graph, recommendations) | Apache Gremlin |
| Existing Azure Table Storage application that needs global distribution, low latency or automatic indexing | Table |

**Azure Table Storage** remains the answer for a simple, low-cost key-value store: you pay only for the capacity used, with no throughput to reserve, but without turnkey global distribution, automatic indexing of every property or the latency guarantees of Cosmos DB.

**Partition key.** A logical partition (one partition key value) holds at most 20 GB; a physical partition provides up to 10,000 request units per second (RU/s) and 50 GB. A good key has a high cardinality, spreads storage and requests evenly and appears as a filter in most queries. It can't be changed in place: the data must be copied to a new container.

**Consistency.** Five levels, set as the account default (Session by default) and only relaxable per request:

| Level | Guarantee | Typical use |
| --- | --- | --- |
| Strong | Reads always return the most recent committed write | No tolerance for stale reads; RPO of 0 across regions |
| Bounded staleness | Reads lag by at most K versions or T seconds | Near-strong consistency with a bounded delay |
| Session | Within a session, a client reads its own writes | Most applications (default) |
| Consistent prefix | Reads never see writes out of order | Feeds, status updates |
| Eventual | No ordering guarantee; replicas converge over time | Counters, likes; lowest latency and cost |

Strong and bounded staleness read from two replicas, so a read costs twice the RUs of the three weaker levels.

> **Exam trap.** An account with multiple write regions can't use strong consistency. "Writes in every region" plus "always read the latest committed version" can't both be satisfied: with multi-region writes the strongest level is bounded staleness.

**Capacity mode.**

| Mode | Billing | Recommend when |
| --- | --- | --- |
| Provisioned throughput, standard (manual) | RU/s provisioned, per hour | Steady, predictable traffic |
| Provisioned throughput, autoscale | Highest RU/s reached in each hour, between 10% and 100% of the maximum you set | Variable or unpredictable traffic, new applications |
| Serverless | RUs consumed | Intermittent traffic, development and test, low average use. Single region only |

A multi-region account offers 99.999% read and write availability. Any global-distribution requirement implies provisioned throughput, since serverless accounts run in one region.

<!-- section: unstructured | objectives: 2.2.2 -->
## Storing unstructured data

| Requirement | Service |
| --- | --- |
| Objects accessed over HTTPS from anywhere: images, video, backups, logs | Azure Blob Storage |
| Big data analytics, directories, file-level POSIX permissions | Azure Data Lake Storage (Blob Storage with the hierarchical namespace enabled) |
| Shared file system for lift-and-shift applications, replacement of file servers | Azure Files (SMB or NFS) |
| Cache of a cloud file share on Windows file servers in branch offices | Azure Files with Azure File Sync |
| Demanding file workloads: SAP HANA, HPC, NFSv3, NFSv4.1 and SMB in one service | Azure NetApp Files |
| Persistent block storage for one virtual machine | Azure managed disks |

**Storage account type** decides which services and which redundancy are available:

| Account type | Services | Redundancy | Use |
| --- | --- | --- | --- |
| Standard general-purpose v2 | Blobs (including Data Lake Storage), files, queues, tables | LRS, ZRS, GRS, RA-GRS, GZRS, RA-GZRS | Default choice; the only one of the three with access tiers and geo-redundancy |
| Premium block blobs | Block and append blobs | LRS, ZRS | High transaction rates, small objects, consistently low latency |
| Premium file shares | Azure Files only | LRS, ZRS | Enterprise or high-performance file shares; required for NFS shares |

**Azure Data Lake Storage** isn't a separate service: it is a set of Blob Storage capabilities unlocked by the hierarchical namespace. Renaming or deleting a directory becomes a single atomic operation, access is controlled with Azure RBAC and POSIX ACLs on directories and files, and it is priced at Blob Storage levels.

**Azure Files.** SMB shares exist on SSD (premium) and HDD (standard) media; NFS 4.1 shares exist on SSD only. SMB shares support identity-based access with on-premises Active Directory Domain Services, Microsoft Entra Domain Services or Microsoft Entra Kerberos.

> **Exam trap.** "Linux clients mount the share with NFS" forces a premium file share account (SSD), which has no geo-redundancy: only LRS or ZRS. A copy in another region then has to be designed separately; GRS isn't an option.

<!-- section: performance-cost | objectives: 2.2.3 -->
## Balancing features, performance and cost

**Blob access tiers** trade storage price against access price, in standard general-purpose v2 accounts.

| | Hot | Cool | Cold | Archive |
| --- | --- | --- | --- | --- |
| Intended for | Frequently accessed or modified data | Infrequently accessed data | Rarely accessed data that must stay immediately readable | Rarely accessed data that tolerates hours of delay |
| Minimum retention before an early deletion charge | None | 30 days | 90 days | 180 days |
| Time to first byte | Milliseconds | Milliseconds | Milliseconds | Hours (offline; rehydration can take up to 15 hours) |
| Availability | 99.9% | 99% | 99% | 99% |
| Storage cost | Highest | Lower | Lower still | Lowest |
| Access and transaction cost | Lowest | Higher | Higher still | Highest |

The account default tier can be hot, cool or cold, never archive. The archive tier is supported only with LRS, GRS and RA-GRS, not with ZRS, GZRS or RA-GZRS. An archived blob must be rehydrated to an online tier before it can be read.

> **Exam trap.** "Must be available within minutes" or "read immediately during an audit" excludes the archive tier, however rarely the data is accessed: choose the cold tier. "Kept 7 years, restored within a day at most" is the archive tier.

**Lifecycle management** policies move block blobs to a cooler tier or delete blobs, versions and snapshots, based on creation time, last modified time or last access time (with access time tracking enabled), filtered by prefix or blob index tags. The policies are free; a rule can bring a blob back from cool to hot when it is accessed, but can't rehydrate an archived blob. When access patterns are unknown, the **smart tier** moves data automatically between hot, cool and cold.

**Performance choices.**

| Need | Choice |
| --- | --- |
| Very high transaction rate on small objects, consistently low latency | Premium block blob account |
| I/O-intensive file share, single-digit millisecond latency | SSD (premium) file share |
| General-purpose file share at the lowest cost | HDD file share |
| Top-tier databases, SAP HANA; IOPS and throughput adjustable without restarting the virtual machine | Ultra Disk (up to 400,000 IOPS) |
| Production workloads that need low latency and granular performance tuning | Premium SSD v2 (up to 80,000 IOPS) |
| Production workloads, operating system disk included | Premium SSD (up to 20,000 IOPS) |
| Web servers, development and test; backup and infrequently accessed data | Standard SSD; Standard HDD |

Ultra Disks and Premium SSD v2 disks can't be used as operating system disks and don't support ZRS; only Premium SSD and Standard SSD disks offer ZRS.

New Azure Files shares should use the provisioned v2 billing model (storage, IOPS and throughput provisioned separately, on SSD or HDD). The pay-as-you-go model, HDD only, has three access tiers: transaction optimized (lowest transaction price), hot, and cool (lowest storage price, highest transaction price). For predictable volumes, reserved capacity lowers the storage price against a one-year or three-year commitment.

<!-- section: protection-durability | objectives: 2.2.4 -->
## Protecting data and ensuring durability

**Redundancy** sets the durability and what the data survives:

| Option | Copies | Durability over a year | Survives |
| --- | --- | --- | --- |
| LRS | Three, in one datacenter | 11 nines | Disk, node or rack failure |
| ZRS | Synchronous, across three or more availability zones | 12 nines | Loss of a datacenter or zone |
| GRS / RA-GRS | LRS in the primary region plus an asynchronous LRS copy in the secondary region | 16 nines | Loss of the region (after failover) |
| GZRS / RA-GZRS | ZRS in the primary region plus an asynchronous LRS copy in the secondary region | 16 nines | Loss of a zone with no interruption, and loss of the region |

With GRS and GZRS the secondary copy can't be read until a failover. RA-GRS and RA-GZRS expose a read-only secondary endpoint (`account-secondary.blob.core.windows.net`) at all times; Azure Files doesn't support it. Geo-replication is asynchronous, so the most recent writes can be lost in a regional disaster; the Last Sync Time property tells how far the secondary lags.

> **Exam tip.** "Zone failure, data must stay in the region" is ZRS; "regional outage" is GRS; "regional outage and the application keeps reading during it" is RA-GRS; "zone failure without downtime plus regional protection" is GZRS (RA-GZRS to read from the secondary).

Redundancy doesn't protect against deletion, overwrite or ransomware: those are replicated too. Add the data protection features:

| Risk | Feature |
| --- | --- |
| Storage account deleted or reconfigured | Azure Resource Manager lock (CanNotDelete or ReadOnly) |
| Container deleted | Container soft delete |
| Blob deleted or overwritten | Blob soft delete, blob versioning |
| Logical corruption of many block blobs | Point-in-time restore (relies on versioning, change feed and soft delete) |
| Records that must not be modified or deleted for a fixed period (WORM) | Immutable storage: time-based retention policy |
| Data to preserve until an investigation ends | Immutable storage: legal hold |
| Copy of block blobs in another account or region | Object replication (asynchronous; requires versioning on both accounts and change feed on the source) |
| Deletion of the account, ransomware | Azure Backup vaulted backup |

**Immutable storage.** A time-based retention policy keeps blobs readable but not modifiable or deletable for an interval of 1 day to 146,000 days. While unlocked, the policy can be shortened or removed; once **locked**, it can only be extended, and only a locked policy satisfies SEC Rule 17a-4(f). A legal hold has no end date and lasts until it is explicitly cleared.

> **Exam trap.** Soft delete and versioning help recover data but don't stop an administrator from removing it. A regulatory requirement that "nobody, including administrators, can delete the records for 7 years" needs a locked time-based retention policy, not soft delete and not a resource lock.

Data is always encrypted at rest; use customer-managed keys in Azure Key Vault when the organization must control the key.

**Azure Cosmos DB.** Periodic backup, the default, takes a full backup every 4 hours and keeps the latest two; restoring means opening a support request, and the data comes back in a new account. Continuous backup (7, 30 or 35 days) offers self-service point-in-time restore; an account switched to continuous mode can't return to periodic. In a regional outage, the RPO of a multi-region account depends on the consistency level: 0 with strong consistency, K and T with bounded staleness, under 15 minutes with the weaker levels.

<!-- section: key-points -->
## Key points

- Cosmos DB API follows the existing application: NoSQL for new documents, MongoDB, Cassandra, Gremlin for graphs, Table to upgrade Table Storage.
- Session is the default consistency; strong gives an RPO of 0 but is impossible with multiple write regions; serverless is single region.
- Blob Storage for objects, Data Lake Storage for analytics with ACLs, Azure Files for SMB and NFS shares (NFS needs premium), NetApp Files for the most demanding file workloads.
- Hot, cool (30 days), cold (90 days), archive (180 days, offline, hours to read); lifecycle management automates the moves.
- LRS protects against hardware failure, ZRS against a zone, GRS against a region; RA- adds reads from the secondary; premium accounts and archive have restrictions.
- Redundancy isn't backup: soft delete, versioning and point-in-time restore for mistakes, locked immutability policies for compliance.
