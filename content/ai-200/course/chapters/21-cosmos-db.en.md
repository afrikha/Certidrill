Azure Cosmos DB for NoSQL stores the JSON documents of an AI application (conversations, catalogs, document chunks) with their embeddings, and serves both point reads and vector similarity queries. Questions show `azure-cosmos` Python code and ask for the missing call, the indexing policy that lowers RU, the consistency level, the vector index type or the component that reacts to new items.

<!-- section: cosmos-sdk | objectives: 2.1.1 -->
## Connecting with the Python SDK and running queries

Resource model: **account** (endpoint `https://<account>.documents.azure.com:443/`) > **database** > **container** > **items**. Every container has a **partition key** (for example `/tenantId`); an item is identified by its `id` **and** its partition key value.

```text
from azure.cosmos import CosmosClient, PartitionKey
from azure.identity import DefaultAzureCredential

# One client for the lifetime of the application
client = CosmosClient("https://cosmos-rag.documents.azure.com:443/",
                      credential=DefaultAzureCredential())
database = client.get_database_client("ragdb")
container = database.get_container_client("chunks")

container.upsert_item({"id": "doc42-0", "tenantId": "fabrikam", "text": "..."})
item = container.read_item(item="doc42-0", partition_key="fabrikam")

results = container.query_items(
    query="SELECT c.id, c.text FROM c WHERE c.tenantId = @tenant AND c.lang = @lang",
    parameters=[{"name": "@tenant", "value": "fabrikam"},
                {"name": "@lang", "value": "en"}],
    partition_key="fabrikam")
for row in results:
    print(row["id"])
```

| Element | Rule |
| --- | --- |
| `CosmosClient(url, credential)` | `credential` = account key, resource tokens or a `TokenCredential` such as `DefaultAzureCredential`. Create **one** client per application: initialization is expensive |
| `create_item` / `upsert_item` / `replace_item` / `patch_item` / `delete_item` | Create fails if the `id` exists in the partition; upsert creates or replaces; patch changes some properties only |
| `read_item(item, partition_key)` | **Point read**: the cheapest way to get one item when `id` and partition key are known |
| `query_items(query, parameters, partition_key)` | Query scoped to one logical partition. Without `partition_key`, the sync client requires `enable_cross_partition_query=True` (fan-out to all partitions, higher RU and latency); the async client (`azure.cosmos.aio`) runs cross-partition queries by default |
| `parameters` | List of `{"name": "@x", "value": ...}`: never build the SQL by string concatenation |
| Response headers | `response.get_response_headers()["x-ms-request-charge"]` gives the RU charge of a point operation |

**Keyless access.** Data operations with Microsoft Entra ID use Cosmos DB's **own data plane roles**, not Azure RBAC roles such as Contributor: **Cosmos DB Built-in Data Reader** and **Cosmos DB Built-in Data Contributor** (ID `00000000-0000-0000-0000-000000000002`). They are assigned with the CLI, PowerShell or Bicep; the portal's Access control (IAM) page doesn't manage them.

```bash
az cosmosdb sql role assignment create --resource-group rg-rag \
  --account-name cosmos-rag \
  --role-definition-id 00000000-0000-0000-0000-000000000002 \
  --principal-id <managed-identity-object-id> \
  --scope "/dbs/ragdb/colls/chunks"

# Refuse account keys entirely
az resource update --resource-group rg-rag --name cosmos-rag \
  --resource-type "Microsoft.DocumentDB/databaseAccounts" \
  --set properties.disableLocalAuth=true
```

The scope can be `/` (whole account), `/dbs/<database>` or `/dbs/<database>/colls/<container>`.

> **Exam trap.** A managed identity with **Contributor** or **DocumentDB Account Contributor** on the account can manage it (control plane) but gets `403 Forbidden` on `read_item` with `DefaultAzureCredential`: it needs a Cosmos DB data plane role assignment.

<!-- section: indexing-consistency | objectives: 2.1.2 -->
## Optimizing RU consumption: indexing policies and consistency levels

Every operation costs **Request Units** (RU); when the provisioned RU/s are exhausted, requests get HTTP 429. A point read of a 1 KB item costs 1 RU; writes cost more when more properties are indexed.

**Default indexing policy:** every property of every item is indexed (range indexes on strings and numbers), mode `consistent`.

```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [ { "path": "/*" } ],
  "excludedPaths": [
    { "path": "/text/?" },
    { "path": "/metadata/raw/*" },
    { "path": "/\"_etag\"/?" }
  ],
  "compositeIndexes": [
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/updatedAt", "order": "descending" }
    ]
  ]
}
```

| Path | Matches |
| --- | --- |
| `/text/?` | The scalar value of `text` |
| `/metadata/raw/*` | Everything below `raw` |
| `/tags/[]/?` | Every element of the `tags` array |

| Requirement | Policy |
| --- | --- |
| Reduce the RU of writes for large items that are only filtered on a few properties | Exclude what is never filtered or sorted on (long texts, raw payloads, embeddings) |
| New properties must be queryable without changing the policy | Include `/*` and exclude specific paths (recommended approach) |
| `ORDER BY` on two or more properties | **Composite index** required, same order of paths; directions identical or all reversed |
| Equality filter plus range filter or sort | Composite index with the equality properties first and the range property last; one range filter per composite index |
| Pure key-value access by `id` and partition key | Mode `none` (no query on other properties; TTL isn't possible in mode `none`) |

When an included and an excluded path conflict, **the more precise path wins** (`/a/b/?` beats `/a/*`). A policy change runs online; new indexes serve queries only once the transformation completes, while a dropped index stops being used immediately. To see whether a query used the index, call `query_items(..., populate_index_metrics=True)` (overhead: use it for diagnosis only).

> **Exam trap.** With the exclude-everything strategy (`/*` excluded), the partition key isn't indexed unless you include it. A query on a non-indexed path still works, but scans and costs many more RU.

**Consistency levels**, from strongest to weakest:

| Level | Guarantee | Read cost |
| --- | --- | --- |
| Strong | Always reads the latest committed write (linearizability); not available with multiple write regions | **Twice** the RU of the weaker levels (two replicas read) |
| Bounded staleness | Reads lag by at most K versions or T time, whichever is reached first | **Twice** the RU |
| Session | Within one client session: read your own writes and write-follows-reads; default level of accounts | Single replica |
| Consistent prefix | Reads never see writes out of order (transactional writes appear together) | Single replica |
| Eventual | No ordering guarantee; lowest latency | Single replica |

| Requirement | Level |
| --- | --- |
| A user must see the chat message they just posted, at the lowest cost | Session |
| Every reader in every region sees the latest value, single write region | Strong |
| Lowest RU and latency, order doesn't matter (view counters) | Eventual |
| Global readers may lag, but never by more than 5 minutes | Bounded staleness |

The account default applies to every container. With the `consistency_level` override, a client can only relax the level for its own reads (`CosmosClient(url, credential, consistency_level="Eventual")`); to go stronger, change the account default (only the newer read consistency strategy of the .NET and Java SDKs can go above it). Session tokens are per partition and cached by the client: a new client instance starts without them, so reuse the client (or pass the session token) to keep read-your-writes.

> **Exam trap.** Moving from Session to Strong doubles the RU of reads and can't be used with multi-region writes. If the requirement is only "the author sees their own writes", Session already meets it.

<!-- section: vector-search | objectives: 2.1.3 -->
## Storing embeddings and running vector similarity search

**1. Enable vector search on the account** (auto-approved, can take 15 minutes; not supported with shared throughput):

```bash
az cosmosdb update --resource-group rg-rag --name cosmos-rag \
  --capabilities EnableNoSQLVectorSearch
```

**2. Create the container with a vector embedding policy and a vector index:**

```text
vector_embedding_policy = {
    "vectorEmbeddings": [
        {"path": "/embedding", "dataType": "float32",
         "distanceFunction": "cosine", "dimensions": 1536}
    ]
}
indexing_policy = {
    "indexingMode": "consistent",
    "automatic": True,
    "includedPaths": [{"path": "/*"}],
    "excludedPaths": [{"path": "/\"_etag\"/?"}, {"path": "/embedding/*"}],
    "vectorIndexes": [{"path": "/embedding", "type": "diskANN"}]
}
container = database.create_container(
    id="chunks", partition_key=PartitionKey(path="/tenantId"),
    indexing_policy=indexing_policy,
    vector_embedding_policy=vector_embedding_policy)
```

| Property | Values |
| --- | --- |
| `path` | Property that holds the vector; one policy per path; no wildcard, not inside an array |
| `dataType` | `float32`, `float16` (half the storage, small accuracy loss), `int8`, `uint8` |
| `dimensions` | Length of every vector of the path (default 1536); must match the embedding model |
| `distanceFunction` | `cosine` (default), `dotproduct`, `euclidean` |

| Vector index | Max dimensions | Choose it when |
| --- | --- | --- |
| `flat` | 505 | Exact brute-force search (100 % recall) on small sets, especially narrowed by filters and the partition key |
| `quantizedFlat` | 4,096 | Compressed vectors; up to about 50,000 vectors in the scope of a search |
| `diskANN` | 4,096 | Approximate nearest neighbor search, most performant beyond about 50,000 vectors |

`quantizedFlat` and `diskANN` need at least 1,000 vectors indexed; below that, the query does a full scan and costs more RU. Learn's example also excludes the vector path from the regular range index (`/embedding/*` above).

> **Exam trap.** The vector embedding policy and the vector indexes can't be edited by a container replace: to change dimensions, distance function or index type, drop the vector policy or index and add it again (or create a new container). Vector search can't be disabled on a container once enabled. An embedding model with 3,072 dimensions can't use `flat`.

**3. Query with `VectorDistance`:**

```text
query_vector = embed("How do I rotate the storage key?")   # same model as the stored vectors

results = container.query_items(
    query="""SELECT TOP 5 c.id, c.text,
                    VectorDistance(c.embedding, @v) AS score
             FROM c
             WHERE c.tenantId = @tenant AND c.lang = 'en'
             ORDER BY VectorDistance(c.embedding, @v)""",
    parameters=[{"name": "@v", "value": query_vector},
                {"name": "@tenant", "value": "fabrikam"}],
    partition_key="fabrikam")
```

| Rule | Why |
| --- | --- |
| Always `TOP N` | Without it the search returns many more results, with higher RU and latency |
| `ORDER BY VectorDistance(...)` | Returns the most similar first |
| `WHERE` on metadata and the partition key | Narrows the candidate vectors (multi-tenant RAG, language, date) |
| Same embedding model and dimensions for documents and query | Otherwise distances are meaningless or the query fails |

With `diskANN`, results are approximate: the same query can return slightly different results; a larger `searchListSizeMultiplier` in `VectorDistance` raises recall at the cost of RU and latency.

<!-- section: change-feed | objectives: 2.1.4 -->
## Reacting to new and updated items with the change feed

The **change feed** lists the changes of a container in order, per partition key. In the default **latest version** mode it contains inserts and updates but **not deletes**. The **all versions and deletes** mode (preview) also reports intermediate versions and deletes, within the continuous backup retention period.

**Change feed processor** (library of the .NET and Java SDKs; **not available in Python**, which uses the pull model or Azure Functions):

| Component | Role |
| --- | --- |
| Monitored container | The container whose changes are read |
| Lease container | Stores the progress (one lease per range of partitions) and coordinates the instances |
| Compute instance | A host running the processor, with a **unique instance name** |
| Delegate | Your code that handles each batch of changes |

```text
// .NET SDK
ChangeFeedProcessor processor = container
    .GetChangeFeedProcessorBuilder<Chunk>("embedding-processor", HandleChangesAsync)
    .WithInstanceName("worker-01")
    .WithLeaseContainer(leaseContainer)
    .Build();
await processor.StartAsync();
```

| Behavior | Rule |
| --- | --- |
| Delivery | **At least once**: the lease is updated only after the delegate succeeds; an unhandled exception makes the same batch come back. Make the handler idempotent; send poison items to an error container or queue |
| Scale out | Instances with the same processor name and lease container, but different instance names, share the leases; more instances than leases leaves some idle |
| Start point | By default only changes after the first start; `WithStartTime` or from the beginning, applied only when the lease container is initialized the first time |
| Asynchronous work in the delegate | Await it: the lease can be checkpointed before fire-and-forget work completes, and events are lost |

**Python option 1: Azure Functions trigger.** It reads the change feed for you, across partitions, and needs a lease container (the Python decorator takes the snake_case form of the settings below):

```text
import azure.functions as func

app = func.FunctionApp()

@app.cosmos_db_trigger(arg_name="documents",
                       database_name="ragdb",
                       container_name="chunks",
                       connection="COSMOS_CONNECTION",
                       lease_container_name="leases",
                       create_lease_container_if_not_exists="true")
def embed_changes(documents: func.DocumentList):
    for doc in documents:
        upsert_embedding(doc)   # must tolerate the same document twice
```

| Setting | Default and rule |
| --- | --- |
| `leaseContainerName` | `leases` |
| `createLeaseContainerIfNotExists` | `false`: the lease container must exist unless set to true |
| `startFromBeginning` | Reads the whole history, only the first time (no effect once leases exist) |
| `leaseContainerPrefix` | Lets several functions share one lease container; otherwise give each function its own lease container, or only one of them is triggered |
| `feedPollDelay` | 5,000 ms between polls once the changes are drained |
| `maxItemsPerInvocation` | Maximum number of items per function call |

**Python option 2: pull model.** Your code reads the feed and keeps the position itself:

```text
changes = container.query_items_change_feed(start_time="Beginning",
                                            partition_key="fabrikam")
for doc in changes:
    upsert_embedding(doc)
```

| Parameter | Values |
| --- | --- |
| `start_time` | `"Now"` (default), `"Beginning"` or a `datetime` (converted to UTC) |
| `partition_key` / `feed_range` | Read a single logical partition / a range, to parallelize manually |
| `continuation` | Token from a previous response: resume where the reader stopped (takes precedence over `start_time`) |
| `mode` | `"LatestVersion"` or `"AllVersionsAndDeletes"` (the latter starts from `"Now"` or a continuation) |

| Requirement | Answer |
| --- | --- |
| Python, serverless, scale with the load, no state to manage | Azure Functions Cosmos DB trigger |
| Python worker that processes only one tenant's partition, at its own pace | Pull model with `partition_key` |
| .NET or Java service that spreads the load over several instances | Change feed processor |
| React to deletes | Soft delete (a flag, then TTL), or all versions and deletes mode |

> **Exam trap.** The pull model has no lease container and no automatic polling: your code stores the continuation token and checks again when there are no new changes. The change feed processor and the Functions trigger keep their state in the lease container, and the two kinds of bookmark can't be converted into each other.

<!-- section: key-points -->
## Key points

- One `CosmosClient` per application; `read_item(id, partition_key)` is the cheapest read; parameterized queries scoped by `partition_key` avoid cross-partition fan-out.
- Keyless access = `DefaultAzureCredential` plus a Cosmos DB data plane role (Built-in Data Reader / Data Contributor) assigned with `az cosmosdb sql role assignment create`, not Azure RBAC Contributor.
- Exclude unqueried paths to cut write RU; composite indexes for multi-property `ORDER BY` and equality-plus-range filters; the more precise path wins.
- Session = read-your-writes, default; Strong and Bounded staleness reads cost twice the RU; Strong is impossible with multiple write regions.
- Vectors: enable `EnableNoSQLVectorSearch`, declare the embedding policy (path, dataType, dimensions, distanceFunction) and a vector index (`flat` up to 505 dimensions, `quantizedFlat`, `diskANN` up to 4,096); query `SELECT TOP N ... ORDER BY VectorDistance(...)`.
- Change feed: inserts and updates, no deletes in latest version mode; processor = monitored container + lease container + instances + delegate, at least once; Python uses the Functions trigger or `query_items_change_feed`.
