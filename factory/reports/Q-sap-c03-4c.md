# Q-sap-c03-4c — report

34 questions in `content/sap-c03/questions/resilience/` (prefix `sapc03-4c-`): 4.3.1 ×7, 4.3.2 ×7, 4.3.3 ×7, 4.3.4 ×7, 4.3.5 ×6; single 28, multi 6; difficulty 5 easy / 17 medium / 12 hard. Validator: 0 problem(s).

## Sources
Every reference was fetched with WebFetch on 2026-11-20 (AWS Backup, Organizations backup policies, Route 53 health checks, ARC practice runs, FIS scenarios/targets/multi-account/Lambda actions/logging/reports/stop conditions/safety lever, EBS snapshot lock, Recycle Bin, S3 Object Lock, KMS key deletion, DynamoDB PITR, ELB health checks, EC2 automatic recovery, Lambda SQS scaling, Well-Architected REL05-BP03, REL10-BP03, REL11-BP04, REL12-BP04). The hourly WebFetch limit was hit once; curl and the remote browser cannot reach docs.aws.amazon.com.

## Facts used but not confirmed on a fetched page (general knowledge, judged safe)
- Vault Lock compliance grace time minimum 3 days (`--changeable-for-days` ≥ 3): matches course chapter 43; used only in a distractor explanation (`ebs-lock-cooloff`).
- Route 53: a disabled health check is considered healthy for failover records (page confirms it only for calculated checks); invert semantics (`r53-invert-test`).
- DynamoDB deletion protection (not on the PITR page).
- S3: deleting a specific version in the source isn't replicated; replicas placed in an Object Lock destination receive its default retention (`s3-replica-vault`).
- RDS: the KMS key of an existing DB instance can't be changed (snapshot copy + restore) (`cross-account-rds-key`).

## Noticed while researching (may matter to other agents)
- Route 53 now offers **private endpoint health checks** (health check source in a VPC). Older "use a CloudWatch alarm health check for private endpoints" questions are no longer the only answer.
- S3 Object Lock now has **variable retention / event holds** (also in Batch Operations); replicas' min/max retention can be bounded via `s3:ReplicateObject` in the bucket policy.
- Lambda SQS event source mappings: maximum concurrency 2–1,000; provisioned mode (up to 100,000) can't be combined with it.
- FIS multi-account: safety lever must be engaged in the account and Region where experiments run; stop-condition alarms must be shared cross-account.
- Overlap avoided with SAA-C03 (backup policies basics, Vault Lock, air-gapped vault basics, Object Lock legal hold, Recycle Bin snapshots, retry jitter, RDS Proxy, static stability, EFS/sessions).
