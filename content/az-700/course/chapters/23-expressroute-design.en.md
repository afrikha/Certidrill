Azure ExpressRoute is a private connection between an on-premises network and the Microsoft network that doesn't cross the internet. This chapter covers the design decisions: how to reach the Microsoft edge, which circuit SKU and bandwidth to buy, how to survive the loss of a site, which options to add, and which peerings to enable.

<!-- section: connectivity-models | objectives: 2.3.1 -->
## Selecting a connectivity model

An ExpressRoute **circuit** is a logical connection, identified by a **service key** (s-key), between your network and Microsoft through a **peering location** (a colocation facility such as Amsterdam or Silicon Valley, not an Azure region). Each circuit consists of two connections to two Microsoft Enterprise Edge routers (MSEEs), and routes are exchanged with BGP. Four models bring you to the MSEEs:

| Model | What the provider delivers | Who runs BGP with Microsoft | Choose it when |
| --- | --- | --- | --- |
| Cloud exchange colocation | A virtual cross-connection in a facility where you already have equipment; Layer 2 or managed Layer 3 | You (Layer 2) or the provider (managed Layer 3) | Your routers are colocated with a cloud exchange |
| Point-to-point Ethernet | A Layer 2 link from your datacenter to the peering location | You | One or two datacenters, you want to control routing |
| Any-to-any (IPVPN) | Azure appears as another site of your MPLS WAN; managed Layer 3 | The provider | Many branch offices already on an IPVPN |
| ExpressRoute Direct | A pair of physical ports directly on the MSEEs, without a provider | You | 10, 100 or 400 Gbps, physical isolation, many circuits |

With a managed Layer 3 service, the provider configures the peerings for you; with a Layer 2 service you configure them yourself (see the next chapter).

> **Exam tip.** "Azure must look like a branch office of the existing MPLS network" is any-to-any (IPVPN). "No service provider" or "100 Gbps" is ExpressRoute Direct.

<!-- section: sku-and-tier | objectives: 2.3.2 -->
## Selecting the circuit SKU and tier

A circuit SKU combines a **tier** (Local, Standard, Premium) and a **billing model** (metered or unlimited data).

| | Local | Standard | Premium |
| --- | --- | --- | --- |
| Azure regions reachable | One or two regions in or near the metro of the peering location | All regions of the geopolitical area | All regions worldwide (national clouds excluded) |
| IPv4 routes accepted on private peering | 4,000 | 4,000 | 10,000 |
| Virtual networks linked per circuit | 10 | 10 | 20 to 100, depending on the bandwidth |
| Global Reach | Not available | Yes | Yes |
| Outbound data transfer | Included | Per GB (metered) or included (unlimited) | Per GB (metered) or included (unlimited) |
| Microsoft 365 through Microsoft peering | No | No | Required |

Premium limits for linked virtual networks: 20 at 50 Mbps, 25 at 100 and 200 Mbps, 40 at 500 Mbps, 50 at 1 Gbps, 60 at 2 Gbps, 75 at 5 Gbps, 100 at 10 Gbps and above. Global Reach connections count against the same limit: a 10 Gbps Premium circuit can have, for example, 5 Global Reach connections and 95 gateway connections.

Billing models:

- **Metered data**: monthly fee, inbound transfer free, outbound transfer charged per GB.
- **Unlimited data**: higher monthly fee, inbound and outbound transfer included.
- **Local**: outbound data transfer is included in the price; the cheapest way to move a lot of data to the region next to the peering location. Not available at every peering location.

Bandwidth through a provider: 50, 100, 200 and 500 Mbps, 1, 2, 5 and 10 Gbps. ExpressRoute Direct adds 40, 100, 200 and 400 Gbps circuits, depending on the port pair.

Changes allowed without recreating the circuit:

| Change | Allowed |
| --- | --- |
| Increase the bandwidth | Yes, if the provider port has capacity |
| Decrease the bandwidth | No: create a new circuit |
| Standard to Premium, Premium to Standard | Yes |
| Standard or Premium to Local | Yes, with Azure CLI or PowerShell (not in the portal) |
| Metered to unlimited | Yes |
| Unlimited to metered | No |

Before moving from Premium to Standard, the circuit must fit the Standard limits again: at most 10 linked virtual networks, all in the geopolitical area, and no more than 4,000 routes.

> **Exam trap.** The peering location and the Azure region are different things. A Standard circuit in Amsterdam reaches every region of Europe, but a virtual network in East US needs Premium. A Local circuit in Amsterdam only reaches the local Azure region of that location.

<!-- section: resiliency | objectives: 2.3.3 -->
## Designing for redundancy, cross-region connectivity and disaster recovery

A single circuit already has two connections, each with its own BGP session, to two MSEEs; Microsoft recommends running both in **active-active** mode, and the SLA requires both sessions. What a single circuit doesn't protect against is the loss of the peering location. The portal names three architectures:

| Resiliency | Design | Protects against | Use |
| --- | --- | --- | --- |
| Standard | One circuit, two connections at one peering location | A link or device failure | Non-production and non-critical workloads |
| High | One **ExpressRoute Metro** circuit, its two connections in two sites of the same metropolitan area | The loss of one edge site | Critical workloads confined to one region |
| Maximum | Two circuits in two different peering locations, both linked to the virtual network | The loss of a whole peering location | Business-critical and mission-critical workloads |

On the Azure side, deploy the ExpressRoute virtual network gateway as **zone-redundant** (SKUs `ErGw1Az`, `ErGw2Az`, `ErGw3Az`) so that a zone failure doesn't cut connectivity.

**Disaster recovery with two circuits.** Choosing the second peering location is a trade-off: the same metro keeps the latency but shares the risk of a natural disaster; another metro of the same geopolitical area lowers that risk; another geopolitical area lowers it further but requires **Premium on both circuits**. When both circuits advertise the same routes, Azure load-balances per flow (ECMP). To make one circuit primary and the other standby, steer both directions:

| Direction | Method | Where |
| --- | --- | --- |
| Azure to on-premises | Advertise more specific prefixes on the preferred circuit | On-premises routers |
| Azure to on-premises | Higher **connection weight** on the preferred connection | Azure, on the gateway connection |
| Azure to on-premises | AS path prepending on the less preferred circuit | On-premises routers |
| On-premises to Azure | Higher BGP local preference for routes received on the preferred circuit | On-premises routers |

Steer both directions consistently, otherwise the flows are asymmetric.

**Cross-region connectivity.** With two regions and two sites, link each virtual network to both circuits ("bow-tie"): each region uses its local circuit and falls back to the remote one. A Standard circuit is enough when both regions are in the same geopolitical area; otherwise the circuits must be Premium. Virtual networks linked to the same circuit could talk to each other through the MSEEs, but this isn't recommended: use virtual network peering for traffic between virtual networks.

**VPN as a backup.** A site-to-site VPN connection can back up ExpressRoute **private peering**: the VPN gateway and the ExpressRoute gateway coexist in the same `GatewaySubnet` (/27 or larger), the VPN gateway must be route-based and can't be the Basic SKU. When the same prefix is learned from both, Azure prefers ExpressRoute. There is no VPN failover for Microsoft peering.

> **Exam trap.** Two circuits in the same peering location aren't a disaster recovery design: both end on the same site. Maximum resiliency means two different peering locations.

<!-- section: expressroute-options | objectives: 2.3.4 -->
## Designing Global Reach, FastPath and ExpressRoute Direct

| Option | Problem solved | Main requirements |
| --- | --- | --- |
| Global Reach | Two on-premises sites, each on its own circuit, must exchange traffic over the Microsoft network | Private peering on both circuits; circuits in different peering locations; supported countries/regions; Premium only if the circuits are in different geopolitical areas |
| FastPath | Traffic from on-premises to the virtual machines must skip the gateway to reduce latency | Gateway SKU `UltraPerformance`, `ErGw3AZ`, or `ErGwScale` with at least 10 scale units; in Virtual WAN, an ExpressRoute gateway with at least 5 scale units |
| ExpressRoute Direct | Very high bandwidth, physical isolation, or many circuits under your control | A pair of 10, 100 or 400 Gbps ports at a peering location; you provide the cross-connects |

**Global Reach.** Without it, two sites connected to Azure through two circuits can each reach the virtual networks but not each other. Global Reach links the private peerings of the two circuits; it needs a dedicated **/29** subnet that isn't used on-premises or in Azure. It is configured on one of the two circuits. It isn't transitive: with circuits A, B and C, linking A to B and B to C doesn't connect A to C. It is billed as an add-on, and it isn't available on Local circuits.

**FastPath.** The gateway is still required: it exchanges the routes. Only the data path changes, from the MSEE straight to the virtual machines. Not every flow is eligible:

| Capability | ExpressRoute Direct circuit | Provider circuit |
| --- | --- | --- |
| FastPath to the hub virtual network, IPv4 | Yes | Yes |
| FastPath to the hub virtual network, IPv6 | Yes | No |
| Virtual network peering over FastPath (same region) | Yes | No |
| User-defined routes over FastPath | Yes | No |
| Private endpoints over FastPath | Yes, limited availability | No |

Traffic that isn't eligible keeps flowing through the gateway, for example to a spoke reached by global virtual network peering or to an internal load balancer in a spoke.

**ExpressRoute Direct.** You own both ports and create circuits on them yourself:

| Port pair | Circuit bandwidths |
| --- | --- |
| 10 Gbps | 1, 2, 5, 10 Gbps |
| 100 Gbps | 5, 10, 40, 100 Gbps |
| 400 Gbps | 5, 10, 40, 100, 200, 400 Gbps (limited peering locations, enrollment required) |

The ports use single-mode fiber and accept QinQ or Dot1Q encapsulation. ExpressRoute Direct is the only model that supports **MACsec** encryption of the physical links, and it unlocks the full FastPath feature set. Typical triggers: massive data ingestion into Azure Storage or Azure Cosmos DB, regulated industries that require dedicated ports, one circuit per business unit.

> **Exam trap.** FastPath doesn't remove the gateway and doesn't work with the `Standard`/`ErGw1Az` or `HighPerformance`/`ErGw2Az` SKUs. "Reduce latency between on-premises and Azure VMs" with an `ErGw1Az` gateway requires changing the gateway SKU first.

<!-- section: peering-choice | objectives: 2.3.5 -->
## Choosing private peering, Microsoft peering or both

A circuit carries up to two peerings, each made of a pair of BGP sessions. They share the circuit bandwidth.

| | Azure private peering | Microsoft peering |
| --- | --- | --- |
| Gives access to | Resources in virtual networks, through their private IP addresses | Microsoft 365 and the public endpoints of Azure PaaS services |
| Addresses you advertise | Any valid address of your WAN, private or public | Public addresses that you or your provider own, verified in a routing registry |
| Azure side | An ExpressRoute virtual network gateway and a connection | A route filter; no gateway |
| Prefixes accepted | 4,000 IPv4 (10,000 with Premium) | 200 per BGP session |
| NAT | Not needed | Private addresses must be translated to public addresses before entering the Microsoft network |

Decision table:

| Requirement | Peering |
| --- | --- |
| Reach virtual machines, internal load balancers, private endpoints | Private only |
| Reach Azure Storage or Azure SQL Database public endpoints over ExpressRoute | Microsoft |
| Reach PaaS services privately without public addresses | Private only, with private endpoints |
| Microsoft 365 over ExpressRoute | Microsoft, with Premium and Microsoft authorization |
| IPsec tunnel to a VPN gateway public IP address over the circuit | Microsoft |
| Virtual networks and PaaS public endpoints | Both |

Microsoft recommends connecting private peering to your core network and Microsoft peering to your perimeter network (DMZ), since the latter exchanges public addresses.

> **Exam trap.** Private peering doesn't give access to the public endpoint of a storage account, and Microsoft peering doesn't give access to a virtual network. A service endpoint doesn't help on-premises clients either: use a private endpoint over private peering, or Microsoft peering.

<!-- section: key-points -->
## Key points

- Models: cloud exchange, point-to-point Ethernet (Layer 2, you run BGP), any-to-any IPVPN (managed Layer 3), ExpressRoute Direct (no provider).
- Local: nearby region only, data included, no Global Reach. Standard: the geopolitical area. Premium: worldwide, 10,000 routes, more virtual networks, Microsoft 365.
- Bandwidth can go up, not down; unlimited can't go back to metered.
- Resiliency: standard (one location), high (ExpressRoute Metro), maximum (two circuits in two peering locations). Zone-redundant gateway on the Azure side.
- Primary/standby circuits: more specific prefixes, connection weight or AS path prepending toward on-premises; local preference toward Azure.
- Global Reach connects on-premises sites through two circuits and needs a /29; FastPath needs `UltraPerformance`, `ErGw3AZ` or `ErGwScale` with 10 scale units; ExpressRoute Direct gives ports of 10, 100 or 400 Gbps and MACsec.
- Private peering reaches virtual networks; Microsoft peering reaches public endpoints and needs public addresses and a route filter.
