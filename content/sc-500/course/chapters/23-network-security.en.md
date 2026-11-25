Network security questions give you a topology and a requirement (block, allow, inspect, keep private) and ask which control to use and where. The controls stack: Virtual Network Manager security admin rules before NSGs, NSGs on subnets and NICs, Azure Firewall for central inspection, private endpoints and Private Link to take PaaS and partner services off the internet, Microsoft Entra Private Access to replace the VPN for users, and Network Watcher to prove which rule decides.

<!-- section: nsg-asg | objectives: 2.3.1 -->
## Network security groups and application security groups

An NSG rule has a priority (**100 to 4096**, lower wins, processing stops at the first match), source and destination (IP ranges, service tags or ASGs), protocol, ports, direction and action. NSGs are **stateful**: return traffic of an allowed flow is allowed. Rule changes affect only new connections.

| Default rule | Priority | Effect |
| --- | --- | --- |
| AllowVNetInBound / AllowVnetOutBound | 65000 | Traffic within `VirtualNetwork` (includes peered and connected networks) |
| AllowAzureLoadBalancerInBound | 65001 | Health probes from `AzureLoadBalancer` |
| AllowInternetOutBound | 65001 | Outbound to `Internet` |
| DenyAllInbound / DenyAllOutBound | 65500 | Everything else |

Default rules can't be deleted, only overridden by lower numbers. Order of evaluation: **inbound** = subnet NSG then NIC NSG; **outbound** = NIC NSG then subnet NSG; traffic must be allowed by both when both exist. The same order applies inside a subnet.

An **application security group** (ASG) groups NICs by role (`asg-web`, `asg-db`) so rules don't list IP addresses. All NICs of an ASG must be in the same virtual network as its first NIC, and a rule that uses ASGs as source and destination needs both groups in the same virtual network. A rule naming an ASG doesn't apply to a NIC that isn't a member, even if the NSG is on its subnet.

```bash
az network asg create --resource-group RG-App --name asg-db
az network nsg rule create --resource-group RG-App --nsg-name nsg-data \
  --name Allow-Web-To-Sql --priority 200 --direction Inbound --access Allow \
  --protocol Tcp --source-asgs asg-web --destination-asgs asg-db \
  --destination-port-ranges 1433
```

> **Exam trap.** An augmented rule can hold several IP ranges, but only **one** service tag or ASG per source or destination. Two service tags need two rules.

<!-- section: avnm-security-admin | objectives: 2.3.2 -->
## Network access policies with Azure Virtual Network Manager

Azure Virtual Network Manager is created with a **scope** (management groups or subscriptions). **Network groups** collect virtual networks, statically (chosen by hand) or **dynamically** through an Azure Policy condition (for example a tag). A **security admin configuration** holds rule collections that target network groups, and takes effect only after you **deploy** it to regions; only one security admin configuration can be deployed per region.

| Action | Behavior |
| --- | --- |
| Allow | Allows the traffic, then NSG rules are still evaluated |
| Deny | Blocks the traffic; NSGs are not evaluated |
| Always Allow | Allows the traffic whatever the NSGs say; evaluation stops |

Security admin rules (priority **1 to 4096**) apply at the virtual network level and are evaluated **before** NSGs, so application teams can't override them. By default they don't apply to virtual networks containing Azure SQL Managed Instance or Azure Databricks (option `AllowRulesOnly` applies only the Allow rules there), nor to the subnets of Azure Application Gateway (unless every gateway in the subnet uses network isolation), Azure Bastion, Azure Firewall, Azure Route Server, VPN Gateway, Virtual WAN or ExpressRoute gateways; the other subnets of the virtual network still get them. They also don't apply to private endpoints in a managed virtual network.

> **Exam trap.** "Block RDP from the internet on every current and future virtual network, and local admins must not be able to reopen it" is a security admin **Deny** rule on a dynamic network group, not an NSG or Azure Policy on NSGs.

<!-- section: virtual-wan-security | objectives: 2.3.3 -->
## Securing Azure Virtual WAN

A **secured virtual hub** is a Virtual WAN hub with security and routing policies managed by Azure Firewall Manager. Create one or convert an existing hub; the security provider is Azure Firewall, a supported third-party NGFW NVA, a SaaS firewall (Palo Alto Networks Cloud NGFW) or a security partner provider. It requires a **Standard** Virtual WAN (Basic supports site-to-site VPN only).

**Routing intent** sends traffic to the hub's security solution without custom route tables:

| Routing policy | Traffic sent to the next hop |
| --- | --- |
| Internet traffic | Internet-bound traffic of branches and virtual network connections; the hub advertises `0.0.0.0/0` to connections with **Propagate default route** / **Enable internet security** set |
| Private traffic | Branch, virtual network and **inter-hub** traffic (RFC 1918 prefixes by default, add others as needed) |

Each hub has at most one policy of each type, each with one next hop. Prerequisites: no custom route tables, no static route to a virtual network connection. Enable it on **all** hubs to inspect inter-hub traffic symmetrically; `0.0.0.0/0` doesn't propagate between hubs, so internet traffic exits through the local hub's firewall.

> **Exam trap.** Custom route tables can't make traffic between two hubs go through a firewall. Only a **private traffic** routing policy inspects inter-hub and branch-to-branch traffic.

<!-- section: vpn-security | objectives: 2.3.4 -->
## Securing VPN connections

New VPN gateways use the **AZ** SKUs (VpnGw1AZ to VpnGw5AZ) and a Standard public IP. The **Basic** SKU (dev-test only) supports neither custom IPsec/IKE policies, BGP, RADIUS nor OpenVPN.

**Site-to-site**: the default proposals use DH Group 2; to impose stronger cryptography, set a **custom IPsec/IKE policy** on the connection. You must specify every field (IKE encryption and integrity, DH group, IPsec encryption and integrity, PFS group, optional SA lifetimes), one policy per connection, matching the on-premises device. With GCMAES, IPsec encryption and integrity must use the same algorithm and key length. VNet-to-VNet connections need the same policy on both connection resources.

```powershell
$policy = New-AzIpsecPolicy -IkeEncryption AES256 -IkeIntegrity SHA384 `
  -DhGroup DHGroup24 -IpsecEncryption GCMAES256 -IpsecIntegrity GCMAES256 `
  -PfsGroup PFS24 -SALifeTimeSeconds 27000 -SADataSizeKilobytes 102400000
Set-AzVirtualNetworkGatewayConnection -VirtualNetworkGatewayConnection $conn `
  -IpsecPolicies $policy
```

**Point-to-site** authentication:

| Authentication | Tunnel types | Use when |
| --- | --- | --- |
| Azure certificate | OpenVPN, SSTP, IKEv2 | No identity infrastructure; revoke one client by adding its thumbprint to the revoked list |
| Microsoft Entra ID | **OpenVPN only**, Azure VPN Client | Entra credentials with **Conditional Access and MFA** |
| RADIUS | OpenVPN, SSTP, IKEv2 | Existing NPS or RADIUS server, Active Directory credentials |

> **Exam trap.** Requiring MFA through Conditional Access for VPN users means Microsoft Entra ID authentication, hence OpenVPN and the Azure VPN Client; IKEv2-only or SSTP gateways can't do it.

<!-- section: entra-private-access | objectives: 2.3.5 -->
## Microsoft Entra Private Access

Microsoft Entra Private Access, part of Global Secure Access, gives users access to private apps (FQDNs, IP addresses, ranges and ports) **without a VPN**. Traffic goes from the **Global Secure Access client** on the device to Microsoft's edge, then to a **private network connector** installed near the apps (outbound connections only, version 1.5.3417.0 or later).

| Object | Purpose |
| --- | --- |
| Connector group | At least one active connector; serves the apps of a site |
| Quick Access | One app holding the primary set of private resources (VPN replacement), up to 500 application segments |
| Global Secure Access app (per-app access) | An enterprise application for a subset of resources that needs its own assignments or Conditional Access policies |
| Private DNS | DNS suffixes resolved by internal DNS servers through the connector |
| Private access traffic forwarding profile | Must be enabled for the client to tunnel private traffic |

Configuration order: create the connector group with an active connector, configure Quick Access or a Global Secure Access app (segments), **assign users or groups** (direct assignment; nested groups aren't supported), create Conditional Access policies that target the app, then enable the Private access traffic forwarding profile. Required roles: **Global Secure Access Administrator** and **Application Administrator**; connector groups need Application Administrator and Microsoft Entra ID P1 or P2. Changes take up to 15 minutes to reach clients.

> **Exam trap.** A segment defined in a per-app Global Secure Access app takes priority over an overlapping Quick Access segment, and Quick Access assignments aren't copied to it. Users assigned only to Quick Access lose access to that segment.

<!-- section: private-endpoints | objectives: 2.3.6 -->
## Private endpoints for PaaS resources

A private endpoint is a read-only NIC with a private IP address from your subnet, mapped to one **sub-resource** of one PaaS resource. It must be in the same region and subscription as its virtual network; the target resource can be in another region. Connections are **approved** automatically when you have permissions on the resource, otherwise they stay **Pending** until the owner approves; only Approved connections carry traffic.

| Sub-resource | Private DNS zone |
| --- | --- |
| Storage `blob` / `file` / `dfs` | `privatelink.blob.core.windows.net` / `privatelink.file.core.windows.net` / `privatelink.dfs.core.windows.net` |
| Azure SQL `sqlServer` | `privatelink.database.windows.net` |
| Key Vault `vault` | `privatelink.vaultcore.azure.net` |
| App Service and Functions `sites` | `privatelink.azurewebsites.net` |

Public DNS returns a CNAME to the `privatelink` name, so clients keep using the normal FQDN; link the private DNS zone to every virtual network that resolves it. A private endpoint **doesn't block public access** by itself: also set the service's public network access to Disabled. NSGs, UDRs and ASGs apply to private endpoints only when **network policies** are enabled on the subnet.

> **Exam trap.** Service endpoint versus private endpoint: a service endpoint keeps the public IP of the service and only identifies your subnet to its firewall; a private endpoint gives a private IP reachable from peered networks and on-premises over VPN or ExpressRoute.

<!-- section: private-link-service | objectives: 2.3.7 -->
## Azure Private Link service

A **Private Link service** exposes **your own** service, running behind a **Standard Load Balancer** (NIC-based backend pool), to consumers who connect with private endpoints from their own virtual networks, subscriptions or tenants.

| Setting | Purpose |
| --- | --- |
| NAT IP configuration | Source addresses from your subnet; up to 8 NAT IPs; the service sees the NAT IP, not the consumer's IP |
| TCP Proxy v2 | Passes the consumer's source IP and link ID to the application, which must parse the header |
| Visibility | Role-based access control only, restricted by subscription, or anyone with the alias |
| Auto-approval | Subscriptions whose requests are approved automatically (subset of visibility) |
| Alias | Globally unique, read-only name to share with consumers |

The Private Link service must be in the same region as its virtual network and load balancer; consumers can be in any public region. It supports IPv4, TCP and UDP only.

<!-- section: azure-firewall | objectives: 2.3.8 -->
## Implementing Azure Firewall

| Feature | Basic | Standard | Premium |
| --- | --- | --- | --- |
| Throughput | 250 Mbps | 30 Gbps | 100 Gbps |
| Threat intelligence | Alert only | Alert, or alert and deny | Alert, or alert and deny |
| Web categories, DNS proxy, FQDN in network rules | No | Yes | Yes |
| TLS inspection (outbound and east-west), IDPS, URL filtering (full path) | No | No | Yes |

The firewall goes in **AzureFirewallSubnet** (/26); **AzureFirewallManagementSubnet** (/26) is needed for Basic and for forced tunneling. Spokes send traffic to it with a UDR `0.0.0.0/0` next hop **Virtual appliance** = the firewall's private IP. Rules live in a **Firewall Policy** (rule collection groups, then rule collections of one type, priority 100 to 65,000):

1. Threat intelligence is checked first.
2. **DNAT** rules, then **network** rules, then **application** rules (HTTP, HTTPS, MSSQL), whatever the priorities.
3. First match stops processing; no match means deny.

Rule collection groups of a **parent policy** always take precedence over the child policy's. Premium **TLS inspection** needs an intermediate CA certificate (PFX without password, RSA 4096) stored as a Key Vault secret and a **user-assigned managed identity** with Get and List on secrets; inbound TLS inspection is done by Application Gateway WAF, not by the firewall. **IDPS** modes: Disabled, Alert, Alert and Deny.

> **Exam trap.** A network rule allowing TCP 443 to `Any` is evaluated before your application rules, so the FQDN filtering never applies. Restrict network rules, and use application rules for web destinations.

<!-- section: network-watcher | objectives: 2.3.9 -->
## Evaluating effective rules with Network Watcher

| Question | Tool |
| --- | --- |
| Is this TCP or UDP flow to or from a VM allowed, and which rule decides? | **IP flow verify** (NSGs and security admin rules; VM running) |
| Same for ICMP, a scale set, Application Gateway v2 or a service tag | **NSG diagnostics** |
| Which rules apply to a NIC after merging the subnet and NIC NSGs? | **Effective security rules** |
| Where does a packet go? | **Next hop** |
| Can VM1 reach this FQDN and port now, end to end? | **Connection troubleshoot** |
| Which flows happened over time? | **Virtual network flow logs** (NSG flow logs can't be created anymore and retire on September 30, 2027) |

```bash
az network watcher test-ip-flow --resource-group RG-App --vm VM1 \
  --direction Inbound --protocol TCP \
  --local 10.1.2.4:3389 --remote 203.0.113.50:60000
az network nic list-effective-nsg --resource-group RG-App --name vm1-nic
```

Network Watcher must exist in the region of the resource. Effective security rules aren't shown for a private endpoint NIC.

> **Exam trap.** IP flow verify answers "Access allowed" but the connection fails: an NSG isn't the cause. Check routing with next hop (a UDR to a firewall), then the firewall rules and the guest OS with connection troubleshoot.

<!-- section: key-points -->
## Key points

- NSG: priority 100 to 4096, inbound subnet then NIC, outbound NIC then subnet; ASG members in one virtual network.
- Security admin rules (Virtual Network Manager) are evaluated before NSGs: Deny and Always Allow end evaluation, Allow passes to NSGs.
- Secured virtual hub plus routing intent (one Internet and one Private policy) is the only way to inspect inter-hub traffic.
- Custom IPsec/IKE policy needs every field and a non-Basic SKU; Entra ID P2S needs OpenVPN and the Azure VPN Client.
- Entra Private Access: client, connector, Quick Access or per-app apps, direct assignments, Conditional Access, forwarding profile.
- Private endpoint = private IP for a PaaS sub-resource plus a `privatelink` DNS zone; Private Link service = your service behind a Standard Load Balancer.
- Azure Firewall: DNAT, then network, then application rules; Premium for TLS inspection, IDPS and URL filtering.
