This chapter is the SDK code you write every day against a container: queries with parameters and pages, point reads, the five write operations including patch, transactional batches and bulk imports, time to live and optimistic concurrency. Exam questions show C# or Python with a blank (the method, the request option, the partition key argument) or ask which operation gives the right result at the lowest RU.

<!-- section: queries-paging | objectives: 1.2.1 -->
## Queries, parameters, paging and continuation tokens

Queries use the NoSQL query language: `SELECT ... FROM c WHERE ... ORDER BY ...`, where `c` is an alias of the container. **Always pass values as parameters**: no string concatenation (injection, escaping errors).

```text
// C#: parameterized query scoped to one logical partition, read one page at a time
QueryDefinition query = new QueryDefinition(
        "SELECT c.id, c.orderDate, c.total FROM c WHERE c.customerId = @customerId AND c.status = @status ORDER BY c.orderDate DESC")
    .WithParameter("@customerId", "customer-42")
    .WithParameter("@status", "shipped");

QueryRequestOptions options = new QueryRequestOptions
{
    PartitionKey = new PartitionKey("customer-42"),   // no fan-out to other partitions
    MaxItemCount = 25                                  // page size; -1 = no limit per page
};

using FeedIterator<OrderSummary> iterator = container.GetItemQueryIterator<OrderSummary>(
    query, continuationToken: tokenFromClient, requestOptions: options);

if (iterator.HasMoreResults)
{
    FeedResponse<OrderSummary> page = await iterator.ReadNextAsync();
    string next = page.ContinuationToken;              // null when the results are exhausted
    double charge = page.RequestCharge;
}
```

```text
# Python: same query, resumed from a continuation token
pager = container.query_items(
    query="SELECT c.id, c.orderDate, c.total FROM c WHERE c.customerId = @customerId AND c.status = @status ORDER BY c.orderDate DESC",
    parameters=[{"name": "@customerId", "value": "customer-42"},
                {"name": "@status", "value": "shipped"}],
    partition_key="customer-42",
    max_item_count=25)
pages = pager.by_page(continuation_token=token_from_client)
first_page = list(next(pages))
next_token = pages.continuation_token
```

| Element | Rule |
| --- | --- |
| Partition key in the request options (or an equality filter on it) | Single-partition query: lowest RU and latency |
| No partition key | Cross-partition fan-out, 2 to 3 RU extra per physical partition; in the Python sync client set `enable_cross_partition_query=True` |
| `MaxItemCount` / `max_item_count` | Maximum items per page; a page can hold **fewer**, or even **zero**, items |
| Why a page is short | Throttling, response too large, execution too long, or the engine decided extra executions were more efficient |
| `HasMoreResults` | Keep calling `ReadNextAsync` until it's false: an empty page isn't the end |
| Continuation token | Stateless resume point; a single token whatever the number of partitions; **never expires** with the same SDK version |
| Token size | Limit it with `ResponseContinuationTokenLimitInKb` (.NET) or `continuation_token_limit` (Python, in KB) |
| `GROUP BY`, `DISTINCT` | No continuation token (except `DISTINCT` with `ORDER BY`) |
| `OFFSET n LIMIT m` | Skips n results and returns the next m; combine it with `ORDER BY` for a stable order |
| `ORDER BY` on two or more properties | Needs a composite index |

LINQ is available in .NET: `container.GetItemLinqQueryable<Order>().Where(o => o.customerId == id).ToFeedIterator()`. Never call `ToList()` on the queryable: it blocks.

> **Exam trap.** A loop that stops on the first empty page loses results. Stop when `HasMoreResults` is false or the continuation token is null.

<!-- section: point-reads | objectives: 1.2.2 -->
## Point reads

A **point read** fetches one item by its `id` **and** its partition key value, without the query engine. It's the cheapest operation: about 1 RU for a 1 KB item.

```text
// C#
ItemResponse<Order> response = await container.ReadItemAsync<Order>(
    id: "order-1001", partitionKey: new PartitionKey("customer-42"));
Order order = response.Resource;

// C#: the stream variant doesn't throw on 404
using ResponseMessage message = await container.ReadItemStreamAsync("order-1001", new PartitionKey("customer-42"));
if (message.StatusCode == HttpStatusCode.NotFound) { /* not there */ }

// C#: many known (id, partition key) pairs in one call
IReadOnlyList<(string, PartitionKey)> keys = new List<(string, PartitionKey)>
{
    ("order-1001", new PartitionKey("customer-42")),
    ("order-2002", new PartitionKey("customer-77"))
};
FeedResponse<Order> orders = await container.ReadManyItemsAsync<Order>(keys);

# Python
order = container.read_item(item="order-1001", partition_key="customer-42")
```

| Requirement | Operation |
| --- | --- |
| One item, `id` and partition key known | `ReadItemAsync` / `read_item` |
| Several items, all pairs known | `ReadManyItemsAsync` (.NET): one call instead of many reads or an `IN` query |
| One item, only `id` known | Query on `c.id` (cross-partition) unless the partition key is `/id`, then a point read |
| Avoid downloading an unchanged item again | Point read with If-None-Match and the cached `_etag`: 304 Not Modified |
| Hierarchical partition key | Full key built with `PartitionKeyBuilder` (all levels); a prefix isn't enough |

`id` is unique only **within a logical partition**: two items in different partitions can share an `id`, which is why the partition key is mandatory. A missing item raises `CosmosException` with status 404 in .NET, `CosmosResourceNotFoundError` in Python.

> **Exam trap.** `SELECT * FROM c WHERE c.id = @id` with the partition key returns the same item but costs more than `ReadItemAsync`. "Lowest RU" with a known ID and partition key always means a point read.

<!-- section: write-operations | objectives: 1.2.3 -->
## Create, replace, upsert, patch and delete

| Operation | .NET / Python | Behavior |
| --- | --- | --- |
| Create | `CreateItemAsync` / `create_item` | Fails with **409 Conflict** if the `id` exists in that logical partition |
| Replace | `ReplaceItemAsync` / `replace_item` | Replaces the **whole** item; **404** if it doesn't exist |
| Upsert | `UpsertItemAsync` / `upsert_item` | Creates or replaces |
| Patch | `PatchItemAsync` / `patch_item` | Applies up to **10** operations to paths, server side |
| Delete | `DeleteItemAsync` / `delete_item` | **404** if it doesn't exist |
| Delete a whole logical partition | `delete_all_items_by_partition_key` (Python) | Background operation that uses at most 10 % of the container's RU/s |

**Patch operations** (partial document update):

| Operation | Behavior |
| --- | --- |
| `Add` | Adds the property, or replaces it if present; on an array index, **inserts** and shifts; `-` appends |
| `Set` | Like Add, but on an array index it **updates** the element |
| `Replace` | Strict: error if the path doesn't exist |
| `Remove` | Error if the path doesn't exist |
| `Increment` (`incr`) | Adds a positive or negative number; creates the field if missing |
| `Move` | Moves the value from `from` to `path`; `from` must exist |

```text
// C#: conditional patch; fails with 412 if the predicate is false
ItemResponse<Order> patched = await container.PatchItemAsync<Order>(
    id: "order-1001",
    partitionKey: new PartitionKey("customer-42"),
    patchOperations: new[]
    {
        PatchOperation.Replace("/status", "shipped"),
        PatchOperation.Increment("/version", 1),
        PatchOperation.Add("/events/-", new { type = "shipped", at = DateTime.UtcNow })
    },
    requestOptions: new PatchItemRequestOptions { FilterPredicate = "FROM c WHERE c.status = 'packed'" });

# Python
container.patch_item(
    item="order-1001", partition_key="customer-42",
    patch_operations=[
        {"op": "replace", "path": "/status", "value": "shipped"},
        {"op": "incr", "path": "/version", "value": 1},
        {"op": "add", "path": "/events/-", "value": {"type": "shipped"}}],
    filter_predicate="FROM c WHERE c.status = 'packed'")
```

Patch saves client CPU, latency and bandwidth (no read-modify-write round trip). With multi-region writes, concurrent patches on **different paths** of the same item merge automatically; the same path falls back to the conflict resolution policy.

A **partition key value can't be changed** in place: create the item with the new value and delete the old one (two operations, not atomic across partitions). To skip the response body on writes, set `EnableContentResponseOnWrite = false` (.NET) or `no_response=True` (Python).

> **Exam trap.** "Create the item only if it doesn't exist yet" is `Create` (409 on duplicates), not `Upsert`, which silently overwrites.

<!-- section: bulk-batch | objectives: 1.2.4 -->
## Bulk, batch and transactional operations

| | Transactional batch | Bulk execution |
| --- | --- | --- |
| Purpose | Several operations that succeed or fail **together** | Maximum throughput for many independent operations |
| Scope | **One logical partition key value** | Any partitions |
| Atomicity | ACID with snapshot isolation; rolled back if one operation fails | None: each operation succeeds or fails on its own |
| Limits | 100 operations, 2 MB request, 5 seconds of execution | Bound by the RU/s; handle 429 per operation |
| How | `CreateTransactionalBatch(pk)` then `ExecuteAsync()`; `execute_item_batch` in Python | `AllowBulkExecution = true` on the client, then many concurrent point operations (.NET, Java) |

```text
// C#: order header, order line and cart update in one transaction (same partition key value)
using TransactionalBatchResponse response = await container
    .CreateTransactionalBatch(new PartitionKey("customer-42"))
    .CreateItem(order)
    .CreateItem(orderLine)
    .PatchItem("cart-customer-42", new[] { PatchOperation.Set("/status", "checkedOut") })
    .ExecuteAsync();

if (!response.IsSuccessStatusCode)
{
    // nothing was written: the failing operation has its own status code, the others 424
}

# Python
from azure.cosmos import exceptions

batch = [
    ("create", (order,)),
    ("create", (order_line,)),
    ("patch", ("cart-customer-42", [{"op": "set", "path": "/status", "value": "checkedOut"}])),
]
try:
    results = container.execute_item_batch(batch_operations=batch, partition_key="customer-42")
except exceptions.CosmosBatchOperationError as error:
    pass  # the error reports the failed operation and the responses of the batch
```

```text
// C#: bulk import with a dedicated client
CosmosClient bulkClient = new CosmosClient(endpoint, new DefaultAzureCredential(),
    new CosmosClientOptions { AllowBulkExecution = true });
Container target = bulkClient.GetContainer("sales", "orders");

List<Task> tasks = new List<Task>();
foreach (Order o in ordersToImport)
{
    tasks.Add(target.CreateItemAsync(o, new PartitionKey(o.customerId)));
}
await Task.WhenAll(tasks);   // the SDK groups concurrent operations into service calls per partition
```

The .NET batch doesn't throw when an operation fails: check `IsSuccessStatusCode`, then `GetOperationResultAtIndex<T>(i)`. A create on an existing `id` inside a batch returns 409. Under consistent prefix, readers see all the writes of a batch or none. The Python SDK readme lists bulk requests as not yet implemented, and limits the operations of a batch to 1.2 MB.

> **Exam trap.** No transaction spans two logical partitions. "Debit customer A and credit customer B atomically" fails if the partition key is `/customerId`: redesign so both items share a key, or use a compensating pattern.

<!-- section: time-to-live | objectives: 1.2.5 -->
## Configuring time to live

TTL deletes items automatically, a number of seconds after their **last modification** (or creation). It's set on the container (`DefaultTimeToLive`, `defaultTtl`) and optionally per item (`ttl` property).

| Container TTL | Item `ttl` | Result |
| --- | --- | --- |
| Not set (null) | Any or none | Nothing expires; item `ttl` is **ignored** |
| `-1` | None | TTL enabled, items never expire |
| `-1` | `3600` | That item expires after 1 hour; the others never |
| `604800` | None | Every item expires 7 days after its last write |
| `604800` | `-1` | That item never expires; the others after 7 days |
| `3600` | `1800` | That item after 30 minutes; the others after 1 hour |

Rules: values are seconds; an item `ttl` must be `-1` or a positive integer up to 2147483647; `null` isn't supported on an item (omit the property to use the container default); expired items are removed by a background purge.

```text
// C#: container default of 30 days
ContainerProperties props = new ContainerProperties("sessions", "/userId") { DefaultTimeToLive = 2592000 };

// C#: item-level override, omitted from the JSON when null
public class Session
{
    public string id { get; set; }
    public string userId { get; set; }
    [JsonProperty("ttl", NullValueHandling = NullValueHandling.Ignore)]
    public int? ttl { get; set; }
}

# Python: enable TTL on an existing container (1 hour)
database.replace_container(container, partition_key=PartitionKey(path="/userId"), default_ttl=3600)
```

A common pattern for consumers of the change feed in latest version mode: mark the item deleted (an update the feed sees) and set its `ttl` so that the purge removes it later.

> **Exam trap.** Setting `ttl` on items does nothing while the container TTL is unset. "Some items never expire, others after a set time" needs the container TTL set (to `-1` or a value), then `ttl` on the items.

<!-- section: concurrency | objectives: 1.2.6 -->
## Concurrency control

Every item has a system `_etag` that the server changes on **every** update. **Optimistic concurrency**: send the `_etag` you read in an If-Match condition; if the item changed since, the server rejects the write with **HTTP 412 Precondition Failed**, and your code reads again and retries. For replace, If-Match must be set explicitly in the request options.

```text
// C#: read-modify-write that never overwrites a concurrent change
while (true)
{
    ItemResponse<Account> read = await container.ReadItemAsync<Account>("acc-7", new PartitionKey("acc-7"));
    Account account = read.Resource;
    account.balance -= 25;
    try
    {
        await container.ReplaceItemAsync(account, account.id, new PartitionKey(account.id),
            new ItemRequestOptions { IfMatchEtag = read.ETag });
        break;
    }
    catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.PreconditionFailed)
    {
        // 412: the item changed after our read; loop to read it again
    }
}

# Python
from azure.core import MatchConditions
doc = container.read_item(item="acc-7", partition_key="acc-7")
doc["balance"] -= 25
container.replace_item(item=doc["id"], body=doc,
                       etag=doc["_etag"], match_condition=MatchConditions.IfNotModified)
# raises CosmosHttpResponseError with status_code 412 if the item changed
```

| Requirement | Mechanism |
| --- | --- |
| Don't lose a concurrent update in a read-modify-write | If-Match with `_etag` (`IfMatchEtag`, `etag` + `MatchConditions.IfNotModified`), retry on 412 |
| Update a counter without reading first | Patch `Increment`: applied atomically on the server |
| Apply a change only if the item is in a given state | Conditional patch (`FilterPredicate`), 412 if false |
| Several items change together or not at all | Transactional batch (same logical partition) |
| Refresh a cache only when the item changed | If-None-Match with `_etag`: 304 if unchanged |
| Concurrent writes in several write regions | Conflict resolution policy: last writer wins on `_ts` by default, or custom |

All operations inside one logical partition run as ACID transactions with snapshot isolation. There's no lock API: concurrency is optimistic. With multi-region writes, an update commits in the local region if its `_etag` matches there; the conflict resolution policy then keeps or rejects it globally.

> **Exam trap.** Session consistency and the session token give read-your-writes; they don't prevent two clients from overwriting each other. Lost updates are prevented by the ETag.

<!-- section: key-points -->
## Key points

- Parameterize every query, scope it with the partition key, and page with `HasMoreResults` and continuation tokens (never-expiring, one per query); empty pages are normal.
- Point read = `id` + partition key, about 1 RU per KB; always cheaper than a query for the same item.
- Create 409 on duplicate, Replace and Delete 404 when missing, Upsert does both; Patch: up to 10 operations, conditional with a filter predicate.
- Transactional batch: one logical partition, 100 operations, all or nothing. Bulk: throughput, no atomicity.
- TTL works only when the container TTL is set; `-1` means never expire.
- `_etag` + If-Match and HTTP 412 for optimistic concurrency; patch increments avoid the read.
