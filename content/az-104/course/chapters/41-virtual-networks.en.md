A virtual network is the private network of your resources in Azure. This chapter covers addressing, the connection of virtual networks with each other, public addresses, routing and the tools that show why a packet doesn't arrive.

<!-- section: vnets-subnets | objectives: 4.1.1 -->
## Virtual networks and subnets

A virtual network belongs to **one region and one subscription**. It has one or more address ranges (its **address space**), divided into **subnets**. Resources of the same virtual network communicate by default, across subnets, with their private addresses.

- Use private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16). Ranges must **not overlap** with the networks you will connect: peered virtual networks and on-premises sites.
- Blocked ranges: 224.0.0.0/4, 255.255.255.255/32, 127.0.0.0/8, 169.254.0.0/16 and 168.63.129.16/32.
- You can add address ranges and subnets later; a subnet that contains resources can't be shrunk below what is in use.

Azure **reserves 5 addresses in every subnet**: the first four and the last one. In 10.0.1.0/24: `.0` network, `.1` default gateway, `.2` and `.3` Azure DNS, `.255` broadcast. The first address a resource can receive is `.4`.

| Prefix | Addresses | Usable (minus 5) |
| --- | --- | --- |
| /29 (smallest allowed) | 8 | 3 |
| /28 | 16 | 11 |
| /27 | 32 | 27 |
| /26 | 64 | 59 |
| /25 | 128 | 123 |
| /24 | 256 | 251 |

Some services require a **dedicated subnet**, sometimes with an imposed name:

| Subnet | For | Minimum size |
| --- | --- | --- |
| `GatewaySubnet` | VPN or ExpressRoute gateway | /27 recommended |
| `AzureBastionSubnet` | Azure Bastion | /26 |
| `AzureFirewallSubnet` | Azure Firewall | /26 |
| **Delegated** subnet | A PaaS service injected in the network, for example `Microsoft.Web/serverFarms` (App Service integration) or `Microsoft.ContainerInstance/containerGroups` | Depends on the service |

Private IP addresses come from the subnet, **dynamic** (default: the next free address, kept as long as the interface exists) or **static** (you choose it). Virtual machines use Azure-provided DNS by default; custom DNS servers set on the virtual network apply after the machines restart.

**Outbound internet access.** Historically a machine without public IP had implicit "default outbound access". For virtual networks created after March 31, 2026, subnets are **private by default**: outbound access must be explicit, through a **NAT gateway** (recommended), a load balancer outbound rule, a public IP on the machine, or a firewall.

```bash
az network vnet create -g RG1 -n VNet1 --address-prefixes 10.20.0.0/16 \
  --subnet-name web --subnet-prefixes 10.20.1.0/24
az network vnet subnet create -g RG1 --vnet-name VNet1 -n integration \
  --address-prefixes 10.20.2.0/26 --delegations Microsoft.Web/serverFarms
```

<!-- section: vnet-peering | objectives: 4.1.2 -->
## Virtual network peering

Peering connects two virtual networks so that their resources communicate with private addresses over the Microsoft backbone, with low latency and without gateway.

- Works in the same region and **across regions** (global peering), across subscriptions and even across tenants.
- Address spaces **must not overlap**.
- A peering is made of **two links**, one in each direction. The portal creates both; with CLI or PowerShell you create each one. Status **Initiated** after the first link, **Connected** when both exist.
- Peering is **not transitive**: if A is peered with B and B with C, A doesn't reach C.
- After adding an address range to a peered network, **sync** the peering; no need to delete it.

Settings of each peering link:

| Setting | Effect |
| --- | --- |
| Allow virtual network access | Lets the two networks communicate (default). The `VirtualNetwork` service tag then includes the peer |
| **Allow forwarded traffic** | Accepts traffic that didn't originate in the peer network, for example relayed by a network virtual appliance in the hub |
| **Allow gateway transit** | On the network that **has** the VPN or ExpressRoute gateway: shares it with the peer |
| **Use remote gateways** | On the network **without** gateway: uses the peer's gateway. Only possible if the peer allows gateway transit and the local network has no gateway |

**Hub and spoke.** Spokes are peered with a hub that holds the shared services. For spoke-to-spoke traffic you need one of: a direct peering between the spokes; or a network virtual appliance or Azure Firewall in the hub, with **user-defined routes** in each spoke pointing to it and *Allow forwarded traffic* on the peerings. For on-premises access from the spokes: gateway transit on the hub, use remote gateways on the spokes.

```bash
az network vnet peering create -g RG1 -n Hub-to-Spoke1 --vnet-name Hub \
  --remote-vnet Spoke1 --allow-vnet-access --allow-forwarded-traffic --allow-gateway-transit
az network vnet peering create -g RG1 -n Spoke1-to-Hub --vnet-name Spoke1 \
  --remote-vnet Hub --allow-vnet-access --allow-forwarded-traffic --use-remote-gateways
```

<!-- section: public-ip | objectives: 4.1.3 -->
## Public IP addresses

A public IP address is a resource that you associate with a network interface, a load balancer, a VPN gateway, an application gateway, a NAT gateway, Azure Bastion or Azure Firewall.

| Property | Standard SKU (the only current SKU) |
| --- | --- |
| Allocation | **Static** always: assigned at creation, kept until the resource is deleted |
| Security | **Closed to inbound traffic by default**: an NSG must explicitly allow it |
| Availability zones | **Zone-redundant** (zones 1, 2, 3), **zonal** (one zone) or no zone. Can't be changed after creation |
| Tier | Regional, or Global for cross-region load balancers |

The Basic SKU, which allowed dynamic allocation, was retired on September 30, 2025.

- A **DNS name label** gives the address the name `<label>.<region>.cloudapp.azure.com`.
- A **public IP prefix** reserves a contiguous range of static addresses (for example /28 = 16 addresses, all usable) from which you create public IPs; useful for firewall allow lists.
- **Routing preference**: *Microsoft network* (default: traffic stays on the Microsoft backbone as long as possible) or *Internet* (handed over to the internet close to the region, at a lower egress cost).
- A resource and its public IP must be in the same region. A Standard load balancer requires Standard public IPs.

```bash
az network public-ip create -g RG1 -n pip-vm1 --sku Standard --zone 1 2 3 --dns-name vm1contoso
```

<!-- section: user-defined-routes | objectives: 4.1.4 -->
## User-defined routes

Azure creates **system routes** for every subnet: to the virtual network itself, to peered networks, to the internet (0.0.0.0/0) and, when a gateway exists, to on-premises networks (BGP routes). You override them with **user-defined routes** (UDRs) grouped in a **route table** that you associate with subnets.

| Next hop type | Sends the traffic to |
| --- | --- |
| **Virtual appliance** | The private IP address of a network virtual appliance, a firewall or an internal load balancer |
| Virtual network gateway | The VPN gateway (not ExpressRoute) |
| Virtual network | Stays inside the virtual network |
| Internet | The internet |
| **None** | Nowhere: the traffic is dropped |

Route selection:

1. The route with the **longest prefix match** wins (10.0.1.0/24 beats 10.0.0.0/16).
2. For the same prefix: **user-defined route**, then **BGP route**, then **system route**.

Rules:

- A subnet has zero or one route table; a route table can serve many subnets, in the **same region and subscription**.
- A route table applies to traffic **leaving** the subnets it is associated with.
- A virtual machine that forwards traffic (appliance) needs **IP forwarding** enabled on its network interface, and forwarding enabled in its operating system.
- *Propagate gateway routes* = No on a route table stops on-premises (BGP) routes from reaching its subnets.
- **Forced tunneling**: a 0.0.0.0/0 route to a firewall or to on-premises sends all internet-bound traffic for inspection.

```bash
az network route-table create -g RG1 -n rt-web
az network route-table route create -g RG1 --route-table-name rt-web -n to-internet \
  --address-prefix 0.0.0.0/0 --next-hop-type VirtualAppliance --next-hop-ip-address 10.20.0.4
az network vnet subnet update -g RG1 --vnet-name VNet1 -n web --route-table rt-web
```

<!-- section: troubleshoot-connectivity | objectives: 4.1.5 -->
## Troubleshooting network connectivity

Pick the tool from the question asked:

| Question | Tool | Result |
| --- | --- | --- |
| Is this packet allowed or denied by NSGs, and by which rule? | **IP flow verify** (Network Watcher) | Allow or Deny, plus the name of the rule. Input: direction, protocol, local and remote IP and port |
| Which rules finally apply to this interface? | **Effective security rules** | Merged rules of the subnet NSG and the interface NSG |
| Where is traffic to this destination sent? | **Next hop** (Network Watcher) | Next hop type, IP address and route table |
| Which routes apply to this interface? | **Effective routes** | System, BGP and user-defined routes combined |
| Can this machine reach that destination, and where does it stop? | **Connection troubleshoot** | Reachability, latency, hops and the blocking element |
| I need to see the packets | **Packet capture** | Capture file, through the Network Watcher agent extension |
| Is connectivity stable over time? | **Connection Monitor** | Continuous tests, with alerts |
| Why is the VPN down? | **VPN troubleshoot** | Diagnosis of the gateway and its connections |

Effective routes and effective security rules are only available for the interface of a **running** virtual machine.

Usual causes, in the order to check:

1. An NSG rule on the subnet or the interface (remember that both must allow).
2. A user-defined route sending the traffic to an appliance that doesn't forward, or to None.
3. A missing peering link, a peering not *Connected*, or the assumption that peering is transitive.
4. The firewall of the guest operating system.
5. DNS resolution: the name resolves to the wrong address or not at all.
6. No outbound path to the internet for a machine in a private subnet.

<!-- section: key-points -->
## Key points

- 5 reserved addresses per subnet; /29 is the smallest; first usable address is `.4`.
- Peering: two links, non-transitive, no overlap, global possible. Gateway transit on the hub, use remote gateways on the spoke, forwarded traffic for appliances.
- Public IPs are Standard: static, closed by default, zone-redundant or zonal.
- Routes: longest prefix first; then user-defined, BGP, system. Next hop Virtual appliance needs IP forwarding; None drops.
- IP flow verify = NSG decision; Next hop = routing decision; Connection troubleshoot = end-to-end test.
