Hybrid links and inter-VPC topology are fixed monthly costs that are easy to oversize: a Direct Connect port nobody fills, a transit gateway attachment for two VPCs that a peering connection would serve, a VPN that can't carry the required throughput. This chapter covers the tools that show where network money goes, the connectivity and topology options with their pricing, bandwidth sizing and workload reviews.

<!-- section: cost-management-features | objectives: 4.4.1 -->
## Cost allocation for network resources

Network costs are often shared: one NAT gateway, one transit gateway or one Direct Connect connection serves many teams. Two features make them attributable:

**Cost allocation tags**

| Type | Created by | Example |
| --- | --- | --- |
| AWS-generated | AWS, with the `aws:` prefix | `aws:createdBy` |
| User-defined | You | `CostCenter`, `Application`, `Environment` |

- Both types must be **activated** in the Billing and Cost Management console before they appear in Cost Explorer or cost allocation reports, and only the **management account** of an organization (or a standalone account) can activate them.
- After activation, tags can take up to 24 hours to appear.
- Tag the resources that carry hourly network charges: NAT gateways, transit gateway attachments, VPC endpoints, load balancers, Elastic IP addresses.

**Consolidated billing** (AWS Organizations)

- One bill for the accounts of the organization, with combined cost and usage data.
- **Combined usage**: volume pricing tiers (data transfer out is tiered), Reserved Instance discounts and Savings Plans are shared across accounts.
- No additional cost.

Ownership rules that matter for chargeback: the **VPC owner** pays the hourly charge of its transit gateway VPC attachment, and the owner of the VPC that **sends** traffic to the transit gateway pays its data processing.

> **Exam trap.** Applying a tag is not enough. A stem in which a finance team "cannot see costs by project in Cost Explorer although the resources are tagged" is answered by activating the tags as cost allocation tags in the management account.

<!-- section: cost-management-tools | objectives: 4.4.2 -->
## Cost management tools for network spend

| Requirement | Tool |
| --- | --- |
| Visualize and filter costs by service, account, tag or **usage type** over time, with a forecast | AWS Cost Explorer |
| Alert when cost or usage exceeds, or is forecast to exceed, a threshold, and act automatically | AWS Budgets |
| The most detailed line-item data, queried with SQL | AWS Cost and Usage Report (CUR 2.0) through AWS Data Exports, delivered to Amazon S3 |
| Detect unusual spend without setting thresholds | AWS Cost Anomaly Detection |

**AWS Budgets** supports cost, usage, Reserved Instance and Savings Plans utilization or coverage budgets. Alerts go to email or an Amazon SNS topic. **Budget actions** run automatically or after approval: apply an IAM policy, apply an SCP, or target specific EC2 or RDS instances. Budget data is updated up to three times a day, so it is not a real-time cap.

**CUR 2.0** is the recommended export of AWS Data Exports (the legacy CUR is still available as a legacy export). Analyze it with Amazon Athena or a dashboard. Data transfer appears under recognizable usage types:

| Usage type pattern | Meaning |
| --- | --- |
| `USE2-DataTransfer-Regional-Bytes` | Between Availability Zones of a Region (two line items, one per direction) |
| `USE2-DataTransfer-Out-Bytes` | Out to the internet from the Region |
| `APS3-USE2-AWS-Out-Bytes` | Out of one Region to another |
| Ending in `DataXfer-Out` | Out over Direct Connect |

**AWS Cost Anomaly Detection** uses machine learning on AWS services, member accounts, cost allocation tags or cost categories, runs about three times a day, ranks root causes by service, account, Region and usage type, and alerts by email or SNS. It needs history before it detects anomalies in a new service.

> **Exam tip.** "Find which resource causes the inter-AZ data transfer charges" needs line-item detail: CUR 2.0 queried with Athena, plus VPC Flow Logs to identify the flows. Cost Explorer shows the trend; it doesn't name the flows.

<!-- section: connectivity-options | objectives: 4.4.5 -->
## Network connectivity options and their pricing

| Option | What it is | Pricing model |
| --- | --- | --- |
| AWS Site-to-Site VPN | Two IPsec tunnels over the internet between a customer gateway and a virtual private gateway, transit gateway or Cloud WAN | Per VPN connection-hour (standard example: $0.05 per hour) plus data transfer out |
| Accelerated Site-to-Site VPN | VPN tunnels that enter the AWS global network at the nearest edge location through Global Accelerator; transit gateway attachments only | VPN charges plus two accelerators per connection and DT-Premium |
| AWS Client VPN | Managed OpenVPN-based access for individual remote users | Per endpoint association hour plus per active connection-hour |
| AWS Direct Connect, dedicated connection | A physical Ethernet port for one customer at a Direct Connect location: 1, 10, 100 or 400 Gbps | Port-hours (for example $0.30/h at 1 Gbps, $2.25/h at 10 Gbps) plus data transfer out at Direct Connect rates; data in free |
| AWS Direct Connect, hosted connection | Capacity provisioned by an AWS Direct Connect Partner: 50 Mbps to 25 Gbps | Port-hours (slightly higher than dedicated at the same speed) plus data transfer out, plus partner charges |

Direct Connect traffic is carried on **virtual interfaces**: a private VIF to a virtual private gateway or Direct Connect gateway, a transit VIF to a transit gateway through a Direct Connect gateway, a public VIF to AWS public endpoints. A **Direct Connect gateway** is a global resource that lets one connection reach VPCs in many Regions and accounts (except the China Regions).

Port-hours are billed whether or not data flows. A Direct Connect link pays off when the data transfer out volume is large enough that the lower per-GB rate covers the port, or when the requirement is consistent latency and private connectivity.

> **Exam trap.** Direct Connect is private but not encrypted by default. When the stem requires encryption in transit over Direct Connect, add MACsec on supported dedicated connections or run a Site-to-Site VPN over the Direct Connect link.

<!-- section: choose-connection | objectives: 4.4.9 -->
## Choosing Direct Connect, VPN or internet

| Requirement | Answer |
| --- | --- |
| Connect an office to a VPC this week, low cost, a few hundred Mbps | Site-to-Site VPN |
| Large, steady data transfer from AWS to on premises, consistent latency | Direct Connect |
| Remote employees reach private resources from their laptops | AWS Client VPN |
| VPN performance suffers from internet distance to the Region | Accelerated Site-to-Site VPN on a transit gateway |
| Lowest-cost backup path for a single Direct Connect connection | Site-to-Site VPN as backup |
| Critical workload, survive the loss of a Direct Connect location | Direct Connect maximum resiliency: separate connections on separate devices in more than one location |

Direct Connect resiliency models from the AWS Direct Connect Resiliency Toolkit:

| Model | Design | SLA |
| --- | --- | --- |
| Maximum resiliency | Separate connections on separate devices in more than one location | 99.99 % when all SLA requirements are met |
| High resiliency | Single connections to multiple locations | 99.9 % when all SLA requirements are met |
| Development and test | Separate connections on separate devices in one location | Protects against device failure only |

> **Exam tip.** A new Direct Connect connection takes time to provision, often weeks. "Immediately" or "within days" points to a VPN, possibly as a bridge until Direct Connect is ready.

<!-- section: topology-peering | objectives: 4.4.6 -->
## Routing, topology and peering

| Fact | VPC peering | AWS Transit Gateway |
| --- | --- | --- |
| Topology | One-to-one; full mesh needs n(n−1)/2 connections | Hub and spoke: each VPC, VPN or Direct Connect gateway attaches once |
| Transitive routing | No; no edge-to-edge routing through the peer's internet gateway, NAT device, VPN or gateway endpoint | Yes, controlled by transit gateway route tables (segmentation with separate route tables) |
| Overlapping CIDR blocks | Not allowed | Not routable between attachments |
| Fixed cost | None: no charge to create a peering connection | Per attachment-hour (example in US East (Ohio): $0.05 per VPC attachment-hour) |
| Traffic cost | Free within one Availability Zone; inter-AZ and inter-Region rates otherwise | Data processing per GB sent to the transit gateway (example: $0.02/GB) plus standard data transfer |
| Inter-Region | Supported | Transit gateway peering (static routes); no processing charge on data received from a peering attachment |

Choosing on cost:

- **A few VPCs exchanging a lot of data**: VPC peering, because there is no hourly or processing charge.
- **Many VPCs, on-premises networks and shared services**: Transit Gateway, because the number of peering connections and route table entries grows quadratically and a single attachment per VPC is simpler to operate.
- **Expose one service to many consumer VPCs, even with overlapping CIDRs**: AWS PrivateLink (an endpoint service behind an NLB), which avoids routing whole networks.
- **Several accounts sharing one network**: share subnets of a central VPC with AWS RAM so that workloads don't need inter-VPC traffic at all.
- **Hybrid access to many Regions over one Direct Connect connection**: Direct Connect gateway, associated with transit gateways or virtual private gateways.

> **Exam trap.** VPC peering isn't transitive. If VPC B and VPC C are both peered with VPC A, B can't reach C through A, and B can't use A's NAT gateway or VPN. The answer is a direct peering connection or a transit gateway.

<!-- section: bandwidth-allocation | objectives: 4.4.14 -->
## Sizing bandwidth for VPN and Direct Connect

**Site-to-Site VPN**

| Tunnel type | Maximum per tunnel | Attachments | Price example |
| --- | --- | --- | --- |
| Standard | Up to 1.25 Gbps and 140,000 packets per second | Virtual private gateway, transit gateway, Cloud WAN | $0.05 per connection-hour |
| Large Bandwidth Tunnel | Up to 5 Gbps and 400,000 packets per second | Transit gateway or Cloud WAN only; not virtual private gateway, not accelerated VPN | $0.60 per connection-hour |

- Each connection has two tunnels in different Availability Zones for redundancy; both tunnels of a connection use the same bandwidth option.
- To exceed one tunnel's limit, attach **several VPN connections to a transit gateway with ECMP** (equal-cost multi-path), which requires **dynamic routing (BGP)**. For example, two Large Bandwidth Tunnel connections give 20 Gbps across four tunnels. A virtual private gateway doesn't aggregate tunnels with ECMP.
- Actual throughput depends on packet size, the traffic mix and the internet path.

**Direct Connect**

- Pick the port speed for the sustained need plus growth: dedicated 1, 10, 100 or 400 Gbps; hosted 50 Mbps to 25 Gbps when you need less than 1 Gbps or a partner provides the circuit.
- The speed of a dedicated connection can't be changed after the request: a new connection is needed. A hosted connection's speed is changed by the partner, if the partner supports it.
- A **link aggregation group (LAG)** bundles dedicated connections of the same speed at the same location into one logical connection.

| Requirement | Answer |
| --- | --- |
| 3 Gbps encrypted over the internet to a single VPC behind a virtual private gateway | Move the VPN to a transit gateway: several standard connections with ECMP, or one Large Bandwidth Tunnel connection |
| 500 Mbps of steady private traffic | Hosted Direct Connect connection at 500 Mbps |
| 20 Gbps today, room to grow at the same location | Two 10 Gbps dedicated connections in a LAG, or one 100 Gbps connection |

> **Exam trap.** Adding a second VPN connection to a virtual private gateway doesn't double throughput. ECMP aggregation needs a transit gateway (or Cloud WAN) and BGP.

<!-- section: network-review | objectives: 4.4.12 -->
## Reviewing existing workloads for network optimizations

A network cost review moves from the bill to the flows to the fix:

1. **Find the cost category** in Cost Explorer or CUR 2.0: NAT gateway hours and bytes, `DataTransfer-Regional-Bytes`, inter-Region transfer, transit gateway processing, public IPv4 addresses.
2. **Find the flows** with **VPC Flow Logs** (VPC, subnet or network interface; published to CloudWatch Logs, S3 or Data Firehose; collected outside the traffic path, so no impact on throughput or latency, but log ingestion and storage are billed). Custom fields such as `az-id`, `flow-direction`, `traffic-path` (internet gateway, gateway endpoint, peering, virtual private gateway) and `pkt-dst-aws-service` (for example `S3`, `DYNAMODB`) show which AZ sends traffic where.
3. **Find idle resources** with AWS Trusted Advisor cost checks: Idle NAT gateways, Inactive NAT Gateways, Inactive VPC interface endpoints, Inactive Gateway Load Balancer endpoints, Unassociated Elastic IP Addresses, Idle Load Balancers (Classic Load Balancers only).
4. **Apply the fix** and confirm the drop in the next bill.

| Finding | Optimization |
| --- | --- |
| Most NAT gateway bytes go to S3 or DynamoDB | Gateway endpoints |
| Instances in AZ b use the NAT gateway in AZ a | NAT gateway in AZ b, or a regional NAT gateway |
| Front end calls the back end through a public address | Internal load balancer and private IP addresses |
| Heavy inter-AZ traffic between an application and its NLB targets | Turn off NLB cross-zone load balancing where target capacity allows, or keep chatty tiers in one AZ |
| Same objects downloaded many times from S3 | CloudFront in front of the bucket |
| Many unused public IPv4 addresses | Release them; each public IPv4 address is billed hourly |
| Many peering connections and route entries to maintain | Transit Gateway, after comparing its attachment and processing charges |
| Direct Connect port mostly idle | Hosted connection at a lower speed, or VPN if latency needs allow |

> **Exam tip.** Flow logs don't affect network performance, so "analyze traffic without impact on the application" is answered with VPC Flow Logs, not with packet capture on instances.

<!-- section: key-points -->
## Key points

- Activate cost allocation tags in the management account; consolidated billing shares volume tiers and discounts at no cost.
- Cost Explorer for trends, Budgets for thresholds and actions, CUR 2.0 for line items, Cost Anomaly Detection for surprises.
- VPN: quick and cheap, 1.25 Gbps per standard tunnel, 5 Gbps per Large Bandwidth Tunnel (transit gateway or Cloud WAN). Direct Connect: port-hours plus lower data transfer out, not encrypted by default.
- Peering: no fixed cost, not transitive. Transit Gateway: hourly attachments and per-GB processing, but scales to many VPCs and hybrid links.
- More VPN bandwidth = several connections with ECMP on a transit gateway with BGP. Dedicated Direct Connect speed is fixed per connection.
- Review: bill (Cost Explorer, CUR 2.0) → flows (VPC Flow Logs) → idle resources (Trusted Advisor) → fix.
