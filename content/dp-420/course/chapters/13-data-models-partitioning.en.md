In Cosmos DB the data model and the partition key decide almost everything else: the RU of each operation, whether a query targets one partition or all of them, whether a tenant can grow, and what the bill looks like. Questions give access patterns and volumes, then ask for the model, the key, the multi-tenant layout or the fix for a review finding, often with the cheapest option as the deciding constraint.

<!-- section: access-patterns | objectives: 1.3.1 -->
## Designing data models for access patterns

Start from the **operations**, not from the entities. List each operation with its rate and its filter, then shape items and containers so that the frequent ones are **point reads** or **single-partition queries**.

Example: Contoso's order service.

| Operation | Rate | Design |
| --- | --- | --- |
| Read a customer profile | 2,000/s | Item `id = customerId` in container `customers`, partition key `/customerId`: point read |
| List a customer's last 20 orders | 500/s | Orders in a container partitioned on `/customerId`: single-partition query with `ORDER BY` |
| Read an order with its lines | 800/s | Lines embedded in the order (bounded, read together): one point read |
| Browse products of a category | 1,000/s | Container `products` partitioned on `/categoryId` |
| Show the customer's order count | 2,000/s | Precomputed `orderCount` on the profile, updated on each order |

Techniques:

| Technique | Use it when |
| --- | --- |
| **Denormalize** (copy fields the reader needs) | Reads far outnumber writes; the copied data changes rarely |
| **Precomputed aggregates** (counters, totals) | A frequent read would otherwise scan many items |
| **Several entity types in one container**, with a `type` property | Related items are read together and can share the partition key (an order and its shipments) |
| **Separate containers** | Entities need different partition keys, throughput, TTL or indexing |
| **Materialized view** fed by the change feed, or a **global secondary index** (GSI) | The same data must be queried by a second key (orders by product as well as by customer) |

Operational limits shape the model too: an item can't exceed 2 MB and a logical partition 20 GB; nesting is limited to 128 levels; retention (TTL), throughput and indexing are set per container, so data with different retention or load belongs in different containers.

> **Exam tip.** In a stem, find the most frequent operation first: the right model makes that one a point read, even if a rarer operation becomes a cross-partition query.

<!-- section: embed-reference | objectives: 1.3.3 -->
## Embedding or referencing related data

| Embed (denormalized) when | Reference (normalized) when |
| --- | --- |
| The relationship is contained (an order and its lines) | One-to-many with no upper bound |
| One-to-few | Many-to-many |
| The data changes infrequently | The related data changes frequently |
| The data doesn't grow without bound | The referenced data could be unbounded |
| The data is queried together | |
| Better **read** performance | Better **write** performance |

```json
{
  "id": "order-1001",
  "customerId": "customer-42",
  "type": "order",
  "lines": [
    { "productId": "p-17", "name": "Trail shoes", "qty": 1, "price": 89.0 },
    { "productId": "p-90", "name": "Socks", "qty": 3, "price": 6.5 }
  ],
  "customer": { "id": "customer-42", "name": "Ana Silva" }
}
```

Here the lines are embedded (bounded, read with the order) and the customer is **referenced with a denormalized copy** of the fields displayed (hybrid model): the profile itself lives in its own item.

Where to put a reference: on the side that **doesn't grow**. A publisher with an ever-growing `books` array is a mutable, swelling document; instead, each book stores `"publisherId": "mspress"`. For many-to-many, store an array of IDs on **both** sides (an author lists its book IDs, a book lists its author IDs) instead of a join container that would cost extra queries.

> **Exam trap.** Comments on a popular post, sensor readings of a device, messages of a long conversation: unbounded, so referenced (one item each), not embedded. An embedded array that keeps growing raises the RU of every write and eventually hits 2 MB.

<!-- section: partition-key-choice | objectives: 1.3.2, 1.3.4 -->
## Choosing a partition key and evaluating its impact

All items with the same partition key value form a **logical partition**; Cosmos DB places logical partitions on **physical partitions** and splits them automatically as data and throughput grow.

| Limit | Logical partition | Physical partition |
| --- | --- | --- |
| Storage | 20 GB | 50 GB |
| Throughput | 10,000 RU/s | 10,000 RU/s |
| Managed by | Your key choice | The service (splits are transparent; a logical partition never spans two physical partitions) |

A good partition key:

1. Is a property whose value **never changes** for an item (a partition key value can't be updated in place).
2. Has **high cardinality**: many distinct values.
3. **Spreads RU consumption and storage evenly**, including writes at any given moment.
4. Appears as an **equality filter in the frequent queries** (read-heavy containers).

`/id` is a strong choice for write-heavy containers of any size and small read-heavy ones: perfect spread, and every point read knows its key. Its cost: no multi-item transactions, and queries on other properties fan out.

**Impact on scalability and performance.** Provisioned RU/s are divided evenly across physical partitions: 18,000 RU/s on three partitions gives 6,000 RU/s each. A key that concentrates traffic on one value is capped by that partition's share, and never more than 10,000 RU/s, whatever the container's total. A query without the partition key checks every physical partition (2 to 3 RU each, plus latency). With 5 physical partitions or fewer the key matters little; above 30,000 RU/s or 100 GB, choose it to minimize cross-partition queries.

| Candidate key for IoT telemetry (50,000 devices, queries per device) | Evaluation |
| --- | --- |
| `/deviceId` | High cardinality, writes spread, per-device queries hit one partition: good |
| `/date` | Every write of the day hits one value: hot partition |
| `/sensorType` (5 values) | Low cardinality: 5 logical partitions, 20 GB each at most |
| `/readingId` (GUID) | Writes spread, but every per-device query fans out |

Changing the key later means a new container and a data move: container copy jobs, or the change feed for a live migration. When the old key must stay but another query pattern needs a different key, add a **global secondary index**: a read-only container with its own partition key, kept in sync automatically through the change feed (eventually consistent, autoscale throughput only; replaces and deletes on the source cost 50 to 100 % more RU).

> **Exam trap.** Raising the container's RU/s doesn't fix a hot logical partition: one key value can never get more than 10,000 RU/s. Fix the key (or add a suffix), not the throughput.

<!-- section: hierarchical-multitenant | objectives: 1.3.5 -->
## Hierarchical partition keys and multi-tenant strategies

**Hierarchical partition keys** (subpartitioning) define **up to three levels**, for example `/tenantId` then `/userId` then `/sessionId`. A **prefix** of the key (one tenant) can then exceed 20 GB and 10,000 RU/s, while queries on the prefix still target only the physical partitions of that tenant.

| Query filter | Routing |
| --- | --- |
| All three levels | One logical and physical partition |
| `tenantId`, or `tenantId` + `userId` | Only the physical partitions holding that prefix |
| `userId` or `sessionId` alone | Fan-out across all physical partitions |

Design rules: every level should have high cardinality (at least thousands of values, more than the number of physical partitions); with few first-level values (five tenants), ingestion stays on one physical partition until it splits at 50 GB (a split takes 4 to 6 hours), and if such a key already hits the 20 GB limit, Learn suggests a synthetic key instead; use a unique value such as the item `id` as the **last level** so that a prefix can grow beyond 20 GB. Hierarchical keys are set **at container creation only** (migrate with container copy jobs or the change feed), need a recent SDK (.NET 3.33.0, Java 4.42.0, Python 4.6.0 or later), and permissions can't target a partial prefix.

```text
// C#: create the container, then point read with the full key
ContainerProperties properties = new ContainerProperties(
    id: "sessions",
    partitionKeyPaths: new List<string> { "/tenantId", "/userId", "/sessionId" });
Container container = await database.CreateContainerIfNotExistsAsync(properties, throughput: 400);

PartitionKey key = new PartitionKeyBuilder()
    .Add("fabrikam").Add("user-17").Add("s-2026-11-17-01")
    .Build();
ItemResponse<SessionState> state = await container.ReadItemAsync<SessionState>("state-01", key);

// Prefix query: put the leading levels in the WHERE clause
QueryDefinition query = new QueryDefinition("SELECT * FROM c WHERE c.tenantId = @t AND c.userId = @u")
    .WithParameter("@t", "fabrikam").WithParameter("@u", "user-17");

# Python
container = database.create_container_if_not_exists(
    id="sessions",
    partition_key=PartitionKey(path=["/tenantId", "/userId", "/sessionId"], kind="MultiHash"))
```

```bicep
partitionKey: {
  paths: [
    '/tenantId'
    '/userId'
    '/sessionId'
  ]
  kind: 'MultiHash'
  version: 2
}
```

**Multi-tenant layouts**, from most shared to most isolated:

| Layout | Isolation | Cost and limits | Fits |
| --- | --- | --- | --- |
| Partition key per tenant (`/tenantId`) | Logical only; noisy neighbors share RU/s | Cheapest; a tenant is capped at 20 GB | Many small tenants of similar size |
| Hierarchical key `/tenantId` > ... | Logical | Cheap; large tenants grow past 20 GB | Many tenants (hundreds or more) with similar usage, read-heavy |
| Container per tenant | Throughput (dedicated RU/s) and settings | Dedicated RU/s for each (400 minimum in manual mode); 500 containers and databases per account | Not recommended by the Architecture Center (account limits on containers and metadata operations) |
| Database per tenant (shared throughput) | Grouping of containers | Up to 25 containers sharing RU/s | Not recommended, for the same reasons |
| Account per tenant | Strongest: keys, network, regions, backup | Highest; 250 accounts per subscription by default | Regulated or premium tenants, a few very large tenants (a fleet throughput pool, in preview, can share RU/s across accounts) |

The Architecture Center recommends partition key per tenant and account per tenant for most multi-tenant scenarios. For write-optimized workloads, or when the tenant level lacks high cardinality, it recommends a synthetic key or `/id` instead of a hierarchical key.

> **Exam trap.** Filtering on `userId` alone in a `/tenantId` > `/userId` container is a fan-out query. And passing the values through `PartitionKeyBuilder` doesn't guarantee efficient routing: the leading levels must be in the `WHERE` clause.

<!-- section: synthetic-keys | objectives: 1.3.6 -->
## Synthetic partition keys

A **synthetic key** is a property your code builds into every item when no single property spreads the load well.

| Technique | Example | Writes | Reads |
| --- | --- | --- | --- |
| Concatenate properties | `"partitionKey": "abc-123-2026"` from `deviceId` and year | Spread by both values | Point reads when both values are known |
| Random suffix | `2026-11-17.1` to `2026-11-17.400` | Evenly spread across 400 values | Hard: the suffix of a given item is unknown, so reads fan out |
| Precalculated (hash) suffix | Date + hash of the vehicle number, mod 400 | Evenly spread | A given vehicle and date maps to a computable key: point reads work |

```text
// C#: precalculated suffix with a stable hash (string.GetHashCode differs between processes)
static int Bucket(string vin)
{
    byte[] hash = SHA256.HashData(Encoding.UTF8.GetBytes(vin));
    return (int)(BitConverter.ToUInt32(hash, 0) % 400) + 1;
}
reading.partitionKey = $"{reading.date}.{Bucket(reading.vin)}";   // "2026-11-17.137"

# Python: same rule (the built-in hash() of a str changes between processes)
import hashlib
def bucket(vin: str) -> int:
    return int(hashlib.sha256(vin.encode("utf-8")).hexdigest(), 16) % 400 + 1
reading["partitionKey"] = f"{reading['date']}.{bucket(reading['vin'])}"
```

| Requirement | Choice |
| --- | --- |
| Queries filter on a tenant, then a user, a tenant can exceed 20 GB | Hierarchical partition key |
| Very high write rate on one date or one value, reads by a known secondary value | Synthetic key with a precalculated suffix |
| Maximum write throughput, reads are rare scans | Synthetic key with a random suffix |
| Two properties always queried together, neither enough alone | Concatenated synthetic key, or a two-level hierarchical key |

> **Exam trap.** A suffix built with a non-deterministic hash (or a random number) can't be recomputed at read time: only a precalculated, stable suffix keeps point reads possible.

<!-- section: anti-patterns | objectives: 1.3.7 -->
## Partitioning anti-patterns in solution reviews

| Finding | Problem | Fix |
| --- | --- | --- |
| Key on `status`, `type` or `country` | Low cardinality: few logical partitions, hot spots, 20 GB ceiling | High-cardinality key, or hierarchical key |
| Key on a date or a timestamp for an ingestion workload | All current writes go to one value | Synthetic suffix, or a key such as `/deviceId` |
| Key on a random GUID while reads filter by customer | Writes spread, but every read fans out | Key on the property the reads filter on |
| Key on a property that changes (`status`) | Can't update in place; delete plus create isn't atomic | Immutable property |
| One tenant near 20 GB on `/tenantId` | Writes will fail for that tenant | Hierarchical key with a unique last level |
| Unbounded embedded array | Item grows toward 2 MB, write RU keep rising | Reference: one item per child |
| Frequent cross-partition query on the hot path | RU and latency grow with the partition count | Add the key to the filter, denormalize, or a materialized view or global secondary index |
| Shared database throughput with one busy container | The others get throttled (shared throughput isn't recommended for most workloads) | A new container with dedicated throughput and a data move: there's no in-place conversion |

**Spotting a hot partition**: Insights > Throughput > **Normalized RU Consumption (%) By PartitionKeyRangeID**. The metric is the maximum utilization across partition key ranges each minute; one range at 100 % while others stay at 30 % or less signals a hot partition. Consistently 100 % across several ranges with more than 5 % of 429 means the container needs more RU/s. Per-second RU by partition key range, from diagnostic logs:

```kusto
CDBPartitionKeyRUConsumption
| where TimeGenerated > ago(1h)
| where DatabaseName == "sales" and CollectionName == "orders"
| summarize sum(RequestCharge) by bin(TimeGenerated, 1s), PartitionKeyRangeId
| render timechart
```

> **Exam trap.** Normalized RU Consumption at 100 % doesn't by itself mean the container is undersized: it only says that at least one partition key range used all its RU/s in some second. Look at the spread across ranges and the 429 rate before adding throughput.

<!-- section: cost-estimation | objectives: 1.3.8 -->
## Estimating workload cost

A Cosmos DB bill is mainly **throughput** (RU/s provisioned per hour, or RU consumed for serverless) plus **storage**, both multiplied by the number of regions. Method:

1. Measure the RU of each operation on representative items (`RequestCharge`), at the intended consistency level.
2. Multiply by the rate per second and add: that's the RU/s at peak.
3. Multiply by the number of regions; multi-region writes have their own, higher rate.
4. Choose the capacity mode (66 % rule for manual versus autoscale, serverless for intermittent single-region traffic) and apply discounts: free tier (first 1,000 RU/s and 25 GB), reserved capacity (1 or 3 years).

Worked example at Learn's example rates (manual $0.008, autoscale $0.012 per 100 RU/s per hour, single write region), two regions:

| Operation | Rate | RU each | RU/s |
| --- | --- | --- | --- |
| Point reads, 1 KB | 2,000/s | 1 | 2,000 |
| Writes (measured) | 200/s | 7 | 1,400 |
| Queries (measured) | 100/s | 10 | 1,000 |
| **Total** | | | **4,400** |

Manual at 4,400 RU/s: 44 × $0.008 = $0.352 per hour per region, × 2 regions × 730 hours = about $514 per month, whatever the traffic. If the peak lasts only 6 hours a day and the rest of the day needs 1,000 RU/s, autoscale with `Tmax` 5,000, even billed at the full 5,000 during the peak hours, costs per region 6 × $0.60 + 18 × $0.12 = $5.76 a day, against $8.45 for manual: autoscale wins. For an intermittent load of 20 million RU a month with a 500 RU/s peak, Learn's example gives $5.00 serverless against $29.20 provisioned.

The **Azure Cosmos DB Cost Estimator** (`https://cosmos.azure.com/costestimator/`, public preview, no sign-in) produces a projected monthly cost from: regions and multi-region writes, total data stored, item size, rates of reads, writes, updates, deletes and queries (query complexity about 3, 10 or 30 RU), indexing policy, capacity mode (manual, autoscale, serverless) and discounts (free tier, reserved capacity, Enterprise Agreement). It assumes Session consistency (Strong or bounded staleness roughly double the read RU/s). The result is an estimate, not a quote.

> **Exam trap.** RU/s are provisioned and billed in **every** region: adding a read region to a 10,000 RU/s container adds 10,000 RU/s to the bill. And a serverless account can't be the answer when the stem requires a second region.

<!-- section: key-points -->
## Key points

- Model from the most frequent operations: make them point reads or single-partition queries; denormalize, precompute, co-locate types, or feed views with the change feed (or a global secondary index).
- Embed what is bounded, read together and stable; reference what is unbounded, many-to-many or volatile; store references on the side that doesn't grow.
- Partition key: immutable, high cardinality, even spread, used in filters. Logical partition 20 GB and 10,000 RU/s; physical 50 GB and 10,000 RU/s.
- Hierarchical keys: up to 3 levels, prefix routing, set at creation, unique last level to pass 20 GB.
- Synthetic keys: concatenation, random suffix (write-optimized) or precalculated stable suffix (keeps point reads).
- Cost = RU/s × regions × hours (or RU consumed) + storage; measure RU, then pick manual, autoscale or serverless.
