Two virtual networks never talk to each other by default. Peering connects them over the Microsoft backbone, gateway transit lets them share one VPN or ExpressRoute gateway, user-defined routes chain their traffic through an appliance, and Azure Virtual Network Manager builds and enforces all of this at scale. Exam questions describe a topology and ask which setting, on which side, is missing.

<!-- section: service-chaining | objectives: 1.3.1 -->
## Designing service chaining and gateway transit

In a hub-and-spoke design, the hub hosts shared components (a firewall or another network virtual appliance, a VPN or ExpressRoute gateway, Azure Route Server) and each spoke is peered with the hub. Two mechanisms make the hub useful:

| Mechanism | What it does | How you configure it |
| --- | --- | --- |
| Service chaining | Sends traffic from a spoke to an appliance or a gateway in the peered hub | A user-defined route in the spoke whose next hop is the private IP address of the appliance (or of an internal load balancer in front of it), or the virtual network gateway |
| Gateway transit | Lets the spokes use the hub's gateway to reach on-premises networks or other virtual networks connected to it | Peering settings on both sides: the hub allows its gateway to forward traffic, the spoke uses the remote gateway |

Peering is **not transitive**. If Spoke1 and Spoke2 are both peered with Hub, Spoke1 can't reach Spoke2 through Hub. Your options:

| Requirement | Solution |
| --- | --- |
| Spoke-to-spoke traffic must be inspected | UDRs in both spokes toward the hub firewall, **Allow forwarded traffic** on the peerings, IP forwarding on the appliance's network interface |
| Spoke-to-spoke traffic, lowest latency, no inspection | Peer the spokes directly, or use Virtual Network Manager direct connectivity (mesh) |
| Spokes must reach on-premises through one gateway | Gateway transit from the hub |
| Spokes must learn routes from an appliance without per-spoke UDRs | Azure Route Server in the hub, with spokes using the remote gateway or Route Server |

Gateway transit rules:

- The gateway is in the hub. The spoke that uses the remote gateway **can't have a gateway of its own**, and only one of its peerings can use a remote gateway.
- Gateway transit works with local and global peering and with every VPN Gateway SKU **except Basic**.
- The routes to the on-premises networks propagate to the spokes' subnets automatically. A route table with gateway route propagation disabled stops them on a given subnet.
- The on-premises VPN device must treat the **spoke prefixes** as interesting traffic too: add every Azure range (hub, spokes, point-to-site pool) to its traffic selectors, or advertise them with BGP.
- A UDR can use a VPN gateway as next hop, not an ExpressRoute gateway: you can't route between virtual networks through an ExpressRoute gateway.

> **Exam trap.** A spoke with **Use the remote virtual network's gateway** enabled can't reach on-premises if the hub peering doesn't have **Allow gateway or route server ... to forward traffic** enabled, and the option can't be enabled at all if the hub has no gateway or Route Server yet. Create the gateway first, then set both sides.

When two virtual networks are connected both by peering and by a VNet-to-VNet VPN connection, traffic between them uses the peering.

<!-- section: vnet-peering | objectives: 1.3.2 -->
## Implementing virtual network peering

| Type | Scope |
| --- | --- |
| Virtual network peering | Two virtual networks in the same region |
| Global virtual network peering | Virtual networks in different regions of the same cloud (not between Azure public and Azure operated by 21Vianet, for example) |

Requirements and behavior:

- The address spaces **must not overlap**. Subscriptions and Microsoft Entra tenants can differ; with PowerShell or Azure CLI, pass the full resource ID of a remote virtual network that is in another subscription or resource group.
- A peering is a pair of links, one per virtual network. The first link shows **Initiated**; the peering works only when both links show **Connected**. The portal creates both links in one operation when you have access to both networks.
- Deleting a peering from one virtual network also deletes the link of the remote virtual network.
- Permissions: **Network Contributor**, or a custom role with `Microsoft.Network/virtualNetworks/virtualNetworkPeerings/write`, `read` and `delete`.
- No downtime when you create a peering. Same-region latency equals intra-network latency, and bandwidth is limited only by the virtual machine size. Peering traffic is charged on ingress and egress.
- Default Azure name resolution doesn't cross a peering: use private DNS zones or custom DNS.
- After you peer a network that point-to-site clients reach, download and reinstall the VPN client package so that clients receive the new routes.

Each link has four settings, written from the point of view of the local network (`vnet-1`):

| Portal setting | Default | Effect |
| --- | --- | --- |
| Allow 'vnet-1' to access the peered virtual network | Selected | Traffic flows; the `VirtualNetwork` service tag then includes the peered network. Clearing it blocks traffic without deleting the peering |
| Allow 'vnet-1' to receive forwarded traffic from the peered virtual network | Cleared | Accepts traffic that didn't originate in the peered network, for example traffic forwarded by its NVA. Creates no route |
| Allow gateway or route server in 'vnet-1' to forward traffic to the peered virtual network | Cleared | Gateway transit, hub side. Requires a gateway or Route Server in `vnet-1` |
| Enable 'vnet-1' to use the peered virtual networks' remote gateway or route server | Cleared | Gateway transit, spoke side. Requires the other side's forwarding setting |

```bash
# Hub side: allow transit through the hub gateway
az network vnet peering create --resource-group RG1 --name hub-to-spoke1 \
  --vnet-name Hub --remote-vnet /subscriptions/SUB2/resourceGroups/RG2/providers/Microsoft.Network/virtualNetworks/Spoke1 \
  --allow-vnet-access --allow-forwarded-traffic --allow-gateway-transit

# Spoke side: use the hub gateway
az network vnet peering create --resource-group RG2 --name spoke1-to-hub \
  --vnet-name Spoke1 --remote-vnet /subscriptions/SUB1/resourceGroups/RG1/providers/Microsoft.Network/virtualNetworks/Hub \
  --allow-vnet-access --allow-forwarded-traffic --use-remote-gateways
```

```powershell
$hub = Get-AzVirtualNetwork -Name Hub -ResourceGroupName RG1
$spoke = Get-AzVirtualNetwork -Name Spoke1 -ResourceGroupName RG2
Add-AzVirtualNetworkPeering -Name hub-to-spoke1 -VirtualNetwork $hub -RemoteVirtualNetworkId $spoke.Id -AllowGatewayTransit
Add-AzVirtualNetworkPeering -Name spoke1-to-hub -VirtualNetwork $spoke -RemoteVirtualNetworkId $hub.Id -UseRemoteGateways
```

Other operations that questions describe:

- **Resize a peered address space**: add, remove or change a range of a peered virtual network without downtime, then **sync** each peering link (portal or PowerShell). Run the sync after each resize.
- **Subnet peering**: peers chosen subnets instead of the whole address space (`--peer-complete-vnet false` with `--local-subnet-names` and `--remote-subnet-names`). It needs subscription registration and is configured with Azure CLI, PowerShell, ARM templates, the API or Terraform, not the portal.
- **Troubleshooting**: the effective routes of a network interface show one route with next hop type **Virtual network peering** per address range of the peered network. No such route while the peering is **Connected**: wait and retry, then check network security groups with Network Watcher.

> **Exam trap.** "VNet1 is peered with VNet2, VNet2 with VNet3; VM1 in VNet1 can't reach VM3 in VNet3." The fix is a direct peering VNet1-VNet3, or an NVA in VNet2 with UDRs and **Allow forwarded traffic**. Enabling gateway transit doesn't route between spokes.

<!-- section: virtual-network-manager | objectives: 1.3.3 -->
## Managing connectivity with Azure Virtual Network Manager

Azure Virtual Network Manager (network manager) applies connectivity, security admin and routing configurations to groups of virtual networks across subscriptions, regions and even tenants. Four steps, always in this order:

1. **Create the network manager** with its **scope** (management groups and/or subscriptions) and its **features** (configuration types it may deploy: Connectivity, SecurityAdmin, Routing). With a management group scope, the Microsoft.Network resource provider must be registered at the management group; the portal does it for you, scripts don't.
2. **Create network groups** and define their members.
3. **Create configurations** that target the network groups.
4. **Deploy** the configurations to regions. Nothing changes before this step.

Two network managers can't have overlapping scopes with the same features. With different features they can; on a conflict, the configuration of the network manager with the higher scope wins.

| Network group membership | How | Fits |
| --- | --- | --- |
| Static | You add virtual networks one by one | A few named networks; patching a group. The only option for cross-tenant networks |
| Dynamic | An Azure Policy definition with mode `Microsoft.Network.Data` and the effect `addToNetworkGroup` adds every virtual network that matches a condition (tag, name) | Many networks, or networks created later. Needs permissions on the policy as well |

A virtual network can belong to several network groups. Membership changes apply without redeploying: a new member of a group that already has a deployed configuration receives it automatically (within minutes, or within 24 hours for policies scoped to more than 1,000 subscriptions).

**Connectivity configurations**:

| Topology / option | Result |
| --- | --- |
| Mesh | Every virtual network of the group connects to every other one through a **connected group** (next hop type `ConnectedGroup`; no peering appears under **Peerings**). Regional by default; **global mesh** connects across regions |
| Hub and spoke | Network manager creates peerings between the hub and each spoke. The hub can also be a Virtual WAN hub (virtual network connections) |
| Direct connectivity (per spoke group) | Adds a connected group among the spokes of that group only; spokes of different groups still can't talk |
| Use hub as a gateway | Gateway transit for the spokes; enabled by default in the portal. Without a gateway in the hub, the spoke-to-hub peering fails |
| Delete existing peerings | Removes peerings that don't match the configuration, even manual ones |
| Enforce peering (`peeringEnforcement: Enforced`) | Peerings of the topology can't be modified or deleted outside network manager |
| `ConnectedGroupAddressOverlap: Disallowed` | Blocks a member whose address space overlaps; by default overlaps are allowed and traffic to the overlapping range is dropped |

| Limit | Value |
| --- | --- |
| Spokes peered to one hub by a hub-and-spoke configuration | 1,000 |
| Virtual networks per connected group | 250 by default; up to 3,000 with the high-scale feature |
| Private endpoints per connected group | 2,000 by default; up to 20,000 with the high-scale option |
| Connected groups a virtual network can belong to | 2 (soft limit) |

**Deployment** follows a goal-state model. You commit, per region, the full list of configurations that must be active there: committing Config1 and Config3 to a region that had Config1 and Config2 removes Config2; committing **None** removes everything. After you modify one connectivity configuration, redeploy every connectivity configuration that must stay in the region. Only one security admin configuration and one routing configuration per region can be deployed from a network manager; several connectivity configurations can coexist and are additive.

```bash
az network manager create --name nm-contoso --resource-group RG1 --location westeurope \
  --scope-accesses "Connectivity" "SecurityAdmin" \
  --network-manager-scopes subscriptions="/subscriptions/SUB1"
az network manager group create --name ng-prod --network-manager-name nm-contoso --resource-group RG1
az network manager connect-config create --configuration-name cc-mesh-prod \
  --network-manager-name nm-contoso --resource-group RG1 --connectivity-topology "Mesh" \
  --applies-to-groups '[{"networkGroupId": "/subscriptions/SUB1/resourceGroups/RG1/providers/Microsoft.Network/networkManagers/nm-contoso/networkGroups/ng-prod", "groupConnectivity": "None"}]'
az network manager post-commit --network-manager-name nm-contoso --resource-group RG1 \
  --commit-type "Connectivity" --target-locations "westeurope" \
  --configuration-ids "/subscriptions/SUB1/resourceGroups/RG1/providers/Microsoft.Network/networkManagers/nm-contoso/connectivityConfigurations/cc-mesh-prod"
```

To check the result on a virtual network, open **Network Manager** under its settings or run `az network manager list-effective-connectivity-config`. The deployment status (NotStarted, Deploying, Deployed, Failed) is global; per-network errors are in the deployment details.

> **Exam tip.** "Thousands of spokes, new subscriptions every month, spokes of the same environment must talk directly, all spokes must use the hub's ExpressRoute gateway": a network manager scoped to the management group, a dynamic network group by tag, a hub-and-spoke configuration with **direct connectivity** and **Use hub as a gateway**, then a deployment to each region.

<!-- section: key-points -->
## Key points

- Peering isn't transitive; spoke-to-spoke goes through a direct peering, a connected group, or an NVA with UDRs and **Allow forwarded traffic**.
- Gateway transit: hub allows its gateway to forward traffic, spoke uses the remote gateway; the spoke has no gateway of its own; not with the Basic VPN SKU.
- Peering needs non-overlapping address spaces and two links that both show **Connected**; it works across regions, subscriptions and tenants.
- After resizing a peered address space, sync the peering links.
- Network manager: scope and features, network groups (static or Azure Policy), configurations, then deployment per region; nothing applies before deployment.
- Mesh and direct connectivity create connected groups (`ConnectedGroup` next hop), not peerings; hub and spoke creates peerings.
