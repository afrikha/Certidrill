# Q-sap-c03-3c — report

36 questions in `content/sap-c03/questions/cost/` (prefix `sapc03-3c-`): 6 per objective (3.3.5, 3.4.1–3.4.5), single 30 / multi 6 (one per objective, one "Choose three"), difficulty 5 easy / 18 medium / 13 hard, single answers a 8 / b 8 / c 7 / d 7. Validator: 0 problem(s).

## Facts verified on AWS pages (Nov 2026) that differ from older knowledge
- gp3 now goes up to 80,000 IOPS, 2,000 MiB/s, 64 TiB (500 IOPS/GiB). Used in `io1-to-gp3-20k` (gp3 replaces io1 at 20,000 IOPS).
- CloudWatch Logs Infrequent Access log class is now named **Essentials** (both values accepted). Questions say "Essentials (formerly Infrequent Access)" in the explanation.
- CloudWatch Logs account-level **retention policies** (PutAccountPolicy RETENTION_POLICY): override log-group retention even when longer; overlapping policies → longest wins; per Region, up to 20.
- Database Savings Plans: 1-year, No Upfront only, generation 7+ instances only, flexible across engine/deployment/Region; cannot combine with RIs on the same workload.
- Aurora mixed-configuration clusters: Serverless v2 readers in promotion tiers 0–1 follow the provisioned writer's capacity; tiers 2–15 scale independently (used in `aurora-mixed-cluster`).
- Cost Anomaly Detection does not monitor third-party Marketplace products (except third-party Bedrock FMs); Budgets "Billing entity" filter covers Marketplace.

## Deviations / doubts
- Multi stems carry the "NOTE: Each correct selection is worth one point." line, as BRIEF.md and all other AWS banks do, although the SAP-C03 blueprint scores multi all-or-nothing (some SAA-C03 4c files omit it). Remove the line bank-wide if the all-or-nothing rule is implemented.
- Not verified on a fetched page, stated from general AWS knowledge: S3 Intelligent-Tiering archive configurations can be filtered by object tag (`it-tenant-tag-archive`); stopped RDS DB instances restart automatically after 7 days (distractor explanation in `rds-export-deep-archive`); Cost Explorer rightsizing covers EC2 only (distractor in `optimizer-org-ebs-export`); AWS Backup EBS cold storage is not applied without `OptInToArchiveForSupportedResources` (inferred from the plan options page).
- The Cost Anomaly Detection EventBridge page does not say whether events honour subscription thresholds; `anomaly-eventbridge-ticket` therefore filters on `detail.impact` with numeric matching in the rule, which works either way.
- No course chapters existed for these objectives at writing time; alignment with the parallel course should be checked.
