Data has a life: it is loaded, queried, cooled down, archived, expired or deleted on request, and protected against loss along the way. Exam questions on this task ask for the right `COPY` or `UNLOAD` options, the lifecycle rule that moves or expires data at the right age, the effect of versioning and DynamoDB TTL, how to delete data for a legal request, and which backup or replication feature meets a recovery requirement.

<!-- section: copy-unload | objectives: 2.3.1 -->
## Loading and unloading between S3 and Redshift

**`COPY`** appends rows from files to an existing table, in parallel across the slices of the cluster or workgroup.

| Need | `COPY` option or practice |
| --- | --- |
| Fastest load | Several files of similar size, a multiple of the number of slices, 1 MB to 1 GB each after compression; uncompressed CSV, Parquet and ORC files of 128 MB or more are split automatically, compressed CSV or JSON files are not |
| Exact list of files, or files under different prefixes | `MANIFEST` pointing to a JSON manifest |
| Authorization | `IAM_ROLE` with an attached role ARN, or `IAM_ROLE default` |
| Formats | `CSV`, `JSON` (with `'auto'` or a JSONPaths file), `AVRO`, `PARQUET`, `ORC`, fixed width; `GZIP`, `BZIP2`, `ZSTD`, `LZOP` |
| Bucket in another Region | `REGION` |
| Tolerate a few bad rows, or test without loading | `MAXERROR`, `NOLOAD`; details in `SYS_LOAD_ERROR_DETAIL` (or `STL_LOAD_ERRORS` on provisioned clusters) |
| Continuous loads as files land in a prefix | Auto-copy with `COPY ... JOB CREATE` |
| Upsert instead of append | `COPY` into a staging table, then `MERGE` into the target |

**`UNLOAD`** writes the result of a query to S3.

| Behavior | Default and options |
| --- | --- |
| Format | Pipe-delimited text by default; `CSV`, `JSON`, `PARQUET` (up to 2 times faster to unload and up to 6 times less storage than text) |
| Files | `PARALLEL ON` (default): files per slice; `PARALLEL OFF`: serial, ordered output; `MAXFILESIZE` 5 MB to 6.2 GB (default 6.2 GB) |
| Layout | `PARTITION BY (col, ...)` writes Hive-style folders, ready for Athena or Spectrum |
| Encryption | SSE-S3 by default; `ENCRYPTED` with `KMS_KEY_ID` for SSE-KMS (client-side encryption is no longer available) |
| Existing files | Fails by default; `ALLOWOVERWRITE` or `CLEANPATH` (deletes the target files first) |
| Extras | `MANIFEST`, `HEADER` (not with Parquet), `REGION` |

```sql
COPY sales_stage
FROM 's3://example-lake/exports/sales/2026-11-20/'
IAM_ROLE 'arn:aws:iam::111122223333:role/RedshiftLoad'
FORMAT AS PARQUET;

MERGE INTO sales USING sales_stage s ON sales.sale_id = s.sale_id
WHEN MATCHED THEN UPDATE SET amount = s.amount
WHEN NOT MATCHED THEN INSERT VALUES (s.sale_id, s.store_id, s.amount, s.sale_date);

UNLOAD ('SELECT * FROM sales WHERE sale_date < ''2025-01-01''')
TO 's3://example-lake/archive/sales/'
IAM_ROLE 'arn:aws:iam::111122223333:role/RedshiftUnload'
FORMAT AS PARQUET
PARTITION BY (sale_date)
ENCRYPTED KMS_KEY_ID '1234abcd-12ab-34cd-56ef-1234567890ab';
```

A frequent pattern: unload cold rows to partitioned Parquet in S3, delete them from Redshift, and keep them queryable through Spectrum.

> **Exam trap.** A single large gzip file loads serially on one slice. "The nightly COPY of one 40 GB .csv.gz file is slow" is fixed by splitting it into many compressed files (or using Parquet), not by resizing the cluster. And `UNLOAD` does not accept `LIMIT` in the outer `SELECT`.

<!-- section: storage-tiers | objectives: 2.3.2 -->
## Moving data between S3 storage classes

A data lake usually ages through zones: raw data is read heavily for days, curated data for months, and history only for audits. S3 Lifecycle `Transition` actions move objects down, never back to Standard.

| Data | Typical class |
| --- | --- |
| Raw landing data, reprocessed in the first days | S3 Standard |
| Curated data with unknown or changing access | S3 Intelligent-Tiering (no retrieval fee, per-object monitoring charge) |
| Data read a few times a month, must stay queryable | S3 Standard-IA (30-day minimum, 128 KB minimum billable size) |
| History queried about once a quarter, millisecond access | S3 Glacier Instant Retrieval (90-day minimum) |
| Archives restored rarely, hours acceptable | S3 Glacier Flexible Retrieval (90 days) or Deep Archive (180 days) |

Consequences for analytics:

- Athena skips objects in Glacier Flexible Retrieval and Deep Archive. To query them, restore the objects and set the table property `read_restored_glacier_objects` to `true` (Hive tables, engine version 3); Athena does not restore objects itself.
- Transitions are billed per object and objects smaller than 128 KB are not transitioned by default: compact small files before tiering them.
- Filter rules by prefix (`raw/`, `curated/`), by tag or by object size; a rule applies to existing and new objects, and when several rules match an object, S3 applies the least costly action.

> **Exam trap.** Moving data that Athena dashboards still read to Glacier Flexible Retrieval makes the queries silently return fewer rows. Keep queryable data in a millisecond class (Standard-IA, Glacier Instant Retrieval or Intelligent-Tiering without the optional archive tiers).

<!-- section: expiration | objectives: 2.3.3 -->
## Expiring data at a given age

```json
{
  "Rules": [
    {
      "ID": "expire-raw-after-90-days",
      "Status": "Enabled",
      "Filter": { "Prefix": "raw/" },
      "Expiration": { "Days": 90 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 7, "NewerNoncurrentVersions": 2 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 3 }
    },
    {
      "ID": "expire-athena-results",
      "Status": "Enabled",
      "Filter": { "Prefix": "athena-results/" },
      "Expiration": { "Days": 7 }
    }
  ]
}
```

| Bucket state | Effect of `Expiration` |
| --- | --- |
| Not versioned | Object queued and removed permanently |
| Versioning enabled | A delete marker becomes the current version; the data remains as a noncurrent version |
| Versioning suspended | A delete marker with a null version ID replaces the null version |

- `NoncurrentVersionExpiration` permanently deletes old versions; `NewerNoncurrentVersions` (1 to 100) keeps the newest ones and requires a `Filter`.
- `ExpiredObjectDeleteMarker` removes delete markers left with no version behind them.
- Removal is asynchronous, but billing stops at the expiration time.
- Expiring an object before its class minimum (30, 90 or 180 days) is billed for the full minimum.
- A bucket policy cannot block lifecycle deletions; Object Lock-protected versions are not removed.

> **Exam tip.** Lifecycle expiration costs nothing to run and needs no code. "Delete files 90 days after creation with the least operational overhead" is an `Expiration` rule, not a scheduled Lambda function.

<!-- section: versioning-ttl | objectives: 2.3.4 -->
## S3 Versioning and DynamoDB TTL

**S3 Versioning** keeps every version of every object. A bucket is unversioned, versioning-enabled or versioning-suspended; once enabled it can never return to unversioned. A simple `DELETE` adds a delete marker (recoverable by deleting the marker); a `DELETE` with a version ID removes that version permanently. Versioning is required by S3 Replication and Object Lock. MFA delete adds a second factor for permanent deletions and versioning changes.

**DynamoDB Time to Live (TTL)** deletes items whose TTL attribute, a **Number** holding a Unix epoch time in seconds, is in the past.

| TTL fact | Consequence |
| --- | --- |
| Deletion within a few days of expiry, not at the exact second | Filter expired items in queries and scans (`expires_at` greater than now) |
| No write capacity consumed in the source Region | Cheaper than a cleanup job with `DeleteItem` |
| Deleted items appear in DynamoDB Streams as service deletions | A Lambda function on the stream can archive expired items to S3 |
| Items with a non-Number TTL attribute are ignored | Store epoch seconds, not an ISO date string |
| Global tables replicate TTL deletes | Each replica Region consumes replicated writes |

```bash
aws s3api put-bucket-versioning --bucket example-lake \
  --versioning-configuration Status=Enabled
aws dynamodb update-time-to-live --table-name Sessions \
  --time-to-live-specification "Enabled=true,AttributeName=expires_at"
```

> **Exam trap.** Versioning multiplies storage: every overwrite keeps the old version. Pair it with `NoncurrentVersionExpiration`, otherwise the bill grows with each daily rewrite of the same keys.

<!-- section: deletion | objectives: 2.3.5 -->
## Deleting data for business and legal requirements

A deletion request (for example a data subject asking for erasure) must reach every copy: raw files, curated tables, warehouse tables, indexes, versions, snapshots and backups.

| Store | How to delete for good |
| --- | --- |
| S3, versioned | Delete every version and the delete markers (or `NoncurrentVersionExpiration`); objects under Object Lock cannot be deleted until retention ends |
| Iceberg tables | `DELETE FROM ... WHERE`, then expire snapshots and remove orphan files (`VACUUM` in Athena); until then older snapshots still hold the rows |
| Plain Parquet or CSV files | Rewrite the affected files or partitions without the records |
| Redshift | `DELETE`, then space is reclaimed by automatic vacuum delete or `VACUUM DELETE ONLY` |
| DynamoDB | `DeleteItem`, `BatchWriteItem`, or TTL for time-based removal |
| Backups and snapshots | Retention rules in AWS Backup, Redshift and RDS snapshot retention: deleted data disappears when the last backup holding it expires |

Find the data first: Amazon Macie discovers PII in S3, catalog tags and SageMaker Catalog metadata locate the datasets. When the requirement is to **keep** data (legal hold, regulatory retention), use the opposite tools: S3 Object Lock in compliance mode, legal holds, AWS Backup Vault Lock.

Encrypting each tenant's data with its own KMS key allows crypto-shredding: scheduling the key for deletion (7 to 30 days waiting period) makes every copy encrypted with it unreadable.

> **Exam trap.** A row-level `DELETE` on an Iceberg table is not a physical deletion: the old data files stay referenced by earlier snapshots. Legal erasure requires snapshot expiration and orphan file removal as well.

<!-- section: resiliency | objectives: 2.3.6 -->
## Protecting data with resiliency and availability

| Store | Built-in resiliency | Added protection |
| --- | --- | --- |
| S3 | Multiple Availability Zones (except One Zone classes), 11 nines of durability | Versioning; Cross-Region or Same-Region Replication (versioning on both buckets; S3 Replication Time Control replicates 99.99 % of objects within 15 minutes); Object Lock |
| DynamoDB | Replicated across Availability Zones | Point-in-time recovery, recovery period 1 to 35 days (default 35), restore to a new table, also across Regions; on-demand backups; global tables for multi-Region active-active |
| Redshift provisioned | Automated snapshots about every 8 hours or 5 GB of changes per node; retention 1 day by default, 1 to 35 days on RA3 and RG | Manual snapshots kept until deleted; cross-Region snapshot copy; Multi-AZ (RA3 and RG, two AZs, RPO of zero, 99.99 % SLA) |
| Redshift Serverless | Recovery points every 30 minutes, kept 24 hours | Manual snapshots, AWS Backup |
| RDS and Aurora | Multi-AZ; Aurora storage spread over three AZs | Automated backups up to 35 days, cross-Region read replicas, Aurora Global Database |
| Kinesis Data Streams | Data replicated across three AZs | Retention up to 365 days for replay |
| EMR | HDFS replicated across core nodes, three primary nodes for high availability | Keep persistent data in S3: HDFS is lost with the cluster |

AWS Backup centralizes backup plans for S3, DynamoDB, RDS, Aurora, Redshift, EFS and others, with copies to other Regions and accounts and Vault Lock against deletion.

> **Exam tip.** Match the threat to the feature: accidental overwrite → versioning or PITR; AZ failure → Multi-AZ; Region failure → cross-Region replication or snapshot copy; compromised account or ransomware → copies in another account with Vault Lock or Object Lock.

<!-- section: key-points -->
## Key points

- `COPY`: many similar files (multiple of slices, 1 MB–1 GB compressed), `MANIFEST`, `IAM_ROLE`, `FORMAT`, staging table plus `MERGE` for upserts; auto-copy jobs for continuous loads.
- `UNLOAD`: parallel by default, 6.2 GB maximum file size, `FORMAT PARQUET`, `PARTITION BY`, SSE-S3 by default or `KMS_KEY_ID`.
- Lifecycle transitions go down only; Athena skips Glacier Flexible Retrieval and Deep Archive objects; small objects are not transitioned by default.
- Expiration in a versioned bucket adds a delete marker; add `NoncurrentVersionExpiration`; billing stops at expiration.
- Versioning cannot be turned off, only suspended. DynamoDB TTL: epoch seconds as a Number, deleted within days, no WCU, visible in Streams.
- Legal deletion reaches every copy: versions, Iceberg snapshots, Redshift tables, backups; retention requirements use Object Lock and Vault Lock instead.
- Resiliency: S3 replication and RTC, DynamoDB PITR (1–35 days) and global tables, Redshift snapshots, cross-Region copy and Multi-AZ, AWS Backup across accounts.
