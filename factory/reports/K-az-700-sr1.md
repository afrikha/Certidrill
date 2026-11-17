# K-az-700-sr1 — report

6 series × 3 questions (prefix `az700-sr1`), all `series_yesno`, `status: draft`. Validator: 24 files, 0 problem(s).

| Series | Objective | Domain | Answers | Difficulty |
| --- | --- | --- | --- | --- |
| az700-sr1-onprem-private-dns | 1.2.7 | core | N, N, Y | 1, 2, 2 |
| az700-sr1-vpn-dual-redundancy | 2.1.1 | connectivity | Y, N, N | 2, 2, 3 |
| az700-sr1-vwan-remote-users | 2.4.1 | connectivity | N, N, Y | 1, 3, 2 |
| az700-sr1-tm-regional-failover | 3.1.7 | delivery | Y, N, N | 3, 1, 2 |
| az700-sr1-pls-partner-access | 4.1.4 | private-access | Y, N, N | 2, 1, 2 |
| az700-sr1-firewall-url-idps | 5.2.2 | security | N, N, Y | 1, 3, 2 |

Mix: 5 easy / 9 medium / 4 hard.

## Deviations

- AZ-700 has only 5 domains, so one domain (connectivity) holds two series, on different groups (2.1 and 2.4).
- First drafts on 2.3.4 (Global Reach), 3.3.9 (Front Door Private Link) and 4.2.3 (service endpoint policies) were deleted and replaced: the parallel task K-az-700-sr2 wrote series on the same decisions with the same answers (`az700-sr2-globalreach`, `az700-sr2-afd-privatelink`, `az700-sr2-sep`).

## Facts kept out or worded carefully

- Learn doesn't state in so many words that 168.63.129.16 is unreachable from on-premises; the explanation relies on the Private Endpoint DNS page ("queries must originate from the virtual network linked to the zone"), consistent with chapter 13.
- VPN series: the gateway is planned (not existing) to avoid relying on converting an active-standby gateway in place, which the fetched page didn't confirm.
- Firewall series: no wildcard in target URLs (wildcard syntax not verified); a single literal URL is used.
- Private Link service series: not used "public load balancer not supported" as a distractor (not confirmed on the fetched page).
