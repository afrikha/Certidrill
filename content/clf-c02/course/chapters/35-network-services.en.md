Networking on AWS starts with Amazon VPC, your own isolated network in a Region, and extends to DNS, content delivery and private links to your data centers. The exam asks you to name the components of a VPC, to tell security groups from network ACLs, to know what Amazon Route 53 does, and to choose between a VPN and AWS Direct Connect.

<!-- section: network-services | objectives: 3.5.1 -->
## AWS network services

| Service | What it does |
| --- | --- |
| **Amazon VPC** | A logically isolated virtual network that you define in a Region |
| **Amazon Route 53** | DNS, domain registration and health checks |
| **Amazon CloudFront** | Content delivery network: caches content at edge locations |
| **AWS Global Accelerator** | Static IP addresses and routing over the AWS global network to the nearest healthy endpoint |
| **Amazon API Gateway** | Create, publish and secure APIs in front of back-end services |
| **AWS Transit Gateway** | A hub that connects many VPCs and on-premises networks |
| **AWS PrivateLink** | Private access to services through endpoints in your VPC, without the internet |
| **AWS VPN**, **AWS Direct Connect** | Connections between your networks and AWS |
| **Elastic Load Balancing** | Distributes traffic across targets |

<!-- section: vpc-components | objectives: 3.5.2 -->
## Components of a VPC

| Component | Role |
| --- | --- |
| **Subnet** | A range of IP addresses in **one** Availability Zone |
| **Public subnet** | A subnet whose route table has a route to an internet gateway |
| **Private subnet** | A subnet without a route to an internet gateway |
| **Route table** | Rules that decide where the traffic of a subnet goes |
| **Internet gateway** | Allows communication between the VPC and the internet |
| **NAT gateway** | Lets instances in a private subnet start outbound connections to the internet, while no one on the internet can connect to them |
| **Virtual private gateway** | The AWS end of a Site-to-Site VPN connection attached to a VPC |
| **VPC peering** | A private connection between two VPCs |
| **VPC endpoint** | Private access from the VPC to AWS services (for example Amazon S3) without the internet |
| **Elastic IP address** | A static public IPv4 address |

A typical design: a load balancer in public subnets of two Availability Zones, application instances in private subnets, a database in private subnets with no internet route.

> **Exam trap.** A subnet is public because of its **route to an internet gateway**, not because of its name. A private subnet that needs to download updates uses a NAT gateway, which allows outbound connections only.

<!-- section: vpc-security | objectives: 3.5.3 -->
## Security in a VPC

| | Security group | Network ACL |
| --- | --- | --- |
| Applies to | An instance (its network interface) | A subnet: every resource in it |
| Rules | **Allow** rules only | **Allow and deny** rules, evaluated in number order |
| State | **Stateful**: return traffic is allowed automatically | **Stateless**: return traffic needs its own rule |
| Default | A new security group allows no inbound traffic and all outbound traffic | The default network ACL allows all traffic |

- Use **security groups** as the main firewall around each instance (for example, allow HTTPS only from the load balancer).
- Use **network ACLs** as an extra layer at the subnet boundary, for example to **deny** a specific IP address range.
- **Amazon Inspector** scans EC2 instances, container images and Lambda functions for software vulnerabilities and **unintended network exposure**.
- **VPC Flow Logs** record the IP traffic accepted and rejected in the VPC, for troubleshooting and security analysis.

> **Exam trap.** Only network ACLs can **deny** traffic. "Block one malicious IP address for the whole subnet" is a network ACL; a security group can't contain a deny rule.

<!-- section: route-53 | objectives: 3.5.4 -->
## Amazon Route 53

Route 53 is a highly available and scalable **DNS** service:

- **Domain registration**: buy and manage domain names.
- **DNS routing**: translate names such as `www.example.com` into IP addresses or AWS resources (load balancers, CloudFront distributions, S3 websites).
- **Health checks**: monitor endpoints and stop sending users to unhealthy ones.
- **Routing policies**:

| Policy | Sends users |
| --- | --- |
| Simple | To one resource |
| Weighted | To several resources in proportions you set (for example, 90 % / 10 % to test a new version) |
| Latency | To the Region that gives them the lowest latency |
| Failover | To a secondary resource when the primary is unhealthy |
| Geolocation | According to their country or continent |

> **Exam tip.** "Route users to the Region with the lowest latency" and "fail over to a standby site in another Region" are both Route 53 routing policies. Route 53 is the DNS answer; CloudFront is the caching answer.

<!-- section: connectivity | objectives: 3.5.5 -->
## Network connectivity options to AWS

| Option | What it is | Choose it when |
| --- | --- | --- |
| **AWS Site-to-Site VPN** | Encrypted IPsec tunnels over the internet between your data center and a VPC (or transit gateway) | A quick, low-cost, encrypted connection; a backup for Direct Connect |
| **AWS Client VPN** | Managed remote access VPN for individual users | Employees working from home must reach private resources |
| **AWS Direct Connect** | A dedicated, private network connection from your premises to AWS through a Direct Connect location, without the public internet | Consistent performance and bandwidth, large data transfers, reduced data transfer cost |
| **Direct Connect plus VPN** | IPsec over the Direct Connect connection | Private, consistent **and** encrypted connectivity |

> **Exam trap.** Direct Connect is private but not encrypted by default, and it takes longer to set up than a VPN. "Encrypted connection over the internet, set up quickly" is Site-to-Site VPN; "dedicated connection with consistent network performance" is Direct Connect.

<!-- section: key-points -->
## Key points

- VPC: isolated network in a Region; subnets live in one AZ; a public subnet has a route to an internet gateway; NAT gateway for outbound-only access from private subnets.
- Security groups: instance level, allow only, stateful. Network ACLs: subnet level, allow and deny, stateless.
- Amazon Inspector finds vulnerabilities and unintended network exposure; VPC Flow Logs record traffic.
- Route 53: DNS, domain registration, health checks, routing policies (simple, weighted, latency, failover, geolocation).
- Site-to-Site VPN: encrypted over the internet, quick. Client VPN: users. Direct Connect: dedicated private link, consistent performance.
