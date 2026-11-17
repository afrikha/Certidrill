Availability and recovery questions give a recovery requirement (restore to the second, self-service restore, a deleted container, a regional outage, a partial outage of one partition) and ask for the backup mode, the restore method, the region configuration or the failover option that meets it at the lowest cost or with the least data loss.

<!-- section: backup-modes | objectives: 2.2.1 -->
## Periodic and continuous backup

Backups never consume provisioned RUs and don't affect performance. Each account uses one of two modes:

| | Periodic | Continuous |
| --- | --- | --- |
| How | Full backup at a fixed interval | Every change backed up within about 100 seconds |
| Restore point | One of the retained snapshots | **Any second** inside the retention window |
| Who restores | **Azure support** (support request) | You: portal, CLI, PowerShell, ARM template |
| Restore target | Always a new account | A new account, or deleted databases and containers back into the **same account** |
| Retention | Configurable (see below) | Tier `Continuous7Days`, `Continuous30Days` or `Continuous35Days` |
| Backup storage | Geo-redundant by default if the region supports it; zone or locally redundant on request | Locally redundant in each region of the account, zone-redundant where the region has availability zones; can't be changed |
| Cost | Two copies free, extra copies charged | 7-day tier: no backup storage charge. 30-day and 35-day tiers: backup storage charged per GB and per region. Every restore charged per GB |

**Periodic settings** (portal **Backup & Restore**, CLI, PowerShell, ARM):

- Default: a full backup every **4 hours**, the **latest two** kept (8 hours of coverage), free.
- Interval: 1 to 24 hours. Retention: at least **twice the interval**, at most 720 hours.
- Backups are taken in the write region, then geo-replicated to the paired region with geo-redundant storage. Changing the redundancy applies to future backups and immediately removes access to older ones.
- After a container or database is deleted, its existing snapshots are kept for 30 days.
- After an accidental deletion or corruption, first **increase retention to at least seven days**, ideally within 8 hours, then open the support request.

```bash
# Periodic: back up every 8 hours, keep 24 hours
az cosmosdb update --resource-group rg-contoso --name cosmos-contoso \
  --backup-interval 480 --backup-retention 24

# Create an account with continuous backup, 7-day tier
az cosmosdb create --resource-group rg-contoso --name cosmos-contoso-pitr \
  --backup-policy-type Continuous --continuous-tier Continuous7Days \
  --locations regionName="West Europe"

# Migrate an existing periodic account (one way); default tier is 30 days
az cosmosdb update --resource-group rg-contoso --name cosmos-contoso \
  --backup-policy-type Continuous --continuous-tier Continuous7Days
```

In ARM or Bicep, the account's `backupPolicy` is `{ "type": "Periodic", "periodicModeProperties": { "backupIntervalInMinutes", "backupRetentionIntervalInHours", "backupStorageRedundancy" } }` or `{ "type": "Continuous", "continuousModeProperties": { "tier": "Continuous7Days" } }`.

Migration from periodic to continuous is **one-way**: you can't go back. You can switch freely between the continuous tiers; moving to a shorter tier immediately loses the older restore points, and moving to a longer one fills up only as new backups accumulate. Continuous backup is supported for the NoSQL, MongoDB, Gremlin and Table APIs, not Cassandra.

Continuous backup is also the prerequisite for the **all versions and deletes** change feed mode.

> **Exam trap.** "Restore a container to its state 37 minutes ago, without opening a support ticket" means continuous backup. Periodic backup can only return to one of its snapshots, through Azure support. "Lowest cost" with a one-week window means the 7-day tier, which has no backup storage charge.

<!-- section: restore | objectives: 2.2.1 -->
## Restoring data

| Scenario | Method |
| --- | --- |
| Data corrupted or overwritten in a live container | Point-in-time restore of that container to a **new account**, then copy back what you need |
| A container or database was deleted | **Same-account restore** of the deleted resource (continuous mode) |
| The whole account was deleted | Restore the deleted account from the **Restore** list to a new account |
| Copy of the data in one specific region | Point-in-time restore with that region as target (it must be a region where the account existed) |
| You don't know when the deletion happened | The **event feed** of restorable databases and containers gives the creation, modification and deletion timestamps |

```bash
# Restore selected containers to a new account, at a UTC time
az cosmosdb restore --resource-group rg-contoso \
  --account-name cosmos-contoso \
  --target-database-account-name cosmos-contoso-restored \
  --restore-timestamp 2026-11-12T08:15:00+0000 \
  --location "West Europe" \
  --databases-to-restore name=sales collections=orders customers \
  --public-network-access Disabled --disable-ttl True

# Restore a deleted container into the same account
az cosmosdb sql container restore --resource-group rg-contoso \
  --account-name cosmos-contoso --database-name sales --name orders \
  --restore-timestamp 2026-11-12T08:15:00+0000 --disable-ttl True
```

Rules the exam checks:

- The restore timestamp is UTC, precise to the second, inside the retention window and after the resource was created. Use the **latest restorable timestamp** of the resource in the region to restore a live account to its most recent consistent state.
- Without `--disable-ttl True`, the restored container keeps its TTL and expired items can be deleted right after the restore.
- In a shared throughput database, you restore the whole database, not a subset of its containers. To restore a deleted container whose database was also deleted, restore the database first.
- **Not restored**: firewall, virtual network, private endpoint and data plane RBAC settings, role assignments, the source account's other regions, stored procedures, triggers and UDFs (periodic restores also lose account keys, materialized views and TTL-expired items). Reconfigure them after the restore. A restore might not restore the throughput valid at the restore point.
- A restored account is reachable from public networks unless you pass `--public-network-access Disabled`.
- At most three restore operations can be active on the same account.
- In a multi-region write account, only writes **confirmed by the hub region** at the restore time are restored, and containers with a custom conflict resolution policy come back with last writer wins.

Permissions: the portal restore pages need `Microsoft.DocumentDB/locations/restorableDatabaseAccounts/*/read`; the built-in **CosmosRestoreOperator** role performs continuous mode restores. For periodic mode, CosmosBackupOperator, Owner or Contributor can request a restore or change retention.

> **Exam trap.** A same-account restore brings back only a **deleted** database or container. To recover a live container whose items were wrongly updated, restore it to a new account and copy the correct items back.

<!-- section: multi-region | objectives: 2.2.2 -->
## Multi-region reads and writes

Adding regions to an account gives read replicas, and optionally write replicas, in each region. Regions can be added or removed at any time (but not in the same operation as other property changes); new regions become available once all data is replicated.

```bash
az cosmosdb update --resource-group rg-contoso --name cosmos-contoso \
  --locations regionName="West Europe" failoverPriority=0 isZoneRedundant=True \
  --locations regionName="North Europe" failoverPriority=1 isZoneRedundant=True

az cosmosdb update --resource-group rg-contoso --name cosmos-contoso \
  --enable-multiple-write-locations true
```

The application chooses where its requests go. Set the region it runs in, and the SDK orders the other regions by proximity and fails over to them automatically:

```text
// C# (.NET SDK v3)
CosmosClient client = new CosmosClient(endpoint, new DefaultAzureCredential(),
    new CosmosClientOptions { ApplicationRegion = Regions.WestEurope });
// or an explicit ordered list
new CosmosClientOptions { ApplicationPreferredRegions = new List<string> { "West Europe", "North Europe" } };

# Python
client = CosmosClient(endpoint, credential,
                      multiple_write_locations=True,
                      preferred_locations=["West Europe", "North Europe"])
```

| | Single write region, several read regions | Multiple write regions |
| --- | --- | --- |
| Writes | One region | Every region (local write latency) |
| Strong consistency | Supported | **Not supported** |
| Write region outage | Writes unavailable until failover (forced, service-managed or partition-level) | No expected downtime if the SDK has `ApplicationRegion` or preferred regions |
| Conflicts | None | Insert, replace and delete conflicts, resolved by policy |
| Cost | Each added region adds the throughput and storage cost of that region | Same, with write regions |

**Multi-region writes** details:

- The first region of the account is the **hub**; writes in satellite regions are committed locally, then confirmed in the hub. Confirmed writes get a `crts` timestamp (the order used by the change feed); unconfirmed ones are tentative.
- Conflict resolution policies, per container: **last writer wins** (default, on `_ts`, or on a custom numeric property, the conflict resolution path; the highest value wins, and a delete always wins over an insert or replace) or **custom** (a merge stored procedure; if it's missing or fails, conflicts go to the **conflicts feed** for the application to resolve). The custom policy is NoSQL only and can be set only when the container is created.
- Best practices: keep each application's traffic in its local region, don't spray the same write to every region or pick regions at random, avoid depending on replication lag (write in A, read in B), pass session tokens between clients only for reads, and avoid rapid repeated updates of the same item.

**Failover options for a single write region account:**

| Option | Behavior |
| --- | --- |
| Forced failover (**Offline region**) | You take the failed region offline; the read region with the highest failover priority becomes the write region. Recommended way to restore writes quickly during an outage. Unreplicated writes can be lost |
| Service-managed failover | Enable it (`--enable-automatic-failover true`) and set priorities; Microsoft decides when to fail over, which can take an hour or more |
| Change write region | Planned move of the write region when every region is healthy. Never during an outage |
| Per-partition automatic failover | Fails over only affected partitions (see next section) |

```bash
az cosmosdb update --resource-group rg-contoso --name cosmos-contoso \
  --enable-automatic-failover true

# Changing the region with priority 0 triggers a manual failover
az cosmosdb failover-priority-change --resource-group rg-contoso --name cosmos-contoso \
  --failover-policies "West Europe=0" "North Europe=1"
```

Potential data loss in a region outage (RPO) depends on the consistency level: **0 with Strong**, K versions or T seconds with bounded staleness (at least 100,000 writes or 300 seconds in multi-region accounts), **under 15 minutes** with Session, Consistent prefix and Eventual. With Strong and only two regions, or bounded staleness beyond its window, losing the read region also stops writes until it's taken offline.

> **Exam trap.** "Writes must keep working during a regional outage with no manual action" points to multi-region writes, which excludes Strong consistency. "No data loss in a regional outage" points to Strong consistency with a single write region (RPO 0), whose write availability then relies on failover.

<!-- section: partition-failover | objectives: 2.2.3 -->
## Per-partition automatic failover

Data is spread over many physical partitions, and an infrastructure problem can affect only some of them. **Per-partition automatic failover (PPAF)** lets a single write region account fail over **only the affected partitions** to another region, automatically, while healthy partitions keep writing in the primary region.

Prerequisites:

- A **single write region** account with at least one other (read) region.
- API for NoSQL, in a global Azure region.
- Consistency **Strong, Session, Consistent prefix or Eventual**. Bounded staleness isn't supported yet.
- **Every** application instance on an SDK that implements PPAF: .NET v3 3.62.0 or later, Java 4.79.0 or later, Python 4.16.0 or later, Node.js 4.7.0 or later. An older SDK can see failed writes during a partition failover.

Enable it in the portal: account **Settings** > **Features** > **Per-partition automatic failover** > **Enable**. PPAF is part of the **Business Critical** service tier and charged accordingly.

| | Per-partition automatic failover | Service-managed failover | Forced failover |
| --- | --- | --- | --- |
| Scope | Affected partitions | Whole account | Whole account |
| Trigger | Automatic, per partition | Automatic, decided by Microsoft | You |
| Typical time to restore writes | About 3 minutes | Can be an hour or more | As soon as the operation completes |
| Action needed | None | None | Detect the outage and take the region offline |

Testing: a partition failure simulation (REST API, wrapped by the `EnableDisableChaosFault.ps1` script with `-FaultType "PerPartitionAutomaticFailover"`) injects a fault into 10 % of a container's partitions (minimum 1, maximum 10); it takes up to 15 minutes to start or stop. Check **Total Requests** by region and the **PartitionWriteGlobalStatus** metric, which counts the write partitions per region, to see writes moving to the secondary region. PPAF can also kick in for a read region outage when a two-region Strong account would otherwise lose its quorum.

> **Exam trap.** PPAF needs a single write region: it isn't a feature of multi-region write accounts, which already accept writes everywhere. And it does nothing for clients on old SDK versions; upgrading every instance comes before enabling it.

<!-- section: key-points -->
## Key points

- Periodic: every 4 hours, two copies, restore by Azure support into a new account; interval 1 to 24 h, retention at least twice the interval, at most 720 h.
- Continuous: restore to the second, self-service, tiers 7 days (no backup storage charge), 30 or 35 days; migration from periodic is one-way; required by all versions and deletes change feed.
- `az cosmosdb restore` creates a new account; `az cosmosdb sql container restore` or `database restore` brings back a deleted resource into the same account; use `--disable-ttl True`; network settings and role assignments must be reapplied.
- Multi-region writes: `--enable-multiple-write-locations`, `ApplicationRegion` or `preferred_locations` in the SDK, no Strong consistency, last writer wins (`_ts` or a numeric path) or custom (merge procedure, set at creation, conflicts feed).
- Single write region: forced failover (fastest, you trigger it), service-managed failover (priorities, can take an hour or more), change write region (planned only).
- PPAF: single write region plus a read region, NoSQL, not bounded staleness, recent SDKs everywhere, Business Critical tier, about 3 minutes, affected partitions only.
