Azure provides network and infrastructure services that each stop a different kind of threat. The exam describes a need and expects the right service: learn what each one protects and at which layer.

<!-- section: ddos-protection | objectives: 3.1.1 -->
## Azure DDoS Protection

A **distributed denial-of-service** (DDoS) attack overwhelms an application's resources so that legitimate users can't reach it. Volumetric attacks flood the bandwidth, protocol attacks exploit weaknesses of layers 3 and 4, and resource (application-layer) attacks target web applications.

**Azure DDoS Protection** analyzes traffic and discards what looks like an attack, at **layer 3 (network) and layer 4 (transport)**: always-on traffic monitoring, automatic mitigation, adaptive tuning to the application's normal traffic, and metrics and alerts through Azure Monitor.

| Level | Protects | Notes |
| --- | --- | --- |
| Default infrastructure protection | Every Azure service | No cost and no configuration, but no telemetry, no alerting and no tuning to your application |
| **DDoS IP Protection** | Individual public IP addresses | Paid per protected IP address; same core features as Network Protection |
| **DDoS Network Protection** | All the resources of the virtual networks where it is enabled | Adds DDoS rapid response support, cost protection and a discount on WAF |

> **Exam trap.** Azure DDoS Protection doesn't protect layer 7. An attack on the application layer of a website is handled by a web application firewall; the two are used together.

<!-- section: azure-firewall | objectives: 3.1.2 -->
## Azure Firewall

**Azure Firewall** is a cloud-native, managed network firewall that protects the workloads of your virtual networks. It is fully **stateful**, has built-in high availability and scales with the traffic. It is deployed centrally, typically in a hub virtual network, and filters traffic for several virtual networks and subscriptions with one set of rules.

- It filters by IP address, port and protocol (network rules) and by fully qualified domain name (application rules), and translates inbound and outbound addresses (DNAT, SNAT).
- **Threat intelligence** filtering alerts on, and denies, traffic to or from known malicious IP addresses and domains.

| SKU | For | Distinctive features |
| --- | --- | --- |
| Basic | Small and medium-sized businesses | Threat intelligence in alert mode only |
| Standard | General filtering from layer 3 to layer 7 | Threat intelligence that alerts and denies |
| Premium | Highly sensitive applications, such as payment processing | TLS inspection, intrusion detection and prevention (IDPS), URL filtering |

<!-- section: waf | objectives: 3.1.3 -->
## Azure Web Application Firewall

**Azure Web Application Firewall** (WAF) gives web applications centralized protection against common exploits and vulnerabilities, such as **SQL injection** and **cross-site scripting**. It works at **layer 7**: it inspects HTTP and HTTPS requests.

- WAF isn't a standalone resource: it is deployed with another service, mainly **Azure Application Gateway** or **Azure Front Door**.
- It applies managed rule sets, based on the OWASP core rule set, that you can complete with custom rules.
- In **detection** mode it only logs; in **prevention** mode it blocks the requests.

<!-- section: network-segmentation | objectives: 3.1.4 -->
## Network segmentation with Azure virtual networks

**Segmentation** divides a network into smaller parts in order to group related assets, isolate resources and apply governance. It supports Zero Trust: with "assume breach", a compromised segment must not let the attacker move laterally to the rest.

An **Azure virtual network** (VNet) is the basic building block of a private network in Azure and its first level of containment:

| Behavior | Default |
| --- | --- |
| Between resources of the same virtual network | Communication allowed, without going through the internet |
| Between two virtual networks | No traffic until you connect them, for example with **virtual network peering** |
| Outbound to the internet | Depends on the subnet: subnets of new virtual networks are private (Azure portal, and API versions released after March 31, 2026), and need an explicit outbound method such as a NAT gateway; existing virtual networks keep default outbound access |
| Inbound from the internet | Not possible without a public IP address or a load balancer |

**Subnets** divide a virtual network into segments with different security needs, for example web servers in one and databases in another, with their own controls.

<!-- section: nsg | objectives: 3.1.5 -->
## Network security groups

A **network security group** (NSG) filters network traffic to and from Azure resources in a virtual network. It contains **security rules** that allow or deny inbound or outbound traffic.

| Property of a rule | Values |
| --- | --- |
| Priority | A number from 100 to 4096; rules are processed from the lowest number, and processing stops at the first match |
| Source or destination | An IP address or range, a service tag, or an application security group |
| Protocol | TCP, UDP, ICMP or Any |
| Direction | Inbound or outbound |
| Port range | One port or a range |
| Action | Allow or deny |

- An NSG is associated with a **subnet** or with a **network interface**; each of them takes one NSG at most, and one NSG can be associated with many.
- Default rules, which can't be deleted but can be overridden: inbound, traffic from the virtual network and from the Azure load balancer is allowed and everything else is denied; outbound, traffic to the virtual network and to the internet is allowed.
- NSGs are stateful: the response to an allowed connection is allowed automatically.

| Service | Layer | Use it to |
| --- | --- | --- |
| NSG | 3 and 4 | Filter traffic of a subnet or a network interface, inside a virtual network |
| Azure Firewall | 3 to 7 | Filter and inspect traffic centrally, across virtual networks and subscriptions |
| WAF | 7 | Protect web applications against attacks such as SQL injection |
| Azure DDoS Protection | 3 and 4 | Absorb attacks that try to saturate public endpoints |

> **Exam tip.** NSGs and Azure Firewall complement each other: distributed filtering close to the resources, plus central control. Using both is defense in depth.

<!-- section: bastion | objectives: 3.1.6 -->
## Azure Bastion

**Azure Bastion** is a fully managed service that provides secure **RDP and SSH** connectivity to virtual machines, over TLS (port 443), directly from the Azure portal in a browser. The virtual machines need **no public IP address**, no agent and no special client software, so their management ports aren't exposed to the internet or to port scanning.

Bastion is deployed **per virtual network** and also reaches the virtual machines of peered virtual networks, except with the Developer SKU.

| SKU | In short |
| --- | --- |
| Developer | Free, shared infrastructure, one connection at a time, no peered virtual networks; for development and testing |
| Basic | Dedicated deployment with fixed capacity |
| Standard | Adds scaling, native client support, shareable links, file transfer |
| Premium | Adds session recording and private-only deployment |

<!-- section: key-vault | objectives: 3.1.7 -->
## Azure Key Vault

**Azure Key Vault** is a cloud service for storing secrets securely and controlling access to them:

| It manages | Examples |
| --- | --- |
| **Secrets** | Passwords, API keys, tokens, connection strings |
| **Keys** | Encryption keys used to encrypt your data |
| **Certificates** | TLS/SSL certificates, with automated enrollment and renewal |

- Applications read their secrets from the vault at run time instead of keeping them in code or configuration files.
- **Authentication** goes through Microsoft Entra ID; **authorization** uses Azure RBAC or Key Vault access policies.
- The Standard tier protects keys with software; the Premium tier adds keys protected by a **hardware security module** (HSM).
- Access to the vault can be logged and monitored.

> **Exam trap.** Bastion secures an administrator's connection to a virtual machine; Key Vault secures the secrets an application uses.

<!-- section: key-points -->
## Key points

- DDoS Protection: layers 3 and 4; IP Protection per public IP address, Network Protection per virtual network with rapid response and cost protection.
- Azure Firewall: managed, stateful, central firewall for several virtual networks; Premium adds TLS inspection and IDPS.
- WAF: layer 7, web applications, SQL injection and cross-site scripting; deployed with Application Gateway or Front Door.
- NSG: allow or deny rules by priority (100 to 4096), on a subnet or a network interface.
- Bastion: RDP and SSH over TLS from the portal, no public IP address on the virtual machine.
- Key Vault: secrets, keys, certificates; HSM-protected keys in the Premium tier.
