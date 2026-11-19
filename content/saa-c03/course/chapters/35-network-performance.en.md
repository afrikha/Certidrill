Network performance questions describe users, sites or VPCs that must reach an application with low latency, high throughput or high availability, and ask which edge service, load balancer, connection or topology to use. Decide in this order: where the users are (internet, on premises, other VPCs), which protocol they speak (HTTP or plain TCP/UDP), then which service carries the traffic with the fewest moving parts.

<!-- section: edge-services | objectives: 3.4.1 -->
## Edge networking: CloudFront and Global Accelerator

Both services bring users onto the AWS global network at the nearest edge location. They solve different problems:

| | Amazon CloudFront | AWS Global Accelerator |
| --- | --- | --- |
| Layer | HTTP and HTTPS (content delivery network) | TCP and UDP (network layer accelerator) |
| Caching | Yes: static and dynamic content cached at edge locations | No caching: every packet goes to the endpoint |
| Entry point | A DNS name (`d111111abcdef8.cloudfront.net` or an alternate domain) | Two static anycast IPv4 addresses (four with dual-stack: two IPv4, two IPv6), or your own range (BYOIP) |
| Origins or endpoints | S3 bucket, ALB, EC2, any HTTP server, origin groups | NLB, ALB, EC2 instances, Elastic IP addresses, in one or several Regions |
| Failover | Origin group: primary then secondary origin | Health checks: traffic moves to healthy endpoints, reacting instantly |
| Typical use | Websites, APIs, video, software downloads | Gaming, VoIP and IoT over UDP, static IPs to allowlist, fast multi-Region failover |

CloudFront features that appear in questions:

- **Origin access control (OAC)** keeps an S3 bucket private: only the distribution can read it, viewers can't bypass CloudFront.
- **Origin groups** fail over to the secondary origin when the primary returns a configured status code (400, 403, 404, 416, 429, 500, 502, 503, 504) or doesn't respond. Failover applies only to `GET`, `HEAD` and `OPTIONS` requests.
- Cache behaviors route path patterns (`/api/*`, `/static/*`) to different origins with different caching rules.
- Code at the edge:

| | CloudFront Functions | Lambda@Edge |
| --- | --- | --- |
| Runtime | JavaScript | Node.js and Python |
| Events | Viewer request and viewer response | Viewer and origin, request and response |
| Duration and scale | Submillisecond, millions of requests per second | Up to 30 seconds, up to 10,000 requests per second per Region |
| Network access, request body | No | Yes |
| Use | Header rewrite, redirects, cache key normalization, JWT validation | Calls to other services, third-party libraries, body inspection |

Global Accelerator features: endpoint groups (one per Region) with a **traffic dial** (percentage of traffic accepted by the group, for blue/green or Region drain) and **endpoint weights** (default 128, maximum 255) inside a group. A custom routing accelerator maps users to specific EC2 destinations in VPC subnets, for example game session servers.

> **Exam trap.** "Static IP addresses" plus "UDP" or "non-HTTP" points to Global Accelerator; "cache" or "reduce load on the origin" points to CloudFront. Global Accelerator doesn't cache, and CloudFront doesn't offer fixed IP addresses for clients to allowlist.

<!-- section: vpc-design | objectives: 3.4.2 -->
## VPC design: subnet tiers, routing and IP addressing

A VPC lives in one Region; a subnet lives in one Availability Zone. IPv4 rules:

- VPC and subnet CIDR blocks are between `/16` and `/28`. Use private ranges (RFC 1918) and plan them so they **never overlap** with other VPCs or on-premises networks you will connect.
- Every subnet loses **5 addresses**: network address, VPC router (+1), DNS (+2), reserved for future use (+3) and the last address. A `/28` has 16 addresses, so 11 usable; a `/24` has 251 usable.
- You can add secondary CIDR blocks to a VPC later; you can't resize an existing subnet. IPv6 blocks are optional, subnets get a `/64`.

Subnet tiers are defined by their route table:

| Tier | Default route (`0.0.0.0/0`) | Holds |
| --- | --- | --- |
| Public | Internet gateway | ALB or NLB nodes, NAT gateways, bastions |
| Private (application) | NAT gateway in the **same AZ** | Application instances, containers, Lambda in a VPC |
| Isolated (data) | None; VPC endpoints for AWS services | Databases, caches |

```text
VPC 10.20.0.0/16 (3 AZs)
  public-a 10.20.0.0/24    public-b 10.20.1.0/24    public-c 10.20.2.0/24
  app-a    10.20.16.0/20   app-b    10.20.32.0/20   app-c    10.20.48.0/20
  data-a   10.20.64.0/24   data-b   10.20.65.0/24   data-c   10.20.66.0/24
```

Routing facts: every route table has a `local` route for the VPC CIDR, and the most specific prefix wins. A subnet without explicit association uses the main route table. For IPv6 outbound-only internet access, use an **egress-only internet gateway** (NAT gateways are for IPv4). Size application subnets generously: containers (awsvpc networking), Lambda functions in a VPC and load balancer nodes all consume IP addresses.

> **Exam tip.** One NAT gateway per AZ, each private subnet routing to the NAT gateway of its own AZ, is the highly available design. A single NAT gateway is cheaper but is a single-AZ dependency and adds cross-AZ data transfer.

<!-- section: load-balancing | objectives: 3.4.3, 3.4.8 -->
## Load balancing concepts and strategy

| | Application Load Balancer | Network Load Balancer | Gateway Load Balancer |
| --- | --- | --- | --- |
| Layer | 7 (HTTP, HTTPS, gRPC, WebSocket) | 4 (TCP, UDP, TLS, TCP_UDP, QUIC) | 3 (all IP packets, GENEVE port 6081 to appliances) |
| Routing | Rules on host, path, headers, query string, method, source IP | Flow hash; a connection stays on one target | 5-tuple flow hash |
| Targets | Instances, IP addresses, Lambda functions | Instances, IP addresses, an ALB | Virtual appliances (instances, IP addresses) |
| Static IP | No (DNS name only) | One static IP per AZ, optional Elastic IP per subnet | Reached through Gateway Load Balancer endpoints |
| Cross-zone load balancing | Always on at load balancer level; can be turned off per target group | Off by default | Off by default |
| Typical use | Web apps, microservices, containers | Extreme performance, non-HTTP, static IPs, PrivateLink endpoint services | Inline firewalls, IDS/IPS, deep packet inspection |

ALB target group settings:

- Routing algorithm: **round robin** (default), **least outstanding requests** (uneven request cost or target capacity) or **weighted random**, the only one that supports Automatic Target Weights anomaly mitigation (it shifts traffic away from targets returning errors).
- **Sticky sessions**: duration-based (`AWSALB` cookie) or application-based (your own cookie). Better design: keep sessions in ElastiCache or DynamoDB so any target can serve any request.
- **Slow start** ramps traffic linearly to new targets (round robin only). **Deregistration delay** (default 300 seconds) lets in-flight requests finish.

Choosing the strategy:

| Requirement | Answer |
| --- | --- |
| Route `/api` and `/images` to different services, or several domains on one listener | ALB with path- or host-based rules |
| Millions of requests per second, TCP or UDP, preserve client IP | NLB |
| Clients must allowlist fixed IPs for an HTTP application | NLB with Elastic IPs and an ALB as its target, or Global Accelerator in front of the ALB |
| Inspect all traffic with third-party appliances, transparently | GWLB with Gateway Load Balancer endpoints as route table next hop |
| Expose a service privately to other VPCs or accounts | NLB behind a PrivateLink endpoint service |
| Spread traffic across Regions | Route 53 routing policies or Global Accelerator (a load balancer is Regional) |

> **Exam trap.** Uneven load across AZs on an NLB usually means cross-zone load balancing is off (its default). Turning it on spreads traffic across all registered targets, at the cost of inter-AZ data transfer.

<!-- section: connection-options | objectives: 3.4.4 -->
## Network connection options

| Option | Path | Bandwidth | Setup | Use |
| --- | --- | --- | --- | --- |
| AWS Site-to-Site VPN | IPsec over the internet, two tunnels per connection | Up to 1.25 Gbps per standard tunnel, up to 5 Gbps per large bandwidth tunnel | Minutes; needs a customer gateway device | Quick, encrypted hybrid link; backup for Direct Connect |
| AWS Direct Connect, dedicated | Private fiber from a Direct Connect location | 1, 10, 100 or 400 Gbps | Physical cross-connect; longest lead time | Consistent latency, high throughput, lower data transfer out rates |
| AWS Direct Connect, hosted | Through a Direct Connect Partner | 50 Mbps to 25 Gbps | Ordered from the partner | Smaller or intermediate capacities |
| AWS Client VPN | TLS from user devices | Per user | Managed endpoint | Remote employees reaching VPCs |
| AWS PrivateLink | Interface endpoint (private IPs) in the consumer VPC | Within AWS | Provider exposes an endpoint service behind an NLB | Private access to AWS services, SaaS or a service in another VPC |

Details the exam relies on:

- **Accelerated Site-to-Site VPN** sends the tunnels through the nearest edge location using Global Accelerator; it requires a **transit gateway** (not a virtual private gateway) and can't be toggled on an existing connection.
- Direct Connect isn't encrypted by IPsec. For encryption in transit, use **MACsec** (dedicated 10, 100 and 400 Gbps connections at selected locations; not hosted connections) or run a Site-to-Site VPN over the Direct Connect connection.
- Virtual interfaces: **private VIF** (one VPC through a virtual private gateway, or many through a Direct Connect gateway), **transit VIF** (transit gateways through a Direct Connect gateway), **public VIF** (AWS public endpoints such as S3).
- Resilience: two connections at two Direct Connect locations for maximum resiliency; a Site-to-Site VPN as a lower-cost backup.
- PrivateLink is one-way (the consumer initiates connections), crosses accounts, and works even when the VPC CIDRs overlap, because no routing between the VPCs is involved. Gateway endpoints (S3 and DynamoDB only) are route table entries, not PrivateLink.

> **Exam trap.** "Encrypted connection within days" is Site-to-Site VPN; "consistent performance, dedicated bandwidth" is Direct Connect, and Direct Connect alone doesn't meet an "encrypted" requirement.

<!-- section: topologies | objectives: 3.4.5, 3.4.6 -->
## Network topologies and growth

| Topology | Design |
| --- | --- |
| Multi-tier | Public subnets (load balancer), private subnets (application), isolated subnets (database), in at least two AZs; security groups referencing each other between tiers |
| Few VPCs, simple | VPC peering: no overlapping CIDRs, not transitive, no edge-to-edge routing (a peer can't use your internet gateway, NAT gateway, VPN or gateway endpoint), works across Regions and accounts |
| Many VPCs and on premises (hub and spoke) | AWS Transit Gateway: Regional router with VPC, VPN, Direct Connect gateway and peering attachments; route tables isolate segments (prod, dev, shared services) |
| Multi-Region | Transit gateway peering between Regions (static routes), plus Route 53 or Global Accelerator for users |
| Hybrid | Direct Connect gateway with transit VIF to transit gateways, Site-to-Site VPN as backup |
| Many accounts, one network team | Shared VPC: subnets shared through AWS RAM; participants launch resources in them |
| Central inspection | Inspection VPC with AWS Network Firewall or a GWLB, transit gateway with **appliance mode** to keep flows symmetric |

Designing for future needs:

- A full mesh of n VPCs needs n(n-1)/2 peering connections: 10 VPCs need 45. A transit gateway needs one attachment per VPC.
- Allocate non-overlapping CIDRs centrally (Amazon VPC IP Address Manager) before creating accounts and VPCs; overlapping ranges block peering and transit gateway routing.
- Leave room: large VPC ranges, spare subnets, secondary CIDR blocks when a VPC runs out of addresses, IPv6 for very large fleets.
- Prefer managed, elastic components (NAT gateway, transit gateway, load balancers, VPC endpoints) over self-managed instances, which become bottlenecks.

> **Exam tip.** "Dozens of VPCs that must all communicate, plus on-premises access, with the least operational overhead" is a transit gateway. "Two VPCs, lowest cost" is peering: peering has no hourly charge.

<!-- section: resource-placement | objectives: 3.4.7 -->
## Placing resources to meet business requirements

| Requirement | Placement |
| --- | --- |
| Data must stay in a country, or users are concentrated in one geography | The Region that meets residency and is closest to users |
| Survive a data center failure | Multiple AZs in a Region |
| Low latency for users in a metro area far from a Region | AWS Local Zones (compute and storage near large population centers, attached to a parent Region) |
| Ultra-low latency to 5G mobile devices | AWS Wavelength Zones in the telecom provider's network |
| Workload must run on premises (local processing, data residency) with AWS APIs | AWS Outposts |
| Lowest latency and highest throughput between instances (HPC, tightly coupled) | Cluster placement group (one AZ; up to 10 Gbps per flow inside the group) |
| Large distributed systems (HDFS, Cassandra, Kafka) isolated by rack | Partition placement group (up to 7 partitions per AZ) |
| A few critical instances that must not share hardware | Spread placement group (up to 7 running instances per AZ per group) |

Region choice also depends on service and feature availability and on price, which varies by Region. On instances, enhanced networking (ENA) is required for high bandwidth, and Elastic Fabric Adapter (EFA) adds OS-bypass networking for HPC and machine learning.

> **Exam trap.** A cluster placement group can't span AZs: it gives performance, not availability. For "highest availability" pick a spread placement group or multiple AZs.

<!-- section: key-points -->
## Key points

- CloudFront: HTTP, caching, OAC, origin groups. Global Accelerator: TCP/UDP, two static anycast IPs, instant failover, no caching.
- Subnet tiers are defined by route tables; 5 reserved addresses per subnet; CIDRs `/16` to `/28`, never overlapping.
- ALB = layer 7 rules; NLB = layer 4, static IPs, PrivateLink; GWLB = appliances. NLB cross-zone is off by default.
- VPN: two tunnels, minutes, encrypted. Direct Connect: dedicated bandwidth, not IPsec-encrypted; MACsec or VPN over it for encryption. Accelerated VPN needs a transit gateway.
- Peering is non-transitive; transit gateway is the hub for many VPCs and hybrid links.
- Placement: Region for residency and latency, AZs for availability, Local Zones, Wavelength, Outposts for edge cases; cluster, partition or spread placement groups.
