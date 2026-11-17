# K-ai-200-sr1 — report

6 Yes/No series (18 `series_yesno` questions), validator: `CERT=ai-200 npx tsx factory/validate.ts --prefix ai200-sr1` → 24 files, 0 problem(s).

| Series | Domain | Objective | Decision tested | Yes at |
| --- | --- | --- | --- | --- |
| ai200-sr1-secret-update | containers | 1.2.1 | Container Apps secret update: secret set only / + revision restart / + `--set-env-vars` (creates a revision) | 2 |
| ai200-sr1-cpu-autoscale | containers | 1.2.3 | AKS HPA manifest + CPU requests / fixed `replicas` / HPA without requests | 1 |
| ai200-sr1-search-capacity | data | 2.2.4 | PostgreSQL CPU-bound vector reads: PgBouncer / read replica / more storage | 2 |
| ai200-sr1-private-functions | integration | 3.2.2 | Python function app, VNet + scale to zero: Premium / Linux Consumption / Flex Consumption | 3 |
| ai200-sr1-rotated-key | secure-monitor | 4.1.1 | Key Vault Reader / version pinned in app setting / Secrets User + `get_secret(name)` | 3 |
| ai200-sr1-slow-requests | secure-monitor | 4.2.2 | KQL `summarize percentile` + `top` / + `take` / `top` on raw rows | 1 |

Difficulty: 6 easy, 9 medium, 3 hard. Each series has exactly one Yes.

## Deviations and doubts

- Domains: 6 series over 4 domains, so containers and secure-monitor have two series each and data only one. The case studies already cover most data decisions (point reads, partition key, vector policies, change feed, TTL/eviction, HNSW/IVFFlat, PgBouncer, Entra tokens, tier memory), and the WebFetch budget ran out (shared, HTTP 403) before a second data scenario could be verified (pgvector `maintenance_work_mem` and Cosmos `OFFSET LIMIT` RU growth are not stated on the pages fetched).
- `az containerapp update --set-env-vars KEY=secretref:name`: syntax not re-fetched (budget); the revisions page only says container configuration is revision-scope. The page does not name environment variables explicitly.
- search-capacity-3 (storage size) cites the read-replicas page; no fetched page states that storage size does not add CPU.
- Linux Consumption: functions-scale lists it as "Retired" in one table and "retiring on 30 September 2028" in the text; the explanation says "retiring".
- `SecretClient.get_secret(name, version=None)` returning the latest version was checked in the azure-keyvault-secrets 4.12.0 wheel, not on a Learn page (fetch refused). Key Vault role descriptions come from the fetched rbac-guide page; its exact title was taken from existing bank references.
- Reference titles for PgBouncer, top operator and AppRequests follow existing bank titles (pages fetched; Learn suffixes stripped).
