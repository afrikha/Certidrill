# FIX-az-305-2 — chapters 31, 32, 41, 42, 43, 44 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert az-305 31-backup-disaster-recovery 32-high-availability 41-compute 42-application-architecture 43-migrations 44-networking` 0 problems; `content:validate --cert az-305` 0 problems, 0 warnings; `check-quiz az-305` (same chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block or section marker changed.

## 31-backup-disaster-recovery

| Finding | Learn | Change |
| --- | --- | --- |
| Blob backup: a new policy can't be operational-only | Confirmed (blob-backup-overview, 2026-08-26): new policies support operational backup only together with vaulted backup; vaulted is selected by default and can't be turned off; existing policies unchanged. Vaulted-only stays possible | Blob paragraph: new sentence before the mode table |
| Operational backup puts a delete lock on the account | Confirmed (same page) | "Protects against" row, operational column |
| Standard to Enhanced migration | Confirmed: the Enhanced policy page says both "now supported" and "available in preview" | Policy table: "Can move to Enhanced (migration in preview)" |
| Trusted Launch with the Standard policy | Confirmed: only CLI 2.73.0+, PowerShell Az 14.0.0+, REST 2025-01-01+ | Policy table: new row "Trusted Launch virtual machines" |
| Instant restore retention contradictions | Instant restore page contradicts itself (1-5/1-30, then 5-20, then "two days for each policy"); the Enhanced policy page says 1-30, default 7 | None (the chapter follows the Enhanced policy page and the first statement of the instant restore page) |
| Site Recovery "RTO of up to one hour" | Confirmed: azure-to-azure-common-questions says "RTO SLA of one hour" | None |
| Site Recovery "no SLA for the RPO" | Not confirmed: the same FAQ mentions "RPO and RTO service-level agreements" in passing | None. For a human decision |
| SQL Database RTO/RPO table and backup frequency | RTO/RPO table confirmed (business continuity overview). Log backups are "every 5 - 10 minutes" | "about every 10 minutes" became "every 5 to 10 minutes" |

## 32-high-availability

| Finding | Learn | Change |
| --- | --- | --- |
| Geo priority replication "guarantees an RPO of 15 minutes" | storage-redundancy-priority-replication: SLA that the Last Sync Time of block blob data lags 15 minutes or less for 99.0 % of the billing month; GRS/GZRS, "Blob only"; billed from January 1, 2026; an unplanned failover disables it. No GA/preview label on the page | Sentence rewritten as an optional billed feature with that SLA |
| SQL MI zone redundancy tiers | Confirmed (high-availability-sla-local-zone-redundancy, 2026-11-17): Business Critical, General Purpose and Next-gen General Purpose; Next-gen GA, needs Elastic SAN ZRS, not in some regions | Next-gen General Purpose added with its Elastic SAN ZRS limit |
| SQL MI DR-only secondary | Confirmed (failover-group-standby-replica-how-to-configure): no SQL Server license for the standby, compute and storage still billed | "(its compute and storage are still billed)" added |
| PostgreSQL HA not in Burstable; standby billing | Confirmed on reliability-azure-database-postgresql: Burstable supports neither zone-redundant nor zonal HA; standby "billed at the same rate as the primary"; SLAs 99.9/99.95/99.99 % | None |
| VM 99.99 % across zones | Not confirmed on a fetched Learn page (same as the AZ-104 pass) | None. For a human decision |
| Composite SLA | Consistent with WAF "composite SLO" | None |
| FR « Portée » (table headers) | Glossary: scope = « étendue », not « portée » | FR only: two headers |

## 41-compute

| Finding | Learn | Change |
| --- | --- | --- |
| CycleCloud and HPC Pack | cyclecloud/overview (2026-09-18) lists Slurm, PBS Pro, LSF, Grid Engine, HTCondor; no HPC Pack | HPC Pack removed from the batch table |
| Container Apps timeout | functions-scale (2026-11-17): 30 minutes default, unbounded; with min replicas 0 the default depends on triggers | Functions plans table, Container Apps row |
| Flex Consumption: no slots, one app per plan | Confirmed (slots "n/a", 1 app per plan) | Flex Consumption row, "Use" column |
| Linux Consumption retirement | Text: "retiring on 30 September 2028" (the table says "Retired": the page is inconsistent; the dated text is followed) | Consumption row: Linux hosting retires on September 30, 2028 |
| Confidential VM families | DC/EC still right | None |
| Connected registry | Premium only (intro-connected-registry, SKU page); no GA/preview label | None |

## 42-application-architecture

| Finding | Learn | Change |
| --- | --- | --- |
| Service Bus queue size | Confirmed (service-bus-quotas, 2026-10-14): 1-5 GB in Basic and Standard, 80 GB with partitioning; 80 GB natively in Premium | Comparison table, first row |
| Managed Redis active geo-replication | Confirmed (how-to-active-geo-replication): not in Flash Optimized or Balanced B0/B1; CRDTs, eventual consistency, no SLA on sync time | Sentence rewritten: CRDT merge, eventual consistency, no sync-time SLA, B0/B1 exclusion |
| Logic App imported into API Management | Confirmed (import-logic-app-as-api): automated import of Logic App (Consumption); not in workspaces | Legacy-system sentence |
| App Configuration history and soft delete | Confirmed (FAQ, 2026-08-31): revision history 7 days Free/Developer, 30 days Standard/Premium; soft delete automatic and can't be disabled in Standard/Premium | Point-in-time replay sentence; Standard row "soft delete (always on, can't be disabled)" |
| Service Bus zone redundancy and Basic transactions | Consistent | None |

## 43-migrations

| Finding | Learn | Change |
| --- | --- | --- |
| Azure Migrate renamed Azure Catalyst | Confirmed: overview H1 "What is Azure Catalyst (formerly Azure Migrate)?" (2026-11-24); page titles still end in "Azure Migrate" and the body uses both names | None. Naming decision for the owner (see below) |
| "As on-premises" sizing | Learn names it "As-is on-premises" (target-right-sizing and concepts-assessment-calculation?view=migrate-classic) | Sizing table row and exam trap (EN); FR keeps « en l'état local » and adds "(As-is on-premises)" |
| Web apps assessed only as-is | Confirmed (target-right-sizing: the appliance collects no performance data for web apps) | Same row |
| Storage Mover agentless | Confirmed (service-overview, 2026-11-18): SMB agent-based and agentless (private connectivity, credentials in Key Vault); NFS agentless in preview; AWS S3 agentless (no preview label); GCS, S3-compatible, FSx preview | Storage Mover paragraph: agent-based and agentless sentences |
| DMS: no TDE, no logins | Confirmed (dms-overview feature table: "Migrate logins: No", "TDE support: No") | DMS row |
| Data Box 80 TB passage | Chapter's 120/525 TB is right | None |
| CAF Rebuild list | Probable copy error on the CAF page; the chapter follows the definition | None. For a human decision |

## 44-networking

| Finding | Learn | Change |
| --- | --- | --- |
| FR « réseaux virtuels appairés » (×2) | Glossary: « peering » | « réseaux virtuels en peering » |
| Bastion Premium | Confirmed: SKU comparison tip says Premium "is the recommended choice for production deployments"; session recording "isn't available via native client"; private-only needs Premium, no public IP, on-premises clients need ExpressRoute or VPN plus IP-based connection | Bastion SKU sentence extended |
| Bastion zone support in preview | Not confirmed: the SKU page lists availability zones "Yes" for all SKUs, without a preview label (the reliability page was not fetched) | None |
| ExpressRoute Direct 400 Gbps | Confirmed (erdirect-about): limited peering locations, enrollment required | Table row |
| Traffic Manager Performance | Confirmed: latency is measured from the recursive DNS resolver's IP, not the client's | Routing methods table, Performance row |
| Traffic Manager MultiValue | Confirmed: all endpoints External, given as IPv4/IPv6 | Routing methods table, MultiValue row |
| Application Gateway for Containers | overview (2026-11-03) has no GA/preview label | None |
| FR « Portée » (table headers) | Glossary « étendue » | FR only: two headers |

## Mock-exam bank questions changed

- `questions/continuity/az305-sr2c-q2.yaml` (EN + FR solution and explanation): the solution now says the 14-day retention applies to the policy's operational backup, and the explanation adds that a new blob backup policy also includes a vaulted backup that can't be turned off, which doesn't change the answer (Yes). Why: an operational-only policy can no longer be created.
- `questions/infrastructure/az305-4c-assess-sizing.yaml`, `az305-4c-assess-discovery-statements.yaml`, `az305-cs1c-vm-assessment.yaml` (EN + FR): the sizing criterion "As on-premises" became "As-is on-premises", Learn's current name. No answer changed.

## Quiz files changed

- `quizzes/43-migrations.yaml`: "as on-premises" became "as-is on-premises" in option d and its explanation (EN), to match the chapter and Learn. No answer changed. The other five quizzes still agree with the corrected chapters.

## Checked and left unchanged

- Blob backup: `az305-cs2c-invoice-backup` (operational option still wrong: it keeps data in the account), `az305-3a-uns-blob-backup-modes` (both modes in one policy, consistent with the new rule), `az305-sr2c-q3` (vaulted-only stays possible), `az305-3a-uns-data-lake-backup`.
- VM backup policies (`az305-3a-cmp-vm-enhanced-policy`, `-cross-region-restore`, `-disk-backup`, `az305-cs2a-vm-backup`, `az305-sr1-vm-region-dr-1`, `az305-3a-rec-*`): none relies on the migration status or on Trusted Launch.
- `az305-3b-postgresql-ha` (Burstable supports neither HA type: confirmed), `az305-3b-sqlmi-failover-group-standby` (already says compute and storage are billed).
- Functions plans (`az305-4a-sls-*`, `az305-sr2e-q2`), CycleCloud (`az305-4a-batch-cyclecloud-statements`): no HPC Pack, no Flex slots, no Container Apps timeout claim.
- `az305-4a-msg-storage-queue-backlog` ("a Service Bus queue is limited to 80 GB": still true as the maximum), `az305-4b-cache-active-geo` (Balanced instances in a geo-replication group; B0/B1 not stated, CRDT explanation correct), `az305-4b-cfg-*`.
- Storage Mover and DMS questions (`az305-4c-data-*`, `az305-cs1a-nas-transfer`, `az305-4c-db-*`): none says Storage Mover always needs an agent (cs1a states an agent as part of its option, which is still valid), none relies on TDE or logins.
- Bastion (`az305-4c-net-bastion-sku`: Standard is still the lowest SKU with native client and peering), Traffic Manager (`az305-4d-lb-tm-*`, `az305-sr1-global-web-entry-*`: "lowest latency for each user" is a simplification, not a contradiction).

## For a human decision

- **Azure Catalyst (formerly Azure Migrate).** Learn's overview now uses "Azure Catalyst", with "Azure Catalyst appliance", "Azure Catalyst assessments", "Azure Catalyst Collector"; titles and URLs still say Azure Migrate. The chapter, about 40 bank questions and the quiz say "Azure Migrate". Decide for the whole certification (and the glossary) whether to rename or to mention both names.
- Site Recovery "gives no SLA for the RPO" (31): not confirmed on Learn.
- VM SLA of 99.99 % across zones (32, key points): not on a fetched Learn page; the SLA document is outside Learn.
- Geo priority replication (32): no GA/preview label on its page.
- Instant restore retention (31): the instant restore page contradicts itself; the chapter follows the Enhanced policy page.
- Linux Consumption (41): functions-scale says "Retired" in its table and "retiring on 30 September 2028" in its text; the chapter uses the dated text.
- CAF Rebuild (43): the CAF strategy page lists Replace triggers under Rebuild (probable error).
- Bastion zone support (44): the QZ writer saw "preview"; the SKU page doesn't say so.
- References to watch (not changed): `concepts-assessment-calculation`, `best-practices-assessment`, `how-to-modify-assessment` reportedly redirect without `?view=migrate-classic`; the bank uses the `?view=migrate-classic` form, which still serves "Assessment overview (migrate to Azure VMs)".

## French terms not settled (not in the glossary)

- « machines virtuelles à lancement fiable (Trusted Launch) » (31).
- « en l'état local (As-is on-premises) » (43, bank): the Learn FR name of the criterion wasn't fetched.
- « cohérence éventuelle », « types de données répliqués sans conflit (CRDT) », « références SKU Balanced B0 et B1 », « partitionnement », « historique des révisions » (42).
- « réplica de secours » (standby replica, 32; already used in the bank).
- « connexion basée sur l'IP » (IP-based connection), « inscription obligatoire » (enrollment), « emplacements de peering » (44).
- « connexions (logins) » for SQL logins (43).
- « Étendue » used for generic "Scope" table headers (32, 44), applying the glossary's "not « portée »" note outside RBAC.
