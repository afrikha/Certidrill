The SQL Database Engine offers two search engines inside the database: full-text search, which matches words, and vector search, which matches meaning. Exam questions describe what users type and what they expect back, then ask which approach to choose, how to declare the vector column and its index, which vector function to call, and whether an exact or an approximate search fits the data volume.

<!-- section: choose-search | objectives: 3.2.1 -->
## Choosing full-text, vector or hybrid search

| Approach | Matches | Ranking | Needs |
| --- | --- | --- | --- |
| Full-text search | Words and their forms: terms, phrases, prefixes, inflections, proximity | `RANK` column of `CONTAINSTABLE` / `FREETEXTTABLE` (BM25-style relevance) | A full-text catalog and a full-text index |
| Semantic vector search | Meaning: "trail shoes" finds "hiking boots" even without a shared word | Distance between the query vector and each stored vector | An embedding model, a `vector` column, optionally a vector index |
| Hybrid search | Both: exact terms and meaning | The two ranked lists merged, usually with reciprocal rank fusion (RRF) | Both of the above |

Decision table:

| Requirement in the question | Answer |
| --- | --- |
| Product codes, part numbers, names, exact phrases, "words starting with" | Full-text search (or a plain `LIKE` / index seek for exact codes) |
| Natural-language questions, paraphrases and synonyms not in a thesaurus, queries in other languages with a multilingual model | Vector search |
| Users mix exact terms ("SKU X200") with a description ("quiet for night use"), best overall relevance | Hybrid search |
| No call to an AI model allowed at query time, no embedding cost | Full-text search |
| Grounding a language model with the most relevant rows (RAG) | Vector or hybrid search |

> **Exam trap.** Full-text search matches words, not concepts. Without a configured thesaurus, a query for "MTB" doesn't find "mountain bike". When the stem says users describe what they want in their own words, the answer is vector or hybrid search, not a new full-text stoplist.

Vector search costs an embedding call per query (the query text must be turned into a vector with the same model as the stored vectors) and storage for the vectors. Full-text search costs only the index.

<!-- section: full-text | objectives: 3.2.2 -->
## Implementing full-text search

A full-text index needs three things: a **full-text catalog** (or a default catalog), a **unique, single-column, non-nullable index** on the table used as `KEY INDEX` (an integer key performs best), and the text columns to index. Full-text search is available in SQL Server, Azure SQL Database and Azure SQL Managed Instance.

```text
CREATE FULLTEXT CATALOG ProductCatalog AS DEFAULT;
GO
-- The KEY INDEX is the unique index behind the primary key
CREATE FULLTEXT INDEX ON dbo.Products
(
    Name LANGUAGE 1033,
    Description LANGUAGE 1033
)
KEY INDEX PK_Products
ON ProductCatalog
WITH CHANGE_TRACKING = AUTO, STOPLIST = SYSTEM;
GO
```

| Option | Values |
| --- | --- |
| `LANGUAGE` | Per column: an LCID such as `1033`, a hex LCID such as `0x409` or a name from `sys.syslanguages`. Default: the instance's default full-text language |
| `CHANGE_TRACKING` | `AUTO` (default): changes are propagated automatically. `MANUAL`: run `ALTER FULLTEXT INDEX ... START UPDATE POPULATION` yourself. `OFF`: no tracking; `OFF, NO POPULATION` creates the index empty |
| `STOPLIST` | `SYSTEM` (default), `OFF` or a custom stoplist |
| `TYPE COLUMN` | Only for `varbinary(max)` or `image` columns: names the column holding the file extension (`.pdf`, `.docx`) |

Rules to remember: **one full-text index per table** (up to 1,024 columns), indexed types are `char`, `varchar`, `nchar`, `nvarchar`, `text`, `ntext`, `image`, `xml` and `varbinary(max)`, and `CREATE FULLTEXT INDEX` can't run inside a user transaction. Creating it requires `REFERENCES` on the catalog and `ALTER` on the table.

Query predicates and functions:

| Construct | Returns | Use |
| --- | --- | --- |
| `CONTAINS(column, 'condition')` | Boolean, in `WHERE` | Precise conditions: term, phrase, prefix, inflection, proximity |
| `FREETEXT(column, 'text')` | Boolean, in `WHERE` | Free-form text: words are split, stemmed and matched with their inflectional forms |
| `CONTAINSTABLE(table, column, 'condition')` | Table with `[KEY]` and `RANK` | Same as `CONTAINS`, with relevance ranking |
| `FREETEXTTABLE(table, column, 'text')` | Table with `[KEY]` and `RANK` | Same as `FREETEXT`, with relevance ranking |

```text
-- Condition syntax of CONTAINS / CONTAINSTABLE
WHERE CONTAINS(Description, 'aluminum')                          -- term
WHERE CONTAINS(Description, '"mountain bike"')                   -- phrase
WHERE CONTAINS(Description, '"light*"')                          -- prefix
WHERE CONTAINS(Description, 'FORMSOF(INFLECTIONAL, "ride")')     -- ride, rides, riding
WHERE CONTAINS(Description, 'NEAR((light, aluminum))')           -- proximity

-- Ranked results: join on [KEY], sort on RANK
SELECT p.ProductID, p.Name, ft.[RANK]
FROM dbo.Products AS p
INNER JOIN FREETEXTTABLE(dbo.Products, Description, 'quiet tent for windy nights') AS ft
    ON p.ProductID = ft.[KEY]
ORDER BY ft.[RANK] DESC;
```

> **Exam trap.** `CONTAINS` and `FREETEXT` only filter: they don't return a score. To sort by relevance or to feed a hybrid search, use `CONTAINSTABLE` or `FREETEXTTABLE` and join their `[KEY]` column to the table's key.

<!-- section: vector-data | objectives: 3.2.3 -->
## Designing for vector data

The `vector` type stores an embedding in an optimized binary format and exposes it as a JSON array.

```text
CREATE TABLE dbo.ProductEmbeddings
(
    ProductID   INT NOT NULL PRIMARY KEY,
    Embedding   VECTOR(1536) NOT NULL,          -- float32 by default
    EmbeddingHp VECTOR(3072, float16) NULL      -- half precision
);

INSERT INTO dbo.ProductEmbeddings (ProductID, Embedding)
VALUES (1, '[0.012, -0.034, ...]');             -- a JSON array with exactly 1536 numbers
```

| Base type | Max dimensions | Storage per element | Status |
| --- | --- | --- | --- |
| `float32` (default) | 1,998 | 4 bytes | GA on all platforms |
| `float16` | 3,996 | Half precision: less storage, less precision | GA in Azure SQL Database, SQL database in Fabric, Azure SQL Managed Instance (Always-up-to-date); preview in SQL Server 2025 (`PREVIEW_FEATURES = ON`) |

**Size** drives the design. A `VECTOR(1536)` in float32 holds 6,144 bytes of values per row: one million rows is about 6 GB before any index. The number of dimensions is fixed by the embedding model (or by its `dimensions` parameter), and every vector in the column must have exactly that number: a mismatch raises error 42204.

Limitations of a `vector` column:

- Only `NULL` / `NOT NULL`: no `DEFAULT`, `CHECK`, `PRIMARY KEY`, `FOREIGN KEY` or `UNIQUE` constraint.
- No B-tree or columnstore index on it; it can be an **included** column of an index.
- No comparison or arithmetic operators; use the vector functions.
- Not allowed in memory-optimized tables, with Always Encrypted, in `sql_variant` or as an alias type.
- Converts implicitly to and from `varchar`, `nvarchar` and `json` (JSON array); to nothing else.
- Clients that don't support the native format (TDS 7.4 with recent drivers, such as Microsoft.Data.SqlClient 6.1) receive the vector as a JSON string.

A **vector index** (`CREATE VECTOR INDEX`) builds an approximate nearest neighbor (ANN) structure with the DiskANN algorithm:

| Rule | Detail |
| --- | --- |
| Object | A base table: no view, no temporary table |
| Data | At least 100 rows with a non-NULL vector, otherwise error 42266 |
| Metric | One per index: `cosine`, `euclidean` or `dot` |
| DML | Latest index version: `INSERT`, `UPDATE`, `DELETE`, `MERGE` maintained automatically |
| Not supported | Partitioning the index, replication to subscribers, `TRUNCATE TABLE` on the table, deployment in a DACPAC (a BACPAC that contains vector indexes can be deployed from DacFx 170.5.96) |
| Status | GA in Azure SQL Database, SQL database in Fabric and Managed Instance (Always-up-to-date); preview in SQL Server 2025 |

Design pattern: keep vectors in a **dedicated embeddings table** (key of the source row, chunk text, vector). It isolates the space they use, and embeddings can be rebuilt without touching the source rows.

> **Exam trap.** An embedding model that returns 3,072 dimensions doesn't fit a float32 `VECTOR` column (max 1,998). Either request fewer dimensions from the model (`"dimensions"` parameter) or use `VECTOR(3072, float16)`.

<!-- section: vector-functions | objectives: 3.2.4 -->
## Vector functions for semantic search

| Function | Returns | When to use it |
| --- | --- | --- |
| `VECTOR_DISTANCE(metric, v1, v2)` | `float` distance | Exact search: computes the distance for every candidate row, **never uses a vector index** |
| `VECTOR_SEARCH(TABLE, COLUMN, SIMILAR_TO, METRIC)` | Table rows plus a `distance` column | Approximate search through a vector index (falls back to exact kNN if no matching index) |
| `VECTOR_NORMALIZE(v, norm_type)` | Vector of length 1 | Scale vectors before a `dot` comparison or when the model doesn't return normalized vectors |
| `VECTORPROPERTY(v, property)` | `Dimensions` (int) or `BaseType` (sysname) | Check the shape of a vector: validation, troubleshooting dimension mismatches |

Distance metrics, with **smaller = more similar** for all three:

| Metric | Range | Meaning |
| --- | --- | --- |
| `cosine` | 0 to 2 | 0 = same direction, 2 = opposite. The usual choice for text embeddings |
| `euclidean` | 0 to infinity | Straight-line distance; 0 = identical |
| `dot` | minus infinity to plus infinity | **Negative** dot product, so that smaller still means more similar |

`VECTOR_NORMALIZE` accepts `norm1` (sum of absolute values), `norm2` (Euclidean length, the common choice) and `norminf` (largest absolute value). After `norm2` normalization, dot product and cosine give the same ordering. Azure OpenAI embedding models already return normalized vectors.

```text
DECLARE @q VECTOR(1536) = AI_GENERATE_EMBEDDINGS(N'waterproof jacket for kids' USE MODEL EmbeddingModel);

-- Exact: top 10 by cosine distance
SELECT TOP (10) e.ProductID,
       VECTOR_DISTANCE('cosine', @q, e.Embedding) AS distance
FROM dbo.ProductEmbeddings AS e
ORDER BY distance;

-- Threshold instead of top N
SELECT e.ProductID
FROM dbo.ProductEmbeddings AS e
WHERE VECTOR_DISTANCE('cosine', @q, e.Embedding) < 0.3;

-- Shape of a vector
SELECT VECTORPROPERTY(@q, 'Dimensions') AS dims,
       VECTORPROPERTY(@q, 'BaseType') AS base_type;

-- Normalize before storing
UPDATE dbo.ProductEmbeddings SET Embedding = VECTOR_NORMALIZE(Embedding, 'norm2');
```

> **Exam trap.** Creating a vector index doesn't speed up a query written with `VECTOR_DISTANCE`: that function always computes exact distances. To use the index, rewrite the query with `VECTOR_SEARCH`.

<!-- section: ann-enn | objectives: 3.2.5 -->
## ANN or ENN

| | Exact nearest neighbor (ENN, also called kNN) | Approximate nearest neighbor (ANN) |
| --- | --- | --- |
| How | Distance to every candidate vector, then sort | Navigates a DiskANN graph built by the vector index |
| Result | Exact top N, recall = 1 | Approximate top N; recall close to 1 |
| T-SQL | `VECTOR_DISTANCE` with `ORDER BY ... TOP (N)` | `VECTOR_SEARCH` with `SELECT TOP (N) WITH APPROXIMATE` |
| Index | None needed | A vector index on the column, with the same metric |
| Fits | Fewer than about **50,000 vectors** to compare, or filters that reduce the candidates to that number | Large tables where scanning every vector is too slow or too costly |

**Recall** is the proportion of the true nearest neighbors (those an exact search returns) that the approximate search also returns; 1 means no approximation. Because embeddings are themselves approximations of meaning, an ANN search with a recall close to 1 barely changes the answers, for much less CPU and latency.

The 50,000 guideline counts the vectors actually compared, not the table size: a table of ten million rows queried for one tenant whose filter leaves 20,000 rows is still a good fit for an exact search.

How `VECTOR_SEARCH` decides:

| Query | Search performed |
| --- | --- |
| `SELECT TOP (N) WITH APPROXIMATE ... ORDER BY distance`, matching index | ANN (the optimizer may still choose a kNN scan when it's cheaper) |
| `SELECT TOP (N) ... ORDER BY distance` without `APPROXIMATE` | Exact kNN |
| No index with the same metric on the column | Exact kNN, with a warning |
| Table hint `FORCE_ANN_ONLY` | ANN only; requires the index and `TOP (N) WITH APPROXIMATE` |

> **Exam tip.** "Results must be exactly the closest rows" or "a few thousand rows" points to ENN with `VECTOR_DISTANCE`. "Millions of rows", "lowest latency" and "a small loss of accuracy is acceptable" point to ANN with a vector index and `VECTOR_SEARCH`.

<!-- section: key-points -->
## Key points

- Words and codes: full-text. Meaning: vector. Both, best relevance: hybrid.
- Full-text index: catalog + unique non-nullable single-column `KEY INDEX`; one per table; `CHANGE_TRACKING = AUTO` by default; ranking needs `CONTAINSTABLE` / `FREETEXTTABLE`.
- `VECTOR(n)`: float32 up to 1,998 dimensions (4 bytes each), float16 up to 3,996; dimensions must match the model; no constraints or B-tree index on the column.
- Vector index: DiskANN, one metric, base table with at least 100 vectors, no partitioning, no `TRUNCATE`.
- `VECTOR_DISTANCE` = exact, ignores indexes; `VECTOR_SEARCH` = approximate through the index; `VECTOR_NORMALIZE` = unit length; `VECTORPROPERTY` = dimensions and base type.
- ENN under about 50,000 compared vectors or when exactness is required; ANN for large volumes, measured by recall.
