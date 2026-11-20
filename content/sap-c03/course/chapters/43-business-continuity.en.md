Business continuity covers everything that keeps data recoverable and services running when something fails: backups governed across the whole organization, architectures that heal themselves, protection against ransomware and insiders, and experiments that prove the design before a real incident does. SAP-C03 scenarios involve dozens of accounts, auditors who require immutable copies, and teams that must measure recovery time rather than guess it.

<!-- section: backup-governance | objectives: 4.3.1 -->
## Centralized backup governance with AWS Backup

AWS Backup manages backups across accounts of the **same organization**. In the AWS Backup console of the management account, opt in to:

- **Backup policies**: AWS Organizations policies that deploy backup plans to the root, OUs or accounts;
- **Cross-account monitoring**: backup, copy and restore jobs of every account in one view (jobs created after the opt-in);
- **Cross-account backup**: lets accounts copy backups to other accounts of the organization.

A **delegated administrator** (up to five member accounts in the console) can manage policies and monitoring without using the management account; registering the account is not enough: it also needs the `AWSBackupOrganizationAdminAccess` managed policy and a delegation policy in the management account.

Backup policies use inheritance operators: `@@assign` sets a value, `@@append` adds to a list, `@@remove` deletes, and `@@operators_allowed_for_child_policies` set to `@@none` stops child OUs from changing the plan. They select resources by **type or tag, not by resource ARN**.

```json
{
  "plans": {
    "Tier1_Daily": {
      "regions": { "@@assign": ["eu-west-1", "eu-central-1"] },
      "rules": {
        "Daily": {
          "schedule_expression": { "@@assign": "cron(0 2 ? * * *)" },
          "target_backup_vault_name": { "@@assign": "workload-vault" },
          "lifecycle": { "delete_after_days": { "@@assign": "35" } },
          "copy_actions": {
            "arn:aws:backup:eu-central-1:444455556666:backup-vault:central-locked": {
              "target_backup_vault_arn": {
                "@@assign": "arn:aws:backup:eu-central-1:444455556666:backup-vault:central-locked"
              },
              "lifecycle": { "delete_after_days": { "@@assign": "365" } }
            }
          }
        }
      },
      "selections": {
        "tags": {
          "tier1": {
            "iam_role_arn": { "@@assign": "arn:aws:iam::$account:role/BackupRole" },
            "tag_key": { "@@assign": "backup-tier" },
            "tag_value": { "@@assign": ["tier1"] }
          }
        }
      }
    }
  }
}
```

The reference architecture: workload accounts back up locally, then copy to a **central backup account** in another Region, whose vault is locked and whose administrators are not the workload administrators.

**Logically air-gapped vaults** go further: always locked in compliance mode, encrypted with an AWS owned key by default (or a customer managed key chosen at creation, never changed), minimum retention of 7 days, and shareable through AWS RAM with individual accounts, including accounts in other organizations (not with OUs or a whole organization), so a recovery account can restore directly. With **multi-party approval**, backups stay recoverable even if the vault-owning account is inaccessible.

**AWS Backup Audit Manager** reports compliance with controls (frequency, retention, cross-Region copy, vault lock, restore time). **Restore testing** plans restore chosen recovery points (latest or random within a window) on a schedule, keep the restored resource 1 to 168 hours for validation, record the restore duration, then delete it.

> **Exam trap.** A backup policy can't target an individual resource ARN: use tags (or a local backup plan for a single resource). And a cross-account copy only works inside the same organization; to restore from an account in another organization, share a logically air-gapped vault through AWS RAM.

<!-- section: failover-tests | objectives: 4.3.2 -->
## Designing failover tests and measuring recovery time

A failover test needs a start time, observable phases and an end time:

| Phase | What to measure | Source |
| --- | --- | --- |
| Detection | Time from fault injection to the health check or alarm turning unhealthy | Route 53 health check status, CloudWatch alarm history |
| Decision | Time to trigger the failover (automatic or human approval) | Runbook execution, Region switch or Automation timestamps |
| Traffic shift | Time until clients reach the healthy endpoint | DNS TTL, Global Accelerator, client metrics |
| Data recovery | Time to promote the replica and data lost | Database events, replication lag before the fault |
| Return to steady state | Time until the business metric is back to normal | CloudWatch business metrics, Synthetics canaries |

Route 53 detection time is roughly the request interval multiplied by the failure threshold: with the defaults (30 seconds, failure threshold 3) count about 90 seconds before the status changes, then up to one TTL for resolvers. The fast interval (10 seconds) and a lower threshold shorten it at extra cost and with a higher risk of flapping. Health checkers in at least three Regions vote on the status; calculated health checks let one record depend on several components.

**AWS Fault Injection Service (FIS)** produces the fault on demand: stop instances in one AZ, disrupt subnet connectivity, fail over an Aurora cluster, or run a scenario. The **AZ Availability: Power Interruption** scenario injects 30 minutes of power-loss symptoms then 30 minutes of recovery symptoms (stopped instances, paused launches and scaling, RDS failover, ElastiCache impact, ARC zonal autoshift five minutes in). **Cross-Region: Connectivity** blocks application traffic between two Regions and pauses cross-Region replication: the right test for a Regional failover plan.

> **Exam tip.** "Prove that the application meets its 5-minute RTO when an AZ fails, and keep evidence for auditors" points to an FIS experiment (AZ power interruption scenario) with stop conditions, plus CloudWatch metrics that timestamp each phase, not a manual instance termination.

<!-- section: resilient-architectures | objectives: 4.3.3 -->
## Redundancy, fault tolerance and self-healing

| Property | Pattern | AWS implementation |
| --- | --- | --- |
| Redundancy | Spread every tier across at least three AZs; size for the loss of one AZ (static stability) | Auto Scaling group across three AZs with 150 % of needed capacity (each AZ holds half the load), Aurora replicas in other AZs |
| Fault tolerance | Remove failed components from service automatically | ELB health checks, Auto Scaling ELB health check type, RDS Multi-AZ failover, Route 53 failover |
| Self-healing | Replace what fails without an operator | Auto Scaling replaces unhealthy instances, ECS and EKS reschedule tasks and pods, EC2 automatic instance recovery, ECS deployment circuit breaker rolls back a failing deployment |
| Isolation | Contain the blast radius | Cell-based architecture (independent stacks per tenant group or Region), bulkheads (separate pools, queues or concurrency per dependency), shuffle sharding |
| Dependency failure | Fail fast, degrade gracefully | Timeouts, retries with exponential backoff and jitter, circuit breakers, fallback to cached or static content (CloudFront) |
| Load spikes | Absorb rather than collapse | SQS queues between tiers, load shedding, throttling at API Gateway, constant work patterns |

Self-healing needs **deep enough health checks**: a check that only tests the web server keeps a node in service whose database connection is broken, but a check that tests every dependency can take a whole fleet out when one shared dependency fails. Check local health for the load balancer and alarm separately on dependencies.

Idempotent operations make retries safe; without them, a retried payment or order creates duplicates.

> **Exam trap.** Two AZs at 100 % each is static stability for one AZ loss, but two AZs at 50 % each is not: losing one AZ then depends on launching instances during the event. "Must handle the loss of an AZ without scaling actions" means pre-provisioned capacity in the remaining AZs.

<!-- section: ransomware-protection | objectives: 4.3.4 -->
## Protecting data against ransomware and accidental deletion

| Control | Protects | Key behavior |
| --- | --- | --- |
| S3 Versioning | Overwrites and deletes (a delete adds a delete marker) | Previous versions stay recoverable; required by Object Lock and replication |
| S3 Object Lock, governance mode | Object versions against users without special rights | Overridden only with `s3:BypassGovernanceRetention` and the `x-amz-bypass-governance-retention:true` header |
| S3 Object Lock, compliance mode | Object versions against everyone, root user included | Retention can't be shortened nor the mode changed |
| S3 legal hold | Object versions, without an end date | Stays until removed by a user with `s3:PutObjectLegalHold`; independent of retention |
| EBS snapshot lock, governance mode | Snapshots | Locked immediately; users with permissions can unlock or change it |
| EBS snapshot lock, compliance mode | Snapshots against everyone | Optional cooling-off of 1 to 72 hours; afterwards the duration can only be increased |
| Recycle Bin | Deleted EBS volumes, EBS snapshots and EBS-backed AMIs | Retention rules keep deleted resources recoverable for a set period; no extra charge |
| AWS Backup Vault Lock, governance mode | Recovery points in a vault | Removable by users with IAM permissions |
| AWS Backup Vault Lock, compliance mode | Recovery points against everyone, AWS included | Immutable after a grace time of at least 72 hours |

Object Lock works only on versioned buckets and protects one version at a time; a default retention in days or years applies to new versions. EBS snapshot lock durations range from 1 to 36,500 days, or an expiration date. Vault Lock bounds retention with a minimum (at least 1 day) and a maximum (up to 36,500 days): backup and copy jobs outside the bounds fail. Without `--changeable-for-days`, the lock stays removable (governance); with it, the lock becomes immutable at the lock date (compliance).

```bash
aws backup put-backup-vault-lock-configuration --backup-vault-name central-locked \
  --min-retention-days 35 --max-retention-days 3650 --changeable-for-days 3

aws ec2 lock-snapshot --snapshot-id snap-0123456789abcdef0 \
  --lock-mode compliance --cool-off-period 24 --lock-duration 365
```

Vault Lock and EBS snapshot lock have been assessed by Cohasset Associates for SEC 17a-4, CFTC and FINRA environments. A complete design also isolates credentials: backups in a separate account, SCPs that deny deleting recovery points and disabling the lock, and KMS keys whose administrators differ from the workload administrators.

> **Exam trap.** Compliance mode is irreversible: a compliance-mode Vault Lock past its grace time, or a compliance snapshot lock past its cooling-off, can't be removed by anyone. If the stem wants to "test the lock configuration before it becomes permanent", choose a grace time (Vault Lock) or a cooling-off period (snapshot lock), or governance mode.

<!-- section: chaos-engineering | objectives: 4.3.5 -->
## Chaos engineering with AWS FIS

Chaos engineering is an experiment, not random breakage:

1. Define the **steady state** with a business-level metric (orders per minute, p99 latency, error rate).
2. State a **hypothesis**: "if one AZ loses power, orders per minute stay within 5 % and p99 latency under 400 ms".
3. Inject a realistic fault with a limited **blast radius** (one AZ, a percentage of instances, one account).
4. Compare with the steady state; fix weaknesses; repeat and automate.

An **FIS experiment template** contains **actions** (sequential or parallel), **targets** (resource IDs, or tags and filters with a selection mode such as `ALL`, `COUNT(n)` or `PERCENT(n)`), **stop conditions** (CloudWatch alarms that stop the experiment when crossed) and the IAM role FIS assumes.

```json
{
  "description": "Stop half of the web tier in one AZ for 10 minutes",
  "targets": {
    "web-az-a": {
      "resourceType": "aws:ec2:instance",
      "resourceTags": { "chaos-ready": "true" },
      "filters": [{ "path": "Placement.AvailabilityZone", "values": ["eu-west-1a"] }],
      "selectionMode": "PERCENT(50)"
    }
  },
  "actions": {
    "stop-web": {
      "actionId": "aws:ec2:stop-instances",
      "parameters": { "startInstancesAfterDuration": "PT10M" },
      "targets": { "Instances": "web-az-a" }
    }
  },
  "stopConditions": [
    { "source": "aws:cloudwatch:alarm", "value": "arn:aws:cloudwatch:eu-west-1:111122223333:alarm:orders-below-slo" }
  ],
  "roleArn": "arn:aws:iam::111122223333:role/fis-experiment-role"
}
```

Other building blocks:

- **Scenario library**: ready-made templates (EC2 and EKS stress, AZ power interruption, AZ application slowdown, cross-AZ traffic slowdown, cross-Region connectivity, EBS latency patterns).
- **Multi-account experiments**: one template targets resources in several accounts, for workloads split across accounts.
- **Safety lever**: one per account and Region; engaging it stops running experiments and cancels any that try to start.
- Pricing per action-minute, by number of target accounts.

Run experiments in pre-production first, then in production with tight stop conditions; Resilience Hub recommends FIS experiments to validate its alarms and SOPs.

> **Exam trap.** An experiment without a stop condition tied to the steady-state metric can harm customers. "Automatically halt the experiment if checkout errors exceed the SLO" is a CloudWatch alarm as a stop condition; "immediately stop every experiment in the account during a real incident" is the safety lever.

<!-- section: key-points -->
## Key points

- AWS Backup in Organizations: backup policies (tags or types, no ARNs), cross-account monitoring and copy, delegated administrator, central locked vault in another Region.
- Logically air-gapped vault: compliance lock always, RAM sharing with individual accounts (other organizations too), multi-party approval.
- Audit Manager for evidence; restore testing measures restore time and validates restored resources.
- Failover tests time detection, decision, traffic shift, data recovery and return to steady state; Route 53 defaults: 30 s interval, threshold 3.
- Resilience: three AZs with capacity for one AZ loss, health checks, automatic replacement, cells, bulkheads, backoff with jitter, queues, idempotency.
- Ransomware: S3 Versioning and Object Lock (governance, compliance, legal hold), EBS snapshot lock (cooling-off 1–72 h), Recycle Bin, Vault Lock (grace time at least 72 h), separate accounts and keys.
- FIS: steady-state hypothesis, templates with actions, targets, stop conditions and role, scenario library, multi-account experiments, safety lever.
