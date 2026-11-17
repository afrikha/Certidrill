Network questions in AZ-305 give you requirements (private or over the internet, encrypted or not, layer 4 or layer 7, one region or several, lowest cost) and ask which service, SKU or topology to recommend. This chapter gives the decision rules.

<!-- section: internet-connectivity | objectives: 4.4.1 -->
## Connecting Azure resources to the internet

Treat outbound and inbound connectivity as two separate designs.

**Outbound.** A virtual machine needs an explicit outbound method:

| Method | Recommend when | Remember |
| --- | --- | --- |
| Azure NAT Gateway on the subnet | Default answer: predictable outbound IPs and no SNAT port exhaustion | Up to 16 public IPv4 addresses; outbound only; one per subnet; can't span virtual networks; takes precedence over load balancer outbound rules and instance-level public IPs |
| Outbound rules of a Standard public load balancer | The machines already sit behind that load balancer | You size the SNAT ports yourself |
| Standard public IP on the network interface | One machine needs its own address, inbound and outbound | Exposes the machine; doesn't scale |
| Azure Firewall or an NVA, reached by a `0.0.0.0/0` user-defined route | Outbound traffic must be inspected, filtered by FQDN or logged centrally | Associate a NAT gateway with the firewall subnet when the firewall needs more SNAT ports |

The Standard NAT gateway SKU is zonal (a single availability zone). **StandardV2** is zone-redundant and requires StandardV2 public IPs.

**Default outbound access** (an implicit, Microsoft-owned IP that can change without notice) is not a design option anymore: with the API versions released after March 31, 2026, the subnets of new virtual networks are **private** by default. Existing virtual networks aren't changed.

> **Exam trap.** A NAT gateway never accepts unsolicited inbound connections. To publish a service you still need a public IP, a load balancer, Application Gateway, Azure Front Door or an Azure Firewall DNAT rule.

**Inbound.**

| Requirement | Recommend |
| --- | --- |
| Publish a web application hosted in one region | Application Gateway (WAF_v2 when a web application firewall is required) |
| Publish a web application hosted in several regions | Azure Front Door |
| Publish a TCP or UDP service | Standard public load balancer |
| Inspect inbound non-HTTP traffic centrally | Azure Firewall DNAT rule |
| Administer virtual machines over RDP or SSH without public IPs on them | Azure Bastion |

Azure Bastion SKUs: **Developer** (shared, one connection at a time, no peered virtual networks, not for production), **Basic** (dedicated, reaches peered virtual networks), **Standard** (native client, shareable links, host scaling) and **Premium** (session recording, private-only deployment).

<!-- section: on-premises-connectivity | objectives: 4.4.2 -->
## Connecting Azure to on-premises networks

| Option | Path | Recommend when |
| --- | --- | --- |
| Site-to-site VPN (VPN Gateway) | IPsec/IKE tunnel over the public internet | An encrypted link at low cost, quick to deploy; internet latency is acceptable |
| Point-to-site VPN | OpenVPN, IKEv2 or SSTP from individual devices | Remote users. Microsoft Entra ID authentication, with Conditional Access and MFA, requires OpenVPN |
| ExpressRoute | Private connection through a connectivity provider; never crosses the public internet | Consistent latency, 50 Mbps to 10 Gbps, large data transfers, or a rule that forbids internet transit |
| ExpressRoute Direct | Dedicated 10, 100 or 400 Gbps ports on the Microsoft network | Massive ingestion, MACsec encryption, physical isolation |
| Azure Virtual WAN | Microsoft-managed hubs that join VPN, ExpressRoute and virtual networks | Many branches or regions, transit between all of them, minimal administrative effort |

ExpressRoute design facts:

- **Private peering** reaches virtual networks. **Microsoft peering** reaches the public endpoints of Microsoft services (Microsoft 365, Azure public IPs).
- SKUs: **Local** (one or two regions near the peering location, egress included in the price), **Standard** (all regions of the geopolitical area), **Premium** (all regions worldwide, 10,000 private peering routes instead of 4,000, more virtual network links, required for Microsoft 365).
- **Global Reach** connects two on-premises sites to each other through their circuits, over the Microsoft network.
- **FastPath** sends traffic straight to the virtual machines, bypassing the gateway. It requires an Ultra Performance, ErGw3AZ or ErGwScale gateway.
- A circuit has two connections in one peering location. For maximum resiliency, use two circuits in two peering locations. The low-cost backup is a site-to-site VPN: when both paths advertise the same route, Azure prefers ExpressRoute.

> **Exam trap.** ExpressRoute is private but **not encrypted** by default. "Encrypt the traffic" means MACsec (ExpressRoute Direct only, key stored in Key Vault) or an IPsec VPN tunnel over private peering.

VPN Gateway design facts: recommend the zone-redundant SKUs **VpnGw1AZ to VpnGw5AZ** (650 Mbps to 10 Gbps aggregate; 30 site-to-site tunnels, 100 from VpnGw4AZ) in active-active mode. The Basic SKU (100 Mbps, 10 tunnels, no BGP, no active-active, no zone redundancy) is for dev/test only. Above 100 tunnels, recommend Virtual WAN.

Hub-and-spoke is the reference topology:

```text
On-premises --- ExpressRoute / VPN ---+
                                      |
              Hub VNet: gateway, Azure Firewall, Azure Bastion, DNS
                |-- peering -- Spoke VNet A (workload)
                |-- peering -- Spoke VNet B (workload)

A to B: through the hub firewall (UDR) or a direct peering
```

Peering isn't transitive. Spokes reach on-premises through the hub gateway (*Allow gateway transit* on the hub, *Use remote gateways* on the spoke). They reach each other through the hub firewall with user-defined routes when traffic must be inspected, or by direct peering when latency matters most.

A **Basic** virtual WAN only supports site-to-site VPN. **Standard** adds ExpressRoute, user VPN, and transit between hubs and between virtual networks. **Azure Route Server** exchanges routes over BGP between NVAs and the virtual network, instead of user-defined routes maintained by hand.

> **Exam tip.** To connect two Azure virtual networks, peering (regional or global) is the default answer: Microsoft backbone, no gateway, lowest latency. Don't route traffic between virtual networks over ExpressRoute.

<!-- section: network-performance | objectives: 4.4.3 -->
## Optimizing network performance

| Requirement | Recommend |
| --- | --- |
| Lower latency, jitter and CPU use on virtual machines | Accelerated networking (SR-IOV: traffic bypasses the host and its virtual switch) |
| Lowest latency between the tiers of an application | Proximity placement group (same datacenter), with accelerated networking |
| Higher throughput between on-premises and Azure virtual machines | ExpressRoute FastPath |
| Faster web application for users worldwide | Azure Front Door: entry at the nearest edge location, split TCP, caching, Microsoft private WAN |
| Send users of a non-HTTP service to the closest region | Traffic Manager with Performance routing, or the global tier of Azure Load Balancer |
| Outbound connections fail under load | NAT gateway (SNAT port exhaustion) |
| Lower internet egress cost, performance is secondary | Routing preference **Internet** on the public IP |

**Routing preference** has two values. **Microsoft network** (default, "cold potato") keeps traffic on Microsoft's global network as long as possible and exits near the user: best performance. **Internet** ("hot potato") hands traffic to transit ISPs in the service's region: lower egress price.

> **Exam trap.** A proximity placement group can't span availability zones. "Lowest latency between tiers" and "survive a zone failure" are opposite requirements: read which one the question ranks first.

For content delivery, recommend Azure Front Door Standard or Premium: Front Door (classic) retires on March 31, 2027 and Azure CDN Standard from Microsoft (classic) on September 30, 2027.

<!-- section: network-security | objectives: 4.4.4 -->
## Optimizing network security

Each control answers a different requirement:

| Control | Works at | Recommend when |
| --- | --- | --- |
| NSG with application security groups | Layers 3-4, on a subnet or network interface | Segment traffic between subnets and application tiers |
| Security admin rules (Azure Virtual Network Manager) | Layers 3-4, evaluated before NSGs, across many virtual networks | Central guardrails that workload teams can't override (Deny, Always Allow) |
| Azure Firewall | Layers 3-7, stateful, central | Inspect and log outbound and spoke-to-spoke traffic in the hub; FQDN filtering, DNAT, threat intelligence |
| Web application firewall (WAF) | Layer 7, on Application Gateway or Azure Front Door | Protect web applications from SQL injection and cross-site scripting |
| Azure DDoS Protection | Layers 3-4, on public IPs | Mitigation tuned to your traffic, attack telemetry |
| Private endpoint | Private IP for one PaaS resource | Remove the public exposure of storage accounts, databases, vaults |

Azure Firewall SKUs. Recommend the lowest one that meets the requirements:

| SKU | Throughput | Distinctive features |
| --- | --- | --- |
| Basic | Up to 250 Mbps | Threat intelligence in alert mode only; no DNS proxy, no web categories |
| Standard | Up to 30 Gbps | Threat intelligence filtering, DNS proxy, web categories, FQDN filtering in network rules |
| Premium | Up to 100 Gbps | TLS inspection, IDPS, URL filtering on the full path |

To force all spoke traffic through the firewall, attach a route table with `0.0.0.0/0` and next hop *Virtual appliance* (the firewall's private IP) to the spoke subnets. **Forced tunneling** goes further: internet-bound traffic is sent to an on-premises firewall before it leaves.

Private access to PaaS services:

| Criterion | Service endpoint | Private endpoint |
| --- | --- | --- |
| Address of the service | Its public IP | A private IP of your virtual network |
| Access from on-premises over VPN or ExpressRoute | No | Yes |
| Scope | The whole service, allowed per subnet | One resource instance |
| Data exfiltration protection | No | Yes |
| DNS changes | None | Required (private DNS zone) |
| Cost | Free | Charged |

A private endpoint doesn't close the public endpoint by itself: also disable public network access on the resource.

DDoS tiers: **infrastructure protection** (free, always on, every Azure service), **DDoS IP Protection** (billed per protected public IP) and **DDoS Network Protection** (billed per 100 protected IPs; adds rapid response support, cost protection and a WAF discount).

> **Exam trap.** NSGs filter on IP addresses, ports and service tags, not on FQDNs or URLs. "Allow outbound traffic only to `*.contoso.com`" means Azure Firewall. "Block SQL injection" means WAF, not Azure Firewall. DDoS Protection covers layers 3-4; layer 7 attacks need a WAF.

<!-- section: load-balancing | objectives: 4.4.5 -->
## Choosing a load-balancing and routing solution

Two questions decide: is the traffic HTTP(S), and is the application in one region or several?

| Scope | HTTP(S), layer 7 | Non-HTTP(S), layer 4 or DNS |
| --- | --- | --- |
| Global | Azure Front Door | Traffic Manager, or the global tier of Azure Load Balancer |
| Regional | Application Gateway | Azure Load Balancer |

| Service | How it works | Capabilities | Limits |
| --- | --- | --- | --- |
| Azure Load Balancer (Standard) | Layer 4 pass-through, TCP and UDP | Public or internal, zone-redundant frontend, 99.99% SLA, HA ports on an internal load balancer for NVAs | No TLS termination, no URL routing |
| Azure Load Balancer, global tier | Static anycast public IP in front of regional Standard public load balancers | Instant failover between regions, closest region first, client IP preserved | Public frontend only |
| Application Gateway v2 | Regional layer 7 proxy in a virtual network | TLS termination and end-to-end TLS, URL path-based routing, multiple-site hosting, cookie affinity, autoscaling, zone redundancy, WAF with WAF_v2 | One region |
| Azure Front Door | Global layer 7 proxy at the Microsoft edge | TLS offload, path-based routing, caching, WAF, fast failover; origins by latency, priority or weight | HTTP(S) only |
| Traffic Manager | DNS answers; clients then connect directly to the endpoint | Any protocol; Azure, external and nested endpoints | Not in the data path: no TLS termination, no WAF; failover delayed by DNS caching |

Traffic Manager routing methods (one per profile; combine them with nested profiles):

| Method | Recommend when |
| --- | --- |
| Priority | Active/passive failover to a secondary region |
| Weighted | Gradual migration or a traffic split |
| Performance | Each user goes to the endpoint with the lowest latency |
| Geographic | Data sovereignty: the endpoint depends on where the DNS query comes from |
| MultiValue | Return several healthy endpoints in one DNS response |
| Subnet | Map client IP ranges to specific endpoints |

Azure Front Door **Premium** adds what Standard lacks: Private Link to origins, Microsoft-managed WAF rule sets and bot protection.

Services combine: Azure Front Door in front of Application Gateway gives a global entry plus per-request processing inside the virtual network. A **Gateway Load Balancer** inserts third-party NVAs transparently in the traffic path. **Application Gateway for Containers** is the layer 7 choice for Kubernetes workloads.

> **Exam trap.** Traffic Manager isn't a proxy. "Fast failover of a web application", "TLS offload", "WAF" or "caching" at global scale means Azure Front Door. Global, non-HTTP, with "a single static IP" or "preserve the client IP" means the global tier of Azure Load Balancer.

> **Exam tip.** Application Gateway v1 retired on April 28, 2026 and Basic Load Balancer on September 30, 2025. Valid answers use Standard_v2 or WAF_v2, and Standard Load Balancer.

<!-- section: key-points -->
## Key points

- Outbound: NAT gateway by default; Azure Firewall when traffic must be inspected. New virtual networks have private subnets, without default outbound access.
- Hybrid: VPN is encrypted over the internet; ExpressRoute is private, predictable and not encrypted by default; Virtual WAN for many sites; site-to-site VPN as the low-cost ExpressRoute backup.
- Performance: accelerated networking, proximity placement groups (one zone only), FastPath, Azure Front Door.
- Security: NSG for segmentation, Azure Firewall for central FQDN-aware inspection (Premium for TLS inspection and IDPS), WAF for layer 7, DDoS Protection for layers 3-4, private endpoints for PaaS.
- Load balancing: global HTTP(S) is Azure Front Door, regional HTTP(S) is Application Gateway, regional layer 4 is Azure Load Balancer, DNS-based global is Traffic Manager.
