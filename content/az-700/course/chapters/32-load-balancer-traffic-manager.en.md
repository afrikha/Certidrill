This chapter builds what the previous one designed: a Standard load balancer with its probe and rules, inbound NAT and outbound rules with their SNAT arithmetic, a Gateway Load Balancer chain, and a Traffic Manager profile. Exam items show a rule or a profile and ask what happens, or which setting to change.

<!-- section: lb-create | objectives: 3.1.6 -->
## Creating and configuring a load balancer

Order of operations for a public load balancer:

1. Create a **Standard** public IP address (zone-redundant unless a zone is required).
2. Create the load balancer with a frontend IP configuration and a backend pool.
3. Create a health probe.
4. Create the load-balancing rule that links frontend, backend pool and probe.
5. Allow the client traffic with an NSG on the backend subnet or NICs.
6. Add the VM NICs (or IP addresses) to the backend pool.
7. Give the backends explicit outbound access: NAT gateway on the subnet, or an outbound rule.

```bash
az network public-ip create --resource-group RG1 --name pip-web --sku Standard --zone 1 2 3
az network lb create --resource-group RG1 --name lb-web --sku Standard \
  --public-ip-address pip-web --frontend-ip-name fe-web --backend-pool-name pool-web
az network lb probe create --resource-group RG1 --lb-name lb-web --name probe-http \
  --protocol Http --port 80 --path /health
az network lb rule create --resource-group RG1 --lb-name lb-web --name rule-http \
  --protocol Tcp --frontend-port 80 --backend-port 80 --frontend-ip-name fe-web \
  --backend-pool-name pool-web --probe-name probe-http \
  --disable-outbound-snat true --idle-timeout 15 --enable-tcp-reset true
az network nic ip-config address-pool add --resource-group RG1 --nic-name vm1-nic \
  --ip-config-name ipconfig1 --lb-name lb-web --address-pool pool-web
```

Backend pools are configured by NIC or by IP address:

| | NIC-based | IP-based |
| --- | --- | --- |
| Members | IP configurations of VM or scale set NICs | IP addresses plus the virtual network ID; can be prepopulated before the VMs exist |
| Restrictions | One public and one internal NIC-based load balancer per availability set | Same virtual network; VMs and scale sets only; can't be a Private Link service; inbound NAT rules can't target an IP address; default outbound access stays enabled |

Both kinds can exist on one load balancer, but not mixed in the same pool.

Health probes:

| Setting | Values |
| --- | --- |
| Protocol | TCP (handshake succeeds), HTTP or HTTPS (only a **200** response is healthy; HTTPS needs a SHA256 certificate chain and doesn't do client certificate authentication) |
| Interval | Default 5 seconds in the portal, 15 seconds through ARM, CLI and PowerShell; minimum 5 |
| Threshold | Consecutive successes or failures to change state; for HTTP, an explicit response changes the state at once |
| HTTP/HTTPS timeout | 30 seconds |
| Source | `168.63.129.16` (IPv4), service tag `AzureLoadBalancer` |

When one instance fails its probe, established TCP flows to it continue and its UDP flows move. When all instances fail, Standard sends no new flows but lets established TCP flows continue, provided the pool has more than one instance. A stopped VM isn't probed. HTTP probes can't use ports 19, 21, 25, 70, 110, 119, 143, 220 and 993.

> **Exam trap.** A custom NSG rule that denies `AzureLoadBalancer` (or a guest firewall that drops `168.63.129.16`) marks every instance down. To take one instance out on purpose, set its admin state to Down rather than blocking the probe.

<!-- section: lb-rules | objectives: 3.1.9 -->
## Load-balancing rules

| Setting | Notes |
| --- | --- |
| Frontend IP, protocol (`Tcp`, `Udp`, `All`), frontend port | Where and how clients connect |
| Backend pool, backend port | Traffic goes to every healthy member |
| Health probe | Selects the healthy instances; the portal requires one, and admin state works only on probed rules |
| Session persistence | None, Client IP, Client IP and protocol |
| Idle timeout | 4 to 100 minutes for load-balancing and inbound NAT rules, default 4; not used for UDP |
| TCP reset | Sends RST to both ends at idle timeout instead of a silent drop |
| Floating IP | Delivers packets with the frontend IP still as destination; can't be changed after creation |
| Outbound SNAT | Use the frontend for outbound SNAT, or disable it (recommended, use an outbound rule) |

**HA ports**: protocol `All`, frontend and backend port `0`, internal load balancer only. One rule load balances every TCP and UDP flow (and ICMP) to the NVAs; per-flow symmetry is kept for a single internal load balancer and pool. An HA ports rule can't coexist with another rule on the same backend IP configurations unless both use floating IP.

```bash
az network lb rule create --resource-group RG-Hub --lb-name lb-nva --name rule-ha \
  --protocol All --frontend-port 0 --backend-port 0 --frontend-ip-name fe-nva \
  --backend-pool-name pool-nva --probe-name probe-nva
```

**Floating IP** is needed when two rules (two frontends) target the same backend port, for example several SQL Server Always On listeners. Without it, the VM can't tell which frontend a packet came for. With it, configure each VM's guest OS: a loopback interface carrying the frontend IP address, the weak host model on Windows, and a host firewall rule for the port.

The idle timeout set on the frontend IP address takes precedence over a different value on a load-balancing or inbound NAT rule that references it.

> **Exam trap.** Client IP persistence keeps clients on one instance but skews distribution: all users behind one proxy or SNAT device reach the same VM. Adding or removing a pool member recomputes the hash, so affinity isn't guaranteed across scaling.

<!-- section: inbound-nat | objectives: 3.1.10 -->
## Inbound NAT rules

An inbound NAT rule forwards one frontend port to one backend instance. It needs no health probe and doesn't support admin state.

| Type | Behavior | Use |
| --- | --- | --- |
| V1, single VM | 1:1 mapping, frontend port to one NIC IP configuration | SSH or RDP to one VM |
| V2, backend pool | **Frontend port range start** and **Maximum number of machines in the backend pool** preallocate a port range; mappings are created and kept automatically as the pool scales | Port per instance for scale sets and VM groups (recommended) |
| Inbound NAT pools (V1 for scale sets) | Retiring September 30, 2027; no new pools can be created since November 15, 2026 | Migrate to V2 |

```bash
# V1: frontend port 50001 to port 3389 of one VM
az network lb inbound-nat-rule create --resource-group RG1 --lb-name lb-web \
  --name nat-vm1-rdp --protocol Tcp --frontend-ip-name fe-web \
  --frontend-port 50001 --backend-port 3389
az network nic ip-config inbound-nat-rule add --resource-group RG1 --nic-name vm1-nic \
  --ip-config-name ipconfig1 --lb-name lb-web --inbound-nat-rule nat-vm1-rdp

# V2: ports 50000-50099 mapped to port 22 of each pool member
az network lb inbound-nat-rule create --resource-group RG1 --lb-name lb-web \
  --name nat-pool-ssh --protocol Tcp --frontend-ip-name fe-web --backend-pool-name pool-web \
  --frontend-port-range-start 50000 --frontend-port-range-end 50099 --backend-port 22
```

Each port used by a load-balancing or inbound NAT rule consumes a block of eight SNAT ports on that frontend IP. If a V2 range is too small, the scale-out is blocked for the new instances. The NSG must still allow the backend port (3389, 22). For administrative access without exposing ports, Azure Bastion is the usual alternative.

<!-- section: outbound-snat | objectives: 3.1.11 -->
## Outbound rules and SNAT

When several methods apply, Azure uses the first in this order:

| Priority | Method | Production use |
| --- | --- | --- |
| 1 | NAT gateway on the subnet | Best: dynamic SNAT, scales |
| 2 | Instance-level public IP address on the NIC | Yes; no SNAT, all ports for that VM |
| 3 | Load balancer frontend through **outbound rules** | Yes, but not at scale |
| 4 | Load balancer frontend without outbound rules (implicit, default allocation) | No |
| 5 | Default outbound access | No; new virtual networks use private subnets by default since March 31, 2026 |

Outbound rules apply only to a **public** Standard load balancer and only to VMs without an instance-level public IP address. An internal load balancer gives no outbound access.

SNAT arithmetic:

- Each frontend public IP address provides **64,000** SNAT ports. A prefix provides 64,000 per address.
- Ports are allocated in **multiples of 8**; a request for more ports than the frontends hold is rejected.
- Manual allocation by ports per instance: number of frontend IPs × 64,000 ÷ number of backend instances. Example: 2 IPs and 50 VMs give at most 2,560 ports per VM.
- Setting allocated ports to 0 returns to the default table: 1,024 ports per VM up to 50 instances, 512 up to 100, 256 up to 200, 128 up to 400, 64 up to 800, 32 up to 1,000.
- TCP reuses a SNAT port for different destination IP or port; UDP uses one port per destination IP.

Outbound rule parameters: frontend IP configurations, backend pool, protocol (`All`, `Tcp`, `Udp`), allocated outbound ports, idle timeout 4 to 120 minutes (default 4), TCP reset.

```bash
az network lb outbound-rule create --resource-group RG1 --lb-name lb-web \
  --name out-all --frontend-ip-configs fe-out --address-pool pool-web \
  --protocol All --outbound-ports 10000 --idle-timeout 15 --enable-tcp-reset true
```

Rules to remember:

- To use a frontend IP that also serves inbound rules, set `disableOutboundSnat` on those load-balancing rules first; otherwise the outbound rule fails.
- With `disableOutboundSnat` and no outbound rule, the backends lose outbound connectivity.
- Outbound rules apply to the primary IPv4 configuration of a NIC (secondary configurations: IPv6 only), carry no ICMP, and require all VMs of the availability set or scale set to be in the pool.
- A NAT gateway on the subnet overrides outbound rules.

> **Exam trap.** Intermittent failures of new outbound connections under load mean SNAT exhaustion. Fix it with a NAT gateway, more frontend IP addresses or a larger manual allocation, connection reuse in the app, or Private Link for Azure PaaS destinations.

<!-- section: gateway-lb | objectives: 3.1.8 -->
## Gateway Load Balancer

Gateway Load Balancer (SKU `Gateway`) inserts third-party appliances (firewall, IDS/IPS, packet analytics, DDoS) in the path of a public endpoint without user-defined routes.

| Component | Rule |
| --- | --- |
| Frontend | Private IP address only |
| Rule | HA ports only (`All`, port 0); up to two backend pools per rule |
| Backend pool | NVA instances, with up to two **tunnel interfaces**: internal (default port 10800, identifier 800) and external (10801, 801), protocol VXLAN |
| Chain | A Standard public load balancer frontend, or the Standard public IP configuration of a VM NIC, references the Gateway frontend; up to 100 resources per Gateway frontend |

Traffic to and from the consumer is encapsulated in VXLAN, sent through the appliances, then delivered with the source IP preserved; flow stickiness keeps both directions on the same appliance. For outbound inspection, chain the Gateway Load Balancer to the frontends used by the outbound rules. NVA MTU must be at least 1,550 bytes.

```bash
az network lb create --resource-group RG-Sec --name gwlb-nva --sku Gateway \
  --vnet-name vnet-sec --subnet snet-nva --frontend-ip-name fe-gw --backend-pool-name pool-nva
az network lb address-pool tunnel-interface add --resource-group RG-Sec --lb-name gwlb-nva \
  --address-pool pool-nva --type External --protocol VXLAN --identifier 901 --port 10801
feid=$(az network lb frontend-ip show --resource-group RG-Sec --lb-name gwlb-nva \
  --name fe-gw --query id --output tsv)
az network lb frontend-ip update --resource-group RG-Web --lb-name lb-web \
  --name fe-web --public-ip-address pip-web --gateway-lb $feid
```

Consumer and provider can be in different subscriptions or tenants. Cross-tenant chaining needs `Microsoft.Network/loadBalancers/frontendIPConfigurations/join/action` and guest access to the provider subscription, and isn't available in the portal. Gateway Load Balancer doesn't work with the Global tier.

> **Exam trap.** A Gateway Load Balancer frontend can't be the next hop of a user-defined route. NVAs placed between a public and an internal load balancer get no flow symmetry: that requirement points to Gateway Load Balancer.

<!-- section: traffic-manager | objectives: 3.1.7 -->
## Azure Traffic Manager

Traffic Manager is a **DNS-based** global service: it answers DNS queries for `<name>.trafficmanager.net` with the endpoint chosen by the routing method and endpoint health. Clients then connect **directly** to the endpoint; Traffic Manager isn't a proxy, sees no traffic, can't do sticky sessions and works for any protocol.

| Routing method | Returns | Use |
| --- | --- | --- |
| Priority | The available endpoint with the lowest priority value (1 to 1000) | Active-passive failover |
| Weighted | An endpoint chosen randomly by weight (1 to 1000, default 1) | Gradual rollout, migration, cloud bursting |
| Performance | The endpoint in the region with the lowest latency from the DNS resolver | Global users, closest region |
| Geographic | The endpoint mapped to the query's region (World, regional grouping, country/region, state/province) | Data sovereignty, localized content |
| Multivalue | All healthy endpoints, up to the maximum return count (max 10); IPv4/IPv6 external endpoints only | Client-side retries |
| Subnet | The endpoint mapped to the source IP range | Corporate users or an ISP to a specific endpoint |

Rules per method: a region can map to only one endpoint in a Geographic profile, and an unmapped region gets NODATA (map **World** to a nested endpoint as fallback). In Subnet routing an endpoint without ranges is the fallback. External and nested endpoints need a location for Performance routing.

Endpoints are **Azure** (App Service Standard tier or higher, one Web App per region per profile; public IP addresses with a DNS name), **External** (FQDN or IPv4/IPv6 address, on-premises or other clouds) or **Nested** (a child profile). Nesting combines methods, for example Performance at the parent and Weighted inside one region. **MinChildEndpoints** (default 1) sets how many healthy child endpoints keep the child available.

Monitoring settings, shared by all endpoints of a profile:

| Setting | Values |
| --- | --- |
| Protocol, port, path | HTTP, HTTPS (certificate presence only, not validity) or TCP; path required for HTTP/HTTPS |
| Expected status codes | Default 200; up to eight ranges such as `200-299` |
| Probing interval | 30 seconds (default) or 10 seconds (fast, extra cost) |
| Tolerated failures | 0 to 9, default 3 |
| Probe timeout | 5 to 10 seconds (default 10) at 30-second interval; 5 to 9 (default 9) at 10 seconds |
| DNS TTL | 0 to 2,147,483,647 seconds per profile |

```bash
az network traffic-manager profile create --resource-group RG-Global --name tm-contoso \
  --routing-method Priority --unique-dns-name contoso-app --ttl 30 \
  --protocol HTTPS --port 443 --path /health
az network traffic-manager endpoint create --resource-group RG-Global --profile-name tm-contoso \
  --name ep-weu --type azureEndpoints --target-resource-id $webAppWeuId --priority 1
az network traffic-manager endpoint create --resource-group RG-Global --profile-name tm-contoso \
  --name ep-onprem --type externalEndpoints --target app.fabrikam.com --priority 2
```

A disabled endpoint isn't probed nor returned; a disabled profile, or one with all endpoints disabled, returns NXDOMAIN. If all endpoints are Degraded, Traffic Manager returns them all. Map a custom name with a CNAME to the profile; for the zone apex, use an Azure DNS Traffic Manager Linked Record (recommended for new configurations) or an alias record (still supported for backward compatibility). Limits: 200 profiles per subscription, 200 endpoints per profile.

> **Exam trap.** After a failure, clients keep using the cached answer until the TTL expires: lower the TTL and probing interval for faster failover. Traffic Manager also routes on the resolver's IP address (or EDNS Client Subnet), not necessarily the user's.

<!-- section: key-points -->
## Key points

- Build order: Standard public IP, load balancer, probe, rule, NSG, backend members, explicit outbound.
- Probes come from `168.63.129.16` (`AzureLoadBalancer`); HTTP probes need a 200.
- HA ports: `All`/0, internal only; floating IP to reuse a backend port.
- Inbound NAT V2 targets a pool with a frontend port range; NAT pools retire in 2027.
- SNAT: 64,000 ports per IP, multiples of 8; NAT gateway first, then instance public IP, then outbound rules.
- Gateway Load Balancer: chain from a public frontend, VXLAN tunnels, no UDR.
- Traffic Manager: DNS only, six routing methods, TTL drives failover time.
