Data entering AWS from the internet is free, but almost every other path has a price: out to the internet, across Availability Zones, between Regions, through a NAT gateway, a load balancer or an interface endpoint. Exam questions describe a traffic path and ask for the change that cuts the bill without losing availability. Rates quoted are US examples from AWS pricing pages: the exam tests the relative order, not the cents.

<!-- section: transfer-rules | objectives: 4.4.10 -->
## Data transfer rules and cheaper routes

| Path | Charge |
| --- | --- |
| Internet to AWS | Free |
| AWS to the internet | Per GB, tiered; 100 GB per month free across all services and Regions |
| Within one Availability Zone, private IP addresses | Free |
| Between Availability Zones of a Region | Per GB **in each direction** (for example $0.01/GB each way) |
| To a public or Elastic IP address of a resource in the same Region | Goes out through the internet gateway and back, billed like regional transfer even inside one AZ |
| Between Regions | Per GB out of the source Region; the destination Region doesn't charge for the data in |
| EC2 to Amazon S3 or DynamoDB in the same Region | Free (but a NAT gateway on the path still bills its processing) |
| AWS origin to Amazon CloudFront | Free (origin fetches) |

Routing choices that remove charges:

- **Use private IP addresses** between components of the same VPC or of peered VPCs instead of public endpoints.
- **Keep chatty components in the same Availability Zone** when the requirement allows it, and avoid sending one AZ's traffic to another AZ's NAT gateway.
- **Gateway VPC endpoints** for Amazon S3 and DynamoDB have **no hourly or data processing charge**: they remove NAT gateway processing for that traffic.
- **Interface VPC endpoints** (AWS PrivateLink) keep traffic private for other services but cost per endpoint per AZ per hour (about $0.01) plus per GB processed ($0.01/GB for the first PB). They save money only when they replace a NAT path carrying enough data, or when private access is a requirement anyway.
- **Serve users from CloudFront** instead of from EC2 or S3 directly.
- **Read locally**: a read replica or a cache in the consuming Region avoids repeated inter-Region reads.

**AWS Global Accelerator** improves performance, not cost: it bills a fixed $0.025 per accelerator-hour plus a Data Transfer-Premium (DT-Premium) per GB, charged only in the dominant direction each hour, **on top of** normal data transfer out. Choose it for static anycast IP addresses, fast Regional failover or non-HTTP (TCP/UDP) traffic, never as the cheapest path.

| Requirement | Cheapest design |
| --- | --- |
| Private instances read and write large volumes in S3 through a NAT gateway | S3 gateway endpoint plus a route in the private route tables |
| Private access to Amazon SQS or AWS KMS without internet | Interface endpoint (gateway endpoints exist only for S3 and DynamoDB) |
| Analytics job reads data in another Region every hour | Replicate the data once into the job's Region, or move the job |

> **Exam trap.** Gateway endpoints are free; interface endpoints are not. When the stem says "S3" or "DynamoDB" and "MOST cost-effective", the gateway endpoint wins over both the NAT gateway and an interface endpoint.

<!-- section: load-balancing-costs | objectives: 4.4.3 -->
## Load balancing costs

Every Elastic Load Balancing type bills an hourly charge plus capacity units, and only the **highest** dimension of the hour counts:

| Type | Layer | Capacity unit dimensions |
| --- | --- | --- |
| Application Load Balancer (ALB) | 7 (HTTP/HTTPS, gRPC) | LCU: new connections, active connections, processed bytes, rule evaluations (first 10 rules free) |
| Network Load Balancer (NLB) | 4 (TCP, UDP, TLS) | NLCU: new connections or flows, active connections or flows, processed bytes |
| Gateway Load Balancer (GWLB) | 3 (third-party appliances, GENEVE) | GLCU, plus an hourly charge per Availability Zone; each Gateway Load Balancer endpoint is billed hourly and per GB |

Cost-driven choices:

- **Consolidate**: one ALB with host-based and path-based rules can front many applications, which saves the hourly charge of separate load balancers.
- **Cross-zone load balancing**: always on at the ALB level (it can be turned off per target group), and traffic from the ALB to targets in other AZs isn't billed as inter-AZ transfer. On an NLB it is **off by default**; when you turn it on, traffic to targets in another AZ is charged about $0.01/GB in each direction.
- Internal clients should use an **internal** load balancer: reaching a public NLB address from the same VPC goes through the internet gateway and adds regional transfer charges.

> **Exam tip.** Choose the load balancer for the protocol first (HTTP features → ALB; static IP, extreme throughput or UDP → NLB; inline appliances → GWLB), then optimize its cost. A cheaper load balancer that lacks a required feature is never the answer.

<!-- section: nat-gateway-costs | objectives: 4.4.4 -->
## NAT gateway and NAT instance costs

A **NAT gateway** bills per hour and **per GB processed** (example in US East (Ohio): $0.045 per hour and $0.045 per GB), plus normal data transfer and the public IPv4 address ($0.005 per hour for every public IPv4 address, in use or idle). It starts at 5 Gbps, scales automatically to 100 Gbps, and needs no maintenance.

A **NAT instance** is an EC2 instance you configure for NAT, with **source/destination check disabled**. You pay the instance and its data transfer, with no per-GB processing fee, but you own patching, scaling and failover.

| Attribute | NAT gateway | NAT instance |
| --- | --- | --- |
| Availability | Redundant within its AZ, managed | Scripts for failover |
| Bandwidth | 5 Gbps, scales up to 100 Gbps | Depends on the instance type |
| Maintenance | None | Operating system updates and patches by you |
| Cost | Hours plus GB processed | Instance hours, type and size |
| Security groups | Not supported (use network ACLs) | Supported |
| Port forwarding, bastion use | Not supported | Possible |

Ways to lower the NAT bill:

1. Send S3 and DynamoDB traffic through **gateway endpoints**.
2. Use interface endpoints for other heavy AWS service traffic when the endpoint's hourly and per-GB price is lower than the NAT processing it removes.
3. Delete idle NAT gateways (AWS Trusted Advisor flags **Idle NAT gateways** and **Inactive NAT Gateways**).
4. For IPv6 outbound traffic, use an **egress-only internet gateway** instead of NAT.

> **Exam trap.** A NAT instance can be cheaper for a small dev workload, but it fails "highly available" and "LEAST operational overhead". In production stems, the NAT gateway is the expected answer.

<!-- section: nat-gateway-topology | objectives: 4.4.8 -->
## Choosing the NAT gateway topology

A standard (zonal) NAT gateway lives in one Availability Zone. If resources in several AZs share it and its AZ fails, the other AZs lose internet access. AWS also offers a **regional NAT gateway** that spans the AZs of the VPC.

| Topology | Cost | Availability | Use when |
| --- | --- | --- | --- |
| One shared zonal NAT gateway | One hourly charge, but cross-AZ transfer for every AZ that uses it | A single AZ failure cuts outbound access for all | Development, test, cost over availability |
| One zonal NAT gateway per AZ, each AZ routing to its own | One hourly charge per AZ, no cross-AZ NAT traffic | Zone-independent | Production with a public subnet per AZ |
| Regional NAT gateway | Billed per hour for each AZ where it is active, plus processing | Expands automatically to AZs with workloads | Production wanting one NAT ID, no public subnet, automatic high availability |

Regional NAT gateway facts:

- One NAT gateway per VPC, one ID for the private route tables of every AZ; AWS creates its route table with a route to the internet gateway.
- It **doesn't need a public subnet**, and it supports up to 32 IP addresses per AZ (8 for zonal).
- It detects network interfaces in a new AZ and expands there, which can take up to 60 minutes; in the meantime traffic is processed from an existing AZ.
- It supports **public NAT only**: private NAT (to other VPCs or on-premises networks through a transit gateway or virtual private gateway) still needs zonal NAT gateways.

```bash
# Regional NAT gateway: no subnet, one ID for the whole VPC
aws ec2 create-nat-gateway --vpc-id vpc-0abc1234def567890 --availability-mode regional
```

Well-Architected cost guidance: if the resources sending the most traffic through a NAT gateway are in another AZ, create a NAT gateway in their AZ.

> **Exam trap.** "MOST cost-effective" alone suggests one shared NAT gateway; "MOST cost-effective" plus "highly available" or "must survive an AZ failure" requires one per AZ or a regional NAT gateway. Read every requirement before the qualifier.

<!-- section: dns-services | objectives: 4.4.7 -->
## DNS and network services

Amazon Route 53 bills each hosted zone per month and queries per million, with higher rates for latency-based and geolocation queries. Cost-relevant facts:

| Feature | Fact |
| --- | --- |
| Alias record | Free queries when it points to an AWS resource (CloudFront, ELB, S3 website, API Gateway, VPC interface endpoint, Global Accelerator and others); allowed at the zone apex |
| CNAME record | Queries are charged; not allowed at the zone apex |
| Health checks | Monthly charge per check, higher for non-AWS endpoints |
| Route 53 Resolver endpoints | Charged per network interface per hour; inbound and outbound endpoints resolve names between a VPC and on-premises DNS |

Routing policies decide which Region serves, and bills, each user: **simple**, **failover**, **geolocation** (user location), **geoproximity** (resource location, with bias), **latency**, **IP-based**, **multivalue answer** (up to eight healthy records) and **weighted** (proportions).

| Requirement | Answer |
| --- | --- |
| Point the apex `example.com` to an ALB at no query cost | Alias record |
| Send users to the Region with the lowest latency | Latency routing policy |
| Users of one country must be served from one Region | Geolocation routing policy |
| On-premises servers must resolve private hosted zone names | Route 53 Resolver inbound endpoint |

> **Exam tip.** When the choice is between an alias and a CNAME for an AWS target, the alias is cheaper (free queries), works at the zone apex and needs no separate TTL.

<!-- section: cdn-edge-caching | objectives: 4.4.11 -->
## CDN and edge caching

Amazon CloudFront caches content at edge locations close to viewers. Cost facts:

- **Origin fetches from AWS origins** (S3, EC2, Elastic Load Balancing) are **free**: you stop paying data transfer out from the Region and pay CloudFront delivery instead.
- The always-free tier includes **1 TB** of data transfer out and **10,000,000** HTTP/HTTPS requests per month, plus 2,000,000 CloudFront Functions invocations.
- **Price classes** reduce cost by excluding expensive edge locations: Price Class All, Price Class 200 (excludes South America and Australia/New Zealand), Price Class 100 (United States, Mexico, Canada, Europe, Israel, Türkiye). Viewers elsewhere get higher latency.
- **Origin Shield** adds a caching layer in one Region in front of the origin, so each object is fetched from the origin once, for an additional request fee.
- **Flat-rate pricing plans** (Free, Pro, Business, Premium) bundle CloudFront with AWS WAF, DDoS protection, Route 53 DNS and S3 storage credits for a monthly price with no overage charges.

When a CDN is the right strategy:

| Signal in the stem | Strategy |
| --- | --- |
| Static assets or video for users in many countries | CloudFront in front of S3 (origin access control) |
| High data transfer out bill from EC2 or S3 | CloudFront; cache hits cost no origin transfer |
| Spiky traffic on the same objects overloads the origin | CloudFront with Origin Shield |
| API calls that return the same responses repeatedly | API Gateway caching or ElastiCache in front of the backend |
| Non-HTTP game or VoIP traffic, static IP addresses | Global Accelerator, not CloudFront |

> **Exam trap.** CloudFront caches; Global Accelerator doesn't. "Reduce origin load and data transfer costs for HTTP content" means CloudFront. "Static IP addresses for a TCP or UDP application" means Global Accelerator.

<!-- section: throttling | objectives: 4.4.13 -->
## Throttling strategies

Throttling protects a backend from overload and keeps a surge from turning into a bill. Pick the control at the layer that receives the traffic:

| Layer | Control | Facts |
| --- | --- | --- |
| Amazon API Gateway | Account, stage, method and per-client throttling (token bucket) | Default account quota 10,000 requests per second per Region with a burst of 5,000 (lower in some newer Regions); excess requests get `429 Too Many Requests` |
| API Gateway usage plans | Rate, burst and quota per client, identified by an API key | For tiers of customers; throttles and quotas are best-effort targets, not guaranteed ceilings |
| AWS WAF | Rate-based rule | Counts requests per aggregation key (IP address, forwarded IP, custom keys) over 1, 2, 5 or 10 minutes; lowest limit 10 |
| AWS Lambda | Reserved concurrency | Maximum and guaranteed concurrency for one function at no extra charge; protects a database from too many connections |
| Amazon SQS | Queue between producer and consumer | Absorbs bursts; consumers process at a steady rate (load leveling) |
| Amazon RDS Proxy | Connection limits | Queues, then rejects connections above the limit |

API Gateway applies limits in this order: per-client or per-method limits of a usage plan, per-method limits of a stage, the account limit per Region, then the AWS Regional limit. A lower level can't exceed the one above it. Clients that receive 429 errors should retry with exponential backoff.

```bash
# Cap a function so that it never opens more than 50 concurrent database sessions
aws lambda put-function-concurrency --function-name order-writer --reserved-concurrent-executions 50
```

> **Exam trap.** Provisioned concurrency is not a throttle: it pre-initializes execution environments to reduce cold starts and is billed. To limit a function's scale, the answer is reserved concurrency.

<!-- section: key-points -->
## Key points

- Free: data in, same-AZ private traffic, EC2 to S3 or DynamoDB in-Region, AWS origin to CloudFront, gateway endpoints. Charged: internet out, inter-AZ (each direction), inter-Region, NAT processing, interface endpoints.
- ALB cross-zone traffic isn't billed as inter-AZ; NLB cross-zone is off by default and billed when on.
- NAT gateway = hours plus GB processed; NAT instance = cheaper but self-managed. Gateway endpoints remove NAT processing for S3 and DynamoDB.
- One shared NAT gateway for dev; one per AZ or a regional NAT gateway for production.
- Route 53 alias queries to AWS resources are free and work at the apex.
- CloudFront cuts data transfer out and origin load; Global Accelerator adds cost for static IPs and TCP/UDP performance.
- Throttle with API Gateway limits and usage plans, WAF rate-based rules, Lambda reserved concurrency and SQS buffering.
