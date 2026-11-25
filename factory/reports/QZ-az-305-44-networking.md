# QZ-az-305-44-networking — notes

`content/az-305/quizzes/44-networking.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 4.4.1 (q1, q6), 4.4.2 (q3, q9), 4.4.3 (q5, q8), 4.4.4 (q2, q7), 4.4.5 (q4, q10). Positions 6–10: single, yesno_statements, multi, dropdown, dropdown.

## Chapter vs current Learn (fix in the chapter, not done here)

- **French chapter terminology**: the Bastion paragraph says « réseaux virtuels appairés » twice. The glossary says to avoid « appairage » and to use « peering ». This quiz writes « réseaux virtuels en peering ».
- Bastion: the SKU comparison page now calls **Premium "the recommended choice for production deployments"**. Session recording "isn't available via native client". Private-only deployment requires Premium, has no public IP, and on-premises clients need ExpressRoute or VPN plus **IP-based connection**. Zone support for Bastion is still preview. The chapter's one-line SKU summary is right but doesn't mention these limits.
- Application Gateway for Containers: the overview now lists gRPC and "AI inference" traffic, mTLS, JWT validation and WAF. It implements Gateway API v1.6 and Ingress. The page doesn't state GA or preview; I treated it as GA, as the chapter does.
- ExpressRoute Direct page: it doesn't mention MACsec. MACsec is documented on "About encryption for Azure ExpressRoute" (Direct only, key in Key Vault, off by default). The chapter is right. 400-Gbps ports "require enrollment" and exist only at limited peering locations.
- Traffic Manager: Performance routing uses the latency to the client's **recursive DNS resolver**, not to the client itself. The chapter says "each user goes to the endpoint with the lowest latency", which is a simplification. MultiValue requires every endpoint to be External and given as an IPv4 or IPv6 address. The chapter doesn't say this, and q10 states it in the scenario.
- Confirmed as written: Firewall Basic (up to 250 Mbps, threat intelligence alert only, no DNS proxy, no network FQDN filtering), Standard (30 Gbps), Premium (100 Gbps, TLS inspection, IDPS, full-path URL filtering); DDoS rapid response, cost protection and the WAF discount are in Network Protection only; ExpressRoute Premium covers global connectivity, 10,000 routes and Microsoft 365, and Microsoft peering reaches Azure public services such as Storage; Front Door (classic) retires on March 31, 2027 and CDN Standard from Microsoft (classic) on September 30, 2027.

## Not verified on a fetched page

- q6: Learn says DNAT works for "port to port" translation, but its only example is TCP 80. I assumed TCP 22 works the same way.
- q10: Front Door's TLS offload and DNS-independent failover come from the chapter. The reference I fetched (the Front Door/CDN comparison page) doesn't detail them. The global tier of Azure Load Balancer as a distractor relies on the chapter's statement that it fronts regional Standard public load balancers.

## Design notes

- The 53 mock questions cover NAT gateway, Bastion Standard, ExpressRoute Local, encryption with VPN over private peering, FastPath, routing preference, PPG with zones, Firewall Standard, the private endpoint DNS setup, Gateway Load Balancer, and Traffic Manager Weighted, Geographic and Priority. This quiz tests other decisions instead: Bastion Premium for session recording; DDoS Network Protection; ExpressRoute Premium across geopolitical areas; Application Gateway for Containers; Traffic Manager Performance with an on-premises endpoint; Firewall DNAT for inbound non-HTTP traffic; Firewall Basic, alert-only threat intelligence and Premium for URL paths; migration from the classic CDN to Front Door Standard together with PPG and accelerated networking; ExpressRoute Direct with MACsec and both peerings; and Front Door in front of Application Gateway plus Traffic Manager Subnet and MultiValue.
