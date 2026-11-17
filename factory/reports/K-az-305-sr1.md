# K-az-305-sr1 — notes

6 series (18 `series_yesno` questions), prefix `az305-sr1`, all `status: draft`.

| Series | Objective | Domain | Answers (1-2-3) |
| --- | --- | --- | --- |
| `az305-sr1-intranet-remote` | 1.2.4 | identity | Yes / No / No |
| `az305-sr1-keyvault-logs` | 1.3.2 | identity | No / Yes / No |
| `az305-sr1-sql-reporting` | 2.1.2 | data | Yes / No / Yes |
| `az305-sr1-vm-region-dr` | 3.1.1 | continuity | No / No / Yes |
| `az305-sr1-order-messages` | 4.2.1 | infrastructure | No / Yes / No |
| `az305-sr1-global-web-entry` | 4.4.5 | infrastructure | No / Yes / Yes |

Six series for four domains: each series has its own objective; identity and infrastructure (the two heaviest domains) have two series each, in different objective groups.
Difficulty: 6 easy, 8 medium, 4 hard. Validator: `24 files, 0 problem(s)`.

## Verification

Every reference was fetched on learn.microsoft.com on 2026-11-17 and its title is the page H1.

Not fetched (hourly WebFetch limit reached), so not used as references and worth a reviewer's check:

- Front Door routing methods page: the statement "among healthy origins of equal priority, Front Door sends the request to the lowest-latency origin" (`global-web-entry-2`) relies on the course chapter 44 and the fetched "Load balancing options" page, not on the routing page itself.
- Traffic Manager routing methods page: the Performance method behaviour is taken from the fetched "Multiregion load balancing" architecture page.
- "Service Bus Basic has no topics": not confirmed on a fetched page, so `order-messages-3` is justified only by the two verified facts (Basic supports neither sessions nor duplicate detection).
- The scenario of `intranet-remote` states that users have Microsoft Entra ID P1 licenses (application proxy and Conditional Access prerequisite); the licensing page was not fetched.

## Design notes for the reviewer

- `sql-reporting`: two Yes answers on purpose (Business Critical and Hyperscale with one HA replica); cost is deliberately not a requirement. The Hyperscale solution states zone-redundant backup storage and a new database because Learn says zone redundancy for Hyperscale needs one HA replica plus ZRS/GZRS backup storage and is set at creation.
- `global-web-entry-3` is Yes: Traffic Manager (Performance) in front of an Application Gateway WAF_v2 per region meets the three stated requirements; the goal sets no failover time. This is the "more than one correct solution" case of the series.
- `vm-region-dr`: RTO is set to four hours and no Site Recovery SLA figure is quoted (no numeric SLA found on the fetched pages).
- French follows the AZ-305 course chapters: « lecture à l'échelle (read scale-out) », « stratégie améliorée (Enhanced) », « restauration interrégion (Cross Region Restore) », « rubrique », « services principaux », « préauthentification ».
