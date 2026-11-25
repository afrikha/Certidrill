Azure Managed Redis is the in-memory data store of an AI solution: it caches database results, model responses and sessions with an expiration, and its search module (RediSearch) indexes embeddings for vector similarity search. Exam questions show `redis-py` code to complete: the connection, a command with the right expiration, an invalidation after a write, a vector index schema or a KNN query.

<!-- section: connect | objectives: 2.3.1 -->
## Connecting from Python

Azure Managed Redis runs Redis Enterprise software (Redis 7.4) and is used with the standard `redis-py` client. Its tiers differ by the ratio of memory to vCPU:

| Tier | Memory:vCPU | Use |
| --- | --- | --- |
| Memory Optimized | 8:1 | Large datasets, moderate throughput, development and test |
| Balanced | 4:1 | Standard workloads |
| Compute Optimized | 2:1 | Highest throughput |
| Flash Optimized | RAM plus NVMe | Very large datasets at lower cost; no RediSearch, RedisBloom or RedisTimeSeries; sizes A2000 and A4500 in preview |

High availability (a replica on a second node, across zones where the region has them) is on by default; turn it off only for development and test, because a node failure then loses data. You can turn it on later on an instance created without it, but you can't turn it off on an existing instance. Microsoft Entra ID authentication, private endpoints and TLS are available on every tier.

```text
import redis
from redis_entraid.cred_provider import create_from_default_azure_credential

credential_provider = create_from_default_azure_credential(
    ("https://redis.azure.com/.default",),
)

r = redis.Redis(
    host="contoso-cache.westeurope.redis.azure.net",
    port=10000,
    ssl=True,
    decode_responses=True,               # str instead of bytes
    credential_provider=credential_provider,
)
```

| Setting | Rule |
| --- | --- |
| Port | **10000** for Azure Managed Redis; 6380 was the TLS port of Azure Cache for Redis |
| Authentication | Access key in `password` for basic setups; Microsoft Entra ID with the `redis-entraid` package and the scope `https://redis.azure.com/.default` for production |
| Client class | `redis.Redis` for the Enterprise and non-clustered policies (non-clustered only for caches of 25 GB or less); `redis.cluster.RedisCluster` for the OSS clustering policy |
| `decode_responses` | `True` for text values; `False` for binary values such as vector bytes, images or pickled objects |
| Connections | `redis-py` pools connections: create one client per process and reuse it |

> **Exam trap.** Code copied from an Azure Cache for Redis sample uses port 6380 and fails against Azure Managed Redis, which listens on 10000. Azure Cache for Redis is being retired; new solutions use Azure Managed Redis.

<!-- section: caching-expiration | objectives: 2.3.1 -->
## Caching with expiration

The **cache-aside** pattern (lazy loading) is the default for database results and expensive model calls: read the cache, on a miss read the source, then write the result to the cache **with a time to live (TTL)**.

```text
import json

def get_product_summary(product_id: str) -> dict:
    key = f"product:{product_id}:summary"
    cached = r.get(key)
    if cached:
        return json.loads(cached)                       # cache hit

    summary = summarize_with_model(load_product(product_id))   # cache miss
    r.set(key, json.dumps(summary), ex=900)             # 15-minute TTL
    return summary
```

| Command (`redis-py`) | Effect |
| --- | --- |
| `r.set(key, value, ex=300)` / `r.setex(key, 300, value)` | Write with a TTL in seconds |
| `r.set(key, value, px=5000)` / `r.psetex(key, 5000, value)` | Write with a TTL in milliseconds |
| `r.set(key, value, nx=True, ex=30)` | Write only if the key doesn't exist (a simple lock or first-writer-wins) |
| `r.expire(key, 3600)` / `r.pexpire` / `r.expireat(key, unix_time)` | Add or change the TTL of an existing key, whatever its data type |
| `r.ttl(key)` / `r.pttl(key)` | Remaining TTL; `-1` = no expiration, `-2` = the key doesn't exist |
| `r.persist(key)` | Remove the expiration |
| `r.hset(key, mapping={...})` / `r.hget` / `r.hgetall` | Store an object as a hash of fields |
| `r.mset({...})` / `r.mget(k1, k2)` | Several keys in one call |
| `r.pipeline()` ... `pipe.execute()` | Batch commands in one network round trip |

Choose the TTL from how often the data changes and how stale it may be: 1–5 minutes for frequently changing data, 15–60 minutes for a moderate rate, 1–24 hours for stable data, more for static reference data. Name keys hierarchically with colons (`user:1001:profile`) so that related keys share a prefix.

The same commands serve the other Learn patterns: a **session store** (session data under `session:<id>` with a sliding TTL renewed by `expire` on each request), a content cache for page fragments, and deduplication with the Bloom filters of RedisBloom. The number of client connections an instance accepts grows with its tier and size (15,000 for the smallest Balanced size), another reason to share one client per process.

> **Exam trap.** `r.set(key, value)` followed later by `r.expire(key, 60)` is two round trips and leaves the key without TTL if the process stops in between. Set the value and the TTL in one command: `ex=` or `setex`. And an update with plain `set` removes the existing TTL.

<!-- section: invalidation | objectives: 2.3.1 -->
## Invalidating and evicting

A TTL bounds staleness; **invalidation** removes an entry as soon as the source changes. In cache-aside, the code that writes to the database deletes the related keys, and the next read reloads them:

```text
def update_user_profile(user_id: int, profile: dict) -> None:
    save_to_database(user_id, profile)               # 1. update the system of record
    r.delete(f"user:{user_id}:profile",              # 2. invalidate related entries
             f"user:{user_id}:summary",
             f"dashboard:user:{user_id}")

def invalidate_user(user_id: int) -> int:
    deleted, cursor = 0, 0
    while True:                                      # SCAN is incremental, KEYS blocks the server
        cursor, keys = r.scan(cursor, match=f"user:{user_id}:*", count=100)
        if keys:
            deleted += r.delete(*keys)
        if cursor == 0:
            return deleted
```

| Requirement | Technique |
| --- | --- |
| Data may be a few minutes old | TTL only |
| Readers must see a change immediately | Delete the keys after the database write (keep a TTL as a safety net) |
| Remove every key of a user or a tenant | `SCAN` with `match=` and delete in batches; never `KEYS` in production |
| Memory is full | The eviction policy removes keys: `volatile-*` policies choose among keys that have a TTL, `allkeys-*` among all keys, `noeviction` rejects writes |
| Survive a restart faster | Data persistence (snapshots to disk); it isn't a backup and the cache isn't the system of record |

For AI workloads, the same pattern caches embeddings of frequent texts and completions of repeated prompts. A **semantic cache** goes further: it stores each prompt's embedding with the response and returns a cached answer when a new prompt is close enough, found with the vector search below.

> **Exam trap.** Deleting the cache entry **before** updating the database lets a concurrent reader reload the old value into the cache. Update the source first, then invalidate.

<!-- section: vector-index | objectives: 2.3.2 -->
## Creating a vector index

Vector search comes from the **RediSearch** module. With Redis 7.4, modules can only be added **when the instance is created** (Advanced tab) and can't be loaded later (Redis 8.2, in preview, includes all modules on the in-memory tiers). RediSearch requires:

- an in-memory tier (not Flash Optimized);
- the **Enterprise** or **non-clustered** clustering policy, not OSS.

With active geo-replication, only RediSearch and RedisJSON can be used.

An index covers every key whose name starts with a **prefix**; keys written with that prefix are indexed automatically in the background.

```text
from redis.commands.search.field import NumericField, TagField, TextField, VectorField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType

schema = (
    TextField("content"),
    TagField("category"),                  # exact-match filter: @category:{manuals}
    NumericField("year"),                  # range filter: @year:[2024 +inf]
    VectorField(
        "embedding",
        "HNSW",                            # or "FLAT"
        {"TYPE": "FLOAT32", "DIM": 1536, "DISTANCE_METRIC": "COSINE"},
    ),
)

r.ft("idx:docs").create_index(
    fields=schema,
    definition=IndexDefinition(prefix=["doc:"], index_type=IndexType.HASH),
)
```

| Choice | Options |
| --- | --- |
| Algorithm | `FLAT`: brute force, exact, for fewer than about 10,000 vectors; `HNSW`: graph, approximate (95–99% accuracy), fast on large datasets |
| `TYPE` | `FLOAT32` (4 bytes per dimension, the standard); `FLOAT64` doubles memory for no benefit in AI search |
| `DIM` | Exactly the model's output (1536 for `text-embedding-3-small`); other sizes are rejected |
| `DISTANCE_METRIC` | `COSINE` for text embeddings, `L2` for image and spatial embeddings, `IP` only for normalized vectors |

Vectors are stored as **bytes** in a hash, or as an array of numbers in a JSON document:

| | Hash (`IndexType.HASH`) | JSON (`IndexType.JSON`, RedisJSON) |
| --- | --- | --- |
| Vector format | `np.array(v, dtype=np.float32).tobytes()` | `v.tolist()` |
| Schema field names | `"embedding"` | JSONPath with alias: `VectorField("$.embedding", ..., as_name="embedding")` |
| Memory and speed | Lower memory, faster | JSON overhead |
| Data model | Flat fields | Nested objects, several vectors per item |

```text
import numpy as np

pipe = r.pipeline()
for doc in docs:
    pipe.hset(f"doc:{doc['id']}", mapping={
        "content": doc["content"],
        "category": doc["category"],
        "year": doc["year"],
        "embedding": np.array(doc["embedding"], dtype=np.float32).tobytes(),
    })
pipe.execute()
```

> **Exam trap.** The vector must be `float32` bytes when `TYPE` is `FLOAT32`: a Python list, a JSON string or `float64` bytes in a hash field isn't a valid vector. Use a client with `decode_responses=False` to read the bytes back.

<!-- section: vector-query | objectives: 2.3.2 -->
## Querying by similarity

```text
from redis.commands.search.query import Query

query_vec = np.array(embed(question), dtype=np.float32).tobytes()

q = (
    Query("(@category:{manuals} @year:[2024 +inf])=>[KNN 5 @embedding $vec AS score]")
    .return_fields("content", "category", "score")
    .sort_by("score")
    .dialect(2)
)
results = r.ft("idx:docs").search(q, query_params={"vec": query_vec})
```

| Part | Meaning |
| --- | --- |
| `*` or a filter before `=>` | Documents to consider: all, or those matching tag, numeric or text filters (hybrid query) |
| `KNN 5 @embedding $vec` | The 5 nearest neighbors in the vector field, query vector passed as a parameter |
| `AS score` | Returns the distance: with `COSINE`, 0 is identical and 2 opposite, so **lower is better** and you sort ascending |
| `EF_RUNTIME 100` (inside the brackets) | HNSW search breadth: higher is more accurate and slower; start around 50 and raise to 100–200 if recall is low |
| `.dialect(2)` | Required for vector queries |
| `@embedding:[VECTOR_RANGE 0.2 $vec]=>{$YIELD_DISTANCE_AS: score}` | Every document within a distance threshold, instead of a fixed k (semantic cache lookup) |

In a RAG application, the retrieval step embeds the question with the same model as the stored documents, runs the KNN query with the filters the caller is entitled to (tenant, category, date), and sends the returned `content` fields to the chat model. For a semantic cache, run a `VECTOR_RANGE` query on the prompt index first and call the model only when nothing is within the threshold.

> **Exam tip.** Similar-looking answers often differ by one element: a missing `.dialect(2)`, `sort_by("score", asc=False)` with a distance, a `TextField` used with the `{...}` tag syntax, or a query vector of another dimension or type than the index.

<!-- section: key-points -->
## Key points

- Azure Managed Redis listens on port 10000 with TLS; Microsoft Entra ID through `redis-entraid` and the scope `https://redis.azure.com/.default`; `RedisCluster` only for the OSS clustering policy.
- Cache-aside: get, on a miss load and `set(..., ex=ttl)` in one command; TTL from the freshness requirement.
- `ttl` returns -1 (no expiration) or -2 (no key); a plain `set` clears the TTL.
- Invalidate after the database write with `delete`; `SCAN`, never `KEYS`, for patterns; eviction policies apply when memory is full.
- RediSearch is chosen at creation (Redis 7.4), needs an in-memory tier and the Enterprise or non-clustered policy.
- `VectorField` with `FLAT` or `HNSW`, `FLOAT32`, `DIM` = model output, `COSINE` for text; vectors as `float32` bytes in hashes.
- `KNN k @field $param AS score`, filters before `=>`, `dialect(2)`, sort by ascending distance; `EF_RUNTIME` trades accuracy for latency.
