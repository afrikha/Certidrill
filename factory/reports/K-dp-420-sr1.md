# K-dp-420-sr1 — report

6 Yes/No series (18 `series_yesno` questions), validator: `CERT=dp-420 npx tsx factory/validate.ts --prefix dp420-sr1` → 24 files, 0 problem(s).

| Series | Domain | Objective | Decision tested | Yes at |
| --- | --- | --- | --- | --- |
| dp420-sr1-stock-overwrite | develop | 1.2.6 | Lost updates: Strong consistency / `IfMatchEtag` + 412 catch / `_etag` in body without request options | 2 |
| dp420-sr1-tenant-activity | develop | 1.3.5 | Large tenants + tenant-only queries: `/tenantId` (20 GB) / synthetic tenant-user key (fan-out) / HPK tenantId-userId-sessionId | 3 |
| dp420-sr1-keyless-orders | secure-optimize | 2.1.2 | Managed identity, keys disabled: Data Contributor at container scope / Cosmos DB Operator (control plane) / Data Contributor at `/` | 1 |
| dp420-sr1-deleted-container | secure-optimize | 2.2.1 | Self-service PITR 7 days, min cost: periodic 1 h/168 h / `--continuous-tier Continuous7Days` / continuous without tier (defaults to 30 days) | 2 |
| dp420-sr1-catalog-ranking | ai-analytics | 3.1.5 | Hybrid query: FullTextContainsAny filter + VectorDistance / RRF with projected FullTextScore / `ORDER BY RANK RRF(...)` | 3 |
| dp420-sr1-manual-chunks | ai-analytics | 3.1.2 | 3,072-dim vectors, 3 M chunks: diskANN dedicated throughput / flat (505 max) / diskANN on shared-throughput database | 1 |

Difficulty: 5 easy, 9 medium, 4 hard. Each series has exactly one Yes. Series dp420-sr2 (change feed leases, TTL) were checked to avoid overlap.

## Doubts and deviations

- 6 series over 3 domains: two series per domain (the task asks for a different domain each, impossible with 3 domains).
- `ItemResponse<T>.ETag` (stock-overwrite-2): `IfMatchEtag` is verified on the ItemRequestOptions API page; the ETag property of the response was not on a fetched page (standard .NET SDK v3 API).
- `ThroughputProperties.CreateAutoscaleThroughput` (tenant-activity) not re-fetched; HPK `ContainerProperties(id, partitionKeyPaths)` is from the HPK page.
- Vector page says vector indexing is not supported "on accounts with Shared Throughput"; manual-chunks-3 applies it to a shared-throughput database (the usual reading).
- Periodic backup: minimum interval (1 h) and retention bounds are not stated on the fetched page; deleted-container-1 does not rely on them for its answer.
- Learn inconsistency: continuous backup page now lists a 35-day tier (Continuous35Days) besides 7 and 30 days; migration defaults to Continuous30Days. 7-day tier: no backup storage charge, restores billed.
- Learn inconsistency: hybrid-search page says vector policies/indexes are immutable, vector-search page says paths can be added/removed. Not used in questions.
- `FullTextScore` cannot be projected nor used in `WHERE` (full-text page, explicit) — basis of catalog-ranking-2.
