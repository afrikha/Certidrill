# K-dp-300-sr1 — report

6 series × 3 questions (dp300-sr1-*), all `series_yesno`, status draft. Validator: 24 files, 0 problem(s).

| Series | Objective | Domain | Answers | Difficulty |
| --- | --- | --- | --- | --- |
| dp300-sr1-idle-timesheets | 1.2.1 | platform | N Y N | 2 1 2 |
| dp300-sr1-payroll-relocation | 1.3.7 | platform | Y N N | 2 3 3 |
| dp300-sr1-partner-reports | 2.2.3 | security | N N Y | 1 3 2 |
| dp300-sr1-order-entry-hang | 3.2.3 | performance | N Y N | 2 2 3 |
| dp300-sr1-weekly-purge | 4.3.2 | automation | N Y Y | 1 2 2 |
| dp300-sr1-regional-outage | 5.1.3 | hadr | N Y N | 2 1 1 |

Mix: 5 easy / 9 medium / 4 hard. 5 domains, platform used twice (6 series, 5 domains).

## Choices and doubts

- Database watcher (3.1.5) deliberately avoided: per the course chapter, watchers can no longer be created or edited since 9 Nov 2026.
- Reference title for `managed-instance/database-copy-move-how-to`: page content fetched, but WebFetch did not return the H1; title "Copy or move a database across instances in Azure SQL Managed Instance" is inferred from the page's opening sentence — recheck.
- The 24-hour completion window for MI copy/move: Learn does not say whether it starts at operation start or at "ready for completion"; question payroll-relocation-2 is No under either reading (Wednesday → Saturday).
- Serverless billing with auto-pause disabled (billed at least for min vCores/memory) is stated from general knowledge of the serverless billing model; the fetched page confirmed only "only storage billed while paused" and "-1 disables".
- regional-outage-3 (zone redundancy) cites the active geo-replication page, which states that zone resilience ≠ regional DR; no dedicated zone-redundancy page was fetched (WebFetch budget exhausted).
- WebFetch budget ran out mid-task; all other facts were checked on the fetched pages listed in the references.
