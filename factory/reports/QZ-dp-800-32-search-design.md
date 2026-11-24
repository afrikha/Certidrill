# QZ-dp-800-32-search-design — report

File: `content/dp-800/quizzes/32-search-design.yaml` (10 questions, `dp800-qz-32-01`..`10`). Check: `npx tsx factory/check-quiz.ts dp-800 32-search-design` → 0 problem(s), 0 warning(s).

Objectives: 3.2.1 (q2, q8), 3.2.2 (q4, q6), 3.2.3 (q5, q7, q9), 3.2.4 (q3), 3.2.5 (q1, q10). Hard formats: multi (q6), ordering (q7), yesno_statements (q8, q9), single (q10).

## Pages fetched (Nov 24, 2026)
Vector data type, VECTOR_SEARCH, VECTOR_DISTANCE, VECTOR_NORMALIZE, VECTORPROPERTY, CREATE VECTOR INDEX, Vector search and vector indexes in the SQL Database Engine, CREATE FULLTEXT INDEX, Choose a Language When Creating a Full-Text Index, GRANT Full-Text Permissions, training unit "Choose an intelligent search approach".

## Chapter / mock-exam issues against current Learn
- Chapter "vector index" table: "Not supported: deployment in a DACPAC" is right, but Learn adds that BACPAC deployments are supported from DacFx 170.5.96.
- VECTOR_SEARCH limitations on Learn not in the chapter (maybe covered by the 3.2.7 chapter): `ORDER BY distance` ascending only and on the distance column only, no `VECTOR_SEARCH` in a view body, no CROSS/OUTER APPLY with `TOP (N) WITH APPROXIMATE` in the same FROM, aggregates/GROUP BY need a subquery.
- Learn's VECTOR_SEARCH page writes "TOP (N) APPROXIMATE" once in prose while its syntax and examples use `TOP (N) WITH APPROXIMATE` (Learn typo; chapter uses the right form).
- The training unit "Choose an intelligent search approach" says nothing about query-time model calls or cost; the chapter's "no call to an AI model at query time → full-text" row (used by q2 and q8 s1) rests on the fact that a vector query needs an embedding of the query (VECTOR_SEARCH examples call AI_GENERATE_EMBEDDINGS).
- Earlier-version vector indexes (deprecated): Learn still documents them (read-only table, post-filtering, TOP_N, int clustered PK). Chapter only covers the latest version (fine).

## Doubts / unverified
- q8 s3: relies on full-text semantics (no shared word, no thesaurus configured); thesaurus behaviour wasn't fetched.
- q10 b: Learn says FORCE_ANN_ONLY requires a vector index on the column and `TOP (N) WITH APPROXIMATE`, and that ANN needs an index with the same metric; what happens with the hint and an index of another metric (error or warning) isn't spelled out, so the explanation only says the hint can't make the euclidean index serve a cosine search.
- q4: per-column LANGUAGE and "no stemming with the neutral language" are on Learn; French LCID 1036 and the « cheval / chevaux » example rely on the French stemmer, not checked on a page.
- q9 s2 states only what Learn says (vector indexes aren't replicated to subscribers); whether vector columns themselves replicate wasn't checked.
