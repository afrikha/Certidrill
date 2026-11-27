Google Cloud has a managed product for almost every data shape: relational, document, wide-column, analytical, in-memory, streaming and file. Associate Cloud Engineer questions describe a data need in one or two sentences and ask which product to deploy, which Cloud Storage class to use, how to load data with the least effort, or how to keep data available when a whole region fails. This chapter covers the decision tables and the `gcloud`, `gcloud storage` and `bq` commands behind them.

<!-- section: data-products | objectives: 2.2.1 -->
## Choosing and deploying data products

| Need in the stem | Product |
| --- | --- |
| Managed MySQL, PostgreSQL or SQL Server, lift and shift of an existing relational database, one region | **Cloud SQL** |
| PostgreSQL-compatible, high-performance transactions plus fast analytical queries on the same data | **AlloyDB for PostgreSQL** |
| Relational, strongly consistent, horizontally scalable, multi-region writes, very high availability | **Spanner** |
| Wide-column NoSQL, very high throughput at single-digit millisecond latency: time series, IoT, ad tech, HBase migration | **Bigtable** |
| Serverless document database for web and mobile apps, real-time listeners, offline sync | **Firestore** (Native mode; Datastore mode for Datastore apps) |
| Serverless analytics and data warehouse, SQL over terabytes to petabytes | **BigQuery** |
| In-memory cache or session store, sub-millisecond reads | **Memorystore** (for Valkey, for Redis Cluster, for Redis) |
| Asynchronous messaging between services, event ingestion, fan-out | **Pub/Sub** |
| Existing Apache Kafka applications, Kafka API compatibility without running brokers | **Google Cloud Managed Service for Apache Kafka** |
| Batch and streaming data pipelines (ETL) with Apache Beam, serverless workers | **Dataflow** |

Distinguishing details:

- **Cloud SQL** editions: Enterprise and Enterprise Plus (larger machines, data cache, shorter maintenance downtime). High availability (`--availability-type=REGIONAL`) keeps a standby in another zone of the same region with automatic failover. Read replicas scale reads.
- **Spanner** capacity is in processing units (1,000 = 1 node, minimum 100) or nodes; editions Standard, Enterprise and Enterprise Plus. Dual-region and multi-region configurations require Enterprise Plus.
- **Bigtable** scales with nodes per cluster; design the row key to spread writes (no timestamp first).
- **BigQuery** is analytical: it isn't the answer for an application issuing many small transactional reads and writes.
- **Memorystore for Memcached** is deprecated: don't choose it for new designs; Memorystore for Valkey is the migration target.

```bash
gcloud sql instances create orders-db --database-version=POSTGRES_16 \
  --edition=enterprise --tier=db-custom-2-8192 --region=europe-west1 \
  --availability-type=REGIONAL
gcloud spanner instances create ledger --config=regional-europe-west1 \
  --description="Ledger" --edition=STANDARD --processing-units=100
gcloud bigtable instances create telemetry --display-name="Telemetry" \
  --cluster-config=id=telemetry-c1,zone=europe-west1-b,nodes=3
gcloud firestore databases create --location=eur3 --type=firestore-native
bq --location=EU mk --dataset example-prod:sales
gcloud pubsub topics create orders
gcloud pubsub subscriptions create orders-worker --topic=orders --ack-deadline=60
gcloud alloydb clusters create crm --region=europe-west1 --password=CHANGE_ME \
  --network=prod-vpc
gcloud alloydb instances create crm-primary --cluster=crm --region=europe-west1 \
  --instance-type=PRIMARY --cpu-count=2
```

Services that use private IPs in your VPC (Cloud SQL private IP, AlloyDB, Memorystore) need private services access or Private Service Connect configured on the network first.

> **Exam trap.** "Global users, relational schema, strong consistency, writes in several regions, 99.999 % availability" is Spanner in a multi-region configuration, never Cloud SQL with cross-region replicas: Cloud SQL replicas are read-only until promoted.

<!-- section: storage-products | objectives: 2.2.2 -->
## Choosing storage products and Cloud Storage classes

| Need | Product |
| --- | --- |
| Objects (files, images, backups, data lake), accessed by API or URL, unlimited capacity | **Cloud Storage** |
| Managed NFS file share for VMs or GKE (lift and shift of apps that expect a POSIX file system) | **Filestore**: Zonal (1–100 TiB), Regional (zone-resilient, 100 GiB–100 TiB; instances under 1,024 GiB need custom performance settings), Multishares for GKE (1–10 TiB); Basic HDD (from 1 TiB) and Basic SSD (from 2.5 TiB) are legacy tiers |
| Enterprise file storage with SMB for Windows as well as NFS, NetApp ONTAP features, SAP shared files | **Google Cloud NetApp Volumes** (service levels Flex Unified, Standard, Premium, Extreme) |
| Parallel file system for HPC and AI/ML training with very high throughput, from 9,000 GiB to about 80 PiB | **Google Cloud Managed Lustre** |
| Block storage for one VM | Persistent Disk or Hyperdisk |

**Cloud Storage classes.** All classes have the same eleven-nines durability and millisecond access; colder classes cost less to store but add retrieval fees and a minimum storage duration (deleting or rewriting earlier is billed as if the object had stayed).

| Class | Minimum duration | Retrieval fee | Typical access |
| --- | --- | --- | --- |
| Standard | None | No | Frequently accessed, websites, streaming, short-lived data |
| Nearline | 30 days | Yes | About once a month or less, backups |
| Coldline | 90 days | Yes | At most once a quarter |
| Archive | 365 days | Yes | Less than once a year: legal archives, disaster recovery copies |

- The default class of a bucket is Standard unless you set another; changing the default affects new objects only. Change existing objects by rewriting them or with lifecycle rules (`SetStorageClass`).
- **Autoclass** moves each object between classes according to its own access, with no retrieval or early deletion fees: the answer for unknown or changing access patterns.
- **Location** is chosen at creation: region, dual-region (two regions, predefined or chosen with `--placement`) or multi-region (`US`, `EU`, `ASIA`).

```bash
gcloud storage buckets create gs://example-backups-eu --location=europe-west1 \
  --default-storage-class=NEARLINE --uniform-bucket-level-access \
  --public-access-prevention
gcloud storage buckets create gs://example-media --location=EU --enable-autoclass
gcloud filestore instances create shared-home --zone=europe-west1-b --tier=ZONAL \
  --file-share=name=home,capacity=1TB --network=name=prod-vpc
```

Without `--tier`, `gcloud filestore instances create` creates a legacy Basic HDD instance: always set the tier.

> **Exam trap.** Archive storage is not offline: objects are read in milliseconds. It is wrong for data read every week because retrieval fees exceed the storage savings, and a Coldline object deleted after 20 days is billed for 90.

<!-- section: loading-data | objectives: 2.2.3 -->
## Loading data

| Source and volume | Tool |
| --- | --- |
| Files from a workstation or VM to a bucket | `gcloud storage cp` (parallel, `--recursive` for folders) or `gcloud storage rsync` |
| Large (more than 1 TiB) or recurring transfers from Amazon S3, Azure Blob Storage, HTTP(S) URL lists or another bucket | **Storage Transfer Service**, agentless, scheduled |
| On-premises file systems (POSIX) or HDFS to Cloud Storage | Storage Transfer Service with agents installed on-premises (bandwidth limits available) |
| Hundreds of terabytes or more with limited bandwidth | **Transfer Appliance** (shipped hardware) |
| Files in Cloud Storage or local files into BigQuery | `bq load` (load jobs: CSV, JSON, Avro, Parquet, ORC) or `LOAD DATA` SQL |
| Scheduled loads into BigQuery from SaaS applications, other clouds or Cloud Storage | **BigQuery Data Transfer Service** |
| Streaming events into BigQuery | Pub/Sub BigQuery subscription, Dataflow, or the Storage Write API |
| SQL dump or CSV into Cloud SQL | `gcloud sql import sql` or `gcloud sql import csv` from Cloud Storage |
| Firestore export files | `gcloud firestore import` from Cloud Storage |

```bash
gcloud storage cp -r ./exports gs://example-landing/exports/
gcloud storage rsync -r ./media gs://example-media/media
bq load --source_format=CSV --skip_leading_rows=1 --autodetect \
  sales.orders gs://example-landing/exports/orders-*.csv
bq load --source_format=PARQUET --replace sales.customers ./customers.parquet
gcloud transfer jobs create s3://legacy-archive gs://example-archive \
  --source-creds-file=aws-creds.json --schedule-repeats-every=1d
gcloud sql import sql orders-db gs://example-landing/dumps/orders.sql --database=orders
```

- `bq load` appends by default; `--replace` overwrites the table. `--autodetect` infers the schema of CSV and JSON files.
- For `gcloud sql import`, the Cloud SQL instance's service account needs read access to the object in the bucket.
- Storage Transfer Service is optimized for transfers over 1 TiB and offers no SLA on transfer speed.
- For a few files, `gcloud storage cp` is the least-effort answer; don't build a transfer job or a Dataflow pipeline.

> **Exam tip.** "Move 400 TB from a data center whose internet link would take months" is Transfer Appliance. "Copy an S3 bucket to Cloud Storage every night with no servers to manage" is Storage Transfer Service, not a script on a VM running `gcloud storage`.

<!-- section: multi-region-redundancy | objectives: 2.2.4 -->
## Maintaining multi-region redundancy

High availability within a region (zones) and redundancy across regions are separate settings. The exam expects the per-product mechanism:

| Product | Multi-region redundancy |
| --- | --- |
| Cloud Storage | Dual-region or multi-region bucket. Default replication: 99.9 % of new objects copied across regions within one hour, 100 % within 12 hours. **Turbo replication** (dual-region only, `--rpo=ASYNC_TURBO`): 100 % within 15 minutes |
| Cloud SQL | Cross-region **read replica**, promoted manually (`gcloud sql instances promote-replica`) after a regional outage; asynchronous, so recent transactions can be lost. Enterprise Plus adds advanced disaster recovery with a designated DR replica and switchover |
| Spanner | Dual-region or multi-region instance configuration (Enterprise Plus), 99.999 % availability, synchronous replication; an instance can be moved between configurations without downtime, if it has at least 1 node (1,000 processing units), no managed autoscaler and no backups or backup schedules; a Standard edition instance must first be upgraded to Enterprise Plus to move to a dual-region or multi-region configuration |
| AlloyDB | **Secondary cluster** in another region (`gcloud alloydb clusters create-secondary`), promoted on failure |
| Bigtable | Add clusters in other zones or regions (up to 8 regions); eventually consistent replication; app profiles with multi-cluster routing send requests to the nearest available cluster |
| Firestore | Multi-region location (for example `nam5`, `eur3`): 99.999 % availability SLA, versus 99.99 % for a regional location; the location can't be changed later: to relocate, create a new database in the target location, then export to Cloud Storage and import into it (an export can be imported into another database) |
| BigQuery | Cross-region **dataset replication**: a read-only secondary replica in another region, promoted to primary while the primary region is online. A multi-region location (`US`, `EU`) alone does not replicate data across regions |
| Compute Engine disks | Regional disks protect against a zone, not a region: use snapshots stored in multi-region locations or another region |

```bash
gcloud storage buckets create gs://example-critical --location=EU \
  --placement=europe-west1,europe-west4 --rpo=ASYNC_TURBO
gcloud sql instances create orders-db-dr --master-instance-name=orders-db \
  --region=europe-west4
gcloud spanner instances create ledger-global --config=eur3 \
  --description="Ledger EU" --edition=ENTERPRISE_PLUS --nodes=1
gcloud bigtable clusters create telemetry-c2 --instance=telemetry \
  --zone=europe-west4-a --num-nodes=3
```

```text
-- BigQuery (GoogleSQL): add a secondary replica, then promote it
ALTER SCHEMA sales ADD REPLICA `sales_us_east4` OPTIONS(location='us-east4');
ALTER SCHEMA sales SET OPTIONS(primary_replica = 'us-east4');
```

> **Exam trap.** Replication is not backup. A deleted table, an accidental `DELETE` or a corrupted file is copied to the other region within minutes. Combine cross-region redundancy with backups, point-in-time recovery or object versioning. For Cloud Storage objects, **soft delete** is the default protection: on by default with a 7-day retention (configurable from 3 to 90 days), it keeps deleted objects restorable.

<!-- section: key-points -->
## Key points

- Cloud SQL for classic relational in one region, AlloyDB for high-performance PostgreSQL, Spanner for global strongly consistent relational, Bigtable for high-throughput wide-column, Firestore for documents, BigQuery for analytics, Memorystore for caching, Pub/Sub or Managed Service for Apache Kafka for messaging, Dataflow for pipelines.
- Cloud Storage classes: Standard, Nearline 30 days, Coldline 90 days, Archive 365 days minimum; all with millisecond access; Autoclass when access is unknown.
- Filestore for NFS, NetApp Volumes for SMB and NetApp features, Managed Lustre for HPC and AI throughput.
- `gcloud storage cp` for small loads, Storage Transfer Service for large, recurring or cross-cloud transfers, Transfer Appliance when bandwidth is the limit, `bq load` for BigQuery.
- Cross-region: dual-region buckets with turbo replication (15-minute RPO), Cloud SQL cross-region replicas, Spanner multi-region, AlloyDB secondary clusters, Bigtable replication, Firestore multi-region, BigQuery dataset replicas.
