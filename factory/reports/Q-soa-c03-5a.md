# Q-soa-c03-5a — QUESTIONS SOA-C03, domain networking (2026-11-20)

## Output
- 43 questions in `content/soa-c03/questions/networking/`, prefix `soac03-5a-`: 5.1.1 = 11, 5.1.2 = 11, 5.1.3 = 11, 5.1.4 = 10.
- Types: single 36, multi 7 (5 "Choose two" with 5 options, 2 "Choose three" with 6 options).
- Difficulty: 13 easy / 21 medium / 9 hard (30 / 49 / 21 %).
- Correct single answers: a 9, b 9, c 9, d 9. A script checked option lengths, and the options were rebalanced so that the correct one is never clearly the longest.
- `CERT=soa-c03 npx tsx factory/validate.ts --prefix soac03-5a-` gives 43 files and 0 problems.

## Angle and overlap
- The questions take an operator angle (fix, audit, CLI output, CloudFormation snippet, endpoint policy, route table exhibit). They avoid the SAA-C03 design decisions that already exist (NAT per AZ, gateway endpoints S3/DynamoDB, NACL ephemeral for public web servers, egress-only IPv6 design, SG referencing within a VPC, WAF SQLi/rate rules, Shield auto L7).
- I wrote and then removed a draft on cheaper IPv6 egress through an egress-only internet gateway, because it was too close to `saac03-2c-egress-only-ipv6`. A Traffic Mirroring session-cost question replaced it.
- 5.3.x (troubleshooting, flow logs) belongs to task 5b. Flow logs appear here only as a means (NAT top talkers, Parquet cost) or as a distractor.

## Sources
- Every fact was checked with WebFetch on docs.aws.amazon.com / aws.amazon.com pricing and FAQ pages: VPC (egress-only IGW, NAT gateways and their troubleshooting, regional NAT, BPA, prefix lists, subnet CIDR, route tables, route priority, IPv6 add, custom NACLs, flow log files/examples/limitations, IPAM public IP insights, Traffic Mirroring), PrivateLink (interface endpoints, endpoint services, concepts, S3 gateway endpoint, S3 PrivateLink inbound-only DNS), peering (basics, routing, DNS, SG references), Systems Manager endpoints, AL2023 repos, CloudFormation DependsOn, WAF (logging, CW Logs/S3 destinations, redaction/filters, testing), Shield metrics and health-based detection, Network Firewall (logging, destinations, metrics, CloudTrail, policy types), DNS Firewall (rule actions, VPC config, query log fields), Config rules (netfw-logging-enabled, wafv2-logging-enabled), CloudTrail event history, ELB/NLB cross-zone, Trusted Advisor cost checks, Compute Optimizer idle recommendations, VPC/Transit Gateway/PrivateLink pricing, CloudFront FAQ. Answers were model-summarised by WebFetch.
- Every reference URL was fetched. Three references are pricing/FAQ pages: `aws.amazon.com/vpc/pricing/` (title "Amazon VPC Pricing"), `aws.amazon.com/transit-gateway/pricing/` (title assumed "AWS Transit Gateway pricing"), and `aws.amazon.com/cloudfront/faqs/` (title assumed "Amazon CloudFront FAQs").

## Points worth a reviewer's look
- **Scoring NOTE on multi.** BRIEF.md requires "NOTE: Each correct selection is worth one point." on multi, and most SAA/DVA multi questions have it, so I added it. But the SOA profile and the blueprint say that multi is all or nothing, so the sentence contradicts the scoring. Decide globally.
- `soac03-5a-subnet-full-asg`: "a subnet's IPv4 CIDR cannot be resized" is inferred from the ModifySubnetAttribute API, which has no CIDR parameter (no page says it outright). The VPC page says this only for VPC CIDR blocks.
- `soac03-5a-cfn-route-dependson`: the error text is described, not quoted (the exact message was not verified). The explanation of the distractor `GatewayId: !Ref GatewayAttachment` assumes that Ref on the attachment does not return an IGW ID.
- `soac03-5a-ssm-endpoints`: the AWS page notes that from SSM Agent 3.3.40.0 the agent prefers ssmmessages over ec2messages. To keep ec2messages unambiguous, the stem says the agent is older than 3.3.40.0.
- `soac03-5a-netfw-stateless-logs`: Network Firewall now has "Next Generation" policies (recommended for new firewalls) as well as "Classic Network Firewall policies". The stem states a Classic policy, because stateless rule groups and the stateless/stateful engine logging rule are described for that model.
- `soac03-5a-nat-port-allocation`: 8 IPv4 addresses per zonal NAT gateway, 2 EIPs by default for public NAT gateways (quota increase), 55,000 connections per unique destination. A regional NAT gateway is used as a distractor only because it would require a route change (regional supports 32 IPs per AZ).
- `soac03-5a-tgw-peering-bypass`: the VPC pricing page lists no hourly or processing charge for peering and only cross-AZ transfer at $0.01/GB each way. "No processing charge" is stated from that absence.
- `soac03-5a-flow-logs-s3-parquet`: "S3 storage is cheaper than CloudWatch Logs for a year" is general pricing knowledge. The page verifies Parquet's 20 % storage saving and 10–100× query speed.
- `soac03-5a-nlb-cross-zone-cost`: the fact that EC2 data transfer charges apply with NLB cross-zone comes from the PrivateLink "Share your services" page, not from an ELB page.
- `soac03-5a-ta-inactive-endpoints`: Trusted Advisor also has "Inactive NAT Gateways" and "Idle NAT gateways" checks, and Compute Optimizer covers idle NAT gateways. For that reason no question asks for idle NAT gateway detection, which would have two valid answers.
- Naming in 2026 docs: the WAF pages say "protection pack (web ACL)", and the Route 53 pages say "VPC Resolver" alongside "Resolver". The questions use "web ACL" and "Route 53 Resolver" (the exam guide's wording), and the reference titles are kept exactly as published.
