Azure Virtual WAN is a Microsoft-managed networking service that brings site-to-site VPN, point-to-site VPN, ExpressRoute, virtual network transit, Azure Firewall and partner appliances together in regional **virtual hubs**. Instead of building and routing a hub virtual network yourself, you create hubs, plug connections into them and steer traffic with hub route tables. This chapter covers the type to choose, the architecture, the hub and its capacity, gateway scale units, hub routing and third-party network virtual appliances (NVAs).

<!-- section: virtual-wan-type | objectives: 2.4.1 -->
## Selecting the Virtual WAN type

The type is set on the **Virtual WAN** resource, and every hub of that WAN gets the matching hub type.

| Virtual WAN type | Hub type | Available configurations |
| --- | --- | --- |
| Basic | Basic | Site-to-site VPN only |
| Standard | Standard | ExpressRoute, User VPN (point-to-site), site-to-site VPN, inter-hub and VNet-to-VNet transit through the hub, Azure Firewall, NVA in the hub |

What else separates them:

| Capability | Basic | Standard |
| --- | --- | --- |
| Hubs meshed with each other | No | Yes, full mesh over the Microsoft backbone, automatically |
| Hub router, custom route tables, routing intent | No | Yes |
| Change gateway scale units | No | Yes |
| BGP peering with an NVA in a spoke | No | Yes |

You can **upgrade** a Basic WAN to Standard (delete any preexisting hub routes first); you **can't go back** from Standard to Basic. A hub is billed as soon as it exists, even without a gateway.

> **Exam trap.** A requirement that mentions ExpressRoute, remote users, Azure Firewall in the hub, or traffic between two virtual networks through the hub always needs Standard. Basic is only for branch offices connected by site-to-site VPN.

<!-- section: architecture | objectives: 2.4.2 -->
## Designing a Virtual WAN architecture

The building blocks:

| Resource | Role |
| --- | --- |
| Virtual WAN | Overlay resource that groups the hubs; WANs are isolated from each other and can't share a hub |
| Virtual hub | Microsoft-managed virtual network in one region that hosts the gateways, the hub router, and optionally Azure Firewall or partner NVAs |
| Hub virtual network connection | Connects a spoke virtual network to a hub |
| VPN site | Represents an on-premises VPN device (site-to-site only), with up to four links |
| User VPN configuration | Tunnel type and authentication of point-to-site users, defined at the WAN level |
| Hub route table | Routes, associations and propagations that drive the hub router |

A Standard WAN gives **any-to-any** transit, the "global transit network architecture": branch to virtual network, branch to branch, remote user to virtual network and to branch, virtual network to virtual network, in the same region or across regions through the meshed hubs. Gateway transit is automatic; you don't configure "use remote gateways" as you would with peering.

Design rules that the exam tests:

- A virtual network connects to **one** hub only. Several hubs can exist in the same region.
- A spoke connected to a hub **can't have its own virtual network gateway** (VPN or ExpressRoute) nor an Azure Route Server: remove them before connecting it.
- Spokes connected to a hub in the same region are billed as virtual network peering; to a hub in another region, as global peering.
- The hub router handles up to **50 Gbps** of VNet-to-VNet traffic and accepts at most **10,000 routes** from all connected resources.
- The gateways are always **active-active** and are spread across availability zones when the region supports them. Azure Firewall in a hub isn't zone-redundant unless you deploy it with zones.
- For multi-region resiliency, connect sites and users to several hubs.

Choosing the services to put in each hub:

| Requirement | Hub service |
| --- | --- |
| Many branch offices with VPN devices or SD-WAN | Site-to-site VPN gateway, or an SD-WAN partner NVA in the hub |
| Remote users with the Azure VPN Client or a native client | Point-to-site (User VPN) gateway |
| Private circuits from datacenters | ExpressRoute gateway |
| Inspect traffic between spokes, branches, hubs or to the internet | **Secured virtual hub**: Azure Firewall, a supported NGFW NVA or a SaaS firewall, with routing intent |

**Virtual WAN or a hub virtual network you manage?** Virtual WAN fits many branches, many regions, any-to-any connectivity and a managed router. A customer-managed hub virtual network fits when you need full control of the hub: your own UDRs on hub subnets, Azure Route Server, a VPN gateway in a spoke, or services that must live in the hub virtual network itself.

> **Exam trap.** ExpressRoute-to-ExpressRoute traffic between two on-premises sites doesn't transit the hub by default: enable **Global Reach** between the circuits, or send it through a hub firewall with a private routing policy. The firewall option is enabled by a support case and requires Global Reach to be disabled: the two options can't be combined.

<!-- section: create-hub | objectives: 2.4.3 -->
## Creating a virtual hub

Order of operations: create the **Virtual WAN** (choose Standard), create the **hub**, connect the **virtual networks**, add the **gateways** (at creation or later), then the sites, circuits and users.

Settings on the **Basics** tab of the hub:

| Setting | What to know |
| --- | --- |
| Region | One hub per region is typical; more are allowed |
| Hub private address space | Minimum **/24**, **/23 or larger** recommended, **/22** for Azure Firewall to scale; can't be changed after creation; must not overlap other hubs, connected virtual networks or on-premises ranges |
| Virtual hub capacity | Routing infrastructure units of the hub router (see the next section) |
| Hub routing preference | ExpressRoute (default), VPN or AS Path |

The address space feeds subnets that Azure assigns automatically to the router, the gateways, Azure Firewall and NVAs: you never create a `GatewaySubnet` in a hub. Creating a hub alone takes a few minutes; with a gateway, about 30 minutes. Wait until **Routing status** shows **Provisioned** before configuring routing. If the hub is provisioned but the routing status is **Failed**, use **Reset Router**.

```bash
az network vwan create --name vwan-contoso --resource-group rg-net --type Standard --location westeurope

az network vhub create --name hub-weu --resource-group rg-net --vwan vwan-contoso \
  --address-prefix 10.100.0.0/23 --location westeurope --sku Standard \
  --hub-routing-preference ExpressRoute

az network vhub connection create --name conn-spoke1 --resource-group rg-net \
  --vhub-name hub-weu --remote-vnet vnet-spoke1
```

> **Exam tip.** "The hub will later host Azure Firewall" decides the prefix length: /22 at least. A /24 hub works but leaves no room to grow, and the address space can't be enlarged afterwards.

<!-- section: scale-units | objectives: 2.4.4 -->
## Choosing scale units

Two different settings are often confused:

- **Routing infrastructure units** (virtual hub capacity) size the **hub router**: VNet-to-VNet throughput and number of virtual machines in the connected spokes.
- **Gateway scale units** size each **gateway**: aggregate throughput of site-to-site, point-to-site or ExpressRoute.

Hub router: the default and minimum is **2 units = 3 Gbps and 2,000 VMs**. Beyond, each unit adds about 1 Gbps and 1,000 VMs, up to 50 units (50 Gbps, 50,000 VMs). Scaling out can take up to 25 minutes; the router also autoscales but never below the minimum you set, so set the minimum to the expected load. A single TCP flow above 1.5 Gbps may degrade whatever the capacity.

Gateways:

| Gateway | One scale unit | Range | Maximum |
| --- | --- | --- | --- |
| Site-to-site VPN | 500 Mbps | 1 to 20 units | 20 Gbps aggregate per hub; 1,000 VPN connections or 2,000 tunnels |
| ExpressRoute | 2 Gbps | 1 to 10 units | 20 Gbps |
| Point-to-site (User VPN) | 500 Mbps | 1 to 200 units | 100,000 users, 100 Gbps |

Point-to-site units and concurrent connections:

| Scale units | Concurrent connections | Aggregate throughput |
| --- | --- | --- |
| 1 | 500 | 0.5 Gbps |
| 4 | 1,000 | 2 Gbps |
| 7 | 5,000 | 3.5 Gbps |
| 11 | 10,000 | 5.5 Gbps |
| 40 | 20,000 | 20 Gbps |
| 200 | 100,000 | 100 Gbps |

Size a site-to-site gateway by the **aggregate** of all branches: 40 branches at 50 Mbps need 2 Gbps, so 4 units. Each connection count holds until the next row: 1 to 3 units give 500 connections, 4 to 6 give 1,000, 7 to 10 give 5,000, 11 to 20 give 10,000. Size a point-to-site gateway by the **concurrent users** first: 3,000 users need 7 units even if they use little bandwidth. At 40 units or more, plan the client address pool accordingly.

> **Exam trap.** Adding gateway scale units doesn't help when spokes with thousands of VMs saturate VNet-to-VNet traffic: that is the hub capacity (routing infrastructure units). The reverse is also true.

<!-- section: hub-gateways | objectives: 2.4.5 -->
## Deploying gateways into a virtual hub

A hub gateway isn't a virtual network gateway: it lives in the hub, scales in scale units and is always active-active. Create it on the hub tabs (**Site to site**, **Point to site**, **ExpressRoute**) at creation, or later with **Edit virtual hub**. Each operation takes about 30 minutes.

**Site-to-site VPN.**

1. Create the gateway (scale units, optional BGP settings).
2. Create a **VPN site** per office: device vendor, up to four **links** (one per ISP), public IP or FQDN of each link, BGP or the private address spaces.
3. **Connect** the VPN sites to the hub: shared key, IPsec policy, BGP.

**Point-to-site (User VPN).**

1. Create a **User VPN configuration** on the WAN: tunnel type (OpenVPN, IKEv2, or both) and authentication (Azure certificate, RADIUS, Microsoft Entra ID; Entra ID requires OpenVPN).
2. Create the point-to-site gateway in the hub: scale units, the User VPN configuration, a **client address pool** that overlaps nothing, up to five custom DNS servers.
3. Download the **global profile** (from the WAN; it includes the hubs that use the same User VPN configuration and connects users to the closest one) or a **hub profile** (one hub). With RADIUS and the global profile, enable **Use Remote/On-premises RADIUS server** and allow the RADIUS proxy IPs on the server.

**ExpressRoute.**

1. Create the ExpressRoute gateway (scale units). Local, Standard and Premium circuits are supported.
2. Check that the circuit's private peering is **Provisioned**.
3. In **Connectivity > ExpressRoute**, select the circuit and **Connect circuit(s)**, or **Redeem authorization key** for a circuit in another subscription.
4. Enable **Propagate default route** on the connection if a `0.0.0.0/0` learned by the hub (for example from Azure Firewall) must be advertised on-premises.

```bash
az network vpn-gateway create --name vpngw-weu --resource-group rg-net --vhub hub-weu --scale-unit 2

az network express-route gateway create --name ergw-weu --resource-group rg-net \
  --virtual-hub hub-weu --min-val 2
```

Branch-to-branch traffic (VPN sites, circuits and users reaching each other through the hub) is **enabled by default** in the WAN configuration. To delete a site-to-site gateway: disconnect the VPN sites, delete the connections, then the gateway.

> **Exam trap.** "Connect the existing spoke VNet1, which has a VPN gateway, to the hub" fails until the gateway is removed: the spoke uses the hub gateways.

<!-- section: hub-routing | objectives: 2.4.6 -->
## Configuring virtual hub routing

Routing in a hub is driven by **route tables** and by the routing configuration of each **connection** (VPN, ExpressRoute, point-to-site, hub virtual network connection):

| Concept | Meaning |
| --- | --- |
| Association | The one route table whose routes the connection uses to forward traffic; several connections can share a table |
| Propagation | The route tables into which the connection advertises its prefixes; can be several |
| Label | Groups route tables; propagating to the label **Default** reaches the Default route table of **every** hub of the WAN |
| Default route table | Exists in every hub; by default every connection associates and propagates to it, so everything reaches everything |
| None route table | Propagating to None means the connection advertises nothing |
| Static route | Prefixes with a next hop (a VNet connection or an IP); overrides a dynamic route for the same prefix |

Rules to remember:

- All branch connections (site-to-site, point-to-site, ExpressRoute) must be **associated with the Default** route table and propagate to the same set of tables.
- `0.0.0.0/0` stays in the local hub: it isn't propagated to other hubs, and a connection learns it only if **Propagate default route** (or **Enable internet security**) is on.
- Virtual WAN can't inject a route equal to or more specific than a spoke's own prefix: it can't redirect traffic between subnets of the same spoke.

Classic scenario, **isolated virtual networks** that still reach the branches:

| Connections | Associated route table | Propagating to |
| --- | --- | --- |
| Virtual networks | RT_VNet (custom) | Default |
| Branches (VPN, ExpressRoute, point-to-site) | Default | RT_VNet and Default |

RT_VNet contains only branch prefixes, so the virtual networks don't learn each other.

**Hub routing preference** decides between several routes to the same on-premises prefix, after **longest prefix match** and **static over BGP**:

| Setting | Behaviour |
| --- | --- |
| ExpressRoute (default) | Local hub before remote hubs; ExpressRoute over VPN for local routes; then shortest AS path |
| VPN | Local hub before remote hubs; VPN over ExpressRoute; then shortest AS path |
| AS Path | Shortest AS path first, whatever the source (remote ExpressRoute routes always last); then local hub and the ExpressRoute rule |

**Routing intent** replaces custom route tables when traffic must be inspected. Each hub has at most one **Internet** policy (internet traffic of branches and spokes goes to the security solution) and one **Private** policy (branch, VNet and **inter-hub** traffic goes to it). Private prefixes default to the RFC 1918 ranges; add other ranges as additional prefixes on every hub. Prerequisites: no custom route tables and no static routes to a VNet connection. Enable it on **all** hubs to avoid asymmetric routing.

> **Exam trap.** Custom route tables can't steer traffic between two hubs through a firewall: only a private routing policy inspects inter-hub traffic.

<!-- section: third-party-nva | objectives: 2.4.7 -->
## Integrating a third-party NVA

Three ways to bring a partner appliance into Virtual WAN:

| Model | How | Use it for |
| --- | --- | --- |
| NVA **in the hub** | Managed application from Azure Marketplace, jointly managed by Microsoft and the vendor | SD-WAN termination of branches, or a next-generation firewall as routing intent next hop |
| NVA **in a spoke** | Spoke connected to the hub; BGP peering with the hub router or static routes | Any appliance, full control of the VM, indirect spokes behind the NVA |
| **SaaS** security | Palo Alto Networks Cloud NGFW, selected as routing intent next hop | A firewall service without managing appliances |

**NVA in the hub.** Requires a Standard hub, /23 or larger recommended. Supported partners include SD-WAN vendors (Barracuda, Cisco SD-WAN with Catalyst 8000V, Arista VeloCloud, Versa, HPE Aruba EdgeConnect), firewalls (Check Point, Fortinet, Cisco Secure Firewall Threat Defense) and a dual-role Fortinet SD-WAN and NGFW appliance (up to 20 units). New VMware SD-WAN deployments are blocked since the end of June 2026: Learn recommends Arista VeloCloud. Capacity is set in **NVA infrastructure units** (about 500 Mbps each, 2 to 80 depending on the vendor). Licenses are bring-your-own. You configure it from the vendor's management portal: you can't sign in to the VMs nor change the managed resource group. An SD-WAN NVA peers with the hub router, so branch prefixes appear in hub routing like those of a Microsoft gateway.

**NVA in a spoke with BGP.** In the hub, add a **BGP peer** (name, ASN, NVA IP, VNet connection). Peer with **both** addresses of `virtualRouterIps` and advertise the same routes to both. Limits: 8 BGP peers per hub, only NVAs in directly connected spokes, 16-bit ASNs that differ from the hub's and aren't reserved (65515, 65517 to 65520, 8074, 8075, 12076...), an address assigned to an NVA interface (no loopback), at most 4,000 routes from the NVA. On a secured hub, BGP peering is supported only when routing intent is configured. The NVA connection is treated as a branch: associate it with the Default route table, and keep branch-to-branch enabled so that the NVA exchanges routes with VPN and ExpressRoute sites.

**NVA in a spoke with static routes.** For indirect spokes peered with the NVA virtual network: a static route in the hub's Default route table (indirect spoke prefixes, next hop = the NVA VNet connection), a static route on that VNet connection with next hop IP = the NVA, and a UDR `0.0.0.0/0` to the NVA in the indirect spokes.

> **Exam tip.** "Use the existing SD-WAN of the branches without deploying VMs to manage" points to a partner NVA in the hub. "Inspect traffic with a firewall the team already runs on its own VMs" points to an NVA in a spoke.

<!-- section: key-points -->
## Key points

- Basic: site-to-site VPN only, no meshed hubs; Standard: everything else. Basic can be upgraded to Standard, never the reverse.
- One virtual network connects to one hub, without its own gateway or Route Server.
- Hub address space: /24 minimum, /23 recommended, /22 for Azure Firewall, immutable.
- Hub capacity: 2 routing infrastructure units by default (3 Gbps, 2,000 VMs), up to 50.
- Scale units: site-to-site 500 Mbps, ExpressRoute 2 Gbps, point-to-site sized by concurrent users.
- Association = one table used to forward; propagation = tables that learn the routes; label Default = every hub.
- Hub routing preference: ExpressRoute by default, then VPN or AS Path.
- Routing intent: one Internet and one Private policy per hub, the only way to inspect inter-hub traffic.
- Partner NVA in the hub (managed application), NVA in a spoke (BGP peering or static routes), or SaaS firewall.
