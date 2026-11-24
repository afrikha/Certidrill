# FIX-az-700-1 — chapters 11 to 16 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert az-700 11-vnets-subnets 12-public-ip 13-name-resolution 14-vnet-connectivity 15-routing-nat 16-network-monitoring` 0 problems; `content:validate --cert az-700` 0 problems, 0 warnings; `check-quiz az-700` (6 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed, and no section marker changed.

## 11-vnets-subnets

| Finding | Learn | Change |
| --- | --- | --- |
| Private subnet: preview or current behavior | Learn contradicts itself. default-outbound-access (the dedicated page) has no preview label and describes the March 31, 2026 API change. virtual-network-manage-subnet still says "This feature is in Preview" for the Private Subnet setting | None (the chapter follows the dedicated page). Needs a human decision |
| Private subnet limitations missing | Confirmed (default-outbound-access): routes with next hop `Internet` break; VMs still reach Azure Storage in the same region; private subnets don't apply to delegated or managed subnets | create-vnet: one sentence after the default outbound paragraph |
| `az network vnet subnet update --default-outbound false` not verified | Confirmed: `--default-outbound` / `--default-outbound-access` on `az network vnet subnet create` and `update` (CLI reference) | None |
| Multiple address prefixes: status | No preview or GA label (how-to-multiple-prefixes-subnet). VMs and scale sets only; CLI, PowerShell, ARM; portal support limited; no delegated subnets except GatewaySubnet delegated to ExpressRoute gateway services | None (the GatewaySubnet exception is a detail that the chapter leaves out) |
| `/2` largest subnet in the FAQ | Not used | None |
| FR « appairés » / « appairé » | Glossary: « peering » | « reliés par peering », « relié par peering » (3 places) |

## 12-public-ip

| Finding | Learn | Change |
| --- | --- | --- |
| Non-zonal Standard addresses; zone-redundant only with 3 live zones | Confirmed (public-ip-addresses): zone-redundant only in regions where 3 zones are live; non-zonal is only valid in regions without zones; IPs without zones are now zone-redundant | Settings table, Availability zone row |
| VPN gateway public IP should be zone-redundant | Confirmed (about-zone-redundant-vnet-gateways, title "Reliability in Azure Virtual Network Gateways"): new gateways of a supported SKU are zone-redundant, which needs Standard zone-redundant public IPs; every VPN SKU except Basic supports it | Association table, VPN gateway row |
| Move rules missing | Confirmed (virtual-network-public-ip-address): resource group while attached except to a virtual network gateway; subscription only when detached; never another region | Association rules: new bullet |
| DNL scope (preview) | Not used | None |

## 13-name-resolution

| Finding | Learn | Change |
| --- | --- | --- |
| Custom DNS "up to 20 addresses" | Confirmed on the limits page (azure-subscription-service-limits, "DNS servers per virtual network: 20"). manage-virtual-network gives no number | None |
| Resolver subnet /28 to /24 | Confirmed (dns-private-resolver-overview) | None |
| "One ruleset per virtual network" | Confirmed on the limits page ("DNS forwarding ruleset linked to a virtual network: 1"); not on the resolver pages | None |
| Resolver limits missing (2 rulesets per outbound endpoint, 15 resolvers, 10,000 QPS, no cross-tenant links, no encrypted VNets) | Confirmed (dns-private-resolver-overview limits table and restrictions) | Ruleset row: an outbound endpoint serves at most 2 rulesets; new sentence with the other limits |
| Inbound endpoint as a forwarding target | Confirmed (private-resolver-endpoints-rulesets): not for zones that aren't linked to the resolver's virtual network | Same paragraph |
| Traffic Manager at the apex | Confirmed (dns-alias): for new configurations, use Traffic Manager Linked Records (they work at the apex); alias records to a profile "remain supported for backward compatibility". dns-traffic-manager-linked-records has no preview or GA label | public-zones table, apex row: one sentence. The alias answer stays |
| Autoregistration removal: "stopped" or "deallocated" | autoregistration page: "deleted or stopped"; Private DNS FAQ: "stop a virtual machine and it is deallocated" | "stopped (deallocated) or deleted" |
| Manual record over an autoregistered one | Confirmed (dns-faq-private): the manual record overwrites it; after its deletion, autoregistration re-creates the record | private-zones: new sentence |
| FR « appairé », « Après l'appairage » | Glossary: « peering » | « relié par peering », « Après la création d'un peering » |

## 14-vnet-connectivity

| Finding | Learn | Change |
| --- | --- | --- |
| Virtual WAN hub as the hub of a hub-and-spoke configuration | Preview: "no SLA, not recommended for production" (concept-connectivity-configuration) | Connectivity table, Hub and spoke row: "in preview" |
| High-scale connected group (3,000 VNets) | Preview feature `AllowHighScaleConnectedGroup` plus an enablement form (concept-connectivity-configuration, concept-limitations) | Limits table row |
| Connected group default of 250 VNets | Confirmed (concept-limitations). Also confirmed there: 2,000/20,000 private endpoints, 1,000 spokes, 2 connected groups per VNet (soft limit) | None |
| Enforce peering status | No preview label | None |
| Cross-tenant network groups static only | Confirmed (concept-limitations: cross-tenant VNets can only be added manually) | None |
| Gateway transit order | manage-peering: the hub option needs a gateway or Route Server; the spoke option can be enabled only once the hub allows forwarding. The PowerShell sample of vpn-gateway-peering-gateway-transit creates the spoke link first; no order is stated as required | None: the trap says "create the gateway first, then set both sides", which Learn supports |
| "Except Basic" for gateway transit | Confirmed (vpn-gateway-peering-gateway-transit) | None |
| On-premises device must include the spoke prefixes | Not stated on the gateway transit page or the peering pages | None. Flagged below |
| FR « appairé », « appairer », « Après l'appairage », « route définie par l'utilisateur » | Glossary: « peering », « itinéraire défini par l'utilisateur » | Prose fixed (14 places). The four portal setting names keep « appairé »: that is their label on the fr-fr page (virtual-network-manage-peering) |

## 15-routing-nat

| Finding | Learn | Change |
| --- | --- | --- |
| None routes removed by a default route | Confirmed (virtual-networks-udr-overview): a 0.0.0.0/0 route with next hop Virtual network gateway removes the None routes; in the example, a 0.0.0.0/0 UDR removed those for 10.0.0.0/8, 192.168.0.0/16 and 100.64.0.0/10. The default table now also lists None for 127.0.0.0/8, 157.59.0.0/16, 104.146.0.0/17 and 104.147.0.0/16 | user-defined-routes: two sentences |
| Management NIC: propagation disabled; management public IP properties | Confirmed (management-nic): only a default route to the internet and Propagate gateway routes disabled; management public IP with the same SKU, tier and location as the firewall's public IP | forced-tunneling paragraph |
| DNAT with forced tunneling | forced-tunneling: "DNAT isn't supported with forced tunneling enabled" (asymmetric routing), then "firewalls with a Management network interface still support DNAT". Forced tunneling requires the Management NIC, so the page contradicts itself | The flat sentence now reports both statements. Needs a human decision |
| NAT gateway: 800 subnets | Confirmed on the limits page (Standard and StandardV2: 800 per NAT gateway); not on the NAT pages | None |
| BYOIP / custom prefix with StandardV2 | custom-ip-address-prefix: "Public IP Prefixes with Standard v2 IPs cannot be derived from a Custom IP Prefix"; nat-overview: StandardV2 takes only StandardV2 IPs or prefixes. Together they support the chapter's sentence | None |
| ICMP per SKU | nat-gateway-resource (the specific page): "StandardV2 NAT Gateway also supports ICMP Echo Request and Echo Reply". nat-overview has one generic sentence that lists ICMP for "Azure NAT Gateway" | None (the chapter follows the specific page) |
| StandardV2 + DDoS (preview) | Confirmed preview (nat-overview); nat-gateway-resource: public IPs with DDoS protection aren't supported | None here; mentioned in 16 |
| FR « route(s) définie(s) par l'utilisateur » | Glossary: « itinéraire défini par l'utilisateur » | Lead paragraph and route selection list. The section title keeps the study guide wording (objectives.yaml 1.3.4 fr) |

## 16-network-monitoring

| Finding | Learn | Change |
| --- | --- | --- |
| DDoS custom thresholds | ddos-protection-overview mentions custom policies with no label; ddos-custom-policy-overview: "(preview)", Standard Load Balancer frontend IPs only, fixed thresholds per protocol | ddos-protection: one sentence, marked preview |
| DDoS on NAT gateway IPs | StandardV2 NAT gateway IPs: preview (nat-overview) | Same paragraph: preview mention |
| DDoSMitigationReports | ddos-view-diagnostic-logs: stops around mid-August 2026, old pipeline deprecated by September 2026 (dates approximate); DDoSMitigationFlowLogs columns renamed | Logs table row |
| Connection monitor, on-premises sources | Confirmed (connection-monitor-overview): Arc enabled on each host by you; portal enables the monitoring extensions; Network Performance Monitoring solution in the workspace (+ Enable Non-Azure) | Sources bullet |
| VNet flow logs precedence NIC > subnet > VNet | Confirmed (vnet-flow-logs-manage: "enablement preference follows this order: NIC > subnet > virtual network") | None |
| NSG flow logs retirement September 30, 2027 | Confirmed (nsg-flow-logs-overview), with creation of new NSG flow logs no longer supported | None |
| Secure score models | Confirmed (secure-score-security-controls, title "Cloud Secure Score in Microsoft Defender for Cloud"): risk-based Cloud Secure Score in the Defender portal, classic score in the Azure portal (Recommendations > Switch to classic view), weighted sum across subscriptions | defender-secure-score: new bullet |
| VPN troubleshoot via CLI | Confirmed (vpn-troubleshoot-overview): same resource group for the gateway and the storage account with CLI, otherwise PowerShell or the portal | Details bullet |
| Cloud security explorer with Defender for Servers P2 | Confirmed (how-to-manage-cloud-security-explorer) | cloud-security-explorer bullet |

## Mock-exam bank questions changed

- `questions/core/az700-1c-mdc-secure-score-calc.yaml`: reference title "Secure score in Defender for Cloud" became "Cloud Secure Score in Microsoft Defender for Cloud" (current page title). The answer and explanations don't change.

## Checked and left unchanged

- Private subnet and outbound: az700-1a-09-private-subnet-outbound (the correct answer is a NAT gateway; the question relies on the portal creating private subnets, see the human decision below).
- Public IP zones, moves and association: az700-1a-41, 1a-44, 1a-45, 1a-46, 1a-49, 1a-12 (zone-redundant VpnGw2AZ). 1a-26, 1a-41, 1a-42 offer Basic only as a wrong option.
- DNS: az700-cs1b-apex-record and az700-1b-public-dns-record-types (alias to Front Door and to a Standard public IP: still correct), az700-1b-private-dns-ilb-record (lists Traffic Manager as an alias target, still supported), az700-1b-private-dns-link-troubleshoot ("stopped (deallocated)"), the resolver questions (1b-resolver-*, cs1a-dns-resolver, sr1-onprem-private-dns-*), 1b-private-dns-link-limits.
- AVNM: 1b-avnm-* and cs3b-lab-connectivity (no Virtual WAN hub or high-scale group as an answer).
- Routing: cs2b-effective-routes, 1c-rt-effective-routes-select (no None rows next to a 0.0.0.0/0 UDR or gateway route), 1b-udr-route-table-effects, 1c-ft-subnet-exceptions, 1c-ft-firewall-mgmt-nic, cs3c-forced-tunneling; NAT questions (no ICMP, BYOIP or DDoS dependency).
- Monitoring: 1c-ddos-statements (pip-nat is a Standard address on a Standard NAT gateway: option b stays wrong), the other DDoS questions (no DDoSMitigationReports answer), 1c-nw-vpn-troubleshoot-scope (no CLI), 1c-mon-insights-connectivity (Azure sources only), 1c-cse-prerequisites.

Note for a reviewer: in `az700-1c-ft-firewall-mgmt-nic`, the explanation of the distractor `noprop` says gateway route propagation "must stay enabled" on AzureFirewallSubnet. Learn (forced-tunneling) only says that you *can* enable it to receive the routes by BGP. The answer doesn't change; the wording could be softened.

## Quiz files

None changed. The six quizzes still agree with the corrected chapters (check-quiz 0/0).

## For a human decision

- Private subnet: GA (default-outbound-access, followed) or preview (virtual-network-manage-subnet, "This feature is in Preview").
- DNAT with forced tunneling: forced-tunneling contradicts itself. Chapter 15 now gives both statements. Out of my scope: `questions/security/az700-5b-fw-rules-dnat-multi.yaml` (objective 5.x) uses "DNAT isn't supported when forced tunneling is enabled" in its explanation and option d.
- Traffic Manager Linked Records: no preview or GA label on Learn (page updated 2026-10-05). Mentioned in chapter 13 as Learn's recommendation, not used as an answer.
- Chapter 14, service-chaining: "the on-premises VPN device must treat the spoke prefixes as interesting traffic (traffic selectors or BGP)". No fetched Learn page states it for gateway transit (the quiz report relies on the VPN Gateway FAQ rule for policy-based traffic selectors). Left unchanged.

## French terms not settled (not in the glossary, or not decided)

- Secure Score: the glossary lists it under `undecided` (« score sécurisé » / « score de sécurité »), but chapter 16 FR uses « degré de sécurisation » throughout (existing text, not changed), and the study guide title says « Score de sécurité ». "Cloud Secure Score" kept in English.
- Peering portal labels: fr-fr Learn writes « réseau virtuel appairé » in the four setting names; kept in chapter 14 as portal labels, prose uses « relié par peering ».
- New in this pass, not in the glossary: « non zonales » (non-zonal), « compatibilité descendante » (backward compatibility), « Traffic Manager Linked Records » (kept in English), « stratégie personnalisée DDoS Protection » (custom policy), « groupe connecté haute capacité » (high-scale connected group), « préversion ».
- Chapter 15 FR still uses « route » for system, BGP and default routes, which the glossary allows (« route système »); only the UDR phrases were changed.
