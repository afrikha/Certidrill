# K-dp-800-sr1 — report

6 Yes/No series (18 `series_yesno` questions), validator: `CERT=dp-800 npx tsx factory/validate.ts --prefix dp800-sr1` → 24 files, 0 problem(s).

| Series | Domain | Objective | Decision tested | Yes at |
| --- | --- | --- | --- | --- |
| dp800-sr1-order-number | develop | 1.1.5 | Numbering shared by two tables: IDENTITY per table / sequence in a computed column / sequence in DEFAULT constraints | 3 |
| dp800-sr1-latest-order | develop | 1.3.2 | Latest order per customer with tie-break: ROW_NUMBER in WHERE / ROW_NUMBER in a CTE with OrderID tie-break / RANK in a CTE | 2 |
| dp800-sr1-report-procs | secure-deploy | 2.1.4 | Procedures only, future ones included: GRANT EXECUTE ON SCHEMA / + db_datareader / database-level GRANT EXECUTE | 1 |
| dp800-sr1-last-seat | secure-deploy | 2.2.2 | Lost update (overbooking): RCSI / UPDLOCK on the read / conditional UPDATE + @@ROWCOUNT | 2 and 3 |
| dp800-sr1-indexed-search | ai | 3.2.4 | Use the vector index: VECTOR_SEARCH + TOP (N) WITH APPROXIMATE / VECTOR_DISTANCE / deprecated TOP_N on a latest-version index | 1 |
| dp800-sr1-rag-context | ai | 3.3.3 | JSON array for the model: STRING_AGG concatenation / FOR JSON PATH, WITHOUT_ARRAY_WRAPPER / FOR JSON PATH | 3 |

Difficulty: 4 easy, 11 medium, 3 hard.

## Overlap checks

- The RCSI-versus-ALLOW_SNAPSHOT_ISOLATION reader-blocking decision is already in `dp800-cs2b-report-blocking`, so the 2.2.2 series tests writer conflicts (lost update) instead, where RCSI is the wrong answer.
- `dp800-cs2c-vector-index` already tests the index/query metric match, so the 3.2.4 series uses the deprecated `TOP_N` syntax as its hard trap, not a metric mismatch.

## Facts not stated word for word on a fetched page

- "A window function can't appear in WHERE" (latest-order-1): this is standard engine behaviour (error 4108). The ROW_NUMBER and OVER pages show the CTE-filter pattern, but neither states the rule directly.
- Update locks are incompatible with each other (last-seat-2): the Table Hints page says UPDLOCK is held until the transaction ends. The U/U incompatibility comes from the lock compatibility matrix, which was not fetched.
- Ownership chaining (report-procs-1/2): the dedicated ownership-chains page could not be fetched (client error). The fetched tutorial "Ownership Chains and Context Switching" shows the behaviour, and that page is cited instead.
- Database-level EXECUTE implying EXECUTE on every schema (report-procs-3): taken from the permission hierarchy table on GRANT Schema Permissions ("implied by database permission: EXECUTE").
- JSON_ARRAYAGG(JSON_OBJECT(...)) was considered for rag-context but dropped: the JSON_ARRAYAGG page does not document whether nested JSON function output is kept as JSON inside the aggregate.
