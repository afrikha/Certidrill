AI agents are stateless between model calls: whatever they must remember (the current conversation, past decisions, user preferences) lives in a store the application reads and writes. Azure Cosmos DB for NoSQL serves as that durable memory, with point reads and partition-scoped queries for recent turns, TTL for expiry, the change feed for background processing, and vector, full-text and hybrid search for recall by meaning. Exam questions ask for the data model, the partition key, the retention mechanism or the query that fits a memory access pattern.

<!-- section: memory-design | objectives: 3.2.1 -->
## Designing durable memory stores

| Memory | Content | Lifetime | Typical access |
| --- | --- | --- | --- |
| Short-term (working, episodic) | The last turns of the active thread: prompts, replies, tool results, task state | Hours to days; expires, is summarized or promoted | Latest N turns of one thread, in order |
| Episodic records | One record per past interaction (date, summary, decisions, follow-ups) | Weeks to years, per retention policy | Exact match, time range, audit |
| Long-term (semantic) | Facts, preferences and summaries derived across threads | Months to years | Similarity search for one user or tenant |

The Agent Memory Toolkit for Azure Cosmos DB (preview, Python SDK) names four item types that follow this split: `turn` (raw user, agent, tool or system messages), `summary` (one thread condensed: topic, decisions, open issues), `fact` (one discrete assertion, searchable across threads) and `user_summary` (a cross-thread profile of one user). Its operations add memories (to local in-memory storage for development, or directly to Azure Cosmos DB), retrieve them by user, thread or recency, search them by vector or hybrid ranking, generate summaries, extract facts and reconcile them. Local storage suits demos and tests; Azure Cosmos DB is needed for persistence, shared access, semantic search and the background pipeline.

Data model: choose the unit of storage.

| Model | Strengths | Weaknesses | Verdict |
| --- | --- | --- | --- |
| One item per turn (user message plus agent reply, or agent plus tool) | Small items, cheap writes, latest-N queries, one embedding per turn, TTL per turn | Summaries are separate items; old turns need pruning or compaction | Recommended default |
| One item per message | Finest granularity, simple updates and TTL | An embedding covers only one side of an exchange; weak for semantic caching | Acceptable |
| One item per thread (messages in an array) | One read returns the whole history | Unbounded growth toward the 2 MB item limit, every append rewrites the item, coarse vector search, TTL only per thread | Avoid |

Partition key: match the dominant query.

| Partition key | Good for | Trade-off |
| --- | --- | --- |
| GUID per item | Write-heavy logging and analytics | Every thread query fans out to all partitions |
| `/threadId` | Conversational agents and RAG: latest-N and in-thread vector search stay in one partition | Needs many threads to spread the load |
| Hierarchical `["/tenantId", "/threadId"]` | Multitenant apps with many concurrent threads per customer: thread locality plus tenant-scoped queries | First level with few values concentrates writes |
| `/userId` (or `["/tenantId", "/userId"]`) | Long-term memory recalled per user across threads; isolation per user | Thread replay needs a filter on the thread |

Because short-term and long-term memory are read differently (by thread versus by user), a common design uses two containers: `turns` partitioned by tenant then thread, and `memories` partitioned by tenant then user.

Indexing: `quantizedFlat` for tens of thousands of memory vectors, `diskANN` for hundreds of thousands to billions, with `vectorIndexShardKey` set to the partition key or its first level for multitenant isolation; a full-text index on the content for lexical recall ("refund policy", an order number). The embedding path must be declared in the container's vector policy. Vector search on a container with a hierarchical partition key, such as `["/tenantId", "/threadId"]`, needs the account to be configured by the Azure Cosmos DB team first (contact on the vector search page).

Retention and privacy:

- Short-term turns expire with **TTL**; long-term items usually don't.
- Old episodic records can be summarized into semantic memories and the detail archived to cheaper storage.
- Scope every read to the identity from the authenticated session (tenant, user or patient ID in the partition key), so that no query can cross users without explicit authorization.
- Prefer per-user memory to shared memory; aggregate across users only with de-identified data.

> **Exam trap.** "Store the conversation as an array in one thread document" looks simple but fails at scale: the item grows without bound, each new message rewrites it (RU grows with size) and it hits the 2 MB item limit. Store one item per turn.

<!-- section: conversation-state | objectives: 3.2.2 -->
## Implementing conversation state

A turn item in a container partitioned on `["/tenantId", "/threadId"]`:

```json
{
  "id": "thread-1234-0007",
  "tenantId": "contoso",
  "threadId": "thread-1234",
  "userId": "user-12345",
  "type": "turn",
  "turnIndex": 7,
  "messages": [
    { "role": "user", "content": "What's our refund policy for accessories?", "timestamp": "2026-11-17T10:14:25Z" },
    { "role": "agent", "name": "kb.search", "content": "Accessories can be returned within 30 days.", "timestamp": "2026-11-17T10:14:26Z" }
  ],
  "embedding": [0.013, -0.092, 0.551],
  "ttl": 2592000
}
```

Load the context window: the latest turns of one thread, a single-partition query.

```text
SELECT TOP @k c.turnIndex, c.messages
FROM c
WHERE c.tenantId = @tenantId AND c.threadId = @threadId AND c.type = "turn"
ORDER BY c.turnIndex DESC
```

Python, appending a turn and reading the context:

```text
turns = db.get_container_client("turns")
turns.create_item(turn)                       # one small write per turn

recent = list(turns.query_items(
    query="SELECT TOP @k c.turnIndex, c.messages FROM c "
          "WHERE c.threadId = @th AND c.type = 'turn' ORDER BY c.turnIndex DESC",
    parameters=[{"name": "@k", "value": 10}, {"name": "@th", "value": "thread-1234"}],
    partition_key=["contoso", "thread-1234"]))
recent.reverse()                              # chronological order for the prompt
```

Expiry with **TTL**:

| Container `defaultTtl` | Item `ttl` | Result |
| --- | --- | --- |
| Not set | Any | Nothing expires; item `ttl` is ignored |
| `-1` | Not set | The item never expires |
| `-1` | `2592000` | The item expires 30 days after its last write |
| `86400` | Not set | The item expires one day after its last write |
| `86400` | `-1` | The item never expires |

Expiry counts from the item's last modification (`_ts`); expired items disappear from reads at once and are deleted in the background with leftover RU/s.

Keep the thread compact: every N turns, generate a **summary item** (`type: "summary"`) for the thread and load it with the latest turns instead of the full history. When several agents or instances update the same summary or task-state item, replace it with the ETag as `IfMatchEtag` (optimistic concurrency) and retry on 412; use a patch operation to increment counters without reading the item.

> **Exam tip.** Recent turns are read by recency, not by meaning: `TOP N ... ORDER BY turnIndex DESC` inside the thread's partition is cheaper and more correct than a vector search. Use vector or hybrid search on turns only to find an older, relevant exchange in a long thread.

<!-- section: semantic-memory | objectives: 3.2.3 -->
## Implementing semantic memory

Semantic memory stores generalized knowledge as items with a text and an embedding, retrieved by similarity across all of a user's threads:

```json
{
  "id": "fact-7f3c",
  "tenantId": "contoso",
  "userId": "user-12345",
  "type": "fact",
  "text": "Prefers delivery to the Lyon office, not home.",
  "embedding": [0.021, 0.117, -0.044],
  "sourceThreadId": "thread-1234",
  "createdAt": "2026-11-17T10:20:00Z",
  "isSuperseded": false
}
```

The pipeline:

| Step | How |
| --- | --- |
| Detect new turns | Change feed on the `turns` container (in production, a sibling Azure Durable Functions app processes it in the background) |
| Extract | A chat model (Microsoft Foundry) turns new turns into thread summaries, discrete facts and an updated user summary |
| Embed | An embedding model vectorizes each fact or summary |
| Reconcile | Detect duplicate or contradictory facts; mark the superseded one (soft delete) rather than deleting it, to keep an audit trail |
| Store | Upsert into the `memories` container, partitioned by tenant then user |

Recall the memories relevant to the new question, inside the user's partition:

```text
SELECT TOP 5 c.text, VectorDistance(c.embedding, @q) AS score
FROM c
WHERE c.tenantId = @tenantId AND c.userId = @userId
  AND c.type = "fact" AND c.isSuperseded = false
ORDER BY VectorDistance(c.embedding, @q)
```

When exact words matter as much as meaning (product names, ticket numbers), use hybrid ranking on the same filter:

```text
SELECT TOP 5 c.text
FROM c
WHERE c.tenantId = @tenantId AND c.userId = @userId AND c.type = "fact"
ORDER BY RANK RRF(VectorDistance(c.embedding, @q), FullTextScore(c.text, @keyword))
```

The agent then builds its prompt from: the user summary (point read), the relevant facts (vector or hybrid query), the thread summary and the latest turns.

| Requirement | Design |
| --- | --- |
| Remember a preference stated weeks ago in another thread | `fact` item per user, vector search filtered on the user |
| Answer "what did we decide last time?" | `summary` items of the user's previous threads, newest first |
| Avoid re-asking the model the same question | Semantic cache: question embedding plus answer, similarity threshold, TTL |
| A user asks to be forgotten | Delete the items of the user's partition in every memory container |
| Memory must not leak between tenants | Partition key and `vectorIndexShardKey` on the tenant, filter on it in every query |

A semantic cache is a related form of semantic memory: embed the question together with its conversation context, return a cached answer when the similarity passes the threshold, and keep popular entries alive by patching a hit counter and extending their `ttl`.

> **Exam trap.** A vector query across all users ("find similar memories") without a filter on the user or tenant both fans out to every partition and returns other people's memories. Semantic memory is always queried inside the owner's scope.

<!-- section: key-points -->
## Key points

- Short-term memory = latest turns of a thread; long-term (semantic) memory = facts and summaries across threads.
- One item per turn; avoid one ever-growing thread document (2 MB limit, rewrite cost).
- Partition turns by thread, or by tenant then thread; partition long-term memory by user, or tenant then user.
- TTL expires short-term memory: container `defaultTtl` must be set (`-1` or seconds) for item `ttl` to apply.
- Latest-N turns: `TOP N ... ORDER BY turnIndex DESC` in one partition; summaries keep the context window small.
- Semantic memory: change feed, extraction, embedding, reconciliation with soft delete; recall by vector or hybrid search filtered on the user.
