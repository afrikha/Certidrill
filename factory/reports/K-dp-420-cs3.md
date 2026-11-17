# K-dp-420-cs3 — report

3 case studies, 18 questions (prefix `dp420-cs3`), `CERT=dp-420 npx tsx factory/validate.ts --prefix dp420-cs3` → 21 files, 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| dp420-cs3a-alpine-ski-house | Ski resorts; IoT gate scans, C# on AKS, change feed projection, Fabric mirroring | scan-partition-key (1.3.2 single 1), usage-projector (1.4.1 dropdown 2), partition-failover (2.2.3 multi 3), index-metrics (2.3.3 dropdown 2), mirroring-permissions (3.3.2 multi 2), tsql-rides (3.3.3 dropdown 2) |
| dp420-cs3b-lucerne-publishing | Scientific publisher; Python RAG assistant on Container Apps, vector/full-text, agent memory | figure-vector-policy (3.1.2 dropdown 2), text-recall (3.1.6 single 3), keyword-filter (3.1.1 yes/no 1), semantic-memory (3.2.3 single 2), thread-partitioning (1.3.5 single 2), data-rbac (2.1.2 single 1) |
| dp420-cs3c-humongous-insurance | Insurance SaaS; account-per-tenant, .NET API, fleets, DDM, audit, Fabric write-back | fleetspaces (2.4.1 single 3), etag-update (1.2.6 dropdown 2), sdk-operations (1.2.4 dragdrop 1), data-masking (2.1.4 yes/no 2), audit-change-feed (1.4.4 single 3), spark-write-back (3.3.4 dropdown 2) |

Mix: single 7, dropdown 6, multi 2, yes/no 2, dragdrop 1. Difficulty 4 easy / 10 medium / 4 hard.

## Overlap avoided

The parallel case studies cs4a (Lamna) and the series sr2 already test the hybrid-search RRF weights, the diskANN type with `vectorIndexShardKey`, Data Reader lacking `unmask`, the 7-day continuous backup tier for mirroring, and a KQL hot-partition query. Lucerne and Alpine were redesigned to avoid these decisions (flat index for exact recall, `searchListSizeMultiplier`, Entra permissions for mirroring, index metrics).

## Points to review

- **Docs that contradict each other.** One page says vector policies and indexes can't be changed after creation (hybrid search page). Another says paths can be added or removed (vector search page). No question depends on this. Lucerne "recreates" the chunks container to stay safe.
- **PPAF.** The en-us page (no preview label; GA announced on the June 2, 2026 devblog) is used. The fr-fr page is stale: it says preview and "account restore not supported with PPAF". Prerequisites used: single write region plus at least one read region, no Bounded staleness, .NET SDK 3.62.0 or later, enable on the Features page.
- **Lease container `/id` partition key.** I could not confirm it on the current change feed processor page, so it isn't tested. It's only stated as a given in the Alpine environment.
- **Fabric mirroring.** The page says accounts with multiple write regions aren't supported (used in an explanation). It says Entra connections need `readMetadata` and `readAnalytics`. The SQL analytics endpoint table name (`passdays`, no schema) is assumed.
- **Spark connector.** The write-strategy semantics (`ItemOverwrite` = upsert, default; `ItemAppend` = create and ignore existing items) come from the GitHub configuration reference, not from a Learn page. The 20 % cap uses `targetThroughputThreshold`, as on the Learn reverse-ETL tutorial.
- **DDM `MaskSubstring` indexing.** The 0-based `startPosition` is worked out from the page example (Washington with (3,5) becomes WasXXXXXon).
- **Continuous backup.** A 35-day tier now exists besides 7 and 30 days. It isn't offered as an option; the 30-day tier is the cheapest tier that covers the 21-day freeze.
- **Not covered here (not verified).** Agent Kit (1.5.x), sharded DiskANN with hierarchical keys (the page asks you to contact Microsoft), and full-text multi-language support (preview).
