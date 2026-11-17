# K-az-700-cs2 — report

3 case studies, 16 questions, all `status: draft`. Validator: `19 files, 0 problem(s)`.

The earlier attempt had left no file under `az700-cs2`. Everything here was written in this run.

| Case study | Industry / architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| `az700-cs2a-alpine-ski-house` | Ski resorts; hub-and-spoke with an active-active VPN gateway, an SD-WAN NVA and Azure Route Server, Bastion | chamonix-ipsec (2.1.6, dropdown, 2), megeve-diagnostics (1.4.2, single, 1), route-server (1.3.8, multi, 3), bastion-nsg (5.1.9, hotarea, 2), gateway-sku (2.1.2, single, 1) |
| `az700-cs2b-wide-world-importers` | Logistics; ExpressRoute hybrid hub, forced default route from on-premises, NAT gateway, private endpoint | circuit-options (2.3.2, dragdrop, 2), us-gateway (2.3.8, dropdown, 1), private-peering-ipsec (2.3.11, ordering, 2), effective-routes (1.3.7, yesno, 3), nat-precedence (1.3.10, single, 2), pe-network-policy (4.1.3, single, 2) |
| `az700-cs2c-fourth-coffee` | Retail (coffee chain); regional Application Gateway WAF_v2, internal load balancer published by Private Link service, outbound rules | xff-rewrite (3.2.10, dropdown, 2), supplier-waf (5.3.7, multi, 2), backend-tls (3.2.9, single, 1), status-pls (4.1.4, yesno, 2), snat-ports (3.1.11, single, 3) |

Mix: single 6, dropdown 3, multi 2, yes/no 2, dragdrop 1, ordering 1, hotarea 1. Difficulty: 4 easy, 9 medium, 3 hard. Domains: core 4, connectivity 6, delivery 3, private-access 2, security 2 (each case covers three domains).

## Changes of plan

The first draft (Virtual WAN for case A, Front Door and DNS Private Resolver elsewhere) was dropped when the other AZ-700 case-study and series agents' files appeared: `az700-cs3b-*` (Virtual WAN, User VPN, policy inheritance, secured hub), `az700-cs3a-*` (Front Door Premium, apex alias record, WAF modes, private origin), `az700-cs1a-*` (DNS Private Resolver, gateway transit), `az700-cs1b-proseware` (online learning, the industry first chosen for case C) and the series `az700-sr1/sr2-*` (service endpoint policy, Front Door Private Link approval, firewall FQDN rules, NAT gateway for an allowlist). The final questions test other decisions.

## Verification

Every reference was fetched on 2026-11-17; titles are the page H1.

## Points to review

- `az700-cs2a-gateway-sku`: the SKU page doesn't say how tunnels count in active-active mode. 42 connections fit in 100 tunnels even if each one counts twice, so the answer doesn't change.
- `az700-cs2a-route-server`: the FAQ requires active-active and ASN 65515 on a VPN gateway that works with Route Server; the case states both. The minimum size of RouteServerSubnet isn't on the fetched page, so no question uses it.
- `az700-cs2a-chamonix-ipsec`: the PFS2048 = DH group 14 mapping comes from the IPsec/IKE parameter tables (DH group 14 is listed with DHGroup14/DHGroup2048). The distractor `-ConnectionProtocol IKEv1` and the switch `-UseLocalAzureIpAddress` were checked on the cmdlet reference.
- `az700-cs2b-private-peering-ipsec`: the order assumes that Gateway Private IPs is enabled on the gateway before the connection uses the Azure private IP address, as in the Learn procedure. The page doesn't say whether the portal accepts the reverse order.
- `az700-cs2b-circuit-options`: the MACsec page covers ExpressRoute Direct ports only and doesn't explicitly say provider circuits can't use MACsec. The explanation doesn't claim "only Direct".
- `az700-cs2c-xff-rewrite`: the rewrite page describes `add_x_forwarded_for_proxy` as the header with `client_ip` appended and useful for removing port information. The claim that the gateway adds ports by default isn't made.
- `az700-cs2c-supplier-waf`: the per-site page shows association levels with PowerShell. The multi-site listener behaviour comes from the listener configuration page.
