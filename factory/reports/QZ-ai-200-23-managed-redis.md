# QZ-ai-200-23-managed-redis — notes

Quiz `content/ai-200/quizzes/23-managed-redis.yaml`: 10 questions (2.3.1 × 5, 2.3.2 × 5). Types: single 6, yesno_statements 1, dropdown 1, multi 1, ordering 1. Checker: `0 problem(s), 0 warning(s)`.

## Sources fetched (2026-11-24)

About vector embeddings and vector search in Azure Managed Redis; Quickstart: Create a Python app with Azure Managed Redis; Azure Managed Redis Architecture; Best practices for memory management; Using Redis modules; Best practices for development; Cache-Aside Pattern; training units "Explore Azure Managed Redis", "Client libraries and development best practices", "Implement data operations", "Index and query vector data", "Choose vector types and indexing strategies", "Optimize Redis data structures for vector storage".

## Chapter vs current Learn (to fix in the chapter, not done here)

- **RediSearch and clustering policy: Learn contradicts itself.** "Azure Managed Redis Architecture" says the Enterprise policy is "the only one that you can use with the RediSearch module". "Using Redis modules" and the vector search page say Enterprise **or** Non-clustered. The chapter follows the second version. No quiz question depends on Non-clustered + RediSearch.
- **Redis 8.2 (preview)**: "Using Redis modules" now says that Redis 8.2 (preview) includes every module automatically. The "choose at creation, can't add later" rule applies to Redis 7.4. The chapter says "Redis 7.4", which is correct for GA, but it could add that the creation-time rule is a 7.4 rule. Redis 8.2 is in preview, so the quiz doesn't test it.
- **High availability**: the architecture page says you can't turn HA off on an existing instance, but you can turn it on later. The chapter only says "turn it off only for development".
- **Non-clustered policy**: available only for caches of 25 GB or less (architecture page). The chapter doesn't mention this limit.
- **Flash Optimized**: the training unit "Explore Azure Managed Redis" calls it "(preview)". The architecture page says that only A2000 and A4500 are in preview. The chapter doesn't mention preview at all. The quiz uses Flash Optimized only as a distractor, and no question uses it now.
- **TagField**: the training unit "Optimize Redis data structures" uses `TextField("category")`. The "Index and query" unit queries `@category:{documentation}` (tag syntax) but never shows the schema. The chapter uses `TagField` with the tag syntax, which is what Redis requires. Learn has no page that shows `TagField`. Q8 says in the stem that `tenant` is a tag field.
- The training unit "Client libraries" speaks of two clustering policies (Enterprise and OSS) and leaves out Non-clustered. The architecture page lists three.
- Not verified, because I didn't fetch the page: "15,000 connections for the smallest Balanced size" in the chapter.

## Facts not verified on a fetched Learn page (standard Redis or redis-py behavior)

- Q3: the class name `redis.cluster.RedisCluster`. Learn only says that the OSS policy needs a cluster-aware client, that the first connection uses port 10000, and that 85xx ports must not be hardcoded.
- Q5: `EXPIRE` replaces an existing TTL. Learn says EXPIRE "applies expiration to keys that already exist" but doesn't say that it overwrites. `PEXPIRE` takes milliseconds: Learn implies this (`pexpire(..., 3600000)` next to `expire(..., 3600)`) but doesn't state it.
- Q7: `SETNX` doesn't overwrite. `LPUSH` creates a list. `EXPIREAT` with a past timestamp deletes the key at once. `EXPIREAT 86400` is a 1970 date.
- Q8/Q10: `KNN 1` returns the nearest vector whatever its distance. A hybrid prefilter returns K results when at least K documents match. Learn says only that the filter narrows the set "then find the K nearest neighbors only within that filtered set".
- Q9: you can't change `DIM` on an existing index. Learn says to "delete the old index and create a new one" to change the structure, and Redis `FT.ALTER` can only add fields. Vectors from two models can't be compared: the chapter says this (use the same model), and the Learn units only imply it.
- Q6: with `volatile-lru` and no key that has a TTL, nothing is evicted (Learn: "the system doesn't evict any keys"). The stem doesn't claim that writes fail.

## Design notes

- None of the mock-exam decisions is reused. Those decisions are: port 10000, `set ex`, `keepttl`, `nx` lock, sliding session, `ttl -1`, KEYS/SCAN, delete order, `mget`/pipeline, `allkeys-lru` (cs1a), module at creation, tier/policy/module, schema and dims, metric dragdrop, filter syntax, EF_RUNTIME, VECTOR_RANGE threshold, bytes vs list, JSON index paths. Q6 is the opposite of cs1a: here the flags must never be evicted, so the answer is TTL + the default `volatile-lru`, not `allkeys-lru`.
- Q2 avoids FLOAT16/BFLOAT16 options: recent RediSearch versions support them, and the chapter and Learn don't say whether Azure Managed Redis 7.4 does.
- Q9 doesn't name the new model (for example text-embedding-3-large), so that no model dimension has to be verified. Option c (truncating) is wrong because the models differ. It's not a matter of length.
