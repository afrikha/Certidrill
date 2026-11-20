# C-sap-c03-2 — COURSE SAP-C03 (2026-11-20)

Chapters written (EN + FR): 14-hybrid-integration, 15-network-architectures, 16-data-storage-databases, 21-identity-security. All 22 objectives (1.3.1–1.3.5, 1.4.1–1.4.5, 1.5.1–1.5.7, 2.1.1–2.1.5) covered. `check-cert.ts`: 0 problems for these chapters.

Prose word counts (code and markers excluded, tables included): 2,234 / 2,030 / 2,213 / 1,935. Chapters 14 and 16 are at the 2,200 ceiling (16 covers 7 objectives).

## Verified on AWS pages (2026-11-20)
- Transit gateway route evaluation order, default MED (0 DX / 100 VPN), ECMP rules, appliance mode, SG referencing (inbound only, same TGW), TGW does not resolve PHZ names, 100 Gbps per VPC attachment per AZ, 5,000 attachments.
- Direct Connect resiliency models and SLA targets, DX gateway quotas (6 TGWs, 20 VGWs), route quotas (100 → 1,000 with prefix controls, 200 per TGW on transit VIF, 5,000 to Cloud WAN), private IP VPN (5,000/1,000 routes).
- VPN 1.25 / 5 Gbps per tunnel. Storage Gateway types; **FSx File Gateway no longer available to new customers** (no date on page). DataSync Enhanced vs Basic modes. Transfer Family protocols. Data Transfer Terminal (page says it is currently available only to Enterprise Support customers; left out of the course).
- API Gateway REST integration timeout 50 ms–29 s, raisable for Regional/private only; 10 MB payload; 300 KB mapping template.
- **Route 53 Resolver is now documented as "Route 53 VPC Resolver"**; endpoint quotas (6 IPs, 10,000 UDP QPS per IP), Profiles quotas, 300 VPCs per PHZ.
- ECS Anywhere limits, EKS Hybrid Nodes, EKS Anywhere, Outposts form factors, AWS Transform transformation types.
- Cloud WAN, VPC Lattice, PrivateLink cross-Region, IPAM scopes/pools, DNS64/NAT64, Network Firewall TGW attachment, WAF resources (includes Bedrock AgentCore Gateway), Route 53 policies, ARC (Region switch, routing control), Global Accelerator.
- Aurora Global Database (10 secondary Regions, 16 instances per secondary), DynamoDB MREC/MRSC, Multi-AZ DB cluster, RDS replicas, EBS (gp3 80,000 IOPS / 2,000 MiB/s / 64 TiB), EFS performance, S3 Tables, Lake Formation cross-account, Clean Rooms, Redshift data sharing and zero-ETL sources, MSK Express brokers, DAX consistency, ElastiCache engines.
- Identity Center (instances, SCIM token 1 year, multi-Region replication), Pod Identity (target role, session tags, no Fargate), Roles Anywhere, RCPs, data perimeter keys, Access Analyzer analyzers, external ID, session policies, Cognito feature plans, Verified Access (trust providers, endpoint types, non-HTTP via Connectivity Client).

## From knowledge, not re-fetched (believed current; reviewer may check)
- Direct Connect local preference communities 7224:7100/7200/7300.
- Verified Access device trust provider names (CrowdStrike, Jamf, JumpCloud).
- Roles Anywhere certificate attributes as principal tags (`aws:PrincipalTag/x509Subject/CN`) and `aws_signing_helper credential-process` flags.
- Resolver endpoint minimum of two IP addresses; EventBridge Pipes Amazon MQ source; Redshift streaming ingestion; ElastiCache Global Datastore; role chaining 1-hour limit.

## Notes
- ElastiCache docs now mention a "durability" option for node-based Valkey clusters (Multi-AZ transactional log); not mentioned in the course, MemoryDB kept as the durable in-memory answer.
- Code fences used: bash, json, text only.
