Azure Database for PostgreSQL flexible server stores an AI application's relational data and its embeddings side by side: the `vector` extension (pgvector) adds vector types, distance operators and approximate indexes, `pg_diskann` adds an Azure-only index, and `azure_ai` calls Azure OpenAI from SQL. Exam questions show Python code to complete, a table or index definition to choose, a parameter to tune for recall or latency, or a connection setting to fix.

<!-- section: connect-query | objectives: 2.2.1 -->
## Connecting and querying from Python

The Learn samples use **psycopg 3** (`pip install "psycopg[binary]"`, `import psycopg`) and `azure-identity` for passwordless sign-in. The server name has the form `<server>.postgres.database.azure.com`, PostgreSQL listens on port **5432**, and TLS is required (`sslmode=require`).

With Microsoft Entra authentication, the access token **is the password**. Request it for the scope of the open-source databases:

```text
import psycopg
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()          # create once, reuse: tokens are cached
token = credential.get_token("https://ossrdbms-aad.database.windows.net/.default").token

conninfo = (
    "host=contoso-rag.postgres.database.azure.com port=5432 dbname=kb "
    f"user=rag-api password={token} sslmode=require"
)

with psycopg.connect(conninfo) as conn:
    rows = conn.execute(
        "SELECT id, title FROM documents WHERE category = %s LIMIT %s",
        ("contracts", 10),
    ).fetchall()
```

| Element | Rule |
| --- | --- |
| Scope | `https://ossrdbms-aad.database.windows.net/.default`, the same for every server |
| Token lifetime | Limited (24 hours by default in the sample): refresh it before opening new connections |
| Parameters | `%s` placeholders and a tuple: never build SQL with f-strings (SQL injection) |
| Transactions | psycopg opens a transaction on the first statement; `with psycopg.connect(...)` commits on success and rolls back on an exception |
| Extensions | Creating one needs the server administrator or a member of `azure_pg_admin` |

> **Exam trap.** The token goes in the `password` field. A connection string with `Authentication=ActiveDirectory...` is SQL Server syntax, not PostgreSQL.

<!-- section: schema-design | objectives: 2.2.2 -->
## Designing tables and choosing data types

The `vector` extension is allowed at the server level (server parameter `azure.extensions`, check with `SHOW azure.extensions;`), then created in **each database**: `CREATE EXTENSION vector;`. The extension is called `vector`, not `pgvector`.

| Type | Storage | Use |
| --- | --- | --- |
| `vector(n)` | 4 bytes per dimension (about 6 KB for 1,536) | Default for embeddings; `n` must match the model's output |
| `halfvec(n)` | 2 bytes per dimension | Halves storage, after a benchmark shows acceptable quality |
| `sparsevec(n)` | Nonzero values and their positions | Sparse vectors; HNSW indexes up to 1,000 nonzero elements |
| Structured columns (`integer`, `numeric`, `boolean`, `timestamptz`, `text`) | Native | Attributes you filter or sort on: B-tree indexes, type checks, accurate planner statistics |
| `jsonb` | Binary JSON | Dynamic attributes; GIN index for containment, weaker for ranges and statistics |

A column declared `vector` without a dimension can't be indexed (`column does not have dimensions`), and an insert with another dimension fails. One table can hold several vector columns (title and image embeddings), each with its own index; no index covers two vector columns. For RAG, documents are split into chunks: a parent table for the source and a child table with one row per chunk.

```text
CREATE TABLE source_documents (
    id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title       text NOT NULL,
    source_url  text,
    tenant_id   integer NOT NULL,
    ingested_at timestamptz DEFAULT now()
);

CREATE TABLE document_chunks (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id integer NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
    chunk_index integer NOT NULL,
    content     text NOT NULL,
    token_count integer,
    attributes  jsonb DEFAULT '{}',
    embedding   vector(1536),
    UNIQUE (document_id, chunk_index)
);
```

Indexes for the metadata:

| Need | Index |
| --- | --- |
| Equality or range on columns | B-tree; a composite `(category_id, price)` serves filters on `category_id` and on both, not on `price` alone (leftmost rule) |
| `jsonb` containment and key tests (`@>`, `?`, `?|`, `?&`) | `USING gin (attributes)` |
| Range on a `jsonb` field | Expression index `((attributes->>'price')::numeric)` |
| Queries that always carry the same predicate | Partial index `... WHERE in_stock = true` |
| Tens of millions of rows, filter on a date or a tenant, old data to drop | Partitioning by range, list or hash; an index created on the parent is created on every partition |

> **Exam trap.** A partial index is used only when the query's `WHERE` matches its predicate in the same form: an index defined `WHERE tier = 'premium'` isn't used by `WHERE tier LIKE 'premium'`.

<!-- section: vector-indexes | objectives: 2.2.3 -->
## Indexing vectors for latency and compute

Without an index, pgvector runs an **exact** search: perfect recall, a sequential scan whose cost grows with the table. An approximate nearest neighbor (ANN) index trades a little recall for speed; Learn considers it essential above a million rows and of limited use under about 10,000.

| Index | Build | Strengths | Parameters (default) |
| --- | --- | --- | --- |
| IVFFlat | k-means training on existing rows: load the data first | Fast build, low memory; lower recall ceiling, may need a rebuild when the data drifts | `lists` at build; `ivfflat.probes` at query (1) |
| HNSW | Multilayer graph, no training: can be created on an empty table | Best speed-recall trade-off; more memory (about 50% of the vector data) and slower build | `m` (16), `ef_construction` (64); `hnsw.ef_search` at query (40) |
| DiskANN (`pg_diskann`, Azure only) | Graph, no training | High recall with fast builds, scales to very large tables; product quantization (preview) reduces memory | `max_neighbors` (32), `l_value_ib` (100); `diskann.l_value_is` at query (100) |

The **operator class must match the query operator**, or the planner ignores the index:

| Distance | Operator | Operator class |
| --- | --- | --- |
| Cosine | `<=>` | `vector_cosine_ops` |
| Euclidean (L2) | `<->` | `vector_l2_ops` |
| Negative inner product | `<#>` | `vector_ip_ops` |

All three return a **distance**: smaller means more similar. For vectors normalized to length 1, such as OpenAI embeddings, inner product gives the same ranking as cosine and is the fastest.

```text
CREATE INDEX CONCURRENTLY idx_chunks_embedding
ON document_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

BEGIN;
SET LOCAL hnsw.ef_search = 100;      -- higher recall for this transaction only
SELECT id, content FROM document_chunks
ORDER BY embedding <=> %s::vector
LIMIT 10;
COMMIT;
```

Tuning rules:

- IVFFlat: start with `lists` = rows / 1000 up to a million rows, `sqrt(rows)` above; `probes` = `lists` / 10, or `sqrt(lists)` for large tables. Probing every list is a brute-force search.
- HNSW: `ef_construction` at least `2 * m`; raise `m` (32) for recall at the cost of memory and build time; changing `m` or `ef_construction` requires a rebuild; keep `hnsw.ef_search` at least equal to `LIMIT`, 100–200 for high accuracy; lower it for latency-critical calls, but not below `LIMIT`.
- `CREATE INDEX` blocks writes; `CREATE INDEX CONCURRENTLY` doesn't, but takes longer. Follow a build with `pg_stat_progress_create_index`; rebuild with `REINDEX INDEX CONCURRENTLY` when recall degrades.
- pgvector indexes `vector` columns of at most **2,000 dimensions**; above, reduce the dimensions (many workloads use 768 or 1,024) or use DiskANN with product quantization (`product_quantized = true`, preview, pg_diskann 0.6 or later), which indexes up to 16,000 dimensions.
- Check the plan with `EXPLAIN (ANALYZE, BUFFERS)`: index scan, parallel workers, partial index and partition pruning. `idx_scan` in `pg_stat_user_indexes` shows whether an index is used at all.

> **Exam trap.** An index built with `vector_cosine_ops` doesn't serve `ORDER BY embedding <-> ...`. The query falls back to a sequential scan, with correct but slow results.

<!-- section: resources | objectives: 2.2.4 -->
## Sizing compute, memory and storage for vectors

| Tier | Memory per vCore | Vector workloads |
| --- | --- | --- |
| Burstable (B-series) | 2 to 4 GiB | Development and tests only: CPU credits run out under sustained load, no built-in PgBouncer |
| General Purpose (D-series) | 4 GiB | Fewer than about a million vectors, 4 to 8 vCores |
| Memory Optimized (E-series) | 6.75 to 9.5 GiB | Millions of vectors: memory should exceed the vector index size by at least 50% |

Vector searches are fast when the index stays in memory. Estimate it: 1,536 dimensions take about 6 KB per row, so a million rows need about 6 GB for the column and an HNSW index adds roughly half. Scale up (more vCores and memory) for latency and memory pressure; scale out with **read replicas** (up to five, asynchronous) for read-heavy traffic that tolerates staleness, keeping read-after-write queries on the primary. vCores can be changed after creation and storage increased (32 GiB to 64 TiB).

| Parameter | Guidance |
| --- | --- |
| `shared_buffers` | Set by tier (about 25% of memory); a cache hit ratio below 99% suggests more memory |
| `work_mem` | Per operation and per connection: raise it per transaction (`SET LOCAL work_mem = '256MB'`), not globally |
| `maintenance_work_mem` | Memory of an index build: raise it (and the compute) during the build, then scale back |
| `max_parallel_maintenance_workers`, table `parallel_workers` | Parallel index builds; `max_worker_processes` requires a restart |
| `max_parallel_workers_per_gather` | Parallel exact searches without an index |
| `random_page_cost` | 1.1–1.5 on SSD storage instead of 4.0 |

```bash
az postgres flexible-server parameter set \
  --resource-group rg-rag --server-name contoso-rag \
  --name azure.extensions --value "vector,azure_ai,pg_diskann"
```

Watch CPU percent, Memory percent, Storage IO percent and Active connections in Azure Monitor; high Storage IO usually means the working set doesn't fit in memory.

> **Exam tip.** "Lowest cost for a proof of concept" is Burstable. "Millions of embeddings, index must stay in memory" is Memory Optimized. "Connection pooling" excludes Burstable.

<!-- section: vector-rag | objectives: 2.2.5 -->
## Vector search and RAG with metadata filters

A RAG request embeds the user's question with the **same model** as the stored chunks, retrieves the nearest chunks that the user is allowed to see, then sends them to the chat model as grounding. The embedding can be computed by the application or in SQL with the `azure_ai` extension:

```text
SELECT azure_ai.set_setting('azure_openai.endpoint', 'https://contoso-oai.openai.azure.com');
SELECT azure_ai.set_setting('azure_openai.subscription_key', '<key>');

UPDATE document_chunks
SET embedding = azure_openai.create_embeddings('text-embedding-3-small', content)::vector
WHERE embedding IS NULL;
```

`azure_openai.create_embeddings` takes the **deployment name**, the text (or a `text[]` array with `batch_size`, default 100), and `timeout_ms`, `throw_on_error` (default true: an error rolls back the transaction), `max_attempts` (default 1) and `retry_delay_ms` (default 1,000). With azure_ai 1.1.0 or later and a text-embedding-3 model, `dimensions` (default NULL) returns shorter vectors, for example to stay under the 2,000-dimension index limit. It returns `real[]`, cast to `vector`. Without a key, set `azure_openai.auth_type` to `managed-identity` and give the server's system-assigned managed identity the Cognitive Services OpenAI User role on the Azure OpenAI resource.

Retrieval with a metadata filter, a distance threshold and top-k, from Python:

```text
question_vector = embed(question)          # list of 1536 floats from the same model

sql = """
SELECT c.content, d.title, d.source_url,
       1 - (c.embedding <=> %(q)s::vector) AS similarity
FROM document_chunks AS c
JOIN source_documents AS d ON d.id = c.document_id
WHERE d.tenant_id = %(tenant)s
  AND c.embedding <=> %(q)s::vector < 0.5
ORDER BY c.embedding <=> %(q)s::vector
LIMIT 5
"""
with pool.connection() as conn:
    chunks = conn.execute(sql, {"q": str(question_vector), "tenant": tenant_id}).fetchall()
```

| Requirement | Technique |
| --- | --- |
| Only the caller's tenant, category or date range | `WHERE` filter on indexed metadata columns, in the same query as the `ORDER BY` distance |
| Selective filter (a few percent of rows) | Pre-filtering: the metadata index narrows the candidates before distances are computed |
| Filter that can't use an index | Post-filtering: a CTE fetches more candidates (`LIMIT 100`), the outer query filters and keeps 10 |
| Drop weak matches | Distance threshold (`<=> ... < 0.5`); cosine similarity = 1 − cosine distance |
| Stay within the model's context | Top-k with `LIMIT`, plus a running sum of `token_count` |
| Cite sources | Join the chunk to its document and return title and URL |
| DiskANN with a filter that removes many neighbors | Keep `diskann.iterative_search` on (`relaxed_order` by default, `strict_order` for sorted batches); `off` returns at most `l_value_is` rows whatever the `LIMIT` |

> **Exam trap.** An approximate index explores a fixed number of candidates before the `WHERE` is applied: a selective filter can return fewer rows than `LIMIT`. Raise `hnsw.ef_search`, use a partial index for a frequent filter value, or post-filter a larger candidate set.

<!-- section: connection-optimization | objectives: 2.2.6 -->
## Optimizing connections

PostgreSQL uses one process per connection: thousands of idle or short-lived connections waste memory, and each tier has a connection limit (50 on B1ms, 859 on General Purpose 2 vCores, 5,000 on Memory Optimized 16 vCores). Two layers reduce the cost.

**Built-in PgBouncer** runs on the server (General Purpose and Memory Optimized only). Set `pgbouncer.enabled` to `true` (no restart) and connect to port **6432** instead of 5432; the host name doesn't change and Microsoft Entra authentication works.

| Parameter | Default |
| --- | --- |
| `pgbouncer.pool_mode` | `transaction` |
| `pgbouncer.default_pool_size` | 50 server connections per user and database pair |
| `pgbouncer.max_client_conn` | 5000 |
| `pgbouncer.query_wait_timeout` | 120 seconds |
| `pgbouncer.max_prepared_statements` | 0 (set above 0 for protocol-level prepared statements in transaction mode) |

| Pool mode | Server connection held | Limits |
| --- | --- | --- |
| Session | Until the client disconnects | Every feature, little reduction |
| Transaction (recommended) | For one transaction | `SET` doesn't persist between transactions: use `SET LOCAL`; `LISTEN`/`NOTIFY` and SQL-level `PREPARE` don't work |
| Statement | For one statement | No multi-statement transactions, no prepared statements |

**Application-side pooling** keeps connections open in each instance:

```text
from psycopg_pool import ConnectionPool

pool = ConnectionPool(
    conninfo="host=contoso-rag.postgres.database.azure.com port=6432 dbname=kb "
             "user=rag-api sslmode=require connect_timeout=10 "
             "options='-c statement_timeout=30000'",
    kwargs={"password": token},   # Microsoft Entra token, as in the first section
    min_size=5,          # baseline traffic without waiting
    max_size=20,         # database limit divided by the number of instances
    max_idle=300,        # close connections idle for 5 minutes
    max_lifetime=3600,   # recycle connections every hour
)

with pool.connection() as conn:     # returned to the pool even after an exception
    conn.execute("SELECT 1")
```

Size `max_size` from the server: 10 instances and 1,000 allowed connections give at most 100 per instance, minus headroom. Create the pool and the credential once per process, not per request. A scale operation, failover or restart also restarts PgBouncer: the application must reconnect and retry.

> **Exam trap.** "Too many connections" errors from many app instances are solved by pooling (PgBouncer on 6432 and a client pool), not by moving to a larger tier first. And moving to Burstable removes built-in PgBouncer.

<!-- section: key-points -->
## Key points

- psycopg 3 with a Microsoft Entra token as the password, scope `https://ossrdbms-aad.database.windows.net/.default`, `sslmode=require`, `%s` parameters.
- Allow `vector` in `azure.extensions`, then `CREATE EXTENSION vector` in each database; `vector(n)` must match the model; filterable attributes in typed columns, dynamic ones in `jsonb` with GIN.
- IVFFlat: fast build after loading, `lists` and `probes`. HNSW: best recall, `m`, `ef_construction`, `hnsw.ef_search` (40). DiskANN: Azure only, large tables, product quantization (preview). Operator class must match `<=>`, `<->` or `<#>`.
- Indexable up to 2,000 dimensions with pgvector; `CREATE INDEX CONCURRENTLY` in production.
- Memory Optimized for large vector sets, index in memory with 50% headroom; Burstable for development only.
- RAG: same embedding model, `WHERE` metadata filter plus `ORDER BY` distance plus `LIMIT`; `azure_openai.create_embeddings` takes the deployment name.
- PgBouncer on 6432 in transaction mode (not on Burstable), `SET LOCAL`, and a `ConnectionPool` sized per instance.
