# QZ-sc-900-31-azure-infrastructure-security

File: `content/sc-900/quizzes/31-azure-infrastructure-security.yaml`, 10 questions (`sc900-qz-31-01` to `-10`).
Check: `npx tsx factory/check-quiz.ts sc-900 31-azure-infrastructure-security` → 0 problem(s), 0 warning(s).
Objectives: 3.1.1 = q3, 3.1.2 = q6, 3.1.3 = q9, 3.1.4 = q2, q5, 3.1.5 = q1, q10, 3.1.6 = q8, 3.1.7 = q4, q7. Types: single 5, yesno 2, dragdrop 1, multi 1, dropdown 1. Positions 6–10: dragdrop, multi, single, dropdown, yesno.

The 63 mock questions `sc900-3a-*` / `sc900-3b-*` of 3.1.x cover almost every fact of the chapter. The quiz tests other decisions: NSG first-match processing and the 100–4096 custom priority range against the 65000+ default rules (q1, q10); no inbound internet access without public IP / public load balancer (q2); DDoS IP Protection as the least-cost tier for two IPs (q3); Key Vault certificate auto-renewal vs Application Gateway / Firewall Premium (q4); filtering at each segment boundary (q5); Firewall SKU per requirement incl. Basic alert-only TI and Premium outbound TLS inspection (q6); Bastion + Key Vault secret combination (q7); Bastion Premium private-only deployment (q8); WAF Detection vs Prevention mode combined with DDoS layers (q9).

## Sources fetched (learn.microsoft.com, 2026-11-24)

Docs: ddos-protection-sku-comparison, firewall/choose-firewall-sku, web-application-firewall/ag/ag-overview, virtual-network/network-security-groups-overview, virtual-network/virtual-networks-overview, virtual-network/ip-services/default-outbound-access, bastion/bastion-sku-comparison, bastion/bastion-overview, bastion/private-only-deployment, key-vault/general/overview, key-vault/certificates/about-certificates. Training units 2–6 of `describe-basic-security-capabilities-azure`.

## Chapter issues against current Learn

- **Default outbound access (network-segmentation table, row "Outbound to the internet: Allowed").** Learn's default outbound access page (updated 2026-09-10): the Azure portal already creates private subnets by default, and with the API versions released after March 31, 2026, subnets of new virtual networks have `defaultOutboundAccess = false`. The VNet overview and the SC-900 training unit still say outbound is allowed by default. The chapter row is at least incomplete; no quiz question relies on it.
- **Bastion and peering.** The chapter says Bastion "also reaches the virtual machines of peered virtual networks" without a SKU caveat; the Developer SKU doesn't support peering (SKU comparison). q8 uses this as a distractor reason.
- **WAF deployment options.** The training unit now lists Application Gateway, Application Gateway for Containers, Front Door and Azure CDN; the chapter says "mainly Application Gateway or Front Door" (acceptable).
- **WAF modes** are not in the SC-900 training unit (only on the docs page); the chapter teaches them, q9 relies on the docs page.
- **French chapter**: « réseaux virtuels appairés » (Bastion section) — the writing guide and glossary ask for « peering » (« reliés par peering »), not « appairé ». Used « reliés par peering » in the quiz.

## Doubts / unverified

- q3: "least cost" for two IPs relies on the pricing model (IP Protection per protected IP, Network Protection per 100 protected IP addresses, tier comparison page); actual prices were not fetched.
- q4: DigiCert is a Key Vault partner CA (about-certificates page); the stem doesn't say so, the explanation does.
- q6: Basic "up to 250 Mbps" is the documented recommendation; "about 150 Mbps" is my scenario figure.
- q8: the private-only page says on-premises clients over ExpressRoute reach the bastion's private IP; it recommends the native client for end-to-end private connectivity (Premium supports it). The stem doesn't say "from the Azure portal", on purpose.
- q10: Firewall in the hub doesn't filter spoke-internal traffic without routing; the statement only says the NSG default rules still apply, which is true regardless.
- French: « inondation SYN », « mode Détection / mode Prévention » (mode names capitalized as in the English portal values), « Mbit/s », « passerelle d'application » are my choices, not checked on fr-fr pages.
