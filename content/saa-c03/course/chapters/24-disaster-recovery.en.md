Disaster recovery (DR) prepares a workload to survive the loss of a whole Region, a corrupted database or a deleted bucket. SAA-C03 questions give a recovery point objective, a recovery time objective and a budget, and ask for the DR strategy, the replication service, the failover mechanism or the backup design that meets them at the lowest cost.

<!-- section: global-infrastructure | objectives: 2.2.1 -->
## AWS global infrastructure and Route 53

| Component | What it is | Design use |
| --- | --- | --- |
| Region | A separate geographic area with its own isolated set of services | Choose by data residency, latency to users, service availability and price; a second Region for DR |
| Availability Zone | One or more data centers in a Region; at least three per Region | High availability inside a Region (previous chapter) |
| Local Zone | AWS infrastructure in a metropolitan area, attached to a parent Region | Single-digit millisecond latency for users in that city |
| Wavelength Zone | AWS infrastructure inside telecom 5G networks | Ultra-low latency for mobile devices |
| AWS Outposts | AWS racks or servers in your data center | Low latency to on-premises systems, local data processing |
| Edge location | CloudFront and Global Accelerator points of presence, Route 53 DNS | Content caching and network entry close to users |

Most services are **regional**: data stays in the Region you choose unless you replicate it. A few are global (IAM, Route 53, CloudFront, Global Accelerator).

Amazon Route 53 is the DNS service that steers users between Regions:

| Routing policy | Behavior |
| --- | --- |
| Simple | One record, no health-based choice |
| Failover | Active-passive: the secondary answers only when the primary is unhealthy |
| Weighted | Split by percentage (blue/green, gradual migration) |
| Latency | The Region with the lowest latency for the user |
| Geolocation | By the user's continent, country or US state (content rights, compliance) |
| Geoproximity | By distance between users and resources, with a bias to shift traffic |
| IP-based | By the user's source IP range |
| Multivalue answer | Up to eight healthy records chosen at random |

**Health checks** monitor an endpoint, other health checks (calculated) or a CloudWatch alarm. For alias records to AWS resources (a load balancer, a CloudFront distribution), set **Evaluate Target Health** instead of creating a separate health check. Any policy other than failover gives **active-active** routing among healthy records.

> **Exam trap.** Latency routing sends users to the fastest Region but isn't a data residency control; "users in Germany must be served from the Frankfurt Region" is geolocation routing.

<!-- section: rpo-rto-strategies | objectives: 2.2.4 -->
## RPO, RTO and the four DR strategies

- **Recovery point objective (RPO)**: the maximum acceptable data loss, measured in time ("we can lose at most 5 minutes of orders"). It drives the backup or replication frequency.
- **Recovery time objective (RTO)**: the maximum acceptable time to restore service after the disaster. It drives how much is already running in the recovery Region.

| Strategy | Running in the recovery Region | RPO | RTO | Cost |
| --- | --- | --- | --- | --- |
| Backup and restore | Only backups (snapshots, AMIs, AWS Backup copies, S3 copies); infrastructure is redeployed from IaC at failover | Time since the last backup | Longest: restore data and deploy everything | Lowest |
| Pilot light | Data replicated continuously (database replica, S3 replication); core infrastructure deployed, application servers off or not deployed | Low (continuous replication) | Start or deploy servers, scale out, fail over DNS | Low |
| Warm standby | A scaled-down but fully functional copy that can take traffic immediately | Low | Short: scale out and shift traffic | Higher |
| Multi-site active/active | Full production in two or more Regions, all serving traffic | Near zero (asynchronous replication) | Near zero | Highest |

The difference the exam tests: **pilot light can't serve requests** until servers are started and scaled; **warm standby can serve at reduced capacity** right away and only needs to scale. A variant of multi-site, **hot standby**, runs full capacity in the second Region but sends it no traffic.

> **Exam trap.** Replication alone doesn't protect against corruption or accidental deletion: a dropped table or an encrypted ransomware file is replicated too. Every strategy still needs point-in-time backups.

<!-- section: choosing-dr | objectives: 2.2.18 -->
## Selecting the DR strategy from the requirements

Pick the cheapest strategy whose RPO and RTO both meet the requirement:

| Requirement in the stem | Strategy |
| --- | --- |
| RPO and RTO of hours or a day, lowest cost, internal tool | Backup and restore with cross-Region copies and CloudFormation templates |
| RPO of minutes or less, RTO of tens of minutes, keep cost low | Pilot light: Aurora Global Database or cross-Region read replica, S3 replication, AMIs, servers launched at failover |
| RPO of seconds, RTO of minutes, must accept some traffic immediately | Warm standby: a small Auto Scaling group already running in the second Region |
| Near-zero RPO and RTO, users in several Regions, budget is not the constraint | Multi-site active/active: DynamoDB global tables or Aurora Global Database with write forwarding, latency routing |
| Protect against deletion and ransomware | Backups in a separate account and Region with AWS Backup Vault Lock, in addition to any replication |

Also check: the infrastructure is defined as code (CloudFormation, StackSets) so it can be recreated identically; AMIs, container images (ECR replication), secrets and keys exist in the recovery Region; quotas there are already raised; the plan is tested by regular drills.

> **Exam tip.** When two strategies meet the RPO and RTO, the qualifier "MOST cost-effective" picks the lighter one. When the stem says "the application must continue to serve users during a Regional outage with minimal downtime", warm standby or active/active is required; pilot light needs servers started first.

<!-- section: failover | objectives: 2.2.6 -->
## Failover strategies and mechanisms

Failover moves traffic (and the write role of the data) to the recovery site; **failback** returns it once the primary is repaired, usually after resynchronizing data in the reverse direction.

| Mechanism | How it fails over |
| --- | --- |
| Route 53 failover routing with health checks | DNS answers switch to the secondary record when the primary is unhealthy; clients follow after the record TTL |
| AWS Global Accelerator | Static anycast IPs stay the same; new connections go to healthy endpoints in another Region, with no DNS caching issue; traffic dials shift a percentage per Region |
| Amazon Application Recovery Controller (ARC) | Routing controls fail over DNS between Regions under your control; zonal shift and zonal autoshift move traffic away from an impaired AZ; Region switch orchestrates multi-Region recovery plans |
| CloudFront origin groups | A request that fails on the primary origin (chosen status codes, timeout) is retried on the secondary; GET, HEAD and OPTIONS only |
| Aurora Global Database | **Switchover** (planned, no data loss) or **failover** (unplanned outage) promotes a secondary Region cluster to primary |
| RDS cross-Region read replica | Promote the replica to a standalone writable instance (manual), then repoint the application |
| DynamoDB global tables | Nothing to promote: every replica is writable; redirect traffic to another Region |

Active-passive (one Region serves, the other waits) is simpler and cheaper; active-active (all Regions serve) needs data that accepts writes everywhere (DynamoDB global tables, Aurora write forwarding) and gives the shortest RTO.

> **Exam trap.** Route 53 failover depends on clients honoring DNS TTLs. "Fail over within seconds even for clients that cache DNS" or "fixed IP addresses" points to Global Accelerator.

<!-- section: multi-region-services | objectives: 2.2.14 -->
## AWS services for multi-AZ and multi-Region resilience

| Layer | Multi-AZ (inside a Region) | Multi-Region |
| --- | --- | --- |
| DNS and entry | Elastic Load Balancing across AZs | Route 53 routing policies, Global Accelerator, CloudFront |
| Compute | Auto Scaling group across AZs, ECS services and Lambda spread across AZs | AMIs copied to the other Region, ECR replication, infrastructure from CloudFormation StackSets |
| Relational database | RDS Multi-AZ, Aurora replicas | Aurora Global Database, RDS cross-Region read replicas, cross-Region automated backups |
| NoSQL | DynamoDB (built in) | DynamoDB global tables |
| Object storage | S3 Standard classes (built in) | S3 Cross-Region Replication (CRR) |
| File storage | EFS Regional, FSx Multi-AZ | EFS replication, AWS Backup cross-Region copies |
| Secrets and keys | Built in | Secrets Manager replica secrets, AWS KMS multi-Region keys |

Key facts:

- **Aurora Global Database**: one primary Region and up to 10 read-only secondary Regions, replicated on dedicated infrastructure with latency typically under a second; a secondary can be promoted in under a minute. Write forwarding lets secondary clusters send writes to the primary.
- **DynamoDB global tables**: active-active, every replica readable and writable, no application change. Multi-Region eventual consistency (default) resolves conflicts by last writer wins; multi-Region strong consistency (same account) gives a zero RPO.
- **S3 replication**: versioning is required on both buckets; replication applies to new objects (S3 Batch Replication copies existing ones). **S3 Replication Time Control** replicates 99.9 % of objects within 15 minutes, with metrics and notifications.
- **EFS replication**: a read-only replica file system with an RPO of 15 minutes for most file systems; fail over by making the replica writable.

```json
{
  "Role": "arn:aws:iam::111122223333:role/s3-replication-role",
  "Rules": [{
    "ID": "dr-copy",
    "Status": "Enabled",
    "Priority": 1,
    "Filter": {},
    "DeleteMarkerReplication": { "Status": "Disabled" },
    "Destination": {
      "Bucket": "arn:aws:s3:::example-dr-bucket-eu-central-1",
      "ReplicationTime": { "Status": "Enabled", "Time": { "Minutes": 15 } },
      "Metrics": { "Status": "Enabled", "EventThreshold": { "Minutes": 15 } }
    }
  }]
}
```

> **Exam tip.** "Database with RPO of about 1 second and RTO of about 1 minute across Regions, MySQL or PostgreSQL compatible" means Aurora Global Database. "Users in several Regions write to the same table with single-digit millisecond latency" means DynamoDB global tables.

<!-- section: storage-durability | objectives: 2.2.11 -->
## Durability and replication of storage options

| Storage | Where the data is kept | Durability and notes |
| --- | --- | --- |
| S3 Standard, Intelligent-Tiering, Standard-IA, Glacier classes | At least three AZs | Designed for 99.999999999 % (11 nines); survives the loss of an AZ |
| S3 One Zone-IA | One AZ | Lost if that AZ is destroyed; only for re-creatable data or secondary copies |
| EBS volume | Replicated inside one AZ | 99.8–99.9 % (gp3, gp2, io1, st1); 99.999 % for io2 Block Express; protect with snapshots |
| EBS snapshot | Stored regionally in S3, incremental | Survives an AZ loss; copy to another Region for DR |
| Instance store | The host's local disks | Lost when the instance stops, terminates or the disk fails |
| EFS Regional / One Zone | Multiple AZs / one AZ | Regional for production; One Zone is cheaper but zonal |
| FSx | Single-AZ or Multi-AZ deployment (Windows File Server, ONTAP, OpenZFS) | Multi-AZ adds a standby file server in another AZ |

> **Exam trap.** "Eleven nines" is durability (not losing data), not availability. S3 One Zone-IA has the same durability design inside its AZ but doesn't survive the loss of the AZ.

<!-- section: backups | objectives: 2.2.17 -->
## Backups for durability and availability of data

| Service | Native protection |
| --- | --- |
| Amazon RDS | Automated backups with point-in-time recovery, retention 0 to 35 days (0 disables them; console default 7 days); manual snapshots kept until deleted; snapshot copy and automated backup replication to another Region |
| Aurora | Continuous backups with point-in-time recovery, cluster snapshots |
| DynamoDB | Point-in-time recovery (any second of the last 35 days), on-demand backups |
| EBS | Incremental snapshots, automated by Amazon Data Lifecycle Manager, copied across Regions |
| S3 | Versioning (recover overwritten or deleted objects), Object Lock (WORM retention), replication, MFA delete |
| EFS, FSx | Automatic backups through AWS Backup, replication |

**AWS Backup** centralizes all of these:

- **Backup plans**: frequency, retention, lifecycle to cold storage, assigned to resources by tag.
- **Backup vaults**: encrypted with a KMS key, access policies; **Vault Lock** enforces write-once-read-many so nobody, including administrators, can delete backups or shorten retention.
- **Cross-Region and cross-account copies** in the plan, with AWS Organizations backup policies applied to all accounts.
- **AWS Backup Audit Manager** reports compliance with backup controls.

> **Exam tip.** "Backups must survive a compromised administrator account or ransomware" means AWS Backup copies to a vault in a separate account with Vault Lock. "Restore the database to its state 10 minutes before a faulty deployment" means point-in-time recovery, not a read replica.

<!-- section: quotas-standby | objectives: 2.2.10 -->
## Service quotas and throttling in the standby environment

Quotas are set **per account and per Region**: the recovery Region starts at default values, whatever you raised in production. A failover that needs 400 vCPUs of On-Demand instances, 3,000 concurrent Lambda executions or 20 RDS instances fails if those quotas weren't raised there beforehand.

- Raise quotas in the DR Region **before** the disaster, to the level production needs, and keep a margin for failover.
- Use **Service Quotas** to view and request increases; CloudWatch alarms on usage warn before a quota is reached; Trusted Advisor checks quotas.
- **Quota request templates** apply up to 10 quota increases automatically to every new account created in the organization (all features enabled).
- **On-Demand Capacity Reservations** reserve instance capacity in a specific AZ for as long as needed, billed at the On-Demand rate whether used or not; combine them with Savings Plans or Regional Reserved Instances for a discount. Use them when the RTO can't tolerate an insufficient capacity error.
- Throttling (HTTP 429, `ThrottlingException`) is a quota on request rates: retry with exponential backoff and jitter, buffer with SQS, cache, or request a higher rate.

```bash
# Check and raise the On-Demand Standard instances vCPU quota in the DR Region
aws service-quotas get-service-quota --region eu-central-1 \
  --service-code ec2 --quota-code L-1216C47A

aws service-quotas request-service-quota-increase --region eu-central-1 \
  --service-code ec2 --quota-code L-1216C47A --desired-value 512
```

> **Exam trap.** A warm standby or pilot light that has never been tested at full scale often fails on quotas. "Ensure the DR Region can scale to production capacity" means raising its service quotas (and, if needed, reserving capacity), not only copying AMIs.

<!-- section: key-points -->
## Key points

- RPO = acceptable data loss (backup or replication frequency); RTO = acceptable downtime (what is already running).
- Backup and restore (cheapest, slowest), pilot light (data live, servers off), warm standby (small copy serving), active/active (full, near zero).
- Choose the cheapest strategy that meets both RPO and RTO; replication never replaces point-in-time backups.
- Route 53 failover routing and health checks, Global Accelerator for fast IP-based failover, ARC for controlled failover, CloudFront origin groups for GET requests.
- Aurora Global Database (under a second of lag, up to 10 secondary Regions), DynamoDB global tables (active-active), S3 CRR with RTC (99.9 % in 15 minutes), EFS replication.
- S3 stores data in at least three AZs except One Zone-IA; EBS lives in one AZ; instance store is ephemeral.
- AWS Backup plans, cross-Region and cross-account copies, Vault Lock against deletion.
- Quotas are per Region: raise them in the DR Region in advance; Capacity Reservations guarantee instances.
