A slow or expensive Azure Cosmos DB workload is diagnosed with three tools: query and index metrics returned by the SDK, Azure Monitor metrics and alerts, and resource logs in Log Analytics. Exam questions show a query, a metric value or a KQL result and ask for the cause and the cheapest fix, or ask which signal and which alert type detect a given condition.

<!-- section: query-optimization | objectives: 2.3.1 -->
## Optimizing queries

The cost ladder for reading data, from cheapest to most expensive:

| Access | Typical cost | When |
| --- | --- | --- |
| Point read (`id` + partition key) | About 1 RU for a 1 KB item | You know both values |
| Query with an equality filter on the partition key | One partition, one index lookup | Most application queries |
| Query with `IN` on the partition key | Only the listed partitions | A few known tenants or categories |
| Query with no partition key filter, or a range filter on it | Fan-out to every physical partition | Reports, admin screens; avoid on hot paths |

Each physical partition has its own index, so a fan-out query pays an index lookup per partition. The savings of a partition key filter become noticeable above about 30,000 provisioned RU/s or about 100 GB of data.

Fixes for the classic patterns:

| Symptom in the query | Why it's slow | Fix |
| --- | --- | --- |
| `WHERE UPPER(c.name) = 'BOB'` or `LOWER(...)` | The function can't use the index: every item is loaded (scan) | Store a normalized value at write time, or index a computed property |
| `WHERE c.ts > GetCurrentTimestamp() - 3600` | `GetCurrentDateTime`, `GetCurrentTimestamp`, `GetCurrentTicks` don't use the index | Compute the value in the client and pass a parameter |
| A path listed in `excludedPaths` is filtered on | No index on the path: scan | Include the path (paths are case-sensitive) |
| Filter plus `ORDER BY` on another property | Served by the range index only | Composite index; put every composite property in `ORDER BY` |
| Several filters, one of them a range | Range indexes intersected | Composite index: equality properties first, the single range property last |
| `CONTAINS`, `EndsWith`, `RegexMatch`, case-insensitive `StartsWith` | Cost grows with the property's cardinality | Add `ORDER BY` on that property (and on the equality property, with a composite index) |
| Several `JOIN` on arrays, filters in `WHERE` | Cross product built before filtering | Move each filter into a `JOIN (SELECT VALUE t FROM t IN c.tags WHERE ...)` subquery |
| `SELECT *` on large items | Load and serialization time | Project only the needed properties |
| `GROUP BY` | Every matching item is loaded; cost grows with the grouped property's cardinality | Add selective equality filters, or maintain a materialized view from the change feed |

String functions that **do** use the index: `StartsWith`, `Contains`, `RegexMatch`, `Left`, and `Substring` when the start position is 0. System functions in `SELECT` don't affect index use. Aggregates apply equality and range filters first and evaluate the other filters on what remains, so an extra equality filter makes `CONTAINS` in an aggregate much cheaper.

Composite index for `WHERE c.foodGroup = @g ORDER BY c.foodGroup, c._ts`:

```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [ { "path": "/*" } ],
  "excludedPaths": [],
  "compositeIndexes": [
    [
      { "path": "/foodGroup", "order": "ascending" },
      { "path": "/_ts", "order": "ascending" }
    ]
  ]
}
```

Composite index rules: two or more paths, no wildcard, order of paths matters, the `ORDER BY` must list the paths in the same order with the same directions (or all reversed), at most one range filter per composite index and it goes last. A query that doesn't filter or sort on all the paths in order doesn't use it.

**Computed properties** index the result of an expression that the index can't serve directly:

```json
{
  "computedProperties": [
    { "name": "cp_lowerName", "query": "SELECT VALUE LOWER(c.name) FROM c" }
  ]
}
```

Up to 20 per container, top level only, `VALUE` required, no `WHERE`, `JOIN`, aggregates, UDFs or nondeterministic functions. They're **not** covered by the `/*` path: add `/cp_lowerName/?` to `includedPaths`. `SELECT *` doesn't return them; `ORDER BY` on one requires it to be indexed. Defining one costs no RU; indexed ones add a little write RU.

SDK settings that change query latency, not RU:

| Option (.NET `QueryRequestOptions`) | Effect | Guidance |
| --- | --- | --- |
| `MaxConcurrency` | Partitions queried in parallel | Number of partitions, or a high value; `-1` lets the SDK decide |
| `MaxBufferedItemCount` | Items prefetched while the client processes the current page | Expected result count or higher; `-1` lets the SDK decide |
| `MaxItemCount` | Items per round trip (page size) | Larger pages mean fewer round trips |

> **Exam trap.** An empty page doesn't mean the query is finished. Every query can return a continuation token; keep reading while `HasMoreResults` is true and drain the query completely.

Also on the client side: one singleton `CosmosClient` per account, the application in the same region as the account (`ApplicationRegion` or `ApplicationPreferredRegions`), direct mode, and no `Create...IfNotExistsAsync` or `Read...Async` metadata call before every item operation (metadata calls have no SLA and are throttled separately).

<!-- section: query-metrics | objectives: 2.3.2 -->
## Analyzing query metrics

Each page of a query returns server-side metrics in its diagnostics:

| Metric | Meaning |
| --- | --- |
| `RetrievedDocumentCount` / `RetrievedDocumentSize` | Items loaded by the engine |
| `OutputDocumentCount` / `OutputDocumentSize` | Items returned |
| `IndexHitRatio` | Items matched by the filter divided by items loaded (0 to 1) |
| `IndexLookupTime` | Time in the index |
| `DocumentLoadTime` | Time loading items |
| `DocumentWriteTime` | Time serializing the output |
| `RuntimeExecutionTime` | Time in the query runtime (system functions, UDFs) |
| `TotalTime` | Total execution time on the server |

With the .NET SDK v3 (3.36.0 or later):

```text
FeedIterator<Product> it = container.GetItemQueryIterator<Product>(query);
while (it.HasMoreResults)
{
    FeedResponse<Product> page = await it.ReadNextAsync();
    ServerSideCumulativeMetrics m = page.Diagnostics.GetQueryMetrics();
    TimeSpan serverTime = m.CumulativeMetrics.TotalTime;
    double charge = m.TotalRequestCharge;
    foreach (ServerSidePartitionedMetrics p in m.PartitionedMetrics)
        Console.WriteLine($"{p.PartitionKeyRangeId}: {p.RequestCharge} RU");
}
```

`CumulativeMetrics` sums one round trip across partitions; `PartitionedMetrics` gives each partition key range with its `RequestCharge`. A query spans several round trips: aggregate the metrics of every page to get its real cost. Other SDKs expose the same data in the diagnostics.

How to read them:

| Observation | Diagnosis | Remedy |
| --- | --- | --- |
| Retrieved far above output (60,951 vs 7), index utilization 0 % | Scan | Make the filter index-friendly (see above) |
| Retrieved = output + 1 with `TOP` | Normal | Nothing |
| `DocumentLoadTime` is most of `TotalTime` | Too many items loaded | Reduce retrieved items, not runtime |
| High `RuntimeExecutionTime` | Expensive system functions or UDFs | Precompute or use a computed property |
| One partition key range has most of the charge | Hot or skewed partition | Review the partition key |
| Low `TotalTime` but slow for the user | Time spent outside the engine | Network, region, client (see latency) |

> **Exam trap.** `TotalTime` is server execution time only. It never includes network transit, so it isn't the end-to-end latency the user sees.

Throughput sizing follows from the charge: a 5 RU query on 1,000 RU/s runs about 200 times per second before 429 responses.

<!-- section: index-metrics | objectives: 2.3.3 -->
## Analyzing index metrics

Index metrics tell which indexed paths a query used and which paths or composite indexes could help. Enable them per query; they default to off:

```text
var options = new QueryRequestOptions { PopulateIndexMetrics = true };
FeedIterator<Item> it = container.GetItemQueryIterator<Item>(
    new QueryDefinition("SELECT TOP 10 c.id FROM c WHERE c.Item = @i AND c.Price > 2")
        .WithParameter("@i", "value1234"),
    requestOptions: options);
FeedResponse<Item> page = await it.ReadNextAsync();
Console.WriteLine(page.IndexMetrics);
```

Minimum versions: .NET SDK 3.21.0, Java SDK 4.19.0, Python SDK 4.6.0. The output has four sections:

```text
Index Utilization Information
  Utilized Single Indexes
    Index Spec: /Item/?
    Index Impact Score: High
    ---
    Index Spec: /Price/?
    Index Impact Score: High
    ---
  Potential Single Indexes
  Utilized Composite Indexes
  Potential Composite Indexes
    Index Spec: /Item ASC, /Price ASC
    Index Impact Score: High
    ---
```

| Section | Use |
| --- | --- |
| Utilized Single Indexes / Utilized Composite Indexes | Paths the query really used. A path never listed for any query can be excluded to save write RU and storage |
| Potential Single Indexes / Potential Composite Indexes | Suggestions, not proof, not exhaustive: add them, then measure the RU charge again |
| Index Impact Score (`High`, `Low`) | Likelihood that the path substantially lowers the charge, judged from the query shape only |

Index metrics add overhead: enable them while troubleshooting, and use diagnostic logs to track expensive queries over time.

Changing the indexing policy doesn't affect read or write availability; the transformation runs in the background and its progress can be read through the SDK. Until a new composite index is built, the engine keeps using the existing range indexes. To replace an index, add the new one, wait for the transformation to complete, then remove the old one.

> **Exam tip.** Storage tells the same story: the Storage tab of Insights compares data size with index size. An index close to the data size points to an indexing policy that indexes paths no query uses.

<!-- section: latency | objectives: 2.3.4 -->
## Monitoring end-to-end latency against service objectives

The Azure Cosmos DB SLA covers **under 10 ms for point reads and point writes with direct connectivity**. Measure the two halves of a request separately:

| Measure | Where | What it covers |
| --- | --- | --- |
| Server Side Latency Direct (`ServerSideLatencyDirect`) | Azure Monitor metrics | Backend time, direct mode (NoSQL, Table) |
| Server Side Latency Gateway (`ServerSideLatencyGateway`) | Azure Monitor metrics | Backend time, gateway mode (all APIs) |
| `Diagnostics.GetClientElapsedTime()` | SDK response | Full time seen by the application, retries included |
| `BELatencyInMs` in the diagnostics `StoreResult` | SDK diagnostics | Backend time of one direct call |

The old Server Side Latency metric is deprecated. Latency metrics are collected without configuration, split by `DatabaseName`, `CollectionName`, `OperationType`, `Region` or `PublicAPIType`, and kept 30 days in the metrics view.

Log the diagnostics when a request is slower than your objective or fails:

```text
ItemResponse<Order> r = await container.ReadItemAsync<Order>(id, new PartitionKey(customerId));
if (r.Diagnostics.GetClientElapsedTime() > sloThreshold)
{
    logger.LogWarning(r.Diagnostics.ToString());
}
// in catch (CosmosException ex): log ex.ToString(), which includes the diagnostics
```

Log the diagnostics string as is; its format changes between SDK versions, so don't parse it.

| What the diagnostics show | Likely cause | Fix |
| --- | --- | --- |
| Server-side latency low, client elapsed time high | Client or network | Same region, singleton client, direct mode |
| `BELatencyInMs` small, `Transit Time` large | Network | Accelerated Networking, larger VM, same region |
| Long `ChannelAcquisitionStarted` | Connection creation: non-singleton clients, idle timeouts | Reuse one client |
| Long `Received`, `isThreadStarving: True` | Thread starvation from blocking on async code (`.Result`, `.Wait()`) | Use `await` |
| CPU above about 40 % (latency rises), above 70 % (exhaustion) | Client CPU | Scale out the client; watch maximum, not average |
| Status 429 with `RetryAfterInMs` | Throttling; the SDK retries, adding latency | More RU/s or a better partition key |
| `TransportException`, many open connections | SNAT port exhaustion | Singleton client, fewer connections |

> **Exam trap.** High latency with low server-side latency is never fixed by adding RU/s: the time is spent between the client and the service.

Insights (account > Monitoring > Insights) shows requests by status code and Normalized RU Consumption per partition key range, to find hot partitions.

<!-- section: alerts | objectives: 2.3.5 -->
## Configuring Azure Monitor alerts

| Alert type | Fires on | Cosmos DB example |
| --- | --- | --- |
| Metric | A metric crossing a static or dynamic threshold | 429 responses, Normalized RU Consumption, region failover |
| Log search | The result of a KQL query on resource logs | A logical partition key approaching 20 GB |
| Activity log | A control plane event | Account keys listed or regenerated |

Create a rule from the account (Monitoring > Alerts) or from Azure Monitor: scope, condition (signal, dimensions, threshold), action group, details. The rule becomes active within 10 minutes.

| Requirement | Signal | Settings |
| --- | --- | --- |
| Too many throttled requests | Total Requests | Dimension `StatusCode` = 429, aggregation Count, Greater than |
| A partition close to its RU/s limit | Normalized RU Consumption | Maximum, Greater than 90 %, optionally split by `CollectionName` |
| Backend latency above the objective | Server Side Latency Direct | Average or Maximum, filter on `OperationType` |
| A region failed over | Region Failed Over (`RegionFailover`) | Count, Greater than 0 |
| Availability below target | Service Availability | Minimum, hourly grain |
| Logical partition near 20 GB | Log search on `CDBPartitionKeyStatistics` | `SizeKb` above a threshold |
| Account keys regenerated | Activity log | Operation on the account keys |

Settings to know: **static** threshold (fixed value) or **dynamic** threshold (machine learning on the metric's history); aggregation type, aggregation granularity and evaluation frequency; dimensions filter the metric (status code, database, container). An **action group** (unique name in the resource group, short name used in notifications) sends email, SMS, push or voice notifications, or runs an Azure Function or another action.

> **Exam trap.** A few 429s aren't a failure: 1 to 5 % of requests throttled while latency meets the objective means the provisioned RU/s are well used. Alert on a threshold that matters for the workload, and on Normalized RU Consumption to spot a hot partition.

<!-- section: diagnostic-logs | objectives: 2.3.6 -->
## Analyzing diagnostic logs in Log Analytics

Resource logs record each data plane request. They aren't collected until you add a **diagnostic setting** (account > Monitoring > Diagnostic settings): choose the categories, send them to a Log Analytics workspace, and select **Resource specific** as the destination table mode. Resource-specific mode (recommended for every API except Table) writes to dedicated `CDB...` tables with typed columns; the legacy Azure diagnostics mode writes everything to `AzureDiagnostics` with suffixed columns such as `requestCharge_s`.

| Category | Table | Use |
| --- | --- | --- |
| DataPlaneRequests | `CDBDataPlaneRequests` | Every data operation: `OperationName`, `StatusCode`, `RequestCharge`, `DurationMs`, `ActivityId`, `RegionName`, `UserAgent` |
| QueryRuntimeStatistics | `CDBQueryRuntimeStatistics` | Query text (`QueryText`), joined to requests on `ActivityId` |
| PartitionKeyRUConsumption | `CDBPartitionKeyRUConsumption` | RU per logical partition key (`PartitionKey`, `PartitionKeyRangeId`): hot keys |
| PartitionKeyStatistics | `CDBPartitionKeyStatistics` | Largest logical partition keys (`SizeKb`); sampled, keys under about 1 GB may not appear |
| ControlPlaneRequests | `CDBControlPlaneRequests` | Account changes: failover, indexing policy, firewall, role assignments |

Query text and parameters are **obfuscated** by default. To see them, enable **Diagnostics full-text query** (account > Settings > Features); it increases log volume and cost, so disable it after troubleshooting.

Most expensive operations of the last hour:

```kusto
CDBDataPlaneRequests
| where TimeGenerated > ago(1h)
| summarize TotalRU = sum(RequestCharge), P99Ms = percentile(DurationMs, 99), Calls = count()
    by OperationName, CollectionName
| order by TotalRU desc
```

Expensive queries with their text:

```kusto
CDBDataPlaneRequests
| where TimeGenerated > ago(1d) and RequestCharge > 50
| project ActivityId, RequestCharge, DurationMs
| join kind=inner (CDBQueryRuntimeStatistics | project ActivityId, QueryText) on ActivityId
| order by RequestCharge desc
| take 20
```

Throttling over time, and hot logical partition keys:

```kusto
CDBDataPlaneRequests
| where StatusCode == 429
| summarize Throttled = count() by bin(TimeGenerated, 5m), CollectionName

CDBPartitionKeyRUConsumption
| where TimeGenerated > ago(1h)
| summarize TotalRU = sum(RequestCharge) by PartitionKey, PartitionKeyRangeId
| top 10 by TotalRU desc
```

| Question | Table and column |
| --- | --- |
| Which query consumes the most RU? | `CDBDataPlaneRequests.RequestCharge` joined with `CDBQueryRuntimeStatistics.QueryText` |
| Which tenant (partition key value) causes 429s? | `CDBPartitionKeyRUConsumption.PartitionKey` |
| Which logical partition approaches 20 GB? | `CDBPartitionKeyStatistics.SizeKb` |
| Who changed the indexing policy? | `CDBControlPlaneRequests` |

> **Exam tip.** Metrics are free, preaggregated and kept 90 days; logs cost ingestion and storage but give each request. Choose logs when the question needs a partition key value, a query text or one request's `ActivityId`.

<!-- section: key-points -->
## Key points

- Point read, then single-partition query, then fan-out: filter on the partition key whenever you can.
- Functions such as `UPPER`, `LOWER` and `GetCurrentTimestamp` in `WHERE` cause scans; normalize at write time or use an indexed computed property (not covered by `/*`).
- Filter plus `ORDER BY`: composite index, equality paths first, one range path last, every path in `ORDER BY`.
- Retrieved far above output = scan; one partition with most of the charge = hot partition; `TotalTime` excludes the network.
- `PopulateIndexMetrics` lists utilized and potential indexes; for troubleshooting only.
- SLA: under 10 ms for point reads and writes in direct mode; compare server-side latency with `GetClientElapsedTime()`.
- Metric alerts for 429s and Normalized RU Consumption, log search alerts for partition size, activity log alerts for keys.
- Resource-specific diagnostic settings; join `CDBDataPlaneRequests` and `CDBQueryRuntimeStatistics` on `ActivityId`; full-text query only while troubleshooting.
