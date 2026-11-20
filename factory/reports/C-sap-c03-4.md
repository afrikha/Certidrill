# C-sap-c03-4 — COURSE SAP-C03, chapters 31–34 (2026-11-20)

## Output
- `content/sap-c03/course/chapters/{31-pricing-models,32-data-transfer-costs,33-cost-allocation,34-storage-database-costs}.{en,fr}.md` (8 files). `course.yaml` not touched.
- `npx tsx factory/check-cert.ts sap-c03 31-pricing-models 32-data-transfer-costs 33-cost-allocation 34-storage-database-costs` → course problems (your chapters): 0.
- English words (my counter: code blocks and markers excluded, numbers and inline code included): 31 = 2,128; 32 = 2,174; 33 = 1,993; 34 = 2,199.
- Coverage: 31 → 3.1.1 (purchase-portfolio, spot-at-scale), 3.1.2, 3.1.3, 3.1.4; 32 → one section per objective 3.2.1–3.2.5; 33 → 3.3.1–3.3.5; 34 → 3.4.1–3.4.5.
- Code fences: bash, json, yaml, text only (the Athena SQL query is in a `text` fence). No links. No Lambda maximum timeout stated. No closed service used as an answer.

## Verified on AWS pages this session (WebFetch)
- Step Functions Standard vs Express (1 year / 5 minutes, semantics, billing, `.sync`/callback not in Express, 90-day history).
- Bedrock service tiers (Reserved/Priority/Standard/Flex, `service_tier` values, Reserved minimums 100,000 input / 10,000 output TPM, 1- or 3-month terms); pricing page: Priority +75 %, Flex −50 %, batch −50 % (select models), Intelligent Prompt Routing up to 30 %, Provisioned Throughput no-commit/1/6 months, Custom Model Import per CMU-minute, 5-minute windows, scale to zero after 5 min.
- Bedrock cross-Region inference (geographic vs global, ~10 % savings, no routing cost, source-Region price, SCP `unspecified`, CloudTrail `additionalEventData.inferenceRegion`, no Provisioned Throughput). Prompt caching (5-min default TTL, 1 h for some Claude models, writes may cost more, on-demand only, per-Region cache entries).
- Bedrock cost attribution: application inference profiles with tags; IAM principal cost allocation (CUR 2.0 `line_item_iam_principal`, `iamPrincipal/` tags, larger CUR); CUR usage types incl. cache read/write tokens.
- Compute Optimizer resources, 14/32/93-day lookbacks, CPU thresholds/headroom, memory headroom, presets. Fargate Spot (two-minute warning, SIGTERM, `stopTimeout` ≤ 120 s default 30, no fallback, base/weight rules); Fargate pricing (Spot up to 70 %, Savings Plans up to 50 %). Graviton page (up to 20 % lower cost, up to 60 % less energy). Lambda durable functions (one year, no compute charge while waiting).
- Savings Plans types and discounts (66/72/35/64 %), Database SP coverage. RDS reserved DB instances (No Upfront 1 year only, size flexibility list, Multi-AZ, cannot cancel). Aurora pricing (I/O-Optimized ~30 % instance premium, 25 % rule, up to 40 %, switch once per 30 days, RI 45/66 %, buy ~30 % more RIs, backup free to 100 %, Global Database replicated write I/Os). DynamoDB capacity modes (on-demand default/recommended) and global tables pricing (rWRU/rWCU, no reserved rWCU, restore charge, Standard-IA example prices).
- CloudFront origin failover (status codes, GET/HEAD/OPTIONS, 10 s × 3 defaults) and Origin Shield (Region choice, charging rules, use cases). S3 pricing (replication charges, RTC, Batch Replication example, MRAP $0.0033/GB). Transit Gateway, PrivateLink (incl. cross-Region), VPC Lattice, Cloud WAN and VPC (peering, NAT, regional NAT) pricing pages.
- Tag policies (enforced_for, untagged not evaluated, `report_required_tag_for` + IaC fail/warn), cost allocation tag activation timing, Data Exports (CUR 2.0, FOCUS 1.2/1.0, recommendations, carbon, dashboard), split cost allocation data (ECS, EKS incl. accelerators, networking NAT/EC2/peering, S3 prefixes), cost categories, split charges (10 rules, only on the details page), Budgets overview, Cost Explorer (13 months, 18-month forecast, $0.01/request), Cost Anomaly Detection (frequency, managed vs customer monitors, limits 10/5,000, alert types, thresholds AND/OR).
- S3 Intelligent-Tiering tiers and 128 KB rule; Lifecycle waterfall, 128 KB default, 40 KB overhead, Glacier minimum durations. EBS gp3/gp2 (**gp3 now 64 TiB, 80,000 IOPS, 2,000 MiB/s**) and io1/io2 Block Express. EFS lifecycle defaults (files stay in IA/Archive on access by default). AWS Backup lifecycle/cold storage table and 90-day rule; DLM quotas and policy rules (archiving, FSR, cross-Region copy). CloudWatch log classes and pricing page.

## Taken from other reports, not re-fetched
- S3 Lifecycle 30-day transition rule removed in July 2026 and the 30-day minimum charge of Standard-IA/One Zone-IA (C-saa-c03-5); Database Savings Plans 1-year No Upfront and no combination with RIs (C-saa-c03-5); Aurora Serverless v2 auto-pause at 0 ACUs (C-saa-c03-5); EBS Snapshots Archive up to 75 % cheaper (C-soa-c03-2); cross-account observability no extra charge (C-soa-c03-1); CloudFront VPC origins (C-soa-c03-4); Budget actions IAM/SCP/stop EC2-RDS (saa chapter 43); inter-AZ $0.01/GB each way.

## General knowledge, not confirmed on a page fetched in this session
- Discount application order (RIs, then EC2 Instance SP, then Compute SP); Standard RIs resellable / Convertible exchangeable; DynamoDB reserved capacity 1 or 3 years.
- Attribute-based instance selection, Capacity Rebalancing; predictive/step scaling descriptions; Lambda billing (requests + duration × memory, memory sets CPU).
- S3 RTC "most objects in seconds, 15-minute SLA"; cache policy vs origin request policy; NLB cross-zone off by default (from saa chapter); EKS topology-aware routing.
- Config `required-tags` (up to six keys); tag-on-create SCP syntax; tag policy resource type `rds:db`; CUR 2.0 column names `resource_tags['user_cost_center']`, `bill_billing_period_start_date`, `line_item_unblended_cost`; Bedrock CLI `create-inference-profile --model-source copyFrom=... --tags key=,value=` (the doc page shows only the API).
- AWS Billing Conductor (pro forma billing groups); Budgets filters on tags/cost categories and approval for actions; st1/sc1 positioning; CloudWatch agent `aggregation_dimensions` example.

## Notes for reviewers
- CloudWatch Logs docs now name the Infrequent Access class **"Essentials (formerly Infrequent Access)"**; chapter 34 uses that name. The pricing page still says Infrequent Access ($0.25 vs $0.50/GB ingestion).
- Saa-c03 chapters may quote older gp3 maximums (16,000 IOPS / 1,000 MiB/s / 16 TiB); current docs give 80,000 IOPS / 2,000 MiB/s / 64 TiB.
- Compute Savings Plans "up to 66 %" (Savings Plans guide) vs "up to 50 % on Fargate" (Fargate pricing page): both true for their scope; chapter 31 quotes 66 % for the plan.
- French to review: « répartition fractionnée des coûts » (split cost allocation data), « répartition des frais » (split charges), « journaux vendus (vended logs) », « fonctions durables Lambda », « périphérie de réseau central », « robot d'indexation (crawler) ».
