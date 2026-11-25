# Q-dop-c02-4c — report

36 questions `dopc02-4c-*` in `content/dop-c02/questions/monitoring/` (12 objectives × 3, single 30 / multi 6, difficulty 5 easy / 18 medium / 13 hard). `CERT=dop-c02 npx tsx factory/validate.ts --prefix dopc02-4c-` → 0 problem(s); `content:validate` → 0 problems, 0 warnings.

## Overlap avoided
I read the existing 4a/4b stems in monitoring and the related resilience and config questions: ASG ELB health type, deep ALB health check, Route 53 inverted, alarm-based and alias checks, EC2 recover, warm pools, backlog per instance, metric filter basics, agent fleet install and DHMC, SNS key for alarms, Config S3 auto remediation and EventBridge SSM remediation. The new questions test other decisions: reboot vs recover, actions suppressor, EBS health checks, capacity provider targetCapacity, GSI auto scaling, remediation exceptions and AutomationAssumeRole, procstat pattern vs exe, run_as_user, calculated health checks, string matching with a fast interval, and others.

## Facts not verified on a fetched page (WebFetch hourly limit reached mid-task)
I kept these because they are long-established AWS behaviour, but nobody has checked them on a page yet:
- `ecs-container-health-check`: the ECS service replaces a task whose essential container is UNHEALTHY. The fetched healthcheck page covers task health, not replacement.
- `dynamodb-gsi-autoscaling`: an under-provisioned GSI throttles writes to the base table. The fetched AutoScaling page only implies it.
- `s3-replicate-logs-central`: replication requires versioning on both buckets. The requirements page wasn't fetched.
- `config-remediation-assume-role`: the Automation assume role must trust `ssm.amazonaws.com`, and service-linked role permissions can't be extended.
- `opensearch-ingestion-s3-logs`: an S3 bucket isn't a Firehose source.
- `route53-calculated-quorum`: a record is associated with only one health check.
- `route53-string-match-fast`: request interval is only 10 or 30 s. The fetched values page shows the 30 s example and "Fast (10 seconds)", and the course chapter says the same.
- `eventbridge-pipeline-prefix`: the CodePipeline event field names `state`/`pipeline` and the detail type match course chapter 45, but no CodePipeline events page was fetched.
- `rds-storage-autoscaling`: the explanation says RDS allocated storage isn't an Application Auto Scaling target, which is from memory.

## Other notes
- I avoided a GuardDuty severity `numeric` question: the fetched GuardDuty page lists explicit severity values, and the `>=` operator isn't shown on the fetched operators page.
- I avoided a Route 53 health-checker managed prefix-list question: the fetched IP-ranges page doesn't confirm such a list.
- Reference titles: some fetched page titles had no service suffix, and I added " - <service>" the way AWS page titles usually end. Check these if the validator ever compares titles exactly.
