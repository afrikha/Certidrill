Network security on SC-100 has two halves. Inside Azure, you evaluate whether a network design segments, inspects and hides workloads as the requirements and Zero Trust demand. For users, you evaluate Microsoft's Security Service Edge (SSE), **Global Secure Access**: Microsoft Entra Internet Access for internet and SaaS traffic, its Microsoft traffic profile for Microsoft 365 and cross-tenant control, and Microsoft Entra Private Access for private apps.

<!-- section: network-design | objectives: 3.4.1 -->
## Evaluating network designs against security requirements

Zero Trust applied to networks: **no implicit trust from location**, segmentation into small zones, encryption of traffic, inspection of what crosses zones, and threat protection at the edge. The MCSB network security controls say the same: establish segmentation boundaries, secure cloud services with network controls (private endpoints, disabled public access), deploy a firewall at the edge, protect against DDoS, protect web applications, keep DNS secure.

| Control | Layer | Recommend when |
| --- | --- | --- |
| NSG with application security groups | 3-4, subnet or NIC | Segment tiers and subnets |
| Security admin rules (Azure Virtual Network Manager) | 3-4, evaluated before NSGs | Central guardrails across many virtual networks that workload teams can't override |
| Azure Firewall (Standard, Premium) | 3-7, central and stateful | Hub inspection of outbound and spoke-to-spoke traffic, FQDN filtering, threat intelligence; Premium for TLS inspection, IDPS and full-URL filtering |
| WAF on Application Gateway or Front Door | 7 | Protect web apps from OWASP attacks and bots |
| Azure DDoS Protection | 3-4 on public IPs | Tuned mitigation, telemetry and rapid response for internet-facing apps |
| Private endpoint | Private IP for one PaaS resource | Remove public exposure, reach PaaS from on-premises, prevent exfiltration to other tenants' resources |
| Azure Bastion | Managed RDP and SSH over TLS | Administer VMs without public IPs or open management ports |

Typical topologies: **hub and spoke** with Azure Firewall in the hub and user-defined routes (`0.0.0.0/0` to the firewall) on spoke subnets, or **Virtual WAN** with a secured virtual hub (Azure Firewall or a partner SSE in the hub, routing intent). Subnets of virtual networks created after March 31, 2026 are **private by default**: outbound internet access must be explicit (NAT gateway, firewall), which helps a "no unmanaged egress" requirement.

How to evaluate a proposed design:

| Weakness in the proposal | Fix |
| --- | --- |
| VMs with public IPs for administration | Azure Bastion or just-in-time access, no public IP |
| Spokes peered directly to each other | Route spoke-to-spoke traffic through the hub firewall |
| PaaS reachable on its public endpoint "with a firewall rule" | Private endpoint plus public network access disabled |
| Service endpoint used to stop data exfiltration | Private endpoint (service endpoints don't restrict which instance is reached) |
| NSG rule to allow outbound only to `*.contoso.com` | Azure Firewall application rule (NSGs don't filter FQDNs) |
| Azure Firewall expected to block SQL injection | WAF |
| Flat network shared by OT, IoT, servers and users | Separate segments with filtered, monitored crossings |

> **Exam trap.** A private endpoint doesn't close the public endpoint by itself: the design must also disable public network access on the resource. And DDoS Protection covers layers 3-4: a layer 7 flood needs a WAF.

<!-- section: internet-access-swg | objectives: 3.4.2 -->
## Microsoft Entra Internet Access as a secure web gateway

**Microsoft Entra Internet Access** is an identity-centric **secure web gateway (SWG)** for internet and SaaS traffic, delivered from Microsoft's global edge. The **Global Secure Access client** (Windows, macOS, iOS, Android) or a **remote network** (branch office connected to the service) forwards traffic through the **Internet access traffic forwarding profile**.

Capabilities to evaluate:

| Capability | What it does |
| --- | --- |
| Web content filtering | Allow or block by **web category**, **FQDN** or URL; HTTP is matched on the URL, HTTPS on the SNI unless TLS inspection is on |
| TLS inspection | Decrypts HTTPS for higher-fidelity categorization and rules on HTTP methods |
| Threat intelligence filtering | Blocks known malicious destinations |
| Universal Conditional Access | Conditional Access for all internet destinations, even apps not federated with Microsoft Entra ID |
| Prompt injection protection, DLP, shadow AI discovery | Controls on generative AI and data leaving through the web |
| Network controls for agents | Same filtering for AI agent traffic (needs a Microsoft Agent 365 license) |
| Traffic logs and dashboards | Visibility on who reached what |

How policy is built:

1. **Filtering policies** hold rules (category, FQDN, URL) with an action.
2. **Security profiles** group filtering policies with priorities from 100 (highest) to 65,000 (lowest); evaluation stops at the first matching rule.
3. A **Conditional Access policy** targeting "All internet resources with Global Secure Access" links a security profile through the session control **Use Global Secure Access security profile**. This is what makes the gateway user- and context-aware (user, group, device compliance, risk, location).
4. The **baseline profile** applies to all Internet Access traffic, including remote networks, without Conditional Access, at the lowest priority as a catch-all.

Licensing: the **Microsoft Entra Internet Access** license (standalone or in **Microsoft Entra Suite**), on top of Microsoft Entra ID P1. Remote network connectivity needs at least 50 combined Entra ID P1 and Internet Access licenses.

Versus other filters: Defender for Endpoint web content filtering works per device group; Azure Firewall filters Azure workload traffic. Internet Access adds identity-aware policy, enforcement at the cloud edge for users anywhere, and support for all device platforms.

> **Exam trap.** "Block gambling sites for all users except the marketing group, wherever they work" is Internet Access: web category policies in two security profiles, linked by Conditional Access to different groups. Azure Firewall web categories only filter traffic that passes through the Azure virtual network.

<!-- section: internet-access-microsoft | objectives: 3.4.3 -->
## Internet Access for Microsoft services and cross-tenant controls

**Microsoft Entra Internet Access for Microsoft services** uses the prepopulated **Microsoft traffic forwarding profile** (Microsoft 365, Microsoft Entra ID, Microsoft Graph). It is **included in Microsoft Entra ID P1 or P2**: no Internet Access license is needed.

| Feature | Requirement it meets |
| --- | --- |
| Direct connectivity to Microsoft services | Optimized, logged path to Microsoft 365 from anywhere |
| **Compliant network check** | Conditional Access requires that access comes through Global Secure Access, which helps against stolen-token replay from other networks, without maintaining IP lists |
| **Universal tenant restrictions** | Users can sign in only to tenants and apps allowed by your tenant restrictions policy: blocks data exfiltration to foreign tenants and personal accounts |
| **Source IP restoration** | The user's original public IP appears in Entra ID sign-in logs and risk detections, instead of the edge IP |
| Microsoft 365 enriched logs | Detailed traffic logs for Microsoft 365 |

Cross-tenant controls all live in Microsoft Entra **cross-tenant access settings**, but answer different questions:

| Setting | Controls |
| --- | --- |
| Inbound settings | External accounts accessing **your** apps (B2B collaboration and direct connect) |
| Outbound settings | **Your** accounts accessing external apps |
| **Tenant restrictions v2** | **External** accounts used on your networks and devices to reach **external** apps |

Tenant restrictions v2 (TRv2) needs Entra ID P1 and a client-side enforcement:

| Enforcement | Coverage |
| --- | --- |
| Universal tenant restrictions (Global Secure Access client or remote network) | Authentication plane on all platforms and browsers, no corporate proxy; data plane for Microsoft Graph |
| Corporate proxy injecting the `sec-Restrict-Tenant-Access-Policy` header | Authentication plane only, requires TLS decryption of sign-in traffic |
| Windows Group Policy (preview) | Authentication and data plane (SharePoint, OneDrive, Exchange, Teams) on Windows devices |

TRv2 isn't applied when users access their own tenant, nor to guest accounts in it. Personal Microsoft accounts can be blocked with application-level exceptions, not per user. Configuration needs the Global Secure Access Administrator and Security Administrator roles, and a Microsoft traffic profile with the Entra ID endpoints set to tunnel.

> **Exam trap.** "Prevent employees from signing in to another company's Microsoft 365 tenant from corporate devices" is tenant restrictions v2, enforced by universal tenant restrictions. Outbound cross-tenant access settings don't do it: they govern your accounts in B2B scenarios, not foreign accounts.

<!-- section: private-access | objectives: 3.4.4 -->
## Microsoft Entra Private Access

**Microsoft Entra Private Access** is the **zero trust network access (ZTNA)** part of Global Secure Access. It replaces the VPN for private resources in datacenters and clouds (any TCP or UDP app, defined by FQDN, IP address or range and port) and builds on Microsoft Entra application proxy. Traffic goes from the Global Secure Access client to Microsoft's edge, then to **private network connectors** that make outbound connections only, so no inbound port is opened.

| Option | Use |
| --- | --- |
| **Quick Access** | One app that groups the broad set of private resources: fastest VPN replacement |
| **Per-app access** (Global Secure Access enterprise apps) | Separate apps for sensitive resources, each with its own user assignments and Conditional Access policy (MFA, compliant device, risk) |
| App Discovery | Finds the private apps users reach through Quick Access, to move them to per-app access |
| Private DNS | Internal DNS suffixes resolved through the connectors |
| Kerberos SSO | Single sign-on to AD DS-integrated apps with Microsoft Entra credentials |

Licensing: the **Microsoft Entra Private Access** license (standalone or in Microsoft Entra Suite), with Microsoft Entra ID P1. Private Access can run side by side with a third-party SSE that handles internet traffic.

| Requirement | Recommend |
| --- | --- |
| Replace a VPN for SMB shares, RDP and SSH with per-app MFA | Private Access per-app access |
| Publish an on-premises web app to browsers only | Application proxy (Private Access also works, with the client) |
| Administrators connect to Azure VMs without public IPs | Azure Bastion |
| Site-to-site connectivity between datacenter and Azure | VPN Gateway or ExpressRoute (network connectivity, not user access) |
| Internet and SaaS filtering for the same users | Internet Access, a separate traffic profile |

> **Exam trap.** Internet Access filters traffic **leaving** to the internet and SaaS; Private Access grants access **into** private apps. And a resource defined in a per-app Global Secure Access app takes priority over the same segment in Quick Access: users assigned only to Quick Access lose access to it.

<!-- section: key-points -->
## Key points

- Network design: segmentation, hub firewall, WAF for layer 7, DDoS for layers 3-4, private endpoints with public access disabled, Bastion instead of public IPs.
- Internet Access: identity-aware SWG; filtering policies in security profiles, linked by Conditional Access; baseline profile as catch-all; TLS inspection for full fidelity.
- Microsoft traffic profile: included in Entra ID P1/P2; compliant network check, universal tenant restrictions, source IP restoration.
- Tenant restrictions v2 controls external accounts on your devices; inbound and outbound settings control B2B access.
- Private Access: ZTNA VPN replacement, outbound-only connectors, Quick Access then per-app access with Conditional Access.
