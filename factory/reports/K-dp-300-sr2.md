# K-dp-300-sr2 — report

5 series, 15 `series_yesno` questions, validator: 0 problem(s). Difficulty 5 × 1, 7 × 2, 3 × 3.

| Series | Domain | Objective | Answers |
| --- | --- | --- | --- |
| dp300-sr2-orders-relocation | platform | 1.3.7 | No, No, Yes |
| dp300-sr2-tde-protector | security | 2.2.1 | No, Yes, No |
| dp300-sr2-replica-maxdop | performance | 3.3.7 | Yes, No, No |
| dp300-sr2-serverless-cli | automation | 4.2.3 | Yes, No, Yes |
| dp300-sr2-standard-reporting-copy | hadr | 5.3.5 | No, Yes, No |

## Deviations and doubts

- I first wrote a 2.2.3 firewall series, then found that `dp300-sr1-partner-reports` (written in parallel) tests the same decision with the same partner IP. I deleted mine and replaced it with the 2.2.1 TDE series. sr1 currently uses 1.2.1, 2.2.3 and 3.2.3. Its 3 remaining series may still overlap with mine, so the reviewer should cross-check them.
- `dp300-sr1-idle-timesheets` (1.2.1) also deals with serverless. To avoid repeating its decision, my CLI series tests command syntax: the components versus the `GP_S_Gen5_4` service objective, and the auto-pause delay unit.
- Reference titles I could not confirm exactly, because the page markdown had no H1 and the WebFetch budget ran out:
  - "Copy or move a database - Azure SQL Managed Instance" (database-copy-move-how-to)
  - "About log shipping (SQL Server)"
  - "Azure SQL Database IP firewall rules" was reused from the repo, but it is no longer referenced.
- Not re-fetched in this session, written from knowledge:
  - Log shipping is supported in Standard edition.
  - `az sql db create --service-objective GP_S_Gen5_4 --auto-pause-delay 120` creates a serverless database. The parameters and the `GP_S_Gen5_8` example are on the `az sql db` page, but I did not see this exact combination.
- Learn now lists Hyperscale serverless auto-pause as a preview (minimum delay 60 minutes). For that reason no question claims that Hyperscale can't auto-pause.
