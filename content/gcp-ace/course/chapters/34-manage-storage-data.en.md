This chapter covers day-2 work on storage and databases: securing Cloud Storage objects, lifecycle rules, querying, cost estimates, backups and restores, Dataflow and BigQuery jobs, Database Center and customer-managed encryption keys (CMEK). Exam options are concrete commands or console steps: a flag, a role or the target of a restore usually decides.

<!-- section: objects-security | objectives: 3.2.1 -->
## Managing and securing Cloud Storage objects

Use `gcloud storage` (recommended over the older `gsutil`):

```bash
gcloud storage cp ./report.csv gs://example-finance/2026/          # upload
gcloud storage cp -r gs://example-finance/2026 ./local-copy        # download a prefix
gcloud storage mv gs://example-finance/tmp/a.csv gs://example-finance/archive/a.csv
gcloud storage rm gs://example-finance/tmp/**                      # delete objects under a prefix
gcloud storage ls -a gs://example-finance/report.csv               # all versions (generations)
gcloud storage objects update gs://example-finance/old.csv --storage-class=COLDLINE
```

**Uniform bucket-level access** (recommended; required for managed folders, bucket IAM Conditions and identity federation) disables ACLs so only IAM applies. It can be turned off only within 90 days.

| Need | Predefined role |
| --- | --- |
| Read and list objects | Storage Object Viewer (`roles/storage.objectViewer`) |
| Upload only, no read, overwrite or delete (drop box) | Storage Object Creator (`roles/storage.objectCreator`) |
| Read, create, overwrite and delete objects | Storage Object User (`roles/storage.objectUser`) |
| Everything on objects, including object IAM and retention settings | Storage Object Admin (`roles/storage.objectAdmin`) |
| Objects plus bucket settings, bucket IAM, create and delete buckets | Storage Admin (`roles/storage.admin`) |

```bash
gcloud storage buckets update gs://example-finance --uniform-bucket-level-access
gcloud storage buckets add-iam-policy-binding gs://example-finance \
  --member=group:auditors@example.com --role=roles/storage.objectViewer
gcloud storage buckets update gs://example-finance --public-access-prevention
```

**Public access prevention** blocks access through `allUsers` and `allAuthenticatedUsers`; the organization policy constraint `storage.publicAccessPrevention` enforces it everywhere.

**Signed URLs** give someone without a Google account time-limited access to one object, **7 days** at most (V4). Sign with `--impersonate-service-account` rather than a downloaded key; the system-managed signing key then limits `--duration` to **12 hours** (7 days only with `--private-key-file` or an account activated with `gcloud auth activate-service-account`):

```bash
gcloud storage sign-url gs://example-finance/invoice-42.pdf --duration=2h \
  --impersonate-service-account=signer@example-prj.iam.gserviceaccount.com
```

**Protection against deletion and overwrite:**

| Feature | Behavior |
| --- | --- |
| Soft delete | On by default, 7 days (3 to 90, or 0 to disable); restore with `gcloud storage restore`; billed while kept |
| Object Versioning | `--versioning`: overwrite or delete keeps a **noncurrent** version; restore by copying `gs://b/o#GENERATION` |
| Retention policy | `--retention-period=30d`: no delete or replace before that age |
| Bucket Lock | `--lock-retention-period`: retention becomes permanent, can be lengthened only |
| Object holds | `objects update --temporary-hold` or `--event-based-hold`: no deletion until released |

> **Exam trap.** Locking a retention policy is irreversible and blocks deleting the bucket until every object has met the period. "Write once, read many" for compliance = retention policy plus Bucket Lock, not Object Versioning (versions can still be deleted).

<!-- section: lifecycle | objectives: 3.2.2 -->
## Object lifecycle management

A lifecycle configuration is a list of rules; each rule has **one action** and **one or more conditions**, and an object must meet all conditions of a rule.

| Action | Use |
| --- | --- |
| `Delete` | Delete live objects (soft-deleted first) or noncurrent versions |
| `SetStorageClass` | Move objects to a colder class |
| `AbortIncompleteMultipartUpload` | Clean up abandoned multipart uploads |

Useful conditions: `age` (days since creation), `createdBefore`, `isLive`, `numNewerVersions`, `daysSinceNoncurrentTime`, `matchesStorageClass`, `matchesPrefix` / `matchesSuffix`, `customTimeBefore`, `sizeAboveBytes`.

```json
{
  "rule": [
    {
      "action": { "type": "SetStorageClass", "storageClass": "NEARLINE" },
      "condition": { "age": 30, "matchesStorageClass": ["STANDARD"] }
    },
    {
      "action": { "type": "SetStorageClass", "storageClass": "ARCHIVE" },
      "condition": { "age": 365, "matchesStorageClass": ["NEARLINE"] }
    },
    {
      "action": { "type": "Delete" },
      "condition": { "isLive": false, "numNewerVersions": 3 }
    }
  ]
}
```

```bash
gcloud storage buckets update gs://example-logs --lifecycle-file=lifecycle.json
gcloud storage buckets describe gs://example-logs --format="default(lifecycle_config)"
gcloud storage buckets update gs://example-logs --clear-lifecycle
```

Rules to remember:

- `SetStorageClass` only goes colder (Standard → Nearline → Coldline → Archive). Invalid transitions are not rejected; they never happen.
- A lifecycle class change doesn't rewrite the object: no retrieval or early deletion fee, but one Class A operation per object (costly on millions of tiny objects; filter with `sizeAboveBytes`).
- `Delete` before the minimum duration (Nearline 30 days, Coldline 90, Archive 365) incurs early deletion charges.
- Configuration changes take **up to 24 hours** to apply; actions run asynchronously.
- In a versioned bucket, `Delete` on a live object makes it noncurrent; `numNewerVersions` and `daysSinceNoncurrentTime` match noncurrent versions only.
- **Autoclass** changes classes automatically from access patterns; `SetStorageClass` rules can't be used with it.

> **Exam tip.** "Access patterns are unpredictable" → Autoclass. "Never read after 90 days, keep 7 years" → lifecycle rules (`SetStorageClass` to Archive, then `Delete` at the right `age`).

<!-- section: querying-data | objectives: 3.2.3 -->
## Querying data in database instances

| Product | Command line | Console |
| --- | --- | --- |
| BigQuery | `bq query --use_legacy_sql=false '...'` | BigQuery Studio |
| Cloud SQL | `gcloud sql connect INSTANCE --user=USER` (opens the local `mysql`, `psql` or `sqlcmd` client) | Cloud SQL Studio |
| AlloyDB | `psql` from a host that reaches the private IP, or through the AlloyDB Auth Proxy | AlloyDB Studio |
| Spanner | `gcloud spanner databases execute-sql DB --instance=INST --sql='...'` | Spanner Studio |
| Bigtable | `cbt read`, `cbt lookup`, `cbt count` | Bigtable Studio |
| Firestore | Client libraries | Firestore Studio (Query Builder) |

```bash
# BigQuery: GoogleSQL, estimate first, cap the bytes billed
bq query --use_legacy_sql=false --dry_run \
  'SELECT region, SUM(amount) FROM `example-prj.sales.orders` WHERE order_date >= "2026-11-01" GROUP BY region'
bq query --use_legacy_sql=false --maximum_bytes_billed=10000000000 \
  'SELECT region, SUM(amount) FROM `example-prj.sales.orders` WHERE order_date >= "2026-11-01" GROUP BY region'

# Spanner
gcloud spanner databases execute-sql orders-db --instance=prod-spanner \
  --sql='SELECT OrderId, Status FROM Orders WHERE CustomerId = 42'

# Bigtable (cbt reads project and instance from ~/.cbtrc)
gcloud components install cbt
cbt read sensor-data prefix=device#4711 count=10
cbt lookup sensor-data 'device#4711#20261127'

# Cloud SQL
gcloud sql connect orders-mysql --user=app_reader --database=orders
```

> **Exam trap.** Without `--use_legacy_sql=false`, `bq query` can fall back to legacy SQL, where backtick-quoted `project.dataset.table` names fail. On a non-clustered table, `LIMIT` does not reduce the bytes read and billed: select fewer columns or filter on the partitioning column. To look at a few rows for free, use the table preview (`bq head`).

Every Firestore query needs an index; a missing one returns an error with a link to create it.

<!-- section: cost-estimation | objectives: 3.2.4 -->
## Estimating storage costs

Use the **Google Cloud Pricing Calculator** for a planned workload; use Billing reports or the billing export to BigQuery for actual spend.

| Product | Main cost components |
| --- | --- |
| Cloud Storage | GB-month by class and location type, Class A/B operations, retrieval fees (Nearline, Coldline, Archive), early deletion, egress and replication |
| BigQuery | Storage (active or long-term) and compute (on-demand bytes processed or capacity slots) |
| Cloud SQL / AlloyDB | vCPUs and memory (high availability costs more), storage, backups, egress |
| Spanner | Compute capacity (nodes or processing units), storage, backups |
| Bigtable | Nodes per cluster, SSD or HDD storage, backups |
| Firestore | Document reads, writes and deletes, stored data, egress |

BigQuery (US multi-region):

- On-demand: **$6.25 per TiB** processed, first **1 TiB per month free**, minimum 10 MB per table referenced and per query; cached and failed queries are free.
- Storage: 10 GiB per month free. A table or partition not modified for **90 consecutive days** becomes **long-term** storage, about 50 % cheaper. Querying doesn't reset the timer; loads, DML and query writes into the table do.
- Capacity: Standard, Enterprise and Enterprise Plus editions, billed per slot-hour.

```bash
bq query --use_legacy_sql=false --dry_run 'SELECT * FROM `example-prj.logs.events`'
# Query successfully validated. ... this query will process 1288490188800 bytes of data.
```

A dry run is free: bytes processed × on-demand price = estimated cost. `--maximum_bytes_billed` makes a query fail rather than exceed a limit.

> **Exam tip.** Cost of a query before running it → `bq query --dry_run` (or the console query validator). Monthly cost of a new solution → Pricing Calculator. Last month's spend by project → billing export to BigQuery.

<!-- section: backup-restore | objectives: 3.2.5 -->
## Backing up and restoring databases

| Product | Backups | Point-in-time recovery | Restore target |
| --- | --- | --- | --- |
| Cloud SQL | Automated (in a backup window, 7 retained by default, up to 365) and on-demand; enhanced backups through Backup and DR | Binary logs (MySQL) or write-ahead logs (PostgreSQL), needs automated backups | Backup: an existing instance (overwritten) or a new one. PITR: always a **new instance** (clone) |
| AlloyDB | Continuous backup and recovery (default 14 days, 1 to 35), automated and on-demand backups (up to 1 year) | Any point in the continuous backup window | Always a **new cluster** in the same region |
| Spanner | On-demand full backups, backup schedules (full or incremental), retention up to 1 year | `version_retention_period` 1 hour by default, up to 7 days | A **new database** |
| Bigtable | On-demand and automated backups of one table on one cluster (standard or hot) | No | A **new table**, any instance, region or project |
| Firestore | Scheduled backups (one daily and one weekly schedule, retention up to 14 weeks) | PITR: 7 days when enabled, otherwise about 1 hour | A **new database** |

```bash
# Cloud SQL
gcloud sql backups create --instance=orders-mysql --description="before-migration"
gcloud sql backups list --instance=orders-mysql
gcloud sql backups restore BACKUP_ID --restore-instance=orders-mysql-restored
gcloud sql instances patch orders-mysql --backup-start-time=02:00 --retained-backups-count=30 \
  --enable-bin-log --retained-transaction-log-days=7
gcloud sql instances clone orders-mysql orders-mysql-pitr --point-in-time='2026-11-27T09:15:00Z'

# AlloyDB
gcloud alloydb backups create pre-release --cluster=inventory --region=europe-west1
gcloud alloydb clusters restore inventory-restored --region=europe-west1 \
  --source-cluster=inventory --point-in-time='2026-11-27T09:15:00Z'

# Spanner
gcloud spanner backups create orders-bk --instance=prod-spanner --database=orders-db \
  --retention-period=30d --async
gcloud spanner databases restore --source-instance=prod-spanner --source-backup=orders-bk \
  --destination-instance=prod-spanner --destination-database=orders-db-restored

# Bigtable
gcloud bigtable backups create sensors-bk --instance=iot --cluster=iot-c1 \
  --table=sensor-data --retention-period=7d
gcloud bigtable instances tables restore --source-instance=iot --source-cluster=iot-c1 \
  --source=sensors-bk --destination-instance=iot --destination=sensor-data-restored

# Firestore
gcloud firestore backups schedules create --database='(default)' --recurrence=daily --retention=14w
gcloud firestore databases restore \
  --source-backup=projects/example-prj/locations/nam5/backups/BACKUP_ID \
  --destination-database=orders-restored
gcloud firestore databases update --database='(default)' --enable-pitr
gcloud firestore export gs://example-fs-exports --database='(default)'
```

- Cloud SQL standard on-demand backups are kept until you delete them (or the project); automated backups follow the retention count. When an instance is deleted, its automated backups are removed one per day over the former retention period, unless backups are retained (`--retain-backups-on-delete`); a **final backup** taken at deletion is kept 30 days by default. A backup restores only to an instance with the same database version.
- A Spanner instance with backups can't be deleted, and a backup can't outlive its instance: export to keep the data.
- Firestore backups contain the data and the index configurations but exclude TTL policies and Security Rules: reapply those two. Use export/import to Cloud Storage to move data to another project or keep copies beyond 14 weeks.

> **Exam trap.** Almost every restore creates a **new** resource (instance, cluster, database or table); only a Cloud SQL backup restore can overwrite an existing instance, replacing all its data. To recover a few deleted rows in Spanner or Firestore, do a stale read at an earlier timestamp in the PITR window and write them back.

<!-- section: job-status | objectives: 3.2.6 -->
## Reviewing Dataflow and BigQuery job status

**Dataflow.** The **Jobs** page shows each job's status (Running, Succeeded, Failed, Cancelled, Draining, Drained), job graph, metrics (throughput, data freshness, system lag) and worker logs.

```bash
gcloud dataflow jobs list --region=us-central1 --status=active
gcloud dataflow jobs describe JOB_ID --region=us-central1
gcloud dataflow jobs drain JOB_ID --region=us-central1     # streaming only: finish buffered data
gcloud dataflow jobs cancel JOB_ID --region=us-central1    # stop now, in-flight data may be lost
```

| Stop option | Applies to | Effect |
| --- | --- | --- |
| Drain | Streaming only | Stops reading input, finishes buffered data, closes windows early |
| Cancel | Batch and streaming | Stops at once; in-flight data may be lost |
| Force cancel | Jobs stuck cancelling | No cleanup, can leak worker VMs; regular cancel first, 30 minutes before |

**BigQuery.** Jobs (query, load, extract, copy) are `PENDING`, `RUNNING` or `DONE`; a failed job is `DONE` with an error result. Job history is kept for six months.

```bash
bq ls -j -n 20 example-prj                               # your recent jobs
bq ls -j --all=true --filter='states:RUNNING,PENDING' example-prj
bq --location=US show -j JOB_ID                          # status, bytes processed, errors
bq --location=US wait JOB_ID                             # block until done
bq --location=US cancel JOB_ID
bq query --use_legacy_sql=false \
  'SELECT job_id, user_email, state, total_bytes_processed
   FROM `region-us`.INFORMATION_SCHEMA.JOBS
   WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
   ORDER BY creation_time DESC'
```

Console: Job history > **Personal history** or **Project history**. BigQuery Job User and BigQuery User manage their own jobs only; full details of everyone's jobs need `bigquery.jobs.listAll` (BigQuery Resource Admin or BigQuery Admin); cancelling anyone's job needs BigQuery Admin.

<!-- section: database-center | objectives: 3.2.7 -->
## Database Center

Database Center (GA) is one dashboard for the database fleet across projects: inventory, **health issues** with recommendations, and metrics. Health monitoring covers Cloud SQL, AlloyDB, Spanner, Bigtable, Firestore, Memorystore for Redis and Redis Cluster, and Oracle Database@Google Cloud; BigQuery appears in the inventory only.

| Category | Example health issues |
| --- | --- |
| Availability | Database resource not failover protected, not multi-regional for disaster recovery |
| Data protection | No automated backup policy, short backup retention, last backup failed or older than 24 hours, no point-in-time recovery |
| Security | Public IP enabled, exposed to broad access, unencrypted connections, auditing not enabled |
| Industry compliance | Violations of CIS, PCI-DSS or HIPAA controls (depends on the Security Command Center tier) |

Filters: tier, database product, category. Data lags a few minutes, up to 24 hours. Checks that depend on Security Command Center or Gemini Cloud Assist show as passing when those aren't enabled.

| Requirement | Setting |
| --- | --- |
| View the fleet | Database Center Viewer (`roles/databasecenter.viewer`) at organization (recommended), folder or project level |
| See recommender-based health issues | Also Recommender Viewer (`roles/recommender.viewer`) |
| Security issues from Security Command Center | Security Command Center activated |
| Ask questions about the fleet in natural language | Gemini Cloud Assist chat (Preview) at project or folder level |

> **Exam tip.** "One place to find every database instance in the organization that has no automated backups or is exposed on a public IP" → Database Center, with `roles/databasecenter.viewer` granted at the organization.

<!-- section: cmek | objectives: 3.2.8 -->
## Configuring customer-managed encryption keys (CMEK)

Data at rest is encrypted by default with Google-owned keys. With CMEK the key lives in **Cloud KMS** under your control (rotate, disable, destroy, audit). The steps:

1. Create a key ring and key **in the same location as the data** (regional resource → same region; multi-region → matching multi-region). For a Cloud Storage dual-region bucket: a configurable pair such as `us-east1`+`us-west1` takes a key ring in the multi-region that contains it (`us`); a predefined dual-region such as `nam4` takes a key ring in `nam4`.
2. Grant the product's **service agent** the Cloud KMS CryptoKey Encrypter/Decrypter role (`roles/cloudkms.cryptoKeyEncrypterDecrypter`) on the key.
3. Point the resource at the key.

```bash
gcloud kms keyrings create data-keys --location=europe-west1
gcloud kms keys create storage-key --keyring=data-keys --location=europe-west1 \
  --purpose=encryption --rotation-period=90d --next-rotation-time=2027-02-25T00:00:00Z

# Cloud Storage: authorize the service agent, then set the bucket's default key
gcloud storage service-agent --project=example-prj \
  --authorize-cmek=projects/example-prj/locations/europe-west1/keyRings/data-keys/cryptoKeys/storage-key
gcloud storage buckets update gs://example-eu-data \
  --default-encryption-key=projects/example-prj/locations/europe-west1/keyRings/data-keys/cryptoKeys/storage-key

# BigQuery: service account bq-PROJECT_NUMBER@bigquery-encryption.iam.gserviceaccount.com
bq show --encryption_service_account --project_id=example-prj
bq mk --dataset --location=europe-west1 \
  --default_kms_key=projects/example-prj/locations/europe-west1/keyRings/data-keys/cryptoKeys/bq-key \
  example-prj:finance

# Compute Engine disk
gcloud compute disks create data-disk --zone=europe-west1-b --size=200GB \
  --kms-key=projects/example-prj/locations/europe-west1/keyRings/data-keys/cryptoKeys/disk-key
```

| Product | Detail that decides questions |
| --- | --- |
| Cloud Storage | Service agent `service-PROJECT_NUMBER@gs-project-accounts.iam.gserviceaccount.com`; a new default key applies to new objects only (rewrite old ones) |
| BigQuery | Dataset default (`--default_kms_key`) or table key (`--destination_kms_key`), same location as the dataset |
| Cloud SQL | CMEK only **at instance creation** (`--disk-encryption-key`), key in the same region; cross-region replicas need a key in their own region |
| Compute Engine | `--kms-key` when creating a disk or an image |

Rotation creates a new primary version for new writes; old versions stay enabled, so existing data still decrypts. **Disabling** a version makes data unreadable until re-enabled (a Cloud SQL instance is suspended, then resumes). **Destroying** it makes data permanently unrecoverable. **Cloud KMS Autokey** creates key rings, keys and service agent grants on demand.

> **Exam trap.** If the service agent lacks the Encrypter/Decrypter role, creation or writes fail; granting it to the user or a runtime service account doesn't help. An existing Cloud SQL instance can't be switched to CMEK: create a new one and migrate.

<!-- section: key-points -->
## Key points

- Uniform bucket-level access plus predefined roles: Object Creator uploads only, Object User reads and writes, Object Admin manages objects, Storage Admin also manages buckets.
- Signed URLs: 7 days maximum (12 hours when signed through impersonation). Soft delete: 7 days by default. Bucket Lock: permanent, can only lengthen retention.
- Lifecycle rules go colder only, take up to 24 hours to apply, and `Delete` before the minimum duration costs early deletion fees.
- Query with `bq query --use_legacy_sql=false`, `gcloud spanner databases execute-sql`, `cbt read`/`lookup`, `gcloud sql connect`; estimate BigQuery cost with `--dry_run`.
- Restores create a new instance, cluster, database or table, except a Cloud SQL backup restore onto an existing instance (overwritten). Cloud SQL PITR = `gcloud sql instances clone --point-in-time`.
- Dataflow: drain is for streaming jobs only, cancel can lose in-flight data. BigQuery: `bq ls -j`, `bq show -j`, `INFORMATION_SCHEMA.JOBS`.
- Database Center = fleet health across projects; `roles/databasecenter.viewer` at organization level.
- CMEK: key in the same location, Encrypter/Decrypter role for the service agent; Cloud SQL CMEK only at creation.
