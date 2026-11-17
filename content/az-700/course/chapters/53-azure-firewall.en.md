Azure Firewall is a managed, stateful network firewall that filters east-west and outbound traffic and publishes services inbound through DNAT. Azure Firewall Manager centralizes its policies and turns Virtual WAN hubs into secured hubs. Exam questions map a list of requirements to a SKU and features, place the firewall in a topology, and test the order in which rules are processed.

<!-- section: firewall-capabilities | objectives: 5.2.1 -->
## Mapping requirements to Azure Firewall features

| Requirement | Feature |
| --- | --- |
| Allow outbound HTTP/HTTPS or Azure SQL only to listed domain names, wildcards allowed | Application rule with target FQDNs (matched on Host header or TLS SNI, no TLS termination) |
| Filter by IP, port and protocol (TCP, UDP, ICMP, Any) between spokes, to on-premises or to the internet | Network rule |
| Filter non-HTTP protocols (SSH, NTP, RDP) by FQDN | Network rule with destination FQDN, which requires **DNS proxy** |
| Publish an internal server through the firewall's public IP | DNAT rule (translated address and port) |
| Hide private addresses behind one or more public IPs for internet egress | Automatic SNAT (up to 250 public IPs, or a NAT gateway) |
| Allow well-known Microsoft services, reuse address lists | FQDN tags (application rules), service tags (network rules), IP Groups |
| Block known malicious IPs and domains | Threat intelligence in **Alert and deny** mode |
| Block categories such as gambling or social media | Web categories (FQDN-based in Standard, full URL in Premium) |
| Filter on the full URL path, inspect HTTPS content | TLS inspection and URL filtering (Premium) |
| Signature-based detection and blocking of attacks | IDPS (Premium) |

> **Exam trap.** Azure Firewall doesn't apply application rules to inbound connections. To filter inbound HTTP/HTTPS requests for SQL injection or cross-site scripting, use a WAF (Application Gateway or Front Door), possibly in front of or alongside the firewall.

<!-- section: firewall-skus | objectives: 5.2.2 -->
## Selecting an Azure Firewall SKU

| Capability | Basic | Standard | Premium |
| --- | --- | --- | --- |
| Throughput | Up to 250 Mbps | Up to 30 Gbps (autoscale) | Up to 100 Gbps (autoscale) |
| Fat flow (single connection) | N/A | 1 Gbps | 10 Gbps |
| Application FQDN filtering, network rules, SNAT/DNAT, availability zones | Yes | Yes | Yes |
| Network-level FQDN filtering, DNS proxy, custom DNS | No | Yes | Yes |
| Threat intelligence | Alert only | Alert and deny | Alert and deny |
| Web categories | No | FQDN only | Full URL |
| TLS inspection, IDPS, URL filtering | No | No | Yes |
| Deployment without a data public IP in forced tunnel mode | No | Yes | Yes |
| Management NIC | Always | Optional (needed for forced tunneling) | Optional (needed for forced tunneling) |

Choose the lowest SKU that meets the requirements: **Basic** for small environments (no DNS proxy, so no FQDNs in network rules, and threat intelligence can't deny), **Standard** for enterprise filtering, **Premium** for regulated workloads (payment, healthcare) that need TLS inspection, IDPS (more than 67,000 signatures) or URL filtering.

The firewall policy has a matching tier: a **Basic** policy for Basic firewalls, a **Standard** policy for Standard or Premium firewalls, a **Premium** policy (TLS inspection, IDPS, URL filtering) for Premium firewalls only. You can change between Standard and Premium without downtime (easy SKU change in the portal or PowerShell).

> **Exam tip.** "Inspect encrypted outbound traffic", "IDPS" or "filter `www.contoso.com/finance` but not the rest of the site" all require Premium. "Allow SSH to `sftp.fabrikam.com` by name" requires Standard or Premium with DNS proxy.

<!-- section: firewall-design | objectives: 5.2.3 -->
## Designing an Azure Firewall deployment

Typical design: one firewall per region in the **hub** virtual network of a hub-and-spoke topology. Spokes are peered to the hub, and each spoke subnet gets a route table with `0.0.0.0/0` (and the other spokes' prefixes if needed) to **Virtual appliance** = the firewall's private IP.

| Design element | Rule |
| --- | --- |
| Data subnet | **AzureFirewallSubnet**, **/26** |
| Management subnet | **AzureFirewallManagementSubnet**, **/26**, with its own public IP; required for forced tunneling; always present for Basic and secured hub firewalls |
| Firewalls per virtual network | One |
| Availability zones | For new deployments, don't specify zones: Azure spreads instances across zones in zone-redundant compatible regions, at no extra cost |
| Public IP addresses | Standard SKU, up to **250** per firewall in a virtual network (80 in a secured hub); a public IP prefix itself can't be attached, addresses created from it can |
| Scale | Starts with two instances and scales out automatically (5 to 7 minutes); prescaling sets 2 to 50 capacity units |

**SNAT.** Outbound traffic to public addresses is translated to a firewall public IP; traffic to private ranges (IANA RFC 1918 and RFC 6598) isn't SNATed; if your organization uses public ranges internally, add them to the **private IP ranges** setting. Traffic matched by **application rules is always SNATed** (use network rules with FQDNs to keep the original source in logs). Each public IP gives **2,496 SNAT ports per instance**; for more, associate a **NAT gateway** with AzureFirewallSubnet (64,512 ports per NAT gateway public IP, no extra UDR, StandardV2 NAT gateway for a zone-redundant firewall). A NAT gateway isn't supported in a secured virtual hub.

**Forced tunneling.** To send internet-bound traffic to an on-premises firewall or NVA, deploy the firewall with the **management NIC** enabled, then add a `0.0.0.0/0` route (UDR, or BGP with **Propagate gateway routes**) on AzureFirewallSubnet. Internet-bound traffic is then SNATed to a firewall private IP; to keep original sources, set the private IP ranges to `0.0.0.0/0`. A firewall with forced tunneling configured can't serve inbound DNAT from the internet (asymmetric routing). Otherwise the firewall needs direct internet access: if AzureFirewallSubnet learns a default route by BGP, override it with a UDR `0.0.0.0/0` to **Internet**.

> **Exam trap.** The UDR to the firewall goes on the workload subnets, with **Propagate gateway routes** disabled (or with specific routes that override the on-premises prefixes learned by BGP). For on-premises traffic to the spokes to cross the firewall as well, the **GatewaySubnet** needs its own route table sending the spoke prefixes to the firewall.

<!-- section: firewall-deploy | objectives: 5.2.4 -->
## Creating and implementing an Azure Firewall deployment

Order of operations:

1. Create (or reuse) the hub virtual network with **AzureFirewallSubnet** /26 (and **AzureFirewallManagementSubnet** /26 for Basic or forced tunneling).
2. Create a Standard SKU static public IP (and a management public IP if needed).
3. Create the **firewall policy** (tier matching the firewall) with its rule collection groups.
4. Deploy the firewall: SKU `AZFW_VNet` (virtual network) or `AZFW_Hub` (Virtual WAN hub), tier, virtual network, public IP, policy. Note its **private IP**.
5. Create a route table (gateway route propagation disabled when on-premises routes must not bypass the firewall) with `0.0.0.0/0` to **VirtualAppliance** = firewall private IP, and associate it with the workload subnets.
6. Point the VMs' DNS to the firewall if DNS proxy is used for FQDN network rules.
7. Enable diagnostic settings and test.

```bash
az network firewall policy create -g RG-Hub -n FWP-Hub \
  --sku Standard --threat-intel-mode Deny --enable-dns-proxy true

az network firewall create -g RG-Hub -n FW-Hub \
  --sku AZFW_VNet --tier Standard --firewall-policy FWP-Hub

az network firewall ip-config create -g RG-Hub --firewall-name FW-Hub \
  --name FW-config --public-ip-address pip-fw-hub --vnet-name VNet-Hub

az network route-table create -g RG-Spoke1 -n RT-Spoke1 \
  --disable-bgp-route-propagation true
az network route-table route create -g RG-Spoke1 --route-table-name RT-Spoke1 \
  -n Default-to-FW --address-prefix 0.0.0.0/0 \
  --next-hop-type VirtualAppliance --next-hop-ip-address 10.0.1.4
```

> **Exam trap.** Creating the firewall doesn't route anything to it. Without the UDR on the workload subnets, VMs keep using the system route to the internet and the firewall sees no traffic.

<!-- section: firewall-rules | objectives: 5.2.5 -->
## Configuring Azure Firewall rules

With a firewall policy, rules are organized as **rule collection groups** (RCG) containing **rule collections** (DNAT, Network or Application, with one action: Allow or Deny for filter collections, DNAT for NAT collections) containing **rules**. Priorities go from **100 (first) to 65,000 (last)**. Default groups: DNAT (100), Network (200), Application (300). Inside a collection, the first matching rule applies. Rules are **terminating**, and anything not allowed is **denied by default**.

Processing order:

1. **Threat intelligence** (if enabled) before any rule.
2. **DNAT** rules, then **network** rules, then **application** rules, whatever the group or collection priorities. Within each type: rule collection groups by priority, then collections by priority. Rules inherited from a **parent policy** always come before the child's.
3. If no application rule matches, the built-in **infrastructure rule collection** (platform FQDNs), then deny.
4. **IDPS** (Premium): in Alert mode it runs in parallel; in Alert and Deny mode it runs after rule processing and can drop a flow that a rule allowed.

| Rule type | Matches on | Notes |
| --- | --- | --- |
| DNAT | Firewall public (or private) IP and port, source | A match translates and **implicitly allows** the traffic: no network rule needed. Restrict the source instead of using `*` |
| Network | Source, destination IP, service tag, IP Group or FQDN, port, protocol | Inbound, outbound and east-west |
| Application | Source, protocol:port (HTTP, HTTPS, MSSQL), target FQDN, FQDN tag, web category (URL with Premium TLS inspection) | Outbound and east-west only; HTTP matches the Host header, HTTPS the SNI |

Worked example: a network rule allows TCP 443 to `*` in collection priority 200, and an application rule collection denies `*.games.example` in priority 100. A user opens `https://play.games.example`: the **network rule matches first** (network before application), so the connection is allowed.

Wildcards in target FQDNs work only on the left (`*.contoso.com`); `*contoso.com` also matches unwanted names such as `badcontoso.com`.

```bash
az network firewall policy rule-collection-group create -g RG-Hub \
  --policy-name FWP-Hub --name RCG-Spokes --priority 500

az network firewall policy rule-collection-group collection add-filter-collection \
  -g RG-Hub --policy-name FWP-Hub --rule-collection-group-name RCG-Spokes \
  --name Allow-Web --collection-priority 510 --action Allow \
  --rule-name Allow-Contoso --rule-type ApplicationRule \
  --source-addresses 10.1.0.0/16 --protocols Https=443 \
  --target-fqdns "*.contoso.com"
```

The firewall is stateful: return traffic of an allowed connection passes even if a deny rule exists in the reverse direction.

> **Exam trap.** Collection priority never moves an application rule ahead of a network rule. If a question shows an application deny with priority 100 and a network allow with priority 300 for the same traffic, the network allow wins.

<!-- section: firewall-manager-policies | objectives: 5.2.6 -->
## Creating Azure Firewall Manager policies

**Azure Firewall Manager** centrally manages firewalls across regions and subscriptions in two architectures: **hub virtual network** and **secured virtual hub** (a Virtual WAN hub).

| | Firewall policy | Classic rules |
| --- | --- | --- |
| Resource | Separate global resource, reusable by many firewalls in any region | Part of one firewall |
| Content | NAT, network, application rules, DNS settings, IP Groups, threat intelligence, plus IDPS, TLS inspection, web categories, URL filtering | NAT, network, application rules, DNS, IP Groups, threat intelligence |
| Protects | Virtual networks and Virtual WAN hubs | Virtual networks only |
| Cost | Free with zero or one firewall association, fixed fee with several | Free |

**Hierarchy.** A child (local) policy is created with a **parent (base) policy**: it inherits all its rule collections. The parent and child must be in the **same region**, but the policy can be associated with firewalls in any region. Parent rule collections are always processed before the child's, whatever the priorities; changes to the parent flow down automatically. The threat intelligence mode is inherited and can only be made stricter in the child (Alert only can become Alert and deny, never Off); the allowlist can only be extended.

> **Exam tip.** "Central IT must enforce rules that application teams can't override, while teams manage their own rules" is answered with a parent policy and child policies, not with two firewalls or with RBAC alone.

<!-- section: secured-hub | objectives: 5.2.7 -->
## Creating a secured virtual hub

A **secured virtual hub** is a Standard Virtual WAN hub with Azure Firewall (SKU `AZFW_Hub`) and security and routing policies set by Firewall Manager. It inspects spoke, branch and internet traffic **without UDRs**: the hub pushes the routes.

| | Hub virtual network | Secured virtual hub |
| --- | --- | --- |
| Underlying resource | Virtual network you manage | Microsoft-managed Virtual WAN hub |
| Spoke connectivity | Peering plus UDRs | Hub virtual network connections, routes by BGP |
| Firewall public IPs | Up to 250, customer provided | Up to 80, auto-generated (customer provided in preview) |
| Third-party security as a service (SECaaS) | Manual | Integrated security partner providers for internet traffic |

Steps (portal: **Network Security > Virtual hubs > Create new secured virtual hub**, or convert an existing hub):

1. Create or select the Virtual WAN and hub, enable **Azure Firewall** (tier, availability zones, number of public IPs, policy) and optionally a **security partner provider**.
2. Connect spoke virtual networks to the hub.
3. Associate the firewall policy with the hub (**Manage associations > Associate hubs**).
4. In the hub's **Security configuration**, send **Internet traffic** and **Private traffic** via Azure Firewall, and set **Inter-hub** to Enabled to turn on **routing intent**.

**Routing intent** defines at most one **Internet traffic** policy (the hub advertises `0.0.0.0/0` to spokes and branches) and one **Private traffic** policy (branch, virtual network and inter-hub traffic) per hub, each with one next hop (Azure Firewall, a supported NVA or a SaaS solution). Private traffic covers RFC 1918 ranges by default; add any other internal ranges in **Private Traffic Prefixes**. Routing intent requires no custom route tables, and it is the only way to inspect inter-hub and branch-to-branch traffic. The default route doesn't cross hubs: each hub's internet traffic egresses through its own firewall.

> **Exam trap.** Securing traffic between two hubs, or between two branches on the same hub, requires routing intent (private traffic policy). Deploying the firewall in both hubs without it leaves that traffic uninspected.

<!-- section: key-points -->
## Key points

- Basic 250 Mbps (alert-only threat intelligence, no DNS proxy), Standard 30 Gbps (DNS proxy, web categories, threat intelligence deny), Premium 100 Gbps (TLS inspection, IDPS, URL filtering).
- AzureFirewallSubnet /26, AzureFirewallManagementSubnet /26 for forced tunneling and Basic; one firewall per virtual network; up to 250 public IPs (80 in a secured hub).
- Workload subnets need a UDR `0.0.0.0/0` to the firewall private IP; nothing is filtered without it.
- Processing: threat intelligence, DNAT, network, application, infrastructure collection, deny; parent policy before child; priorities 100 to 65,000.
- DNAT implicitly allows; application rules are outbound and east-west only and always SNAT; FQDNs in network rules need DNS proxy; SNAT ports grow with public IPs or a NAT gateway.
- Firewall Manager policies are global, reusable and hierarchical (parent and child in the same region); secured hubs use routing intent for internet, private and inter-hub traffic.
