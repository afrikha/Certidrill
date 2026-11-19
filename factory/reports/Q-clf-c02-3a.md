# Q-clf-c02-3a — report

48 questions `clfc02-3a-*` in `content/clf-c02/questions/technology/` (4 per objective 3.1.1–3.2.6), single 42 / multi 6, difficulty 19 easy / 22 medium / 7 hard. Validator: 0 problem(s). Course chapters 31/32 did not exist yet when the batch was written: re-check consistency once they land.

## Facts not confirmed on a page fetched during this task (kept because they are standard AWS facts; check in review)

- Edge locations are far more numerous than Regions, including in cities without a Region (`edge-locations-vs-regions`): the CloudFront intro page gives no count.
- RDS Multi-AZ failover is *automatic* (`rds-multi-az`): the fetched Multi-AZ page describes failover but does not use the word.
- S3 Versioning is a prerequisite for replication (`s3-cross-region-replication`, option d explanation): it is on "Requirements and considerations for replication", not fetched.
- Balanced best effort is the *default* Auto Scaling AZ distribution strategy (`asg-az-failure`): the fetched page describes the strategies; the default is assumed.
- CloudFormation stack creation still needs IAM permissions, directly or through a service role (`iac-benefits`, option c).
- `stacksets-new-accounts`: second reference ("Enable or disable automatic deployments for StackSets in AWS Organizations") is taken from the SAA-C03 bank, not fetched here; the StackSets overview page only links to it.

## Judgement calls

- `identify-outposts-hybrid`: AWS Outposts treated as a hybrid deployment (Outposts page says it extends AWS infrastructure to customer premises as part of a Region, but does not use the word "hybrid").
- 3.1.3 kept to deployment-model definitions (cloud, hybrid, on-premises/private cloud) as in the AWS "Types of cloud computing" page; 3.1.6 identifies them in scenarios. No IaaS/PaaS/SaaS questions.
- 3.2.3 tests multi-Region mechanisms (S3 CRR, DynamoDB global tables, Route 53 latency routing, Aurora Global Database) to avoid overlapping 3.2.8 (when to use multiple Regions, task 3b).
- WebFetch hit the hourly rate limit once mid-task; all other references were fetched.
