A virtual network is the private address space in which almost everything else in this exam is deployed. Questions give you address ranges and a list of services, then ask which virtual networks and subnets to create, with which size, which name and which settings.

<!-- section: address-space | objectives: 1.1.1 -->
## Planning address spaces and segmentation

A virtual network (VNet) belongs to **one region and one subscription**; it spans all the availability zones of its region. Its address space is made of one or more CIDR ranges that don't overlap one another.

| Rule | Detail |
| --- | --- |
| Recommended ranges | RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. The shared range 100.64.0.0/10 (RFC 6598) is also treated as private. A public range that your organization owns is allowed: it is reachable only from the virtual network and the networks connected to it |
| Ranges you can't add | 224.0.0.0/4 (multicast), 255.255.255.255/32 (broadcast), 127.0.0.0/8 (loopback), 169.254.0.0/16 (link-local), 168.63.129.16/32 (Azure DNS, DHCP and health probes) |
| Overlap | Two virtual networks whose address spaces overlap can't be peered; the same applies to an on-premises network reached through a gateway |
| IPv6 | Added next to IPv4 (dual stack). An IPv6 subnet must be exactly /64 |
| Limits | 1,000 virtual networks per subscription and region, 3,000 subnets and 65,536 private IP addresses per virtual network |

You can add, remove or resize ranges after creation. A range can shrink only if it still contains its subnets, and it can be removed only when no subnet uses it. When the virtual network is peered, the change causes no downtime, but the new range must not overlap the peer's address space and you must then select **Sync** on each peering: until then, the peer keeps the old address space.

Segmentation is a choice between several virtual networks and several subnets:

| Requirement | Design |
| --- | --- |
| Isolation between environments, teams, subscriptions or regions | Separate virtual networks, connected by peering only where needed |
| Different filtering, routing, outbound IP address or service access for a group of resources | Separate subnets: an NSG, a route table, a NAT gateway, service endpoints and a delegation are all subnet settings |
| Traffic between two tiers must cross a firewall or a virtual appliance | Put the tiers in different subnets and route between them |
| A service that requires its own subnet (gateway, firewall, Bastion...) | A dedicated subnet, planned from the start |
| Many virtual networks, several teams, no overlap allowed with on-premises ranges | IP address management (IPAM) in Azure Virtual Network Manager: a root pool, child pools, and non-overlapping ranges allocated automatically to new virtual networks |

Leave room: don't allocate the whole address space to subnets. A subnet has zero or one NSG and zero or one route table, each in the same subscription and region as the virtual network.

> **Exam trap.** Subnets aren't a security boundary by themselves. Azure routes traffic between all the subnets of a virtual network by default; only an NSG, or a route to a firewall, restricts it.

<!-- section: create-vnet | objectives: 1.1.2 -->
## Creating a virtual network

In the portal, the **Basics** tab asks for the subscription, the resource group, the name and the region; the **IP addresses** tab asks for the address space and the subnets. Facts that questions rely on:

- The name is unique in the resource group and **can't be changed**; a subnet name can't be changed either.
- Every resource connected to the virtual network must be in the **same region and subscription** as the virtual network. It can be in another resource group.
- Required permission: the Network Contributor role, or a custom role with the matching `Microsoft.Network/virtualNetworks` actions.

```bash
az network vnet create --resource-group RG1 --name VNet1 --location westeurope \
  --address-prefixes 10.10.0.0/16 \
  --subnet-name Subnet1 --subnet-prefixes 10.10.1.0/24

# The list replaces the whole address space: repeat the existing ranges
az network vnet update --resource-group RG1 --name VNet1 \
  --address-prefixes 10.10.0.0/16 10.20.0.0/16
```

```powershell
$subnet = New-AzVirtualNetworkSubnetConfig -Name Subnet1 -AddressPrefix 10.10.1.0/24
New-AzVirtualNetwork -ResourceGroupName RG1 -Name VNet1 -Location westeurope `
  -AddressPrefix 10.10.0.0/16 -Subnet $subnet

# Changes are made on the local object, then written with Set-AzVirtualNetwork
$vnet = Get-AzVirtualNetwork -ResourceGroupName RG1 -Name VNet1
Add-AzVirtualNetworkSubnetConfig -Name Subnet2 -AddressPrefix 10.10.2.0/24 -VirtualNetwork $vnet
$vnet | Set-AzVirtualNetwork
```

Without an address prefix, `az network vnet create` uses 10.0.0.0/16.

**Default outbound access.** For API versions released after March 31, 2026, the subnets of a new virtual network are **private** by default (`defaultOutboundAccess` is `false`), and the portal already creates private subnets. A virtual machine in a private subnet reaches the internet only through an explicit method: a NAT gateway on the subnet, a public IP address on its network interface, or outbound rules of a Standard public load balancer. Existing virtual networks aren't changed. When you switch an existing subnet to private (`az network vnet subnet update --default-outbound false`), virtual machines must be stopped and deallocated for the change to reach their network interfaces.

<!-- section: subnet-sizing | objectives: 1.1.1, 1.1.3 -->
## Sizing and configuring subnets

Azure reserves **five addresses** in each subnet. In 10.10.1.0/24: 10.10.1.0 (network address), 10.10.1.1 (default gateway), 10.10.1.2 and 10.10.1.3 (mapping of the Azure DNS addresses) and 10.10.1.255 (broadcast). The first address a resource can receive is 10.10.1.4.

| Subnet size | Addresses | Usable |
| --- | --- | --- |
| /29 (smallest IPv4 subnet) | 8 | 3 |
| /28 | 16 | 11 |
| /27 | 32 | 27 |
| /26 | 64 | 59 |
| /25 | 128 | 123 |
| /24 | 256 | 251 |

To size a subnet, count one address per network interface IP configuration, per internal load balancer frontend and per private endpoint, then add the five reserved addresses. For services that scale out (virtual machine scale sets, Application Gateway, App Service virtual network integration), count the maximum number of instances, not the current one.

| Subnet setting | Effect |
| --- | --- |
| Address range | Can be changed only while the subnet is empty; otherwise move or delete the resources first |
| Private subnet (default outbound access) | Removes the implicit outbound public IP address of virtual machines |
| NAT gateway | Outbound connectivity for the whole subnet |
| Network security group, route table | Filtering and routing for the subnet |
| Service endpoints | Direct route to the selected services; no address consumed |
| Subnet delegation | Reserves the subnet for an Azure service |
| Network policy for private endpoints | Makes NSGs and user-defined routes apply to the private endpoints of the subnet |

A subnet that is full can't be extended while it holds resources. The exception is the **multiple address prefixes** capability: a subnet receives a second range so that virtual machines and scale sets keep scaling. It is configured with Azure CLI, PowerShell or a template, and it doesn't apply to delegated subnets.

<!-- section: service-subnets | objectives: 1.1.3 -->
## Subnets required by network services

Several services deploy only into a subnet that has an exact name.

| Service | Subnet name | Size | Rules |
| --- | --- | --- | --- |
| VPN gateway, ExpressRoute gateway | `GatewaySubnet` | /27 or larger; /26 or larger to connect 16 ExpressRoute circuits | Shared by both gateway types when they coexist; nothing else inside. No NSG, no user-defined route for 0.0.0.0/0, gateway route propagation left enabled |
| Azure Bastion | `AzureBastionSubnet` | /26 or larger | In the virtual network and the resource group of the Bastion host; no other resource; user-defined routes not supported. The Developer SKU needs no subnet |
| Azure Firewall | `AzureFirewallSubnet` | /26 | Subnet-level NSGs are disabled on it. /26 is enough for every scaling scenario |
| Azure Firewall management interface | `AzureFirewallManagementSubnet` | /26 | Required for forced tunneling and always present with the Basic SKU; has its own public IP address; only a default route to the internet, gateway route propagation disabled |
| Azure Route Server | `RouteServerSubnet` | /26 or larger | No NSG and no user-defined route; one Route Server per virtual network |
| Application Gateway | Any name | /24 recommended | Only application gateways. One address per instance (up to 125) plus one for a private frontend |
| Azure DNS Private Resolver endpoint | Any name | /28 to /24 | One subnet per endpoint, delegated to `Microsoft.Network/dnsResolvers` |

A hub virtual network that hosts all these services fits in a /22:

```text
Hub VNet 10.10.0.0/22            (10.10.0.0 - 10.10.3.255)
  GatewaySubnet                  10.10.0.0/27     VPN and ExpressRoute gateways
  AzureFirewallSubnet            10.10.0.64/26    Azure Firewall
  AzureFirewallManagementSubnet  10.10.0.128/26   Forced tunneling
  AzureBastionSubnet             10.10.0.192/26   Azure Bastion
  RouteServerSubnet              10.10.1.0/26     Azure Route Server
  snet-appgw                     10.10.2.0/24     Application Gateway v2
  Free                           10.10.0.32/27, 10.10.1.64/26, 10.10.1.128/25, 10.10.3.0/24
```

Platform services injected into a virtual network (Azure SQL Managed Instance, App Service integration, Container Apps environments...) need a subnet of their own, usually delegated: see [Subnet delegation](#delegation). Private access to platform services that stay outside the virtual network uses two subnet features that need no reserved name:

| Feature | What it takes in the subnet | To remember |
| --- | --- | --- |
| Private endpoint | One private IP address, on a read-only network interface created with the endpoint | Any subnet, shared with other resources. The endpoint is in the region and subscription of its virtual network; the target resource can be in another region. NSGs and user-defined routes ignore private endpoints unless `privateEndpointNetworkPolicies` is `Enabled`, `NetworkSecurityGroupEnabled` or `RouteTableEnabled` (default: `Disabled`) |
| Service endpoint | Nothing: it is a setting of the subnet, per service (`Microsoft.Storage`, `Microsoft.Sql`, `Microsoft.KeyVault`...) | The source address seen by the service switches from a public to a private address: IP firewall rules of the service that listed the old public addresses stop matching, and open TCP connections to the service are closed during the switch. Not usable from on-premises |

> **Exam trap.** `GatewaySubnet` must not have an NSG, and a route table that sends 0.0.0.0/0 elsewhere on it blocks the creation of the gateway. Routes that force internet traffic through a gateway or an appliance belong on the workload subnets.

<!-- section: delegation | objectives: 1.1.3, 1.1.4 -->
## Subnet delegation

Platform services that are **injected** into a virtual network place their instances, with private IP addresses, in one of your subnets. Delegation designates that subnet for one service: the service receives the permission to create its resources there and to apply the network intent policies it needs, and Azure then refuses changes that would break it.

| Service | Delegation | Subnet |
| --- | --- | --- |
| Azure SQL Managed Instance | `Microsoft.Sql/managedInstances` | Dedicated; at least /27 (32 addresses) |
| App Service virtual network integration | `Microsoft.Web/serverFarms` | Dedicated; /28 at least, /27 when the portal creates it, /26 to cover the maximum scale of a plan or to join several plans |
| Azure DNS Private Resolver | `Microsoft.Network/dnsResolvers` | Dedicated to one endpoint; /28 to /24 |
| Private Application Gateway deployment | `Microsoft.Network/applicationGateways` | The Application Gateway subnet |

```bash
# Services that accept a delegation in a region
az network vnet subnet list-available-delegations --location westeurope --output table

az network vnet subnet update --resource-group RG1 --vnet-name VNet1 --name snet-sqlmi \
  --delegations Microsoft.Sql/managedInstances

az network vnet subnet show --resource-group RG1 --vnet-name VNet1 --name snet-sqlmi \
  --query delegations
```

```powershell
$vnet = Get-AzVirtualNetwork -ResourceGroupName RG1 -Name VNet1
$subnet = Get-AzVirtualNetworkSubnetConfig -Name snet-sqlmi -VirtualNetwork $vnet
$subnet = Add-AzDelegation -Name sqlmi -ServiceName Microsoft.Sql/managedInstances -Subnet $subnet
Set-AzVirtualNetwork -VirtualNetwork $vnet
```

In the portal, open the subnet and choose the service under **Subnet delegation**; choose **None** to remove it. Delegating requires `Microsoft.Network/virtualNetworks/subnets/write` (included in Network Contributor).

Rules to remember:

- The delegation can't be added or removed while resources of the service are deployed in the subnet, and it must be removed before the subnet or the virtual network is deleted.
- A delegated subnet can't host a private endpoint.
- The service dictates the minimum size of the subnet, and may require private (RFC 1918) address space.
- You keep control of the subnet: you still associate an NSG and a route table with it, within what the service accepts.

> **Exam tip.** Order of operations for an injected service: create the subnet with the right size, delegate it, then deploy the service. The size of an integration subnet can't be corrected once the service uses it.

<!-- section: shared-dedicated | objectives: 1.1.5 -->
## Shared or dedicated subnets

A **dedicated** subnet accepts only the resources of one service. A **shared** subnet mixes resource types.

| Resource | Subnet |
| --- | --- |
| Virtual machines, scale sets, network virtual appliances, internal load balancers, private endpoints | Shared: they can coexist in the same subnet |
| AKS, Azure Batch, HDInsight, Azure Databricks | Shared is allowed; a dedicated subnet is the recommended practice |
| VPN and ExpressRoute gateways, Azure Firewall, Azure Bastion, Azure Route Server, Application Gateway | Dedicated |
| Azure SQL Managed Instance, App Service integration, Container Apps environments, Azure Container Instances, API Management, Azure NetApp Files, flexible servers of Azure Database for MySQL and PostgreSQL | Dedicated |

Reasons to give a workload its own subnet even when sharing is allowed:

- NSGs, route tables, NAT gateways and service endpoints apply to the whole subnet. A rule meant for one workload then applies to its neighbors.
- A scaling workload can exhaust the addresses its neighbors need.
- A subnet's range can be changed only while it is empty.

Reasons to share: fewer subnets to manage and less address space lost to reserved addresses; application security groups can still separate tiers inside one subnet in NSG rules.

> **Exam trap.** Dedicated and delegated aren't synonyms. `GatewaySubnet` and `AzureFirewallSubnet` are dedicated by name, without delegation; a subnet delegated to `Microsoft.Web/serverFarms` is dedicated by delegation.

<!-- section: key-points -->
## Key points

- One virtual network = one region, one subscription; address spaces of connected networks never overlap; after changing the address space of a peered virtual network, sync the peerings.
- Five reserved addresses per subnet; /29 is the smallest subnet and leaves 3 addresses; IPv6 subnets are /64.
- Reserved names: `GatewaySubnet` (/27 or larger), `AzureBastionSubnet` (/26 or larger), `AzureFirewallSubnet` and `AzureFirewallManagementSubnet` (/26), `RouteServerSubnet` (/26 or larger). Application Gateway: any name, dedicated, /24 recommended.
- No NSG and no default-route override on `GatewaySubnet`.
- Private endpoints consume an address and ignore NSGs and routes unless the subnet's network policies are enabled; service endpoints consume nothing and change the source address seen by the service.
- New virtual networks have private subnets: plan an explicit outbound method.
- Delegation reserves a subnet for an injected service; size it first, and never put private endpoints in it.
