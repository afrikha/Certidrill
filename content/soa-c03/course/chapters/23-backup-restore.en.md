Backups are only as good as the restore they allow. SOA-C03 tests whether you can automate backups for every resource type, pick the restore method that meets a recovery time objective (RTO, how long the service can be down) and a recovery point objective (RPO, how much data can be lost), recover an overwritten file or object through versioning, and run a disaster recovery procedure in the right order.

<!-- section: aws-backup | objectives: 2.3.1 -->
## Centralizing backups with AWS Backup

AWS Backup applies one policy to EC2 instances, EBS volumes, RDS and Aurora databases, DynamoDB tables, EFS and FSx file systems, S3 buckets and more.

| Building block | What you configure |
| --- | --- |
| Backup plan and rules | Frequency (hourly, every 12 hours, daily, weekly, monthly or a cron expression), backup window (console default: start within 8 hours, complete within 7 days), retention from 1 day to 100 years or indefinitely, optional transition to cold storage, copy actions |
| Resource assignment | Resource types, ARNs or tags (for example `backup=daily`), with conditions; the service must be **opted in** for the Region in AWS Backup settings |
| Backup vault | Where recovery points are stored, encrypted with a KMS key, with an access policy |
| Continuous backup | Point-in-time recovery for S3, RDS, Aurora and SAP HANA on EC2, retention 1 to 35 days, no schedule |
| Copy actions | Copies to a vault in another Region and/or another account |

Cold storage keeps a recovery point for at least 90 days after the transition, so `DeleteAfterDays` must be at least 90 more than `MoveToColdStorageAfterDays`:

```json
{
  "RuleName": "daily-35d",
  "TargetBackupVaultName": "prod-vault",
  "ScheduleExpression": "cron(0 3 * * ? *)",
  "StartWindowMinutes": 60,
  "Lifecycle": { "MoveToColdStorageAfterDays": 30, "DeleteAfterDays": 120 },
  "CopyActions": [{
    "DestinationBackupVaultArn": "arn:aws:backup:eu-central-1:444455556666:backup-vault:dr-vault",
    "Lifecycle": { "DeleteAfterDays": 120 }
  }]
}
```

**AWS Backup Vault Lock** makes recovery points immutable: nobody, including the root user, can delete them or shorten their lifecycle.

| Mode | Behavior |
| --- | --- |
| Governance | Users with sufficient IAM permissions can remove the lock |
| Compliance | After a grace time of at least 3 days (72 hours), the lock can't be changed or removed by anyone, including AWS, while the vault holds recovery points |

Minimum and maximum retention settings on the lock make jobs with a shorter or longer retention fail. Across an organization, **backup policies** in AWS Organizations push plans to member accounts, and **AWS Backup Audit Manager** reports whether resources meet controls such as backup frequency, retention or cross-Region copy.

> **Exam trap.** A backup plan that selects resources by tag backs up nothing for a service that isn't opted in for the Region. Check the service opt-in settings before suspecting the tag.

<!-- section: native-backups | objectives: 2.3.1 -->
## Native snapshot and backup features by service

| Service | Native mechanism | Facts to remember |
| --- | --- | --- |
| EBS volumes and EBS-backed AMIs | Snapshots (incremental, Regional) automated by **Amazon Data Lifecycle Manager** policies targeted by tags | DLM manages only snapshots and AMIs it created; cross-Region and cross-account copy |
| EBS long-term retention | **EBS Snapshots Archive** | Up to 75 % cheaper for snapshots kept 90 days or longer; an archived snapshot becomes a full snapshot and must be restored to the standard tier before use |
| Accidental deletion | **Recycle Bin** retention rules | Recover deleted EBS snapshots, EBS volumes and EBS-backed AMIs for the period the rule sets |
| RDS | Automated backups and transaction logs | Retention 0 to 35 days (0 disables them, which causes an outage when changed to or from 0); console default 7 days, CLI default 1 day; manual snapshots kept until deleted |
| DynamoDB | Point-in-time recovery (PITR) and on-demand backups | PITR recovery period 1 to 35 days, latest restorable time about 5 minutes ago |
| EFS | AWS Backup | File systems created in the console get a daily backup with 35-day retention |
| FSx for Windows File Server | Automatic daily backups | Retention 0 to 90 days (console default 30); backups are incremental and file-system-consistent |
| S3 | AWS Backup (periodic or continuous) | Versioning must be enabled on the bucket; set a lifecycle rule to expire noncurrent versions to limit backup size |

> **Exam tip.** "Back up EC2, RDS, DynamoDB and EFS with one schedule, copy to another Region and prevent deletion" is AWS Backup with a plan, a copy action and Vault Lock. "Keep the last seven daily snapshots of tagged EBS volumes at the lowest operational cost" is a Data Lifecycle Manager policy.

<!-- section: database-restore | objectives: 2.3.2 -->
## Restoring databases to meet RTO, RPO and cost

| Method | RPO | RTO and behavior | Cost note |
| --- | --- | --- | --- |
| RDS point-in-time restore | About 5 minutes (logs uploaded to S3 every 5 minutes; check `LatestRestorableTime`) | Creates a **new DB instance**; repoint the application | Included in backup storage |
| RDS or Aurora snapshot restore | Time of the snapshot | New instance or cluster | Manual snapshots billed until deleted |
| Aurora backtrack (Aurora MySQL only) | Any point within the backtrack window, up to 72 hours | **Rewinds the same cluster in minutes**; pause the application first | Change records billed; enable at creation or restore |
| Aurora clone | Now | Fast copy-on-write cluster for investigation, no data copied at creation | Pay only for changed pages |
| DynamoDB PITR | Down to the second, latest about 5 minutes ago | Always a **new table**, in the same or another Region | Billed per GB of table |
| RDS cross-Region automated backups | Snapshots and transaction logs replicated | PITR in the second Region | Copy and storage charges |
| Read replica promotion | Replica lag | Minutes; replica becomes a standalone writable instance | Replica already running |

Restore checklist:

- RDS restores use the default parameter group and option group unless you specify others, and need the right VPC security group: set them during or right after the restore.
- A DynamoDB restore brings back data, indexes, provisioned capacity and encryption settings, but **not** auto scaling policies, IAM policies, CloudWatch alarms, tags, Streams, TTL or PITR settings: reapply them.
- Restored EBS volumes and RDS storage load blocks from S3 lazily, so first reads are slower; **EBS fast snapshot restore** (per snapshot and AZ, billed per hour) gives full performance immediately.
- Restore tests prove the RTO: **AWS Backup restore testing** runs scheduled restores (latest or random recovery point), keeps the result 1 to 168 hours for validation, then deletes it, and Audit Manager can check restore time against a target.

```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier orders-db \
  --target-db-instance-identifier orders-db-0915 \
  --restore-time 2026-11-12T09:15:00Z

aws dynamodb restore-table-to-point-in-time \
  --source-table-name Orders --target-table-name Orders-0915 \
  --restore-date-time 2026-11-12T09:15:00Z
```

> **Exam trap.** "Undo a bad batch update on an Aurora MySQL cluster within minutes without changing endpoints" is backtrack. For RDS and for Aurora PostgreSQL there is no in-place rewind: point-in-time restore creates a new instance or cluster with a new endpoint.

<!-- section: storage-versioning | objectives: 2.3.3 -->
## Versioning for Amazon S3 and Amazon FSx

**S3 Versioning** keeps every version of every object. A bucket is unversioned (default), versioning-enabled or versioning-suspended; once enabled it can never return to unversioned. Objects stored before enabling have the version ID `null`.

| Action on a versioned bucket | Result |
| --- | --- |
| PUT of an existing key | New current version; the old one becomes noncurrent |
| DELETE without a version ID | A **delete marker** becomes the current version; data stays |
| Recover a deleted object | Delete the delete marker (or copy a previous version over the current one) |
| DELETE with a version ID | Permanently deletes that version |

Operating rules:

- Every version is billed as a full object: add lifecycle rules with **noncurrent version expiration** (and removal of expired delete markers).
- **MFA delete** requires an MFA code to change the versioning state or permanently delete a version; only the root user can enable it, with the CLI or API, and it can't be used with lifecycle configurations.
- S3 Object Lock, S3 Replication and AWS Backup for S3 all require versioning.

```bash
aws s3api put-bucket-versioning --bucket example-reports \
  --versioning-configuration Status=Enabled

aws s3api list-object-versions --bucket example-reports --prefix q3/summary.csv
```

**Amazon FSx** versioning works at the file system level:

| File system | Versioning feature | How users recover |
| --- | --- | --- |
| FSx for Windows File Server | **Shadow copies** (Windows Volume Shadow Copy), not enabled by default, configured with the FSx PowerShell commands; default storage limit 10 % of the file system, default 20 copies, hard limit 500 | Right-click a file or folder, **Restore previous versions** |
| FSx for NetApp ONTAP | **Snapshots** with a snapshot policy (`default`: 6 hourly, 2 daily, 2 weekly); snapshot reserve 5 %; up to 1,023 per volume | Browse the `.snapshot` directory of the volume |

Shadow copies and snapshots are not a substitute for backups: they live on the same file system.

> **Exam tip.** "Users must restore yesterday's version of a file on an FSx for Windows share themselves, without an administrator" means enabling shadow copies. "Protect objects against accidental overwrite and deletion" means S3 Versioning (plus MFA delete or Object Lock if deletion must be blocked).

<!-- section: dr-procedures | objectives: 2.3.4 -->
## Running disaster recovery procedures

| Strategy | Prepared in the recovery Region | Procedure at failover |
| --- | --- | --- |
| Backup and restore | Backup copies (AWS Backup copy actions, AMIs, snapshots), infrastructure as code | Restore data from the copies, deploy the stack with CloudFormation or the CDK, then switch DNS |
| Pilot light | Data replicated continuously (cross-Region read replica, Aurora Global Database, S3 replication); core infrastructure deployed, application servers off | Promote the database, start or deploy servers and scale them, switch traffic |
| Warm standby | A scaled-down but working copy that already serves traffic or tests | Scale out to production size (raise the Auto Scaling desired capacity), switch traffic |
| Active/active | Full workload in several Regions, all serving traffic | No failover as such: route traffic away from the failed Region and make sure the others absorb it |

Best practices that questions turn into answers:

- **Automate the runbook** even when the decision to fail over is manual, so the switch is one action (Systems Manager Automation, ARC Region switch plans or routing controls).
- Prefer **data plane** actions during the event (Route 53 health checks, ARC routing controls) over control plane changes such as editing records or creating resources.
- For Aurora Global Database, use **switchover** for planned moves (no data loss, typically under 30 seconds on recent versions) and **failover** with `--allow-data-loss` for a Regional outage (RPO of seconds); fail back later with a switchover.
- Replication copies corruption and deletions too: keep point-in-time backups and versioning beside any replication.
- **Test** regularly: game days, AWS Backup restore testing, ARC practice runs. Raise service quotas and keep AMIs, secrets and container images in the recovery Region beforehand.

> **Exam trap.** Warm standby relies on scaling out during the disaster, and scaling is a control plane action. If the requirement is to serve full load immediately after a Regional failure, provision full capacity in advance (hot standby) or run active/active.

<!-- section: key-points -->
## Key points

- AWS Backup: plans with rules (frequency, window, retention, cold storage of at least 90 days), selection by tag after service opt-in, vaults, cross-Region and cross-account copies, continuous backup up to 35 days.
- Vault Lock: governance (removable with IAM permissions) or compliance (immutable after a grace time of at least 72 hours).
- DLM for EBS snapshots and AMIs, Snapshots Archive for 90+ days, Recycle Bin against accidental deletion, fast snapshot restore against first-read latency.
- RDS PITR and snapshot restores create a new instance; Aurora MySQL backtrack rewinds in place (up to 72 hours); DynamoDB PITR restores to a new table without auto scaling, alarms, tags, Streams or TTL.
- S3 Versioning (never back to unversioned), delete markers, noncurrent version expiration, MFA delete by the root user only; FSx for Windows shadow copies and ONTAP snapshots for user-level recovery.
- DR: backup and restore, pilot light, warm standby, active/active; automated runbooks, data plane failover, Aurora switchover versus failover, regular tests.
