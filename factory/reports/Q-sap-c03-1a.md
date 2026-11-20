# Q-sap-c03-1a — report

54 questions in `content/sap-c03/questions/architecture/`, prefix `sapc03-1a-`, 6 per objective 1.1.1–1.1.9.
Types: 45 single, 9 multi (8 × choose 2 of 5, 1 × choose 3 of 6). Difficulty: 8 easy / 27 medium / 19 hard.
Validator: `CERT=sap-c03 npx tsx factory/validate.ts --prefix sapc03-1a-` → 0 problem(s).

## Verified on AWS pages (Nov 2026) and used as deciding facts
- App Mesh end of support 30 Sept 2026 (console and resources no longer accessible) → App Mesh only as a wrong option.
- Lambda durable functions: execution timeout default 24 h, max 366 days; waits count against it; replay/steps/waits.
- EventBridge: one-hop rule for bus-to-bus; direct cross-account service targets (API GW, KDS, Lambda, SNS, SQS) same Region only, execution role required; IAM role required for cross-account bus targets after 2 March 2023; global endpoints (same bus name, replication needed for automatic recovery, RTO/RPO 360 s / 420 s max).
- SQS ESM: max concurrency 2–1,000, standard mode +300/min up to 1,250, provisioned mode (pollers, 10 invokes each, +1,000/min).
- Athena partition projection only for Athena (not Redshift Spectrum); ECR lifecycle `transition`/archive, `sinceImageTransitioned`, `tagStatus any` last; pull through cache (secret prefix, tag immutability blocks cache updates, first pull needs internet); repository creation templates (CREATE_ON_PUSH / PULL_THROUGH_CACHE / REPLICATION); Lattice auth policies not supported on resource configurations; EKS Pod Identity not supported on Fargate; ECS Fargate Windows Server 2019/2022.

## Not fully verified (general knowledge, kept because standard)
- SNS FIFO page fetched only partially (title confirmed); cross-account SQS FIFO subscription to SNS FIFO not re-read.
- ElastiCache intra-cluster replication being asynchronous; ECR encryption settings fixed at repository creation; EBS Multi-Attach same-AZ limit; Athena UPDATE/DELETE only on Iceberg tables.
- Capacity provider `base` semantics (page confirms only one provider can have a base).
- Durable functions "wait for callback": the Lambda page mentions waits for external callbacks; SDK method names not checked.
- AWS Gateway API Controller (Lattice) documented on gateway-api-controller.eks.aws.dev, so the question cites only the Lattice user guide.

## Deviations / notes
- Express vs Standard question uses 2,000 events/s to avoid depending on Region-specific StartExecution quotas.
- No answer depends on Lambda timeout limits, Migration Hub, ADS, Snow Family, OpsWorks or Amazon Q Developer.
