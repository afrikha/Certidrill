Azure Cosmos DB for NoSQL stores operational data, its text and its vector embeddings in the same items, and retrieves them with full-text search (BM25), vector similarity search and hybrid search that fuses both. Exam questions give a container definition or a query and ask which policy, index, function or option meets a requirement of relevance, latency, RU cost or tenant isolation.

<!-- section: full-text | objectives: 3.1.1 -->
## Full-text search

Full-text search tokenizes, stems and removes stop words from text properties, and ranks matches with **BM25** (term frequency, inverse document frequency, document length). It needs two definitions on the container, plus the full-text and hybrid search feature enabled on the account (Settings > Features):

```json
{
  "defaultLanguage": "en-US",
  "fullTextPaths": [
    { "path": "/description", "language": "en-US" },
    { "path": "/reviews/[]/text", "language": "en-US" }
  ]
}
```

```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [ { "path": "/*" } ],
  "excludedPaths": [ { "path": "/\"_etag\"/?" } ],
  "fullTextIndexes": [
    { "path": "/description" },
    { "path": "/reviews/[]/text" }
  ]
}
```

The first is the container's **full-text policy** (paths and language, array notation allowed); the second is the indexing policy with `fullTextIndexes`, whose paths must match the policy. Without them the functions still run, but without the index: more RU and more latency.

| Function | Returns | Clause |
| --- | --- | --- |
| `FullTextContains(c.p, "red bicycle")` | true if the phrase is present | `WHERE` |
| `FullTextContainsAll(c.p, "red", "bicycle")` | true if every term is present, anywhere | `WHERE` |
| `FullTextContainsAny(c.p, "bicycle", "skateboard")` | true if at least one term is present | `WHERE` |
| `FullTextScore(c.p, "mountain", "bicycle")` | BM25 relevance score | `ORDER BY RANK` only |

```text
SELECT TOP 10 c.id, c.name
FROM c
WHERE FullTextContains(c.description, "waterproof")
  AND FullTextContains(c.description, {"term": "jaket", "distance": 1})
ORDER BY RANK FullTextScore(c.description, "hiking", "jacket")
```

The object form `{"term": ..., "distance": n}` is **fuzzy search**: it tolerates typos up to an edit distance of 2. Facets have no dedicated operator: use `GROUP BY` with `COUNT(1)`, or `COUNTIF` for ranges, on the filtered set.

Languages: `en-US`; `de-DE`, `es-ES`, `fr-FR`, `it-IT`, `pt-PT` and `pt-BR` are in preview (enroll in the new full-text search features of the account). Stop-word removal applies to English only.

> **Exam trap.** `FullTextScore` can't be projected in `SELECT` or used in `WHERE`: it only appears after `ORDER BY RANK`. To filter on terms, use `FullTextContains`, `FullTextContainsAll` or `FullTextContainsAny`.

<!-- section: vector-design | objectives: 3.1.2 -->
## Designing for vector data

Enable vector search on the account once (it can take up to 15 minutes):

```bash
az cosmosdb update --resource-group rg-ai --name cosmos-contoso \
  --capabilities EnableNoSQLVectorSearch
```

The container's **vector embedding policy** describes each vector path:

```json
{
  "vectorEmbeddings": [
    { "path": "/contentVector", "dataType": "float32", "distanceFunction": "cosine", "dimensions": 1536 },
    { "path": "/imageVector", "dataType": "float16", "distanceFunction": "dotproduct", "dimensions": 512 }
  ]
}
```

| Property | Values | Notes |
| --- | --- | --- |
| `path` | A property path | One policy per path; several vector paths per container allowed |
| `dataType` | `float32`, `float16`, `int8`, `uint8` | `float16` halves vector storage, with a possible small loss of accuracy |
| `dimensions` | Vector length (default 1536) | Every vector on the path has this length; it must match the embedding model |
| `distanceFunction` | `cosine` (default), `dotproduct`, `euclidean` | Cosine: -1 to +1, higher is closer; dot product: higher is closer; Euclidean: 0 is closest |

The indexing policy then declares a **vector index** per path, of one of three types:

| Type | Max dimensions | Search | When |
| --- | --- | --- | --- |
| `flat` | 505 | Brute force, exact (100 % recall) | Small, filtered searches; small embeddings |
| `quantizedFlat` | 4,096 | Brute force on compressed vectors, slightly under 100 % recall; cheaper and faster than `flat` | About 50,000 vectors or fewer per physical partition, or narrow filters |
| `diskANN` | 4,096 | Approximate nearest neighbors (DiskANN), high recall, lowest latency and RU | More than about 50,000 vectors per physical partition |

`quantizedFlat` and `diskANN` need at least 1,000 vectors; below that, the query runs a full scan. Both accept `quantizerType`: `product` (default) or `spherical`, which can shorten quantization and give higher, more stable recall on very high-dimensional embeddings.

Size: a vector costs dimensions multiplied by 4 bytes in `float32`, 2 in `float16`, 1 in `int8` or `uint8`. A 3,072-dimension embedding can't use `flat` (505 maximum) but fits `quantizedFlat` or `diskANN`. In the item, the vector is stored as a JSON array, much larger than its binary size, and counts toward the 2 MB item limit.

Rules and limits:

- Vector paths can't use wildcards (`*`, `[]`) and can't sit inside arrays.
- Vector search isn't supported with **shared throughput** (throughput provisioned on the database).
- An existing vector embedding or vector index definition can't be changed in place: plan the model, dimensions and distance before creating the container (a change means removing and re-adding the path, or a new container). Once enabled on a container, vector search can't be disabled.
- Containers with hierarchical partition keys need the account configured by the product team (contact listed on Learn).

> **Exam trap.** The `dimensions` value is fixed by the embedding model, not chosen for cost. Changing the model or its output size means re-embedding every item and a new vector definition.

<!-- section: vector-partitioning | objectives: 3.1.3 -->
## Vector partitioning and sharded DiskANN

A DiskANN index is built **per physical partition**. A vector query without a partition key filter fans out to every physical partition, searches each index and merges the results; a query that filters on the partition key searches one partition only. In multitenant designs this decides both cost and isolation:

| Model | Isolation | Vector query | When |
| --- | --- | --- | --- |
| Partition key = tenant | Logical | Single partition with `WHERE c.tenantId = @t` | Many tenants of similar size; under 20 GB each |
| Hierarchical partition key (tenant, then a high-cardinality ID) | Logical, finer | Targets the tenant's partitions | Tenants above 20 GB |
| Container or database per tenant | Performance, not security | Container-scoped | Medium tenant counts with separate throughput |
| Account per tenant | Physical | Account-scoped | Few large or regulated tenants (own regions, keys, restore) |

**Sharded DiskANN** splits a DiskANN index further, by any item property, with `vectorIndexShardKey`. The container gets one DiskANN index per value of that property:

```json
{
  "vectorIndexes": [
    { "path": "/contentVector", "type": "diskANN", "vectorIndexShardKey": ["/tenantId"] }
  ]
}
```

A query is focused on one shard by an equality filter on the shard key:

```text
SELECT TOP 10 c.id, c.title
FROM c
WHERE c.tenantId = @tenantId
ORDER BY VectorDistance(c.contentVector, @queryVector)
```

Smaller indexes give lower latency and RU, better recall within the shard, and isolation of each tenant's or category's vectors. The shard key can be any property, including the partition key; for multitenant apps, use the partition key or its first level. Without `vectorIndexShardKey`, the index stays one global DiskANN index per physical partition, still filterable with `WHERE`.

> **Exam tip.** "Search only within a tenant (or category) among millions of vectors, lowest RU and best recall" points to `vectorIndexShardKey` on that property plus an equality filter on it. A `WHERE` filter on a non-sharded DiskANN index filters, but doesn't shrink the index searched.

<!-- section: vector-search | objectives: 3.1.4 -->
## Implementing vector search

```text
VectorDistance(<vector_expr_1>, <vector_expr_2>, [<bool_expr>], [<obj_expr>])
```

| Argument | Meaning |
| --- | --- |
| `vector_expr_1`, `vector_expr_2` | The stored vector property and the query vector (one-dimensional arrays) |
| `bool_expr` | `true` = brute force; `false` (default) = use the vector index if one exists |
| `obj_expr` | Options: `distanceFunction`, `dataType`, `searchListSizeMultiplier`, `quantizedVectorListMultiplier`, `filterPriority` |

Always use **`TOP N`** with `ORDER BY VectorDistance(...)`: without it the query returns far more results than needed, at a higher RU cost and latency. Sorting puts the most similar items first whatever the distance function. Pass the query vector as a parameter, embedded with the **same model** as the stored vectors.

C# (.NET SDK 3.45.0 or later), creating the container and querying:

```text
var embeddings = new Collection<Embedding>
{
    new Embedding { Path = "/contentVector", DataType = VectorDataType.Float32,
                    DistanceFunction = DistanceFunction.Cosine, Dimensions = 1536 }
};
var props = new ContainerProperties("products", "/categoryId")
{
    VectorEmbeddingPolicy = new VectorEmbeddingPolicy(embeddings),
    IndexingPolicy = new IndexingPolicy
    {
        VectorIndexes = new() { new VectorIndexPath { Path = "/contentVector", Type = VectorIndexType.DiskANN } }
    }
};
props.IndexingPolicy.IncludedPaths.Add(new IncludedPath { Path = "/*" });
props.IndexingPolicy.ExcludedPaths.Add(new ExcludedPath { Path = "/contentVector/*" });
Container container = await database.CreateContainerIfNotExistsAsync(props);

var q = new QueryDefinition(
    "SELECT TOP 5 c.id, c.name, VectorDistance(c.contentVector, @v) AS score " +
    "FROM c ORDER BY VectorDistance(c.contentVector, @v)").WithParameter("@v", queryVector);
```

Python (`azure-cosmos`):

```text
container = db.create_container_if_not_exists(
    id="products", partition_key=PartitionKey(path="/categoryId"),
    indexing_policy=indexing_policy, vector_embedding_policy=vector_embedding_policy)

items = container.query_items(
    query="SELECT TOP 5 c.id, c.name, VectorDistance(c.contentVector, @v) AS score "
          "FROM c WHERE c.categoryId = @cat ORDER BY VectorDistance(c.contentVector, @v)",
    parameters=[{"name": "@v", "value": query_vector}, {"name": "@cat", "value": "tents"}],
    partition_key="tents")
```

Vector search combines with any `WHERE` filter (price, date, tenant). Project the score and the fields you need, not the embedding itself.

> **Exam trap.** A multidimensional array passed to `VectorDistance` returns no score and no error: the query silently returns nothing useful. The query vector must be a flat array with the policy's dimensions.

<!-- section: hybrid-search | objectives: 3.1.5 -->
## Hybrid search

Hybrid search fuses a vector ranking and a BM25 ranking with **Reciprocal Rank Fusion** (`RRF`). Prerequisites: vector search and full-text search enabled, and a container with a vector policy, a full-text policy, a vector index and a full-text index.

```text
SELECT TOP 10 c.id, c.name
FROM c
WHERE c.categoryId = @cat
ORDER BY RANK RRF(VectorDistance(c.contentVector, @v),
                  FullTextScore(c.description, "waterproof", "jacket"),
                  [2, 1])
```

| Element | Rule |
| --- | --- |
| `RRF(f1, f2, ...)` | Two or more scoring functions: `VectorDistance` and `FullTextScore`, two `FullTextScore` or two `VectorDistance` |
| Weights | Optional array as the **last** argument, one weight per function; `[2, 1]` makes the first ranking twice as important |
| Clause | Only in `ORDER BY RANK`; can't be mixed with `ORDER BY` on other properties; can't be projected |
| Index | A full-text index is required |

| Requirement | Query |
| --- | --- |
| Exact product codes, error messages, names | Full-text (`FullTextContains`, `FullTextScore`) |
| Meaning, paraphrases, other languages | Vector (`VectorDistance`) |
| Both kinds of user questions in one search box | Hybrid (`RRF`) |
| Rank the final candidates by deep relevance | Semantic Reranker after retrieval |

**Semantic Reranker** (preview) reorders up to 50 candidate documents per call with Microsoft's semantic ranking model and returns a 0 to 1 relevance score (.NET: `container.SemanticRerankAsync(context, documents, options)`). It requires enabling the feature and the **Semantic Reranker User** role for the calling identity; it adds latency and is billed per call.

<!-- section: retrieval-performance | objectives: 3.1.6 -->
## Optimizing full-text and vector performance

| Lever | Effect |
| --- | --- |
| Exclude the vector path from the range index (`/contentVector/*` in `excludedPaths`) | Lower RU and latency on inserts; otherwise every float is also range-indexed |
| Index type matched to the number of vectors per physical partition | `quantizedFlat` up to about 50,000, `diskANN` above |
| Filter on the partition key, or on the `vectorIndexShardKey` | Searches one partition or one shard instead of all |
| `TOP N` with a small N; project only the needed fields | Fewer results read and returned |
| `searchListSizeMultiplier` (query, DiskANN) | Higher = better recall, more latency and RU |
| `quantizedVectorListMultiplier` (query) | Higher = more quantized candidates rechecked: better recall, more latency and RU |
| `filterPriority` (query) | Weight of the `WHERE` filter against the DiskANN search |
| `quantizationByteSize` (index, `quantizedFlat` and `diskANN`; 1 to 512, dynamic default) | Larger = better accuracy, more RU and latency |
| `indexingSearchListSize` (index, `diskANN`; 10 to 500, default 100) | Larger = better accuracy, longer index builds and higher ingestion latency |
| `float16` or `int8` data type | Smaller vectors, possibly lower accuracy |
| Full-text index on every searched text path | Full-text functions use the index instead of loading items |

```text
SELECT TOP 10 c.id, c.title
FROM c
WHERE c.publishedAt >= @since
ORDER BY VectorDistance(c.contentVector, @v, false,
         {"searchListSizeMultiplier": 10, "filterPriority": 0.5})
```

DiskANN results are approximate and can differ slightly between runs. Test recall with real embeddings (random vectors are a poor test), and throttle bulk ingestion: loading more than 5 million vectors in a short period can need extra index build time.

> **Exam trap.** Raising `searchListSizeMultiplier` or `quantizationByteSize` improves recall but raises RU and latency. When the requirement is "lowest RU", lower them, filter on the shard key, or reduce `TOP N`; when it is "better recall at the same index", raise the query-time multiplier rather than rebuilding the index.

<!-- section: rag | objectives: 3.1.7 -->
## Retrieval-Augmented Generation (RAG)

RAG grounds a large language model in your data: retrieve the most relevant items, add them to the prompt, and let the model answer from them. Azure Cosmos DB keeps operational data and vectors together, so there is no separate index to synchronize.

| Step | Implementation with Azure Cosmos DB |
| --- | --- |
| Ingest | Split long documents into chunks, one item per chunk with its source, page and tenant |
| Embed | Generate each chunk's embedding with a Microsoft Foundry (Azure OpenAI) embedding model; store it in the vector path |
| Keep fresh | Use the change feed to re-embed items when their text changes |
| Retrieve | Embed the question with the same model; vector or hybrid query with `TOP N`, filtered on the tenant or partition key |
| Rerank (optional) | Semantic Reranker on the candidates |
| Augment and generate | Put the retrieved chunks (text, not vectors) in the prompt with their sources; call the chat model |
| Cache (optional) | Semantic cache: store question embeddings and answers, reuse an answer when a new question is similar enough |

Design points:

- **Chunk size** trades precision (small chunks) against context (large chunks); one chunk per item keeps items small and lets each chunk carry its own embedding and filters.
- **Same model, same dimensions** at ingestion and query time; the policy's `dimensions` must equal the model's output (for example, 1,536 for text-embedding-3-small, 3,072 for text-embedding-3-large).
- **Security trimming**: filter retrieval on the tenant or user (partition key, `vectorIndexShardKey`), never rely on the prompt to hide data.
- **Semantic cache**: the similarity threshold is a trade-off (too high: repeated misses fill the cache; too low: wrong answers). Include the conversation context in the cache key, not just the last question, and expire entries with TTL.

> **Exam tip.** "Answers must reflect data updated seconds ago" favors RAG on the operational container (with the change feed re-embedding changed items) over a model fine-tuned on an export.

<!-- section: key-points -->
## Key points

- Full-text: full-text policy + `fullTextIndexes`; `FullTextContains`/`All`/`Any` in `WHERE`, `FullTextScore` only in `ORDER BY RANK`; fuzzy distance up to 2.
- Vector: enable `EnableNoSQLVectorSearch`; embedding policy (path, `dataType`, `dimensions`, `distanceFunction`); `flat` up to 505 dimensions, `quantizedFlat` and `diskANN` up to 4,096; at least 1,000 vectors; no shared throughput.
- `diskANN` beyond about 50,000 vectors per physical partition; `vectorIndexShardKey` builds one DiskANN index per property value.
- Always `TOP N` with `ORDER BY VectorDistance`; exclude the vector path from the range index.
- Hybrid: `ORDER BY RANK RRF(...)`, optional weights array last.
- Recall vs cost: `searchListSizeMultiplier`, `quantizedVectorListMultiplier`, `quantizationByteSize`, `indexingSearchListSize`.
- RAG: chunk, embed with one model, retrieve filtered by tenant, ground the prompt; semantic cache with TTL.
