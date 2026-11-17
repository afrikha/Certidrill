# K-dp-420-cs4 — report

## Delivered

- `case-studies/dp420-cs4a-lamna-healthcare.yaml`: healthcare RAG assistant (Python). 6 questions:
  hybrid-query (3.1.5), vector-policy (3.1.3), conversation-container (3.2.2), masking-roles (2.1.4),
  backup-tier (2.2.1), protocol-metadata (1.3.3).
- `case-studies/dp420-cs4b-relecloud-tickets.yaml`: event ticketing (.NET). 6 questions:
  partition-design (1.3.5), hold-expiry (1.4.4), purchase-batch (1.2.4), partition-failover (2.2.3),
  hot-partition-kql (2.3.6), refunds-tsql (3.3.3).
- Types: 7 dropdown, 3 single, 1 multi, 1 dragdrop. Difficulty: 2 easy, 7 medium, 3 hard.

## Verified on Learn (Nov. 2026)

DDM (unmask action, Data Reader lacks it, Data Contributor has it); RRF weights / ORDER BY RANK; full-text
functions; vector index types and limits (flat 505 dims, quantizedFlat ≤ 50,000 vectors recommended);
sharded DiskANN `vectorIndexShardKey` as an array; continuous backup tiers (7/30/35 days, 30 and 35 charged);
change feed all versions and deletes (TTL deletes captured, `IsTimeToLiveExpired`, delete records have
metadata only, requires continuous backup); .NET `GetChangeFeedProcessorBuilderWithAllVersionsAndDeletes`;
transactional batch (same logical partition, 100 ops, 2 MB, 424 for other ops); HPK (3 levels, prefix can
exceed 20 GB, prefix queries targeted); PPAF prerequisites (single write + read region, not Bounded
staleness yet, .NET SDK ≥ 3.62.0); Fabric mirroring (continuous backup required, no multi-region-write
accounts, nested arrays via OPENJSON + OUTER/CROSS APPLY); CDBPartitionKeyRUConsumption columns.

## Doubts / not verified (WebFetch budget ran out)

- Python `create_container_if_not_exists(default_ttl=...)` and `query_items(partition_key=...)` keyword names
  are from SDK knowledge, not fetched this session.
- The 2 MB maximum item size (protocol-metadata explanation) was not re-fetched.
- Periodic backup distractor (backup-tier, option b): explanation says periodic restores go through
  Microsoft support; retention value not re-checked.
- The .NET all versions and deletes change feed processor is labelled "preview" on the Change Feed
  Processor page (SDK 3.60.0+).
- refunds-tsql: the SQL analytics endpoint table name `orders_archive` is stated in the stem (naming
  rule of mirrored tables not verified).
- Hybrid search: `vectorIndexShardKey` combined with HPK containers needs Microsoft contact, so case A
  keeps a single-level partition key on purpose.
