# K-az-700-cs1 — report

3 case studies, 15 questions (5 each), all `status: draft`. Validator: `18 files, 0 problem(s)`. No file with the `az700-cs1` prefix existed before this run.

| Case study | Industry / architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| `az700-cs1a-litware-energy` | Energy utility; hybrid hub-spoke, ExpressRoute with S2S VPN backup, DNS Private Resolver, Azure Firewall | gateway-transit (1.3.2, dropdown, 2), dns-resolver (1.2.7, dragdrop, 2), er-vpn-routing (2.1.2, yesno, 3), firewall-sku (5.2.2, single, 1), billing-egress (5.2.4, ordering, 2) |
| `az700-cs1b-proseware` | Online learning SaaS; global web delivery with Front Door Premium, WAF, PaaS private endpoint | front-door-tier (3.3.3, single, 1), waf-policy (5.3.4, dropdown, 2), sql-private (4.1.5, multi, 2), apex-record (1.2.5, single, 1), origin-routing (3.3.5, yesno, 2) |
| `az700-cs1c-wingtip-toys` | Retail chain; Virtual WAN with branches, user VPN, ExpressRoute, secured hub, monitoring | hub-gateways (2.4.4, dropdown, 3), remote-staff (2.2.5, single, 2), routing-intent (5.2.7, single, 3), flow-logs (5.1.7, yesno, 2), payment-monitor (1.4.2, single, 1) |

Mix: single 6, dropdown 3, yesno 3, multi 1, dragdrop 1, ordering 1. Difficulty: 4 easy, 8 medium, 3 hard. Domains: core 4, connectivity 3, delivery 2, private-access 1, security 5.

## Verification

All references were fetched on 2026-11-17 (titles are the page H1). Facts also cross-checked against the AZ-700 course chapters 11, 13, 22, 23, 24, 25, 52 and 54.

## Points to review

- `az700-cs1b-waf-policy`: the term "security policy" (association of a WAF policy with Front Door domains) isn't on a fetched page; the WAF overview only says policies are associated with domains. The claim that OWASP CRS isn't offered on Front Door comes from the Front Door WAF pages listing only DRS and Bot Manager, plus chapter 54.
- `az700-cs1c-hub-gateways`: the site-to-site figure (1 scale unit = 500 Mbps aggregate) comes from the Virtual WAN FAQ; the gateway settings page words it as "two instances, each 500 Mbps", which could be read differently.
- `az700-cs1c-flow-logs`: assumes the store source IP is preserved through FW-Hub (Azure Firewall doesn't SNAT private destinations); not stated on a fetched page.
- `az700-cs1c-remote-staff`: the explanation of the RADIUS distractor (Conditional Access doesn't evaluate a RADIUS sign-in) is inferred, not quoted.
- `az700-cs1a-billing-egress`: the case states that Allow forwarded traffic is already enabled on every peering link, so return traffic through FW1 needs no extra action; FW1's private IP (10.20.1.4) is given in the case rather than derived.
- `az700-cs1a-dns-resolver` partly overlaps `az700-sr1-onprem-private-dns` (on-premises to inbound endpoint), but in a dragdrop with three other functions. Front Door private origin approval and NAT gateway allowlists were avoided because the series `az700-sr1-frontdoor-private-origin`, `az700-sr2-afd-privatelink` and `az700-sr2-natgw` already test them.
