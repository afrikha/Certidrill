Storage and database bills grow quietly: objects nobody reads stay in S3 Standard, gp2 volumes are sized for IOPS instead of data, a provisioned database runs at 10 % utilization, backups are kept forever in warm storage, and debug logs are ingested at full price. SAP-C03 questions give access patterns, retention rules and performance or recovery targets, and ask for the design that meets them at the lowest cost.

<!-- section: storage-tiering | objectives: 3.4.1 -->
## Intelligent tiering and lifecycle policies

**S3 Intelligent-Tiering** moves each object between access tiers by its own access history, with no retrieval fee, for a small monthly monitoring and automation charge per object.

| Tier | Entered after | Notes |
| --- | --- | --- |
| Frequent Access | Upload or transition | Default tier |
| Infrequent Access | 30 consecutive days without access | Automatic |
| Archive Instant Access | 90 consecutive days without access | Automatic, millisecond access |
| Archive Access (optional) | 90 to 730 days, configurable | Restore needed, standard retrieval 3 to 5 hours |
| Deep Archive Access (optional) | 180 to 730 days, configurable | Restore needed, standard retrieval within 12 hours |

Objects under 128 KB are not monitored and always stay in Frequent Access. Reading an object (GET, PUT, copy, restore) brings it back to Frequent Access; HEAD, tagging and list operations do not.

**S3 Lifecycle** applies age-based rules you define:

- Transitions go one way down the waterfall: Standard to Standard-IA, Intelligent-Tiering, One Zone-IA, Glacier Instant Retrieval, Glacier Flexible Retrieval or Glacier Deep Archive; nothing transitions out of Glacier Deep Archive.
- Minimum storage duration charges: 30 days (Standard-IA, One Zone-IA), 90 days (Glacier Instant Retrieval, Glacier Flexible Retrieval), 180 days (Glacier Deep Archive). Since July 2026 a rule can transition to Standard-IA or One Zone-IA from day 0 (older material still quotes a 30-day wait), but the 30-day minimum charge still applies.
- By default, Lifecycle does not transition objects smaller than 128 KB; add an object size filter to change that.
- Each object moved to Glacier Flexible Retrieval or Deep Archive is a billed transition request and adds 40 KB of overhead (8 KB at S3 Standard rates, 32 KB at the archive rate). Millions of small files cost more to archive than they save: aggregate them first (for example into daily archives).
- Expire noncurrent versions and abort incomplete multipart uploads: common hidden costs in versioned buckets.

```json
{
  "Rules": [
    {
      "ID": "claims-scans-tiering",
      "Status": "Enabled",
      "Filter": { "And": { "Prefix": "scans/", "ObjectSizeGreaterThan": 131072 } },
      "Transitions": [
        { "Days": 30, "StorageClass": "GLACIER_IR" },
        { "Days": 365, "StorageClass": "DEEP_ARCHIVE" }
      ],
      "Expiration": { "Days": 3650 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 }
    },
    {
      "ID": "abort-stale-uploads",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}
```

| Access pattern | Choice |
| --- | --- |
| Unknown or changing access, objects of 128 KB or more | Intelligent-Tiering |
| Predictable aging (hot for a month, then rarely read, kept 10 years) | Lifecycle transitions to Glacier classes |
| Rarely read but needs millisecond access when it is | Glacier Instant Retrieval |
| Compliance archive read once a year, hours acceptable | Glacier Deep Archive |
| Many tiny objects | Aggregate before archiving, or keep in Standard |

**Amazon EFS lifecycle management** moves files between Standard, Infrequent Access (IA) and Archive. Defaults: files not accessed for 30 days go to IA, for 90 days to Archive. By default a file stays in IA or Archive when it is read; set "transition into Standard" to **On first access** for latency-sensitive files. Metadata always stays in Standard, and new writes land in Standard and become eligible after 24 hours.

> **Exam trap.** Intelligent-Tiering is not the cheapest answer for buckets of very small objects (they never leave Frequent Access) or for data whose aging is fully predictable (a Lifecycle rule avoids the per-object monitoring charge).

<!-- section: block-storage | objectives: 3.4.2 -->
## Block storage volume types and IOPS

| Attribute | gp3 | gp2 | io2 Block Express | io1 |
| --- | --- | --- | --- | --- |
| Size | 1 GiB to 64 TiB | 1 GiB to 16 TiB | Up to 64 TiB | 4 GiB to 16 TiB |
| IOPS | 3,000 included; up to 80,000 at 500 IOPS per GiB | 3 per GiB (100 minimum, 16,000 maximum at 5,334 GiB); burst to 3,000 under 1 TiB | Up to 256,000 at 1,000 IOPS per GiB | Up to 64,000 at 50 IOPS per GiB |
| Throughput | 125 MiB/s included; up to 2,000 MiB/s at 0.25 MiB/s per provisioned IOPS | Up to 250 MiB/s | Up to 4,000 MiB/s | Up to 1,000 MiB/s |
| Performance model | Provisioned independently of size | Tied to size, burst credits | Provisioned, sub-millisecond average latency | Provisioned |
| Durability | Standard EBS | Standard EBS | 99.999 % | 99.8 % to 99.9 % |

Cost decisions:

- **gp2 to gp3**: gp3 costs up to 20 % less per GiB and decouples IOPS from size. A 2 TiB gp2 volume bought for its 6,000 IOPS becomes a smaller gp3 volume with 6,000 provisioned IOPS, or a same-size gp3 with fewer IOPS if metrics show they are unused. Elastic Volumes changes the type in place, without detaching.
- **io2 Block Express** only when a single volume needs more than gp3 can give, or consistent sub-millisecond latency and 99.999 % durability (large Oracle, SAP HANA, SQL Server).
- **Right-size provisioned IOPS** with CloudWatch metrics and Compute Optimizer EBS recommendations; idle provisioned IOPS are billed every hour.
- Throughput-bound sequential workloads (logs, big data scans) can use HDD volumes (st1, sc1) at a lower price per GiB when latency is not critical.

```bash
aws ec2 modify-volume --volume-id vol-0a1b2c3d4e5f60718 --volume-type gp3 --iops 6000 --throughput 250
```

> **Exam tip.** "Most cost-effective volume that sustains 10,000 IOPS on 500 GiB" is gp3 with provisioned IOPS: gp2 would need about 3,334 GiB to reach 10,000 IOPS, and io2 is priced for latency and durability the stem does not ask for.

<!-- section: database-capacity | objectives: 3.4.3 -->
## Database capacity modes and reserved capacity

**Amazon DynamoDB.**

| Mode | Billing | Choose when |
| --- | --- | --- |
| On-demand (default, recommended for most workloads) | Per read and write request | New, spiky or unpredictable traffic; tables idle much of the time |
| Provisioned with auto scaling | Per hour of provisioned RCUs and WCUs, used or not | Steady traffic with predictable growth and high utilization |
| Provisioned plus reserved capacity | Upfront plus lower hourly rate for 1 or 3 years | Long-term steady baseline; not for the Standard-IA table class or replicated WCUs |

The Standard-IA table class lowers storage price for tables whose cost is dominated by storage (old orders, logs); Standard fits tables dominated by throughput. Database Savings Plans also cover DynamoDB.

**Amazon RDS reserved DB instances** are a billing discount for 1 or 3 years (No Upfront only for 1 year; Partial and All Upfront for both). They cannot be cancelled, apply to Single-AZ and Multi-AZ deployments, are tied to Region and engine, and are shared across the consolidated billing family. Size flexibility within an instance class type applies to RDS for MySQL, MariaDB, PostgreSQL, Db2 and Oracle BYOL, not to RDS for SQL Server or Oracle License Included.

**Amazon Aurora.**

| Choice | Facts |
| --- | --- |
| Aurora Standard | Pay instances, storage and I/O per million requests; usually cheaper when I/O is under 25 % of Aurora spend |
| Aurora I/O-Optimized | No I/O charges, higher instance (about 30 %) and storage prices; cheaper when I/O is 25 % or more of Aurora spend (up to 40 % saving). Switch to it once every 30 days, back to Standard any time |
| Aurora Serverless v2 | Billed per ACU-second (about 2 GiB of memory per ACU); scales in 0.5 ACU steps and can pause at 0 ACUs when idle; for variable or intermittent load |
| Aurora reserved instances | Up to 45 % (1 year) and 66 % (3 years); size-flexible within a family; buy about 30 % more RIs to fully cover I/O-Optimized instances |
| Backup storage | Free up to 100 % of the cluster's storage size within the retention period |

**Database Savings Plans** (up to 35 %, 1-year term) cover the latest provisioned generations and serverless usage across Aurora, RDS, DynamoDB, ElastiCache, DocumentDB, Neptune, Keyspaces, Timestream, DMS and OpenSearch Service, regardless of engine, family, size, AZ or Region. Choose them over RIs when engines or Regions will change, or when serverless usage must be covered.

| Requirement | Answer |
| --- | --- |
| Aurora cluster whose I/O is 40 % of its bill | I/O-Optimized |
| Development database used a few hours a day | Aurora Serverless v2 with auto-pause |
| Steady RDS for PostgreSQL fleet for three years, no engine change | 3-year reserved DB instances |
| Portfolio moving from RDS to Aurora Serverless and DynamoDB this year | Database Savings Plans |
| DynamoDB table with constant 5,000 writes per second for years | Provisioned with reserved capacity |

> **Exam trap.** Reserved capacity and reserved instances do not follow a workload into another engine, mode or serverless option; Database Savings Plans do. Conversely, a 3-year RI is the deeper discount for a fleet that will not change.

<!-- section: backup-retention | objectives: 3.4.4 -->
## Backup and DR retention at the lowest cost

**AWS Backup** centralizes policies across services, accounts (organization backup policies) and Regions.

- Retention: 1 day to 100 years for snapshot backups (or indefinite); continuous backups for point-in-time restore keep 1 to 35 days.
- Cold storage for CloudFormation, DynamoDB with advanced features, EBS (through EBS Snapshots Archive, only for monthly or less frequent backups), EFS, SAP HANA on EC2, Timestream and VMware. Backups must stay at least 90 days in cold storage, so expiry must be at least 90 days after the transition; AWS recommends at least 8 days in warm storage.
- Copy actions send backups to another Region or account with their own lifecycle, so the DR copy can go cold sooner than the primary.

```yaml
Resources:
  TieredBackupPlan:
    Type: AWS::Backup::BackupPlan
    Properties:
      BackupPlan:
        BackupPlanName: tiered-retention
        BackupPlanRule:
          - RuleName: daily-35-days
            TargetBackupVault: prod-vault
            ScheduleExpression: cron(0 3 * * ? *)
            Lifecycle:
              DeleteAfterDays: 35
          - RuleName: monthly-7-years
            TargetBackupVault: prod-vault
            ScheduleExpression: cron(0 4 1 * ? *)
            Lifecycle:
              MoveToColdStorageAfterDays: 30
              DeleteAfterDays: 2555
            CopyActions:
              - DestinationBackupVaultArn: arn:aws:backup:eu-central-1:444455556666:backup-vault:dr-vault
                Lifecycle:
                  MoveToColdStorageAfterDays: 30
                  DeleteAfterDays: 2555
```

**Amazon Data Lifecycle Manager (DLM)** automates EBS snapshots and EBS-backed AMIs at no additional cost (you pay the snapshots).

- Up to 4 schedules per policy; retention by count (1 to 1,000) or age (1 day to 100 years).
- Archiving to EBS Snapshots Archive (up to 75 % cheaper storage) for volume-targeted policies, one schedule per policy, monthly or yearly (or a cron of at least 28 days); archived snapshots are full snapshots kept at least 90 days.
- Cross-Region copy to up to three Regions, each with its own retention; cross-account sharing needs snapshots encrypted with a customer managed key.
- Fast snapshot restore (snapshots up to 16 TiB) is billed per minute per AZ: enable it only for the volumes whose restore time justifies it.

| Requirement | Tool |
| --- | --- |
| One policy for RDS, DynamoDB, EFS and EBS across all accounts, with vault lock | AWS Backup with organization backup policies |
| Hourly EBS snapshots of tagged volumes, keep 24, no extra service charge | DLM snapshot policy |
| Keep monthly EBS snapshots for 7 years at the lowest cost | Monthly schedule with archiving to EBS Snapshots Archive |
| Seven-year retention, restore within hours is acceptable | Cold storage tier in AWS Backup |

> **Exam trap.** Moving a backup to cold storage after 10 days and deleting it at day 60 is invalid: cold storage has a 90-day minimum. Daily backups kept a few weeks stay warm; only long-retention monthly or yearly backups benefit from cold storage.

<!-- section: observability-costs | objectives: 3.4.5 -->
## Cost-effective observability

**Logs** usually dominate the bill. Facts (US East examples):

| Lever | Effect |
| --- | --- |
| Log class Essentials (formerly Infrequent Access) | Ingestion $0.25 per GB instead of $0.50 for Standard; same storage and Logs Insights prices; no metric filters, subscription filters, Live Tail, anomaly detection, embedded metric format or `GetLogEvents`; class fixed at log group creation |
| Retention policy | Log groups never expire by default; set retention per group (for example 30 days hot) |
| Filter at the source | Log levels per environment, sampling of debug logs, structured JSON with only useful fields |
| Vended logs (VPC Flow Logs, for example) | Tiered delivery price falling from $0.50 to $0.05 per GB as volume grows; deliver directly to S3 when only archive and Athena queries are needed |
| Archive outside CloudWatch | Export or stream to S3 (Firehose), then S3 Lifecycle to Glacier classes |

**Metrics.** Custom metrics cost $0.30 per metric per month for the first 10,000, less beyond. Every unique combination of dimensions is a separate metric, so a dimension such as request ID or customer ID multiplies the bill. Aggregate instead:

- Publish per Auto Scaling group or service, not per instance or request; use CloudWatch agent `aggregation_dimensions` and a longer `metrics_collection_interval` for non-critical hosts.
- Use Contributor Insights ($0.50 per rule per month, first rule free) for high-cardinality top-N questions instead of one metric per key.
- Embedded metric format turns log lines into metrics but bills both log ingestion and metrics; use it for metrics you actually alarm on.
- `GetMetricData` calls are always charged; third-party tools polling every metric can cost more than metric streams ($0.003 per 1,000 metric updates) feeding Firehose.

```json
{
  "agent": { "metrics_collection_interval": 300 },
  "metrics": {
    "namespace": "CWAgent",
    "append_dimensions": { "AutoScalingGroupName": "${aws:AutoScalingGroupName}" },
    "aggregation_dimensions": [["AutoScalingGroupName"]],
    "metrics_collected": {
      "mem": { "measurement": ["mem_used_percent"] },
      "disk": { "measurement": ["used_percent"], "resources": ["/"] }
    }
  }
}
```

**Multi-account design.** Cross-account observability shares metrics and logs with a monitoring account without copying them, at no extra charge for logs and metrics; central archives use subscription filters to Firehose and S3 instead of duplicating log groups in every account.

> **Exam tip.** "Keep audit logs for 7 years at the lowest cost, query them rarely" is S3 with Lifecycle to Glacier Deep Archive and Athena, not CloudWatch Logs retention. "Reduce ingestion cost for verbose application logs that are only searched during incidents" is the Essentials log class (when no metric filter or subscription is needed) plus a shorter retention.

<!-- section: key-points -->
## Key points

- Intelligent-Tiering for unknown access (objects of 128 KB or more); Lifecycle for predictable aging; minimum durations 30/90/180 days; small objects are expensive to archive.
- EFS: IA after 30 days, Archive after 90 by default; files stay cold when read unless On first access is set.
- gp3: 3,000 IOPS and 125 MiB/s included, up to 80,000 IOPS and 2,000 MiB/s, up to 20 % cheaper than gp2; io2 Block Express for 256,000 IOPS, sub-millisecond latency and 99.999 % durability.
- DynamoDB on-demand by default; provisioned plus reserved capacity for steady baselines. RDS RIs: size flexibility except SQL Server and Oracle License Included.
- Aurora I/O-Optimized when I/O is 25 % or more of spend; Serverless v2 can pause at 0 ACUs; Database Savings Plans follow usage across engines and serverless.
- AWS Backup cold storage needs 90 days; DLM is free, archives monthly snapshots, copies to three Regions.
- Observability: Essentials log class, retention on every log group, S3 for long archives, low-cardinality dimensions, aggregation, Contributor Insights.
