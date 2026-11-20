# Q-soa-c03-2c — report

48 questions in `content/soa-c03/questions/reliability/` (prefix `soac03-2c-`): 2.3.2 = 16, 2.3.3 = 16, 2.3.4 = 16; single 40, multi 8 (7 "Choose two" with 5 options, 1 "Choose three" with 6 options: `dr-pilot-light-failover`); difficulty 14 easy / 23 medium / 11 hard. Validator: 0 problem(s).

## Sources
Every fact was checked on an AWS documentation page fetched on 2026-11-20 (RDS PITR, rename, retained and replicated automated backups, read replica promotion, snapshot restore; Aurora PITR, cloning, Backtrack, global database switchover/failover; DynamoDB PITR, restore, global tables MREC/MRSC; AWS Backup continuous backups, cross-Region copy, restore testing, logically air-gapped vault; EBS fast snapshot restore and snapshot copy; S3 Versioning, suspended behaviour, delete markers, restoring versions, MFA delete, lifecycle elements, Object Lock configuration, replication of deletes, GetObject/DeleteObject permissions, archive retrieval; FSx for Windows shadow copies and backups; FSx for ONTAP snapshots and file restore; DR whitepaper; ARC routing control, zonal shift, supported resources, Region switch; Global Accelerator traffic dials; EC2 AMI copy; CloudFormation Mappings).

## Points to note
- ARC Region switch: the fetched page does not list execution block types, so the question stays generic ("fail over the database and redirect traffic"). ARC readiness check carries an "availability change" banner: not used.
- The DR whitepaper says AWS Backup has no scheduled restores; this is outdated (AWS Backup restore testing exists, verified on its own page). The restore-testing question follows the restore testing page.
- `dr-ga-traffic-dial` relies on Global Accelerator endpoint weights going up to 255 (general knowledge, not on the fetched page); it is only a distractor detail.
- FSx for OpenZFS (out of scope) and AWS Elastic Disaster Recovery (not listed in the guide) were not used as answers.
- No overlap of decisions with the SAA-C03 DR questions (strategy choice by RTO/RPO, Aurora switchover for drills, backtrack, CRR existing objects): these questions test operator procedures instead.
