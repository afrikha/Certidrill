# QZ-ai-200-22-postgresql — report

Quiz: `content/ai-200/quizzes/22-postgresql.yaml`, 10 questions (`ai200-qz-22-01` to `-10`), checker 0 problem(s), 0 warning(s).

Objectives: 2.2.1 (Q2), 2.2.2 (Q1, Q7), 2.2.3 (Q3, Q9, Q10), 2.2.4 (Q5), 2.2.5 (Q4, Q8), 2.2.6 (Q6). Positions 6–10: single, yesno_statements, single, multi, dropdown.

The 87 mock-exam questions of 2.2.1–2.2.6 (bank, cs1a/cs2b/cs3b/cs4a, sr1/sr2 series) were read first. The bank covers almost every decision of the chapter; the quiz tests: vector storage per dimension, role name of a user-assigned identity, `ef_search` ≥ `LIMIT`, `create_embeddings` retry arguments, `max_worker_processes` restart, `default_pool_size` per user/database pair, partitioned-table constraints, the post-filtering CTE, compute reduction (lower `ef_search`, inner product), IVFFlat `sqrt` rules above one million rows. Q7's first stem was flagged as too close to `ai200-cs2b-embedding-index` (boilerplate) and was lengthened.

## Chapter out of date or wrong against current Learn (not edited)

1. **DiskANN product quantization is Preview.** The pg_diskann page titles the section "Scale efficiently with Quantization (Preview)" (pg_diskann v0.6+), and the 16,000-dimension limit depends on it. The chapter (vector-indexes table and the 2,000-dimension bullet) presents `product_quantized = true` without a preview flag. Bank questions whose correct answer is this preview feature: `ai200-2b-3072-dims`, `ai200-2b-reduce-footprint` (one of the two correct options), `ai200-2b-pq-rerank`. To review under the "never test a preview feature as the answer" rule. The quiz does not use it.
2. **`azure_openai.create_embeddings` has a `dimensions` argument** (azure_ai 1.1.0+, text-embedding-3 models) on the current Learn page; the chapter's argument list omits it. It is a direct way to stay under the 2,000-dimension index limit.
3. **Authentication of azure_ai**: the Learn page I fetched documents only `azure_openai.endpoint` + `azure_openai.subscription_key`; the bank question `ai200-2c-pg-embeddings-identity` uses managed identity authentication. Not verified by me (another Learn page may document it).

## Chapter claims I could not verify on Learn (not tested)

- `LISTEN`/`NOTIFY` and SQL `PREPARE` not working in transaction mode: the Learn PgBouncer pages only refer to the PgBouncer documentation (they do say statement mode can't be used with prepared statements and that transaction mode doesn't support prepared transactions).
- "Creating an extension needs the server administrator or a member of `azure_pg_admin`": not on the allow-extensions page.
- psycopg 3 `with psycopg.connect(...)` committing on success / rolling back on exception: the Learn quickstart only shows explicit `commit()` and `close()`.
- `hnsw.ef_search` "about 20 for latency-critical calls": not on the Learn pages I fetched (training unit: default 40, 100–200 for high accuracy, at least the `LIMIT`). Q9 uses 20 with `LIMIT 5`, consistent with the "at least `LIMIT`" rule and the recall/speed trade-off.
- `GRANT` of table privileges to a Microsoft Entra role after `pgaadauth_create_principal`: not on the Manage Microsoft Entra roles page.

## Doubts

- Q8: "an approximate index explores a fixed number of candidates (40 by default for HNSW) before the filter" comes from the chapter's exam trap and pgvector behavior; Learn states the post-filtering pattern ("fetch more candidates than needed, then apply filters; adjust the inner LIMIT to the selectivity") but not the 40-candidate arithmetic. Iterative index scans (pgvector 0.8 `hnsw.iterative_scan`) would be another fix; the stem excludes parameter changes.
- Q2 relies on "role name must match the Entra principal name: display name for service principals and managed identities"; the page doesn't spell out the login user name of a service principal, but it is the role name.
- Q6 assumes PgBouncer's server connections count against `max_connections` like any other connection (standard behavior); the reserved connections are described without naming `reserved_connections` / `superuser_reserved_connections`.
- Reference titles of the training units use the H1 form used by the bank ("Optimize data layout", "Choose and configure vector indexes"); the browser titles are "Optimize Data Layout - Training" and "Choose and Configure Vector Indexes - Training".
- Learn's pgvector optimization page still suggests "Azure Cosmos DB for PostgreSQL" for sharding; not used.
