Recovery questions give you an RTO, an RPO, a budget and an existing architecture, and ask which automation meets them with the least effort. This chapter covers the disaster recovery vocabulary, the four AWS strategies and AWS Backup, recovery runbooks, failover testing, cross-Region backup copies, and how a load balancer and its Auto Scaling group recover from backend failures on their own.

<!-- section: dr-concepts | objectives: 3.3.1 -->
## RTO, RPO and what drives them

| Term | Question it answers | What lowers it |
| --- | --- | --- |
| **Recovery time objective (RTO)** | How long can the service be unavailable after the event? | Infrastructure already deployed and running, automated runbooks, DNS or data plane failover |
| **Recovery point objective (RPO)** | How much data, measured in time, can be lost? | More frequent backups, continuous replication (asynchronous: seconds; synchronous: zero) |
| Recovery time actual / point actual | What a test or a real event achieved | Regular drills that measure them |

Rules the exam relies on:

- RPO is set by **how data is copied**; RTO is set by **what must still be done** at failover (restore, deploy, scale, switch traffic).
- **Replication is not backup**: a deletion or corruption replicates within seconds, so keep point-in-time backups or versioning beside replication; for logical corruption the recovery point is always greater than zero.
- **Data plane over control plane** during the event: Route 53 health checks and Amazon Application Recovery Controller (ARC) routing controls keep working when control plane APIs (editing records, creating resources, restoring a backup, scaling an Auto Scaling group) may be impaired. A design that must recover even during a control plane impairment provisions full capacity in advance (static stability).
- **Automatic versus manual trigger**: automatic failover on a health check or alarm risks failing over on a false alarm. AWS guidance is often to let a human decide, but to automate every step so that the decision is one action.
- **AWS Resilience Hub** assesses an application (from CloudFormation stacks, Terraform state, resource groups or EKS) against a resiliency policy of RTO and RPO targets, and recommends alarms, standard operating procedures and AWS Fault Injection Service experiments. Run the assessment from a pipeline to block a release that breaks the policy.

<!-- section: dr-strategies | objectives: 3.3.2 -->
## AWS Backup and the four recovery strategies

| Strategy | What runs in the recovery Region | Relative RTO and RPO | Typical AWS services |
| --- | --- | --- | --- |
| Backup and restore | Nothing but copies of data and the IaC templates | Hours; RPO = backup interval | AWS Backup copy actions, AMIs, CloudFormation or CDK to redeploy |
| Pilot light | Data replicated and core services ready; application servers switched off | Tens of minutes; RPO of seconds with continuous replication | Aurora Global Database, cross-Region read replicas, S3 replication, DynamoDB global tables, AWS Elastic Disaster Recovery |
| Warm standby | A scaled-down but **fully working** copy that can serve traffic at once | Minutes; scale out at failover | Same data replication plus a running Auto Scaling group at minimum size |
| Multi-site active/active | Full workload serving traffic in every Region | Near zero for most disasters | DynamoDB global tables, Aurora Global Database (secondary Regions serve reads), Route 53 latency or geolocation routing |

> **Exam trap.** The difference between pilot light and warm standby: pilot light can't process requests until servers are started or deployed; warm standby serves traffic immediately and only needs to scale. If the scenario says "must serve full production load immediately after failover", even warm standby fails (scaling is a control plane action): provision full capacity or run active/active.

**AWS Elastic Disaster Recovery (DRS)** replicates servers block by block (on premises, other clouds, or EC2 instances to another AZ or Region) to a low-cost staging area subnet, and launches converted recovery instances in minutes; AWS describes RPOs of seconds and RTOs of minutes. It supports point-in-time recovery, non-disruptive drills and failback. It protects servers, not managed databases such as RDS.

**AWS Backup** building blocks:

| Element | What to know |
| --- | --- |
| Backup plan | Rules with a schedule, a backup window, a lifecycle (cold storage, expiration) and **copy actions** to other Regions or accounts |
| Resource assignment | By tags or ARNs; the resource type must be opted in for the Region |
| Backup vault | Encrypted with a KMS key; access policy; **Vault Lock** in governance or compliance mode against deletion |
| Continuous backup | Point-in-time recovery for supported types (such as RDS, Aurora and S3) |
| Organizations backup policies | Push plans to every member account |
| Restore testing | Scheduled restores that prove the backups work and measure restore time |

<!-- section: recovery-procedures | objectives: 3.3.3 -->
## Recovery procedures and runbooks

A recovery procedure is a runbook, written once and executed by automation. Systems Manager **Automation** runbooks run multi-step actions with an assume role, across accounts and Regions, and can be started by an EventBridge rule (an alarm state change, an AWS Health event) or by an on-call engineer.

Order of operations for a Regional failover (pilot light or warm standby):

1. Confirm the impact and decide, then stop writes to the failed Region if possible.
2. Promote the data tier: Aurora global database failover, read replica promotion, or use DynamoDB global tables that are already writable.
3. Start or scale the application tier (Auto Scaling desired capacity, ECS service desired count) from AMIs and images already copied to the Region.
4. Shift traffic: Route 53 failover records driven by health checks, or ARC routing controls.
5. Verify, then plan the failback (resynchronize data, switch back in a quiet period).

```bash
# Planned move, no data loss (all clusters healthy)
aws rds switchover-global-cluster --region us-east-1 \
  --global-cluster-identifier orders-global \
  --target-db-cluster-identifier arn:aws:rds:us-west-2:111122223333:cluster:orders-usw2

# Regional outage: run against the secondary Region
aws rds failover-global-cluster --region us-west-2 \
  --global-cluster-identifier orders-global \
  --target-db-cluster-identifier arn:aws:rds:us-west-2:111122223333:cluster:orders-usw2 \
  --allow-data-loss
```

| Aurora Global Database operation | RPO | Old primary afterwards |
| --- | --- | --- |
| Switchover (planned) | Zero: Aurora synchronizes the target first | Becomes a read-only secondary |
| Failover with `--allow-data-loss` | Seconds, depending on replication lag (`AuroraGlobalDBRPOLag`) | Rebuilt as a secondary when its Region recovers; fail back with a switchover |

The **global writer endpoint** keeps its name after a switchover or failover, so applications that use it need no connection change. The promoted cluster does not inherit the old primary's parameter groups, alarms or integrations: create them in advance in the secondary Region.

Single-resource recovery that needs no runbook:

| Failure | Built-in recovery |
| --- | --- |
| EC2 underlying hardware issue | Simplified automatic recovery on supported instance types, or a CloudWatch alarm on `StatusCheckFailed_System` with the **recover** action (same instance ID, IP addresses and metadata) |
| Instance in an Auto Scaling group fails health checks | The group terminates and replaces it |
| RDS Multi-AZ primary fails | Automatic failover to the standby; the DNS endpoint follows |
| Data deleted or corrupted | Point-in-time restore to a **new** database or table, then repoint the application |

> **Exam tip.** "The failover must be a single action by the on-call engineer" points to a Systems Manager Automation runbook or ARC; "must not depend on control plane operations" points to pre-provisioned capacity and Route 53 health checks or ARC routing controls.

<!-- section: failover-testing | objectives: 3.3.4 -->
## Testing failover of Multi-AZ and multi-Region workloads

| Component | How to test failover |
| --- | --- |
| RDS Multi-AZ DB instance | `aws rds reboot-db-instance --db-instance-identifier orders --force-failover` |
| Aurora cluster (Multi-AZ) | `aws rds failover-db-cluster --db-cluster-identifier orders-cluster` (optionally `--target-db-instance-identifier`); replicas are promoted by **promotion tier** |
| Aurora Global Database | Switchover to the secondary Region, run there, switch back |
| Route 53 failover records | Make the primary health check fail (stop the endpoint, block the health checkers, or **invert** the health check) and watch DNS answers move to the secondary |
| ARC | Flip a routing control, or start a **zonal shift**; zonal autoshift adds regular **practice runs** watched by the outcome alarms you configure |
| CloudFront origin group | Make the primary origin return a configured failover status code and check that the secondary answers |

**CloudFront origin failover**: an origin group has a primary and a secondary origin and is attached to a cache behavior. CloudFront sends each request to the primary first and retries on the secondary when the primary returns one of the status codes you chose (any of 400, 403, 404, 416, 429, 500, 502, 503, 504), when it can't connect (503 selected) or when it times out (504 selected). Only **GET, HEAD and OPTIONS** requests fail over. By default CloudFront tries the primary for up to 30 seconds (3 connection attempts of 10 seconds); lower the connection timeout and attempts to fail over faster.

> **Exam trap.** A CloudFront origin group does not protect uploads: POST and PUT requests never fail over. For writes, use a Regional failover design (Route 53 failover or S3 Multi-Region Access Points with failover controls).

**AWS Fault Injection Service (FIS)** runs repeatable experiments from a template: actions, targets (by tags or ARNs), an IAM experiment role and **stop conditions** (CloudWatch alarms that end the experiment). Actions relevant to failover tests:

| Action ID | Effect |
| --- | --- |
| `aws:rds:failover-db-cluster` | Fails over an Aurora (or DocumentDB) cluster |
| `aws:rds:reboot-db-instances` | Reboots RDS instances; `forceFailover` triggers a Multi-AZ failover |
| `aws:network:disrupt-connectivity` | Blocks traffic in target subnets (scope `all`, `availability-zone`, `s3`, `dynamodb`...) to simulate an AZ loss |
| `aws:arc:start-zonal-autoshift` | Shifts load balancer, Auto Scaling group or EKS traffic away from an AZ |
| `aws:dynamodb:global-table-pause-replication`, `aws:s3:bucket-pause-replication` | Pause cross-Region replication to test the replication lag behavior |
| `aws:ec2:stop-instances`, `aws:ec2:terminate-instances` | Remove capacity to test Auto Scaling replacement |

<!-- section: cross-region-backup | objectives: 3.3.5 -->
## Cross-Region backup and recovery with AWS Backup, Amazon S3 and Systems Manager

| Requirement | Solution |
| --- | --- |
| One schedule for EC2, EBS, RDS, DynamoDB, EFS with a copy in another Region | AWS Backup plan with a **copy action** to a vault in the DR Region |
| Copy in another **account** (protection from a compromised account) | Copy action to a vault in another account of the same organization |
| Objects available in another Region within minutes | S3 Cross-Region Replication, with **S3 Replication Time Control** for a predictable 15-minute target (99.99 % of objects) |
| EBS snapshots of tagged volumes copied on a schedule | Amazon Data Lifecycle Manager policy with cross-Region copy rules |
| Custom sequence (create an AMI, copy it, update a parameter, tag it) | Systems Manager Automation runbook (`AWS-CreateImage`, `AWS-CopySnapshot` run in the destination Region with `SourceRegion`) on a schedule or EventBridge rule |

**Cross-account copy requirements**:

1. Source and destination accounts in the same AWS Organizations organization; the **management account** turns on cross-account backup in AWS Backup settings.
2. The destination vault access policy allows `backup:CopyIntoBackupVault` from the source account; the source role needs `backup:CopyFromBackupVault` and `backup:CopyIntoBackupVault`.
3. Use a **customer managed key** in the destination vault for resources not fully managed by AWS Backup, and share any customer managed key that encrypts the source; the default vault can't be the destination.
4. You can't restore directly into another account: copy first, then restore there.

Copy facts: recovery points in cold storage can't be copied; a **continuous backup copied to another Region or account becomes a snapshot backup** without point-in-time restore; copy jobs have no completion SLA.

**S3 replication** requires versioning on source and destination buckets. It replicates only new objects (use **S3 Batch Replication** for existing ones), doesn't replicate delete markers unless delete marker replication is enabled, and replicates SSE-KMS objects only when you opt in and give a destination key.

> **Exam trap.** Replication alone gives no protection from deletion. Pair it with versioning, Object Lock or AWS Backup with Vault Lock in a separate account.

<!-- section: lb-backend-recovery | objectives: 3.3.6 -->
## Configuring a load balancer to recover from backend failure

Application Load Balancer target group health check defaults (instance and IP targets):

| Setting | Default |
| --- | --- |
| Protocol, port, path | HTTP, traffic port, `/` |
| Interval / timeout | 30 seconds / 5 seconds |
| Healthy threshold / unhealthy threshold | 5 / 2 consecutive checks |
| Success codes | 200 (configurable, such as `200-299`) |

Recovery chain to configure:

1. **Health check path**: a `/health` endpoint that checks the critical local dependencies, so a broken instance is removed. Checking every shared dependency can take every target out at once.
2. **Auto Scaling group health check type `ELB`**: without it, the group replaces only instances that fail EC2 status checks, and an instance that answers 500 keeps running. With it, the group terminates and replaces targets the load balancer reports unhealthy.
3. **Health check grace period**: 300 seconds by default in the console, 0 with the CLI or SDK. Too short a period replaces instances that are still booting (a replacement loop); with launch lifecycle hooks it can be 0.
4. **Deregistration delay** (connection draining, 300 seconds by default) lets in-flight requests finish when a target is removed.
5. **Several AZs** and cross-zone load balancing (on by default for ALB, off by default for NLB) so one AZ failure doesn't overload the rest.

```bash
aws autoscaling update-auto-scaling-group --auto-scaling-group-name web-asg \
  --health-check-type ELB --health-check-grace-period 300

aws elbv2 modify-target-group --target-group-arn arn:aws:elasticloadbalancing:eu-west-1:111122223333:targetgroup/web/0123456789abcdef \
  --health-check-path /health --health-check-interval-seconds 10 \
  --unhealthy-threshold-count 2 --matcher HttpCode=200
```

**Fail open**: when every target of a target group is unhealthy, the load balancer routes to all of them anyway; watch `UnHealthyHostCount` and `HTTPCode_Target_5XX_Count`.

**Above the load balancer**, a Route 53 alias record to the load balancer with **evaluate target health** turns the load balancer's health into DNS health: in a failover or latency configuration, Route 53 stops returning a Region whose target groups have no healthy targets.

> **Exam trap.** "Instances return HTTP 500 but are never replaced" is an Auto Scaling group still using the `EC2` health check type. "New instances are terminated before they finish bootstrapping" is a grace period that is too short.

<!-- section: key-points -->
## Key points

- RPO comes from the copy method, RTO from the work left at failover; replication doesn't protect against corruption.
- Backup and restore, pilot light (servers off), warm standby (serves at reduced capacity), active/active; full load at once needs pre-provisioned capacity.
- Prefer data plane failover (Route 53 health checks, ARC routing controls) and automate the runbook even when a human decides.
- Aurora Global Database: switchover for planned moves (RPO zero), failover with `--allow-data-loss` for outages; the global writer endpoint doesn't change.
- Test with `--force-failover`, `failover-db-cluster`, inverted Route 53 health checks, ARC practice runs and FIS experiments with alarm stop conditions; CloudFront origin groups fail over GET, HEAD and OPTIONS only.
- AWS Backup copy actions: cross-account needs Organizations, management account opt-in, a vault policy for `backup:CopyIntoBackupVault` and customer managed keys; continuous backups become snapshots when copied.
- Load balancer recovery: health check path, ASG health check type `ELB`, grace period, deregistration delay, multiple AZs, fail open, evaluate target health.
