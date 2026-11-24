# QZ-dp-420-23-performance — notes

`content/dp-420/quizzes/23-performance.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.3.1 (q1, q3, q10), 2.3.2 (q2, q6), 2.3.3 (q5), 2.3.4 (q7), 2.3.5 (q4, q9), 2.3.6 (q8). Positions 6–10: single, yesno_statements, dropdown (kusto), multi, dropdown (json).

## Chapter vs current Learn (fix in the chapter, not done here)

- **Retention of metrics, internal inconsistency.** The latency section says latency metrics are "kept 30 days in the metrics view"; the exam tip of the logs section says metrics are "kept 90 days". One of the two is wrong (Azure Monitor platform metrics are generally kept 93 days); I didn't verify which applies to Cosmos DB and didn't use either figure.
- **Data Usage / Index Usage are deprecated metrics.** "Azure Cosmos DB monitoring data reference" lists `DataUsage` and `IndexUsage` as deprecated, replaced by `DataUsageV2` and `IndexUsageV2` (same display names). The chapter's Insights storage tip is still valid, but any alert or question on these metrics should use the V2 names.
- **PartitionKeyStatistics cutoff.** The chapter says keys "under about 1 GB may not appear". The alert page "Create alerts to monitor if storage for a logical partition key is approaching 20 GB" only says the logs show keys with "significant storage size", with no figure. The 1 GB value may come from another page; I didn't verify it (the mock question `dp420-2d-log-pk-stats-missing` relies on it).
- **429 alert example.** "Create alerts for Azure Cosmos DB using Azure Monitor" uses the **Total Request Units** signal with StatusCode 429 and the Total aggregation; the chapter table uses **Total Requests** with Count. Both work, but the chapter could mention the Learn example.
- Confirmed as written: string functions that use the index; ORDER BY for CONTAINS/EndsWith/RegexMatch/case-insensitive StartsWith; GetCurrent* functions; GROUP BY → materialized view from the change feed; empty pages and draining; 30,000 RU/s / 100 GB threshold; JOIN subqueries; metric definitions (DocumentWriteTime = serialization of output) and the projection example; 1,000 RU/s ÷ 5 RU = 200 queries/s; composite index uses existing range indexes until built; dropping an indexed path is immediate (scan); computed properties (20 max, VALUE, no WHERE, not covered by `/*`, usable in composite indexes, ORDER BY requires indexing); CPU 40 % / 70 %, watch the 10-second maximum; SNAT on VMs without public IP, single client first; Region Failed Over (Count) and Service Availability (Minimum/Average/Maximum, grain 1 h or more); CDBDataPlaneRequests and CDBQueryRuntimeStatistics columns.

## Not verified on a fetched page

- q8 relies on `DurationMs` being the server-side duration (chapter and mock `dp420-2d-log-columns-statements`); the table reference page gives the column but not its definition.
- q9 doesn't state whether Region Failed Over also counts per-partition failovers; the scenario uses service-managed failover only.

## Design notes

- New decisions compared with the mock bank: StartsWith uses the index, throughput sizing from the charge, draining after an empty page, log search alert on PartitionKeyStatistics for the 20 GB limit, waiting for the composite index transformation, DocumentWriteTime and projection, CPU maximum vs average plus SNAT, a KQL summary with sum and percentile, Region Failed Over plus Service Availability (hourly grain trap), and a container definition combining a computed property, its included path and a composite index for ORDER BY.
