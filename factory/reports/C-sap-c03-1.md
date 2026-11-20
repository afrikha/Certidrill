# C-sap-c03-1 — course SAP-C03, chapters 00, 11, 12, 13 (EN + FR)

Checker: `course problems (your chapters): 0`. 8 files, all `draft`; course.yaml untouched. Prose words (no code, no table pipes): 00: about 1,670; 11: about 2,280; 12: about 2,100; 13: about 1,840 (11 is a little over 2,200 because of its 6 dense objectives; same counting gives SAA-C03 chapters 2,180–2,230).

## Sources fetched (2026-11-20)

- Lambda: quotas (**max timeout 1,800 s = 30 min**; 90 min for Managed Instances async/ESM; 6 MB sync, 1 MB async, 200 MB streamed; 1,000 concurrency; 1,000 environments per 10 s per function); durable functions (overview, best practices, getting started, CLI page: `--durable-config` ExecutionTimeout/RetentionPeriodInDays, enable at creation only, qualified ARN, sync within 30 min, DLQ, no automatic retry, Python/Node.js/Java); provisioned concurrency + Application Auto Scaling; tenant isolation mode; Kinesis ESM (ParallelizationFactor 1–10, batching window 5 min).
- Step Functions: workflow type comparison; quotas (256 KiB, 25,000 events, 90-day history, 10,000 Distributed Map children, redrive 14 days); cross-account access (no cross-Region).
- EventBridge: cross-account bus-to-bus (role required after March 2, 2023, sender charged, not transitive); direct cross-account targets (SQS, SNS, Lambda, KDS, API Gateway, same Region); cross-Region; global endpoints (RTO/RPO 360 s, max 420 s); retry policy (24 h / 185).
- SQS FIFO exactly-once (5-min dedup) and high-throughput partitions (300 / 3,000 per partition). Kinesis key concepts (shard limits, MD5, retention, data delivery to S3 Tables Iceberg). Firehose dynamic partitioning.
- API Gateway: quotas; WebSocket quotas (500 new conn/s, 2 h, 10 min idle, 128 KB / 32 KB frames, 29 s); routes; @connections; private integration with VPC link V2 to ALB/NLB for REST.
- App Mesh end of support (September 30, 2026). VPC Lattice overview and auth policies. ECS Service Connect. ECS capacity providers (Managed Instances). ECS service auto scaling (predictive, SQS backlog). EKS Auto Mode (21-day nodes). EKS Cluster Autoscaler best practices. AWS Load Balancer Controller (Gateway API from 2.14).
- ECR image scanning (basic vs enhanced), lifecycle policies and parameters (archive storage class, sinceImagePulled, transition action).
- CloudFront: Functions vs Lambda@Edge table, restrictions on all edge functions (no combination on viewer events), Lambda@Edge restrictions.
- Cognito multi-tenant best practices and custom-attribute page; SaaS Lens silo/pool/bridge.
- Bedrock: cross-Region inference (geographic vs global, ~10 %, SCP `unspecified`), inference profiles, service tiers (Reserved/Priority/Standard/Flex), Knowledge Bases vector stores, chunking, retrieval configuration (hybrid, filters, reranking, decomposition, implicit filtering, guardrails). Organizations Bedrock policies (guardrail enforcement).
- AgentCore: overview (services list), Runtime how it works (microVM, 8 h, 15 min idle, HTTP/MCP/A2A, IAM or OAuth), Gateway.
- SageMaker AI: inference options (25 MB / 60 s / 8 min streaming; serverless 4 MB; async 1 GB / 1 h), serverless endpoints (1–6 GB, 200 per endpoint, exclusions), scale to zero (inference components), deployment guardrails.

## Decisions and deviations

- Lambda maximum timeout written as 30 minutes (verified); never 15.
- App Mesh presented as discontinued (date passed), never an answer; Service Connect and VPC Lattice as successors.
- 00: closures table from the profile (Migration Hub/ADS, Snow, OpsWorks, App Mesh, Q Developer → Kiro), names (Transform MGN, Amazon Quick), CodeCommit valid. Exam facts from the profile and A-aws-6 report (300 USD, languages, Pearson VUE).
- EventBridge "event-busv2" custom bus restriction on cross-Region targets and global endpoints left out (unclear new concept).
- Lambda "Event Function" renaming seen on Lambda pages ("previously known as a Lambda function"): not used; chapters keep "Lambda function". Reviewers may want a mention.
- AgentCore newer services (Harness, Payments, Optimization, Registry) not covered; Policy described as Cedar-compatible (page names the "Dogwood" language).
- "Fully managed knowledge bases" (new KB type on the retrieval page) not covered.

## Not verified (stable knowledge; review)

- EventBridge "at least once" and "no ordering" wording; SNS FIFO delivering to SQS queues; Powertools idempotency.
- `execute-api:ManageConnections` action name; Firehose Parquet/ORC conversion and Iceberg destination; Glue job bookmarks, Athena partition projection and workgroup limits.
- EKS Pod Identity/IRSA, Fargate pods requiring `ip` target type, IngressGroup annotation `group.name`, KEDA, Karpenter description.
- ECR replication, pull through cache, tag immutability; Inspector findings to Security Hub.
- Cognito "user pool per tenant for per-tenant MFA/IdP" (trap) inferred from the custom-attribute page; Aurora PostgreSQL RLS; KMS encryption context in CloudTrail and key policy conditions; DynamoDB `LeadingKeys` with `${aws:PrincipalTag/TenantId}`.
- Bedrock Agents action groups; KB data source connectors list; SageMaker async SNS notifications and shadow tests; Bedrock VPC endpoints and invocation logging targets.
- 00 confusing-pairs one-liners (peering, Transit Gateway, Cloud WAN, Direct Connect not encrypted by default, Resolver endpoints, DR strategies, Elastic Disaster Recovery, Savings Plans vs RIs).
