Name resolution tells clients where a service is; load balancing spreads their connections over healthy instances. This chapter covers Azure DNS, public and private, and Azure Load Balancer.

<!-- section: azure-dns-public | objectives: 4.3.1 -->
## Azure DNS: public zones

Azure DNS **hosts** DNS zones on Microsoft's name servers. It doesn't sell domain names: you buy the domain from a registrar, then delegate it.

**Delegating a domain to Azure DNS:**

1. Create the DNS zone `contoso.com` in a resource group. Azure assigns it **four name servers** (shown in the Overview page and in the NS record set at the apex).
2. Create the records the domain needs (copy the existing ones first if the domain is in use).
3. At the **registrar**, replace the domain's NS records with the four Azure name servers. The zone only becomes authoritative on the internet after this step.
4. Check with `nslookup -type=SOA contoso.com`.

To delegate a **subdomain** to another zone (`partners.contoso.com`): create the child zone, read its name servers, then add an **NS record set named `partners`** in the parent zone.

Records are managed as **record sets**: all the records of the same name and type, sharing one TTL.

| Type | Maps | Example use |
| --- | --- | --- |
| A / AAAA | A name to an IPv4 / IPv6 address | `www` → 20.50.1.10 |
| CNAME | A name to another name. Not allowed at the zone apex, and it can't coexist with other records of the same name | `shop` → `app1.azurewebsites.net` |
| MX | The domain to its mail servers, with a priority | Mail |
| TXT | Free text | Domain verification (`asuid`), SPF policies |
| NS | A zone or child zone to its name servers | Delegation |
| SOA | Zone parameters; one per zone, created automatically | |
| SRV, CAA, PTR | Services, authorized certificate authorities, reverse lookup | |

The zone apex is written `@`. Azure DNS has no SPF record type: SPF policies are TXT records.

**Alias records** (A, AAAA or CNAME record sets) point to an **Azure resource** instead of a fixed value: a public IP address, a Traffic Manager profile, an Azure Front Door or CDN endpoint, or another record set of the zone. The record follows the resource if its address changes and becomes empty if the resource is deleted (no dangling record). An alias A record is the way to point the **apex** of a zone to a load-balanced application.

```bash
az network dns zone create -g RG1 -n contoso.com
az network dns record-set a add-record -g RG1 -z contoso.com -n www -a 20.50.1.10 --ttl 3600
az network dns record-set cname set-record -g RG1 -z contoso.com -n shop -c app1.azurewebsites.net
az network dns record-set ns show -g RG1 -z contoso.com -n @
```

<!-- section: azure-dns-private | objectives: 4.3.1 -->
## Private DNS zones

By default, machines of a virtual network resolve each other's names through Azure-provided DNS, but only inside that one virtual network. An **Azure private DNS zone** (`corp.contoso.internal`) gives custom names resolvable from several virtual networks, without any DNS server to run.

A private zone answers only to the virtual networks **linked** to it. Two kinds of **virtual network link**:

| Link | Effect |
| --- | --- |
| **Resolution** link (auto-registration disabled) | The machines of the network can resolve the records of the zone |
| **Registration** link (auto-registration enabled) | In addition, Azure creates, updates and deletes the A records of the network's **virtual machines** automatically |

Rules:

- A virtual network can be a **registration** network for **only one** private zone, but a resolution network for many zones.
- A zone can have many linked networks. All linked networks resolve all the records of the zone, including those registered by other networks; **peering isn't required for resolution**, only for the traffic itself.
- Auto-registration covers virtual machines only (primary interface). Records for other resources, such as an internal load balancer, are created manually.
- Private endpoints use the same mechanism with the `privatelink.*` zones.
- If custom DNS servers are set on the virtual network, the machines use them instead: those servers must forward to Azure DNS (168.63.129.16) for private zones to work. **Azure DNS Private Resolver** provides inbound and outbound endpoints for hybrid resolution with on-premises.

```bash
az network private-dns zone create -g RG1 -n corp.contoso.internal
az network private-dns link vnet create -g RG1 -n link-app --zone-name corp.contoso.internal \
  --virtual-network VNet-App --registration-enabled true
```

<!-- section: load-balancer | objectives: 4.3.2 -->
## Azure Load Balancer

Azure Load Balancer distributes **TCP and UDP** flows (layer 4) to the healthy instances of a backend pool. It doesn't look at URLs, cookies or certificates.

| Service | Layer | Scope | Choose it for |
| --- | --- | --- | --- |
| **Azure Load Balancer** | 4 (TCP, UDP) | Regional (global tier available) | Any protocol, internal or public, high performance |
| Application Gateway | 7 (HTTP, HTTPS) | Regional | URL routing, TLS termination, web application firewall |
| Azure Front Door | 7 | Global | Global web applications, acceleration |
| Traffic Manager | DNS | Global | DNS-based routing between regions |

| Type | Frontend | Use |
| --- | --- | --- |
| **Public** load balancer | Public IP address | Internet-facing applications; outbound connectivity for the backend |
| **Internal** load balancer | Private IP address from a subnet | Internal tiers (databases, application tier), traffic from peered or on-premises networks |

The SKU in use is **Standard** (Basic was retired on September 30, 2025): zone-redundant frontends, backend pools of any machines of one virtual network, and **secure by default**: inbound traffic must be allowed by an NSG on the backend.

Components:

| Component | Role |
| --- | --- |
| **Frontend IP configuration** | The address that clients connect to |
| **Backend pool** | The virtual machines or scale set instances that receive traffic, all in the **same virtual network**. They need no public IP address |
| **Health probe** | Tests each instance; an unhealthy instance receives no new flows |
| **Load-balancing rule** | Maps a frontend IP and port to a backend port of the pool, with a probe |
| **Inbound NAT rule** | Forwards a frontend port to **one** instance (for example port 50001 → RDP of VM1). No probe needed |
| **Outbound rule** | Defines source NAT (SNAT) for the pool's outbound connections through a public frontend |

Settings of a load-balancing rule:

- **Session persistence** (distribution mode): **None** = five-tuple hash (source IP, source port, destination IP, destination port, protocol; the default: each new connection may land on another instance); **Client IP** = two-tuple (same client goes to the same instance); **Client IP and protocol** = three-tuple.
- **Floating IP** (direct server return) for SQL Server Always On listeners and some appliances.
- **Idle timeout** (4 minutes by default) and TCP reset.
- **HA ports**: protocol *All*, port 0, on an **internal** Standard load balancer only. One rule balances all ports and protocols; used in front of network virtual appliances.

```bash
az network lb create -g RG1 -n lb-web --sku Standard --public-ip-address pip-lb \
  --frontend-ip-name fe --backend-pool-name pool-web
az network lb probe create -g RG1 --lb-name lb-web -n probe-http --protocol Http --port 80 --path /health
az network lb rule create -g RG1 --lb-name lb-web -n rule-http --protocol Tcp \
  --frontend-port 80 --backend-port 80 --frontend-ip-name fe --backend-pool-name pool-web \
  --probe-name probe-http --disable-outbound-snat true
```

<!-- section: troubleshoot-load-balancer | objectives: 4.3.3 -->
## Troubleshooting load balancing

**Health probes** are the first suspect.

| Probe type | Instance is healthy when |
| --- | --- |
| TCP | The TCP handshake on the probe port succeeds |
| HTTP / HTTPS | The path answers **HTTP 200** within the timeout. Any other code (404, 401, 500, a redirect) marks it down |

- Probes come from **168.63.129.16** (service tag `AzureLoadBalancer`). They must be allowed by the NSGs and by the **firewall of the guest operating system**. The default rule AllowAzureLoadBalancerInBound allows them, unless a custom deny rule with a lower number matches first.
- There is no UDP probe: for a UDP service, probe a TCP or HTTP endpoint of the same instance.
- When **all** instances are down, a Standard load balancer sends no new flows; established TCP flows continue.

Symptoms and causes:

| Symptom | Likely cause |
| --- | --- |
| No instance receives traffic | Probe failing everywhere: wrong port or path, application stopped, NSG or guest firewall blocking 168.63.129.16; or no NSG rule allowing the client traffic (Standard is closed by default) |
| One instance receives nothing | Its probe fails: check the application and firewall on that machine |
| A client isn't always sent to the same instance | Session persistence is None: set Client IP |
| Outbound connections of the backend fail intermittently | **SNAT port exhaustion**: add a **NAT gateway** on the subnet (recommended), or outbound rules with more frontend IP addresses |
| Backend machines have no internet access | Behind an internal load balancer, or with outbound SNAT disabled, there is no outbound path: add a NAT gateway |
| A backend machine can't reach the frontend of its own internal load balancer | The flow can be sent back to the same machine and fail: an expected limitation |

Where to look:

| Tool | Shows |
| --- | --- |
| Metric **Health Probe Status** | The share of successful probes; split by backend IP address to find the failing instance |
| Metric **Data Path Availability** | Whether the Azure path through the frontend to the hosts is healthy (platform side) |
| Metrics **SNAT Connection Count**, **Used / Allocated SNAT Ports** | Failed outbound connections and port consumption |
| **Insights** of the load balancer | Topology and a dashboard of these metrics |
| Resource health | Platform events affecting the load balancer |
| Network Watcher (IP flow verify, Connection troubleshoot) | NSG and path issues toward an instance |

<!-- section: key-points -->
## Key points

- Delegation = NS records at the registrar pointing to the four Azure name servers. A child zone = NS record set in the parent.
- No CNAME at the apex; use an A record or an **alias** record. SPF goes in TXT.
- Private zones: linked virtual networks resolve; one registration zone per network; auto-registration for virtual machines only.
- Load Balancer is layer 4; Standard is closed until an NSG allows; backend pool in one virtual network.
- Default distribution is five-tuple; Client IP gives affinity. HA ports only on internal load balancers.
- Probes come from 168.63.129.16 and HTTP probes need a 200. SNAT exhaustion: NAT gateway.
