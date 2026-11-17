A site-to-site (S2S) VPN connects an on-premises network to a virtual network through IPsec/IKE tunnels over the internet. Four Azure objects are always involved: **GatewaySubnet**, the **virtual network gateway**, the **local network gateway** (the on-premises side) and the **connection** that joins them. Questions test the SKU, availability design, matching crypto settings and why a tunnel stays down.

<!-- section: s2s-design | objectives: 2.1.1 -->
## Designing a site-to-site VPN connection for high availability

Prerequisites: a compatible VPN device with a **public IPv4 address**, and on-premises ranges that **don't overlap** the virtual networks you connect (otherwise use NAT rules on the gateway, below).

Every VPN gateway has two instances. The options for availability:

| Design | Tunnels | Behavior |
| --- | --- | --- |
| Active-standby (default) | 1 per connection | On maintenance or failure, the standby instance takes over: about 10-15 seconds of interruption for planned maintenance, up to 1-3 minutes for an unplanned one |
| Multiple on-premises devices | 1 per device | Protects against an on-premises failure. One local network gateway and one connection per device, unique public IPs, **BGP required** (unique BGP peer IPs, same prefixes advertised), ECMP |
| Active-active gateway | 2 per connection (one per instance, each with its own public IP) | Azure sends traffic over both tunnels; the device must establish a tunnel to **each** instance, or the connection drops during maintenance |
| Dual redundancy | 4 (full mesh) | Active-active gateway + two on-premises devices: two local network gateways, two connections, BGP. The most resilient design |

Zone resilience: AZ SKUs (VpnGw1AZ to VpnGw5AZ) deploy the instances across availability zones in regions that have zones. Other design choices:

| Requirement | Design |
| --- | --- |
| More than 100 S2S tunnels, or many branches with automated any-to-any transit | Azure Virtual WAN instead of VPN Gateway |
| Site-to-site VPN as a backup of ExpressRoute in the same virtual network | ExpressRoute/VPN coexistence: both gateways in a larger GatewaySubnet |
| Branch networks overlap the virtual network | NAT rules on the gateway (VpnGw2/VpnGw2AZ and above): IngressSNAT translates on-premises ranges, EgressSNAT translates the virtual network range; static rules are 1:1 and bidirectional, dynamic rules allow only flows initiated from the internal side |
| Several sites on one gateway | One local network gateway and one connection per site; address spaces must not overlap between connections |

> **Exam trap.** Active-active alone doesn't protect against the failure of the single on-premises device. "Survive the loss of an on-premises VPN device" needs two devices, two local network gateways and BGP.

<!-- section: gateway-sku | objectives: 2.1.2 -->
## Selecting a virtual network gateway SKU

Since November 1, 2025, new VPN gateways use the **AZ** SKUs. Non-AZ VpnGw1-5 gateways are being migrated (no downtime within the same family); after the rollout, an existing non-AZ gateway accepts no configuration change until it's migrated. Basic isn't retiring.

| SKU (generation) | S2S tunnels | P2S IKEv2/OpenVPN | Aggregate throughput | BGP | Zone redundant |
| --- | --- | --- | --- | --- | --- |
| Basic (Gen1) | 10 | IKEv2 only (no OpenVPN, no RADIUS) | 100 Mbps | No | No |
| VpnGw1AZ (Gen1) | 30 | 250 | 650 Mbps | Yes | Yes |
| VpnGw2AZ (Gen1 or Gen2) | 30 | 500 | 1 / 1.25 Gbps | Yes | Yes |
| VpnGw3AZ (Gen1 or Gen2) | 30 | 1,000 | 1.25 / 2.5 Gbps | Yes | Yes |
| VpnGw4AZ (Gen2) | 100 | 5,000 | 5 Gbps | Yes | Yes |
| VpnGw5AZ (Gen2) | 100 | 10,000 | 10 Gbps | Yes | Yes |

**Basic** is for dev/test only: no BGP, no active-active, no custom IPsec/IKE policy, no gateway transit, no IPv6, created with PowerShell or CLI only. All other SKUs support route-based VPN, up to 100 tunnels where the SKU allows, P2S, BGP, active-active, custom IPsec/IKE policy and ExpressRoute coexistence.

A single tunnel is slower than the aggregate: about 650 Mbps on VpnGw1AZ and up to 2.3 Gbps on VpnGw4AZ/5AZ with GCMAES256, the fastest algorithm.

Changing SKU: upgrade or downgrade within the AZ family (about 45 minutes, public IP unchanged); Gen1 to Gen2 AZ by migration. **Basic can't be resized**: delete and re-create the gateway, which changes its public IP address.

<!-- section: s2s-implementation | objectives: 2.1.3 -->
## Implementing a site-to-site VPN connection

Order of operations:

1. Create the virtual network and **GatewaySubnet** (/27 or larger).
2. Create the **VPN gateway** (45 minutes or more) with its Standard public IP addresses.
3. Create the **local network gateway**: device public IP or FQDN, on-premises prefixes, BGP settings if used.
4. Configure the **on-premises VPN device** with the gateway's public IP addresses (one per instance in active-active), the shared key, and matching IPsec/IKE parameters.
5. Create the **connection** (type **Site-to-site (IPsec)**) from the gateway to the local network gateway.
6. Verify: the connection status becomes **Connected**.

Connection settings in the portal: shared key, IKE protocol (IKEv2 or IKEv1), **Use Azure Private IP Address**, **Enable BGP**, IPsec/IKE policy (Default or Custom), **Use policy based traffic selector**, **DPD timeout in seconds** (45), **Connection Mode** (Default, InitiatorOnly = Azure initiates, ResponderOnly = on-premises initiates; IKEv2 route-based only) and NAT rules.

```bash
az network local-gateway create --resource-group RG1 --name Site1 \
  --gateway-ip-address 203.0.113.10 --local-address-prefixes 192.168.0.0/16
az network vpn-connection create --resource-group RG1 --name VNet1toSite1 \
  --vnet-gateway1 VNet1GW --local-gateway2 Site1 --shared-key "<shared-key>"
```

The shared key can be changed later on the connection's **Authentication** page; update the device with the same value.

<!-- section: policy-vs-route-based | objectives: 2.1.4 -->
## Policy-based or route-based VPN

| | Policy-based | Route-based |
| --- | --- | --- |
| Traffic selectors | Combinations of local and remote prefixes (one SA per pair) | Any-to-any; the routing table chooses the tunnel |
| Azure SKU and IKE | Basic only, IKEv1 | All SKUs; IKEv1 and IKEv2 (Basic: IKEv2) |
| Tunnels | 1 S2S connection | Up to the SKU limit |
| P2S, BGP, active-active, VNet-to-VNet, transit | No | Yes |
| Creation | PowerShell or CLI only (not the portal) | Portal, PowerShell, CLI |

Choose **route-based** in almost every case. A policy-based gateway can't be converted: delete it and create a route-based one.

To connect a route-based gateway to **policy-based on-premises firewalls** (one or several), enable **policy-based traffic selectors** (`UsePolicyBasedTrafficSelectors`) on each connection:

- The devices must support **IKEv2**.
- It's part of the custom IPsec/IKE policy: specify the full policy.
- The device must define selectors for every combination of on-premises and Azure prefixes, not any-to-any.
- Those sites reach the virtual network only: **no transit** to other sites or networks through the gateway.

<!-- section: local-network-gateway | objectives: 2.1.5 -->
## Creating and configuring a local network gateway

A local network gateway describes one on-premises VPN device: create **one per device**. Its region doesn't need to match the virtual network.

| Field | Content |
| --- | --- |
| Endpoint | **IP address** (static public IP of the device) or **FQDN** (device behind a dynamic IP with dynamic DNS) |
| Address space | On-premises prefixes routed to this device; they must not overlap other connected networks. Don't include the device's own public IP |
| BGP settings (Advanced tab) | On-premises **ASN** and **BGP peer IP address** |

- FQDN: one IPv4 address used (the first returned), no IPv6, resolution cached and refreshed every 5 minutes for disconnected tunnels; different FQDNs must resolve to different IPs.
- With BGP, leave the address space empty or minimal: Azure adds the host route to the BGP peer IP itself, and an APIPA peer IP can't be entered there. Prefixes you add become static routes on top of BGP.
- Changing prefixes or the device IP is done on **Configuration** and may briefly disconnect the tunnel. Switching between IP address and FQDN isn't possible: delete the connections, create a new local network gateway, re-create the connections.

<!-- section: ipsec-ike-policy | objectives: 2.1.6 -->
## Creating and configuring an IPsec/IKE policy

Without a custom policy, the gateway proposes its **default** set. A **custom** policy on a connection makes the gateway send and accept **only** that combination: the device must match exactly or the tunnel doesn't come up.

- VpnGw1-5 and VpnGw1AZ-5AZ (and legacy Standard and HighPerformance) only, not Basic.
- One policy per connection, and every parameter is required: IKE encryption, IKE integrity, DH group (phase 1, main mode), IPsec encryption, IPsec integrity, PFS group (phase 2, quick mode), SA lifetimes.

| Parameter | Options or values |
| --- | --- |
| IKEv2 encryption | GCMAES256, GCMAES128, AES256, AES192, AES128 |
| IKEv2 integrity | SHA384, SHA256, SHA1, MD5 |
| DH group | DHGroup24, ECP384, ECP256, DHGroup14 (= DHGroup2048), DHGroup2, DHGroup1, None |
| IPsec encryption | GCMAES256, GCMAES192, GCMAES128, AES256, AES192, AES128, DES3, DES, None |
| IPsec integrity | GCMAES256, GCMAES192, GCMAES128, SHA256, SHA1, MD5 |
| PFS group | PFS24, ECP384, ECP256, PFS2048, PFS2, PFS1, None |
| Quick mode SA lifetime | Default 27,000 seconds (min 300) and 102,400,000 KB (min 1,024) |
| Main mode SA lifetime | Fixed at 28,800 seconds |
| DPD timeout | Default 45 seconds, 9 to 3,600; 30-45 recommended |

With GCMAES for IPsec encryption, use the **same** GCMAES algorithm and key length for IPsec integrity. Policy-based traffic selectors and DPD timeout can also be set with the default policy.

```powershell
$policy = New-AzIpsecPolicy -IkeEncryption AES256 -IkeIntegrity SHA384 -DhGroup DHGroup24 `
  -IpsecEncryption GCMAES256 -IpsecIntegrity GCMAES256 -PfsGroup PFS24 `
  -SALifeTimeSeconds 14400 -SADataSizeKilobytes 102400000
$conn = Get-AzVirtualNetworkGatewayConnection -Name VNet1toSite1 -ResourceGroupName RG1
Set-AzVirtualNetworkGatewayConnection -VirtualNetworkGatewayConnection $conn -IpsecPolicies $policy
```

<!-- section: virtual-network-gateway | objectives: 2.1.7 -->
## Creating and configuring a virtual network gateway

| Setting | Rule |
| --- | --- |
| Gateway type | **VPN** (a virtual network can have one VPN gateway and one ExpressRoute gateway) |
| VPN type | Route-based (policy-based only with Basic, not in the portal) |
| SKU and generation | An AZ SKU; Generation2 from VpnGw2AZ |
| GatewaySubnet | Named exactly **GatewaySubnet**, /27 or larger (/29 possible for Basic only); nothing else in it; **no NSG**; no UDR with 0.0.0.0/0 or that drops the subnet's range; gateway route propagation enabled |
| Public IP addresses | **Standard**, static; two for active-active, and a third if active-active also serves P2S |
| BGP | ASN 65515 by default (changeable; private ranges 64512-65514 and 65521-65534); BGP peer IP taken from GatewaySubnet; custom **APIPA** addresses 169.254.21.0 to 169.254.22.255 when the device peers with APIPA |

```bash
az network public-ip create --resource-group RG1 --name VNet1GWpip1 --sku Standard \
  --allocation-method Static --zone 1 2 3
az network public-ip create --resource-group RG1 --name VNet1GWpip2 --sku Standard \
  --allocation-method Static --zone 1 2 3
az network vnet-gateway create --resource-group RG1 --name VNet1GW --vnet VNet1 \
  --gateway-type Vpn --vpn-type RouteBased --sku VpnGw2AZ --vpn-gateway-generation Generation2 \
  --public-ip-addresses VNet1GWpip1 VNet1GWpip2 --no-wait
```

BGP facts for the gateway: not on Basic or policy-based; up to 4,000 prefixes from a peer (more drops the session); the on-premises ASN must differ from the Azure ASN; keepalive 60 s and hold 180 s, fixed; no BFD. An active-standby gateway can be changed to active-active; with non-APIPA BGP peer IPs, this causes downtime and the on-premises BGP peers must be updated.

<!-- section: gateway-troubleshooting | objectives: 2.1.8 -->
## Diagnosing and resolving gateway connectivity issues

Check, in this order, before resetting anything:

| Check | Typical fault |
| --- | --- |
| Shared key on both sides | Mismatch (`Authentication` in VPN troubleshoot) |
| Peer addresses | Local network gateway IP isn't the device's IP, or the device targets the wrong gateway IP (both instances in active-active) |
| IPsec/IKE parameters | Custom policy or PFS that the device doesn't match (`IkePolicyMismatch`) |
| Prefixes | Local network gateway prefixes don't match the on-premises subnets; with a policy-based device, selectors must match exactly; device's public IP included in the address space |
| GatewaySubnet | NSG or 0.0.0.0/0 UDR associated with it |
| Gateway health | `https://<gateway-public-ip>:8081/healthprobe` (8083 for the second active-active IP) answers when the gateway is healthy; Basic doesn't answer; the gateway doesn't reply to ping |

Tools:

- **VPN troubleshoot** (Network Watcher) on the gateway or connection, with a storage account for the logs.
- **Resource logs** via a diagnostic setting: `TunnelDiagnosticLog` (connect/disconnect with reason), `IKEDiagnosticLog`, `RouteDiagnosticLog` (static routes and BGP events), `GatewayDiagnosticLog` (configuration, failover, maintenance).
- **Metrics**: Tunnel Bandwidth, Gateway S2S Bandwidth, BGP Peer Status; alert rules on them.
- **Packet capture** on the gateway or a connection, with filters.
- **Reset** (portal **Reset**, `Reset-AzVirtualNetworkGateway`, `az network vnet-gateway reset`): reboots one instance and reapplies the configuration; the public IP doesn't change. Active-standby: run it again to reboot the other instance. Active-active: use `-GatewayVip` or `--gateway-vip` to target each instance. A single connection can also be reset.

> **Exam trap.** The tunnel is **Connected** but on-premises clients can't reach a peered spoke: the device's selectors or the BGP/static prefixes don't include the spoke ranges, or the spoke peering doesn't use the remote gateway. The tunnel itself is fine.

<!-- section: azure-extended-network | objectives: 2.1.9 -->
## Implementing Azure Extended Network

Azure Extended Network (extended network for Azure) stretches an on-premises **subnet** into Azure so that migrated machines keep their IP addresses. Use it only when addresses truly can't change, ideally as a temporary step.

| Element | Detail |
| --- | --- |
| Mechanism | A VXLAN tunnel (UDP 4789 by default) between two virtual appliances, each connected to the extended subnet; one pair per extended subnet |
| Azure appliance | **Windows Server 2022 Azure Edition** VM with nested virtualization, Hyper-V role, two NICs: one in a routable subnet, one in the extended subnet |
| On-premises appliance | Windows Server 2019 or 2022 VM on a hypervisor with nested virtualization, two adapters in the same layout |
| Azure network | A virtual network with the extended subnet (same CIDR as on-premises) and a routable subnet, connected by **site-to-site VPN or ExpressRoute** |
| Management | Windows Admin Center **Extended network** extension, run from a third machine, connected to Azure |
| Scale | Up to 250 extended IP addresses, about 700 Mbps aggregate |

Steps: prepare both appliances (Hyper-V, two external virtual switches), deploy from the extension, then add the IPv4 addresses to extend on each side. A firewall between the sites must allow asymmetric routing and UDP 4789; the `extnwagent` service must run on both appliances. Learn notes that the extension isn't currently available on the extension feed of Windows Admin Center version 2410.

<!-- section: key-points -->
## Key points

- Four objects: GatewaySubnet, VPN gateway, local network gateway, connection; the connection is **Connected** when keys, addresses and crypto match.
- Availability: active-active (two tunnels per connection) + two on-premises devices with BGP = four tunnels.
- New gateways use AZ SKUs; Basic: no BGP, no active-active, no custom policy, no transit, no resize.
- Route-based almost always; policy-based = Basic, IKEv1, one tunnel; policy-based traffic selectors connect route-based gateways to policy-based devices (IKEv2, no transit).
- Custom IPsec/IKE policy: all parameters, one per connection, exact match on the device; GCMAES both or neither.
- Troubleshoot: shared key, peer IPs, policy, prefixes, GatewaySubnet NSG/UDR, then VPN troubleshoot, logs, reset.
- Azure Extended Network: VXLAN between two Windows Server appliances, managed with Windows Admin Center, 250 addresses.
