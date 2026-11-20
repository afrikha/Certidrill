# Q-sap-c03-4b — QUESTIONS SAP-C03, resilience 4.2.1–4.2.6 (2026-11-20)

42 questions (`sapc03-4b-*`, 7 per objective), single 35 / multi 7, difficulty 6 easy / 21 medium / 15 hard. Validator: `0 problem(s)`.

## Service status respected
- ARC readiness check is no longer open to new customers (AWS page "readiness check availability change"); used only as a distractor, with the reason stated. Region switch (plan evaluation every 30 min) is the replacement.
- Systems Manager Change Manager closed to new customers on Nov 7, 2025 (verified); Incident Manager has an availability-change page too. Neither is used anywhere.
- AWS Transform MGN appears only as a distractor (migration service, not DR). No Migration Hub, ADS, Snow Family, OpsWorks, Amazon Q Developer. No Lambda timeout dependency.

## Facts used but not fetched on an AWS page (well known, kept)
- CloudFront origin failover only for GET/HEAD/OPTIONS (s3-mrap-failover, option a).
- S3 Replication Time Control 99.99 % within 15 minutes (arh-region-breach-fix).
- ECS Service Connect scope is Regional (ecs-regional-clusters, eks-lattice-multicluster distractors).
- VPC Lattice weighted forwarding to several target groups and target-group health checks (eks-lattice-multicluster): the Lattice overview confirms target groups incl. Kubernetes pods, RAM sharing and overlapping CIDRs, but not weights/health checks explicitly.
- FIS stop condition using an alarm defined in the orchestrator account through CloudWatch cross-account observability (fis-multi-account-test): the stem states the alarm lives in the orchestrator account to avoid the question.
- Elastic IPs are Regional; KMS key material cannot be exported (standard facts).

## Reference titles not confirmed verbatim
Taken from search-result titles or inferred: "What is AWS Resilience Hub?", "Multi-account experiments for AWS FIS", "Disaster recovery options in the cloud", "How AWS Global Accelerator works", "Private image replication in Amazon ECR", "What is Amazon VPC Lattice?", "Restore testing", "Point-in-time recovery for DynamoDB", "AWS DRS replication settings", "AWS Elastic Disaster Recovery endpoints and quotas". All URLs were fetched.

## Notes
- Four first drafts (backup-and-restore tier, pilot light, warm standby, Global Accelerator fixed IPs) were replaced because they duplicated SAA-C03 decisions (`saac03-2d-dr-*`, `saac03-2b-ga-udp-multiregion`); 4.2.1 now tests DR dependencies (Managed AD multi-Region replication, KMS multi-Region keys, Secrets Manager replicas) plus corruption/RPO bounding.
- `fis-multi-account-test` (4.2.5) is an AZ-level test; it may sit close to 4.3.2/4.3.5 (batch 4c).
- DRS defaults used: PIT 10 min/1 h, hourly/24 h, daily/7 days (default), 300 replicating servers per account not adjustable, private IP replication option, post-launch actions (process and HTTP validation), failback client delta sync.
