Stateless tiers are easy to make highly available: run more copies in more places. The hard part is state. DOP-C02 asks how each layer of a workload is deployed across Availability Zones and Regions, how each stateful service replicates and fails over (synchronously or not, automatically or not, with which endpoint), which services offer a built-in cross-Region feature, and how to configure the application and its pipeline so that a zone or Region change causes as little downtime as possible.

<!-- section: multi-az-multi-region-layers | objectives: 3.1.1 -->
## Multi-AZ and multi-Region deployments by layer

| Layer | Multi-AZ deployment | Multi-Region deployment |
| --- | --- | --- |
| EC2 compute | Auto Scaling group with subnets in two or three AZs, `ELB` health checks, capacity balanced across AZs | A copy of the stack per Region (CloudFormation StackSets or a pipeline stage per Region), AMIs copied or built per Region |
| Containers | ECS service spread across AZs (tasks placed in several subnets); EKS node groups or Auto Mode nodes in several AZs, pods spread with topology spread constraints | One cluster per Region (a cluster is regional), images replicated with ECR replication |
| Lambda | Runs in multiple AZs automatically; a function attached to a VPC needs subnets in several AZs | Deploy the function in each Region; event sources and data replicated |
| Relational data | RDS Multi-AZ DB instance or DB cluster; Aurora replicas in other AZs | Aurora Global Database; RDS cross-Region read replicas |
| Key-value data | DynamoDB is Multi-AZ by default | DynamoDB global tables |
| Cache | ElastiCache (Valkey, Redis OSS) with replicas and Multi-AZ automatic failover | ElastiCache Global Datastore (node-based clusters) |
| Files | Amazon EFS Regional file system, FSx Multi-AZ | EFS replication to another Region |
| Objects | S3 stores Standard-class data across AZs | S3 Cross-Region Replication, Multi-Region Access Points |
| Entry point | ALB or NLB with nodes in each AZ | Route 53 routing policies, AWS Global Accelerator, CloudFront |

Multi-Region designs are either **active/passive** (one Region serves, the other holds replicated data and a pilot light or warm standby) or **active/active** (both serve; data must accept writes in both Regions or route writes to one). Active/active costs more and requires conflict handling; active/passive needs a tested failover.

> **Exam tip.** "Deploy the same infrastructure to 12 accounts in 3 Regions with the LEAST operational overhead" is CloudFormation StackSets with service-managed permissions (AWS Organizations) and automatic deployment, not a script that loops over accounts.

<!-- section: stateful-replication-failover | objectives: 3.1.3 -->
## Replication and failover of stateful services

Two questions decide every stateful design: is replication **synchronous** (RPO near zero, higher write latency) or **asynchronous** (RPO = replication lag), and is failover **automatic** with a stable endpoint or **manual** with a new endpoint?

| Service and mode | Replication | Failover | Endpoint after failover |
| --- | --- | --- | --- |
| RDS Multi-AZ DB instance | Synchronous to one standby (not readable) | Automatic, typically 60–120 seconds | Same DNS endpoint, now pointing to the standby |
| RDS Multi-AZ DB cluster (MySQL, PostgreSQL) | Semisynchronous to two readable standbys | Automatic | Same cluster endpoint |
| Aurora replicas (same Region) | Shared cluster volume across AZs | Automatic promotion by priority tier (0 highest), then size | Cluster (writer) endpoint follows the new writer |
| RDS cross-Region read replica | Asynchronous | **Manual** promotion; the replica becomes a standalone instance | New endpoint: update the application or a DNS record |
| Aurora Global Database | Asynchronous, dedicated infrastructure, latency typically under a second; up to 10 secondary Regions | Managed **switchover** (planned, no data loss) or **failover** (unplanned, `--allow-data-loss`) | **Global writer endpoint** follows the primary Region |
| DynamoDB global tables, MREC (default) | Asynchronous, typically within a second; last writer wins | None needed: every replica is read/write; route traffic elsewhere | Regional endpoint of each Region |
| DynamoDB global tables, MRSC | Synchronous to at least one other Region; RPO zero | None needed | Regional endpoint of each Region |
| ElastiCache Multi-AZ | Asynchronous to replicas | Automatic promotion of a replica | Primary endpoint |
| ElastiCache Global Datastore | Asynchronous cross-Region | You promote a secondary cluster to primary | Secondary cluster's endpoints |
| Amazon EFS replication | Asynchronous; RPO of 15 minutes for most file systems | Fail over to the replica, fail back by reversing replication | Replica file system |

```bash
# Planned move of the primary Region (no data loss)
aws rds switchover-global-cluster --global-cluster-identifier orders-global \
  --target-db-cluster-identifier arn:aws:rds:us-west-2:111122223333:cluster:orders-usw2

# Regional outage: promote the secondary, accepting the loss of unreplicated writes
aws rds failover-global-cluster --global-cluster-identifier orders-global \
  --target-db-cluster-identifier arn:aws:rds:us-west-2:111122223333:cluster:orders-usw2 \
  --allow-data-loss
```

DynamoDB global tables details that decide answers:

- **MREC** (multi-Region eventual consistency): a strongly consistent read returns the latest version only if the item was last written in that Region; conditional writes and transactions are evaluated in the local Region only; RPO equals the replication delay.
- **MRSC** (multi-Region strong consistency): exactly three Regions, either three replicas or two replicas plus a **witness** (managed by DynamoDB, not readable or writable); strongly consistent reads always return the latest version; RPO zero. Limits: same account only, created from an **empty** table, no TTL, no local secondary indexes, no transactions; concurrent writes to the same item from two Regions fail with `ReplicatedWriteConflictException` (retry).
- The consistency mode can't be changed after creation.

> **Exam trap.** A cross-Region RDS read replica is not an automatic failover mechanism: promotion is manual and breaks replication. For "fail over to another Region within minutes with a stable writer endpoint", choose Aurora Global Database (switchover or failover, global writer endpoint).

<!-- section: cross-region-features | objectives: 3.1.7 -->
## Built-in cross-Region features

Before building replication with Lambda functions and scripts, use the feature the service already offers:

| Service | Cross-Region feature | Key configuration |
| --- | --- | --- |
| Amazon DynamoDB | Global tables (version 2019.11.21 is current) | Add a replica to an existing table; MREC supports multi-account, MRSC same account only |
| Amazon RDS | Cross-Region read replicas; cross-Region automated backup replication | Replica in the target Region, promote on failover |
| Amazon Aurora | Global Database | Secondary clusters, write forwarding from secondaries, managed switchover and failover |
| Amazon Route 53 | Global service: failover, latency, weighted, geolocation and geoproximity routing with health checks | Health checks on each Region's endpoint, alias records with Evaluate Target Health |
| Amazon S3 | Cross-Region Replication (CRR), Replication Time Control, Batch Replication for existing objects, Multi-Region Access Points | Versioning on both buckets, an IAM role; RTC replicates 99.9 % of objects within 15 minutes |
| Amazon CloudFront | Global edge network; origin groups for origin failover | Primary and secondary origins (for example buckets in two Regions) |
| Other building blocks | Secrets Manager replica secrets, KMS multi-Region keys, ECR cross-Region replication, AMI copy, AWS Backup cross-Region copy | Present in the recovery Region before the event |

```bash
# Add a replica Region to an existing DynamoDB table (global tables 2019.11.21)
aws dynamodb update-table --table-name Orders --region eu-west-1 \
  --replica-updates '[{"Create": {"RegionName": "us-east-1"}}]'
```

**S3.** Replication applies to objects written after the rule exists; use S3 Batch Replication for existing objects. RTC adds replication metrics and the events `OperationMissedThreshold` and `OperationReplicatedAfterThreshold`. A **Multi-Region Access Point** gives one global endpoint over buckets in several Regions; in an active/passive configuration, its **failover controls** switch which Region receives requests (GET and PUT), and two-way CRR keeps buckets synchronized.

**CloudFront origin failover.** An origin group has a primary and a secondary origin. CloudFront fails over when the primary returns a status code you select (400, 403, 404, 416, 429, 500, 502, 503, 504) or can't be reached: by default 3 connection attempts of 10 seconds each. Failover applies only to `GET`, `HEAD` and `OPTIONS` requests (`OPTIONS` only if cached); a `POST` or `PUT` is never failed over.

> **Exam trap.** CloudFront origin failover doesn't make an upload API highly available: write requests aren't failed over. For writes, use Route 53 failover (or Global Accelerator) in front of Regional endpoints, or an S3 Multi-Region Access Point.

<!-- section: minimize-downtime | objectives: 3.1.9 -->
## Configuring applications for multiple AZs and Regions with minimal downtime

| Requirement | Configuration |
| --- | --- |
| Any instance or task can be lost without user impact | Stateless application tier; sessions in ElastiCache or DynamoDB; no local files that matter |
| Database failover without reconfiguration | Connect through the RDS or Aurora endpoint (never an IP address); short DNS caching (a JVM TTL of 60 seconds or less); retry on connection errors; RDS Proxy to keep client connections during failover |
| Cross-Region writes keep working after an Aurora Region switch | Writers use the Aurora **global writer endpoint** |
| Shift users between Regions quickly | Route 53 failover records with health checks and a low TTL, or Global Accelerator (static anycast IPs, no client DNS caching; traffic dials per endpoint group) |
| Failover must not depend on a control plane during the event | ARC routing controls (on/off switches read by Route 53 health checks through a highly available data plane) or an ARC Region switch plan |
| Remove a degraded AZ quickly | ARC zonal shift (manual) or zonal autoshift (AWS-initiated) on load balancers, Auto Scaling groups and EKS |
| Instances drained before removal | Deregistration delay on the target group; Auto Scaling lifecycle hook on termination |
| Recovery Region ready to take load | Raised service quotas, AMIs and images present, secrets and keys replicated, IaC deployable, capacity prescaled or statically stable |
| Changes never break all Regions at once | Pipeline that deploys one Region (and within it one AZ or cell) at a time with alarm checks between waves; StackSets with maximum concurrency and failure tolerance |

A minimal Route 53 active/passive pair:

```json
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com", "Type": "A", "SetIdentifier": "primary-eu-west-1",
        "Failover": "PRIMARY",
        "AliasTarget": { "HostedZoneId": "Z32O12XQLNTSW2", "DNSName": "api-euw1-123456789.eu-west-1.elb.amazonaws.com", "EvaluateTargetHealth": true }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com", "Type": "A", "SetIdentifier": "secondary-us-east-1",
        "Failover": "SECONDARY",
        "AliasTarget": { "HostedZoneId": "Z35SXDOTRQ7X7K", "DNSName": "api-use1-987654321.us-east-1.elb.amazonaws.com", "EvaluateTargetHealth": true }
      }
    }
  ]
}
```

Failover of the entry point is only half of the job: the data tier must be writable in the new Region (promote the Aurora secondary, or rely on DynamoDB global tables), and background consumers (queues, scheduled jobs) must start there too, without running in both Regions.

> **Exam tip.** "Users must not change the address they connect to, and failover must not wait for DNS caches to expire" points to AWS Global Accelerator. "Lowest latency for users on several continents" points to Route 53 latency routing or Global Accelerator in front of Regional stacks, with data replicated by global tables or Aurora Global Database.

<!-- section: key-points -->
## Key points

- Every layer needs its own multi-AZ and multi-Region mechanism: Auto Scaling groups, ECS and EKS across AZs; one cluster per Region; databases, caches, files and objects each replicate differently.
- RDS Multi-AZ is synchronous with automatic failover on the same endpoint; cross-Region read replicas need manual promotion and a new endpoint.
- Aurora Global Database: up to 10 secondary Regions, lag typically under a second, switchover (planned, no data loss) or failover (`--allow-data-loss`), global writer endpoint, write forwarding.
- DynamoDB global tables: MREC (default, last writer wins, multi-account) or MRSC (three Regions or two plus a witness, RPO zero, empty table, no TTL, LSI or transactions); mode fixed at creation.
- S3 CRR (new objects; Batch Replication for existing ones), RTC 99.9 % within 15 minutes, Multi-Region Access Point failover controls; CloudFront origin groups fail over only GET, HEAD and OPTIONS.
- Minimize downtime with stateless tiers, endpoint-based database access, short DNS caching, RDS Proxy, Global Accelerator or Route 53 failover, ARC routing controls and zonal shift, and Region-by-Region deployments.
