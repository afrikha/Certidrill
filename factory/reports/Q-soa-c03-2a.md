# Q-soa-c03-2a — questions SOA-C03, domain `reliability`, objectives 2.1.1–2.1.3

51 files `content/soa-c03/questions/reliability/soac03-2a-*.yaml`, all `draft`. Validator: `51 files, 0 problem(s)`.

- Per objective: 2.1.1 = 17, 2.1.2 = 17, 2.1.3 = 17.
- Types: single 42, multi 9 (3 per objective; all "Choose two", 5 options).
- Difficulty: 15 easy, 26 medium, 10 hard.
- Single answers spread: a 11, b 12, c 9, d 10.
- No course chapters existed for these objectives when the batch was written; facts come from AWS documentation only.

## Sources fetched (2026-11-20)

EC2 Auto Scaling: lifecycle hooks, scale-in protection, instance refresh (overview, default values, rollback), standby, suspend/resume processes, health check grace period, default instance warmup, step and simple scaling, termination policies, Capacity Rebalancing, maximum instance lifetime, instance maintenance policy (overview and considerations), target tracking, launch failure troubleshooting, create group with launch template. ECS service auto scaling, ECS cluster auto scaling. EKS autoscaling (Karpenter / Cluster Autoscaler), HPA, Cluster Autoscaler best practices. Lambda reserved concurrency. CloudFront: expiration, 4xx/5xx handling, invalidation, invalidation pricing, Origin Shield, metrics, cache key / origin request / managed cache policies, cache policy settings. ElastiCache: which metrics to monitor, Auto Scaling, Serverless scaling, Auto Discovery, endpoints, replication. DAX cluster components and sizing. RDS: storage autoscaling, apply immediately, settings for DB instances, Multi-AZ pages, read replica creation, increasing storage, maintenance, RDS Proxy pinning and connection settings. Aurora: Auto Scaling, Serverless v2 how it works, high availability. DynamoDB: auto scaling, auto scaling CLI, GSI, on-demand maximum throughput, warm throughput. AWS Knowledge Center page on RDS MySQL downtime (Multi-AZ instance class change: standby first, then failover).

## Not verified on a fetched page (stable knowledge, review)

- ECS predefined metric name `ECSServiceAverageCPUUtilization` (the ECS page does not name it).
- IAM permission `autoscaling:SetInstanceProtection` for workers protecting themselves (soac03-2a-asg-scale-in-protection-jobs).
- `failover-db-cluster` command name (explanation of soac03-2a-aurora-writer-scale-failover).
- Changing RDS backup retention between two nonzero values causes no outage (distractor in soac03-2a-rds-apply-immediately-pending).
- EventBridge can target Systems Manager Run Command (soac03-2a-asg-terminate-hook-logs).
- Exact activity-history text "The requested configuration is currently not supported. Launching EC2 instance failed." (the troubleshooting page gives the first sentence; the second is the suffix used by the other messages on that page).

## Deviations and doubts

- Several 2.1.x topics already exist in the SAA-C03 and DVA-C03 banks (target tracking, warm pools, predictive and scheduled scaling, DAX vs ElastiCache, RDS Proxy for Lambda, read replicas, Aurora replica auto scaling, cache key/hit ratio). This batch tests operational angles instead (troubleshooting, configuration values, CLI).
- Overlap avoided with parallel SOA-C03 batches: health check grace period (2b), `lang` cookie cache key and RefreshHit TTL (5c), reserved concurrency throttling (1b).
- RDS storage autoscaling: the current page gives "storage optimization completed and fewer than four modifications in 24 hours" instead of the older 6-hour rule; no question depends on either value.
- The Lambda concurrency page is now titled "Configuring reserved concurrency for an Event Function"; the reference uses that title.
- soac03-2a-termination-default-policy uses a `text` fence for the instance table.
