Azure Load Balancer distributes TCP and UDP flows at layer 4. Design questions give a workload (protocol, internet-facing or private, one region or several, appliances to insert) and ask which load balancer, which SKU, which tier and which frontend type meet the requirements, often with Application Gateway, Front Door and Traffic Manager as distractors.

<!-- section: lb-capabilities | objectives: 3.1.1 -->
## Features and capabilities

Load Balancer is a **pass-through** service: it doesn't terminate connections, doesn't read HTTP and doesn't change the client IP address that the backend sees. It hashes each new flow to a healthy backend instance and keeps the flow on that instance. It scales to millions of flows and has no throughput limit of its own (the virtual machine limits apply).

| Component | Role |
| --- | --- |
| Frontend IP configuration | The address clients connect to. A public IP address makes a **public** load balancer, a private IP address an **internal** one. A load balancer can have several frontends |
| Backend pool | The virtual machines or scale set instances that receive traffic, added by NIC or by IP address, all in **one virtual network** |
| Health probe | Decides which instances receive new flows (TCP, HTTP or HTTPS) |
| Load-balancing rule | Maps a frontend IP and port to a port on **all** the healthy instances of a backend pool |
| HA ports rule | A load-balancing rule with protocol `All` and port `0`: every TCP and UDP flow on every port. Internal load balancer only |
| Inbound NAT rule | Maps a frontend IP and port to **one** backend instance (port forwarding) |
| Outbound rule | Defines the source NAT (SNAT) of the backend pool to the public frontend IP addresses |

Map the requirement to the feature:

| Requirement | Feature |
| --- | --- |
| Spread TCP or UDP traffic across virtual machines | Load-balancing rule |
| Keep a client on the same instance | Session persistence **Client IP** (2-tuple) or **Client IP and protocol** (3-tuple) |
| Reach the RDP or SSH port of one specific VM through the frontend | Inbound NAT rule |
| Load balance every port for a pair of firewalls | HA ports rule on an internal load balancer |
| Reuse the same backend port in several rules (SQL Server Always On listener, clustering) | Floating IP |
| Take an instance out for patching while its probe is still healthy | Admin state **Down** |
| Tell client and server that an idle flow was dropped | TCP reset on idle |
| Control which public IP addresses and how many SNAT ports the backends use outbound | Outbound rule |
| Insert third-party appliances transparently in front of a public endpoint | Gateway Load Balancer |
| One static anycast IP address in front of several regions | Global tier (cross-region load balancer) |

Distribution modes, set per rule (`loadDistribution`), can be changed without downtime:

| Portal: Session persistence | API value | Hash | Effect |
| --- | --- | --- | --- |
| None | `Default` | 5-tuple: source IP, source port, destination IP, destination port, protocol | A new connection from the same client can reach another instance |
| Client IP | `SourceIP` | 2-tuple: source IP, destination IP | Same client IP, same instance, whatever the protocol: a TCP control channel and a UDP data flow from one client (media upload) reach the same instance |
| Client IP and protocol | `SourceIPProtocol` | 3-tuple: adds the protocol | Same client IP and protocol, same instance: a client's TCP and UDP flows can reach different instances; fixes Remote Desktop Gateway |

Admin state overrides the probe per backend pool instance: **Up** always eligible, **Down** no new connections (established TCP flows continue, existing UDP flows move to another healthy instance), **None** follows the probe. A VM in two backend pools keeps its state in the other pool. It requires a probed load-balancing rule, isn't supported with inbound NAT rules and can't be set while you create a NIC-based backend pool.

Limits that shape a design (Standard): 1,500 rules (load-balancing plus inbound NAT) per load balancer, 600 frontend IP configurations, 600 outbound rules, 5,000 instances per backend pool, 300 rules per NIC, one HA ports rule per internal frontend. Several HA ports rules on one internal load balancer need a unique frontend IP address each and Floating IP enabled on all of them. Flow symmetry isn't supported for NVAs placed between a public and an internal load balancer: use Gateway Load Balancer for that case.

> **Exam trap.** Load Balancer can't terminate TLS, route by URL path or host name, rewrite headers or host a WAF. Any requirement at layer 7 points to Application Gateway (regional) or Front Door (global). Load-balancing and inbound NAT rules carry only TCP and UDP; ICMP works only through an HA ports rule on an internal load balancer.

<!-- section: lb-use-cases | objectives: 3.1.2 -->
## Use cases and alternatives

The four load-balancing services differ by layer and scope:

| Service | Layer | Scope | Typical use |
| --- | --- | --- | --- |
| Azure Load Balancer | 4 (TCP, UDP) | Regional, or global with the Global tier | Any TCP or UDP workload on VMs and scale sets, internal tiers, NVA high availability, outbound SNAT |
| Application Gateway | 7 (HTTP, HTTPS, plus TCP/TLS proxy) | Regional | Web apps that need path or host routing, TLS offload, WAF, cookie affinity |
| Front Door | 7 (HTTP, HTTPS) | Global | Global web entry point with acceleration, caching and WAF |
| Traffic Manager | DNS | Global | Steer clients to regional endpoints, including non-Azure ones, by priority, weight, latency, geography or subnet |

Choose Load Balancer when:

- The protocol isn't HTTP: SQL Server, SMTP, a custom TCP service, DNS or syslog over UDP, gaming or media over UDP.
- A tier must be reachable only privately: from other subnets, peered virtual networks, or on-premises through VPN or ExpressRoute.
- Network virtual appliances (firewalls, SD-WAN) need active-active high availability: internal load balancer with an HA ports rule as the next hop of the user-defined routes.
- The lowest latency matters: no proxy, the client IP address is preserved.
- Backend VMs need explicit outbound internet access through shared public IP addresses (outbound rules), when a NAT gateway isn't used.

Services are combined: Front Door or Traffic Manager across regions, then Application Gateway or Load Balancer inside each region.

Design limitations:

- All the frontends and backend instances of a load balancer are in **one virtual network**; a rule can't span two virtual networks.
- A backend pool can't contain a private endpoint, another load balancer or an Application Gateway. IP-based pools accept only virtual machines and scale set instances.
- A backend VM can't reach the frontend of the internal load balancer that balances it: the flow fails.
- IP fragments aren't forwarded.
- With NIC-based pools, an availability set can be behind only one public and one internal load balancer.

> **Exam tip.** "Load balance RDP to a VM", "SQL Server", "UDP", "all ports" or "preserve the client IP address" point to Load Balancer. "URL path", "host header", "SSL offload", "cookie" or "WAF" point to Application Gateway.

<!-- section: lb-sku | objectives: 3.1.3 -->
## SKUs and tiers

Basic Load Balancer was **retired on September 30, 2025**. Two SKUs remain, each for its own scenario:

| SKU | Purpose |
| --- | --- |
| Standard | General layer 4 load balancing, public or internal, regional or global |
| Gateway | Transparent insertion of third-party network virtual appliances, chained to a Standard public frontend or to a VM public IP configuration |

Standard compared with the retired Basic SKU, as the exam still contrasts them:

| Capability | Standard | Basic (retired) |
| --- | --- | --- |
| Backend pool | Any VMs or scale sets in one virtual network, by NIC or by IP address | VMs of one availability set or one scale set, by NIC |
| Health probes | TCP, HTTP, HTTPS | TCP, HTTP |
| All probes down | Established TCP flows continue | All TCP flows end |
| Availability zones | Zone-redundant or zonal frontends | No |
| Inbound access | **Closed by default**: an NSG must allow it | Open |
| HA ports, outbound rules, TCP reset on idle | Yes | No |
| Frontend public IP SKU | Standard | Basic |
| SLA | 99.99% | None |
| Global tier, NAT gateway, Private Link service, global peering access | Yes | No |

A virtual machine, availability set or scale set can reference only one load balancer SKU. A Standard load balancer can move to another resource group but not to another subscription. Existing Basic load balancers are migrated with the `AzureBasicLoadBalancerUpgrade` PowerShell module:

```powershell
Install-Module -Name AzureBasicLoadBalancerUpgrade -Scope CurrentUser -Repository PSGallery -Force
Start-AzBasicLoadBalancerUpgrade -ResourceGroupName RG1 -BasicLoadBalancerName lb-basic -validateScenarioOnly:$true
Start-AzBasicLoadBalancerUpgrade -ResourceGroupName RG1 -BasicLoadBalancerName lb-basic
```

The **tier** is the second choice. **Regional** (default) serves backends in one region. **Global** is a public load balancer whose backend pool contains regional load balancers (see the last section).

Zones are chosen on each frontend: **zone-redundant** (served from every zone, survives a zone failure), **zonal** (pinned to one zone, fails with it) or no zone in regions without zones. The public IP address decides it for a public frontend. Learn recommends zone-redundant frontends for all workloads, even those deployed in a single zone. To change the zone configuration, create a new frontend IP configuration, move the rules to it and remove the old one: clients must use the new address.

> **Exam trap.** VMs placed behind a new Standard load balancer don't answer until an NSG on their subnet or NIC allows the client traffic. The `AllowAzureLoadBalancerInBound` default rule lets the health probe in, not the clients.

<!-- section: lb-public-internal | objectives: 3.1.4 -->
## Public or internal load balancer

The frontend type sets the load balancer type:

| | Public load balancer | Internal load balancer |
| --- | --- | --- |
| Frontend | Standard public IP address (a public IP prefix only for outbound rules) | Private IP address from a subnet of the virtual network |
| Reachable from | The internet (subject to NSGs) | The virtual network, peered virtual networks (including global peering), on-premises through VPN or ExpressRoute. Never from the internet |
| Typical use | Internet-facing service, port forwarding, outbound SNAT for the backends | Application or data tier, line-of-business app used from on-premises, NVA high availability with HA ports |
| HA ports | No | Yes |
| Outbound connectivity for the backends | Through outbound rules | None: add a NAT gateway, instance-level public IP addresses or an outbound-only public load balancer |
| Private Link service | No | Yes (NIC-based backend pool) |

A multi-tier design uses both: a public load balancer in front of the web tier, an internal load balancer in front of the application tier. The same VMs can be in the backend pool of one public and one internal load balancer, for example an internal load balancer with HA ports for east-west traffic through NVAs and a public one for inbound internet traffic.

```bash
# Internal load balancer: frontend in a subnet, no public IP address
az network lb create --resource-group RG1 --name lb-app --sku Standard \
  --vnet-name vnet-hub --subnet snet-app --private-ip-address 10.1.2.10 \
  --frontend-ip-name fe-app --backend-pool-name pool-app
```

> **Exam trap.** Traffic from on-premises reaches an **internal** load balancer through the VPN or ExpressRoute gateway; a public load balancer isn't needed and would expose the service. Conversely, an internal load balancer can't publish anything to the internet.

<!-- section: lb-regional-global | objectives: 3.1.5 -->
## Regional or global (cross-region) load balancer

Learn now calls the cross-region load balancer the **global load balancer**: a Standard load balancer of the **Global** tier.

| | Regional | Global (cross-region) |
| --- | --- | --- |
| Frontend | Public or private | Public only: a static **anycast** Standard public IP address of the Global tier, IPv4 or IPv6 |
| Backend pool | VMs and scale set instances | Frontends of **public regional Standard** load balancers, up to 300 |
| Routing | Hash to a healthy instance | Geo-proximity: the client enters the closest participating region, then reaches the closest healthy regional load balancer over the Microsoft backbone |
| Health | Health probes on instances | Health of each regional load balancer checked every 5 seconds; a region at 0% availability leaves rotation |
| Outbound rules | Yes | No: use the regional load balancer or a NAT gateway |

The global load balancer keeps the client IP address (layer 4 pass-through) and supports floating IP. It is deployed in a **home region** (for example West Europe, North Europe, UK South, East US 2, Central US, West US, Southeast Asia, East Asia); the home region doesn't affect routing and its failure doesn't stop traffic. The backend regional load balancers can be in any public region.

Limitations:

- No internal frontend, and no internal load balancer in the backend pool.
- Frontend and backends use the same IP version (no NAT64).
- A regional load balancer can't be upgraded to the Global tier: create a new one.
- No ICMP, no UDP on port 3, no Gateway Load Balancer chaining.
- The backend port of the global rule must match the frontend port of the rule on each regional load balancer.

```bash
az network public-ip create --resource-group RG-Global --name pip-global \
  --sku Standard --tier Global --location westeurope
az network cross-region-lb create --resource-group RG-Global --name lb-global \
  --location westeurope --public-ip-address pip-global \
  --frontend-ip-name fe-global --backend-pool-name pool-regions
```

Choosing among the global options:

| Requirement | Answer |
| --- | --- |
| Non-HTTP TCP or UDP application in several regions behind one static IP address, instant failover | Global load balancer |
| Steer users by DNS to endpoints in Azure and elsewhere, by priority, weight, geography or subnet | Traffic Manager |
| Global HTTP(S) entry point with WAF, caching and path routing | Front Door |

> **Exam trap.** Traffic Manager failover depends on DNS caching (TTL); the global load balancer keeps one anycast IP address, so clients don't need to resolve a new address when a region fails.

<!-- section: key-points -->
## Key points

- Load Balancer is layer 4 pass-through: TCP and UDP, client IP preserved, no TLS, no URL routing.
- Basic retired on September 30, 2025: designs use Standard (general) or Gateway (NVA insertion).
- Standard is closed to inbound traffic until an NSG allows it.
- Public frontend for internet clients; internal frontend for private tiers, on-premises clients and HA ports.
- Internal load balancer backends have no outbound internet access unless you add it.
- Global tier: public anycast frontend, backend pool of public regional load balancers, no outbound rules, no internal frontend.
