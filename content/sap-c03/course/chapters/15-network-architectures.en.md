Network design questions at the professional level start from an estate, not a single VPC: dozens or hundreds of accounts, several Regions, on-premises sites, overlapping address ranges inherited from acquisitions, a central security team and a requirement to inspect or log traffic. The answer is usually the construct that meets the stated scale and isolation with the fewest components to operate, so compare options on transitivity, overlapping CIDR support, direction of access, scale and who operates what.

<!-- section: multi-vpc-connectivity | objectives: 1.4.1 -->
## Multi-VPC and multi-account connectivity

| Construct | Model | Strengths | Limits |
| --- | --- | --- | --- |
| VPC peering | One-to-one, same or different account and Region | No hourly charge, no bandwidth bottleneck, security group references across same-Region peers | Not transitive, no overlapping CIDRs, mesh grows as n(n-1)/2 |
| AWS Transit Gateway | Regional hub, VPC and hybrid attachments, route tables per segment | Transitive routing, up to 100 Gbps per VPC attachment per AZ, 5,000 attachments by default, inter-Region peering | Static routes on peering, one route table design per Region to operate |
| AWS Cloud WAN | Global core network built from one declarative JSON policy | Segments (global isolated routing domains), automatic full mesh between core network edges, tag-based attachment policies, network function groups for inspection | Fewer manual knobs; pay for edges and attachments |
| AWS PrivateLink | Consumer interface endpoint to a provider endpoint service behind an NLB | One-way access to one service, overlapping CIDRs allowed, cross-account, cross-Region access when the provider adds supported Regions | Service-level only, not network-level routing |
| Amazon VPC Lattice | Service network associating VPCs and services (instances, IPs, Lambda, ALB, ECS tasks, Kubernetes pods) | Application-layer routing, IAM auth policies per service or network, overlapping CIDRs, no inter-AZ data transfer charges, resource configurations for TCP resources such as RDS | Not a general routing fabric |
| Shared VPC (AWS RAM) | Subnets owned by a network account, shared with participant accounts | One VPC to operate, participants launch resources in shared subnets | Participants can't change routes, NACLs or subnets |

Choosing:

| Requirement | Answer |
| --- | --- |
| Two or three VPCs, lowest cost, no transitive need | VPC peering |
| Hundreds of VPCs in one Region plus Direct Connect and VPN | Transit Gateway with separate route tables for production, non-production and shared services |
| Many Regions, consistent segmentation, central policy with rollback | Cloud WAN |
| SaaS provider exposes one API to thousands of customer VPCs with overlapping CIDRs | PrivateLink endpoint service (NLB), consumers create interface endpoints |
| Microservices owned by many accounts call each other over HTTP with IAM authorization | VPC Lattice service network shared with AWS RAM |
| Central team owns networking, application teams own only workloads | Shared VPC subnets through RAM |
| VPCs with overlapping CIDRs must exchange traffic at network level | Private NAT gateway in a routable subnet, or redesign; Transit Gateway and peering need unique ranges |

Transit gateway segmentation is done with route tables: each attachment is associated with exactly one route table and can propagate into several. A typical design associates spoke VPCs with a "spokes" table that only knows shared services and on premises, and blackhole routes keep production and development apart. Cloud WAN expresses the same idea as segments and segment actions (share routes between segments, or isolate attachments inside a segment).

> **Exam trap.** PrivateLink and VPC Lattice are the only answers that work with overlapping CIDRs without NAT. Peering and Transit Gateway both refuse or misroute overlapping prefixes.

<!-- section: vpc-design-ipam | objectives: 1.4.2 -->
## Subnet strategy, IP address management and segmentation

Address planning at scale is done before accounts exist, with **Amazon VPC IP Address Manager (IPAM)**:

- An IPAM has a **private scope** and a **public scope** by default; each scope is one network's address space, so the same ranges can be reused in unconnected networks.
- **Pools** nest: a top-level pool (for example `10.0.0.0/8`), Regional pools per Region, then pools per environment or business unit. Allocation rules on a pool set minimum, maximum and default netmask lengths and required tags, so a VPC created from the pool receives a non-overlapping CIDR automatically.
- With AWS Organizations, IPAM is administered from a delegated administrator account and monitors every member account: it reports noncompliant, overlapping and unmanaged CIDRs, and keeps the history of IP assignments.
- IPAM also manages public space: bring your own IPv4 or IPv6 ranges (BYOIP), share them across accounts and Regions, and provision contiguous Amazon-provided IPv6 blocks.

```text
IPAM private scope
  top-level pool 10.0.0.0/8
    eu-west-1 pool 10.16.0.0/12
      prod pool    10.16.0.0/13   allocation: /20 to /22, tag env=prod required
      nonprod pool 10.24.0.0/13   allocation: /22 to /24, tag env=nonprod required
    us-east-1 pool 10.32.0.0/12
```

Subnet strategy for an enterprise VPC:

| Tier | Route | Notes |
| --- | --- | --- |
| Public | `0.0.0.0/0` and `::/0` to the internet gateway | Only load balancers, NAT gateways and edge appliances |
| Private application | `0.0.0.0/0` to the NAT gateway or to the transit gateway (centralized egress) | Large ranges: containers, Lambda and endpoints consume addresses |
| Data | No default route | Databases, caches, interface endpoints |
| Transit gateway attachment | Small dedicated subnet per AZ (for example `/28`) | Keeps attachment ENIs away from workload NACLs |

Segmentation layers, from coarse to fine: separate accounts and VPCs, transit gateway route tables or Cloud WAN segments, subnets with NACLs, security groups referencing other security groups. When a VPC runs out of addresses, add a secondary CIDR (for example from `100.64.0.0/10` for pods), or move to IPv6.

> **Exam tip.** "Prevent overlapping CIDRs across hundreds of accounts automatically" is IPAM pools with allocation rules, delegated to the network account, not a spreadsheet or a Config rule.

<!-- section: network-security | objectives: 1.4.3 -->
## Traffic inspection, filtering and application protection

| Control | Layer and state | Scope | Use |
| --- | --- | --- | --- |
| Security group | 3–4, stateful, allow rules only | ENI | Workload micro-segmentation; reference other groups instead of IPs (also across same-Region peering and, when enabled, across a transit gateway for inbound rules) |
| Network ACL | 3–4, stateless, allow and deny, numbered rules | Subnet | Coarse deny lists, ephemeral port rules for return traffic |
| AWS Network Firewall | 3–7, stateless and stateful (Suricata-compatible rules), domain lists, TLS inspection | VPC or transit gateway | Egress filtering by domain, IPS, east-west and north-south inspection |
| Gateway Load Balancer | 3, GENEVE to third-party appliances | VPC, GWLB endpoints as route targets | Keep a vendor firewall, scale appliances horizontally |
| AWS WAF | 7, web ACLs with managed and custom rules, rate-based rules | CloudFront (global, created in `us-east-1`), ALB, API Gateway REST, AppSync, Cognito user pools, Verified Access, Bedrock AgentCore Gateway | SQL injection, XSS, bots, IP reputation, rate limiting |
| AWS Shield Advanced | 3–7 DDoS protection with response team support | CloudFront, Route 53, Global Accelerator, ALB, Elastic IP addresses (EC2, NLB) | Large DDoS exposure, cost protection |
| AWS Firewall Manager | Policy management | Organization | Enforce WAF, Shield Advanced, security group and Network Firewall policies on every account |

Inspection architectures:

- **Distributed**: a Network Firewall endpoint in each VPC (route the internet gateway and workload subnets through it). Isolation per VPC, more endpoints to pay for.
- **Centralized with Transit Gateway**: spoke traffic goes to an inspection point before reaching other spokes, on premises or the internet (centralized egress through NAT gateways after the firewall). Network Firewall can now attach **directly to a transit gateway** as a network function attachment, removing the need to build and route an inspection VPC; appliance mode is enabled automatically on such attachments. With your own inspection VPC (third-party appliances behind GWLB), enable **appliance mode** on its VPC attachment so both directions of a flow cross the same AZ and appliance.
- **Cloud WAN**: network function groups steer traffic between chosen segments through inspection attachments, inside and across Regions.

**VPC Flow Logs** record accepted and rejected flows (metadata, no payload) at VPC, subnet or ENI level, to CloudWatch Logs, S3 or Data Firehose; transit gateway flow logs cover the hub. Use them for security group troubleshooting, anomaly detection and as a source for Security Lake. Traffic mirroring is the answer when packet content is needed.

> **Exam trap.** Security groups can't deny, and NACLs are stateless: blocking one malicious IP range is a NACL deny rule or a WAF IP set, not a security group. Filtering outbound traffic by domain name (FQDN allow list) needs Network Firewall, not security groups.

<!-- section: ipv6-dual-stack | objectives: 1.4.4 -->
## IPv6 adoption and dual-stack migration

Drivers: public IPv4 addresses are billed per hour, private IPv4 space runs out in large container estates, and some customers mandate IPv6. IPv6 facts:

- A VPC gets an Amazon-provided `/56` (or a BYOIPv6 or IPAM-allocated block), each subnet a `/64`. IPv6 addresses are globally unique; reachability is controlled by routing and security, not by NAT.
- IPv4 can't be removed from a VPC. Subnets are IPv4-only, dual-stack or **IPv6-only** (Nitro instances); an IPv4-only subnet can't be converted to IPv6-only, so create new subnets.
- Outbound-only internet access for IPv6: **egress-only internet gateway** (`::/0` route). NAT gateways are for IPv4.
- IPv6-only workloads reach IPv4-only services through **DNS64** (enabled per subnet; Resolver synthesizes `64:ff9b::/96` addresses) and **NAT64** on a NAT gateway (always on): route `64:ff9b::/96` to the NAT gateway.

Migration sequence:

| Step | Action |
| --- | --- |
| 1 | Plan IPv6 pools in IPAM; associate IPv6 CIDRs with VPCs and subnets |
| 2 | Add `::/0` routes (internet gateway or egress-only internet gateway) and IPv6 routes to transit gateways; enable IPv6 on transit gateway VPC attachments |
| 3 | Add IPv6 rules to security groups and NACLs: IPv4 rules don't match IPv6 traffic |
| 4 | Switch front ends to dual-stack: ALB and NLB `dualstack`, CloudFront IPv6, Global Accelerator dual-stack (two IPv4 plus two IPv6 addresses), `AAAA` records in Route 53 |
| 5 | Enable IPv6 on instances, containers and endpoints; dual-stack PrivateLink endpoints need dual-stack subnets and NLBs |
| 6 | Create IPv6-only subnets for new workloads, with DNS64 and NAT64 for remaining IPv4 dependencies |

Transit gateway attachment subnets must keep IPv4 (they can't be IPv6-only). Direct Connect and Site-to-Site VPN carry IPv6 with their own BGP sessions or inside tunnels.

> **Exam trap.** A NAT gateway does not give IPv6 instances outbound internet access; that is the egress-only internet gateway. A NAT gateway appears in IPv6 designs only for NAT64, together with DNS64.

<!-- section: global-routing | objectives: 1.4.5 -->
## Global traffic routing for multi-Region applications

Route 53 routing policies:

| Policy | Decides by | Multi-Region use |
| --- | --- | --- |
| Failover | Health of the primary record | Active-passive Regions |
| Latency | Measured latency from the resolver to each Region | Active-active, nearest Region |
| Weighted | Percentages | Gradual Region migration, blue/green, canary |
| Geolocation | Continent, country or state of the user | Data residency, localized content |
| Geoproximity | Distance to resources, with a bias to grow or shrink areas | Shift load between Regions without changing users' geography |
| IP-based | CIDR blocks of the client | Route known ISP or enterprise ranges |
| Multivalue answer | Up to eight healthy records | Simple client-side load spreading |

Health checks monitor endpoints, other health checks (calculated) or CloudWatch alarms (useful for private resources). Alias records to ELB, CloudFront or Global Accelerator can evaluate target health. Records can be nested: latency records whose targets are failover or weighted sets.

**Amazon Application Recovery Controller (ARC)** adds control for Regional evacuation: routing controls (on/off switches driving health checks, with safety rules such as "at least one Region active"), Region switch plans that orchestrate multi-Region recovery across accounts, and zonal shift or zonal autoshift for AZ impairments.

**AWS Global Accelerator** gives two static anycast IPv4 addresses (or four with dual-stack) on the AWS edge, endpoint groups per Region with a traffic dial (0–100%) and endpoint weights. Failover doesn't depend on DNS caches because the client IPs never change.

| Requirement | Answer |
| --- | --- |
| Fastest Regional failover for TCP or UDP clients that cache DNS or can't use it | Global Accelerator |
| Users in a country must always reach the Region in that country | Route 53 geolocation, with a default record for the rest |
| Move 10 % of traffic to a new Region, then increase | Route 53 weighted records, or Global Accelerator traffic dials |
| Controlled, audited Region evacuation independent of the impaired Region's control plane | ARC routing controls or Region switch |
| Cacheable HTTP content worldwide with origin failover | CloudFront with an origin group |

> **Exam tip.** DNS-based failover is bounded by TTLs and resolver caching. When the stem stresses "clients cache DNS" or "static IP addresses for firewall allow lists", choose Global Accelerator.

<!-- section: key-points -->
## Key points

- Peering for a few VPCs, Transit Gateway for a Regional hub, Cloud WAN for policy-driven global segments, PrivateLink for one service across overlapping CIDRs, VPC Lattice for service-to-service with IAM auth, shared VPC for central ownership.
- IPAM: scopes, nested pools, allocation rules and Organizations integration prevent overlaps before VPCs exist.
- Security groups are stateful allow lists, NACLs stateless with deny; Network Firewall filters by domain and can attach directly to a transit gateway; GWLB keeps third-party appliances; appliance mode keeps flows symmetric.
- IPv6: `/56` per VPC, `/64` per subnet, egress-only internet gateway for outbound, DNS64 plus NAT64 for IPv4 dependencies, separate IPv6 security group rules.
- Global routing: Route 53 policies and health checks, ARC for controlled Region evacuation, Global Accelerator when DNS caching or static IPs matter.
