# K-dp-300-cs1 — report

3 case studies, 17 questions, all `status: draft`. Validator: `20 files, 0 problem(s)`.

| Case study | Industry / architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| `dp300-cs1a-lucerne-logistics` | Freight forwarding; on-premises SQL Server 2019 to SQL Managed Instance (Business Critical) + Azure SQL Database | billing-offering (1.1.1, single, 1), online-migration (1.3.3, single, 2), supervisor-access (2.1.4, dropdown, 2), failover-group (5.3.3, yesno, 2), job-notification (4.1.2, dropdown, 3), backup-retention (5.2.5, dropdown, 1) |
| `dp300-cs1b-margies-travel` | Travel SaaS; multi-tenant Azure SQL Database, database per tenant in elastic pools | maintenance-job (4.3.1, ordering, 2), tenant-isolation (2.3.6, dropdown, 3), sensitive-columns (2.3.4, dragdrop, 1), automatic-tuning (3.3.4, yesno, 2), deleted-rows (5.2.4, single, 2) |
| `dp300-cs1c-litware-energy` | Electricity distribution; SQL Server 2022 on Azure VMs (AG) + Arc-enabled on-premises instances | partition-window (1.2.4, dropdown, 3), replica-storage (1.2.3, dragdrop, 1), backup-to-url (5.2.7, dropdown, 2), arc-capabilities (1.1.3, multi, 1), iban-encryption (2.2.5, single, 2), report-cpu (3.3.6, single, 2) |

Mix: dropdown 6, single 5, yesno 2, dragdrop 2, ordering 1, multi 1. Difficulty: 5 easy, 9 medium, 3 hard. Domains: platform 6, security 4, hadr 4, automation 2, performance 2. No other DP-300 case study existed when the task started (cs2–cs4 run in parallel: overlap not checkable).

## Verification

Fetched on 2026-11-17: MI link overview, LRS overview, MI failover groups, MI SQL Agent job automation, Entra server principals, MI LTR configure, `az sql midb ltr-policy`, elastic jobs overview and tutorial, automatic tuning overview, SQL Server enabled by Azure Arc, SQL VM storage best practices, Resource Governor resource pool, backup to URL, Always Encrypted with secure enclaves, row-level security, ALTER PARTITION FUNCTION, MI T-SQL differences. The WebFetch budget ran out once mid-task (shared hourly limit); later fetches were made one at a time.

## Points to review

- Not fetched in this task (titles reused from other banks, facts from general knowledge): serverless tier page (auto-pause in General Purpose), `recovery-using-backups` (PITR always creates a new database; geo-restore cannot pick a point in time), dynamic data masking, ledger overview.
- `dp300-cs1b-automatic-tuning`: the fetched H1 was reported as "Automatic database tuning"; check the exact title.
- `dp300-cs1a-backup-retention`: the explanation of distractor `az sql mi` only says LTR is set per database with `az sql midb` (the absence of an `ltr-policy` group under `az sql mi` was not verified).
- `dp300-cs1c-partition-window`: relies on the standard RANGE RIGHT sliding window (switch out partition 1, merge the lowest boundary, NEXT USED, split the empty rightmost partition); the merge step being metadata-only follows the "keep empty partitions at both ends" guidance.
- T-SQL dropdowns use `language: sql` (as other banks do), not in the BRIEF's course list.
