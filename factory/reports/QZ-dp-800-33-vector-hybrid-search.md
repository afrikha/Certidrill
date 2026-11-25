# QZ-dp-800-33-vector-hybrid-search — report

File: `content/dp-800/quizzes/33-vector-hybrid-search.yaml` (10 questions, `dp800-qz-33-01` to `-10`). Check: 0 problem(s), 0 warning(s).

Coverage: 3.2.6 (q4), 3.2.7 (q1, q6), 3.2.8 (q5, q8), 3.2.9 (q2, q7), 3.2.10 (q3, q9, q10). Positions 6–10: yesno_statements, dropdown ×2, multi, single.

Pages fetched (Nov. 2026): VECTOR_SEARCH, CREATE VECTOR INDEX, CONTAINSTABLE, "Vector search and vector indexes in the SQL Database Engine", training unit "Implement hybrid search and ranking". All scenarios use Azure SQL Database (vector index and VECTOR_SEARCH are GA there; still preview in SQL Server 2025 and Managed Instance with the SQL Server 2025 update policy).

## Chapter issues and doubts

- **Unverified chapter claim (index-metrics section):** the trap "To query the same column with two metrics through ANN, you need two vector indexes" relies on being able to create two vector indexes with different metrics on the same column. Neither CREATE VECTOR INDEX nor VECTOR_SEARCH says that this is allowed (or forbidden). I left it out of the quiz. Someone should check it, or the chapter should say only that the query metric must match the index metric.
- Cosine distance "between 0 and 2" (hybrid-search section) doesn't appear on any page I fetched. It's mathematically correct but not sourced.
- The chapter's ON filegroup row is fine, but Azure SQL Database (the platform the chapter uses everywhere) doesn't let you choose filegroups. That option only matters on SQL Server or Managed Instance.
- Learn inconsistencies (not chapter errors, but candidates may notice them): CREATE VECTOR INDEX example 3 sorts by `ORDER BY s.distance, t.title` with `TOP (3) WITH APPROXIMATE`. The VECTOR_SEARCH page says that ordering fails with Msg 42271. The hybrid training unit uses `TOP(@topN)` without ORDER BY in its keyword and combined CTEs, so those results are non-deterministic. The chapter's versions with ORDER BY are correct.
- q5 relies on the difference between CONTAINSTABLE (exact phrase) and FREETEXTTABLE (meaning of the words). It's taught in chapter 32 (search-design), not in chapter 33.
- q4 uses MAXDOP as Learn describes it ("overrides max degree of parallelism for the index operation"). The distractor about the MAXDOP database scoped configuration follows from MAXDOP = 0 meaning "the server, database or workload group setting".
