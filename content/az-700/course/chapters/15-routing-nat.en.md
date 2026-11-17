Every subnet has a route table that Azure builds for you. Routing questions ask which route wins for a destination, how to change it (user-defined route, BGP, Azure Route Server), and what changes for internet-bound traffic when you force it through an appliance or a NAT gateway. Read the effective routes, apply longest prefix match, then the source priority.

<!-- section: user-defined-routes | objectives: 1.3.4 -->
## Designing and implementing user-defined routes

Azure creates **system routes** for every subnet: the virtual network's address ranges (next hop **Virtual network**), 0.0.0.0/0 (**Internet**), and **None** for 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 and 100.64.0.0/10 unless a range is in the address space. Optional system routes appear when you add a peering (**Virtual network peering**), a gateway (**Virtual network gateway**, for prefixes of local network gateways or learned by BGP) or a service endpoint (`VirtualNetworkServiceEndpoint`).

| UDR next hop type (CLI value) | Use |
| --- | --- |
| Virtual appliance (`VirtualAppliance`) | Send traffic to an NVA: the private IP address of its network interface, or the frontend of an internal load balancer in front of several NVAs |
| Virtual network gateway (`VirtualNetworkGateway`) | Send traffic to the VPN gateway. Supported only when the network's gateway is a VPN gateway, not ExpressRoute, Route Server or a Virtual WAN hub |
| Virtual network (`VNetLocal`) | Keep traffic inside the virtual network, overriding a broader UDR |
| Internet | Send a prefix directly to the internet, for example to exempt a subnet from forced tunneling |
| None | Drop the traffic |

You can't create a UDR with next hop **Virtual network peering** or `VirtualNetworkServiceEndpoint`. The address prefix of a UDR can be a **service tag** (`Storage`, `AppService.AustraliaCentral`), up to 25 such routes per route table; an explicit prefix wins over a service tag with the same prefix.

**Route selection** for an outbound packet:

1. **Longest prefix match** first: a /24 beats a /16 whatever its source.
2. Equal prefixes: **user-defined route**, then **BGP route**, then **system route**.
3. Exception: system routes for the virtual network, peerings and service endpoints are preferred over BGP routes, even more specific ones. A service endpoint route can't be overridden, even by a UDR.

An NVA that forwards traffic needs **IP forwarding** enabled on its Azure network interface (and usually in its operating system). Deploy it in a different subnet from the workloads that route through it, otherwise traffic loops. The next hop IP address must be directly reachable: not through an ExpressRoute gateway or Virtual WAN.

> **Exam trap.** A UDR 10.0.0.0/8 to the firewall doesn't catch traffic to a peered spoke 10.2.0.0/16: the peering route is more specific and wins. Add a UDR for 10.2.0.0/16 (or the exact spoke ranges) with the firewall as next hop.

<!-- section: route-table-association | objectives: 1.3.5 -->
## Associating a route table with a subnet

- A route table is associated with **zero or more subnets**; a subnet has **zero or one** route table. Route tables aren't associated with virtual networks.
- The subnet must be in a virtual network of the **same region and subscription** as the route table.
- **Propagate gateway routes** (`--disable-bgp-route-propagation`): set to No/true on a subnet that must not receive the on-premises routes of the VPN or ExpressRoute gateway (static and BGP). Never disable it on **GatewaySubnet**: the gateway stops working.
- A route table that is associated with a subnet can't be deleted: dissociate it first. The `Microsoft.Network/routeTables/join/action` permission is needed to associate it.
- On **GatewaySubnet**, don't associate a route table with a 0.0.0.0/0 route or with a route that sends the gateway subnet range to None or to an NVA: the gateway can't reach its management plane.

```bash
az network route-table create --resource-group RG1 --name rt-spokes --disable-bgp-route-propagation true
az network route-table route create --resource-group RG1 --route-table-name rt-spokes \
  --name default-to-fw --address-prefix 0.0.0.0/0 \
  --next-hop-type VirtualAppliance --next-hop-ip-address 10.0.1.4
az network vnet subnet update --resource-group RG1 --vnet-name Spoke1 --name workload \
  --route-table rt-spokes
```

<!-- section: forced-tunneling | objectives: 1.3.6 -->
## Configuring forced tunneling

Forced tunneling sends internet-bound traffic to on-premises (or to an appliance) for inspection instead of directly to the internet.

| Method | How |
| --- | --- |
| VPN gateway Default Site | `Set-AzVirtualNetworkGatewayDefaultSite` on a route-based VPN gateway, PowerShell only. The on-premises device uses 0.0.0.0/0 as traffic selectors |
| BGP | On-premises advertises 0.0.0.0/0 over a BGP-enabled VPN connection or over ExpressRoute |
| UDR | 0.0.0.0/0 with next hop **Virtual network gateway** (VPN gateway only) or **Virtual appliance** |

To let one subnet keep direct internet access, associate a route table with 0.0.0.0/0, next hop **Internet**, to that subnet only.

```powershell
$lng = Get-AzLocalNetworkGateway -Name DefaultSiteHQ -ResourceGroupName RG1
$gw = Get-AzVirtualNetworkGateway -Name VNet1GW -ResourceGroupName RG1
Set-AzVirtualNetworkGatewayDefaultSite -GatewayDefaultSite $lng -VirtualNetworkGateway $gw
```

Side effects of a 0.0.0.0/0 route to a gateway or an appliance:

- Traffic to the public IP addresses of Azure services follows it too, unless a service endpoint (more specific route) exists.
- Resources in the subnet are no longer reachable directly from the internet (RDP or SSH to a public IP fails): inbound traffic must go through the device that handles the default route.
- A NAT gateway on the subnet is bypassed: a UDR to an appliance or a gateway wins over the NAT gateway.

**Azure Firewall** with forced tunneling needs the **Firewall Management NIC**: a subnet named **AzureFirewallManagementSubnet** (/26 minimum) with its own public IP address, whose only allowed route is a default route to the internet. Then add a default route on **AzureFirewallSubnet** toward the on-premises device or NVA (or enable **Propagate gateway routes** there). DNAT isn't supported in forced tunneling mode. Enabling the Management NIC on an existing Standard or Premium firewall requires stopping and restarting it; Basic firewalls always have one.

<!-- section: diagnose-routing | objectives: 1.3.7 -->
## Diagnosing and resolving routing issues

| Tool | Answers |
| --- | --- |
| **Effective routes** of a network interface (`az network nic show-effective-route-table`) | Every route applied to the interface: source (Default, User, Virtual network gateway), state (Active or Invalid), prefix, next hop. Only for a running VM |
| Network Watcher **Next hop** (`az network watcher show-next-hop`) | Next hop type and IP address for one destination, and the route table ID, or *System Route* |
| Network Watcher **Connection troubleshoot** | End-to-end test from a VM to a VM, FQDN, URI or IP address; points to NSG, UDR and port issues |

```bash
az network nic show-effective-route-table --resource-group RG1 --name vm1-nic --output table
az network watcher show-next-hop --resource-group RG1 --vm VM1 --nic vm1-nic \
  --source-ip 10.1.0.4 --dest-ip 10.2.0.4
```

| Symptom | Likely cause |
| --- | --- |
| Next hop **None** for a destination | A UDR with next hop None, or a reserved range not in any address space |
| Next hop is an NVA, but packets are lost | IP forwarding disabled on the NVA's network interface, or the NVA itself doesn't forward |
| Route state **Invalid** | A route with the same prefix and a higher-priority source overrides it |
| No **Virtual network peering** route while the peering is **Connected** | Propagation delay; retry |
| Spoke doesn't receive on-premises routes | Gateway route propagation disabled on its route table, or **Use remote gateways** not set |
| VMs unreachable from the internet after a VPN change | A 0.0.0.0/0 BGP route or Default Site forces traffic on-premises |

<!-- section: route-server | objectives: 1.3.8 -->
## Azure Route Server

Route Server exchanges routes by **BGP** between NVAs (SD-WAN, firewall, router) and the virtual network: routes learned from the NVAs are programmed in every VM of the virtual network and of peered spokes, and the address spaces are advertised to the NVAs. It's a control-plane service: **data traffic never goes through it**.

| Requirement | Value |
| --- | --- |
| Subnet | Dedicated, named **RouteServerSubnet**, /26 or larger |
| Public IP address | Standard, for the management connection |
| Route Server ASN | 65515 (fixed) |
| NVA side | Multi-hop eBGP, an ASN different from 65515, peering with **both** Route Server instances and advertising the same routes to both |
| ASN of a peer | 16-bit only; not 8074, 8075, 12076, 65515, 65517-65520 or IANA-reserved values |
| BGP peers | 16 |
| Routes per BGP peer | 4,000; above that the session is dropped |
| Capacity | 2 routing infrastructure units by default (4,000 VMs in the network and peered networks), more units in steps of 1,000 VMs |

Behaviors that questions test:

- Spokes receive the NVA routes when their peering to the hub uses **the remote virtual network's gateway or Route Server**.
- **Branch-to-branch** (`--allow-b2b-traffic true`) is disabled by default; enable it so that routes are exchanged between NVAs and the VPN or ExpressRoute gateway of the same network. Transit is for ExpressRoute and site-to-site VPN, not point-to-site.
- A VPN gateway used with Route Server must be **active-active** with ASN 65515; BGP doesn't need to be enabled on it.
- Creating or deleting Route Server in a network that has a gateway causes about 10 minutes of gateway downtime.
- Same prefix from several NVAs: equal AS path length gives ECMP; a shorter AS path wins. Between ExpressRoute, VPN and NVA paths, ExpressRoute is preferred by default; **routing preference** can be ExpressRoute, VpnGateway or ASPath.
- Route Server can't force traffic between subnets of the same virtual network through an NVA: virtual network system routes beat BGP. Use UDRs.
- IPv6 isn't supported.

```bash
az network routeserver create --resource-group RG1 --name rs-hub \
  --hosted-subnet $subnetId --public-ip-address rs-hub-pip
az network routeserver peering create --resource-group RG1 --routeserver rs-hub \
  --name nva1 --peer-ip 10.0.2.4 --peer-asn 65001
az network routeserver update --resource-group RG1 --name rs-hub --allow-b2b-traffic true
```

<!-- section: nat-gateway-use-cases | objectives: 1.3.9 -->
## When to use Azure NAT Gateway

NAT Gateway gives a subnet **outbound** internet access through static public IP addresses or prefixes, with dynamically allocated SNAT ports. It's the recommended outbound method. Since March 31, 2026, new virtual networks use private subnets by default: without an explicit outbound method, VMs have no internet access (Windows activation and updates included).

| Requirement | Answer |
| --- | --- |
| Many VMs open many outbound connections; SNAT exhaustion with load balancer outbound rules | NAT gateway: 64,512 SNAT ports per public IP address, up to 16 addresses |
| Partners allowlist a small, predictable set of source addresses | NAT gateway with a public IP prefix |
| Backend VMs of a Standard internal load balancer need internet access | NAT gateway on the backend subnet |
| Inbound connections from the internet | Not NAT gateway: a load balancer or instance-level public IP. They coexist; outbound flows use the NAT gateway |
| Zone-redundant outbound, IPv6 outbound, more than 50 Gbps, or flow logs | **StandardV2** SKU |

Outbound precedence on a subnet: UDR to an appliance or a virtual network gateway, then NAT gateway, then an instance-level public IP, then load balancer outbound rules, then the default route to the internet. A NAT gateway takes over new connections without dropping existing ones.

| Feature | Standard | StandardV2 |
| --- | --- | --- |
| Zones | Zonal (one zone) or no zone | Zone redundant |
| Public IP | Standard, IPv4 (16 addresses or a /28 prefix) | StandardV2 only, 16 IPv4 and 16 IPv6 |
| Throughput | 50 Gbps (25 per direction) | 100 Gbps, 1 Gbps per connection |
| Protocols | TCP, UDP | TCP, UDP, ICMP Echo; NAT64 |
| Change of SKU | Can't be upgraded in place | Create one to replace a Standard NAT gateway |

<!-- section: nat-gateway-implementation | objectives: 1.3.10 -->
## Implementing Azure NAT Gateway

Order: create (or reuse) a public IP address or prefix of the matching SKU, create the NAT gateway with it, associate it with the subnets.

```bash
az network public-ip create --resource-group RG1 --name natgw-pip --sku Standard \
  --allocation-method Static --zone 1 2 3
az network nat gateway create --resource-group RG1 --name natgw1 \
  --public-ip-addresses natgw-pip --idle-timeout 10
az network vnet subnet update --resource-group RG1 --vnet-name VNet1 --name app \
  --nat-gateway natgw1
```

Rules:

- One NAT gateway per subnet; one NAT gateway can serve up to 800 subnets, all in **one virtual network**. No route table change is needed.
- Not on **GatewaySubnet** or a subnet that contains SQL Managed Instance. Not with Basic load balancers or Basic public IPs in the subnet.
- Zone-redundant Standard public IPs work with a zonal or no-zone Standard NAT gateway; a zone can't be changed after creation.
- TCP idle timeout: 4 minutes by default, up to 120. UDP idle timeout: 4 minutes, fixed.
- Hub and spoke: associate the NAT gateway with **AzureFirewallSubnet** to scale the firewall's SNAT ports for spoke traffic.
- Custom IP prefixes (BYOIP) can't be used with StandardV2.

> **Exam trap.** VMs of a subnet still exit through the firewall after you add a NAT gateway: the 0.0.0.0/0 UDR to the firewall takes precedence. Put the NAT gateway on the firewall's subnet instead.

<!-- section: key-points -->
## Key points

- Longest prefix wins; on a tie, UDR, then BGP, then system. Virtual network, peering and service endpoint system routes beat BGP.
- One route table per subnet, same region and subscription; disable gateway route propagation except on GatewaySubnet.
- Forced tunneling: Default Site (PowerShell), BGP 0.0.0.0/0 or a UDR; exceptions with a UDR to Internet; Azure Firewall needs the Management NIC.
- Diagnose with effective routes (running VM), next hop and connection troubleshoot; NVAs need IP forwarding.
- Route Server: RouteServerSubnet /26, Standard public IP, ASN 65515, peer with both instances, branch-to-branch for gateway exchange, no data path.
- NAT gateway: outbound only, per subnet, one virtual network, precedence over load balancer and instance IPs but not over UDRs; StandardV2 for zone redundancy and IPv6.
