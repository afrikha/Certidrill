# QZ-sc-500-23-network-security — report

File: `content/sc-500/quizzes/23-network-security.yaml` (10 questions; every objective 2.3.1–2.3.9 tested, 2.3.1 twice). Check: `npx tsx factory/check-quiz.ts sc-500 23-network-security` → 0 problem(s), 0 warning(s).

The bank already has 91 questions for 2.3.x, which cover almost every single decision in the chapter. The quiz uses other decisions or combinations:

- VNet flow logs vs NSG flow logs (creation blocked, retirement Sept. 30, 2027)
- the Firewall Basic management subnet
- a custom IPsec/IKE policy to replace the default DH group 2
- load balancer probes blocked by a custom deny-all
- linking the private DNS zone to the spokes
- the NSG on Private Link service backends, which see the NAT IP
- routing intent with Propagate default route turned off for one VNet
- connector groups per site with a per-app Global Secure Access app
- the order of NIC and subnet NSG evaluation (hot area)
- the effective scope of an AVNM configuration: region, scope, SQL MI exception, dynamic membership

## Chapter vs current Learn (Nov. 2026)

I found no error in the chapter for the facts I used. Notes:

- **Security admin rules exclusions**: Learn lists more services whose subnets aren't affected: Application Gateway (unless network isolation is on), Azure Bastion, Azure Firewall, Azure Route Server, VPN Gateway, Virtual WAN and ExpressRoute Gateway. The chapter says "gateways, Azure Bastion, Azure Firewall or Azure Route Server", which is incomplete but not wrong. Learn also says the rules don't apply to private endpoints in a managed virtual network.
- **Routing intent next hops**: Learn names the eligible NGFW NVAs (Check Point, Fortinet NGFW, Fortinet NGFW+SD-WAN, Cisco). Azure Firewall Manager only supports Azure Firewall as a next hop. There's at most one SaaS solution per hub. The chapter is consistent with this.
- **Connector groups**: Learn now documents load-balancing modes: Random (default), session persistence, and Performance (preview). The chapter doesn't mention them.

## Doubts

- Q8 states that Quick Access is a single app using one connector group. "How to configure Quick Access" shows one connector group selected for the app, but it doesn't say explicitly that segments can't use different groups. The chapter's description supports this ("One app holding the primary set").
- Q7 (Virtual WAN): VNet-Test reaches the internet through its NAT gateway once it doesn't learn 0.0.0.0/0. This is inferred from the routing-policies page (connections with the flag off don't learn the default route) plus VNet system routes. It isn't stated in one sentence on Learn.
- Q4: Learn says the AzureLoadBalancer tag allows probes by default and that blocking 168.63.129.16 fails the probes. That a custom deny-all at 4000 overrides the default rule follows from NSG priorities. Learn's NSG page calls this an inference, not a documented example.
