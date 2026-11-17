# K-dp-300-cs3 — report

3 case studies, 16 questions, all `status: draft`. Validator: `19 files, 0 problem(s)`.

| Case study | Industry / architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| `dp300-cs3a-lamna-insurance` | Insurance; on-premises SQL Server 2019 to Azure SQL Database (General Purpose) with a geo-secondary | unsupported-objects (1.3.1, multi, 2), auditor-firewall (2.2.3, single, 1), api-permissions (2.1.8, dropdown, 2), legacy-ce-hint (3.2.2, ordering, 2), geo-lag (5.3.6, single, 3), geo-secondary-cli (4.2.3, dropdown, 2) |
| `dp300-cs3b-bellows-college` | University; SQL Server 2022 on Azure VMs in an Always On availability group | server-settings (3.3.5, dragdrop, 1), weekend-schedule (4.1.1, dropdown, 2), integrity-checks (3.3.3, yesno, 1), ag-backups (5.2.2, dropdown, 3), monitoring-login (2.1.3, dropdown, 2) |
| `dp300-cs3c-trey-research` | Clinical research; Azure SQL Managed Instance (Business Critical, CMK TDE) + Microsoft Fabric | adverse-events-db (1.1.4, single, 1), participant-classification (2.3.1, dropdown, 1), regulator-backup (5.2.6, dropdown, 2), site-visits-index (3.2.5, single, 2), agent-job-access (2.1.7, single, 3) |

Mix: dropdown 7, single 5, multi 1, ordering 1, yesno 1, dragdrop 1. Difficulty: 5 easy, 8 medium, 3 hard. Domains: security 6, performance 4, platform 2, hadr 3, automation 2 (each case covers at least four domains).

## Deviations

- The session was interrupted once and parallel tasks (cs2, cs4) wrote overlapping scenarios meanwhile. To avoid testing the same decisions with the same answers, I dropped my first drafts (Hyperscale + named replica, private endpoint, FCI with DNN, log shipping STANDBY, Agent proxy, Extended Events RPC capture, MI database move, change tracking for mobile sync, optimize for ad hoc workloads) and renamed my first company (cs4a also uses Humongous Insurance). Remaining partial overlap: `dp300-cs3a-geo-secondary-cli` and cs4b both involve a readable geo-secondary, with different questions.
- T-SQL dropdowns use `language: sql`, like cs1.
- Database watcher was not used: Learn (fetched 2026-11-17) says it stays in preview, retires on 30 April 2027, and new watchers can no longer be created since 9 November 2026. Worth checking the course and other banks for 3.1.5.

## Verification

Fetched on 2026-11-17: Hyperscale service tier, Hyperscale secondary replicas, `az sql db replica`, active geo-replication, `sys.dm_geo_replication_link_status`, Entra contained users (configure page), GRANT schema permissions, Query Store hints, IP firewall rules, features comparison (SQL DB vs MI), migration overview, recovery using backups, connectivity settings, private endpoint pages, TDE BYOK, MI database copy/move, MI T-SQL differences (backup, credential, Agent), CREATE CREDENTIAL, backup to URL, Fabric SQL database overview, Fabric warehouse constraints, ADD SENSITIVITY CLASSIFICATION, data discovery and classification, missing index suggestions, offload backups to secondary replicas, MAXDOP, instant file initialization, DBCC CHECKDB, sp_add_schedule, `sys.fn_hadr_is_primary_replica`, server-level roles, track data changes, database watcher overview. Web search budget was exhausted; WebFetch budget ran out once (shared limit).

## Points to review

- From general knowledge, not on a fetched page: `sys.geo_replication_links` described only as listing links and state (columns not fetched); Lock pages in memory prevents buffer pool paging (no reference cited for it); AUTOMATED_BACKUP_PREFERENCE values PRIMARY / SECONDARY_ONLY / SECONDARY / NONE (the fetched page links to ALTER AVAILABILITY GROUP for them).
- `dp300-cs3b-ag-backups` depends on SQL Server 2022: from SQL Server 2025, full and differential backups are supported on secondary replicas (stated in the case).
- `dp300-cs3c-regulator-backup`: the storage role of the MI identity is given in the case (Storage Blob Data Contributor), not tested; the role requirement itself was not found on a fetched page.
- `dp300-cs3a-legacy-ce-hint`: the claim that legacy CE restores performance after moving from 150 to 160 is a scenario premise, not a documented effect.
