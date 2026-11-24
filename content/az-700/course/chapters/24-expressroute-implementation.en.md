Once the circuit is designed, it has to be built: peerings, gateway, connection, routing, encryption and failure detection. The exam tests the order of these operations, the exact values each step expects and the tools that tell you which side of the circuit is broken.

<!-- section: private-peering | objectives: 2.3.6 -->
## Configuring Azure private peering

Order of operations for a circuit through a provider:

1. Create the circuit (provider, peering location, bandwidth, SKU). Azure returns the **service key**.
2. Give the service key to the provider, who provisions its side.
3. Wait until **Circuit status** is `Enabled` and **Provider status** is `Provisioned`.
4. Configure the peerings.
5. Create the gateway and link the virtual network.

Billing starts when the service key is issued, not when the provider finishes. Peerings can only be configured on a provisioned circuit. If the provider sells a **managed Layer 3** service (IPVPN), the provider configures the peerings for you; with a Layer 2 service you do it.

Private peering parameters:

| Parameter | Rule |
| --- | --- |
| Primary and secondary subnets | Two /30 subnets (or one /29 split in two); for IPv6, two /126. Private or public addresses, not part of any address space used by virtual networks |
| Interface addresses | In each /30, your router takes the **first** usable address and Microsoft the **second** |
| VLAN ID | Not used by another peering of the circuit |
| Peer ASN | Your AS number, 2-byte or 4-byte; private ASNs allowed, except 65515 |
| Shared key | Optional MD5 hash, identical on both sides |

Microsoft uses AS **12076** on both peerings and reserves 65515 to 65520 for internal use.

```powershell
$ckt = Get-AzExpressRouteCircuit -Name "ER-Circuit1" -ResourceGroupName "RG1"
Add-AzExpressRouteCircuitPeeringConfig -Name "AzurePrivatePeering" -ExpressRouteCircuit $ckt `
  -PeeringType AzurePrivatePeering -PeerASN 65010 `
  -PrimaryPeerAddressPrefix "192.168.100.128/30" `
  -SecondaryPeerAddressPrefix "192.168.100.132/30" -VlanId 200
Set-AzExpressRouteCircuit -ExpressRouteCircuit $ckt
```

In this example, your routers use 192.168.100.129 and 192.168.100.133, and the MSEEs use .130 and .134. Nothing is saved until `Set-AzExpressRouteCircuit` runs.

> **Exam trap.** Both BGP sessions, primary and secondary, must be configured. Microsoft doesn't support HSRP or VRRP on the links: redundancy comes from the pair of BGP sessions.

<!-- section: microsoft-peering | objectives: 2.3.7 -->
## Configuring Microsoft peering

Microsoft peering exchanges **public** routes. In addition to the two subnets, the VLAN ID and the peer ASN, it requires:

| Parameter | Rule |
| --- | --- |
| Primary and secondary subnets | Two /30 **public** subnets that you or your provider own, registered in a routing registry |
| Advertised public prefixes | The public prefixes you will announce; only prefixes registered to you in an RIR or IRR |
| Routing registry name | ARIN, RIPENCC, APNIC, AFRINIC, LACNIC, RADB or ALTDB |

Microsoft verifies ownership of the prefixes and of the ASN in the registry. If the automatic check fails, `AdvertisedPublicPrefixesState` shows `Validation needed`: open a support request and provide proof of ownership. Until then, the peering exchanges no routes. A private ASN is allowed on Microsoft peering but needs manual validation, and the documentation ASNs 64496 to 64511 aren't allowed in the AS path.

Private addresses (RFC 1918) and default routes aren't accepted on Microsoft peering. On-premises hosts therefore reach Microsoft services through **NAT** to public addresses.

**Route filter.** For circuits configured on or after August 1, 2017, Microsoft advertises **no prefix** until a route filter is attached to the Microsoft peering. A route filter is an allowlist of BGP community values, one per service or Azure region:

1. Create the route filter resource, in the same location as the circuit.
2. Add its single rule, of type **Allow**, listing the service communities you need (for example Azure Storage in West Europe, or Exchange Online).
3. Attach the filter to the circuit's Microsoft peering.

Attaching a filter that contains Microsoft 365 communities fails if the subscription isn't authorized to use Microsoft 365 over ExpressRoute.

```powershell
Add-AzExpressRouteCircuitPeeringConfig -Name "MicrosoftPeering" -ExpressRouteCircuit $ckt `
  -PeeringType MicrosoftPeering -PeerASN 100 `
  -PrimaryPeerAddressPrefix "203.0.113.0/30" -SecondaryPeerAddressPrefix "203.0.113.4/30" `
  -VlanId 300 -MicrosoftConfigAdvertisedPublicPrefixes "203.0.113.128/25" `
  -MicrosoftConfigRoutingRegistryName "RIPENCC"
Set-AzExpressRouteCircuit -ExpressRouteCircuit $ckt
```

> **Exam trap.** "Microsoft peering is up but no route is received from Microsoft": a route filter is missing. "The peering stays in `Validation needed`": prefix ownership hasn't been proven.

<!-- section: expressroute-gateway | objectives: 2.3.8 -->
## Creating and configuring an ExpressRoute gateway

Private peering reaches a virtual network through a virtual network gateway of type **ExpressRoute**, deployed in `GatewaySubnet`. A virtual network can hold one ExpressRoute gateway and one VPN gateway, in the same `GatewaySubnet`.

| SKU | Throughput | Maximum circuit connections | FastPath |
| --- | --- | --- | --- |
| `Standard` / `ErGw1Az` | 1 Gbps | 4 | No |
| `HighPerformance` / `ErGw2Az` | 2 Gbps | 8 | No |
| `UltraPerformance` / `ErGw3Az` | 10 Gbps | 16 | Yes |
| `ErGwScale` | 1 Gbps per scale unit, 1 to 40 units | 4 (1 unit), 8 (2 units), 16 (10 units) | Yes, from 10 scale units |

Rules:

- `GatewaySubnet` must be **/27 or larger**; /26 or larger to connect 16 circuits. Deploy nothing else in it.
- No network security group on `GatewaySubnet`. No user-defined route with 0.0.0.0/0 on it, and BGP route propagation must stay enabled.
- The `Az` SKUs are zone-redundant. New gateways get an auto-assigned public IP address that Microsoft manages: you no longer create a public IP resource.
- Whatever the SKU, at most 4 circuits from the **same** peering location can be linked to one virtual network.

```powershell
$vnet = Get-AzVirtualNetwork -Name "VNet1" -ResourceGroupName "RG1"
$subnet = Get-AzVirtualNetworkSubnetConfig -Name "GatewaySubnet" -VirtualNetwork $vnet
$ipconf = New-AzVirtualNetworkGatewayIpConfig -Name "gwipconf" -SubnetId $subnet.Id
New-AzVirtualNetworkGateway -Name "ERGW1" -ResourceGroupName "RG1" -Location "westeurope" `
  -IpConfigurations $ipconf -GatewayType ExpressRoute -GatewaySku ErGw1AZ
```

> **Exam trap.** Traffic between virtual networks linked to the same circuit, or between a virtual network and Virtual WAN through ExpressRoute, is disabled by default on the gateway and must be explicitly allowed. The recommended path between virtual networks remains virtual network peering.

<!-- section: connect-vnet | objectives: 2.3.9 -->
## Connecting a virtual network to a circuit

Prerequisites: circuit provisioned, private peering configured, ExpressRoute gateway deployed. The link is a **connection** resource between the gateway and the circuit.

```powershell
$ckt = Get-AzExpressRouteCircuit -Name "ER-Circuit1" -ResourceGroupName "RG1"
$gw = Get-AzVirtualNetworkGateway -Name "ERGW1" -ResourceGroupName "RG1"
New-AzVirtualNetworkGatewayConnection -Name "ERConn1" -ResourceGroupName "RG1" `
  -Location "westeurope" -VirtualNetworkGateway1 $gw -PeerId $ckt.Id `
  -ConnectionType ExpressRoute
```

**Circuit in another subscription.** The circuit owner creates an **authorization** on the circuit and sends two values to the virtual network owner (the circuit user): the circuit resource ID and the authorization key. The circuit user creates the connection with `-PeerId` and `-AuthorizationKey`.

| Fact | Detail |
| --- | --- |
| One authorization | One connection, hence one virtual network |
| Who pays for the circuit | The circuit owner; all linked virtual networks share the bandwidth |
| Revoking an authorization | The circuit owner deletes it; the connections that used it are deleted |

Connection settings and limits:

- **Routing weight** (0 to 32000, default 0): when a virtual network is linked to several circuits, the connection with the highest weight is preferred for traffic leaving Azure.
- **FastPath**: `-ExpressRouteGatewayBypass` on the connection, with an eligible gateway SKU.
- A Standard circuit links up to 10 virtual networks, all in the same geopolitical area as the circuit; Premium removes the geographic limit and raises the count. A virtual network can be linked to up to 16 circuits. When the connection is created, the local and peered virtual networks must advertise 200 address spaces or fewer; up to 1,000 can be added afterward.
- Spoke virtual networks don't each need a gateway: peer them to the hub with **Allow gateway transit** on the hub side and **Use remote gateways** on the spoke side.

> **Exam trap.** The authorization key alone isn't enough: the circuit user also needs the resource ID of the circuit (the peer ID). And the connection is created in the subscription of the gateway, not of the circuit.

<!-- section: route-advertisement | objectives: 2.3.10 -->
## Recommending a route advertisement configuration

| Limit | Value | When exceeded |
| --- | --- | --- |
| Prefixes you advertise on private peering | 4,000 IPv4 (10,000 with Premium), 100 IPv6 | The BGP session is dropped until the count is back under the limit |
| Prefixes you advertise on Microsoft peering | 200 per session | The BGP session is dropped |
| Prefixes the gateway advertises from Azure to on-premises | 1,000 IPv4 | Summarize the address spaces of the virtual networks |

Recommendations by requirement:

| Requirement | Recommendation |
| --- | --- |
| Too many on-premises routes for a Standard circuit | Summarize on-premises prefixes, or move to Premium |
| Force internet-bound traffic of the virtual networks through on-premises | Advertise a default route (0.0.0.0/0) on **private peering**; it is never accepted on Microsoft peering |
| Receive only the prefixes of one Azure region or service on Microsoft peering | Route filter with the matching BGP communities |
| Make on-premises prefer one circuit for a given Azure region | Match the regional BGP community (for example `12076:51004` for East US on Microsoft peering) and raise local preference |
| Make Microsoft prefer one circuit to reach you | AS path prepending with a **public** AS number, or more specific prefixes on the preferred circuit |
| Make a virtual network prefer one of its circuits | Connection routing weight |

Facts to remember:

- Advertising a default route sends all outbound traffic of the linked virtual networks to on-premises, including traffic to Azure public endpoints and Windows activation (KMS). Add user-defined routes for the destinations that must leave directly.
- Microsoft tags every route it advertises with BGP communities, but **ignores** the communities you set on your routes. Microsoft also removes private AS numbers from the AS path on Microsoft peering, so prepending a private ASN has no effect there.

> **Exam trap.** Connection weight is evaluated before AS path length. A circuit with a longer AS path still wins if its connection has the higher weight.

<!-- section: encryption | objectives: 2.3.11 -->
## Configuring encryption over ExpressRoute

ExpressRoute traffic is private but not encrypted by default. Two mechanisms exist and can be combined:

| | MACsec | IPsec |
| --- | --- | --- |
| Layer and scope | Layer 2, the physical links between your edge routers and the MSEEs | Layer 3, end to end between the on-premises network and the virtual network |
| Available on | **ExpressRoute Direct only** | Any circuit |
| Keys | Pre-shared key that you store in **Azure Key Vault**; you decide when to rotate it | Managed by the VPN gateway and your VPN device |
| Default | Disabled on the ports | Not configured |
| Azure resources | The ExpressRoute Direct ports and a key vault | A VPN gateway in the same virtual network, or a Virtual WAN VPN gateway |

MACsec encrypts everything on the port, BGP included; if the keys don't match, connectivity is lost, with no fallback to clear text. Setup: a key vault with soft delete enabled and not behind a private endpoint, the CKN and CAK stored as secrets, a user-assigned managed identity that reads them, then MACsec on both ports or on one; enable SCI on the ports when the on-premises router is a Cisco device.

**Site-to-site VPN over private peering** encrypts end to end without using public addresses:

1. Deploy a VPN gateway (Standard public IP) next to the ExpressRoute gateway.
2. On the VPN gateway, set **Gateway Private IPs** to **Enabled** and note the private address.
3. On the connection, set **Use Azure Private IP Address** to **Enabled**.
4. Point the on-premises VPN device at the gateway's private address, reachable over private peering.

For Azure to send traffic into the tunnel, on-premises must advertise **more specific** prefixes over the VPN than over ExpressRoute; with identical prefixes, Azure uses the ExpressRoute path directly, unencrypted.

> **Exam trap.** "Encrypt traffic on a circuit bought from a service provider" can't be MACsec: the answer is an IPsec VPN over the circuit.

<!-- section: bfd | objectives: 2.3.12 -->
## Implementing Bidirectional Forwarding Detection

By default, a failed link is detected by BGP timers: keepalive 60 seconds and hold time 180 seconds on the MSEEs, so up to three minutes. **Bidirectional Forwarding Detection (BFD)** detects the failure in less than a second and makes BGP fail over to the other link at once.

- On the Microsoft side, BFD is **enabled by default** on the MSEE interfaces of new private and Microsoft peerings, and can't be removed.
- On your side, it is optional and requires two steps on **both** edge routers: enable BFD on the interface, then link it to the BGP session of the neighbor.
- The MSEE interval is 300 ms (750 ms in certain scenarios); the slower peer sets the rate, so you can configure a longer interval, not a shorter one. Learn recommends disabling BFD echo mode on ExpressRoute connections.
- For an old peering created before BFD was enabled by default (IPv4 private peering before August 2018, IPv4 Microsoft peering before January 2020, IPv6 peering before November 2025), **reset the peering** to activate it.

```text
interface TenGigabitEthernet2/0/0.150
   bfd interval 300 min_rx 300 multiplier 3
router bgp 65020
   address-family ipv4 vrf 15
      neighbor 192.168.15.18 remote-as 12076
      neighbor 192.168.15.18 fall-over bfd
```

> **Exam tip.** "Failover between the primary and secondary links takes up to three minutes; reduce it" has the answer "enable BFD on the customer edge routers", not a change in Azure.

<!-- section: troubleshooting | objectives: 2.3.13 -->
## Diagnosing ExpressRoute connection issues

Work from the circuit toward the virtual network:

| Step | Check | Tool | If it fails |
| --- | --- | --- | --- |
| 1 | Circuit status `Enabled` and provider status `Provisioned` | `Get-AzExpressRouteCircuit` | `Not enabled`: Microsoft support. `Not provisioned`: the provider |
| 2 | Peering present, `ProvisioningState` `Succeeded`, subnets, VLAN ID, ASN and MD5 key match the routers | `Get-AzExpressRouteCircuitPeeringConfig` | Correct the peering, or ask the Layer 3 provider |
| 3 | Layer 2: the MSEE sees the MAC address of your router | `Get-AzExpressRouteCircuitARPTable` | Incomplete entry or Microsoft entry only: VLAN or Layer 2 problem with the provider |
| 4 | Layer 3: expected on-premises prefixes are received | `Get-AzExpressRouteCircuitRouteTable` | Session `Idle` or `Active`: ASN, addresses, key. Prefix missing: on-premises advertisement or filter |
| 5 | Traffic counters increase on both links | `Get-AzExpressRouteCircuitStats` | Zero on one path: that link isn't used |
| 6 | Packets seen in both directions on each MSEE | **Test private-peering connectivity**, under Diagnose and solve problems | Received but not sent back: Azure routing or user-defined routes. Sent but not received: on-premises or provider |

Each of the ARP and route table commands takes `-DevicePath Primary` or `Secondary`: run both, because a circuit that works on one link only has no redundancy left.

Frequent causes:

- BGP session torn down repeatedly: the prefix limit (4,000 or 10,000) is exceeded.
- Circuit healthy but a virtual network unreachable: no connection, gateway not provisioned, or a spoke peering without **Use remote gateways**.
- Microsoft services unreachable: no route filter, or prefixes in `Validation needed`.
- Large packets dropped through the gateway: the maximum TCP and UDP packet size is 1,400 bytes and the gateway doesn't support fragments; if fragmentation is required, FastPath bypasses the gateway.

<!-- section: key-points -->
## Key points

- Order: create the circuit, send the service key, wait for `Provisioned`, configure the peerings, create the gateway, create the connection.
- Each peering: two /30 subnets, your router on the first address and Microsoft on the second, a VLAN ID, your ASN; Microsoft is AS 12076.
- Microsoft peering: public addresses, ownership validation, and no route received without a route filter.
- ExpressRoute gateway: `GatewaySubnet` /27 or larger, no NSG; FastPath needs `UltraPerformance`, `ErGw3Az` or `ErGwScale` with 10 units.
- Another subscription: authorization key plus circuit resource ID; one authorization per connection.
- Default route only on private peering; prefix limits drop the BGP session; connection weight beats AS path length.
- MACsec: ExpressRoute Direct only, key in Key Vault. Otherwise IPsec VPN over private peering with gateway private IPs.
- BFD is on by default on the MSEEs; enable it on your routers for subsecond detection.
- Troubleshooting: circuit state, peering configuration, ARP table, route table, statistics, connectivity test.
