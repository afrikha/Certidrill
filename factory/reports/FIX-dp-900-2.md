# FIX-dp-900-2 — chapters 31, 32, 41, 42, 43 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert dp-900 31-azure-storage 32-cosmos-db 41-large-scale-analytics 42-real-time-analytics 43-power-bi` 0 problems; `content:validate --cert dp-900` 0 problems, 0 warnings; `check-quiz dp-900 31-azure-storage 32-cosmos-db 41-large-scale-analytics 42-real-time-analytics 43-power-bi` 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block or section marker changed. The shared WebFetch budget ran out twice during the pass; every change below rests on a page fetched in this pass.

## 31-azure-storage

| Finding | Learn | Change |
| --- | --- | --- |
| Smart tier missing | Confirmed (storage/blobs/access-tiers-smart): **generally available** in public cloud regions with zonal redundancy (public preview in Azure Government and Azure in China). Set as the default account access tier; moves block blobs hot → cool (30 days without access) → cold (90 days), back to hot on access; no archive; standard GPv2 with ZRS, GZRS or RA-GZRS; no early-deletion or tier-transition charges. The access-tiers overview lists it without a preview label. The DP-900 training unit doesn't mention it | blob-tiers-data-lake: new bullet (FR « niveau intelligent », glossary) |
| Turbo tier | Confirmed **Preview** (access-tiers-overview) | None (preview, not added) |
| Rehydration "can take hours" | Confirmed "up to 15 hours" (training unit 2, access-tiers-overview; archive-rehydrate-overview: standard priority up to 15 hours, high priority under one hour for objects under 10 GB) | Rehydration bullet: "up to 15 hours" |
| OneLake built on ADLS Gen2 | Not re-fetched; the chapter's "works with it" stays true | None |
| Table storage "semi-structured" vs Table docs "structured NoSQL data" | Not re-fetched; the chapter follows the training unit (QZ report) | None (already reported in Q-dp-900-3a) |

## 32-cosmos-db

| Finding | Learn | Change |
| --- | --- | --- |
| MongoDB migration → Azure DocumentDB | Confirmed (training explore-non-relational-data-stores-azure/3-cosmos-db-apis): to migrate an existing MongoDB application or use the full MQL feature set, Microsoft recommends Azure DocumentDB, a separate service with MongoDB wire protocol compatibility. Same unit: API chosen at account creation; Cosmos DB for PostgreSQL on a retirement path | cosmos-db-apis: new sentence before the PostgreSQL sentence |
| Consistent prefix definition | **Learn disagrees**: the training unit 2 (updated 2026-10-13) says "Reads never see out-of-order writes but may see stale data"; consistency-levels (updated 2026-04-27) says single-document writes "see eventual consistency" and only transactional batches keep the prefix guarantee. The doc is more specific, the training unit (exam content) more recent | None. For a human decision |
| Other facts the quiz relies on | Confirmed (training unit 2): < 10 ms at P99, 99.999 % SLA with multi-region writes, shared throughput up to 25 containers, serverless single region, 20 GB logical partition, all properties indexed, Session most widely used | None |
| Can't switch dedicated/shared throughput; API for Table creates tables at account level | Not re-fetched; beyond fundamentals depth | None |

## 41-large-scale-analytics

| Finding | Learn | Change |
| --- | --- | --- |
| Semantic model, DAX, Direct Lake | Confirmed (examine-components-of-modern-data-warehouse/2-describe-warehousing): semantic model with measures in DAX computed at query time; in Fabric, Direct Lake loads Delta tables from OneLake without importing a copy | Analytical data model row extended |
| Warehouse vs Lakehouse criteria | Confirmed (unit 4-analytical-data-stores): Warehouse when data is structured, the team writes SQL, and strong schema enforcement and concurrency for many simultaneous users are needed; Lakehouse for mixed or semi-structured data or machine-learning workflows | Requirement table: T-SQL row extended, new Lakehouse row |
| Combined solutions | Confirmed (unit 4): ELT into the lake, Azure Databricks notebook, load into a Fabric Warehouse | New sentence after the requirement table |
| Quiz q7 (mirroring column selection), q4 (Unity Catalog metastore distractor) | Quiz doubts, not chapter facts | None |

## 42-real-time-analytics

| Finding | Learn | Change |
| --- | --- | --- |
| Lambda architecture not named | Confirmed (explore-fundamentals-stream-processing/2-batch-stream): "a common pattern for combining batch and stream processing"; delta and kappa named as out of scope | One sentence in batch-vs-stream (EN "lambda architecture", FR « architecture lambda ») |
| Queue "keeps events in order"; Event Hubs ordering | Confirmed (unit 3-explore-common-elements): a queue ensures events are processed in order and each only once; Event Hubs delivers events in order within a partition, with at-least-once delivery | stream-architecture: step 2 sentence; Event Hubs in the Sources row |
| Sources and sinks lists | Confirmed (unit 3), identical to the chapter | None |
| AI assistance generating KQL; eventstream Spark Notebook destination and SQL operator (preview) | Not re-fetched; previews, not tested | None |
| Quiz q10: Kafka as wrong component | Unit 3 still calls Kafka "an open-source data ingestion solution commonly used together with Apache Spark" | None (reviewer choice, see QZ report) |

## 43-power-bi

| Finding | Learn | Change |
| --- | --- | --- |
| Report "Data alerts: No" | Confirmed nuance: service-set-data-alerts covers dashboards and points to "Create Fabric Activator alerts in Power BI reports"; activator-get-data-power-bi describes alerts on report visuals (Fabric capacity workspace, edit access, tenant setting; no preview label) | Report/dashboard table, Data alerts row |
| Alert tile types | Confirmed (service-set-data-alerts): only tiles pinned from report visuals, only gauges, KPIs and cards, numeric data only | Same row, dashboard column |
| DirectQuery "no scheduled refresh" | Confirmed (connect-data/refresh-data): no data refresh needed for DirectQuery; dashboard tiles still refresh about every hour (changeable) | Storage-mode table, DirectQuery row |
| Direct Lake sources | Not re-fetched; "Delta tables in OneLake" stays right at DP-900 level | None |
| Snowflake hierarchy guidance; Dual mode (quiz Q6) | Not fetched; not in the chapter, not tested | None |

## Mock-exam bank questions changed

None. Of the 224 questions on objectives 3.1.1–3.1.3, 3.2.1–3.2.2, 4.1.1–4.1.3, 4.2.1–4.2.2 and 4.3.1–4.3.3, none contradicts a confirmed fact.

## Checked and left unchanged

- Rehydration and tiers: dp900-3a-blob-archive-rehydrate, -tiers-cost-yn (already says up to 15 hours), -lifecycle-cold-reports, -archive-compliance, -lifecycle-actions, -order-tier-cost (four tiers by storage cost; smart tier isn't a cost tier of its own). None has smart tier as an option, and "Hot is the default access tier" stays true.
- MongoDB: dp900-3b-api-mongodb-skills (a new application, not a migration), -api-compat-benefit, -api-document-pair, -mongodb-format, -dd-api-scenarios, -dd-api-models, -api-new-documents. None makes Cosmos DB for MongoDB the answer for migrating an existing MongoDB application.
- Consistency: no bank question uses Consistent prefix (dp900-3b-yn-consistency-levels tests Eventual, Strong, Bounded staleness; dp900-3b-session-consistency tests Session).
- Power BI alerts and storage modes: dp900-4b-pbi-yn-dashboard-features (alerts on card tiles: still true), -pbi-copilot, -pbi-scheduled-refresh, dp900-4c-model-import-directquery-yn, -model-direct-lake.
- Streaming: dp900-4b-bs-queue-source (already "in order, and only once each"), -rt-event-hubs.
- Warehouse/Lakehouse: dp900-4a-svc-fabric-warehouse, -svc-fabric-lakehouse, -svc-both-platforms-statements. They agree with the new rows.

## Quiz files

None changed. All five quizzes still agree with the corrected chapters (check-quiz 0/0). The quiz 43 explanation "Data alerts are set on dashboard tiles, such as a card" still holds.

## For a human decision

- **Consistent prefix** (chapter 32 table and training unit vs consistency-levels doc), see above. If the doc wins, the row could become "Writes committed together in a transaction are never seen out of order; single-document writes behave as eventual". The bank doesn't depend on it, and quiz 32 uses it only as a distractor.
- **Smart tier** is GA in public cloud regions but not in the DP-900 training unit. It's added as one bullet. The owner may prefer to drop it to stay closer to the training content.
- French terms not in the glossary, used in the new text: « architecture lambda », « remise au moins une fois (at-least-once) », « flux de travail de machine learning », « application stricte du schéma ».
