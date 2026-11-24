# QZ-az-700-12-public-ip — report

File: `content/az-700/quizzes/12-public-ip.yaml` (10 questions, objectives 1.1.6–1.1.10). Check: `npx tsx factory/check-quiz.ts az-700 12-public-ip` → 0 problem(s), 0 warning(s).

## Chapter versus current Learn (chapter not edited)

- Chapter facts checked and current: Basic retirement, Standard v2 only with StandardV2 NAT gateway, Global tier not on Standard v2, routing preference Internet limits (zone-redundant IPv4 only, not with NAT gateway, supported resource list), idle timeout 4–30 / fixed 4 outbound, prefix sizes and rules, NAT gateway 16 IPs and precedence, Azure Firewall 250 IPs and no direct prefix, BYOIP phases, models, regional commissioning, removal order.
- **Availability zones of a Standard address.** The chapter says "Zone-redundant or zonal". "Public IP addresses in Azure" also lists **non-zonal** Standard addresses, and says zone-redundant addresses exist only in regions with 3 live zones. Minor gap.
- **VPN gateway public IPs.** "Reliability in Azure Virtual Network Gateways" now says new gateways are automatically zone-redundant and require zone-redundant Standard public IPs. The chapter's VPN gateway row ("a static Standard address") could add "zone-redundant".
- **Public IP move rules missing from the chapter**: Standard addresses can move to another resource group while attached (except to a VPN gateway), to another subscription only when detached, never to another region ("Create, change, or delete an Azure public IP address"). Q7 relies on this page; the chapter only says "same region and subscription".
- Domain name label scope (reuse protection) is in preview on Learn; not used.

## Doubts and choices in the quiz

- Q10: the Global tier row shows "-" for zones and routing preference (the chapter says Global tier addresses have no zones). Reference title for `vpn-gateway/about-zone-redundant-vnet-gateways` is the title the page returned ("Reliability in Azure Virtual Network Gateways"); the URL may redirect.
- Q5: "a unified prefix can't be the parent of regional prefixes" is inferred from "ranges can't be migrated between models"; Learn doesn't state it in those words.
- Mock-exam questions read (az700-1a-26 to 1a-50, cs3a-byoip): no scenario or decision reused. 1a-26/1a-41/1a-42 offer `Basic` as a distractor value, which is retired: acceptable as a wrong option, mentioned for review.
