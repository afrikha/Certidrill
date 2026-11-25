# FIX-dp-300-3 — chapters 42, 43, 51, 52, 53 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert dp-300 42-automated-deployment 43-azure-database-tasks 51-hadr-strategy 52-backup-restore 53-configure-hadr` 0 problems; `content:validate --cert dp-300` 0 problems, 0 warnings; `check-quiz dp-300` (5 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. The shared fetch budget ran out several times, but every finding was eventually checked. The one not confirmed (log shipping RPO wording) isn't covered by its Learn page.

## 42-automated-deployment

| Finding | Learn | Change |
| --- | --- | --- |
| History cleanup: also triggered by what-if and validate; a lock on the subscription blocks it too; opt-out | Confirmed (deployment-history-deletions): cleanup above 700, down to 600; what-if and validate also trigger it; a `CanNotDelete` lock on a resource group **or a subscription** blocks it; `Microsoft.Resources/DisableDeploymentGrooming` (subscription scope only) disables it, and the 800 limit still applies | `DeploymentQuotaExceeded` row |
| Serverless auto-pause in Hyperscale | Confirmed (serverless-tier-overview): auto-pause is available in General Purpose and is a preview feature in Hyperscale; disable value -1 | `autoPauseDelay` row |
| `az sql vm create --sql-mgmt-type` deprecated | Not used by the chapter | None |
| FR: « what-if » | Only in code, never in prose. The new FR text uses « opération de simulation (what-if) » (glossary) | — |

## 43-azure-database-tasks

| Finding | Learn | Change |
| --- | --- | --- |
| "Fabric pipelines, monitored in the Monitoring hub" | Fabric SQL database limitations: no SQL Server Agent ("try scheduled Data Factory pipelines or Apache Airflow jobs") and no elastic jobs. The Monitoring hub isn't on the page | Row is now "Scheduled Data Factory pipelines or Apache Airflow jobs", with "no SQL Server Agent, no elastic jobs". Monitoring hub removed (not verified) |
| "Allow Azure services on the target server" for blocked elastic jobs | Only implied. The overview says private endpoints are "one possible solution if you want to disable" that option. No page says the agent needs it | None. Flagged below |
| MSX/TSX not available on SQL Managed Instance | Confirmed (MI T-SQL differences: "Multi Server Administration ... (MSX/TSX) jobs aren't supported") | None |
| Elastic jobs target only Azure SQL Database | Confirmed (overview: "The target can be any tier of Azure SQL Database"; target types are logical server, elastic pool and single database) | None |

## 51-hadr-strategy

| Finding | Learn | Change |
| --- | --- | --- |
| Hyperscale zone redundancy | Confirmed (high-availability-sla-local-zone-redundancy): it needs at least one HA replica and ZRS or GZRS backup storage. It can be set only at creation; to change it, use a database copy, PITR or a geo-replica | Hyperscale row of the tier table |
| Standby replica limits | Confirmed (standby-replica-how-to-configure): provisioned vCore single databases in General Purpose or Business Critical only | Exam tip (short). Full list in 53 |
| MI license-free DR replica: setting name | Confirmed (failover-group-standby-replica-how-to-configure): **Failover rights**, set on the *secondary* instance; **Hybrid failover rights** shows on the primary and is the MI link benefit | Exam tip; MI link bullet now names **Hybrid failover rights** |
| MI link: multiple-database mode, TDE | Confirmed (managed-instance-link-feature-overview): multiple-database mode needs SQL Server 2022 CU28 or SQL Server 2025 CU11, Enterprise or Developer, enabled on every replica. TDE: export the key to Key Vault and configure BYOK on the MI before creating the link. Service-managed-key databases can't be linked from the MI to SQL Server | Two new bullets in the link list |
| Failover groups: up to four secondaries (53 report, but the table in 51 says "one") | Confirmed, but **preview** and "not recommended for production" (failover-group-sql-db). The same page also says the secondary can't be in the primary's region, while the preview section says it can be | Failover group column: "(SQL Database: up to four secondary servers in preview)" |
| FR « retour arrière » / « revenir » / « retour » for failback | Glossary: failback = « restauration automatique », not « retour arrière » | Five places in 51 FR |

## 52-backup-restore

| Finding | Learn | Change |
| --- | --- | --- |
| "A backup taken on a managed instance can be restored to SQL Server 2022 only" | Out of date. restore-database-to-sql-server: SQL Server 2022 policy → SQL Server 2022; SQL Server 2025 policy → SQL Server 2025; Always-up-to-date → no SQL Server. update-policy: the SQL Server 2025 policy is the default for new instances created in the portal (and REST 2026-08-01-preview+). PowerShell and CLI still default to 2022. The MI T-SQL differences page still says "2022 only": the more specific page was followed | Managed instance paragraph |
| MI stripes: 4 TB rule | Confirmed (MI T-SQL differences: 32 stripes are "enough for databases up to 4 TB if backup compression is used"; 195 GB per stripe) | Same paragraph |
| PITR: Hyperscale ↔ other tiers; geo-secondary | Confirmed (recovery-using-backups): PITR only on a primary, not on a geo-secondary. Restores between Hyperscale and other tiers aren't supported | PITR paragraph |
| Immutable LTR | Confirmed (long-term-retention-overview): SQL Database has no preview label; SQL Managed Instance is "in preview". Immutable LTR backups block deletion of the logical server | LTR rules paragraph |
| Backup to URL immutability (SQL Server 2025) | Confirmed (sql-server-backup-to-url): from SQL Server 2025, container-level immutability only; `WITH FORMAT` over an existing same-name backup fails | New bullet in the URL rules |
| BULK_LOGGED wording | The chapter is consistent with Learn (more precise) | None |

## 53-configure-hadr

| Finding | Learn | Change |
| --- | --- | --- |
| Failover groups: up to four secondary servers | Preview (see 51) | Secondary row (SQL Database), with "the read-only listener then points to one of them" |
| A failover-group member can't be failed over with the geo-replication command | Confirmed (active-geo-replication-overview) | New bullet in the geo-replication rules |
| Standby replica limits | Confirmed: GP/BC, provisioned vCore, standard-series or DC-series. Not Hyperscale, serverless, DTU or elastic pools. One standby per primary; not on a chained secondary. Only DR drills, monitoring and maintenance such as `DBCC CHECKDB` | Standby bullet (backups left out: the page's lists disagree on them) |
| MI link: WSFC, trace flags, multiple-database mode, MI→SQL Server 2022 CU10 | Confirmed (managed-instance-link-preparation): extra WSFC steps only for SQL Server 2016, not 2017+. Database master key in `master`. Startup trace flags `-T1800` and `-T9567` recommended (`-T12381` only during seeding on supported builds, not added). Link from an MI primary to SQL Server 2022 needs CU10+ and the 2022 policy (not added; 51 already requires the matching policy) | Step 1 of the link procedure |
| Relaxed monitoring values | Confirmed (hadr-cluster-best-practices). AG and FCI: health check timeout 60 s, failure-condition level 2. AG only: lease timeout 40 s, session timeout 20 s, max failures in the specified period 6 (default 2) | Two troubleshooting rows |
| Log shipping: "RPO is the backup plus copy plus restore interval" is imprecise | **Not confirmed**: the log shipping overview doesn't define data loss or RPO. It only says failover is manual and mentions a restore delay | None. Flagged below |
| FR: Failover Cluster Manager label | Quiz keeps the English UI name | FR row adds "(Maximum failures in the specified period)" after the translated label |

## Mock-exam bank questions changed

- `questions/hadr/dp300-5a-tier-hotarea.yaml` (5.1.3, hotarea): row db-telemetry changed from Hyperscale / Geo-zone-redundant to Premium (DTU) / Geo-redundant. The explanation now adds (EN + FR) that an existing Premium database can be converted to zone redundant. Why: prompt p1 "the database for which you can't enable zone redundancy" had two right answers. One was db-orders (Standard). The other was the existing Hyperscale database, because Hyperscale zone redundancy can only be set at creation (high-availability-sla-local-zone-redundancy). Answer unchanged (p1 db1, p2 db2). Same id, type, objective and difficulty.

## Checked and left unchanged

- 4.2: `dp300-4b-deploy-statements` s3 ("as the history approaches 800, older deployments are deleted automatically") still holds by default (cleanup from 700). No 4.2 question combines Hyperscale serverless and auto-pause.
- 4.3: `dp300-4b-ej-private-endpoint` (Allow Azure services is a wrong option because public access is disabled: consistent). `dp300-4b-auto-multiserver` (MSX/TSX). No 4.3 question mentions Fabric.
- 5.1/5.3: `dp300-5a-dr-only-cost` (standby in a failover group, BC provisioned standard-series: eligible). `dp300-5a-cheapest-regional-dr`. `dp300-5a-test-local-failover`. `dp300-cs4b-eventseu-cli` and `dp300-4a-cli-hyperscale-replicas` (Hyperscale zone redundancy set at creation: consistent). `dp300-5c-ts-cluster-heartbeat` (40 heartbeats). MI link questions (`dp300-5a-mi-link-*`, `dp300-5b-ag-mi-link-*`, `dp300-cs4a-mi-link-dr`, `dp300-1a-mi-link-passive-dr`). No question says a failover group has a single secondary. None fails over a failover-group member with the geo-replication command.
- 5.2: no question relies on "MI backups restore to SQL Server 2022 only". `dp300-5b-pitr-sqldb-facts` already states the Hyperscale cross-tier exception. `dp300-5b-ltr-immutable-powershell` is about SQL Database (not preview). `dp300-cs1c-backup-to-url` and `dp300-cs3c-regulator-backup` agree with the credential rules.

## Quiz files

None changed. All five quizzes still agree with the corrected chapters (check-quiz 0/0). 52 q9 states the SQL Server 2022 update policy explicitly, and 43 already uses "Data Factory pipeline".

## For a human decision

- **Log shipping RPO (53, exam trap):** "the RPO is the backup plus copy plus restore interval" isn't on Learn, and the QZ writer thinks it's imprecise (data loss depends on log backups not yet taken or not reachable; the restore interval affects RTO more). Left unchanged.
- **Elastic jobs and "Allow Azure services" (43, troubleshooting table):** Learn only implies that the agent uses this option without private endpoints. Keep or reword?
- **Failover groups with up to four secondaries:** a preview feature, now mentioned as preview. The failover-group page contradicts itself on whether a secondary can be in the primary's region; the chapter keeps "another region".
- **MI backups to SQL Server:** the MI T-SQL differences page still says "SQL Server 2022 only". The chapter follows restore-database-to-sql-server and update-policy.
- **Not settled (glossary), used in the new FR text:**
  - « mode de lien multibase de données » (multiple-database link mode)
  - « indicateurs de trace de démarrage »
  - « niveau de condition d'échec (Failure-Condition Level) »
  - « délai d'expiration de session »
  - « immuabilité au niveau du conteneur / de la version »
  - « géoréplica »
  - « TDE BYOK »
- **« cmdlet »** (glossary `undecided`): 42 FR uses « cmdlet » three times. Not settled here.
