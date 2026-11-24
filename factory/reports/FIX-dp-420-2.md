# FIX-dp-420-2 — chapters 22, 23, 24, 31, 32, 33 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert dp-420 22-availability-recovery 23-performance 24-fleet-management 31-ai-retrieval 32-agent-memory 33-operational-analytics` 0 problems; `content:validate --cert dp-420` 0 problems, 0 warnings; `check-quiz dp-420` (same chapters) 0 problems, 0 warnings.

Every chapter change was made in EN and FR, with the same sections, tables and callouts. Code blocks changed: the `EnableNoSQLVectorSearch` bash block was removed from 31 (both languages), and `DR.[ResourceGroup]` was removed from the fleet analytics sample query in 24 (both languages). The web-fetch budget ran out twice during the pass (shared hourly limit). Every change below rests on a page fetched in this pass.

## 22-availability-recovery

| Finding | Learn | Change |
| --- | --- | --- |
| Restoring a deleted database brings back its child containers | Confirmed: the how-to restore page says "Child containers are also restored". The in-account intro says shared-throughput containers come back with their database, and that a container restore needs its database present | Restore rules bullet: the database restore also restores its child containers |
| Same-account restore limits | Confirmed (restore-in-account-continuous-backup-introduction): the resource must have been in the **current write region** at the restore time; no restore while an account-level operation (add/remove region, failover) is running; a restore fails if another restore of the same resource is in progress | New bullet in the restore rules |
| PPAF GA or preview | The PPAF page has no preview or GA label. Prerequisites, SDK versions and the Business Critical tier match the chapter | None |
| Periodic limits (1–24 h, retention ≥ 2× interval, ≤ 720 h, raise retention to 7 days within 8 h) | Confirmed (periodic-backup-modify-interval-retention) | None |

## 23-performance

| Finding | Learn | Change |
| --- | --- | --- |
| Metrics retention: "30 days" (latency section) vs "90 days" (exam tip) | Azure Monitor "Metrics in Azure Monitor": platform metrics are **stored 93 days**, and one chart shows at most 30 days. The Cosmos DB latency page says only that you can view 30 days. The Fleet Analytics page says 90 days (see "For a human decision") | Latency section: "stored 93 days (a single chart in the metrics view shows at most 30 days)". Exam tip: 93 days |
| DataUsage / IndexUsage deprecated | Confirmed (monitor-reference): `(deprecated) Data Usage` / `Index Usage`, replaced by `DataUsageV2` / `IndexUsageV2` with the same display names | Insights storage tip: one sentence with the V2 names |
| PartitionKeyStatistics "under about 1 GB may not appear" | Confirmed (monitor-reference, `CDBPartitionKeyStatistics`: "Partition keys that are below 1GB of storage may not show up") | None (`dp420-2d-log-pk-stats-missing` is correct) |
| 429 alert example uses Total Request Units | Confirmed (create-alerts): Total Request Units, StatusCode = 429, aggregation Total, Greater than 100, static. Total Requests supports only Count (monitor-reference) | Alerts section: one sentence on Learn's example. The table row (Total Requests, Count) stays |
| Server Side Latency deprecated | Confirmed (monitor-reference: removed end of August 2025) | None |

## 24-fleet-management

| Finding | Learn | Change |
| --- | --- | --- |
| Preview status | Fleet Analytics and Fleet Analytics Schema Reference pages are titled "(Preview)". The objectives 2.4.1/2.4.2 name fleets and fleet analytics | None. The chapter already says fleets and fleet analytics are in preview. Flagged below |
| `DimResource.ResourceGroup` | Schema reference: DimResource = ResourceId, FleetId, SubscriptionId, AccountName, Region, DatabaseName, CollectionName, ResourceType. `ResourceGroup` is a column of **FactAccountHourly**. The Fleet Analytics page has no sample query | Tables: DimResource row lists the real columns ("no resource group"), FactAccountHourly row adds `ResourceGroup`. Sample query: `DR.[ResourceGroup]` removed from SELECT and GROUP BY |
| Tables and columns not in the chapter | Schema reference: FactRequestHourly has OperationName, StatusCode, TotalRequestChargeInRU; there are also FactFleetHourly, DimStatusCode, DimOperationName, DimResourceName, DimSubStatusCode | FactRequestHourly row: `TotalRequestCount` and `TotalRequestChargeInRU` per resource, operation and status code. The other tables weren't added (not needed for the exam's level) |
| Metrics retention in the comparison table | See 23 | 90 → 93 days |
| Max RU/s rule, Create a Fleet wording | Not re-fetched (budget) | None |

## 31-ai-retrieval

| Finding | Learn | Change |
| --- | --- | --- |
| Vector search enablement | Integrated Vector Store page: "Azure Cosmos DB enables vector indexing and search by default. You don't need to register the feature or enable an account capability." The hybrid search page's step 1 links to that section. The RRF page still says hybrid search "requires enrollment in Azure Cosmos DB NoSQL Vector Search" (older text). I followed the vector store page, which is the most specific page for this | vector-design: the `EnableNoSQLVectorSearch` command and the "15 minutes" sentence became "on by default; older pages still mention the capability". Hybrid prerequisites: "full-text search enabled on the account (vector search is on by default)". Key points updated |
| Full-text enablement | Use Full-Text Search names no account feature for core full-text and doesn't say whether it's on by default. Only multi-language support (early preview) needs enrollment in "New features for full-text search". The RRF page: "requires enrollment in the Azure Cosmos DB NoSQL Full Text Search feature" | None (the chapter keeps "full-text and hybrid search feature enabled"). Flagged below |
| Changing a vector policy | Vector store page: you can add or remove paths, not change one (drop, then re-add). Hybrid page: "vector policies and vector indexes are immutable after creation… create a new collection" | None (the chapter already gives both options) |
| HPK + vector search | Confirmed (vector store page: contact cosmossearch@microsoft.com) | None (already in 31). Added to 32 |
| Shared throughput, 1,000-vector minimum | Confirmed (vector store page) | None |

## 32-agent-memory

| Finding | Learn | Change |
| --- | --- | --- |
| Agent Memory Toolkit is preview, and two bank questions make toolkit behavior the answer | Confirmed: "Agent Memory Toolkit (Preview)", "This feature is currently in preview…". Objectives 3.2.x don't name the toolkit | Chapter already labels it preview. Two bank questions rewritten (below) |
| HPK containers + vector search need the account configured | Confirmed (vector store page) | Indexing paragraph: one sentence |
| TTL counts from "last modified time", chapter says `_ts` | Not a contradiction (`_ts` is the last-modified timestamp) | None |

## 33-operational-analytics

| Finding | Learn | Change |
| --- | --- | --- |
| Mirrored database operation logs are preview | Confirmed: H1 "Mirrored database operation logs (Preview)"; table `MirroredDatabaseTableExecution`, `ReplicatorBatchLatency` in seconds | monitor-mirroring: "(preview)" on the workspace monitoring logs and in the exam tip. Key points: statuses (portal or REST API) and, in preview, `MirroredDatabaseTableExecution`. Monitor page (no preview label): status through the Fabric mirroring REST API **or SDK** |
| Private-network prerequisites | Confirmed (azure-cosmos-db-private-network): workspace in the account's region; `Microsoft.PowerPlatform` registered on the subscription; dedicated `/27`+ gateway subnet delegated to `Microsoft.PowerPlatform/vnetaccesslinks`; creation through the Fabric REST API | Private endpoint paragraph: provider registration and gateway subnet added |
| Spark write strategies only in the GitHub configuration reference | Not re-fetched. No Learn page contradicts the table | None. Flagged below |
| Learn conflicts (FAQ on private endpoints, read region, 8 KB vs 2 MB strings) | Not re-fetched | None |

## Mock-exam bank questions changed (9)

- `ai-analytics/dp420-3a-vec-enable-cli` (3.1.2, single, d1): **rewritten**. The answer was `--capabilities EnableNoSQLVectorSearch`, which current Learn says isn't needed. The question is now "prepare the deployment with minimal effort"; the answer is to create the containers with their vector policies and change nothing on the account. Distractors: analytical storage, continuous backup, multi-region writes. The id still ends in `-cli`, because ids can't change.
- `ai-analytics/dp420-3a-hybrid-features` (3.1.5, multi, d1): the answer "Vector Search for NoSQL API" was contradicted. Now "Which two actions": enable Full Text & Hybrid Search for NoSQL API, and add a full-text index (both from the RRF remarks). Stem states the vector policy, vector index and full-text policy. References: RRF and Integrated Vector Store.
- `ai-analytics/dp420-3a-vshard-migrate-order` (3.1.3, ordering): "on which vector search is not enabled" removed. The `enable` step dropped from the answer (count 4 → 3: create, copy, query) and became an explained distractor. The `alter` explanation now says that articles has no vector embedding policy, not that vector search can't be used on existing containers, which conflicts with the vector store page. Added the vector store reference and removed the unfetched .NET page (2 references).
- `ai-analytics/dp420-cs2b-rulings-rag` (3.1.7, ordering, case study): the `feature` step dropped from the answer (count 5 → 4) and became an explained distractor. Explanation EN + FR updated. Reference title corrected to "Integrated Vector Store - Azure Cosmos DB".
- `ai-analytics/dp420-3b-sem-item-type` (3.2.3, single, d1): **rewritten**. The answer was the toolkit's `fact` type (preview). Now: a preference stated in a turn (turns container, 30-day TTL) must be recalled months later in other threads, so it goes in a long-term memory item of the traveler with no TTL (agentic-memories: short-term memory deleted by TTL, long-term memory holds user preferences across threads). First version (embedding-model mismatch) dropped: no fetched Learn page states the same-model rule.
- `ai-analytics/dp420-3b-mem-toolkit-storage` (3.2.1, multi, d2): **rewritten**. It was about the toolkit's local vs Cosmos DB storage (preview). Now: an in-process prototype moves to six stateless instances, and the two choices are one item per turn and `/threadId` partitioning. Distractors: thread document, GUID per item, session affinity. Reference: agentic-memories (recommended per-turn model, threadId and GUID trade-offs). The 2 MB claim was avoided: that page says the NoSQL limit "can be more".
- `ai-analytics/dp420-3c-mirror-latency-kql` (3.3.2, dropdown, d2): **rewritten**. The answer relied on `MirroredDatabaseTableExecution`, which is preview. Now a runbook on Monitor replication (no preview label): Last completed, Rows replicated, database status Paused, and the Fabric mirroring REST API. `dp420-3c-mirror-status-grid` already tests the table statuses, so they aren't tested again here.
- `secure-optimize/dp420-2d-fa-chargeback-tool` (2.4.2): explanations "90 days" → "93 days" (answer unchanged).
- YAML only, content unchanged: `ai-analytics/dp420-3b-perf-diskann-build-policy` and `dp420-cs1c-chunk-vectors`: `text: /embedding/?` quoted, so PyYAML (YAML 1.1) can parse them (reported by QZ-22 and QZ-33).

## Quiz files

- `quizzes/24-fleet-management.yaml`: the explanations of the metrics/logs/fleet analytics question said "kept 90 days" (EN + FR, two places). Now "stored 93 days", to match the chapters. The answer doesn't change. The other quizzes didn't need changes (check-quiz 0/0).

## Checked and left unchanged

- 22: restore questions (`dp420-2b-bk-same-account`, `-after-inaccount`, `-restore-cli`, `-periodic-steps`, `-choose-option`, `dp420-sr1-deleted-container-*`): none contradicts the child-container or write-region rules.
- 23: `dp420-2d-log-pk-stats-missing` (1 GB confirmed); `dp420-2c-al-cli-throttling`, `dp420-sr2-alert-throttling-*` (Total Requests, Count, confirmed); `dp420-2c-ix-production-usage` (option "Index Usage" is still the V2 display name); `dp420-2c-al-normalized-ru`, `-logical-partition` (Total Request Units as a distractor stays wrong for those requirements).
- 24: the DimResource questions (`dp420-2d-fa-backup-audit-tables`, `-meter-usage-sql`, `-table-match`, `-spark-adls`) don't use `ResourceGroup` from DimResource.
- 31: stems that state "vector search is enabled on the account" (`dp420-3a-vec-index-type-match`, `dp420-3a-vsearch-dotnet-container`, `dp420-3b-perf-vector-statements`, case study `dp420-cs3b-lucerne-publishing`) are harmless. `dp420-3a-fts-french-preview` uses `EnableNoSQLVectorSearch` only as a distractor. The full-text questions that state the Full Text & Hybrid Search feature is enabled (`dp420-3a-fts-contains-ru`, `-fts-index-prereqs`, `-fts-policy-json`) are unchanged.
- 32: other questions that cite the toolkit page (`dp420-3b-sem-reconcile`, `-conv-summary-compaction`, `-sem-user-summary`, `-sem-extraction-trigger`, `dp420-cs4a-conversation-container`) test generic designs, not toolkit behavior.
- 33: `dp420-3c-analytics-tool-match`, `-tsql-warehouse-join`, `-spark-explode-stops` use workspace monitoring only as a distractor.

## For a human decision

- **Fleets are preview** (Fleet Analytics and its schema reference are titled "(Preview)"), but objectives 2.4.1/2.4.2 are only about fleets. Chapter 24, its quiz and the ~26 bank questions keep them as answers (FIX-AGENT exception). Confirm.
- **Learn conflict on enablement.** Vector store page: vector search on by default. The RRF page and the indexing policies page still require enrollment in NoSQL Vector Search; RRF and indexing policies also require the Full Text & Hybrid Search feature, which the Full-Text page doesn't mention. I followed the vector store page for vector search and kept the full-text feature. If Microsoft has also made full-text on by default, `dp420-3a-hybrid-features` (option b), the full-text stems and chapter 31 (full-text section, hybrid prerequisites) will need the same treatment.
- **Out of scope (objective 1.x, another agent):** `develop/dp420-1e-kitai-enable-vector` makes "Enable the Vector Search for NoSQL API feature" the correct answer, which the vector store page now says isn't needed.
- **Metrics retention**: Azure Monitor says 93 days, the Fleet Analytics comparison table says 90 days. I used 93 (chapters 23 and 24, quiz 24, `dp420-2d-fa-chargeback-tool`).
- Chapter 31 says "Once enabled on a container, vector search can't be disabled"; the vector store page now allows removing vector paths. Not on a fetched page either way, so left unchanged.
- Chapter 32 (and the mock bank) use the 2 MB item limit for the thread-document trap. The agentic-memories page says the limit is "2 MB for some APIs, though in NoSQL it can be more". Not changed; worth checking concepts-limits.
- 33: the Spark write strategies other than `ItemOverwrite`/`ItemPatch` (`ItemAppend`, `ItemOverwriteIfNotModified`, `ItemDelete*`, `ItemPatchIfExists`) are documented only in the connector's GitHub configuration reference. `dp420-3c-patch-if-exists` and `dp420-3c-spark-etag-overwrite` cite a Learn tutorial that doesn't cover their answer. Decide whether a non-Learn source is acceptable.
- Not verified on a fetched page (left as is): `DurationMs` = server-side duration (23 and `dp420-2d-log-columns-statements`); "Metrics are free" (exam tip 23); PPAF GA status (no label either way); `dp420-3a-vpart-tenant-hotarea` references `/azure/cosmos-db/nosql/multi-tenancy-vector-search` (QZ-31 fetched `/azure/cosmos-db/multi-tenancy-vector-search`).

## French terms

No « appairé » or other glossary term to avoid in the six chapters. New French in this pass: « région d'écriture actuelle », « opération au niveau du compte », « conteneurs enfants », « journaux d'opérations des bases de données en miroir (préversion) », « fournisseur de ressources … inscrit », « sous-réseau … délégué à », « stockées 93 jours ». None is in the glossary or under `undecided`.
