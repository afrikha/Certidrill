# C-saa-c03-6 — COURSE SAA-C03, chapters 46, 47, 48 (2026-11-19)

## Output
- `content/saa-c03/course/chapters/46-database-retention-migration.{en,fr}.md` — 6 sections + key points (4.3.3, 4.3.6, 4.3.8, 4.3.4, 4.3.10, 4.3.14).
- `47-network-transfer-costs.{en,fr}.md` — 7 sections + key points (4.4.10, 4.4.3, 4.4.4, 4.4.8, 4.4.7, 4.4.11, 4.4.13).
- `48-connectivity-costs.{en,fr}.md` — 7 sections + key points (4.4.1, 4.4.2, 4.4.5, 4.4.9, 4.4.6, 4.4.14, 4.4.12).
- `check-cert.ts saa-c03 46-… 47-… 48-…`: course problems (your chapters) 0.
- English length (my counter, numbers included): about 2,200 / 2,230 / 2,200 words; at the top of the 1,300–2,200 range.

## Sources and method
- All facts read with WebFetch (docs.aws.amazon.com, aws.amazon.com pricing/blogs); the fetch tool summarises pages, so exact quotes were not always available.
- Prices are labelled as US examples from AWS pricing pages: NAT gateway $0.045/h + $0.045/GB (US East (Ohio) example), Transit Gateway $0.05 per VPC attachment-hour + $0.02/GB (Ohio example), S2S VPN $0.05/h (Ohio), Large Bandwidth Tunnel $0.60/h, Direct Connect port-hours ($0.30 1G, $2.25 10G dedicated), Global Accelerator $0.025/h, interface endpoint ~$0.01/h per AZ + $0.01/GB, public IPv4 $0.005/h, inter-AZ $0.01/GB each direction.

## Recent features included (verified)
- Regional NAT gateway (`--availability-mode regional`, billed per active AZ, no public subnet, public NAT only, up to 60 min AZ expansion).
- CloudFront flat-rate pricing plans (Free, Pro, Business, Premium).
- Site-to-Site VPN Large Bandwidth Tunnels (5 Gbps, transit gateway / Cloud WAN only).
- ElastiCache Valkey pricing (33 % lower serverless, 20 % lower node-based); DMS Schema Conversion free; DMS Serverless 1–384 DCUs.

## Stated from general knowledge, not confirmed on a fetched page
- AWS Client VPN is OpenVPN-based; Direct Connect provisioning "often weeks"; Direct Connect DTO rates lower than internet DTO (pricing page gives the model, not the comparison); MACsec "on supported dedicated connections" (speeds not checked).
- Direct Connect VIF types (private, transit, public); Transit Gateway can't route between attachments with overlapping CIDRs; S3 origin access control.
- ALB cross-zone traffic not billed as inter-AZ: from the AWS Networking blog on NLB data transfer costs ("aren't charged when using ALBs and CLBs"), not from the ELB pricing page.
- DynamoDB in-Region transfer free: from the AWS Architecture blog on data transfer costs (gateway endpoints "without incurring data transfer charges").

## Deviations / notes
- Lambda docs now say "Event Function" in the concurrency page; the chapter just says "function".
- DynamoDB Standard-IA table class is mentioned briefly in 46 (retention) although table classes are closer to chapter 45; no figures given.
- The Memcached caching-strategies page was used for lazy loading / write-through / TTL (same concepts for Valkey/Redis OSS).
