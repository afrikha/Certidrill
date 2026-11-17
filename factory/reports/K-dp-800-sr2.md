# K-dp-800-sr2 — report

5 Yes/No series, 15 questions (prefix `dp800-sr2`), validator: 0 problem(s). Difficulty: 4 easy, 8 medium, 3 hard.

| Series | Domain / objective | Answers (1, 2, 3) |
| --- | --- | --- |
| dp800-sr2-salary-history | develop 1.2.5 (multirow AFTER trigger) | No, Yes, No |
| dp800-sr2-place-order-errors | develop 1.3.8 (TRY...CATCH, THROW vs RAISERROR) | No, No, Yes |
| dp800-sr2-passwordless-app | secure-deploy 2.1.5 (App Service managed identity) | Yes, No, No |
| dp800-sr2-dab-product-cache | secure-deploy 2.4.2 (DAB runtime + entity cache) | No, Yes, No |
| dp800-sr2-article-similarity | ai 3.2.7 (exact search: VECTOR_DISTANCE / VECTOR_SEARCH without APPROXIMATE) | No, Yes, Yes |

## Doubts and deviations

- Overlap with sr1, which was running at the same time: I first wrote a sequence series (1.1.5) and a schema EXECUTE series (2.1.4). sr1 had written nearly the same two series (`dp800-sr1-order-number`, `dp800-sr1-report-procs`), so I deleted mine and wrote 1.3.8 and 2.1.5 instead. I moved the vector series from 3.2.4 to 3.2.7 because `dp800-sr1-indexed-search` uses 3.2.4. That sr1 series tests the opposite case (ANN with an index), so the two series are complementary, not duplicates.
- DAB cache: the Entities section page contradicts itself on the default of `entities.<name>.cache.enabled` (the table says false, the format block says true). The level 1 cache page says each entity must opt in, and dabcache-3 relies on that. The same page says caching "applies only to REST endpoints", so the scenario only uses REST.
- `VECTOR_SEARCH` without an index (similar-2): Learn says it runs as an exact kNN scan, and that `TOP (N)` without `WITH APPROXIMATE` is exact kNN. It is GA on Azure SQL Database, which is the platform in the scenario.
- pwdless-1/3 use `Authentication=Active Directory Default`, as the App Service tutorial does. The reference title is the tutorial's H1; its HTML title is different ("Securely connect .NET apps to Azure SQL Database using Managed Identity").
- The error-handling scenario is limited to run-time errors, because TRY...CATCH doesn't catch compile or name-resolution errors at the same level.
- Couldn't fetch: the ADO.NET "Ownership chains" page (it was only needed for the deleted 2.1.4 series).
