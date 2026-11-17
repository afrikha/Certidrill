# K-az-700-cs4 — report

2 case studies, 11 questions (5 + 6), all `status: draft`. Validator: `13 files, 0 problem(s)`. No earlier files with the prefix `az700-cs4` existed, so everything was written from scratch.

| Case study | Industry / architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| `az700-cs4a-coho-resorts` | Ski resorts; hub-and-spoke with site-to-site VPN, Application Gateway WAF_v2, public Standard LB for a partner API, Bastion | policy-based-sites (2.1.4, single, 2), outbound-snat (3.1.11, dropdown code, 3), bastion-nsg (5.1.9, yesno, 1), network-watcher (1.4.2, dragdrop, 1), waf-staff-exclusion (5.3.7, single, 2) |
| `az700-cs4b-fernhill` | Market-data provider; two datacenters on two ExpressRoute circuits, hub with Azure Firewall, isolated low-latency VNet, Private Link service for banks | route-preference (2.3.10, multi, 3), feed-fastpath (2.3.4, single, 2), pls-banks (4.1.4, dropdown, 2), etl-routes (1.3.7, yesno, 3), archive-access (4.1.1, single, 1), nsg-sql (5.1.5, hotarea, 2) |

Mix: single 4, dropdown 2, yesno 2, multi 1, dragdrop 1, hotarea 1. Difficulty: 3 easy, 5 medium, 3 hard. Domains: connectivity 3, core 2, delivery 1, private-access 2, security 3.

## Verification

All references were fetched on 2026-11-17 (titles are the page H1). Key facts checked: policy-based traffic selectors need a custom IPsec/IKE policy and IKEv2 on the device; VPN type can't be changed; one VPN gateway per VNet; outbound rules 64,000 ports per frontend IP, multiples of 8, idle timeout 4–120 min; `az network lb outbound-rule create` parameters; Bastion NSG rules; Network Watcher tools; per-listener WAF policy precedence; ExpressRoute connection weight evaluated before AS path; FastPath SKUs and ErGw1Az→ErGw3Az in-place upgrade; Private Link service visibility, auto-approval, TCP Proxy v2; UDR longest-prefix and gateway route propagation; VirtualNetwork service tag scope; service endpoints not usable from on-premises.

## Deviations and points to review

- Topics were changed during the task to avoid overlap with content written in parallel: Bellows College (`az700-cs3b`) already tests the Virtual WAN Basic→Standard upgrade, User VPN with Entra ID and scale units; Litware Energy (`az700-cs1a`) tests DNS Private Resolver and the firewall SKU; Southridge (`az700-cs3a`) tests Front Door tier, private origin and WAF modes; series `az700-sr1`/`sr2` test Global Reach, on-premises private-endpoint DNS, Front Door private origins and NAT gateway. None of these decisions is repeated here.
- Course chapter `25-virtual-wan` (another agent) states "500 users per User VPN scale unit". The Virtual WAN FAQ table says otherwise (1–3 units: 500 connections, 4–6: 1,000, 7–10: 5,000, 11–20: 10,000). Worth checking in that chapter and in `az700-cs3b-scale-units`.
- `az700-cs4b-route-preference`: the Learn page says connection weight is considered before AS path length but gives no complete ordered list; the explanation relies on longest prefix match first (stated in the same page and in the UDR page).
- `az700-cs4a-network-watcher`: NSG diagnostics would also answer the first target; it is deliberately not offered as an item.
- `az700-cs4a-waf-staff-exclusion`: the per-site policy page doesn't cover exclusions; the answer only relies on listener-level policy precedence plus the existence of WAF exclusions.
