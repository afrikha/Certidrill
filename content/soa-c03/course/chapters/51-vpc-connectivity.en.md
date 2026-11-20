Networking questions give a VPC layout (subnets, route tables, gateways, security groups) and a requirement: reach the internet from private subnets, reach S3 without the internet, connect two VPCs, prove that firewalls are logging, or cut a large NAT gateway bill. This chapter covers subnets and routing, security groups and network ACLs, VPC endpoints and PrivateLink, VPC peering, auditing network protection services in one account, and the cost of network architectures.

<!-- section: vpc-subnets-routing | objectives: 5.1.1 -->
## Subnets, route tables and gateways

A VPC has a primary IPv4 CIDR between /16 and /28, plus secondary CIDR blocks (5 per VPC by default, adjustable up to 50) and optional IPv6 blocks. Each **subnet** lives in one Availability Zone, and AWS reserves 5 addresses in every subnet: the network address, the next three (VPC router, DNS, future use) and the last one. A /28 therefore leaves 11 usable addresses, a /24 leaves 251.

A **route table** is associated with each subnet (the main route table if none is chosen). The most specific matching route wins, and the `local` route for the VPC CIDR is always present. What makes a subnet public is its route, not its name:

```text
Destination          Target
10.20.0.0/16         local
0.0.0.0/0            nat-0a1b2c3d4e5f67890
pl-12345678          vpce-0123456789abcdef0
::/0                 eigw-0fedcba9876543210
```

| Gateway | Role | Key rules |
| --- | --- | --- |
| Internet gateway | Inbound and outbound internet for public subnets | One per VPC; instances also need a public IPv4 address or an Elastic IP |
| NAT gateway, zonal | Outbound-only IPv4 internet for private subnets | Created in a public subnet with an Elastic IP, one per AZ for resilience; no security group; up to 8 IP addresses; private NAT type for routing to other networks without internet |
| NAT gateway, regional | Same, one gateway for all AZs | No public subnet needed; expands automatically to AZs where you run resources (up to 60 minutes); up to 32 IP addresses per AZ; no private NAT |
| Egress-only internet gateway | Outbound-only IPv6 internet | Route `::/0` to it; stateful, blocks connections initiated from the internet |

Each NAT gateway IP address supports 55,000 simultaneous connections to one destination; the `ErrorPortAllocation` metric shows when a gateway runs out and needs more addresses. Default quotas include 5 VPCs per Region, 200 subnets per VPC, 5 NAT gateways per AZ and 5 Elastic IP addresses per Region.

> **Exam trap.** Private-subnet instances that lose internet access after a NAT gateway is "moved" usually route `0.0.0.0/0` to a deleted gateway (route status blackhole) or to a NAT gateway placed in a private subnet. A zonal public NAT gateway must sit in a subnet whose route table points to the internet gateway.

<!-- section: sg-nacl | objectives: 5.1.1 -->
## Security groups and network ACLs

| | Security group | Network ACL |
| --- | --- | --- |
| Applies to | Network interfaces (instances, load balancers, endpoints) | Subnets, one network ACL per subnet |
| State | Stateful: return traffic is allowed automatically | Stateless: return traffic needs its own rule |
| Rules | Allow only | Allow and deny, evaluated in number order, first match wins |
| Sources | CIDRs, prefix lists, other security groups | CIDRs only |
| Default | Default group: inbound from itself, all outbound; new group: no inbound, all outbound | Default ACL allows all; a new custom ACL denies all until you add rules |
| Quotas | 60 inbound and 60 outbound rules, 5 groups per interface (up to 16) | 20 rules per direction (up to 40) |

Because network ACLs are stateless, a web subnet that allows inbound 443 must also allow **outbound ephemeral ports** to clients, and a private subnet that calls the internet must allow inbound ephemeral ports for the replies. AWS suggests the range 1024-65535 to cover every client operating system.

```text
Inbound
Rule  Type         Port range    Source         Action
100   HTTPS        443           0.0.0.0/0      ALLOW
110   Custom TCP   1024-65535    0.0.0.0/0      ALLOW
*     All traffic  All           0.0.0.0/0      DENY
Outbound
Rule  Type         Port range    Destination    Action
100   HTTPS        443           0.0.0.0/0      ALLOW
110   Custom TCP   1024-65535    0.0.0.0/0      ALLOW
*     All traffic  All           0.0.0.0/0      DENY
```

| Requirement | Answer |
| --- | --- |
| Block one malicious IP range for a whole subnet | Network ACL deny rule numbered before the allow rules |
| Allow the app tier only from the web tier, whatever their IPs | Security group rule that references the web tier's security group |
| Allow outbound to S3 through a gateway endpoint | Security group outbound rule to the S3 prefix list (network ACLs can't reference prefix lists) |

> **Exam trap.** Security groups can't deny. "Block a specific address" is a network ACL rule (or AWS WAF for HTTP traffic), never a security group change.

<!-- section: vpc-endpoints | objectives: 5.1.2 -->
## VPC endpoints and AWS PrivateLink

**Gateway endpoints** serve Amazon S3 and DynamoDB only. They don't use PrivateLink and cost nothing: you choose route tables, and AWS adds a route whose destination is the service's prefix list. Those routes can't be edited, the endpoint works only for the same Region, and resources in a peered VPC can't use it.

**Interface endpoints** (PrivateLink) create network interfaces with private IPs in the subnets you choose, protected by a security group, for most AWS services, for endpoint services of other accounts and for Marketplace partners. With **private DNS** (it requires the VPC attributes `enableDnsSupport` and `enableDnsHostnames`), the service's default hostname resolves to the endpoint inside the VPC, so applications need no change. They are charged per hour per AZ and per GB, and they are reachable from peered VPCs, VPN and Direct Connect.

| Need | Endpoint |
| --- | --- |
| Private-subnet instances read S3 in the same Region, at no cost | Gateway endpoint for S3 |
| On-premises servers reach S3 over Direct Connect without the internet | Interface endpoint for S3 |
| Instances without internet use Systems Manager, ECR, CloudWatch Logs | Interface endpoints for each service |
| Offer our service to other accounts' VPCs without peering | Endpoint service (PrivateLink) behind a Network Load Balancer; consumers create interface endpoints, we accept the requests |
| Send traffic through a fleet of third-party firewall appliances | Gateway Load Balancer endpoint |

An **endpoint policy** (default: full access) limits what can be done through the endpoint; the resource side can require the endpoint with `aws:SourceVpce`.

```bash
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-0abc1234def567890 \
  --vpc-endpoint-type Gateway \
  --service-name com.amazonaws.eu-west-1.s3 \
  --route-table-ids rtb-0a1b2c3d4e5f67890 rtb-0f9e8d7c6b5a43210
```

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyAccessOutsideEndpoint",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::example-corp-exports", "arn:aws:s3:::example-corp-exports/*"],
      "Condition": { "StringNotEquals": { "aws:SourceVpce": "vpce-0123456789abcdef0" } }
    }
  ]
}
```

> **Exam trap.** A gateway endpoint applies only to subnets whose route tables you selected; instances in other subnets still go through the NAT gateway. And S3 traffic to a bucket in another Region never uses the gateway endpoint.

<!-- section: vpc-peering | objectives: 5.1.2 -->
## VPC peering

A **VPC peering connection** links two VPCs, in the same or different accounts and Regions, with private routing. One side requests, the other accepts, then **both** sides add routes to the other CIDR and open their security groups.

| Rule | Consequence |
| --- | --- |
| No overlapping CIDR blocks, on any of the VPCs' CIDRs | Re-address one VPC or use another connectivity option |
| No transitive peering | A–B and A–C don't connect B and C; create B–C |
| No edge-to-edge routing | B can't use A's internet gateway, NAT gateway, VPN, Direct Connect or S3 gateway endpoint |
| Security group references across the peering | Same Region only |
| Private DNS names of the peer | Turn on DNS resolution support for the peering connection |

VPC peering has no hourly charge, only data transfer. When dozens of VPCs must reach each other, AWS Transit Gateway provides transitive hub-and-spoke routing, at an attachment-hour and per-GB cost.

> **Exam tip.** After a peering connection becomes active, "connection timed out" between the VPCs is almost always a missing route on one side or a security group that doesn't allow the peer's CIDR.

<!-- section: network-protection-audit | objectives: 5.1.3 -->
## Auditing network protection services in one account

An audit checks three things for each service: it protects the right resources, its rules do what is intended, and it produces logs and metrics someone can review.

| Service | What to verify | Where the evidence is |
| --- | --- | --- |
| AWS WAF | Protection pack (web ACL) associated with each ALB, CloudFront distribution or API Gateway stage; default action; managed rule groups tested in Count before Block | Logs to CloudWatch Logs, S3 or Data Firehose (names start with `aws-waf-logs-`, same Region and account as the web ACL); metrics `AllowedRequests`, `BlockedRequests`, `CountedRequests` in `AWS/WAFV2`; sampled requests |
| AWS Shield | Shield Standard protects every account automatically; Shield Advanced protects only resources you add (CloudFront, Route 53 hosted zones, Global Accelerator, Elastic IPs, ALB, CLB) | `AWS/DDoSProtection` metrics (`DDoSDetected`, `DDoSAttackBitsPerSecond`), in us-east-1 for CloudFront and Route 53 |
| AWS Network Firewall | Route tables send traffic through the firewall endpoints; stateless and stateful rule groups in the firewall policy | Flow, alert and TLS logs, produced only for traffic forwarded to the stateful engine; CloudWatch metrics for both engines |
| Route 53 Resolver DNS Firewall | Rule groups associated with each VPC; rule order by priority; fail-closed (default) or fail-open setting | Resolver query logs with the DNS Firewall action; CloudWatch metrics |

DNS Firewall rule actions are ALLOW, ALERT (let the query through and log it) and BLOCK, which answers NODATA, NXDOMAIN or an OVERRIDE CNAME. Use ALERT to measure a new block list before enforcing it. In fail-closed mode, the Resolver answers SERVFAIL when DNS Firewall can't evaluate a query; fail-open favors availability. DNS Firewall sees queries that go through the Resolver; Network Firewall sees network and application traffic but not those Resolver queries.

Complementary evidence: CloudTrail records configuration changes to all four services (a deleted rule, a disassociated web ACL), and AWS Config rules such as `wafv2-logging-enabled` flag protections without logging.

> **Exam trap.** A rule that "should have blocked" traffic but appears only in alert logs or in `CountedRequests` is set to ALERT or Count. Change the action to BLOCK after validation; don't add a second rule.

<!-- section: network-cost | objectives: 5.1.4 -->
## Optimizing network costs

Network bills come from hourly resources (NAT gateways, interface endpoints, Transit Gateway attachments, public IPv4 addresses) and from bytes (NAT gateway processing, cross-AZ, cross-Region and internet data transfer).

| Cost driver | Optimization |
| --- | --- |
| NAT gateway processing for traffic to S3 or DynamoDB | Gateway endpoints: no hourly or processing charge |
| NAT gateway processing for heavy traffic to other AWS APIs (ECR pulls, CloudWatch Logs) | Interface endpoints, when their hourly and per-GB cost is lower than NAT processing |
| Instances in one AZ using a NAT gateway in another | One NAT gateway per AZ with matching routes, or a regional NAT gateway, to avoid cross-AZ charges and AZ dependency |
| Chatty tiers spread across AZs | Keep high-volume component pairs in the same AZ when availability allows; cross-AZ transfer is charged in each direction |
| Public IPv4 addresses, in use or idle | Release unassociated Elastic IPs (IPAM Public IP insights lists them); use private addressing behind load balancers; IPv6 with an egress-only internet gateway |
| Internet data transfer for static or cacheable content | CloudFront in front of the origin |
| A few VPC-to-VPC links | VPC peering (no hourly charge) instead of Transit Gateway |

Find the culprit before changing the design: Cost Explorer grouped by usage type (types ending in `NatGateway-Bytes`, `NatGateway-Hours`, `DataTransfer-Regional-Bytes`), NAT gateway metrics such as `BytesOutToDestination`, and VPC Flow Logs queried for the top destinations.

```bash
aws ce get-cost-and-usage \
  --time-period Start=2026-10-01,End=2026-11-01 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=USAGE_TYPE
```

> **Exam tip.** "Most of the NAT gateway bill comes from instances downloading objects from S3" has one answer: an S3 gateway endpoint on the private subnets' route tables. It is free, needs no application change and removes the processing charge.

<!-- section: key-points -->
## Key points

- Subnets: one AZ, 5 reserved addresses; public means a route to an internet gateway; most specific route wins.
- Zonal NAT gateway in a public subnet per AZ; regional NAT gateway spans AZs without a public subnet; egress-only internet gateway for IPv6.
- Security groups: stateful, allow only, reference groups; network ACLs: stateless, ordered allow and deny, ephemeral ports.
- Gateway endpoints for S3 and DynamoDB are free and route-table based; interface endpoints use PrivateLink, security groups and private DNS.
- Peering: no overlap, no transitivity, no edge-to-edge routing; routes and security groups on both sides.
- Audit WAF, Shield, Network Firewall and DNS Firewall by association, rule actions, logs and metrics; ALERT and Count only observe.
- Network savings: gateway endpoints, same-AZ NAT routing, release idle public IPv4, CloudFront, peering for a few links.
