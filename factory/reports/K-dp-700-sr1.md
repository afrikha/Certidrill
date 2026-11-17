# K-dp-700-sr1 — report

6 Yes/No series (18 `series_yesno` questions), validator: `CERT=dp-700 npx tsx factory/validate.ts --prefix dp700-sr1` → 24 files, 0 problem(s).

| Series | Domain | Objective | Decision tested | Yes at |
| --- | --- | --- | --- | --- |
| dp700-sr1-marketing-columns | manage | 1.3.3 | Warehouse CLS: table GRANT + DDM / column GRANT / ReadData + column DENY | 2 |
| dp700-sr1-feature-isolation | manage | 1.2.1 | Git: commit selected items in shared workspace / checkout new branch as Contributor / branch out to new workspace | 3 |
| dp700-sr1-product-dimension | ingest | 2.2.7 | PySpark denormalization: left joins + coalesce / inner joins / left joins from the wrong side | 1 |
| dp700-sr1-reference-join | ingest | 2.3.2 | Eventhouse: daily copy to native table / standard shortcut + `external_table()` / accelerated shortcut | 2 |
| dp700-sr1-avro-events | monitor | 3.2.5 | Eventstream deserialization errors: Event throughput / Manage fields cast / source with Avro data format | 3 |
| dp700-sr1-error-code-query | monitor | 3.3.6 | KQL: datetime first + `has` / `limit` / `extend` calculated filter | 1 |

Difficulty: 6 easy, 9 medium, 3 hard. Each series has exactly one Yes.

Objectives were chosen where the case studies had no question on the same decision (1.3.3 there is RLS code, 1.2.1 there is a Git conflict, 3.3.1 table maintenance already covered so not used).

## Deviations and doubts

- The shared WebFetch budget ran out (HTTP 403) partway through. Pages fetched and used: column-level-security, dynamic-data-masking, share-warehouse-manage-permissions, manage-branches, branched-workspace, onelake-shortcuts (KQL), kusto best-practices, datatypes-string-operators, add-source-azure-event-hubs, event-streams/monitor, configure-settings, training unit "Combine and aggregate data".
- Not fetched by me (reused from the bank / course): "Query acceleration for OneLake shortcuts - overview" (reference-join-3; caching and billing facts from course chapter 23); the Git permission table (Contributor + Read/Create branch for branch out; Contributor can't switch branch unless the admin setting is on) comes from course chapter 12, and branched-workspace only confirms the setting for existing target workspaces.
- avro-events-3 replaces the source rather than editing its Data format, because no fetched page says whether Data format can be edited after creation. "Manage fields" operator name not re-fetched this session.
- error-code-query-3: the best-practices page says "Don't filter on a calculated column"; the statement that such a filter can't use the Timestamp datetime index is our inference, consistent with course chapter 33.
- Reference titles use the H1 of each page (e.g. "Share your data and manage permissions", "Development process in Microsoft Fabric" for manage-branches).
