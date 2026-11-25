# QZ-az-700-15-routing-nat — notes

`content/az-700/quizzes/15-routing-nat.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.3.4 (q6), 1.3.5 (q1), 1.3.6 (q5, q9), 1.3.7 (q4, q10), 1.3.8 (q7), 1.3.9 (q3), 1.3.10 (q2, q8). Positions 6–10: single, yesno, multi, dropdown, yesno (exhibit).

## Chapter vs current Learn (fix in the chapter, not done here)

- **None routes are removed by a default route** (section user-defined-routes): "Azure virtual network traffic routing" says a 0.0.0.0/0 UDR removed the None system routes for 10.0.0.0/8, 192.168.0.0/16 and 100.64.0.0/10 in its example. It also says a 0.0.0.0/0 route with next hop Virtual network gateway removes the None default routes. The chapter lists the None routes but doesn't mention this, and an exam effective-routes exhibit depends on it. I kept these None rows out of the q10 exhibit for this reason.
- **Management NIC** (section forced-tunneling): "Azure Firewall Management NIC" says **Propagate gateway routes must be disabled** on AzureFirewallManagementSubnet, and that the management public IP must have the same SKU, tier and location as the firewall's public IP. The chapter only says "the only allowed route is a default route to the internet". q9 uses the propagation rule, so the chapter should add it.
- **DNAT with forced tunneling**: "Azure Firewall forced tunneling" says DNAT isn't supported with forced tunneling enabled, but also says "Firewalls with a Management NIC still support DNAT". The chapter's flat "DNAT isn't supported in forced tunneling mode" is too simple. The quiz doesn't test DNAT.
- **NAT gateway: up to 800 subnets**: neither "NAT Gateway Resource" nor "What Is Azure NAT Gateway?" gives this figure. The resource page says no maximum is stated there. Not verified, not used.
- **BYOIP / custom IP prefix with StandardV2**: not stated on the NAT pages I fetched. Not verified, not used.
- **ICMP**: the chapter's SKU table says Standard supports TCP and UDP, and StandardV2 adds ICMP Echo. "NAT Gateway Resource" says only ICMP Echo Request/Reply is supported, without tying this to a SKU. Worth rechecking.
- **StandardV2 + DDoS**: "What Is Azure NAT Gateway?" lists DDoS Protection on StandardV2 NAT gateway public IPs as **Preview**. The resource page says public IPs with DDoS protection aren't supported. This is consistent with the chapter as long as the preview stays out of answers.
- **French**: the FR chapter uses « route(s) définie(s) par l'utilisateur ». The glossary prefers « itinéraire défini par l'utilisateur », and the mock questions use « itinéraire ». The quiz uses « itinéraire » (with « route par défaut » as Learn FR writes it).

## Facts checked for the quiz (pages fetched)

- q1: one route table per subnet, many subnets per table, no association with a VNet, same region and subscription ("Azure virtual network traffic routing", "Create, change, or delete an Azure route table").
- q2, q3: no NAT gateway in a gateway subnet or SQL MI subnet. Basic LB and Basic IPs are incompatible. Instance IPs coexist with a NAT gateway. NAT gateway on AzureFirewallSubnet. Private subnets by default since March 31, 2026. Outbound rules apply to public Standard LBs, and an internal LB has no outbound access until it is enabled explicitly ("Outbound Rules for Azure Load Balancer").
- q4: effective routes are returned only for a running VM ("Diagnose an Azure virtual machine routing problem").
- q5: with a 0.0.0.0/0 route to an appliance, Azure service public IPs follow the route unless a service endpoint exists, and subnet resources are no longer directly reachable from the internet.
- q6: longest prefix match, then UDR > BGP > system for equal prefixes. A peering route (/16) beats a /8 UDR.
- q7: Route Server programs NVA routes into spokes that use the remote gateway or Route Server. It can't steer traffic between subnets of the same VNet, because VNet system routes beat BGP. Above 4,000 routes per peer, the session is dropped (Route Server FAQ).
- q8: Standard NAT gateway doesn't support zone-redundant deployments with a zone-redundant firewall, so use StandardV2 with StandardV2 IPs on AzureFirewallSubnet. No UDR change is needed ("Integrate Azure Firewall with NAT Gateway V2…" has no preview banner; "Scale SNAT ports with Azure NAT Gateway").
- q9: AzureFirewallManagementSubnet is /26 minimum. Its only route is a default route to the internet, with propagation disabled. Propagate gateway routes on AzureFirewallSubnet publishes BGP routes to it.

## Design notes

- Mock-exam decisions avoided: region of the route table, delete/dissociate, join permission, replacement sequence, next-hop-type matching, UDR vs BGP selection, None/propagation effects, service-tag CLI, Default Site, BGP DMZ bypass, Management NIC stop/start sequence, service-endpoint exception, Route Server subnet/ASN/ECMP/data path/branch-to-branch/deploy order, NAT allowlist prefix, CLI create, StandardV2 deployment, precedence with an NVA UDR, SNAT prefix size, zonal-to-V2 replacement.
- One doubt: q7 s3 relies on the FAQ wording (the session is dropped). The FAQ also explains that the count is learned routes plus routes in the update.
- No preview feature is a correct answer.
