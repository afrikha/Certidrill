# K-sc-200-sr2 — report

5 series (15 series_yesno questions), prefix `sc200-sr2`:

| Series | Objective | Domain | Answers |
| --- | --- | --- | --- |
| sc200-sr2-scanner-tuning | 1.1.2 | environment | No / Yes / No |
| sc200-sr2-app-ingestion | 1.3.7 | environment | No / No / Yes |
| sc200-sr2-mdi-disable | 2.1.6 | incidents | No / Yes / No |
| sc200-sr2-proxy-summary | 3.2.3 | hunting | Yes / No / No |
| sc200-sr2-hunt-schedule | 3.2.1 | hunting | No / Yes / No |

Difficulty: 4 easy, 8 medium, 3 hard.

## Deviations and notes

- Planned a series on 2.3.2 (Content search, search and purge) but dropped it: the Learn page "Search for and delete email messages in your organization" now applies only to 21Vianet, and I could not fetch the page for the new eDiscovery search-and-delete flow (web-fetch budget exhausted). The course chapter 24 (content-search section) still presents the PowerShell purge procedure as current; worth a check by the course owner.
- Planned a series on 2.1.4 (OAuth app ban) but dropped it: "Manage OAuth apps" does not clearly document the Ban effect for Microsoft 365 apps.
- Objectives were chosen among those with few or no questions; I could not coordinate with K-sc-200-sr1 (it had written no series when I started), so an objective overlap is possible.
- UI labels of the MDI remediation actions (Disable, Revoke session, Mark as compromised) come from the action table of "Remediation actions in Microsoft Defender for Identity"; the exact menu path on the identity page was not verified, so the solutions say only "from Ben's identity page".
- Summary rule series relies on the Azure Monitor page: Basic source = single table + lookup to up to five Analytics tables; user-defined functions not supported; bin sizes 20–1,440 minutes.
