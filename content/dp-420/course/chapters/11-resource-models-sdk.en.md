Before the first line of data access code, a Cosmos DB solution fixes five things: the consistency level, the RU budget, the throughput model that pays for it, the settings that live on the account or on the container, and the way the SDK client connects. Questions describe a workload and ask for the level, the mode, the setting or the client option that meets one constraint at the lowest cost.

<!-- section: consistency-levels | objectives: 1.1.1 -->
## Evaluating consistency levels

The account has a **default consistency level** (Session unless you change it) that applies to every database and container. From strongest to weakest:

| Level | Guarantee | Read cost | Multi-region writes |
| --- | --- | --- | --- |
| Strong | Linearizability: reads return the most recent committed version | 2 replicas (local minority): about **twice** the read RU | Not possible |
| Bounded staleness | Lag between regions below K versions or T seconds, whichever comes first | About twice the read RU | Allowed, but an anti-pattern |
| Session | Within one session: read-your-writes and write-follows-reads | Single replica | Yes |
| Consistent prefix | Never out of order; the writes of a transactional batch are visible together | Single replica | Yes |
| Eventual | No ordering guarantee | Single replica | Yes |

Write RU are the same at every level. Bounded staleness minimums: K = 10 writes or T = 5 seconds for a single-region account; K = 100,000 writes or T = 300 seconds for a multi-region account. Strong across regions more than 5,000 miles (8,000 km) apart is blocked by default, and its write latency is twice the round trip between the two farthest regions plus 10 ms at the 99th percentile.

| Requirement | Level |
| --- | --- |
| A user always sees their own cart changes, lowest cost | Session |
| Every client, in every region, reads the latest committed write | Strong (single write region) |
| Global reads may lag, but by no more than a known window | Bounded staleness |
| Order of updates must be preserved, staleness accepted | Consistent prefix |
| Like counters, view counts, highest read throughput | Eventual |

**Session tokens** are per partition. A client that didn't write to a partition has no token for it, and its reads there behave like eventual. When several application instances serve the same user (a web farm), pass the token from the write response to the next read; recreating the client clears its token cache.

A client or a single request can **relax** the consistency of reads (never strengthen it beyond the account default). After changing the account default, restart the applications so that SDK clients are recreated.

```text
// C#: relax reads for this client only
CosmosClient client = new CosmosClient(endpoint, new DefaultAzureCredential(),
    new CosmosClientOptions { ConsistencyLevel = ConsistencyLevel.Eventual });

// C#: hand the session token from one instance to another
ItemResponse<Cart> write = await container.UpsertItemAsync(cart, new PartitionKey(cart.userId));
string token = write.Headers.Session;              // for example, stored in a cookie
ItemResponse<Cart> read = await container.ReadItemAsync<Cart>(cart.id, new PartitionKey(cart.userId),
    new ItemRequestOptions { SessionToken = token });
```

> **Exam trap.** "Users must see their own writes" doesn't call for Strong: Session gives that guarantee at single-replica cost. Strong also rules out multi-region writes.

<!-- section: request-units | objectives: 1.1.2 -->
## Evaluating Request Unit consumption

A **Request Unit** (RU) normalizes CPU, IOPS and memory. **Reading one item of about 1 KB by its ID and partition key costs 1 RU.** Costs are deterministic: the same operation on the same data always costs the same RU.

| Factor | Effect on RU |
| --- | --- |
| Item size | Larger items cost more to read and write |
| Indexed properties | Every indexed property adds to the write cost; excluding paths lowers it |
| Consistency | Strong and bounded staleness reads cost about twice as much |
| Point read or query | A point read always costs less than a query returning the same item |
| Query shape | Number of results, predicates, user-defined functions, size of the data scanned and of the result set, projections |
| Partition scope | A query without the partition key pays 2 to 3 RU extra per physical partition it checks |
| Regions | R RU/s provisioned are available, and billed, in **each** region: R × N in total |

Read the actual charge instead of guessing:

```text
// C#
ItemResponse<Order> response = await container.ReadItemAsync<Order>("order-1001", new PartitionKey("customer-42"));
double charge = response.RequestCharge;            // also on FeedResponse for each query page

# Python: the response hook receives the response headers
charges = []
item = container.read_item(item="order-1001", partition_key="customer-42",
    response_hook=lambda headers, body: charges.append(float(headers["x-ms-request-charge"])))
```

When the RU/s of a second are used up on a partition, requests get **HTTP 429** with an `x-ms-retry-after-ms` header. The .NET SDK retries automatically (9 attempts by default, up to 30 seconds of cumulative wait) before surfacing the exception. A steady 1 to 5 % of 429 with acceptable latency means the RU/s are fully used, not undersized.

To estimate a budget, multiply each operation's measured charge by its rate per second and add the results: 800 point reads/s of 1 KB items is about 800 RU/s, and about 1,600 RU/s at Strong.

> **Exam trap.** `EnableContentResponseOnWrite = false` saves bandwidth and client serialization; it doesn't make the write itself cheaper. Lower write RU by indexing fewer paths or writing smaller items.

<!-- section: throughput-models | objectives: 1.1.3 -->
## Evaluating and configuring throughput

| | Standard (manual) | Autoscale | Serverless |
| --- | --- | --- | --- |
| Configuration | Fixed RU/s, increments of 100, minimum 400 | Maximum `Tmax` in increments of 1,000; scales between 0.1 × `Tmax` and `Tmax` (entry point 100 to 1,000 RU/s) | Nothing to provision |
| Billing | Provisioned RU/s, every hour | Highest RU/s reached in each hour, at 1.5 × the manual rate (same rate as manual with multi-region writes) | RU consumed, plus storage |
| Beyond the capacity | 429 | Scales up to `Tmax`, then 429 | 5,000 RU/s per physical partition |
| Regions | Unlimited | Unlimited | **One region only**, can't be added later |
| Best for | Steady, predictable traffic | Variable traffic; full `Tmax` used 66 % of hours or less | Intermittent traffic, average-to-peak ratio below 10 %, dev/test |

Microsoft's rule: average the highest normalized utilization of each hour over the month. Below 66 %, autoscale is estimated to cost less; above, stay on manual. With multi-region writes, prefer autoscale (same rate). Learn's example rates (single write region): manual $0.008 and autoscale $0.012 per 100 RU/s per hour.

**Where throughput is set.** On a **container** (dedicated, reserved for it, backed by the SLA; recommended) or on a **database** (shared by up to 25 containers, no guarantee per container, one busy container can throttle the others). Both can be mixed: a container with its own RU/s inside a shared database. Shared versus dedicated is chosen at creation and can't be converted: move the data to a new container (container copy jobs).

Minimum RU/s you can scale down to:

| Resource | Minimum |
| --- | --- |
| Manual container | `MAX(400, storage GB × 1, highest RU/s ever provisioned / 100)` |
| Autoscale container | Max RU/s of `MAX(1000, storage GB × 10, highest max RU/s ever provisioned / 10)` |

Autoscale also raises `Tmax` automatically when storage grows: each `Tmax` covers 0.1 × `Tmax` GB. Accounts created after September 25, 2024 have **dynamic scaling** (each physical partition and region scales independently); older accounts enable it on the account's Features page.

```bash
az cosmosdb sql container create --account-name cosmos-contoso --resource-group rg-sales \
  --database-name sales --name orders --partition-key-path "/customerId" --throughput 400

# Switch to autoscale, then set the maximum
az cosmosdb sql container throughput migrate --account-name cosmos-contoso --resource-group rg-sales \
  --database-name sales --name orders --throughput-type autoscale
az cosmosdb sql container throughput update --account-name cosmos-contoso --resource-group rg-sales \
  --database-name sales --name orders --max-throughput 10000
```

**Burst capacity** (account Features page, provisioned accounts only): each physical partition under 3,000 RU/s accumulates up to 5 minutes of idle capacity and can spend it at up to 3,000 RU/s. It's best effort, not a substitute for provisioned RU/s.

> **Exam trap.** Only serverless costs nothing when idle: an autoscale container is billed at least 10 % of `Tmax` every hour. And a serverless account can't be made multi-region.

<!-- section: account-container-settings | objectives: 1.1.4 -->
## Account-level and container-level settings

| Account level | Container level |
| --- | --- |
| API (fixed at creation) and capacity mode: provisioned or serverless (fixed at creation) | Partition key path (fixed at creation) |
| Default consistency level | Throughput, if dedicated |
| Regions, multi-region writes, service-managed failover | Indexing policy (changeable online) |
| Backup policy (periodic or continuous) | Default time to live (changeable) |
| Networking: public access, firewall, private endpoints | Unique key policy (at creation only, up to 10 unique keys) |
| Local (key) authentication on or off | Conflict resolution policy for multi-region writes (at creation only) |
| Free tier (first 1,000 RU/s and 25 GB free; opt in at creation) | Vector embedding and full-text policies |
| Features page: burst capacity, priority-based execution, dynamic scaling | |

**Priority-based execution** (Features page; not for serverless): when requests exceed the RU/s, low-priority requests are throttled first, best effort. Requests without a priority run as High. Set it per request: `new ItemRequestOptions { PriorityLevel = PriorityLevel.Low }` (.NET 3.38.0 or later) or `priority="Low"` in Python.

```bicep
resource account 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: 'cosmos-contoso'
  location: 'westeurope'
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
    locations: [
      { locationName: 'westeurope', failoverPriority: 0, isZoneRedundant: true }
      { locationName: 'northeurope', failoverPriority: 1, isZoneRedundant: false }
    ]
    enableAutomaticFailover: true
    enableMultipleWriteLocations: false
    disableLocalAuth: true
  }
}
```

> **Exam trap.** Settings fixed at creation (partition key, unique keys, conflict resolution policy, serverless, shared versus dedicated throughput) can only be "changed" by creating a new container or account and copying the data.

<!-- section: databases-containers | objectives: 1.1.5 -->
## Creating and managing databases and containers

Resource model: **account** (`https://<account>.documents.azure.com:443/`) > **database** > **container** > **items**. Limits: 500 databases and containers per account (can't be raised), names up to 255 characters, 25 containers per shared-throughput database.

```text
// C#: database, then an autoscale container with TTL and a unique key
Database database = await client.CreateDatabaseIfNotExistsAsync("sales");

ContainerProperties properties = new ContainerProperties(id: "orders", partitionKeyPath: "/customerId")
{
    DefaultTimeToLive = -1,                              // TTL on, items don't expire by default
    UniqueKeyPolicy = new UniqueKeyPolicy { UniqueKeys = { new UniqueKey { Paths = { "/orderNumber" } } } }
};
Container container = await database.CreateContainerIfNotExistsAsync(
    properties, ThroughputProperties.CreateAutoscaleThroughput(4000));

// Later: change the throughput or the TTL
await container.ReplaceThroughputAsync(ThroughputProperties.CreateAutoscaleThroughput(10000));
ContainerProperties current = (await container.ReadContainerAsync()).Resource;
current.DefaultTimeToLive = 2592000;
await container.ReplaceContainerAsync(current);
```

```text
# Python
from azure.cosmos import PartitionKey, ThroughputProperties

database = client.create_database_if_not_exists(id="sales")
container = database.create_container_if_not_exists(
    id="orders",
    partition_key=PartitionKey(path="/customerId"),
    offer_throughput=ThroughputProperties(auto_scale_max_throughput=4000),
    default_ttl=-1)
```

A unique key is unique **within a logical partition**, not across the container. Changing the partition key means a new container and a data move (container copy jobs, or the change feed for a live migration). Deleting a container deletes all its items.

Microsoft Entra data plane roles (Cosmos DB Built-in Data Reader and Data Contributor) cover items, queries and the change feed, not creating databases or containers. With keyless access, create resources through Azure Resource Manager (Bicep, CLI, portal) and let the application only call `GetContainer`.

> **Exam tip.** `GetDatabase` and `GetContainer` (`get_database_client`, `get_container_client`) only build a reference, with no network call. `CreateContainerIfNotExistsAsync` is a control-plane call: keep it out of the request path.

<!-- section: sdk-clients | objectives: 1.1.6 -->
## Initializing SDK clients and connections

Create **one client per account for the lifetime of the application** (it's thread-safe and caches connections and addresses); register it as a singleton, including in Azure Functions. A client per request exhausts sockets and adds latency.

```text
// C#
CosmosClient client = new CosmosClient(
    accountEndpoint: "https://cosmos-contoso.documents.azure.com:443/",
    tokenCredential: new DefaultAzureCredential(),
    clientOptions: new CosmosClientOptions
    {
        ApplicationRegion = Regions.WestEurope,      // or ApplicationPreferredRegions, not both
        ConnectionMode = ConnectionMode.Direct,      // default in .NET v3
        MaxRetryAttemptsOnRateLimitedRequests = 9,
        MaxRetryWaitTimeOnRateLimitedRequests = TimeSpan.FromSeconds(30),
        EnableContentResponseOnWrite = false
    });
Container container = client.GetContainer("sales", "orders");
```

```text
# Python
from azure.cosmos import CosmosClient
from azure.identity import DefaultAzureCredential

client = CosmosClient(
    url="https://cosmos-contoso.documents.azure.com:443/",
    credential=DefaultAzureCredential(),
    preferred_locations=["West Europe", "North Europe"],
    consistency_level="Session")
container = client.get_database_client("sales").get_container_client("orders")
```

| Requirement | Setting |
| --- | --- |
| Best latency from .NET or Java | Direct mode (TCP), the .NET v3 default; opens ports 10000 to 20000 (any port with private endpoints) |
| Corporate firewall allows only 443, or few sockets available | `ConnectionMode.Gateway` (HTTPS 443) |
| Python application | Gateway only: the Python SDK has no direct mode; use `azure.cosmos.aio` for asynchronous code |
| Read from the closest region, fail over in order | `ApplicationRegion` (SDK orders regions by proximity) or `ApplicationPreferredRegions`; `preferred_locations` in Python |
| Skip a region for one request | `ExcludeRegions` in the request options (.NET 3.37.0 or later) |
| Ride out short 429 bursts | Retry options: attempts and cumulative wait time |
| High-volume import | `AllowBulkExecution = true`, fixed for the client's lifetime: use a separate client |
| No keys in configuration | `DefaultAzureCredential` or a managed identity, plus a Cosmos DB data plane role |
| Sparse traffic, ephemeral port exhaustion | `PortReuseMode = PrivatePortPool`, `IdleTcpConnectionTimeout` of 20 minutes to 24 hours |

Use `async`/`await` everywhere: `.Result`, `.Wait()` and `GetAwaiter().GetResult()` block threads. Log `response.Diagnostics` when a request is slower than your threshold. The .NET SDK needs an explicit `Newtonsoft.Json` 13.0.3 or later package reference, even when you serialize your types with `UseSystemTextJsonSerializerWithOptions`.

> **Exam trap.** If direct mode is used and ports 10000 to 20000 are blocked, requests fail with 503 Service Unavailable: switch to Gateway or open the ports.

<!-- section: key-points -->
## Key points

- Default consistency is Session; Strong and bounded staleness double the read RU, and Strong excludes multi-region writes. Clients can only relax reads.
- 1 RU = point read of a 1 KB item; writes grow with size and indexed properties; RU/s apply in every region.
- Manual for steady load, autoscale (0.1 × `Tmax` to `Tmax`, 1.5 × rate) for variable load, serverless for intermittent single-region load.
- Partition key, unique keys, conflict policy, capacity mode and shared versus dedicated throughput are fixed at creation.
- One singleton client per account; Direct mode in .NET needs ports 10000 to 20000; Python is gateway only.
