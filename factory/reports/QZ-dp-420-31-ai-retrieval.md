# QZ-dp-420-31-ai-retrieval — report

File: `content/dp-420/quizzes/31-ai-retrieval.yaml` (10 questions, `dp420-qz-31-01` to `-10`). Check: `npx tsx factory/check-quiz.ts dp-420 31-ai-retrieval` → 0 problem(s), 0 warning(s).

Objectives: 3.1.1 (q1, q6), 3.1.2 (q4), 3.1.3 (q5, q8), 3.1.4 (q3), 3.1.5 (q7), 3.1.6 (q2, q9), 3.1.7 (q10). Formats 6–10: dropdown, single, yesno_statements, dragdrop, multi.

## Probably out of date: enabling vector and full-text search

- **Integrated Vector Store** (`/azure/cosmos-db/vector-search`, fetched Nov. 2026) now says vector search "is on by default. You don't need to register the feature or enable an account capability."
- **Use Full-Text Search** says the core feature needs no named feature flag. Only the multi-language preview needs enrollment ("New features for full-text search").
- Other Learn pages still say to enable or enroll: **Indexing policies** ("You must enable the Azure Cosmos DB NoSQL Vector Search feature…" / "…Full Text & Hybrid Search for NoSQL API feature…"), **RRF** (remarks) and **Use Hybrid Search** (step 1). Learn contradicts itself.
- Affected content to review:
  - Chapter, section `vector-design`: `az cosmosdb update --capabilities EnableNoSQLVectorSearch`, "can take up to 15 minutes".
  - Chapter, section `full-text`: "plus the full-text and hybrid search feature enabled on the account (Settings > Features)".
  - Mock questions where enabling is the tested decision or a step: `dp420-3a-vec-enable-cli`, `dp420-3a-hybrid-features`, `dp420-3a-vshard-migrate-order` (first action), `dp420-cs2b-rulings-rag` (first action).
  - Stems that state "the feature is enabled" (harmless): `dp420-3a-fts-contains-ru`, `dp420-3a-fts-index-prereqs`, `dp420-3a-fts-policy-json`.
- My quiz doesn't test enabling. q7 says only "the account is configured for full-text search".

## Other inconsistencies

- **Changing a vector policy**: Integrated Vector Store says you can add or remove vector paths but not change an existing one (drop, then re-add). Indexing policies and Use Hybrid Search say vector policies and indexes are immutable and changes need a new container. The chapter gives both options. I avoided the point.
- **Sharded DiskANN** page: the sample query puts `WHERE` after `ORDER BY` (Learn typo). The page doesn't say what a vector query does without a filter on the shard key.
- **VECTORDISTANCE** page: "unit8" typo. It gives no defaults or ranges for `searchListSizeMultiplier`, `quantizedVectorListMultiplier` or `filterPriority`.
- **Multitenancy** page: `/azure/cosmos-db/gen-ai/multi-tenancy-vector-search` fails. I used `/azure/cosmos-db/multi-tenancy-vector-search` (fetched). Mock question dp420-3a-vpart-tenant-hotarea uses a third URL, `/azure/cosmos-db/nosql/multi-tenancy-vector-search`.
- **Semantic Reranker** is preview (chapter): not used.

## Facts inferred or from general knowledge (not stated on a fetched page)

- q7 option a: "ORDER BY RANK expects a single scoring function". This is inferred from the syntax `ORDER BY RANK <scoring function>`; the page doesn't state it explicitly.
- q6: `COUNT(<boolean expr>)` counts every item, because the expression is always defined, and `SUM` doesn't count conditions (Cosmos DB aggregate semantics, not fetched). Learn's facet guidance (GROUP BY + COUNT(1), COUNTIF for ranges) is verified.
- q10: container default TTL of 86,400 s. The semantic cache page lists TTL as the way to control the cache; the TTL mechanics come from the general Cosmos DB TTL feature.
- q3: "ORDER BY VectorDistance returns the most similar first whatever the distance function". The vector store page says results are sorted "from most-similar to least-similar".
