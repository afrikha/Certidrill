The change feed is the ordered, persistent record of the writes made to a container. DP-420 questions ask which consumer to build (change feed processor, pull model or Azure Functions trigger), how to configure its lease container, which mode captures deletes, and how to copy a container with a container copy job. Expect C# or Python code to complete.

<!-- section: change-feed-basics | objectives: 1.4.1 -->
## How the change feed works

The change feed is **enabled by default** and available in every container of every account, whether you use it or not. It records changes in the order they were made and lets you process them asynchronously and incrementally, in parallel across consumers.

| Property | Behavior |
| --- | --- |
| Operations captured | Inserts and updates. Deletes and TTL expirations only in all versions and deletes mode |
| Order | Modification order, guaranteed **per partition key value** only. No order across partition key values |
| Batches | Items written by one transactional batch, stored procedure or bulk request share a modification time and can arrive in any order inside that scope |
| Parallelism | Changes are exposed per partition key range (physical partition), so several consumers can share a large container |
| Cost | Reading consumes RUs from the provisioned throughput, in any region of the account. The feed itself costs nothing more; the processor adds the lease container's throughput |
| Several consumers | Many applications can read the same container's feed at the same time, each in its own mode |
| Multi-region | Changes made in one region are available in all regions; the feed stays contiguous across a manual failover |

In a multi-region write account each change has two timestamps: `_ts` (written in the local region) and `crts` (conflict resolved or confirmed in the hub region). Change feed items come in `crts` order.

Ways to read the feed in latest version mode:

| Method | .NET | Java | Python | Node.js |
| --- | --- | --- | --- | --- |
| Change feed pull model | Yes | Yes | Yes | Yes |
| Change feed processor | Yes | Yes | No | No |
| Azure Functions trigger | Yes | Yes | Yes | Yes |

Typical uses: event-driven processing (notify, call an API), maintaining a **materialized view** or a copy of the data with a different partition key, feeding a search index or cache, streaming changes to another store, and auditing.

> **Exam trap.** The change feed processor exists only in the .NET and Java SDKs. A Python application reads the change feed with the pull model (`query_items_change_feed`) and manages its own checkpoints, or uses the Azure Functions trigger.

<!-- section: processor-vs-pull | objectives: 1.4.2 -->
## Change feed processor or pull model

Both keep a bookmark of the last processed change, but in different places, and you can't convert one into the other.

| Feature | Change feed processor | Pull model |
| --- | --- | --- |
| Bookmark | **Lease** documents in a lease container | **Continuation token**, kept in memory or persisted by you |
| Polling for new changes | Automatic, every `WithPollInterval` | Manual |
| No new changes | Waits for the poll interval and rechecks | You test the status (`NotModified`) and retry |
| Whole container | Yes, automatically spread over threads and machines | Yes, parallelized manually with `FeedRange` |
| One partition key only | Not supported | Supported |
| Replay past changes | Yes | Yes |

| Requirement | Choose |
| --- | --- |
| Continuous processing with automatic load balancing and checkpointing | Change feed processor |
| Serverless, no worker to host | Azure Functions trigger (uses the processor internally) |
| Read only the changes of one partition key | Pull model with `FeedRange.FromPartitionKey` |
| Control the pace, one-time read for a migration | Pull model |
| Python or Node.js worker | Pull model (or Functions) |

Pull model in C#. `ChangeFeedStartFrom` (start position and optional `FeedRange`) and `ChangeFeedMode` are both required:

```text
FeedIterator<Order> iterator = container.GetChangeFeedIterator<Order>(
    ChangeFeedStartFrom.Beginning(), ChangeFeedMode.LatestVersion);

string continuation = null;
while (iterator.HasMoreResults)
{
    FeedResponse<Order> response = await iterator.ReadNextAsync();
    if (response.StatusCode == HttpStatusCode.NotModified)
    {
        continuation = response.ContinuationToken;   // persist it
        await Task.Delay(TimeSpan.FromSeconds(5));
        continue;
    }
    foreach (Order order in response) { /* process */ }
}

// Later: resume exactly where the previous reader stopped
FeedIterator<Order> resumed = container.GetChangeFeedIterator<Order>(
    ChangeFeedStartFrom.ContinuationToken(continuation), ChangeFeedMode.LatestVersion);

// One partition key, or one physical partition per worker
ChangeFeedStartFrom.Beginning(FeedRange.FromPartitionKey(new PartitionKey("tenant-42")));
IReadOnlyList<FeedRange> ranges = await container.GetFeedRangesAsync();
```

Rules the exam checks:

- `HasMoreResults` is **always true**: the feed is infinite. The end of the available changes is signalled by HTTP 304 `NotModified`, not by an empty page. A 200 `OK` with zero items doesn't mean you reached the end.
- Start positions: `Beginning()`, `Now()`, a point in time, or `ContinuationToken(...)`. A continuation token takes precedence over the other start options.
- `GetFeedRangesAsync` returns **one `FeedRange` per physical partition**. An orchestrator distributes them (`FeedRange.ToJsonString` / `FromJsonString`) so each worker reads its own range.
- `ChangeFeedRequestOptions.PageSizeHint` caps the items per page (a stored procedure's transaction can exceed it so that it stays in one page).
- `GetChangeFeedStreamIterator` returns raw streams without deserialization.
- In latest version mode a continuation token never expires while the container exists.

Pull model in Python:

```text
# Whole container from the beginning (LatestVersion is the default mode)
for doc in container.query_items_change_feed(start_time="Beginning"):
    process(doc)
continuation_token = container.client_connection.last_response_headers["etag"]

# One partition key, or one feed range per worker
container.query_items_change_feed(start_time="Beginning", partition_key="tenant-42")
ranges = list(container.read_feed_ranges())
container.query_items_change_feed(start_time="Beginning", feed_range=ranges[0])

# Resume later; the token carries the mode
container.query_items_change_feed(continuation=continuation_token)
```

<!-- section: change-feed-processor | objectives: 1.4.1, 1.4.3 -->
## Implementing the change feed processor

The processor has four parts: the **monitored container** (source of changes), the **lease container** (state and coordination), the **compute instance** hosting the processor (virtual machine, Kubernetes pod, App Service instance, physical machine) and the **delegate** (your code that handles each batch).

```text
Container leaseContainer = client.GetContainer("retail", "leases");
ChangeFeedProcessor processor = client.GetContainer("retail", "orders")
    .GetChangeFeedProcessorBuilder<Order>(
        processorName: "ordersToSearch",
        onChangesDelegate: HandleChangesAsync)
    .WithInstanceName(Environment.MachineName)      // unique per instance
    .WithLeaseContainer(leaseContainer)
    .WithStartTime(DateTime.MinValue.ToUniversalTime()) // optional: from the beginning
    .WithErrorNotification(OnErrorAsync)            // optional: recommended
    .Build();

await processor.StartAsync();

static async Task HandleChangesAsync(
    ChangeFeedProcessorContext context,
    IReadOnlyCollection<Order> changes,
    CancellationToken cancellationToken)
{
    Console.WriteLine($"Lease {context.LeaseToken}: {context.Headers.RequestCharge} RU");
    foreach (Order order in changes) { await IndexAsync(order); }
}
```

**Life cycle.** Read the feed; if nothing changed, sleep for the poll interval (`WithPollInterval`); otherwise call the delegate; when the delegate **completes successfully**, write the new checkpoint to the lease; repeat.

**Delivery guarantee: at least once.** If the delegate throws, the batch's thread stops, a new one restarts from the last checkpoint and the same batch is delivered again, until it succeeds. Make the delegate idempotent, and send poison changes to an errored-message store (for example another container) to avoid endless retries. Don't start asynchronous work inside the delegate without awaiting it: the lease could be checkpointed before the work finishes.

**Start time.** By default the processor starts at the time it is **first** initialized; earlier changes are ignored. `WithStartTime(DateTime)` starts at a given time and `WithStartTime(DateTime.MinValue.ToUniversalTime())` from the beginning. These options apply only when no lease exists: once leases are stored, the processor resumes from them and a new start time has no effect.

**Scaling.** Instances with the same `processorName` and the same lease container configuration form one **deployment unit** and share the leases (one lease per physical partition, each owned by one instance at a time). Each instance needs a distinct `WithInstanceName`. Running more instances than leases leaves the extra instances idle. When partitions split, new leases are created and redistributed automatically.

**Monitoring.** The **change feed estimator** measures how many changes are still pending: `GetChangeFeedEstimatorBuilder(processorName, delegate, interval)` pushes a number at intervals; `GetChangeFeedEstimator(processorName, leaseContainer)` plus `GetCurrentStateIterator()` returns, per lease, `EstimatedLag`, `LeaseToken` and the owning `InstanceName`. It must use the same processor name and lease container, can run on a separate instance, and consumes RUs on both containers. Life cycle notifications: `WithLeaseAcquireNotification`, `WithLeaseReleaseNotification`, `WithErrorNotification` (which distinguishes `ChangeFeedProcessorUserException`, thrown by your delegate).

> **Exam trap.** A growing lag with idle CPU on the workers usually means the lease container or the monitored container is throttled (429), or there are fewer instances than leases. Adding instances beyond the number of leases doesn't increase throughput.

<!-- section: lease-containers | objectives: 1.4.3 -->
## Configuring lease containers

| Setting | Rule |
| --- | --- |
| Partition key | `/id` for a partitioned lease container |
| Location | Same account as the monitored container or another account |
| Throughput | Lease reads and renewals consume RUs; more instances means more RUs. Throttling delays events and can stop processing |
| Creation | Create it yourself, or let the Azure Functions trigger create it (`CreateLeaseContainerIfNotExists`) |
| Sharing | One lease container can serve several deployment units if each monitors a different container **or** uses a different `processorName`. Size its throughput for all of them |
| Endpoint | Use the account's **global endpoint**; pick regions with `ApplicationRegion` / `ApplicationPreferredRegions`. A regional endpoint creates separate, region-scoped leases |

Lease timing (advanced) has three settings:

| Setting | Default | Lowering it |
| --- | --- | --- |
| Lease acquire interval | 17 seconds | Faster rebalancing, more lease RUs |
| Lease expiration interval | 60 seconds | Faster takeover after a crash; never below the renewal interval |
| Lease renewal interval | 13 seconds | Faster crash detection, more lease RUs |

With Microsoft Entra authentication, the processor's identity needs `readMetadata` and `readChangeFeed` on the monitored container, and item `read`, `create`, `replace`, `delete` plus `executeQuery` on the lease container. Cosmos DB Built-in Data Contributor covers both.

> **Exam trap.** Two different applications that must each receive **every** change need two different `processorName` values (or two lease containers). If they share the same processor name and lease container, they form one deployment unit and split the changes between them.

<!-- section: change-feed-modes | objectives: 1.4.4 -->
## Latest version mode and all versions and deletes mode

| | Latest version | All versions and deletes |
| --- | --- | --- |
| Captures | Creates and updates, **latest version only**: intermediate updates between reads can be lost | Every create, update and delete, including intermediate changes and **TTL expirations** |
| Operation type | Not exposed | `metadata.operationType`: `create`, `replace`, `delete` |
| Retention | Life of the container, from its creation | **Continuous backup retention window** only |
| Start positions | Beginning, point in time (precision about 5 seconds), now, checkpoint | **Now** or a checkpoint (lease or continuation token) only |
| Prerequisites | None, enabled by default | NoSQL API, continuous backup, feature enabled on the account |
| Default | Yes | No |

Enable all versions and deletes mode in the portal: **Features** > **All versions and deletes change feed mode** (continuous backup must already be configured; enablement can take up to 30 minutes, during which the account can't be changed). It can't be enabled at account creation. Accounts that have ever merged partitions, or have partition merge enabled, aren't supported.

Response items in all versions and deletes mode:

```json
{
  "current": { "id": "o-1001", "status": "shipped" },
  "metadata": {
    "operationType": "replace",
    "lsn": 1543,
    "crts": 1763290800,
    "previousImageLSN": 1530
  }
}
```

A delete has no `current`; its `metadata` holds `id`, `partitionKey`, and `timeToLiveExpired: true` when the delete came from TTL. The previous version of an updated or deleted item isn't available.

In .NET (3.60.0 or later) read it with `GetChangeFeedIterator<ChangeFeedItem<Order>>(ChangeFeedStartFrom.Now(), ChangeFeedMode.AllVersionsAndDeletes)` or the processor builder `GetChangeFeedProcessorBuilderWithAllVersionsAndDeletes<Order>(...)`; in Python (4.9.1b1 or later) with `query_items_change_feed(mode="AllVersionsAndDeletes")`. The Functions trigger supports this mode only in the .NET isolated worker model. Whatever the client's connection mode, these requests use **Gateway** mode. Its continuation tokens are valid only inside the retention window.

Without all versions and deletes, capture deletes in latest version mode with a **soft delete**: set a flag such as `"deleted": true` (an update that the feed captures), and a TTL that removes the item later.

> **Exam trap.** "Process deletes" or "every intermediate state of an order" means all versions and deletes mode, which requires continuous backup. "Reprocess everything since the container was created" means latest version mode: all versions and deletes can't start from the beginning.

<!-- section: copy-container-jobs | objectives: 1.4.5 -->
## Container copy jobs

Container copy jobs (preview, best effort, no SLA on duration) copy data between containers with **server-side compute** that the platform allocates (by default two 4-vCPU 16-GB instances per account). They're the answer when a container setting can only be chosen at creation:

- change the **partition key** (or adopt hierarchical partition keys);
- change the **unique keys**;
- move between database-level (shared) and container-level throughput;
- rename a container or a database.

| | Online copy (NoSQL) | Offline copy |
| --- | --- | --- |
| Source writes during the copy | Allowed: incremental changes are replicated | Must be stopped first |
| Mechanism | All versions and deletes change feed | Change feed (Cassandra) or change streams (MongoDB) |
| Prerequisites | Continuous backup + all versions and deletes mode + capability `EnableOnlineContainerCopy` (wait 30 minutes after adding it) | None of these |
| End of job | You stop writes, then call **complete** | Completes by itself |

Online copy steps: create the target container with the new settings, create the job, monitor until the processed count reaches the total count, stop updates on the source, wait a few minutes, complete the job, then point the application to the new container.

```bash
az extension add --name cosmosdb-preview

az cosmosdb copy create --resource-group rg-retail \
  --job-name orders-repartition \
  --src-account cosmos-retail --dest-account cosmos-retail \
  --src-nosql database=retail container=orders \
  --dest-nosql database=retail container=orders-by-customer \
  --mode Online

az cosmosdb copy show --resource-group rg-retail \
  --account-name cosmos-retail --job-name orders-repartition

az cosmosdb copy complete --resource-group rg-retail \
  --account-name cosmos-retail --job-name orders-repartition
```

Other commands: `list`, `pause`, `resume`, `cancel`. Things to know:

- Jobs run in the **write region**; if the write region changes (failover), incomplete jobs fail and must be recreated. Several jobs on one account run **one after the other**; copying a database means one job per container.
- Speed depends on source and target throughput (set the target to at least twice the source's) and on the server-side instances.
- **Cross-account copy**: the source account's managed identity (set as default identity) needs a data plane role on the destination, such as Cosmos DB Built-in Data Contributor (`00000000-0000-0000-0000-000000000002`) at scope `/`.
- Item TTL values are copied; the container's default TTL isn't, so set it on the target.
- Accounts with partition merge enabled aren't supported.
- With a new partition key, `id` plus the new key must be unique, and no logical partition may exceed 20 GB (error 403, substatus 1014).
- On the source, replace and delete operations cost an extra 50 to 100 % of the base write RUs, because previous and current versions are retained. Creates aren't affected.

> **Exam tip.** You can't change a container's partition key in place. The supported answer is a new container plus a copy (container copy job, or your own change feed migration), then a switch of the application.

<!-- section: key-points -->
## Key points

- Change feed: on by default, ordered per partition key value, inserts and updates only in latest version mode.
- Processor (.NET, Java) = monitored container + lease container + instances + delegate; same `processorName` = shared work, distinct instance names, at most one instance per lease; at least once delivery, checkpoint after the delegate succeeds.
- Pull model = continuation tokens, `FeedRange` per physical partition, single partition key reads, `NotModified` (304) means no new changes; the Python choice.
- Lease container: partition key `/id`, its own RUs, global endpoint; a different `processorName` for each independent consumer.
- All versions and deletes: deletes, TTL expirations and intermediate versions, requires continuous backup, starts from now or a checkpoint, retention window only.
- Container copy jobs: new partition key, unique keys or throughput model; online copy needs continuous backup, all versions and deletes and `EnableOnlineContainerCopy`, then a manual complete.
