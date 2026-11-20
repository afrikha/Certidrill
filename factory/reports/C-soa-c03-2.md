# C-soa-c03-2 — COURSE, SOA-C03, chapters 21, 22, 23, 31

Files: `content/soa-c03/course/chapters/{21-scaling,22-high-availability,23-backup-restore,31-provisioning}.{en,fr}.md` (8 files). `course.yaml` not touched (the `chapters/` folder did not exist yet; created it).
Check: `npx tsx factory/check-cert.ts soa-c03 21-scaling 22-high-availability 23-backup-restore 31-provisioning` → `course problems (your chapters): 0`.
English words (code, markers and table separators excluded): 21 = 2,177; 22 = 1,668; 23 = 1,815; 31 = 2,009. Code blocks identical EN/FR (checked by script); same callout and table-row counts.

## Objective coverage

- 21: 2.1.1 (asg-configuration, scaling-policies, asg-lifecycle, serverless-container-scaling), 2.1.2 (caching), 2.1.3 (rds-aurora-scaling, dynamodb-scaling).
- 22: 2.2.1 (elb-health-checks, elb-troubleshooting, route53-health-checks), 2.2.2 (multi-az-compute, multi-az-databases).
- 23: 2.3.1 (aws-backup, native-backups), 2.3.2 (database-restore), 2.3.3 (storage-versioning), 2.3.4 (dr-procedures).
- 31: 3.1.1 (images), 3.1.2 (cloudformation-cdk), 3.1.3 (deployment-issues), 3.1.4 (multi-account-provisioning), 3.1.5 (deployment-strategies), 3.1.6 (third-party-tools).

## Facts verified on AWS pages (2026-11-20)

- EC2 Auto Scaling: grace period 300 s console / 0 CLI; default instance warmup not set (start 300 s); default cooldown 300 s, simple scaling only; health check behavior (not running = immediate, impaired = few minutes, scheduled events, 10 % at a time); target tracking predefined metrics and "don't edit alarms"; multiple policies rule; predictive scaling (24 h min, 14 days, 48 h hourly forecast, refreshed every 6 h, no scale-in, SchedulingBufferTime, max of policies); lifecycle hook timeout 30–7,200 s, default 3,600, DefaultResult ABANDON; warm pools states, charges and limits; suspendable processes and administrative suspension (24 h); instance refresh defaults (90 %/100 %, skip matching CLI off / console on, alarms/rollback/bake time off).
- Lambda: 1,000 per Region, 100 unreserved / 900 reservable, 1,000 environments per 10 s per function, reserved vs provisioned. (No timeout value used anywhere.)
- ECS service auto scaling (Application Auto Scaling, policy types, scale-in off during deployments, min 0); ECS rolling min/max semantics, circuit breaker and alarms; native blue/green with bake time and Lambda/pause hooks.
- CloudFront TTL rules (Expiration page), default 24 h without cache policy, cache key values sent to origin, all TTLs 0 disables caching, Origin Shield, versioned names vs invalidation.
- ElastiCache engine comparison (Valkey/Redis OSS/Memcached), Serverless auto scaling and Multi-AZ, auto scaling of shards/replicas (Valkey 7.2+, Redis OSS 6.0+, cluster mode enabled), lazy loading / write-through / TTL. DAX item cache TTL 5 min, write-through, strongly consistent reads pass through.
- RDS storage autoscaling (10 %, 5 min, 4 per 24 h, increment rule, +10 % threshold, never shrinks); read replicas 15 per primary (quota page), backups required; Aurora Auto Scaling (0–15, CPU target, 300 s cooldowns, needs one reader, removes only its own); Aurora Serverless v2 (2 GiB/ACU, 0–256, 384 for some PG, 0.5 increments, tiers 0–1 follow writer).
- DynamoDB: on-demand default; switching 4 times/24 h to on-demand; auto scaling 20–90 %, 2 consecutive minutes, 15 data points for scale-down, GSIs separate; PITR 1–35 days, restores to new table, settings not restored, cross-Region restore.
- ALB/NLB health check defaults and reason codes, fail-open, deregistration delay 300 s, weighted target groups (0–999, no automatic failover between them); cross-zone defaults; ALB at least two AZs.
- Route 53: health check types incl. **private endpoint health checks** (health check source in VPC — newer feature), 18 % rule, 4 s / 2 s / 10 s timings, 5,120 bytes, 255 children, prefix list `route53-healthchecks`, metrics only in us-east-1, Evaluate Target Health.
- RDS Multi-AZ instance (synchronous, failover 60–120 s, triggers, JVM TTL 60 s), Multi-AZ DB cluster (semisynchronous, two readable readers, three AZs), Aurora HA (six storage nodes, failover under 60 / often under 30 s, tiers 0–15, without replicas under 10 min, RDS Proxy up to 66 %). ARC zonal shift (1 min–3 days, prescale, opt-in) and autoshift (weekly practice runs ~30 min).
- AWS Backup: rule options and console window defaults, cold storage 90 days rule, retention 1 day–100 years, continuous backup 1–35 days (S3, RDS, Aurora, SAP HANA), opt-in, Vault Lock governance/compliance (grace ≥ 72 h), S3 backup requires versioning, restore testing (1–168 h retention), EFS default backup (35 days), FSx for Windows backups (0–90 days, console default 30).
- RDS backup retention 0–35 (console 7, CLI 1, outage when switching to/from 0), PITR (new instance, logs every 5 min, default parameter/option groups), cross-Region automated backups; Aurora backtrack (MySQL only, 72 h, in place), cloning (copy-on-write); Aurora Global Database switchover/failover (`--allow-data-loss`).
- EBS Snapshots Archive (up to 75 % cheaper ≥ 90 days, full snapshot), Recycle Bin resources, fast snapshot restore; DLM scope.
- S3 Versioning states, delete markers, null version ID; MFA delete (root only, CLI/API, not with lifecycle). FSx Windows shadow copies (not on by default, 10 %, 20 default, 500 max); FSx ONTAP snapshots (default policy 6/2/2, 5 % reserve, 1,023 per volume, `.snapshot`).
- DR whitepaper (four strategies, data plane vs control plane, hot standby, testing).
- AMI creation reboot, sharing (customer managed key required), deprecation, deregistration protection (24 h cooldown); Image Builder concepts, pipeline start conditions (API reference: default `EXPRESSION_MATCH_AND_DEPENDENCY_UPDATES_AVAILABLE`, cron or rate), lifecycle policies; ECR lifecycle, tag immutability, scanning, replication.
- CloudFormation: troubleshooting page, stack status meanings, stack failure options (`--disable-rollback`), drift detection, change sets, stack policies, DeletionPolicy, CreationPolicy (PT5M default, 12 h max), UpdatePolicy (rolling update doesn't honor instance maintenance policy). StackSets concepts and self-managed role names. CDK bootstrapping (CDKToolkit) and construct levels.
- VPC subnet sizing (/16–/28, five reserved), VPC CIDR can't be resized (secondary CIDR). RAM overview, VPC sharing basics. Terraform backend prescriptive guidance (S3 native locking `use_lockfile`, Terraform 1.11+, DynamoDB locking deprecated). Service Catalog Terraform product types (External, Terraform Cloud). CodeConnections rename; CloudFormation Git sync providers.

## General knowledge, not confirmed on a page fetched in this session

- `put-lifecycle-hook` / `complete-lifecycle-action` CLI syntax; ECS capacity provider managed scaling; ECS target tracking metric list (CPU, memory, ALB requests).
- GSI under-provisioning throttles base-table writes; `ReplicaLag` metric name; RDS vertical scaling "brief interruption".
- NAT gateway zonal design; ElastiCache replication "asynchronous by default".
- RAM shareable examples (transit gateways, Resolver rules, prefix lists, IPAM pools); VPC sharing participants can't modify owner subnets.
- Aurora backtrack billed per change record; S3 Object Lock / Replication require versioning.
- CDK `synth`/`diff`/`deploy` behavior; CodeConnections providers GitHub/GitLab (page only named Bitbucket).
- CodeCommit "available again to new customers" taken from the profile (architect verified; the CodeCommit welcome page fetched today has no availability statement).
- ECS native canary/linear taken from the C-dva-c03-3 report (What's New October 2025), not re-fetched.

## Notes

- French: "veilleuse [pilot light]" and "secours semi-actif [warm standby]" follow `objectives.yaml` (the SAA chapter uses different terms); "hook de cycle de vie", "warm pool", "jeu de modifications", "actualisation d'instance" follow existing AWS chapters.
- Noticed on the CloudFormation stack failure options page: a new "Express mode" (rollback disabled by default). Not used.
