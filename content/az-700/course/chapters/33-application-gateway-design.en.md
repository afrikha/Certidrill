Azure Application Gateway is a regional layer 7 load balancer: it terminates client connections, reads HTTP requests and opens its own connections to the backends. Design questions ask whether Application Gateway fits the requirement, which SKU and scaling mode to choose, how to size its subnet, what to put in a backend pool and why a backend shows as unhealthy.

<!-- section: appgw-capabilities | objectives: 3.2.1 -->
## Features, SKUs and capabilities

Map the requirement to the feature:

| Requirement | Application Gateway feature |
| --- | --- |
| Send `/images/*` and `/video/*` to different server pools | URL path-based routing (path-based rule) |
| Host `contoso.com` and `fabrikam.com` on one public IP address and port | Multi-site listeners (host names, wildcards) |
| Redirect HTTP to HTTPS, or one site to another | Redirection on a routing rule |
| Offload TLS from the web servers | HTTPS listener with a certificate (TLS termination) |
| Encrypt traffic up to the backend too | End-to-end TLS: HTTPS backend settings |
| Authenticate clients by certificate | Mutual TLS through an SSL profile |
| Store certificates centrally with automatic renewal | Key Vault integration |
| Keep a user on the server that holds the session | Cookie-based affinity |
| Add security headers, hide server headers, change the URL | Rewrite rule sets |
| Block OWASP attacks and bots | WAF_v2 SKU with a WAF policy |
| Survive a zone failure with a stable address | Zone redundancy (default) and static VIP |
| Remove backends gracefully during updates | Connection draining |
| Branded error pages for 502 or 403 | Custom error pages |
| Ingress for AKS | Application Gateway Ingress Controller (AGIC) |
| Reach the gateway privately from other virtual networks or tenants | Private Link |
| Proxy non-HTTP TCP or TLS traffic on the same gateway | TCP/TLS proxy (layer 4) listeners |

WebSocket is always on; HTTP/2 is supported from clients to the gateway (backend connections use HTTP/1.1).

SKUs: the v1 SKUs (Standard, WAF) **retired on April 28, 2026**. The v2 family:

| | Basic (preview) | Standard_v2 | WAF_v2 |
| --- | --- | --- | --- |
| Purpose | Low traffic, lower SLA | Production web traffic | Standard_v2 plus Web Application Firewall |
| Scaling | Automatic, up to about 200 connections per second | Autoscale or manual, up to 125 instances | Same as Standard_v2 |
| URL rewrite, mTLS, Private Link, private-only, TCP/TLS proxy, AGIC | No | Yes | Yes |
| Listeners, pools, rules | 5 each | 100 listeners, 100 pools, 400 rules | Same |

Learn gives an SLA of 99.9% for Basic and 99.95% for Standard_v2. Every v2 gateway has a static VIP, Key Vault integration, header rewrite and zone redundancy where the region has zones.

Limits per gateway: up to 4 frontend IP addresses (one public and one private per IP version), 100 frontend ports, 100 backend pools with 1,200 targets each, 100 backend HTTP settings, 200 listeners (100 active), 5 host names per listener, 100 path rules per URL map, 400 rewrite rule sets, 100 SSL certificates.

> **Exam trap.** A requirement for a WAF on a regional web app points to WAF_v2 (or Front Door for a global entry point). Standard_v2 can't host a WAF policy; Load Balancer never can.

<!-- section: appgw-use-cases | objectives: 3.2.2 -->
## Use cases and deployment requirements

Choose Application Gateway for HTTP(S) applications in **one region** that need layer 7 decisions: path or host routing, TLS offload or re-encryption, WAF, affinity, rewrites. It reaches backends in its own virtual network, peered networks, on-premises (VPN, ExpressRoute) and public endpoints such as App Service.

| Requirement | Better answer |
| --- | --- |
| Non-HTTP TCP or UDP with the lowest latency | Load Balancer |
| Global HTTP entry point, edge caching, failover between regions | Front Door, optionally in front of Application Gateway |
| DNS-based steering across regions and on-premises | Traffic Manager, with one Application Gateway per region |
| More than 125 instances of capacity | Several gateways behind Traffic Manager or Front Door |

Infrastructure rules:

- A **dedicated subnet**: only application gateways in it (several are allowed), v1 and v2 can't share it, and `GatewaySubnet` can't be used.
- Size: one address per instance, one more for a private frontend IP, plus the 5 addresses Azure reserves. v2 supports 125 instances: **/24 recommended**. Example: a maximum of 27 instances with a private frontend needs 33 addresses.
- Frontend: public and private, public only, or private only (private deployment). The public IP address is a Standard static address whose zones include the gateway's zones; a v2 private frontend needs a **static** address chosen in the subnet.
- NSG on the subnet (standard deployments): allow clients to the listener ports, allow `GatewayManager` on TCP **65200-65535** (v2), keep the `AzureLoadBalancer` inbound rule and outbound internet access.
- User-defined routes: allowed to send 0.0.0.0/0 to the internet or to stop gateway route propagation; forced tunneling of 0.0.0.0/0 through an NVA or on-premises isn't supported for v2 standard deployments.
- Custom DNS servers on the virtual network must resolve public names; restart (stop and start) the gateway after changing them.
- The deploying identity needs `Microsoft.Network/virtualNetworks/subnets/join/action` (Network Contributor has it).

**Private Application Gateway deployment** (feature `EnableApplicationGatewayNetworkIsolation`, generally available) removes the public IP requirement and the `GatewayManager` and outbound internet rules, allows a Deny All outbound NSG rule and a 0.0.0.0/0 route to an NVA.

> **Exam trap.** A gateway whose subnet receives 0.0.0.0/0 from an ExpressRoute or VPN gateway (or a UDR to a firewall) loses management traffic and backend health. Fix it with a route table that disables gateway route propagation or sends 0.0.0.0/0 to the internet, or use a private deployment.

<!-- section: appgw-scaling | objectives: 3.2.3 -->
## Manual scaling or autoscaling

| | Autoscale | Manual (fixed capacity) |
| --- | --- | --- |
| Setting | Minimum instance count (0 to 100) and optional maximum (up to 125, default 10) | Instance count, 1 to 125 |
| Behavior | Scales out and in with traffic | Never changes; excess traffic can be lost |
| Fits | Variable traffic; recommended to limit the impact of a zone failure | Steady, predictable load |

Sizing facts:

- Each instance handles at least **10 capacity units**. A capacity unit is the highest of 1 compute unit, 2,500 persistent connections or 2.22 Mbps of throughput. A Standard_v2 compute unit handles about 50 TLS connections per second (RSA 2048-bit key).
- Price = fixed hourly cost (charged even with 0 minimum instances) + capacity units. The minimum instance count **reserves** 10 capacity units per instance, billed whatever the traffic.
- Scale-out takes **3 to 5 minutes**: set the minimum to absorb sudden bursts (for example 25 to 30 instances when the peak needs 50). On scale-in, an instance drains connections for 5 minutes.
- The gateway stays highly available even with a minimum of 0.
- The subnet must hold the maximum instance count.
- Basic SKU has no scaling settings.

```bash
az network application-gateway create --resource-group RG-Web --name agw-web \
  --sku Standard_v2 --min-capacity 2 --max-capacity 20 --zones 1 2 3 \
  --vnet-name vnet-web --subnet snet-agw --public-ip-address pip-agw \
  --frontend-port 80 --http-settings-port 80 --http-settings-protocol Http \
  --servers 10.20.1.4 10.20.1.5 --priority 100
```

> **Exam tip.** "Traffic doubles every Monday morning at 8 AM and requests fail for a few minutes" points to raising the minimum instance count, not the maximum: new instances need minutes to come online.

<!-- section: appgw-backend-pools | objectives: 3.2.4 -->
## Backend pools

A backend pool can contain:

| Member type | Notes |
| --- | --- |
| Virtual machines | Selected by their NIC |
| Virtual machine scale sets | Upgrade the scale set instances after adding the pool, or they stay unhealthy |
| Private IP addresses | In the gateway's virtual network, peered virtual networks, or networks connected by VPN or ExpressRoute |
| Public IP addresses | Any reachable endpoint |
| FQDNs | Resolved by the DNS servers of the virtual network; App Service, Container Apps and other multitenant services |

Members aren't tied to an availability set or a virtual network: any target with IP connectivity works. A pool holds up to 1,200 targets. Create one pool per application or path family, and a default pool for a path-based rule.

```bash
az network application-gateway address-pool create --resource-group RG-Web \
  --gateway-name agw-web --name pool-api --servers 10.20.2.4 10.20.2.5
az network application-gateway address-pool create --resource-group RG-Web \
  --gateway-name agw-web --name pool-app --servers contoso-app.azurewebsites.net
```

For App Service and other multitenant backends, the backend settings must send the host name the service expects: **Pick host name from backend target** or a host name override (next chapter).

> **Exam trap.** The NSG of the backend subnet must allow traffic from the Application Gateway subnet (the source of requests and probes for private backends). A backend on the internet sees the gateway's public frontend IP address as the source.

<!-- section: appgw-probes | objectives: 3.2.5 -->
## Health probes

Without a custom probe, the **default probe** is used:

| Property | Default probe |
| --- | --- |
| URL | `<protocol>://127.0.0.1:<port>/`, protocol and port from the backend settings |
| Interval | 30 seconds |
| Timeout | 30 seconds |
| Unhealthy threshold | 3 consecutive failures |
| Healthy response | HTTP status 200 to 399 |

A **custom probe** sets protocol, host (host header and, on v2, SNI), path starting with `/`, port (v2 only), interval, timeout, unhealthy threshold, **Pick host name from backend settings**, and match conditions: accepted status codes or ranges and a string in the response body. `MinServers` (CLI, PowerShell, ARM only) forces a number of servers to stay healthy and can send traffic to failed servers.

How probing works:

- Probes start when a rule associates a listener, a backend pool and backend settings. A custom probe is used only through backend settings attached to a rule.
- One probe runs for each combination of backend server and backend settings, from every gateway instance independently.
- A server is unhealthy until its first successful probe; when every server is unhealthy, clients get **502 Bad Gateway**.
- The **Backend health** page shows the status and the reason per server.

```bash
az network application-gateway probe create --resource-group RG-Web --gateway-name agw-web \
  --name probe-api --protocol Https --path /healthz --interval 30 --timeout 30 --threshold 3 \
  --host-name-from-http-settings true --match-status-codes 200-399 401
```

Common fixes:

| Symptom | Fix |
| --- | --- |
| Backend requires authentication and answers 401 or 403 to the probe | Custom probe that accepts 401 or 403 |
| Application health page is `/healthz`, not `/` | Custom probe with that path |
| Server with a wildcard certificate serving several host names | Custom probe with a specific host name for SNI |
| App Service backend unhealthy with the default probe (host 127.0.0.1) | Pick host name from backend settings, with the backend settings picking the host name from the target |

> **Exam trap.** A probe that's too slow to fail sends traffic to a dead server for a while: time to detection is about the interval multiplied by the unhealthy threshold. Lowering the interval or the threshold detects failures sooner.

<!-- section: key-points -->
## Key points

- Application Gateway is regional layer 7; Front Door and Traffic Manager handle multi-region.
- v1 retired April 28, 2026: Standard_v2 or WAF_v2 (Basic in preview).
- Dedicated subnet, /24 recommended, static private frontend IP on v2, `GatewayManager` 65200-65535 in the NSG for standard deployments.
- Autoscale: minimum 0 to 100 reserves capacity, maximum up to 125; scale-out takes minutes.
- Backend pools take NICs, scale sets, IP addresses and FQDNs, inside or outside Azure.
- Default probe: 127.0.0.1, 30 s, 3 failures, 200 to 399; custom probes fix host, path and status codes.
