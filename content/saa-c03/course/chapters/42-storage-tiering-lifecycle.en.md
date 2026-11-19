Storage cost on AWS depends less on the service than on where each byte sits over time. Exam questions describe how often data is read, how fast it must come back and how long it must be kept, then ask for the storage class, the lifecycle rule, the access option or the backup design that meets the requirement at the lowest cost.

<!-- section: access-patterns | objectives: 4.1.9 -->
## Reading storage access patterns

Extract four facts from the scenario:

| Question | Typical wording | What it decides |
| --- | --- | --- |
| How often is the data read? | "accessed frequently for 30 days, then rarely", "once a quarter", "unknown" | Frequent, infrequent or archive class, or Intelligent-Tiering |
| How fast must a read return? | "immediately", "within minutes", "within 12 hours" | Millisecond class (Standard-IA, Glacier Instant Retrieval) or restore-based class (Glacier Flexible Retrieval, Deep Archive) |
| How long is the data kept? | "for 7 years", "deleted after 90 days" | Minimum storage duration fit, expiration rule |
| Can the data be recreated? | "can be regenerated from source", "only copy" | Whether a single-AZ class (One Zone-IA) is acceptable |

Also note object size (small objects make per-object charges dominant) and whether the pattern is **predictable** (lifecycle rules) or **unpredictable** (Intelligent-Tiering).

> **Exam tip.** "Infrequently accessed but must be available immediately" points to a millisecond class (Standard-IA, One Zone-IA, Glacier Instant Retrieval), never to Glacier Flexible Retrieval or Deep Archive, which need a restore first.

<!-- section: s3-storage-classes | objectives: 4.1.10, 4.1.19 -->
## S3 storage classes and their charges

Every class except One Zone-IA and Express One Zone stores data in at least three Availability Zones and is designed for 99.999999999 % durability.

| Class | Minimum storage duration | Minimum billable object size | Retrieval fee | AZs | Access |
| --- | --- | --- | --- | --- | --- |
| S3 Standard | None | None | No | 3 or more | Milliseconds |
| S3 Express One Zone | None | None | No | 1 (chosen) | Single-digit milliseconds |
| S3 Intelligent-Tiering | None | None (objects under 128 KB not tiered) | No | 3 or more | Milliseconds for the automatic tiers |
| S3 Standard-IA | 30 days | 128 KB | Per GB | 3 or more | Milliseconds |
| S3 One Zone-IA | 30 days | 128 KB | Per GB | 1 | Milliseconds |
| S3 Glacier Instant Retrieval | 90 days | 128 KB | Per GB | 3 or more | Milliseconds |
| S3 Glacier Flexible Retrieval | 90 days | 40 KB overhead per object | Per GB (Bulk free) | 3 or more | Minutes to hours, after restore |
| S3 Glacier Deep Archive | 180 days | 40 KB overhead per object | Per GB | 3 or more | Hours, after restore |

Restore times for the two archive classes:

| Tier | Glacier Flexible Retrieval | Glacier Deep Archive |
| --- | --- | --- |
| Expedited | 1–5 minutes (objects under 250 MB) | Not available |
| Standard (default) | 3–5 hours | Within 12 hours |
| Bulk | 5–12 hours, no retrieval charge | Within 48 hours |

Points the exam tests:

- **Minimum storage duration**: an object deleted, overwritten or transitioned before the minimum is billed for the remaining days. Data that lives 10 days costs less in S3 Standard than in Standard-IA.
- **Minimum billable size**: a 20 KB object in Standard-IA is billed as 128 KB. Many tiny objects belong in S3 Standard, or should be aggregated into larger objects first.
- **Archive overhead**: each object in Glacier Flexible Retrieval or Deep Archive adds 40 KB of metadata (8 KB billed at the S3 Standard rate, 32 KB at the archive rate).
- **One Zone-IA** costs less than Standard-IA but loses the data if its Availability Zone is destroyed: only for data that can be recreated, such as secondary backup copies or regenerated thumbnails.
- **Glacier Instant Retrieval** is the cheapest class with millisecond reads for data read about once a quarter. **Deep Archive** is the cheapest class overall, for data kept for years and read almost never.

> **Exam trap.** The archive classes of S3 are not the old Amazon Glacier service. Amazon Glacier vaults no longer accept new customers; a new design uses the S3 Glacier storage classes in an S3 bucket.

<!-- section: intelligent-tiering | objectives: 4.1.10, 4.1.19 -->
## S3 Intelligent-Tiering for unknown access patterns

Intelligent-Tiering moves each object between access tiers according to its own access history, for a small monthly monitoring and automation charge per object. There is no retrieval fee, no minimum storage duration, and an accessed object returns to the Frequent Access tier.

| Tier | Entered after | Access |
| --- | --- | --- |
| Frequent Access | Upload, or any access | Milliseconds |
| Infrequent Access | 30 consecutive days without access | Milliseconds |
| Archive Instant Access | 90 consecutive days without access | Milliseconds |
| Archive Access (optional) | 90 days minimum, configurable up to 730 days | Restore: 3–5 hours (Standard) |
| Deep Archive Access (optional) | 180 days minimum, configurable up to 730 days | Restore: within 12 hours (Standard) |

- The three automatic tiers need no configuration. The two optional tiers are activated per bucket, prefix or tag, and only when the application can wait for a restore.
- Objects smaller than 128 KB are not monitored and always stay in Frequent Access.
- Choose it when access is **unknown or changing**. When the pattern is known ("read for 30 days, then never"), a lifecycle rule to a fixed class costs less because it avoids the per-object monitoring charge.

> **Exam trap.** "Unpredictable access, millisecond reads required, minimize cost and operational effort" is Intelligent-Tiering without the optional archive tiers. Enabling Archive Access would break the millisecond requirement.

<!-- section: lifecycle-rules | objectives: 4.1.7, 4.1.16, 4.1.20 -->
## S3 Lifecycle rules

A bucket has one lifecycle configuration with up to 1,000 rules. Each rule has a filter (prefix, tags, object size, or a combination with AND; empty filter = whole bucket) and actions:

| Action | Effect |
| --- | --- |
| `Transition` | Moves current versions to another class N days after creation (or at a date) |
| `Expiration` | Deletes current versions; in a versioned bucket, adds a delete marker instead |
| `NoncurrentVersionTransition` | Moves previous versions N days after they become noncurrent |
| `NoncurrentVersionExpiration` | Permanently deletes previous versions; `NewerNoncurrentVersions` keeps the newest 1 to 100 |
| `AbortIncompleteMultipartUpload` | Deletes the parts of uploads not completed after N days |
| `ExpiredObjectDeleteMarker` | Removes delete markers that no longer have any version behind them |

Transitions only go "down" the waterfall: Standard → Standard-IA → Intelligent-Tiering → One Zone-IA → Glacier Instant Retrieval → Glacier Flexible Retrieval → Deep Archive (skipping steps is allowed; One Zone-IA can only go to Glacier Flexible Retrieval or Deep Archive). A lifecycle rule never moves an object back to S3 Standard: that requires a restore and copy.

```json
{
  "Rules": [
    {
      "ID": "logs-tiering",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/" },
      "Transitions": [
        { "Days": 30, "StorageClass": "STANDARD_IA" },
        { "Days": 120, "StorageClass": "GLACIER" },
        { "Days": 365, "StorageClass": "DEEP_ARCHIVE" }
      ],
      "Expiration": { "Days": 2555 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration --bucket example-logs \
  --lifecycle-configuration file://lifecycle.json
```

Rules and constraints:

- Since September 2024, objects **smaller than 128 KB are not transitioned** by default; an `ObjectSizeGreaterThan` / `ObjectSizeLessThan` filter changes that. Each transition is a billed request, so transitioning millions of small objects can cost more than it saves.
- Since July 2026, a rule can transition objects to Standard-IA or One Zone-IA from day 0. Older material states a 30-day minimum in S3 Standard first; the 30-day minimum storage **charge** of these classes still applies.
- A single rule cannot leave an object in a class for less than that class's minimum: Glacier Instant Retrieval at day 4 then Deep Archive at day 20 is rejected (Deep Archive must come at day 94 or later).
- Versioning protects against deletion but multiplies stored data: pair it with `NoncurrentVersionExpiration` or `NoncurrentVersionTransition`.
- **S3 Storage Class Analysis** watches a bucket, prefix or tag for 30 days or more and recommends when to move Standard objects to Standard-IA; it exports a daily CSV.

Data lifecycle in a scenario usually maps to: hot (Standard, days to weeks), warm (Standard-IA or Glacier Instant Retrieval, months), cold (Glacier Flexible Retrieval or Deep Archive, years), then expiration at the end of the legal retention period.

> **Exam trap.** Lifecycle expiration in a versioned bucket does not free space: it only adds a delete marker. Add `NoncurrentVersionExpiration` to delete the old versions.

<!-- section: requester-pays | objectives: 4.1.1 -->
## Access options: Requester Pays

By default the bucket owner pays for storage, requests and data transfer out. With **Requester Pays** enabled on a bucket:

| Charge | Paid by |
| --- | --- |
| Storage | Bucket owner (always) |
| Requests and data downloaded | Requester's account |
| Requester that assumed an IAM role in another account | Account that owns the role |
| Restore of an archived object | Requester pays the request; the owner pays the retrieval |

- Every request must be **authenticated** and must carry `x-amz-request-payer: requester` (`--request-payer requester` in the CLI). Anonymous access is no longer possible.
- Typical use: sharing large datasets (genomics, imagery, reference data) with partners in other AWS accounts without paying their download costs.

```bash
aws s3api put-bucket-request-payment --bucket example-datasets \
  --request-payment-configuration Payer=Requester
aws s3api get-object --bucket example-datasets --key 2026/data.parquet \
  data.parquet --request-payer requester
```

> **Exam trap.** Requester Pays does not work for public or anonymous users. If the consumers are anonymous internet users, serve the data through CloudFront instead.

<!-- section: backup-archive | objectives: 4.1.5, 4.1.7, 4.1.17 -->
## Backup and archival solutions

A backup strategy states what is copied, how often (RPO), where (other AZ, Region or account), for how long, and how it is protected from deletion.

| Requirement | Solution |
| --- | --- |
| Central backup policy for EC2, EBS, EFS, FSx, RDS, Aurora, DynamoDB, S3 across accounts | AWS Backup backup plans, with AWS Organizations backup policies |
| Copy backups to another Region or account for disaster recovery | Copy action in the AWS Backup rule (or cross-Region snapshot copy) |
| Point-in-time restore of a database or bucket | Continuous backups in AWS Backup (1 to 35 days of retention) |
| Backups nobody can delete, root user included | AWS Backup Vault Lock in compliance mode |
| WORM objects for regulatory retention | S3 Object Lock (compliance mode, versioning required) |
| Automated EBS snapshots and AMIs at no extra charge | Amazon Data Lifecycle Manager |
| EBS snapshots kept 90 days or more, rarely restored | EBS Snapshots Archive (up to 75 % lower storage cost) |
| Object copies in another Region | S3 Cross-Region Replication (versioning on both buckets) |

AWS Backup details:

- A **backup plan** contains rules: frequency (hourly to monthly, or cron), backup window, lifecycle (move to cold storage, delete after), copy to other Regions or accounts. Resources are assigned by tag or ID. Backups are stored in a **backup vault** encrypted with a KMS key.
- **Cold storage** requires at least 90 days in cold storage (`DeleteAfterDays` at least 90 more than `MoveToColdStorageAfterDays`) and is supported for EBS (through Snapshots Archive), EFS, DynamoDB with advanced features, Timestream, CloudFormation, SAP HANA on EC2 and VMware backups. RDS and Aurora snapshots do not tier to cold storage.
- **Vault Lock**: governance mode can be removed by users with IAM permissions; compliance mode becomes immutable after a grace time of at least 3 days, and then not even AWS can remove it.

EBS snapshots are incremental and stored in S3 by AWS. Archiving a snapshot converts it to a full snapshot and moves it to the archive tier, which has a 90-day minimum and must be restored to the standard tier before use.

> **Exam trap.** A snapshot in the same Region and account protects against accidental deletion of a volume, not against a Regional outage or a compromised account. "Survive the loss of a Region" needs a cross-Region copy; "protect from a compromised administrator" needs another account plus Vault Lock or Object Lock.

<!-- section: key-points -->
## Key points

- Read four facts: access frequency, read latency, retention period, and whether the data can be recreated.
- Minimum durations: Standard-IA and One Zone-IA 30 days, Glacier Instant and Flexible Retrieval 90 days, Deep Archive 180 days. Minimum billable size 128 KB for the IA classes and Glacier Instant Retrieval.
- Millisecond reads rule out Glacier Flexible Retrieval and Deep Archive; Glacier Instant Retrieval is the cheapest millisecond class for rarely read data.
- Unknown or changing access: Intelligent-Tiering (no retrieval fee, per-object monitoring charge, objects under 128 KB stay in Frequent Access).
- Lifecycle rules only move data down; objects under 128 KB are not transitioned by default; in versioned buckets add noncurrent-version actions.
- Requester Pays: the owner pays storage, authenticated requesters pay requests and downloads; no anonymous access.
- AWS Backup centralizes plans, cross-Region and cross-account copies and Vault Lock; EBS Snapshots Archive and Data Lifecycle Manager cut snapshot costs.
