# K-dp-300-cs4 — report

Two case studies, 11 questions, all `status: draft`. Validator: `CERT=dp-300 npx tsx factory/validate.ts --prefix dp300-cs4` → 13 files, 0 problem(s).

## Case studies

| Case study | Industry / architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| dp300-cs4a-humongous-insurance | Insurer, hybrid: SQL Server 2022 on premises + Azure SQL Managed Instance | mi-link-dr (5.1.2, yesno, 2), archive-move (1.3.7, ordering, 2), winauth-flow (2.1.2, single, 3), medical-audit (2.3.2, dropdown, 2), deadlock-capture (3.1.6, multi, 1) |
| dp300-cs4b-relecloud | Online ticketing, cloud-native Azure SQL Database Hyperscale | replica-types (1.2.1, dragdrop, 1), partner-access (2.1.8, multi, 3), eventseu-cli (4.2.3, dropdown, 2), private-access (2.2.6, single, 1), head-blocker (3.2.3, dropdown, 2), backup-options (5.2.1, yesno, 2) |

Mix: 3 easy / 6 medium / 2 hard. Topics chosen to avoid the decisions already tested by cs1a–cs1c (failover groups, LTR, elastic jobs, ledger, DDM, RLS, secure enclaves, Resource Governor, Arc billing, partition switching, backup to URL).

## Facts to note / doubts

- **Database watcher (3.1.5)**: Learn now says it is in preview, retires on 30 April 2027, will not reach GA, and since 9 November 2026 watchers can no longer be created or edited (transition to "Database Hub in Microsoft Fabric"). I did not write a database-watcher question. The course and other question sets on 3.1.5 should be rechecked.
- **Windows Authentication for Microsoft Entra principals (winauth-flow)**: Learn states the modern interactive flow does not work for services and requires Entra joined / hybrid joined clients; the incoming trust-based flow is described for AD DS–joined clients (Windows 10 / Server 2012+, domain functional level 2012+). Learn does not explicitly say the trust-based flow supports Windows services; the answer relies on it being the only flow left for AD-only clients.
- **MI database move (archive-move)**: the Learn page shows no explicit CLI/PowerShell "complete move" command (its move examples use `cancel`/`Stop-AzSqlInstanceDatabaseMove`), so the question uses portal wording only. The page has no readable `<title>` through WebFetch; I reused the reference title already used in the bank ("Copy or move a database - Azure SQL Managed Instance").
- **Hyperscale zone redundancy**: requires ≥1 HA replica and zone-redundant or geo-zone-redundant backup storage, set only at creation (verified). The question assumes GZRS backup storage is available in North Europe.
- The WebFetch budget was exhausted once during the task; all facts used were fetched before or after the pause.
