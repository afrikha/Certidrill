# FIX-az-305-1 — chapters 11, 12, 13, 21, 22 and 23 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert az-305 11-logging-monitoring 12-authentication-authorization 13-governance 21-relational-data 22-nonrelational-data 23-data-integration` 0 problems; `content:validate --cert az-305` 0 problems, 0 warnings; `check-quiz az-305` (same chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No section marker or code block changed.

## 11-logging-monitoring

| Finding | Learn | Change |
| --- | --- | --- |
| AMPLS: Private Only doesn't stop ingestion to other workspaces | Confirmed (logs/private-link-design, updated 2026-08-09): "Log Analytics ingestion uses resource-specific endpoints, so it doesn't adhere to AMPLS access modes"; block the public endpoints at the network firewall | routing, AMPLS paragraph: new sentence. Bank question fixed (below) |
| Workspace replication missing | Confirmed (logs/workspace-replication): paid; switchover triggered manually; secondary in the same region group; only data ingested after enabling; Auxiliary tables, VM insights, Container insights (and Application Insights) not replicated. GA/preview status not stated on the page | workspace-design table, "regional failure" row |
| Alert processing rules: Apply action groups and limits | Confirmed (alerts/alerts-processing-rules): suppression or apply action groups; scope within one subscription; no effect on Service Health alerts; up to 30 minutes to take effect | alerts-visualization, first paragraph |
| Management group diagnostic setting doesn't capture every subscription event | Confirmed (platform/activity-log): events without `hierarchy` don't propagate; keep a subscription-level setting | routing, first paragraph (parenthesis) |
| Minor: Sentinel free retention "31 days" vs 30 | Not re-fetched; the chapter (30 days, 90 with Sentinel) agrees with the retention page quoted by the QZ report | None |

## 12-authentication-authorization

| Finding | Learn | Change |
| --- | --- | --- |
| Key Vault tiers and FIPS | Confirmed (security/fundamentals/key-management-choose): Standard FIPS 140-2 Level 1; Premium FIPS 140-3 Level 3 for keys on HSM Platform 2, FIPS 140-2 Level 2 on HSM Platform 1; Premium symmetric keys in preview | key-vault table, Standard and Premium rows (preview symmetric keys not added: the table says "Keys") |
| Key Vault references: restart and refresh | Confirmed (app-service-key-vault-references): any configuration change restarts the app and refetches all secrets; a `configreferences/appsettings/refresh` endpoint forces resolution | key-vault bullet: restart sentence (refresh endpoint not added: implementation detail, out of AZ-305 scope) |
| Federation reasons | QZ report: consistent with the chapter | None |
| Microsoft Entra Kerberos prerequisites | Confirmed (howto-authentication-passwordless-security-key-on-premises): Microsoft Entra joined or hybrid joined devices; DCs on Windows Server 2016 or later (patched); at least one writable DC per site | authorize-on-premises table, Kerberos row |

## 13-governance

| Finding | Learn | Change |
| --- | --- | --- |
| Directory transfers blocked by default since May 1, 2026 | Confirmed (manage-azure-subscription-policy): no transfer in or out unless a Global Administrator allows it; Allow no users is the default where no explicit policy was set; only a Global Administrator with a direct assignment, after elevating access, edits the policies; exempted users list | subscription paragraph: last sentence rewritten |
| P2 access reviews: decision helpers for inactive users | Confirmed (id-governance/licensing-fundamentals): P2 has reviews of active and inactive users with decision helpers; inactive-only reviews, ML-assisted reviews, catalog reviews, auto assignment policies and lifecycle workflows need ID Governance | Licence table, P2 row |

## 21-relational-data

| Finding | Learn | Change |
| --- | --- | --- |
| Serverless auto-pause is preview in Hyperscale | Confirmed (serverless-tier-overview): "a preview feature of Azure SQL Database Hyperscale"; Hyperscale minimum and default delay 60 minutes; General Purpose minimum 15, default 60; Standard-series (Gen5) hardware only; not Business Critical | compute-tier table (Auto-pause and Available-in rows) and key points |
| PostgreSQL flexible server restarts after seven days | Confirmed (postgresql/flexible-server/overview): compute billing stops immediately; stays stopped seven days unless restarted sooner | Open-source paragraph (parenthesis, PostgreSQL only; MySQL not checked) |

## 22-nonrelational-data

| Finding | Learn | Change |
| --- | --- | --- |
| Per-request consistency "only relaxable" | Confirmed (cosmos-db/how-to-manage-consistency): classic `ConsistencyLevel` override only relaxes; `ReadConsistencyStrategy` (preview, Java SDK 4.69+, .NET SDK 3.46+, direct mode only) can strengthen reads | Consistency sentence |
| 99.999 % read and write for any multi-region account; Business Critical tier | **Ambiguous**: reliability-cosmos-db-nosql gives no figures and lists "multiple write regions (Business Critical tier)" as an SLA factor, linking to multi-region-writes, which doesn't mention any Business Critical tier; distribute-data-globally still says "99.999% read and write availability for multi-region databases" | None. For a human decision |
| Azure Files NFS on HDD (preview) and `Microsoft.FileShares` | Confirmed (files-nfs-protocol): SSD (LRS, ZRS) and HDD in preview (provisioned v2, LRS only); no GRS/GZRS; `Microsoft.FileShares` "recommended for new NFS deployments", standalone share without storage account. Its GA/preview status isn't stated | Azure Files paragraph. The exam trap ("NFS forces a premium file share account") left as is |
| Turbo tier (preview) | Preview, not in the chapter | None |

## 23-data-integration

| Finding | Learn | Change |
| --- | --- | --- |
| Synapse Data Explorer pool (preview) | Confirmed (synapse-analytics/data-explorer/data-explorer-overview): retired October 7, 2025, workloads deleted, migrate to Eventhouse in Microsoft Fabric | analytics-platforms table: row kept as "retired" (table shape unchanged), don't recommend it |
| Fabric Data Factory "recommended to teams that start a new project" | Confirmed nuance (data-factory/introduction): "If you're new to data integration, start with Fabric Data Factory"; existing ADF workloads can upgrade | integration paragraph |
| Stream Analytics outputs incomplete | Confirmed (stream-analytics-define-outputs): also Azure Data Explorer, Azure Functions, PostgreSQL, Service Bus queues and topics, Table storage, Kafka (preview) | Outputs bullet (Kafka not added: preview) |
| Synapse Link for Cosmos DB "no longer supported for new projects" (unverified in QZ) | Confirmed (cosmos-db/synapse-link): "no longer supported for new projects"; use Cosmos DB mirroring for Fabric (GA) | None (the chapter is right) |

## Mock-exam bank questions changed

- `questions/identity/az305-1a-route-private-ampls.yaml` (EN + FR): option b is now "AMPLS in Private Only mode and no other network control" (wrong); option c (still the answer) is "AMPLS with a private endpoint and a network firewall that blocks VNet1 traffic to the public endpoints of Azure Monitor". The old Open-mode option was dropped. Explanations rewritten; reference "Design Azure Monitor Private Link configuration" added. Why: ingestion doesn't follow access modes, so Private Only alone no longer meets "unable to send logs to a workspace that doesn't belong to Woodgrove".
- `questions/data/az305-2b-file-share-design.yaml` (EN + FR explanation): "NFS 4.1 requires SSD" became "in general availability requires SSD"; the `hdd` option explanation now says NFS on HDD exists only in preview (provisioned v2). The answer doesn't change.

## Checked and left unchanged

- 1.1.x: the other AMPLS items (`az305-1a-route-feature-match-dd`, `az305-1a-route-lighthouse-dd`), `az305-1a-mon-maintenance-suppress` (suppression, resource group scope), `az305-1a-route-policy-scale-order` (management group setting = management group events; consistent).
- 1.2.x: `az305-1b-kv-premium-hsm-keys` ("can protect keys in HSMs validated FIPS 140-3 Level 3": true for HSM Platform 2), `az305-cs2c-key-store` (Managed HSM FIPS 140-3 Level 3), `az305-cs3b-app-credentials`.
- 1.3.x: `az305-1c-mg-two-tenants` (transferring subscriptions is the wrong option; the new default makes it only more so).
- 2.1.x: no question makes Hyperscale auto-pause a correct answer; `az305-cs2c-database-scaling` (store databases under 5 GB, General Purpose implied), `az305-cs4b-audit-database`, `az305-2a-tier-no-resume-delay`, `az305-2a-tier-serverless-yn` are General Purpose or tier-neutral.
- 2.2.x: `az305-2b-consistency-facts` and `az305-2b-cosmos-cost-levers` ("override with a weaker level": true); `az305-2b-azure-files-facts`, `az305-2b-netapp-dual-protocol`, `az305-2b-data-lake-namespace`. The Cosmos DB multi-write questions named by the QZ report (`az305-2b-consistency-multiwrite`, `az305-2b-multiwrite-conflicts`, `az305-sr2b-*`) weren't changed: the Business Critical point is unresolved.
- 2.3.x: no bank question uses the Synapse Data Explorer pool or the Fabric Data Factory recommendation.

## Quiz files

None changed. All six quizzes still agree with the corrected chapters (check-quiz 0/0).

## For a human decision

- Cosmos DB availability: keep "99.999 % read and write for a multi-region account" (distribute-data-globally) or follow the reliability page, which ties multiple write regions to a "Business Critical tier" not described on any Learn page fetched. The figures themselves are in the SLA document, not on Learn.
- `Microsoft.FileShares`: Learn recommends it for new NFS deployments but doesn't say whether it is GA. If it is, the 22 trap "NFS forces a premium file share account" and the quiz/bank wording about premium accounts may need updating.
- Workspace replication: added as an option for regional resilience; the page doesn't label it GA or preview.
- French terms not in the glossary: « mis hors service » (retired; the AZ-104 pass used « retrait »), « préversion » (preview), « rubriques Service Bus » (topics), « Stockage Table » (Table storage), « points de terminaison propres à chaque ressource » (resource-specific endpoints), « groupe de régions » (region group), « aides à la décision » (decision helpers), « jonction hybride Microsoft Entra » (already used in 12).
