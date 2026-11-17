# K-dp-420-cs2 — report

3 case studies, 15 questions (prefix `dp420-cs2`), validator: 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type) |
| --- | --- | --- |
| dp420-cs2a-fourth-coffee | Coffee chain loyalty app: multi-region writes in 3 regions, C# API per region, keyless; Fabric-native store-inventory app | 1.1.1 single, 1.2.3 dropdown (conditional patch), 1.1.6 single, 2.2.2 single (LWW custom path), 3.3.1 single |
| dp420-cs2b-wide-world-importers | Freight forwarder: HPK review, synthetic keys, TTL retention, keyless Python job on a VM, RAG customs assistant | 1.3.7 yesno, 1.3.6 single, 1.2.5 single, 2.1.1 dropdown, 3.1.7 ordering |
| dp420-cs2c-vanarsdel | Smart-building SaaS: account per Enterprise tenant in a fleet + shared account, HPK, autoscale, query metrics, fuzzy full-text | 1.3.5 dropdown, 1.1.3 single, 2.4.1 multi, 2.3.2 multi, 3.1.1 dropdown |

Difficulty: 5 easy, 7 medium, 3 hard.

## Overlap with parallel agents (handled)

- My first drafts used Relecloud and Lamna Healthcare, which `dp420-cs4b-relecloud-tickets` and `dp420-cs4a-lamna-healthcare` had already taken (written a few minutes earlier). I renamed the cases Fourth Coffee and Wide World Importers. I also deleted every question that tested the same decision with the same answer as a cs1/cs3/cs4 question: Fabric mirroring prerequisites, T-SQL OPENJSON, per-partition failover prerequisites, hybrid RRF weights, sharded DiskANN, DDM roles, all-versions-and-deletes change feed, bulk execution, hot-partition KQL, Spark connector write-back, fleet analytics, Python pull model, and the TOP + VectorDistance query.
- Remaining partial overlaps:
  - `dp420-cs2c-fleet-pool` (which accounts can join a pool) uses the same rule (same regions and write tier) as `dp420-cs1b-tenant-pool` and `dp420-cs3c-fleetspaces`, but it asks a different question.
  - `dp420-cs2c-devices-hpk` (HPK code: `partitionKeyPaths`, `PartitionKeyBuilder`, `ReadItemAsync`) shares an objective with the HPK design questions `dp420-cs3b-thread-partitioning` and `dp420-cs4b-partition-design`.
  - `dp420-cs2c-fuzzy-codes` (fuzzy distance + `FullTextContainsAny`) shares an objective with `dp420-cs1a-search-box` (FullTextContainsAll + rank).
  - `dp420-cs2b-dispute-ttl` is close to the series `dp420-sr2-ttl-sessions` (container TTL + item `ttl: -1`). It adds the "reset ttl when the dispute closes" step.

## Facts not fully confirmed on a fetched Learn page

- `dp420-cs2a-client-region`: Learn confirms `ApplicationRegion` for multi-region writes. The geo-proximity ordering of the fallback regions, and the behaviour of a shared `ApplicationPreferredRegions` list, come from SDK knowledge, not from the fetched page.
- `dp420-cs2a-redeem-patch`: Learn confirms `PatchItemRequestOptions.FilterPredicate` and `PatchOperation.Increment`. The `"WHERE ..."` distractor is wrong because Learn's example starts with `FROM`.
- `dp420-cs2c-offline-query`: Learn suggests computed properties as a fix. That they must be added to the indexing policy explicitly is from memory.
- `dp420-cs2b-keyless-sync`: Python `DefaultAzureCredential()` with `CosmosClient(url, credential=...)`, plus the distractor properties `publicNetworkAccess` and `enableAutomaticFailover`, are standard but not quoted from a fetched page.
- `dp420-cs2a-inventory-store`: the Fabric Cosmos DB overview page does not say whether Cosmos DB in Fabric is GA. The answer relies only on automatic OneLake availability and the documented limits (50,000 RU/s autoscale per container, no Private Link).
- Multi-region write accounts: one Learn page (the Fabric mirroring limitations) says continuous backup and mirroring don't support them, while the continuous backup page describes how such accounts are restored. The only place I used this is in the explanation of a distractor in `dp420-cs2a-inventory-store`, citing mirroring.
- Code-block languages: `csharp` and `sql` (used by sibling DP-420 files) and `text`.
- The WebFetch budget ran out once during the task (it is shared by all agents). I verified all the facts above after it refilled.
