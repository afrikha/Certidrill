This chapter turns the design of the previous one into queries: choosing the index metric, writing `VECTOR_SEARCH` with the current `TOP (N) WITH APPROXIMATE` syntax, combining a full-text and a vector search, merging the two rankings with reciprocal rank fusion (RRF), and measuring whether the result is good and fast enough. Exam questions show a query with a gap or a bug and ask how to complete or fix it.

<!-- section: index-metrics | objectives: 3.2.6 -->
## Vector index types and metrics

```text
CREATE VECTOR INDEX vix_ProductEmbeddings_Embedding
ON dbo.ProductEmbeddings (Embedding)
WITH (METRIC = 'cosine', TYPE = 'DiskANN', MAXDOP = 4);
```

| Option | Values | Notes |
| --- | --- | --- |
| `TYPE` | `DiskANN` only (default) | Graph-based ANN index that works from SSD with little memory, high queries per second and low latency |
| `METRIC` | `cosine`, `euclidean`, `dot` | Fixed at creation: one metric per index |
| `MAXDOP` | `0` (default), `1`, `n` | Parallelism of the build |
| `ON filegroup` | A filegroup or `"default"` | Where the index is stored |

Choosing the metric:

| Situation | Metric |
| --- | --- |
| Text embeddings, the model's documentation recommends cosine similarity | `cosine` |
| Vectors already normalized to length 1 (Azure OpenAI embeddings, or `VECTOR_NORMALIZE(v, 'norm2')`) | `cosine` or `dot`: same ordering of results |
| Magnitude carries meaning (not normalized), absolute position in space matters | `euclidean` |

The metric of the query must equal the metric of the index. When `VECTOR_SEARCH` asks for `METRIC = 'euclidean'` on a column indexed with `cosine`, the index isn't used: the engine raises a warning and runs an exact kNN scan.

> **Exam trap.** Changing only the `METRIC` argument of the query doesn't change the index: with no index of that metric on the column, the search becomes an exact kNN scan, signaled only by a warning.

Index versions and metadata:

- `sys.vector_indexes` exposes `build_parameters`; `JSON_VALUE(build_parameters, '$.Version')` returns `3` for the latest version.
- `sys.dm_db_vector_indexes` shows index health and background maintenance.
- Earlier-version indexes made the table **read-only** (unless `ALLOW_STALE_VECTOR_INDEX` accepted stale results), only post-filtered results and required `TOP_N`. They can't be upgraded in place: drop and recreate the index.

<!-- section: vector-search | objectives: 3.2.7 -->
## Implementing vector search

The query vector must come from the **same model, with the same dimensions**, as the stored vectors.

```text
DECLARE @q VECTOR(1536) =
    AI_GENERATE_EMBEDDINGS(N'quiet tent for windy nights' USE MODEL EmbeddingModel);

SELECT TOP (10) WITH APPROXIMATE
    p.ProductID, p.Name, r.distance
FROM VECTOR_SEARCH(
        TABLE = dbo.Products AS p,
        COLUMN = DescriptionVector,
        SIMILAR_TO = @q,
        METRIC = 'cosine'
    ) AS r
WHERE p.Category = 'Camping'
  AND p.IsActive = 1
ORDER BY r.distance;
```

| Element | Rule |
| --- | --- |
| `TABLE` | A base table (no view, no temporary table); give it an alias and reference its columns through that alias |
| `COLUMN` | A `vector` column |
| `SIMILAR_TO` | A `vector` variable or column |
| `METRIC` | `cosine`, `dot` or `euclidean`; must match the index |
| `distance` | Column added to the result. If the table already has a column named `distance`, aliases are mandatory |
| `ORDER BY` | Required with `APPROXIMATE`: only `distance`, only ascending |

With the latest index version, `WHERE` predicates are applied **during** the search (iterative filtering): the engine keeps searching until it has `N` qualifying rows or runs out of candidates, so there's no need to over-request rows.

> **Exam trap.** The deprecated syntax `VECTOR_SEARCH(..., TOP_N = 10)` fails on a latest-version index (Msg 42274). It also filtered *after* retrieving the `TOP_N` rows, so a selective `WHERE` could return fewer rows than requested or none. Use `SELECT TOP (N) WITH APPROXIMATE`.

Errors to recognize:

| Message | Cause | Fix |
| --- | --- | --- |
| 42274 | `TOP_N` used with a version 3 index | Remove `TOP_N`, use `TOP (N) WITH APPROXIMATE` |
| 42248 | `APPROXIMATE` without `ORDER BY` | Add `ORDER BY distance` |
| 42271 | `ORDER BY` on another column than `distance`, or `DESC` | Order only by `distance` ascending; sort differently in an outer query |

More limitations: `VECTOR_SEARCH` can't be used in a view, `CROSS APPLY` / `OUTER APPLY` can't appear in the same `FROM` as `TOP (N) WITH APPROXIMATE`, and `GROUP BY`, aggregates, window functions, `DISTINCT` or set operators need a **subquery**:

```text
-- Join to another table, then aggregate the ANN result in an outer query
SELECT c.CategoryName, COUNT(*) AS hits, AVG(v.distance) AS avg_distance
FROM (
    SELECT TOP (100) WITH APPROXIMATE p.ProductID, p.CategoryID, r.distance
    FROM VECTOR_SEARCH(
            TABLE = dbo.Products AS p,
            COLUMN = DescriptionVector,
            SIMILAR_TO = @q,
            METRIC = 'cosine'
        ) AS r
    ORDER BY r.distance
) AS v
INNER JOIN dbo.Categories AS c ON c.CategoryID = v.CategoryID
GROUP BY c.CategoryName
ORDER BY avg_distance;
```

Exact alternative, for small candidate sets or when exact results are required:

```text
SELECT TOP (10) p.ProductID, p.Name,
       VECTOR_DISTANCE('cosine', @q, p.DescriptionVector) AS distance
FROM dbo.Products AS p
WHERE p.Category = 'Camping'
ORDER BY distance;
```

<!-- section: hybrid-search | objectives: 3.2.8 -->
## Implementing hybrid search

A hybrid search runs **two searches on the same data** and merges them:

1. A full-text search with `FREETEXTTABLE` or `CONTAINSTABLE`, ranked by `RANK` descending.
2. A vector search with `VECTOR_SEARCH` (large tables) or `VECTOR_DISTANCE` (small tables), ranked by `distance` ascending.
3. A `FULL OUTER JOIN` of the two lists on the key, so that a row found by only one search is kept.
4. A fused score, usually RRF (next section), and a final sort on that score.

The two scores can't be added directly: `RANK` is an unbounded relevance value where higher is better, `distance` is between 0 and 2 for cosine where lower is better. Only **positions** in each list are comparable, which is what RRF uses.

```text
DECLARE @text NVARCHAR(400) = N'lightweight hiking boots';
DECLARE @q VECTOR(1536) = AI_GENERATE_EMBEDDINGS(@text USE MODEL EmbeddingModel);

WITH keyword AS (
    SELECT TOP (50) ft.[KEY] AS ProductID,
           RANK() OVER (ORDER BY ft.[RANK] DESC) AS kw_rank
    FROM FREETEXTTABLE(dbo.Products, Description, @text) AS ft
    ORDER BY ft.[RANK] DESC
),
semantic AS (
    SELECT v.ProductID,
           RANK() OVER (ORDER BY v.distance) AS vec_rank
    FROM (
        SELECT TOP (50) WITH APPROXIMATE p.ProductID, r.distance
        FROM VECTOR_SEARCH(
                TABLE = dbo.Products AS p,
                COLUMN = DescriptionVector,
                SIMILAR_TO = @q,
                METRIC = 'cosine'
            ) AS r
        ORDER BY r.distance
    ) AS v
)
SELECT COALESCE(k.ProductID, s.ProductID) AS ProductID,
       k.kw_rank, s.vec_rank
FROM keyword AS k
FULL OUTER JOIN semantic AS s ON s.ProductID = k.ProductID;
```

Note the subquery around `VECTOR_SEARCH`: the window function `RANK()` isn't allowed in the same query block as `TOP (N) WITH APPROXIMATE`.

> **Exam trap.** An `INNER JOIN` between the keyword list and the vector list keeps only rows found by both searches and loses the main benefit of hybrid search. The join is a `FULL OUTER JOIN`, with `COALESCE` on the key.

Apply business filters (category, tenant, availability) **inside** each search rather than after the fusion: filtering after RRF can remove highly ranked rows and leave too few results.

<!-- section: rrf | objectives: 3.2.9 -->
## Reciprocal rank fusion (RRF)

For each row, RRF adds one term per list in which the row appears:

```text
rrf_score = 1 / (k + rank_in_list_1) + 1 / (k + rank_in_list_2)
```

| Element | Value and effect |
| --- | --- |
| `k` | Constant, **60** by convention (from the original RRF research). Larger `k` flattens the differences between ranks; smaller `k` favors the top positions |
| Rank | Position in each list, starting at 1 (`RANK()` or `ROW_NUMBER()`) |
| Missing row | A row absent from one list contributes 0 for that list: `COALESCE(1.0 / (@k + rank), 0.0)` |
| Weight | Multiply one term to favor a source, for example `2.0 / (@k + vec_rank)` |
| Sort | `ORDER BY rrf_score DESC`: higher is better |

Completing the hybrid query of the previous section:

```text
DECLARE @k INT = 60;
-- keyword and semantic CTEs as above, then:
SELECT TOP (10)
       COALESCE(k.ProductID, s.ProductID) AS ProductID,
       COALESCE(1.0 / (@k + k.kw_rank), 0.0)
     + COALESCE(1.0 / (@k + s.vec_rank), 0.0) AS rrf_score
FROM keyword AS k
FULL OUTER JOIN semantic AS s ON s.ProductID = k.ProductID
ORDER BY rrf_score DESC;
```

Worked example with `k = 60`: a product ranked 1st by keywords and 3rd by vectors scores `1/61 + 1/63 ≈ 0.0323`; a product ranked 1st by vectors only scores `1/61 ≈ 0.0164`. Appearing in both lists matters more than being first in one.

> **Exam trap.** Integer division silently returns 0: `1 / (60 + rank)` with integer operands is always 0 in T-SQL. Write `1.0 / (...)` so the result is decimal.

RRF needs no score normalization, works whatever the scales of the two searches and doesn't let one source dominate. Its inputs are the `TOP (N)` of each list: start around 50 candidates per list; more candidates give RRF more to merge but cost time.

<!-- section: evaluate | objectives: 3.2.10 -->
## Evaluating vector and hybrid search

**Quality** is measured on a test set of queries whose relevant rows are known:

| Metric | Question it answers |
| --- | --- |
| Precision | Of the rows returned, what share is relevant? |
| Recall | Of all relevant rows, what share was returned? |
| Mean reciprocal rank (MRR) | How high does the first relevant row appear, on average? |
| Recall of the ANN index | Of the rows an exact search returns, what share does the approximate search return? 1 = no approximation |

Run the same test queries with full-text only, vector only and hybrid, and compare. Hybrid search typically improves recall over either approach alone, with little loss of precision.

To measure the **ANN recall** of a vector index, compare `VECTOR_SEARCH ... WITH APPROXIMATE` with the exact `VECTOR_DISTANCE` query for the same vector and the same `N`:

```text
WITH ann AS (
    SELECT TOP (10) WITH APPROXIMATE p.ProductID
    FROM VECTOR_SEARCH(TABLE = dbo.Products AS p, COLUMN = DescriptionVector,
                       SIMILAR_TO = @q, METRIC = 'cosine') AS r
    ORDER BY r.distance
),
exact AS (
    SELECT TOP (10) ProductID
    FROM dbo.Products
    ORDER BY VECTOR_DISTANCE('cosine', @q, DescriptionVector)
)
SELECT COUNT(*) / 10.0 AS recall_at_10
FROM ann INNER JOIN exact ON exact.ProductID = ann.ProductID;
```

**Performance** checklist:

| Symptom | Check | Fix |
| --- | --- | --- |
| Vector query slow on a large table | Is the query written with `VECTOR_DISTANCE`? Does the plan show a scan? | Create a vector index and use `VECTOR_SEARCH` with `TOP (N) WITH APPROXIMATE` |
| Index exists but isn't used | Warning about the metric; metric of the query vs `sys.vector_indexes` | Same metric in the query and the index |
| Filtered ANN query returns too few rows | Earlier-version index with `TOP_N` (post-filtering) | Recreate the index (latest version), use `TOP (N) WITH APPROXIMATE` |
| Hybrid query slow | Size of `TOP (N)` per list, cost of the embedding call | Lower the candidates per list, cache or precompute query embeddings |
| Relevance poor | Precision, recall and MRR on the test set | Change chunking, columns embedded, model, RRF weights or `k` |

Use the usual tools to measure: the actual execution plan, `SET STATISTICS TIME ON` and `SET STATISTICS IO ON`, and Query Store for regressions over time.

<!-- section: key-points -->
## Key points

- Vector index: `TYPE = 'DiskANN'` only, one `METRIC` per index; the query metric must match or the search falls back to kNN with a warning.
- Current ANN syntax: `SELECT TOP (N) WITH APPROXIMATE ... FROM VECTOR_SEARCH(...) ORDER BY distance` (ascending, alone); `TOP_N` is deprecated (Msg 42274).
- `WHERE` filters are applied during the search on latest-version indexes; aggregates and window functions need a subquery.
- Hybrid = full-text list + vector list + `FULL OUTER JOIN` + fused score.
- RRF = sum of `1.0 / (k + rank)`, `k = 60`, missing rank = 0, higher score first.
- Evaluate quality with precision, recall and MRR on a test set; evaluate ANN with recall against an exact query; evaluate speed with plans and statistics.
