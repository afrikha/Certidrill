# K-dp-300-cs2 — report

3 case studies, 16 questions (prefix dp300-cs2), all `status: draft`.

| Case | Architecture | Questions (objective) |
| --- | --- | --- |
| dp300-cs2a-proseware-market (e-commerce) | Azure SQL Database, Hyperscale, private endpoint | service-tier (1.1.1), private-access (2.2.6), blocking-dmv (3.2.3), psp (3.3.9), named-replica-bicep (4.2.1) |
| dp300-cs2b-fabrikam-plants (manufacturing) | SQL Server 2022 FCI on Azure VMs across zones, log shipping DR | fci-design (5.3.4), cu-patching (1.1.9), log-shipping (5.3.5), archive-compression (1.2.5), xe-session (3.1.6), agent-proxy (4.1.3) |
| dp300-cs2c-adatum-learning (education) | SQL Server 2016 to Azure SQL Database, geo-replication | offline-migration (1.3.4), change-features (2.3.3), grades-powershell (4.2.2), scoped-config (3.3.7), dr-drill (5.1.4) |

Difficulty 5/8/3. Types: single 6, dropdown 7, yesno 1, multi 1, dragdrop 1.

## Deviations and notes

- A first draft of case C (on-premises SQL Server 2022 + Managed Instance link, MI auditing, MI database move) was dropped because cs4a (Humongous Insurance) already tests those decisions.
- Overlap to watch: cs4b-head-blocker (3.2.3) also completes a blocking DMV query, but with sys.dm_exec_connections / most_recent_sql_handle; cs2a uses sys.dm_exec_requests + sys.dm_exec_input_buffer. cs4b-replica-types and cs3a-claims-offering also pick a Hyperscale named replica; cs2a tests it only through Bicep syntax (createMode/secondaryType/sourceDatabaseId).
- Database watcher (3.1.5): Learn states it is in preview and being retired (no new or edited watchers from 9 November 2026, collection stops 30 April 2027). No question written on it; the course chapter and other tasks should not ask to create a watcher.
- Automated Patching of the SQL IaaS Agent extension retires on 17 September 2027 (Learn); cu-patching uses this as a distractor.
- Not verified on Learn (WebFetch budget): exact page titles of "Connectivity settings" (used "Connectivity settings for Azure SQL Database and SQL database in Fabric"), the FCI overview page (used "Failover cluster instances - SQL Server on Azure VMs", as in other files) — check them. Bicep API version 2021-11-01 chosen as a stable version supporting secondaryType Named (not checked on the version list). That planned geo-replication FAILOVER runs from master of the secondary server and that Azure Update Manager maintenance configurations patch all assigned VMs in the same window are from documentation knowledge, not re-fetched.
- Extended Events: duration units not confirmed, so no duration threshold was used in the question.
